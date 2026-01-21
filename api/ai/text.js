// api/ai/image.js
// Vercel Serverless Function - Image Generation via OpenAI DALL-E
// ИСПРАВЛЕНО: Более мягкий фильтр контента

export default async function handler(req, res) {
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
        const { prompt, format, style, userApiKey } = req.body;
        
        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({ error: 'Prompt required' });
        }
        
        // ИСПРАВЛЕННЫЙ ФИЛЬТР - только жёсткий контент
        const filterResult = contentFilter(prompt);
        if (!filterResult.allowed) {
            return res.status(400).json({ 
                error: 'Контент для взрослых запрещён',
                reason: filterResult.reason
            });
        }
        
        // API ключ - сначала пользовательский, потом серверный
        const apiKey = userApiKey || process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
        }
        
        // Определяем размер
        const sizes = {
            '1:1': '1024x1024',
            '16:9': '1792x1024',
            '9:16': '1024x1792'
        };
        const size = sizes[format] || '1024x1024';
        
        // Добавляем стиль к промпту
        const styles = {
            'realistic': 'photorealistic, high quality, detailed',
            'artistic': 'artistic, creative, stylized illustration',
            'cartoon': 'cartoon style, colorful, playful',
            'anime': 'anime style, japanese animation',
            'minimalist': 'minimalist, clean, simple design',
            '3d': '3D render, volumetric lighting, high detail'
        };
        
        const stylePrompt = styles[style] || '';
        const fullPrompt = stylePrompt ? `${prompt}, ${stylePrompt}` : prompt;

        console.log('🎨 Generating image:', fullPrompt.substring(0, 100));

        // OpenAI DALL-E 3 API
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
                size: size,
                quality: 'standard',
                response_format: 'url'
            })
        });
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('OpenAI error:', err);
            
            // Обработка специфичных ошибок OpenAI
            if (err.error?.code === 'content_policy_violation') {
                return res.status(400).json({ 
                    error: 'OpenAI отклонил запрос из-за политики контента',
                    suggestion: 'Попробуйте изменить описание'
                });
            }
            
            if (response.status === 401) {
                return res.status(401).json({ error: 'Invalid API Key' });
            }
            if (response.status === 429) {
                return res.status(429).json({ error: 'Rate limit exceeded' });
            }
            if (response.status === 400) {
                return res.status(400).json({ error: err.error?.message || 'Invalid request' });
            }
            
            return res.status(response.status).json({ 
                error: err.error?.message || 'Image generation failed' 
            });
        }
        
        const data = await response.json();
        const imageUrl = data.data?.[0]?.url;
        
        if (!imageUrl) {
            return res.status(500).json({ error: 'No image generated' });
        }
        
        console.log('✅ Image generated successfully');
        
        return res.status(200).json({
            success: true,
            url: imageUrl,
            revised_prompt: data.data?.[0]?.revised_prompt
        });
        
    } catch (error) {
        console.error('Image generation error:', error);
        return res.status(500).json({ 
            error: 'Server error',
            details: error.message 
        });
    }
}

// ═══════════════════════════════════════════════════════════
// ИСПРАВЛЕННЫЙ ФИЛЬТР КОНТЕНТА
// Блокирует только явно запрещённый контент
// ═══════════════════════════════════════════════════════════

function contentFilter(text) {
    if (!text) return { allowed: true };
    
    const lower = text.toLowerCase();
    
    // Только ЯВНО запрещённый контент
    const strictlyForbidden = {
        // Порнография
        porn: [/\bporn/i, /\bxxx\b/i, /\bhentai\b/i, /\berotic\s*nude/i, /\bнагой\s*секс/i],
        
        // Детская эксплуатация (строго!)
        child_abuse: [/child.*nude/i, /nude.*child/i, /ребён.*голы/i, /голы.*ребён/i, /детск.*порн/i],
        
        // Экстремальное насилие
        extreme_violence: [/dismember/i, /torture.*blood/i, /gore\s*kill/i, /расчленен/i, /пытк.*кров/i],
        
        // Терроризм
        terrorism: [/how.*make.*bomb/i, /террорист.*атак/i, /взорв.*людей/i],
        
        // Мат (только грубый)
        profanity: [/\bхуй/i, /\bпизд/i, /\bебат/i, /\bблядь?\b/i, /\bfuck\b/i, /\bshit\b/i]
    };
    
    for (const [category, patterns] of Object.entries(strictlyForbidden)) {
        for (const regex of patterns) {
            if (regex.test(lower)) {
                console.log(`🚫 Blocked: ${category}`);
                return { allowed: false, category: category, reason: 'Запрещённый контент' };
            }
        }
    }
    
    // ВСЁ ОСТАЛЬНОЕ РАЗРЕШЕНО!
    // "влюблённая пара", "костёр", "закат", "палатка" - OK
    // "человек работает", "аналогия" - OK
    
    return { allowed: true };
}
