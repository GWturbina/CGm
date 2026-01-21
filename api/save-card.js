// Vercel Serverless Function - Сохранение карточки в Redis
// v2.0 - ИСПРАВЛЕНО: синтаксис fetch

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!REDIS_URL || !REDIS_TOKEN) {
        console.error('❌ Redis not configured');
        return res.status(500).json({ success: false, error: 'Redis not configured' });
    }
    
    try {
        if (req.method === 'POST') {
            const { shortCode, cardData } = req.body;
            
            if (!shortCode || !cardData) {
                return res.status(400).json({ success: false, error: 'shortCode and cardData required' });
            }
            
            console.log('💾 Saving card:', shortCode);
            console.log('📦 Card data keys:', Object.keys(cardData));
            
            // Проверяем наличие картинки
            if (cardData.mediaUrl) {
                console.log('🖼️ Has mediaUrl:', cardData.mediaUrl.substring(0, 50) + '...');
            }
            
            const cardJson = JSON.stringify(cardData);
            
            // ✅ ИСПРАВЛЕНО: правильный синтаксис fetch()
            const response = await fetch(REDIS_URL, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${REDIS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(['SET', `card:${shortCode}`, cardJson, 'EX', '7776000']) // 90 дней
            });
            
            const result = await response.json();
            
            if (result.error) {
                console.error('❌ Redis error:', result.error);
                throw new Error(result.error);
            }
            
            console.log('✅ Card saved to Redis:', shortCode);
            return res.status(200).json({ success: true, shortCode });
        }
        
        return res.status(405).json({ success: false, error: 'Method not allowed' });
        
    } catch (error) {
        console.error('❌ Save error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
