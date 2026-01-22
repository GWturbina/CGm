// api/delete-card.js
// Удаление карточки из Redis И Supabase
// v2.0 - Исправлено для Upstash REST API

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    try {
        const { sc, shortCode } = req.method === 'DELETE' ? req.query : req.body;
        const code = sc || shortCode;
        
        if (!code) {
            return res.status(400).json({ success: false, error: 'Short code required' });
        }
        
        console.log('🗑️ Deleting card:', code);
        
        let redisDeleted = false;
        let supabaseDeleted = false;
        
        // 1. Удаляем из Redis
        if (REDIS_URL && REDIS_TOKEN) {
            try {
                const response = await fetch(REDIS_URL, {
                    method: 'POST',
                    headers: { 
                        Authorization: `Bearer ${REDIS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(['DEL', `card:${code}`])
                });
                
                const result = await response.json();
                
                if (!result.error) {
                    redisDeleted = true;
                    console.log('✅ Deleted from Redis:', code);
                } else {
                    console.warn('⚠️ Redis delete warning:', result.error);
                }
            } catch (e) {
                console.warn('⚠️ Redis delete error:', e.message);
            }
        }
        
        // 2. Удаляем из Supabase
        if (SUPABASE_URL && SUPABASE_KEY) {
            try {
                const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/cards?short_code=eq.${code}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                if (response.ok) {
                    supabaseDeleted = true;
                    console.log('✅ Deleted from Supabase:', code);
                }
            } catch (e) {
                console.warn('⚠️ Supabase delete error:', e.message);
            }
        }
        
        return res.status(200).json({ 
            success: true,
            deleted: code,
            redis: redisDeleted,
            supabase: supabaseDeleted
        });
        
    } catch (error) {
        console.error('❌ Delete card error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
