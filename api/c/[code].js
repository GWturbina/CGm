// Vercel Serverless Function - Короткие ссылки CardGift
// v2.3 - Добавлена поддержка thumbnailUrl для видео-карточек
// Файл: /api/c/[code].js

module.exports = async function handler(req, res) {
    const { code } = req.query;
    
    console.log('🔗 Short link request:', code);
    
    if (!code || code.length < 4) {
        return res.status(400).send('Invalid code');
    }
    
    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    const baseUrl = `https://${req.headers.host}`;
    
    // Дефолтные значения
    let title = '🎁 CardGift - Персональная открытка';
    let description = 'Посмотрите открытку, созданную специально для вас!';
    let ogImageUrl = null; // Начинаем с null, потом установим
    let cardFound = false;
    let debugInfo = [];
    
    if (REDIS_URL && REDIS_TOKEN) {
        try {
            console.log('📡 Loading from Redis...');
            
            // ✅ ИСПРАВЛЕНО: правильный синтаксис fetch()
            const response = await fetch(REDIS_URL, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${REDIS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(['GET', `card:${code}`])
            });
            
            const data = await response.json();
            
            if (data.result) {
                const card = JSON.parse(data.result);
                cardFound = true;
                console.log('✅ Card found:', code);
                console.log('📦 Card keys:', Object.keys(card));
                
                // === ТЕКСТ ===
                const greetingText = card.greeting || card.greetingText || card.message || '';
                if (greetingText) {
                    const lines = greetingText.split('\n').filter(l => l.trim());
                    if (lines.length > 0) {
                        title = lines[0].substring(0, 60) || title;
                        description = lines.slice(1).join(' ').substring(0, 150) || description;
                    }
                }
                debugInfo.push(`Title: ${title.substring(0, 30)}...`);
                
                // === КАРТИНКА - проверяем ВСЕ возможные поля ===
                // Приоритет: 
                // 1. Cloudinary URL (лучшее качество)
                // 2. thumbnailUrl (для видео-карточек)
                // 3. YouTube thumbnail из videoUrl
                // 4. Другие изображения
                // 5. SVG генератор (fallback)
                
                const possibleImageFields = [
                    'cloudinaryUrl',      // Приоритет 1: Cloudinary
                    'mediaUrl',
                    'imageUrl', 
                    'image_url',
                    'preview',
                    'preview_url',
                    'backgroundImage',
                    'image',
                    'og_image'
                ];
                
                let imageUrl = null;
                let imageSource = null;
                
                for (const field of possibleImageFields) {
                    if (card[field] && typeof card[field] === 'string' && card[field].length > 10) {
                        // Пропускаем base64 на этом этапе
                        if (card[field].startsWith('data:')) continue;
                        
                        imageUrl = card[field];
                        imageSource = field;
                        console.log(`🖼️ Found image in field "${field}":`, imageUrl.substring(0, 60) + '...');
                        debugInfo.push(`Image field: ${field}`);
                        break;
                    }
                }
                
                // === ВИДЕО ПРЕВЬЮ ===
                // Проверяем thumbnailUrl (сохранённый в generator.js)
                if (card.thumbnailUrl && card.thumbnailUrl.startsWith('http')) {
                    ogImageUrl = card.thumbnailUrl;
                    console.log('🎬 Using saved thumbnailUrl:', ogImageUrl);
                    debugInfo.push('Source: thumbnailUrl');
                }
                // Проверяем YouTube из videoUrl
                else if (card.videoUrl || card.video_url) {
                    const videoUrl = card.videoUrl || card.video_url;
                    const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
                    if (ytMatch) {
                        // Используем hqdefault (всегда существует) вместо maxresdefault
                        ogImageUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
                        console.log('📺 YouTube thumbnail:', ogImageUrl);
                        debugInfo.push('Source: YouTube thumbnail');
                    }
                }
                // Используем найденное изображение
                else if (imageUrl) {
                    // Cloudinary URL - трансформируем для OG (1200x630)
                    if (imageUrl.includes('cloudinary')) {
                        ogImageUrl = imageUrl.replace(
                            '/upload/', 
                            '/upload/w_1200,h_630,c_pad,b_auto:predominant,q_auto,f_jpg/'
                        );
                        console.log('☁️ Cloudinary OG:', ogImageUrl.substring(0, 80) + '...');
                        debugInfo.push('Source: Cloudinary');
                    } 
                    // Обычный URL
                    else if (imageUrl.startsWith('http')) {
                        ogImageUrl = imageUrl;
                        console.log('🔗 External image URL');
                        debugInfo.push('Source: External URL');
                    }
                }
                
                // Проверяем base64 отдельно (только как последний fallback перед SVG)
                if (!ogImageUrl) {
                    for (const field of possibleImageFields) {
                        if (card[field] && typeof card[field] === 'string' && card[field].startsWith('data:image')) {
                            console.log('📦 Base64 detected - cannot use for OG, using SVG generator');
                            debugInfo.push('Source: Base64 (fallback to SVG)');
                            ogImageUrl = `${baseUrl}/api/og-image?title=${encodeURIComponent(title)}&text=${encodeURIComponent(description)}&style=${card.style || 'classic'}`;
                            break;
                        }
                    }
                }
                
            } else {
                console.log('❌ Card not found in Redis:', code);
                debugInfo.push('Card not found');
            }
        } catch (err) {
            console.error('❌ Redis error:', err.message);
            debugInfo.push(`Redis error: ${err.message}`);
        }
    } else {
        console.log('⚠️ Redis not configured');
        debugInfo.push('Redis not configured');
    }
    
    // Если картинка так и не найдена - используем SVG генератор
    if (!ogImageUrl) {
        ogImageUrl = `${baseUrl}/api/og-image?title=${encodeURIComponent(title)}&text=${encodeURIComponent(description)}&style=classic`;
        console.log('🎨 Using SVG fallback:', ogImageUrl);
        debugInfo.push('Fallback: SVG generator');
    }
    
    const viewerUrl = `${baseUrl}/card-viewer.html?sc=${code}`;
    const shortUrl = `${baseUrl}/c/${code}`;
    
    console.log('📋 Final OG data:');
    console.log('   Title:', title);
    console.log('   Description:', description.substring(0, 50) + '...');
    console.log('   Image:', ogImageUrl.substring(0, 80) + '...');
    
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
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:alt" content="${esc(title)}">
    <meta property="og:site_name" content="CardGift">
    <meta property="og:locale" content="ru_RU">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${ogImageUrl}">
    
    <!-- Instant redirect via JS only (bots don't execute JS) -->
    <script>window.location.replace('${viewerUrl}');</script>
    
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;text-align:center;padding:20px}
        .container{background:rgba(0,0,0,0.3);padding:40px;border-radius:24px;backdrop-filter:blur(10px);max-width:400px;width:100%}
        .logo{font-size:72px;margin-bottom:20px;animation:bounce 1s ease infinite}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        h1{color:#FFD700;margin:15px 0;font-size:22px;line-height:1.3}
        p{color:rgba(255,255,255,0.8);margin:10px 0;font-size:14px}
        .spinner{width:40px;height:40px;border:3px solid rgba(255,215,0,.2);border-top-color:#FFD700;border-radius:50%;animation:spin 1s linear infinite;margin:25px auto}
        @keyframes spin{to{transform:rotate(360deg)}}
        a{color:#FFD700;text-decoration:none;background:rgba(255,215,0,0.15);padding:12px 24px;border-radius:25px;display:inline-block;margin-top:15px;font-weight:600;transition:all 0.3s}
        a:hover{background:rgba(255,215,0,0.3);transform:scale(1.05)}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🎁</div>
        <h1>${esc(title)}</h1>
        <p>${esc(description)}</p>
        <div class="spinner"></div>
        <p style="font-size:12px;opacity:0.6">Открываем открытку...</p>
        <a href="${viewerUrl}">Открыть сейчас →</a>
    </div>
    <!-- Debug: ${debugInfo.join(' | ')} -->
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.setHeader('X-Card-Found', cardFound ? 'true' : 'false');
    res.setHeader('X-OG-Image', ogImageUrl.substring(0, 100));
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
