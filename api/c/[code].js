// Vercel Serverless Function - Короткие ссылки CardGift
// v2.4 - Добавлен Supabase fallback
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
    let ogImageUrl = null;
    let cardFound = false;
    let debugInfo = [];
    
    // === 1. REDIS ===
    if (REDIS_URL && REDIS_TOKEN) {
        try {
            console.log('📡 Loading from Redis...');
            
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
                console.log('✅ Card found in Redis:', code);
                
                // Текст
                const greetingText = card.greeting || card.greetingText || card.message || '';
                if (greetingText) {
                    const lines = greetingText.split('\n').filter(l => l.trim());
                    if (lines.length > 0) {
                        title = lines[0].substring(0, 60) || title;
                        description = lines.slice(1).join(' ').substring(0, 150) || description;
                    }
                }
                
                // Картинка
                const possibleImageFields = ['cloudinaryUrl', 'mediaUrl', 'imageUrl', 'image_url', 'preview'];
                for (const field of possibleImageFields) {
                    if (card[field] && typeof card[field] === 'string' && card[field].startsWith('http')) {
                        if (card[field].includes('cloudinary')) {
                            ogImageUrl = card[field].replace('/upload/', '/upload/w_1200,h_630,c_pad,b_auto:predominant,q_auto,f_jpg/');
                        } else {
                            ogImageUrl = card[field];
                        }
                        break;
                    }
                }
                
                // YouTube thumbnail
                if (!ogImageUrl && (card.videoUrl || card.video_url)) {
                    const videoUrl = card.videoUrl || card.video_url;
                    const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
                    if (ytMatch) {
                        ogImageUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
                    }
                }
                
                debugInfo.push('Source: Redis');
            }
        } catch (err) {
            console.error('❌ Redis error:', err.message);
            debugInfo.push(`Redis error: ${err.message}`);
        }
    }
    
    // === 2. SUPABASE FALLBACK ===
    if (!cardFound) {
        const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
        
        if (SUPABASE_URL && SUPABASE_KEY) {
            try {
                console.log('📡 Trying Supabase fallback...');
                
                const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/cards?card_code=eq.${code}&select=*`,
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
                    cardFound = true;
                    console.log('✅ Card found in Supabase:', code);
                    
                    // Текст
                    const greetingText = card.message || card.title || '';
                    if (greetingText) {
                        const lines = greetingText.split('\n').filter(l => l.trim());
                        if (lines.length > 0) {
                            title = lines[0].substring(0, 60) || title;
                            description = lines.slice(1).join(' ').substring(0, 150) || description;
                        }
                    }
                    if (card.title && !title.includes(card.title)) {
                        title = card.title.substring(0, 60);
                    }
                    
                    // Картинка
                    const imageUrl = card.image_url || card.cloudinary_url || card.media_url || card.preview_url;
                    if (imageUrl && imageUrl.startsWith('http')) {
                        if (imageUrl.includes('cloudinary')) {
                            ogImageUrl = imageUrl.replace('/upload/', '/upload/w_1200,h_630,c_pad,b_auto:predominant,q_auto,f_jpg/');
                        } else {
                            ogImageUrl = imageUrl;
                        }
                        console.log('🖼️ Using Supabase image:', ogImageUrl.substring(0, 60) + '...');
                    }
                    
                    // YouTube
                    if (!ogImageUrl && card.video_url) {
                        const ytMatch = card.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
                        if (ytMatch) {
                            ogImageUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
                        }
                    }
                    
                    debugInfo.push('Source: Supabase');
                } else {
                    console.log('❌ Card not found in Supabase:', code);
                    debugInfo.push('Not found in Supabase');
                }
            } catch (err) {
                console.error('❌ Supabase error:', err.message);
                debugInfo.push(`Supabase error: ${err.message}`);
            }
        }
    }
    
    // Если картинка так и не найдена - SVG fallback
    if (!ogImageUrl) {
        ogImageUrl = `${baseUrl}/api/og-image?title=${encodeURIComponent(title)}&text=${encodeURIComponent(description)}&style=classic`;
        debugInfo.push('Fallback: SVG generator');
    }
    
    const viewerUrl = `${baseUrl}/card-viewer.html?sc=${code}`;
    const shortUrl = `${baseUrl}/c/${code}`;
    
    console.log('📋 Final OG:', title.substring(0, 30), '| Image:', ogImageUrl.substring(0, 50) + '...');
    
    // HTML с Open Graph
    const html = `<!DOCTYPE html>
<html lang="ru" prefix="og: https://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    
    <meta property="og:type" content="website">
    <meta property="og:url" content="${shortUrl}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${ogImageUrl}">
    <meta property="og:image:secure_url" content="${ogImageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:site_name" content="CardGift">
    <meta property="og:locale" content="ru_RU">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${ogImageUrl}">
    
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
