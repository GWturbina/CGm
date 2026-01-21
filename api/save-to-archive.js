// Vercel Serverless Function - Сохранение карточки в АРХИВ пользователя
// Сохраняет карточку в список архива привязанного к userId

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    
    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!REDIS_URL || !REDIS_TOKEN) {
        console.error('❌ Redis not configured');
        return res.status(500).json({ success: false, error: 'Redis not configured' });
    }
    
    try {
        const { userId, cardData } = req.body;
        
        if (!userId || !cardData) {
            return res.status(400).json({ success: false, error: 'userId and cardData required' });
        }
        
        console.log('💾 Saving to archive:', userId);
        
        // Добавляем timestamp если его нет
        if (!cardData.timestamp) {
            cardData.timestamp = Date.now();
        }
        
        // Генерируем уникальный ID для карточки если его нет
        if (!cardData.id) {
            cardData.id = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Ключ архива пользователя
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
        
        let archive = [];
        if (getData.result) {
            archive = JSON.parse(getData.result);
        }
        
        // Добавляем новую карточку в начало массива
        archive.unshift(cardData);
        
        // Ограничиваем количество карточек в архиве (максимум 100)
        if (archive.length > 100) {
            archive = archive.slice(0, 100);
        }
        
        // Сохраняем обновленный архив (без срока истечения)
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
        
        console.log('✅ Card saved to archive:', cardData.id);
        return res.status(200).json({ 
            success: true, 
            cardId: cardData.id,
            totalCards: archive.length
        });
        
    } catch (error) {
        console.error('❌ Save to archive error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
