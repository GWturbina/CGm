// =====================================================
// API/AI/TEXT.JS - ГЕНЕРАЦИЯ ТЕКСТА ЧЕРЕЗ GROQ
// 
// Файл: api/ai/text.js
// Статус: ЗАМЕНИТЬ существующий файл
// 
// API ключ берётся из Vercel Environment Variables
// Пользователям Level 1-6 НЕ нужно вводить свой ключ
// =====================================================

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    try {
        const { prompt, style, language, userApiKey } = req.body;
        
        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({ error: 'Prompt required' });
        }
        
        // Фильтр контента
        const filterResult = contentFilter(prompt);
        if (!filterResult.allowed) {
            return res.status(400).json({ error: 'Запрещённый контент', reason: filterResult.reason });
        }
        
        // API ключ: сначала серверный (Vercel), потом пользовательский (для Level 7+)
        const apiKey = process.env.GROQ_API_KEY || userApiKey;
        
        if (!apiKey) {
            return res.status(500).json({ 
                error: 'API ключ не настроен. Обратитесь к администратору.' 
            });
        }
        
        // Системные промпты
        const systemPrompts = {
            greeting: 'Ты профессиональный копирайтер. Пиши тёплые, искренние поздравления.',
            business: 'Ты бизнес-консультант. Пиши в формальном деловом стиле.',
            motivational: 'Ты мотивационный коуч. Вдохновляй и мотивируй людей.',
            friendly: 'Ты дружелюбный помощник. Пиши тепло и приветливо.',
            romantic: 'Ты поэт. Пиши романтично, с чувством и любовью.',
            club: 'Ты амбассадор GlobalWay. Пиши вдохновляюще о возможностях платформы.'
        };
        
        const langInstructions = {
            ru: 'Отвечай только на русском языке.',
            en: 'Respond only in English.',
            ua: 'Відповідай тільки українською мовою.'
        };
        
        const currentLang = language || 'ru';
        const systemMessage = `${systemPrompts[style] || systemPrompts.friendly} ${langInstructions[currentLang]}`;
        
        console.log('📝 Generating text with Groq...');
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-70b-versatile',
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 0.9
            })
        });
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('Groq error:', err);
            
            if (response.status === 401) {
                return res.status(401).json({ error: 'Ошибка API ключа. Обратитесь к администратору.' });
            }
            if (response.status === 429) {
                return res.status(429).json({ error: 'Лимит запросов исчерпан. Попробуйте позже.' });
            }
            
            return res.status(response.status).json({ error: err.error?.message || 'Ошибка генерации' });
        }
        
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        
        if (!text) {
            return res.status(500).json({ error: 'Текст не сгенерирован' });
        }
        
        console.log('✅ Text generated successfully');
        
        return res.status(200).json({
            success: true,
            text: text.trim(),
            model: 'llama-3.1-70b',
            provider: 'groq',
            usage: data.usage
        });
        
    } catch (error) {
        console.error('Text generation error:', error);
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
}

// Фильтр контента
function contentFilter(text) {
    if (!text) return { allowed: true };
    
    const lower = text.toLowerCase();
    
    const forbidden = {
        porn: [/\bporn/i, /\bxxx\b/i, /\bhentai\b/i],
        child: [/child.*nude/i, /nude.*child/i],
        violence: [/dismember/i, /torture.*blood/i],
        terrorism: [/how.*make.*bomb/i],
        profanity: [/\bхуй/i, /\bпизд/i, /\bебат/i, /\bблядь?\b/i]
    };
    
    for (const [category, patterns] of Object.entries(forbidden)) {
        for (const regex of patterns) {
            if (regex.test(lower)) {
                return { allowed: false, category, reason: 'Запрещённый контент' };
            }
        }
    }
    
    return { allowed: true };
}
