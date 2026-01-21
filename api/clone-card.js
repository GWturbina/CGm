// Vercel Serverless Function - Клонирование карточки с подменой реферальной ссылки
// Создаёт копию шаблона с новым shortCode и реферальной ссылкой пользователя

const crypto = require('crypto');

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
        const { templateShortCode, userReferralLink, userId } = req.body;
        
        if (!templateShortCode || !userReferralLink || !userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'templateShortCode, userReferralLink and userId required' 
            });
        }
        
        console.log('🔄 Cloning template:', templateShortCode, 'for user:', userId);
        
        // === ШАГ 1: Получить оригинальную карточку ===
        
        // Попытка 1: Загрузить из card:shortCode
        console.log('📡 Trying to load from card:' + templateShortCode);
        const getResponse = await fetch(REDIS_URL, {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${REDIS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(['GET', `card:${templateShortCode}`])
        });
        
        const getData = await getResponse.json();
        let originalCard = null;
        
        if (getData.result) {
            originalCard = JSON.parse(getData.result);
            console.log('✅ Original card loaded from card:', {
                title: originalCard.title,
                hasMediaUrl: !!originalCard.mediaUrl,
                hasGreeting: !!(originalCard.greeting || originalCard.greetingText),
                keys: Object.keys(originalCard).length
            });
        } else {
            console.log('⚠️ Card not found in card:' + templateShortCode);
            
            // Попытка 2: Поискать в архиве пользователя
            console.log('📡 Trying to load from archive...');
            
            // Ищем во всех возможных архивах (может быть из архива другого пользователя)
            // Но сначала попробуем текущего пользователя
            const archiveKey = `archive:${userId}`;
            const getArchiveResponse = await fetch(REDIS_URL, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${REDIS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(['GET', archiveKey])
            });
            
            const archiveData = await getArchiveResponse.json();
            
            if (archiveData.result) {
                const archive = JSON.parse(archiveData.result);
                console.log('📂 Archive loaded:', archive.length, 'cards');
                
                // Ищем карточку по shortCode
                originalCard = archive.find(card => 
                    card.shortCode === templateShortCode || 
                    card.short_code === templateShortCode || 
                    card.code === templateShortCode
                );
                
                if (originalCard) {
                    console.log('✅ Found in archive:', {
                        title: originalCard.title,
                        hasMediaUrl: !!originalCard.mediaUrl,
                        hasGreeting: !!(originalCard.greeting || originalCard.greetingText),
                        keys: Object.keys(originalCard).length
                    });
                } else {
                    console.log('❌ Not found in archive either');
                }
            } else {
                console.log('📭 Archive is empty');
            }
        }
        
        if (!originalCard) {
            return res.status(404).json({ 
                success: false, 
                error: 'Template not found in Redis or archive',
                templateShortCode
            });
        }
        
        console.log('📋 Original card data:', {
            title: originalCard.title,
            greeting: originalCard.greeting?.substring(0, 50),
            greetingText: originalCard.greetingText?.substring(0, 50),
            mediaUrl: originalCard.mediaUrl?.substring(0, 50),
            preview: originalCard.preview?.substring(0, 50),
            allKeys: Object.keys(originalCard)
        });
        
        // === ШАГ 2: Создать копию с новыми данными ===
        const newShortCode = generateShortCode();
        
        const clonedCard = {
            ...originalCard,
            // Новые параметры
            cardId: `card_${Date.now()}_${newShortCode}`,
            shortCode: newShortCode,
            short_code: newShortCode,
            code: newShortCode,
            shortUrl: `https://cardgift.com/c/${newShortCode}`, // Замените на ваш домен
            
            // Подменяем реферальную ссылку
            referralLink: userReferralLink,
            ownerUserId: userId,
            
            // Обновляем даты
            createdAt: new Date().toISOString(),
            clonedFrom: templateShortCode,
            isClone: true,
            
            // Убираем флаги шаблона
            isTemplate: false,
            is_template: false,
            isCorporate: false,
            is_corporate: false,
            
            // Сбрасываем статистику
            views: 0
        };
        
        console.log('📦 Cloned card created:', newShortCode);
        console.log('📦 Cloned card preview:', {
            title: clonedCard.title,
            greeting: clonedCard.greeting?.substring(0, 50) || clonedCard.greetingText?.substring(0, 50),
            mediaUrl: clonedCard.mediaUrl?.substring(0, 50),
            preview: clonedCard.preview?.substring(0, 50),
            referralLink: clonedCard.referralLink,
            style: clonedCard.style,
            selectedStyle: clonedCard.selectedStyle,
            totalKeys: Object.keys(clonedCard).length
        });
        
        // === ШАГ 3: Сохранить новую карточку в Redis ===
        const saveResponse = await fetch(REDIS_URL, {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${REDIS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(['SET', `card:${newShortCode}`, JSON.stringify(clonedCard), 'EX', '7776000']) // 90 дней
        });
        
        const saveResult = await saveResponse.json();
        
        if (saveResult.error) {
            console.error('❌ Redis save error:', saveResult.error);
            throw new Error(saveResult.error);
        }
        
        console.log('✅ Cloned card saved to Redis:', newShortCode);
        console.log('📊 Saved data size:', JSON.stringify(clonedCard).length, 'bytes');
        
        // === ШАГ 4: Сохранить в архив пользователя ===
        const archiveKey = `archive:${userId}`;
        
        const getArchiveResponse = await fetch(REDIS_URL, {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${REDIS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(['GET', archiveKey])
        });
        
        const archiveData = await getArchiveResponse.json();
        
        let archive = [];
        if (archiveData.result) {
            archive = JSON.parse(archiveData.result);
        }
        
        // Добавляем клонированную карточку в начало архива
        archive.unshift(clonedCard);
        
        // Ограничиваем размер архива
        if (archive.length > 100) {
            archive = archive.slice(0, 100);
        }
        
        const saveArchiveResponse = await fetch(REDIS_URL, {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${REDIS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(['SET', archiveKey, JSON.stringify(archive)])
        });
        
        const archiveResult = await saveArchiveResponse.json();
        
        if (archiveResult.error) {
            console.warn('⚠️ Failed to save to archive:', archiveResult.error);
        } else {
            console.log('✅ Added to user archive');
        }
        
        // === Возвращаем результат ===
        return res.status(200).json({ 
            success: true,
            shortCode: newShortCode,
            shortUrl: `https://cardgift.com/c/${newShortCode}`, // Замените на ваш домен
            cardData: clonedCard
        });
        
    } catch (error) {
        console.error('❌ Clone card error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Генерация короткого кода (7 символов)
 */
function generateShortCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    });
    return code;
}
