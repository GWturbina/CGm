// api/ai/image.js
// DALL-E Image Generation with Server-side API key
// v2.0 - ДОБАВЛЕНА серверная проверка кредитов!

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// DEV кошельки - безлимит
const DEV_WALLETS = [
    '0x7bcd1753868895971e12448412cb3216d47884c8',
    '0x9b49bd9c9458615e11c051afd1ebe983563b67ee',
    '0x03284a899147f5a07f82c622f34df92198671635',
    '0xa3496cacc8523421dd151f1d92a456c2dafa28c2'
];

// Проверка и списание кредита
async function checkAndUseCredit(wallet, type) {
    if (!wallet || !SUPABASE_URL || !SUPABASE_KEY) {
        console.log('⚠️ No wallet or Supabase config - allowing');
        return { allowed: true, reason: 'no_check' };
    }
    
    const walletLower = wallet.toLowerCase();
    
    // DEV кошельки - безлимит
    if (DEV_WALLETS.includes(walletLower)) {
        return { allowed: true, reason: 'dev_wallet' };
    }
    
    try {
        // Получаем запись из ai_credits
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/ai_credits?wallet_address=eq.${walletLower}`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            // Нет записи - создаём с 3 кредитами
            await createCreditsRecord(walletLower);
            return { allowed: true, reason: 'new_user' };
        }
        
        const record = data[0];
        const today = new Date().toISOString().split('T')[0];
        const field = type === 'image' ? 'image_used' : 'voice_used';
        const limitField = type === 'image' ? 'daily_image_limit' : 'daily_voice_limit';
        
        // Проверяем сброс дневного лимита
        let usedToday = record[field] || 0;
        if (record.last_reset_date !== today) {
            usedToday = 0;
        }
        
        const dailyLimit = record[limitField] || 3;
        
        if (usedToday >= dailyLimit) {
            return { allowed: false, reason: 'limit_exceeded', used: usedToday, limit: dailyLimit };
        }
        
        // Списываем кредит
        const updateData = {
            [field]: usedToday + 1,
            last_reset_date: today,
            updated_at: new Date().toISOString()
        };
        
        await fetch(
            `${SUPABASE_URL}/rest/v1/ai_credits?wallet_address=eq.${walletLower}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(updateData)
            }
        );
        
        return { allowed: true, reason: 'credit_used', used: usedToday + 1, limit: dailyLimit };
        
    } catch (e) {
        console.error('Credit check error:', e);
        // При ошибке - разрешаем (чтобы не блокировать пользователей)
        return { allowed: true, reason: 'error_fallback' };
    }
}

async function createCreditsRecord(wallet) {
    const today = new Date().toISOString().split('T')[0];
    
    await fetch(
        `${SUPABASE_URL}/rest/v1/ai_credits`,
        {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                wallet_address: wallet,
                text_used: 0,
                image_used: 0,
                voice_used: 0,
                extra_credits: 0,
                daily_image_limit: 3,
                daily_voice_limit: 3,
                last_reset_date: today,
                created_at: new Date().toISOString()
            })
        }
    );
}

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { prompt, format, style, userApiKey, wallet } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt required' });
        }
        
        // СЕРВЕРНАЯ ПРОВЕРКА КРЕДИТОВ
        const creditCheck = await checkAndUseCredit(wallet, 'image');
        if (!creditCheck.allowed) {
            return res.status(403).json({ 
                error: `🎨 Лимит исчерпан! Использовано ${creditCheck.used}/${creditCheck.limit} за сегодня`,
                creditError: true
            });
        }
        
        // Используем ключ пользователя или серверный
        const apiKey = userApiKey || process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }
        
        // Размеры для DALL-E 3
        const sizeMap = {
            '1:1': '1024x1024',
            '16:9': '1792x1024',
            '9:16': '1024x1792'
        };
        
        // Стили для промпта
        const stylePrompts = {
            'realistic': 'photorealistic, high quality, detailed, professional photography',
            'cartoon': 'cartoon style, colorful, fun, animated, vibrant',
            'artistic': 'artistic, painterly, creative, expressive, fine art'
        };
        
        const fullPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.realistic}`;
        
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: fullPrompt,
                n: 1,
                size: sizeMap[format] || '1024x1024',
                quality: 'standard'
            })
        });
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('OpenAI error:', err);
            
            if (response.status === 401) {
                return res.status(401).json({ error: 'Неверный API ключ OpenAI' });
            }
            if (response.status === 429) {
                return res.status(429).json({ error: 'Лимит запросов исчерпан' });
            }
            if (response.status === 400) {
                return res.status(400).json({ error: err.error?.message || 'Некорректный запрос' });
            }
            
            return res.status(response.status).json({ 
                error: err.error?.message || 'Ошибка OpenAI' 
            });
        }
        
        const data = await response.json();
        const imageUrl = data.data?.[0]?.url;
        
        if (!imageUrl) {
            return res.status(500).json({ error: 'Изображение не получено' });
        }
        
        return res.status(200).json({
            success: true,
            imageUrl: imageUrl,
            revised_prompt: data.data?.[0]?.revised_prompt
        });
        
    } catch (error) {
        console.error('Image generation error:', error);
        return res.status(500).json({ error: error.message });
    }
};
