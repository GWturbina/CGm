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
    let customOgImage = null;
    let surveyFound = false;
    let surveyId = id;
    let debugInfo = [];
    
    // === SUPABASE ===
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
    
    if (SUPABASE_URL && SUPABASE_KEY) {
        try {
            console.log('📡 Loading survey from Supabase...');
            const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
            
            let survey = null;
            
            // Сначала пробуем по short_code
            const { data: byCode } = await supabase
                .from('surveys')
                .select('*')
                .eq('short_code', id)
                .maybeSingle();
            
            if (byCode) {
                survey = byCode;
                console.log('✅ Found by short_code:', id);
            }
            
            // Если не нашли, пробуем по id (UUID)
            if (!survey) {
                const { data: byId } = await supabase
                    .from('surveys')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle();
                
                if (byId) {
                    survey = byId;
                    console.log('✅ Found by UUID:', id);
                }
            }
            
            if (survey) {
                surveyFound = true;
                surveyId = survey.id;
                
                // Заполняем данные
                title = survey.title || title;
                description = survey.description || description;
                emoji = survey.icon || survey.emoji || emoji;
                theme = survey.theme || survey.style || theme;
                author = survey.author_name || survey.owner_name || '';
                
                // Пользовательская картинка
                if (survey.og_image_url) {
                    customOgImage = survey.og_image_url;
                    console.log('🖼️ Using custom OG image');
                }
                
                // Считаем вопросы
                if (survey.questions) {
                    try {
                        const q = typeof survey.questions === 'string' 
                            ? JSON.parse(survey.questions) 
                            : survey.questions;
                        questions = Array.isArray(q) ? String(q.length) : '';
                    } catch (e) {}
                }
                
                // Обновляем счётчик просмотров
                const viewsField = survey.views_count !== undefined ? 'views_count' : 'views';
                await supabase
                    .from('surveys')
                    .update({ [viewsField]: (survey[viewsField] || 0) + 1 })
                    .eq('id', survey.id);
                
                debugInfo.push('Source: Supabase');
            } else {
                console.log('❌ Survey not found:', id);
                debugInfo.push('Not found');
            }
        } catch (err) {
            console.error('❌ Supabase error:', err.message);
            debugInfo.push(`Error: ${err.message}`);
        }
    }
    
    // === ГЕНЕРАЦИЯ OG IMAGE URL ===
    let ogImageUrl;
    
    if (customOgImage) {
        ogImageUrl = customOgImage;
    } else {
        const ogParams = new URLSearchParams({
            type: 'survey',
            title: title,
            text: description.substring(0, 100),
            emoji: emoji,
            theme: theme
        });
        
        if (questions) ogParams.append('q', questions);
        if (author) ogParams.append('author', author);
        
        ogImageUrl = `${baseUrl}/api/og-image?${ogParams.toString()}`;
    }
    
    // Получаем ref из query параметров
    const refParam = req.query.ref ? `&ref=${req.query.ref}` : '';
    
    // URL для редиректа (передаём ref если есть)
    const viewerUrl = `${baseUrl}/survey.html?s=${surveyId}${refParam}`;
    const shortUrl = `${baseUrl}/s/${id}`;
    
    console.log('📋 OG:', { title, emoji, questions, customOg: !!customOgImage, ref: req.query.ref || 'none' });
    
    const imageType = customOgImage ? 'image/jpeg' : 'image/svg+xml';
    
    // HTML с Open Graph тегами
    const html = `<!DOCTYPE html>
<html lang="ru" prefix="og: https://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    
    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${shortUrl}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${ogImageUrl}">
    <meta property="og:image:secure_url" content="${ogImageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="${imageType}">
    <meta property="og:site_name" content="CardGift">
    <meta property="og:locale" content="ru_RU">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${ogImageUrl}">
    
    <script>window.location.replace('${viewerUrl}');</script>
    
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;text-align:center;padding:20px}
        .c{background:rgba(0,0,0,0.3);padding:40px;border-radius:24px;backdrop-filter:blur(10px);max-width:400px}
        .i{font-size:72px;margin-bottom:20px;animation:b 1s ease infinite}
        @keyframes b{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        h1{color:#FFD700;margin:15px 0;font-size:22px}
        p{color:rgba(255,255,255,0.8);font-size:14px}
        .s{width:40px;height:40px;border:3px solid rgba(255,215,0,.2);border-top-color:#FFD700;border-radius:50%;animation:spin 1s linear infinite;margin:25px auto}
        @keyframes spin{to{transform:rotate(360deg)}}
        a{color:#FFD700;background:rgba(255,215,0,0.15);padding:12px 24px;border-radius:25px;display:inline-block;margin-top:15px;font-weight:600;text-decoration:none}
    </style>
</head>
<body>
    <div class="c">
        <div class="i">${emoji}</div>
        <h1>${esc(title)}</h1>
        <p>${esc(description)}</p>
        ${questions ? `<p style="color:#FFD700;margin-top:10px">📝 ${questions} вопросов</p>` : ''}
        <div class="s"></div>
        <a href="${viewerUrl}">Пройти опрос →</a>
    </div>
    <!-- ${debugInfo.join(' | ')} -->
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
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

function esc(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
