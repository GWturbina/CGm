// api/telegram-webhook.js
// Vercel API Route для обработки входящих сообщений от Telegram

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://imgpysvdosdsqucoghqa.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // Только POST запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const update = req.body;
        console.log('📩 Telegram update:', JSON.stringify(update, null, 2));
        
        // Получить данные из сообщения
        const message = update.message || update.callback_query?.message;
        if (!message) {
            return res.status(200).json({ ok: true, message: 'No message' });
        }
        
        const chatId = message.chat.id;
        const userId = message.from?.id || update.callback_query?.from?.id;
        const text = message.text || '';
        
        // Определить владельца бота по токену в URL (или из параметра)
        // URL формат: /api/telegram-webhook?owner=GW123456
        const ownerGwId = req.query.owner;
        
        if (!ownerGwId) {
            console.log('No owner specified');
            return res.status(200).json({ ok: true });
        }
        
        // Команда /start
        if (text.startsWith('/start')) {
            const params = text.split(' ');
            const referrerId = params[1]; // параметр после /start
            
            // Сохранить подписчика
            const subData = {
                telegram_id: userId,
                telegram_username: message.from?.username,
                telegram_first_name: message.from?.first_name,
                telegram_last_name: message.from?.last_name,
                bot_owner_gw_id: ownerGwId.replace('GW', ''),
                source: referrerId ? 'referral' : 'direct',
                source_id: referrerId || null,
                is_active: true
            };
            
            const { error: subError } = await supabase
                .from('telegram_subscribers')
                .upsert(subData, { 
                    onConflict: 'telegram_id,bot_owner_gw_id',
                    ignoreDuplicates: false
                });
            
            if (subError) {
                console.error('Error saving subscriber:', subError);
            }
            
            // Получить бота и отправить приветствие
            const { data: bot } = await supabase
                .from('telegram_bots')
                .select('bot_token, welcome_message')
                .eq('owner_gw_id', ownerGwId.replace('GW', ''))
                .single();
            
            if (bot?.bot_token) {
                const welcomeText = bot.welcome_message || '👋 Добро пожаловать! Вы подписались на уведомления.';
                
                await fetch(`https://api.telegram.org/bot${bot.bot_token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: welcomeText,
                        parse_mode: 'HTML'
                    })
                });
            }
            
            console.log(`✅ New subscriber: ${userId} for ${ownerGwId}`);
        }
        
        // Команда /stop - отписка
        if (text === '/stop' || text === '/unsubscribe') {
            await supabase
                .from('telegram_subscribers')
                .update({ is_active: false })
                .eq('telegram_id', userId)
                .eq('bot_owner_gw_id', ownerGwId.replace('GW', ''));
            
            // Получить бота для ответа
            const { data: bot } = await supabase
                .from('telegram_bots')
                .select('bot_token')
                .eq('owner_gw_id', ownerGwId.replace('GW', ''))
                .single();
            
            if (bot?.bot_token) {
                await fetch(`https://api.telegram.org/bot${bot.bot_token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: '👋 Вы отписались от уведомлений. Чтобы подписаться снова, отправьте /start'
                    })
                });
            }
            
            console.log(`👋 Unsubscribed: ${userId} from ${ownerGwId}`);
        }
        
        // Команда /help
        if (text === '/help') {
            const { data: bot } = await supabase
                .from('telegram_bots')
                .select('bot_token')
                .eq('owner_gw_id', ownerGwId.replace('GW', ''))
                .single();
            
            if (bot?.bot_token) {
                await fetch(`https://api.telegram.org/bot${bot.bot_token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `📋 <b>Доступные команды:</b>\n\n/start - Подписаться на уведомления\n/stop - Отписаться\n/help - Показать эту справку`,
                        parse_mode: 'HTML'
                    })
                });
            }
        }
        
        return res.status(200).json({ ok: true });
        
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(200).json({ ok: true, error: error.message });
    }
}
