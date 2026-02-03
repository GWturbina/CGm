// api/test-bot.js
// Тестовая отправка сообщения через бота
// GET: /api/test-bot — отправит тестовое сообщение на chat_id 71408270

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const BOT_TOKEN = process.env.CARDGIFT_BOT_TOKEN;
    
    if (!BOT_TOKEN) {
        return res.status(200).json({ error: 'No CARDGIFT_BOT_TOKEN' });
    }
    
    // chat_id из таблицы subscribers для 7346221
    const chatId = req.query.chat_id || '71408270';
    const text = '🧪 <b>Тест!</b>\n\nЕсли ты видишь это сообщение — бот работает!\n\n' + new Date().toISOString();
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        
        const result = await response.json();
        
        return res.status(200).json({
            step: 'sendMessage',
            chatId: chatId,
            botTokenLength: BOT_TOKEN.length,
            botTokenStart: BOT_TOKEN.substring(0, 10) + '...',
            telegramResponse: result
        });
    } catch (e) {
        return res.status(200).json({
            error: e.message,
            chatId: chatId
        });
    }
}
