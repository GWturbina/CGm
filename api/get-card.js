// api/get-card.js
// Получение данных карточки по shortCode
// v1.0 - Supabase

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { sc } = req.query;
    
    if (!sc) {
        return res.status(400).json({ success: false, error: 'Missing shortCode (sc)' });
    }
    
    console.log('🔍 get-card request for:', sc);
    
    // Supabase
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Supabase not configured');
        return res.status(500).json({ success: false, error: 'Database not configured' });
    }
    
    try {
        // Ищем карточку по short_code
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/cards?short_code=eq.${sc}&select=*`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        
        const cards = await response.json();
        
        if (cards && cards.length > 0) {
            const card = cards[0];
            const cardData = card.card_data || {};
            
            console.log('✅ Card found:', sc);
            
            // Формируем данные для card-viewer.js
            const result = {
                cardId: card.id,
                shortCode: card.short_code,
                
                // Текст
                greeting: cardData.message || cardData.greeting || cardData.title || '',
                greetingText: cardData.message || cardData.greeting || '',
                
                // Медиа
                mediaUrl: cardData.image_url || card.image_url || null,
                cloudinaryUrl: cardData.image_url || null,
                videoUrl: cardData.video_url || null,
                thumbnailUrl: cardData.thumbnail_url || null,
                
                // Стиль
                style: cardData.style || 'classic',
                textPosition: cardData.textPosition || 'bottom',
                
                // CTA
                ctaEnabled: cardData.ctaEnabled || false,
                ctaTitle: cardData.ctaTitle || '',
                ctaSubtitle: cardData.ctaSubtitle || '',
                ctaButton: cardData.ctaButton || '',
                ctaUrl: cardData.ctaUrl || '',
                ctaTimer: cardData.ctaTimer || 3,
                
                // Marquee
                marqueeEnabled: cardData.marqueeEnabled || false,
                marqueeText: cardData.marqueeText || '',
                marqueeUrl: cardData.marqueeUrl || '',
                marqueeTimer: cardData.marqueeTimer || 7,
                
                // Banner
                bannerEnabled: cardData.bannerEnabled || false,
                bannerHtml: cardData.bannerHtml || '',
                bannerUrl: cardData.bannerUrl || '',
                bannerTimer: cardData.bannerTimer || 5,
                
                // Bonus
                bonusEnabled: cardData.bonusEnabled || false,
                bonusImage: cardData.bonusImage || null,
                bonusTitle: cardData.bonusTitle || '',
                bonusText: cardData.bonusText || '',
                
                // Метаданные
                createdAt: card.created_at,
                views: card.views || card.views_count || 0,
                ownerGwId: card.owner_gw_id,
                creatorLevel: cardData.creatorLevel || 0
            };
            
            return res.status(200).json({ success: true, data: result });
        }
        
        console.log('📭 Card not found:', sc);
        return res.status(404).json({ success: false, error: 'Card not found' });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};
