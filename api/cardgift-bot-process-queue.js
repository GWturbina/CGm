// api/cardgift-bot-process-queue.js
// Cron Job для обработки очереди Telegram уведомлений
// Вызывается каждые 5 минут через Vercel Cron

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://imgpysvdosdsqucoghqa.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const BOT_TOKEN = process.env.CARDGIFT_BOT_TOKEN;

const supabase = createClient(supabaseUrl, supabaseKey);

// Отправка сообщения через Telegram API
async function sendTelegramMessage(chatId, text, buttonText, buttonUrl) {
    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
    };
    
    if (buttonText && buttonUrl) {
        body.reply_markup = {
            inline_keyboard: [[
                { text: buttonText, url: buttonUrl }
            ]]
        };
    }
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const result = await response.json();
        return result;
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

export default async function handler(req, res) {
    if (!BOT_TOKEN) {
        return res.status(500).json({ error: 'Bot token not configured' });
    }
    
    console.log('🤖 Processing CardGift Bot queue...');
    
    try {
        // Получить pending сообщения (максимум 30 за раз)
        const { data: queue, error: queueError } = await supabase
            .from('cardgift_bot_queue')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(30);
        
        if (queueError) {
            console.error('Queue fetch error:', queueError);
            return res.status(500).json({ error: queueError.message });
        }
        
        if (!queue || queue.length === 0) {
            return res.status(200).json({ 
                ok: true, 
                message: 'Queue empty',
                processed: 0 
            });
        }
        
        console.log(`📤 Processing ${queue.length} messages...`);
        
        let sent = 0;
        let failed = 0;
        
        for (const item of queue) {
            const result = await sendTelegramMessage(
                item.telegram_chat_id,
                item.message_text,
                item.button_text,
                item.button_url
            );
            
            if (result.ok) {
                // Успешно отправлено - обновляем статус
                await supabase
                    .from('cardgift_bot_queue')
                    .update({ 
                        status: 'sent',
                        sent_at: new Date().toISOString()
                    })
                    .eq('id', item.id);
                
                // Обновить статистику подписчика
                const { data: subscriber } = await supabase
                    .from('cardgift_bot_subscribers')
                    .select('messages_received')
                    .eq('user_gw_id', item.user_gw_id)
                    .single();
                
                if (subscriber) {
                    await supabase
                        .from('cardgift_bot_subscribers')
                        .update({ 
                            last_message_at: new Date().toISOString(),
                            messages_received: (subscriber.messages_received || 0) + 1
                        })
                        .eq('user_gw_id', item.user_gw_id);
                }
                
                sent++;
            } else {
                // Ошибка отправки
                const errorCode = result.error_code;
                
                await supabase
                    .from('cardgift_bot_queue')
                    .update({ 
                        status: 'failed',
                        error_message: result.description || result.error
                    })
                    .eq('id', item.id);
                
                // Если пользователь заблокировал бота (403) - помечаем
                if (errorCode === 403) {
                    await supabase
                        .from('cardgift_bot_subscribers')
                        .update({ is_blocked: true, is_active: false })
                        .eq('user_gw_id', item.user_gw_id);
                }
                
                failed++;
            }
            
            // Задержка 35ms (лимит Telegram ~30 msg/sec)
            await new Promise(r => setTimeout(r, 35));
        }
        
        console.log(`✅ Processed: ${sent} sent, ${failed} failed`);
        
        return res.status(200).json({
            ok: true,
            processed: queue.length,
            sent,
            failed
        });
        
    } catch (error) {
        console.error('Process queue error:', error);
        return res.status(500).json({ error: error.message });
    }
}
