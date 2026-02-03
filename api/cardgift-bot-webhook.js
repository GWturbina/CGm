// api/cardgift-bot-webhook.js
// Vercel API Route для единого бота CardGift
// Webhook URL: https://your-domain.vercel.app/api/cardgift-bot-webhook

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://imgpysvdosdsqucoghqa.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const BOT_TOKEN = process.env.CARDGIFT_BOT_TOKEN; // Токен единого бота

const supabase = createClient(supabaseUrl, supabaseKey);

// Отправка сообщения через Telegram API
async function sendMessage(chatId, text, options = {}) {
    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        ...options
    };
    
    // Добавить inline кнопку если есть
    if (options.button_text && options.button_url) {
        body.reply_markup = {
            inline_keyboard: [[
                { text: options.button_text, url: options.button_url }
            ]]
        };
    }
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    return response.json();
}

export default async function handler(req, res) {
    // Только POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Проверка токена бота
    if (!BOT_TOKEN) {
        console.error('❌ CARDGIFT_BOT_TOKEN not configured');
        return res.status(500).json({ error: 'Bot not configured' });
    }
    
    try {
        const update = req.body;
        console.log('📩 CardGift Bot update:', JSON.stringify(update, null, 2));
        
        const message = update.message;
        if (!message) {
            return res.status(200).json({ ok: true });
        }
        
        const chatId = message.chat.id;
        const userId = message.from?.id;
        const username = message.from?.username;
        const firstName = message.from?.first_name;
        const text = message.text || '';
        
        // ═══════════════════════════════════════════════════════════════
        // КОМАНДА /start
        // ═══════════════════════════════════════════════════════════════
        if (text.startsWith('/start')) {
            const params = text.split(' ');
            const userGwId = params[1]; // GW ID пользователя после /start
            
            if (!userGwId) {
                // Без параметра - просто приветствие
                await sendMessage(chatId, `
👋 <b>Добро пожаловать в CardGift!</b>

Чтобы подключить уведомления, перейдите в личный кабинет CardGift и нажмите кнопку "Подключить Telegram".

🔗 <a href="https://cgm-brown.vercel.app/dashboard.html">Открыть CardGift</a>
                `, {
                    button_text: '🚀 Открыть CardGift',
                    button_url: 'https://cgm-brown.vercel.app/dashboard.html'
                });
                
                return res.status(200).json({ ok: true });
            }
            
            // Сохранить подписчика
            // ⭐ FIX: Сохраняем gwId КАК ЕСТЬ (без обрезки GW prefix)
            // Это совпадёт с тем что сохраняет academy.html в user_progress
            const subData = {
                user_gw_id: userGwId,
                telegram_id: userId,
                telegram_username: username,
                telegram_first_name: firstName,
                telegram_chat_id: chatId,
                is_active: true,
                subscribed_at: new Date().toISOString()
            };
            
            const { error: subError } = await supabase
                .from('cardgift_bot_subscribers')
                .upsert(subData, { 
                    onConflict: 'user_gw_id',
                    ignoreDuplicates: false 
                });
            
            if (subError) {
                console.error('Error saving subscriber:', subError);
            }
            
            // Отправить приветствие
            await sendMessage(chatId, `
🎉 <b>Отлично! Вы подключены!</b>

Теперь вы будете получать уведомления:
• 📰 Новости и обновления
• 🎯 Напоминания о заданиях
• 👤 Уведомления о новых рефералах
• 💰 Информация о начислениях

<i>Чтобы отключить уведомления, отправьте /stop</i>
            `, {
                button_text: '📊 Открыть кабинет',
                button_url: `https://cgm-brown.vercel.app/dashboard.html#panel`
            });
            
            console.log(`✅ New CardGift subscriber: ${userId} (GW: ${userGwId})`);
            return res.status(200).json({ ok: true });
        }
        
        // ═══════════════════════════════════════════════════════════════
        // КОМАНДА /stop - отписка
        // ═══════════════════════════════════════════════════════════════
        if (text === '/stop' || text === '/unsubscribe') {
            await supabase
                .from('cardgift_bot_subscribers')
                .update({ is_active: false })
                .eq('telegram_id', userId);
            
            await sendMessage(chatId, `
👋 <b>Вы отписались от уведомлений</b>

Чтобы подписаться снова, перейдите в личный кабинет и нажмите "Подключить Telegram".

<i>До встречи! 👋</i>
            `);
            
            console.log(`👋 Unsubscribed: ${userId}`);
            return res.status(200).json({ ok: true });
        }
        
        // ═══════════════════════════════════════════════════════════════
        // КОМАНДА /help
        // ═══════════════════════════════════════════════════════════════
        if (text === '/help') {
            await sendMessage(chatId, `
📋 <b>Команды бота:</b>

/start - Подписаться на уведомления
/stop - Отписаться
/status - Проверить статус подписки
/help - Показать эту справку

💡 <b>Что умеет бот:</b>
• Присылает важные новости платформы
• Напоминает о заданиях
• Уведомляет о новых рефералах
• Сообщает о начислениях

🔗 <a href="https://cgm-brown.vercel.app">Открыть CardGift</a>
            `);
            
            return res.status(200).json({ ok: true });
        }
        
        // ═══════════════════════════════════════════════════════════════
        // КОМАНДА /status
        // ═══════════════════════════════════════════════════════════════
        if (text === '/status') {
            const { data: sub } = await supabase
                .from('cardgift_bot_subscribers')
                .select('user_gw_id, is_active, subscribed_at')
                .eq('telegram_id', userId)
                .single();
            
            if (sub && sub.is_active) {
                await sendMessage(chatId, `
✅ <b>Статус: Подписан</b>

🆔 Ваш ID: GW${sub.user_gw_id}
📅 Подписка с: ${new Date(sub.subscribed_at).toLocaleDateString('ru-RU')}

Уведомления активны!
                `, {
                    button_text: '📊 Открыть кабинет',
                    button_url: 'https://cgm-brown.vercel.app/dashboard.html'
                });
            } else {
                await sendMessage(chatId, `
❌ <b>Статус: Не подписан</b>

Перейдите в личный кабинет CardGift и нажмите "Подключить Telegram".
                `, {
                    button_text: '🚀 Подключить',
                    button_url: 'https://cgm-brown.vercel.app/dashboard.html#mailings'
                });
            }
            
            return res.status(200).json({ ok: true });
        }
        
        // ═══════════════════════════════════════════════════════════════
        // НЕИЗВЕСТНАЯ КОМАНДА
        // ═══════════════════════════════════════════════════════════════
        if (text.startsWith('/')) {
            await sendMessage(chatId, `
🤔 Неизвестная команда.

Отправьте /help для списка команд.
            `);
            return res.status(200).json({ ok: true });
        }
        
        // Обычное сообщение - игнорируем или отвечаем
        await sendMessage(chatId, `
🤖 Я бот CardGift!

Я присылаю уведомления о новостях, заданиях и рефералах.

Отправьте /help для списка команд.
        `, {
            button_text: '📊 Открыть CardGift',
            button_url: 'https://cgm-brown.vercel.app/dashboard.html'
        });
        
        return res.status(200).json({ ok: true });
        
    } catch (error) {
        console.error('CardGift Bot webhook error:', error);
        return res.status(200).json({ ok: true, error: error.message });
    }
}
