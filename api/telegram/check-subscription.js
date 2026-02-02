// api/telegram/check-subscription.js
// Проверка подписки на Telegram канал через Bot API
// v1.0

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8163815713:AAEwA4h-SZJFF42jYnXbsaWTGzKoGMrzuEI';
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '-1002341851234'; // Нужно узнать реальный ID

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { action } = req.query;
    
    try {
        switch (action) {
            case 'check':
                return await checkSubscription(req, res);
            case 'get-channel-id':
                return await getChannelId(req, res);
            case 'send-welcome':
                return await sendWelcomeMessage(req, res);
            default:
                return res.status(400).json({ error: 'Invalid action. Use: check, get-channel-id, send-welcome' });
        }
    } catch (error) {
        console.error('Telegram API error:', error);
        return res.status(500).json({ error: error.message });
    }
};

// Проверить подписку пользователя на канал
async function checkSubscription(req, res) {
    const { telegramUserId, channelId } = req.method === 'POST' ? req.body : req.query;
    
    if (!telegramUserId) {
        return res.status(400).json({ 
            error: 'telegramUserId required',
            hint: 'Пользователь должен отправить /start боту чтобы получить свой ID'
        });
    }
    
    const channel = channelId || TELEGRAM_CHANNEL_ID;
    
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${channel}&user_id=${telegramUserId}`
        );
        
        const data = await response.json();
        
        if (!data.ok) {
            return res.status(200).json({
                subscribed: false,
                error: data.description,
                hint: 'Убедитесь что бот добавлен в канал как администратор'
            });
        }
        
        const status = data.result?.status;
        const isSubscribed = ['member', 'administrator', 'creator'].includes(status);
        
        return res.status(200).json({
            subscribed: isSubscribed,
            status: status,
            user: data.result?.user
        });
        
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}

// Получить ID канала по его username
async function getChannelId(req, res) {
    const { channelUsername } = req.query;
    
    if (!channelUsername) {
        return res.status(400).json({ error: 'channelUsername required (e.g., @mychannel)' });
    }
    
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${channelUsername}`
        );
        
        const data = await response.json();
        
        if (!data.ok) {
            return res.status(400).json({ 
                error: data.description,
                hint: 'Бот должен быть администратором канала'
            });
        }
        
        return res.status(200).json({
            channelId: data.result.id,
            title: data.result.title,
            username: data.result.username,
            type: data.result.type
        });
        
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}

// Отправить приветственное сообщение пользователю
async function sendWelcomeMessage(req, res) {
    const { telegramUserId, message } = req.body;
    
    if (!telegramUserId) {
        return res.status(400).json({ error: 'telegramUserId required' });
    }
    
    const text = message || `🎓 Добро пожаловать в Академию CardGift!

Ты начал 21-дневную программу обучения.

📅 День 1 из 21
💰 Твоя цель: заработать $1000+

🔔 Я буду присылать тебе:
• Ежедневные задания
• Напоминания о дедлайнах  
• Мотивацию и поддержку

Удачи! 🚀`;
    
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: telegramUserId,
                    text: text,
                    parse_mode: 'HTML'
                })
            }
        );
        
        const data = await response.json();
        
        return res.status(200).json({
            sent: data.ok,
            messageId: data.result?.message_id
        });
        
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
