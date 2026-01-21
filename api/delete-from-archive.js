// Vercel Serverless Function - Удаление карточки из АРХИВА
// Удаляет конкретную карточку из архива пользователя

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!REDIS_URL || !REDIS_TOKEN) {
        console.error('❌ Redis not configured');
        return res.status(500).json({ success: false, error: 'Redis not configured' });
    }
    
    try {
        const { userId, cardId } = req.method === 'DELETE' ? req.query : req.body;
        
        if (!userId || !cardId) {
            return res.status(400).json({ success: false, error: 'userId and cardId required' });
        }
        
        console.log('🗑️ Deleting from archive:', userId, cardId);
        
        const archiveKey = `archive:${userId}`;
        
        // Получаем текущий архив
        const getResponse = await fetch(REDIS_URL, {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${REDIS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(['GET', archiveKey])
        });
        
        const getData = await getResponse.json();
        
        if (!getData.result) {
            return res.status(404).json({ success: false, error: 'Archive not found' });
        }
        
        let archive = JSON.parse(getData.result);
        
        // Находим индекс карточки
        const initialLength = archive.length;
        archive = archive.filter(card => 
            card.id !== cardId && 
            card.shortCode !== cardId && 
            card.short_code !== cardId && 
            card.code !== cardId
        );
        
        if (archive.length === initialLength) {
            return res.status(404).json({ success: false, error: 'Card not found in archive' });
        }
        
        // Сохраняем обновленный архив
        const saveResponse = await fetch(REDIS_URL, {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${REDIS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(['SET', archiveKey, JSON.stringify(archive)])
        });
        
        const saveResult = await saveResponse.json();
        
        if (saveResult.error) {
            console.error('❌ Redis error:', saveResult.error);
            throw new Error(saveResult.error);
        }
        
        console.log('✅ Card deleted from archive');
        return res.status(200).json({ 
            success: true,
            remainingCards: archive.length
        });
        
    } catch (error) {
        console.error('❌ Delete from archive error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
