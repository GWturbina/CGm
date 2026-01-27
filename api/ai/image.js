// =====================================================
// API/AI/IMAGE.JS - ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ DALL-E
// 
// Файл: api/ai/image.js
// Статус: ЗАМЕНИТЬ существующий файл
// 
// API ключ берётся из Vercel Environment Variables
// =====================================================

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    try {
        const { prompt, format, style, userApiKey } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt required' });
        }
        
        // API ключ: сначала серверный (Vercel), потом пользовательский
        const apiKey = process.env.OPENAI_API_KEY || userApiKey;
        
        if (!apiKey) {
            return res.status(500).json({ 
                error: 'API ключ не настроен. Обратитесь к администратору.' 
            });
        }
        
        // Размеры для DALL-E 3
        const sizeMap = {
            '1:1': '1024x1024',
            '16:9': '1792x1024',
            '9:16': '1024x1792'
        };
        
        // Стили
        const stylePrompts = {
            'realistic': 'photorealistic, high quality, detailed, professional photography',
            'cartoon': 'cartoon style, colorful, fun, animated, vibrant',
            'artistic': 'artistic, painterly, creative, expressive, fine art'
        };
        
        const fullPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.realistic}`;
        
        console.log('🎨 Generating image with DALL-E...');
        
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
                return res.status(401).json({ error: 'Ошибка API ключа. Обратитесь к администратору.' });
            }
            if (response.status === 429) {
                return res.status(429).json({ error: 'Лимит запросов исчерпан' });
            }
            if (response.status === 400) {
                return res.status(400).json({ error: err.error?.message || 'Некорректный запрос' });
            }
            
            return res.status(response.status).json({ error: err.error?.message || 'Ошибка OpenAI' });
        }
        
        const data = await response.json();
        const imageUrl = data.data?.[0]?.url;
        
        if (!imageUrl) {
            return res.status(500).json({ error: 'Изображение не получено' });
        }
        
        console.log('✅ Image generated successfully');
        
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
