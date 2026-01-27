// api/ai/text.js
// Vercel Serverless Function - Text Generation via Groq (Llama 3.1)
// Groq даёт 14,400 бесплатных запросов в день!

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
        const { prompt, style, language, userApiKey } = req.body;
        
        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({ error: 'Prompt required' });
        }
        
        // Фильтр контента
        const filterResult = contentFilter(prompt);
        if (!filterResult.allowed) {
            return res.status(400).json({ 
                error: 'Запрещённый контент',
                reason: filterResult.reason
            });
        }
        
        // API ключ - сначала пользовательский, потом серверный
        const apiKey = userApiKey || process.env.GROQ_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'GROQ_API_KEY not configured. Добавьте ключ в настройках.' });
        }
        
        // Системный промпт в зависимости от стиля
        const systemPrompts = {
            greeting: 'Ты профессиональный копирайтер. Пиши тёплые, искренние поздравления.',
            business: 'Ты бизнес-консультант. Пиши в формальном деловом стиле.',
            motivational: 'Ты мотивационный коуч. Вдохновляй и мотивируй людей.',
            friendly: 'Ты дружелюбный помощник. Пиши тепло и приветливо.',
            romantic: 'Ты поэт. Пиши романтично, с чувством и любовью.',
            club: 'Ты амбассадор GlobalWay. Пиши вдохновляюще о возможностях платформы и командной работе.'
        };
        
        const langInstructions = {
            ru: 'Отвечай только на русском языке.',
            en: 'Respond only in English.',
            ua: 'Відповідай тільки українською мовою.'
        };
        
        const currentLang = language || 'ru';
        const systemMessage = `${systemPrompts[style] || systemPrompts.friendly} ${langInstructions[currentLang] || langInstructions.ru}`;
        
        console.log('📝 Generating text with Groq:', prompt.substring(0, 50));
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',  // Llama 3.3 70B - актуальная версия!
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
                return res.status(401).json({ error: 'Неверный API ключ Groq' });
            }
            if (response.status === 429) {
                return res.status(429).json({ error: 'Лимит запросов Groq исчерпан. Попробуйте позже.' });
            }
            
            return res.status(response.status).json({ 
                error: err.error?.message || 'Groq API error' 
            });
        }
        
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        
        if (!text) {
            return res.status(500).json({ error: 'Текст не сгенерирован' });
        }
        
        console.log('✅ Text generated with Groq successfully');
        
        return res.status(200).json({
            success: true,
            text: text.trim(),
            model: 'llama-3.1-70b',
            provider: 'groq',
            usage: data.usage
        });
        
    } catch (error) {
        console.error('Text generation error:', error);
        return res.status(500).json({ 
            error: 'Server error',
            details: error.message 
        });
    }
}

// ═══════════════════════════════════════════════════════════
// ФИЛЬТР КОНТЕНТА
// ═══════════════════════════════════════════════════════════

function contentFilter(text) {
    if (!text) return { allowed: true };
    
    const lower = text.toLowerCase();
    
    // Только ЯВНО запрещённый контент
    const strictlyForbidden = {
        // Порнография
        porn: [/\bporn/i, /\bxxx\b/i, /\bhentai\b/i, /\berotic\s*nude/i],
        
        // Детская эксплуатация (строго!)
        child_abuse: [/child.*nude/i, /nude.*child/i, /ребён.*голы/i, /детск.*порн/i],
        
        // Экстремальное насилие
        extreme_violence: [/dismember/i, /torture.*blood/i, /gore\s*kill/i, /расчленен/i],
        
        // Терроризм
        terrorism: [/how.*make.*bomb/i, /террорист.*атак/i, /взорв.*людей/i],
        
        // Мат (грубый)
        profanity: [/\bхуй/i, /\bпизд/i, /\bебат/i, /\bблядь?\b/i]
    };
    
    for (const [category, patterns] of Object.entries(strictlyForbidden)) {
        for (const regex of patterns) {
            if (regex.test(lower)) {
                console.log(`🚫 Blocked: ${category}`);
                return { allowed: false, category: category, reason: 'Запрещённый контент' };
            }
        }
    }
    
    return { allowed: true };
}
