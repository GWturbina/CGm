// Vercel Serverless Function - Короткие ссылки для опросов
// Файл: /api/s/[id].js

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    const { id } = req.query;
    
    console.log('📋 Survey short link request:', id);
    
    if (!id || id.length < 3) {
        return res.status(400).send('Invalid survey code');
    }
    
    const baseUrl = `https://${req.headers.host}`;
    
    // Дефолтные значения
    let title = '📋 Опрос | CardGift';
    let description = 'Пройдите опрос и узнайте результат!';
    let emoji = '📋';
    let theme = 'dark';
    let questions = '';
    let author = '';
    let surveyFound = false;
    let debugInfo = [];
    
    // === SUPABASE ===
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
    
    if (SUPABASE_URL && SUPABASE_KEY) {
        try {
            console.log('📡 Loading survey from Supabase...');
            const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
            
            // Ищем по short_code или по id
            let { data: survey, error } = await supabase
                .from('surveys')
                .select('*')
                .eq('short_code', id)
                .single();
            
            // Если не нашли по short_code, пробуем по id
            if (!survey && !error) {
                const result = await supabase
                    .from('surveys')
                    .select('*')
                    .eq('id', id)
                    .single();
                survey = result.data;
            }
            
            if (survey) {
                surveyFound = true;
                console.log('✅ Survey found:', id);
                
                // Заполняем данные
                title = survey.title || title;
                description = survey.description || description;
                emoji = survey.emoji || emoji;
                theme = survey.theme || survey.style || theme;
                author = survey.author_name || survey.owner_name || '';
                
                // Считаем вопросы
                if (survey.questions) {
                    try {
                        const q = typeof survey.questions === 'string' 
                            ? JSON.parse(survey.questions) 
                            : survey.questions;
                        questions = Array.isArray(q) ? String(q.length) : '';
                    } catch (e) {
                        console.log('Could not parse questions');
                    }
                }
                
                // Обновляем счётчик просмотров
                await supabase
                    .from('surveys')
                    .update({ views: (survey.views || 0) + 1 })
                    .eq('id', survey.id);
                
                debugInfo.push('Source: Supabase');
            } else {
                console.log('❌ Survey not found:', id);
                debugInfo.push('Survey not found in Supabase');
            }
        } catch (err) {
            console.error('❌ Supabase error:', err.message);
            debugInfo.push(`Supabase error: ${err.message}`);
        }
    }
    
    // === REDIS FALLBACK ===
    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!surveyFound && REDIS_URL && REDIS_TOKEN) {
        try {
            console.log('📡 Trying Redis...');
            const response = await fetch(REDIS_URL, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${REDIS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(['GET', `survey:${id}`])
            });
            
            const data = await response.json();
            
            if (data.result) {
                const survey = JSON.parse(data.result);
                surveyFound = true;
                console.log('✅ Survey found in Redis:', id);
                
                title = survey.title || title;
                description = survey.description || description;
                emoji = survey.emoji || emoji;
                theme = survey.theme || theme;
                author = survey.author_name || '';
                
                if (survey.questions && Array.isArray(survey.questions)) {
                    questions = String(survey.questions.length);
                }
                
                debugInfo.push('Source: Redis');
            }
        } catch (err) {
            console.error('❌ Redis error:', err.message);
            debugInfo.push(`Redis error: ${err.message}`);
        }
    }
    
    // === ГЕНЕРАЦИЯ OG IMAGE URL ===
    const ogParams = new URLSearchParams({
        type: 'survey',
        title: title,
        text: description.substring(0, 100),
        emoji: emoji,
        theme: theme
    });
    
    if (questions) ogParams.append('q', questions);
    if (author) ogParams.append('author', author);
    
    const ogImageUrl = `${baseUrl}/api/og-image?${ogParams.toString()}`;
    
    // URL для редиректа
    const viewerUrl = `${baseUrl}/survey.html?id=${id}`;
    const shortUrl = `${baseUrl}/s/${id}`;
    
    console.log('📋 Final OG data:');
    console.log('   Title:', title);
    console.log('   Emoji:', emoji);
    console.log('   Theme:', theme);
    console.log('   Questions:', questions || 'N/A');
    
    // HTML с Open Graph тегами
    const html = `<!DOCTYPE html>
<html lang="ru" prefix="og: https://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    
    <!-- Open Graph (Facebook, Telegram, WhatsApp, Viber) -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${shortUrl}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${ogImageUrl}">
    <meta property="og:image:secure_url" content="${ogImageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/svg+xml">
    <meta property="og:image:alt" content="${esc(title)}">
    <meta property="og:site_name" content="CardGift">
    <meta property="og:locale" content="ru_RU">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${ogImageUrl}">
    
    <!-- Instant redirect via JS (bots don't execute JS) -->
    <script>window.location.replace('${viewerUrl}');</script>
    
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;text-align:center;padding:20px}
        .container{background:rgba(0,0,0,0.3);padding:40px;border-radius:24px;backdrop-filter:blur(10px);max-width:400px;width:100%}
        .icon{font-size:72px;margin-bottom:20px;animation:bounce 1s ease infinite}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        h1{color:#FFD700;margin:15px 0;font-size:22px;line-height:1.3}
        p{color:rgba(255,255,255,0.8);margin:10px 0;font-size:14px}
        .meta{color:#FFD700;font-size:13px;opacity:0.8;margin:15px 0}
        .spinner{width:40px;height:40px;border:3px solid rgba(255,215,0,.2);border-top-color:#FFD700;border-radius:50%;animation:spin 1s linear infinite;margin:25px auto}
        @keyframes spin{to{transform:rotate(360deg)}}
        a{color:#FFD700;text-decoration:none;background:rgba(255,215,0,0.15);padding:12px 24px;border-radius:25px;display:inline-block;margin-top:15px;font-weight:600;transition:all 0.3s}
        a:hover{background:rgba(255,215,0,0.3);transform:scale(1.05)}
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">${emoji}</div>
        <h1>${esc(title)}</h1>
        <p>${esc(description)}</p>
        ${questions ? `<div class="meta">📝 ${questions} вопросов</div>` : ''}
        <div class="spinner"></div>
        <p style="font-size:12px;opacity:0.6">Загружаем опрос...</p>
        <a href="${viewerUrl}">Пройти опрос →</a>
    </div>
    <!-- Debug: ${debugInfo.join(' | ')} -->
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.setHeader('X-Survey-Found', surveyFound ? 'true' : 'false');
    res.status(200).send(html);
};

function esc(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
