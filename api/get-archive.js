// Vercel Serverless Function - Получение АРХИВА пользователя
// Возвращает все карточки из архива пользователя

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    
    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!REDIS_URL || !REDIS_TOKEN) {
        console.error('❌ Redis not configured');
        return res.status(500).json({ success: false, error: 'Redis not configured' });
    }
    
    try {
        const userId = req.query.userId;
        
        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId required' });
        }
        
        console.log('📂 Getting archive for:', userId);
        
        const archiveKey = `archive:${userId}`;
        
        const response = await fetch(REDIS_URL, {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${REDIS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(['GET', archiveKey])
        });
        
        const data = await response.json();
        
        if (data.result) {
            const archive = JSON.parse(data.result);
            console.log('✅ Archive loaded:', archive.length, 'cards');
            return res.status(200).json({ 
                success: true, 
                cards: archive,
                count: archive.length
            });
        }
        
        // Если архив пустой - возвращаем пустой массив
        console.log('📭 Empty archive for:', userId);
        return res.status(200).json({ 
            success: true, 
            cards: [],
            count: 0
        });
        
    } catch (error) {
        console.error('❌ Get archive error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
