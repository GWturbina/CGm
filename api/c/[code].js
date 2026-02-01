// api/c/[code].js
// Короткие ссылки CardGift
// v5.0 - ИСПРАВЛЕНО: передаём ref при редиректе на card-viewer

module.exports = async function handler(req, res) {
    const { code, ref } = req.query;  // Получаем ref из URL!
    
    console.log('🔗 Short link request:', code, 'ref:', ref || 'none');
    
    if (!code || code.length < 4) {
        return res.status(400).send('Invalid code');
    }
    
    const baseUrl = `https://${req.headers.host}`;
    
    // Дефолтные значения
    let title = '🎁 CardGift - Персональная открытка';
    let description = 'Посмотрите открытку, созданную специально для вас!';
    let ogImageUrl = null;
    let cardFound = false;
    let debugInfo = [];
    
    // === 1. SUPABASE (PRIMARY) ===
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (SUPABASE_URL && SUPABASE_KEY) {
        try {
            console.log('📡 Loading from Supabase...');
            
            // ИСПРАВЛЕНО: используем short_code, не card_code!
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/cards?short_code=eq.${code}&select=*`,
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
                const cardData = card.card_data || {};
                cardFound = true;
                console.log('✅ Card found in Supabase:', code);
                
                // Текст - из card_data
                const greetingText = cardData.message || cardData.greeting || cardData.title || card.title || '';
                if (greetingText) {
                    const lines = greetingText.split('\n').filter(l => l.trim());
                    if (lines.length > 0) {
                        title = lines[0].substring(0, 60) || title;
                        description = lines.slice(1).join(' ').substring(0, 150) || description;
                    }
                }
                
                // Заголовок из card_data
                if (cardData.title) {
                    title = cardData.title.substring(0, 60);
                }
                
                // === ПРИОРИТЕТ ИЗОБРАЖЕНИЙ ===
                // 1. Пользовательская обложка для видео (thumbnailUrl)
                // 2. Обычная картинка (image_url)
                // 3. YouTube thumbnail (автоматически)
                
                // Сначала проверяем пользовательскую обложку для видео
                const thumbnailUrl = cardData.thumbnailUrl || cardData.thumbnail_url;
                if (thumbnailUrl && thumbnailUrl.startsWith('http')) {
                    if (thumbnailUrl.includes('cloudinary')) {
                        ogImageUrl = thumbnailUrl.replace('/upload/', '/upload/w_1200,h_630,c_pad,b_auto:predominant,q_auto,f_jpg/');
                    } else {
                        ogImageUrl = thumbnailUrl;
                    }
                    console.log('🖼️ Using custom thumbnail for video');
                }
                
                // Если нет thumbnail, используем обычную картинку
                if (!ogImageUrl) {
                    const imageUrl = cardData.image_url || card.image_url || card.cloudinary_url;
                    if (imageUrl && imageUrl.startsWith('http')) {
                        if (imageUrl.includes('cloudinary')) {
                            ogImageUrl = imageUrl.replace('/upload/', '/upload/w_1200,h_630,c_pad,b_auto:predominant,q_auto,f_jpg/');
                        } else {
                            ogImageUrl = imageUrl;
                        }
                        console.log('🖼️ Using Supabase image');
                    }
                }
                
                // YouTube thumbnail
                const videoUrl = cardData.video_url || card.video_url;
                if (!ogImageUrl && videoUrl) {
                    const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
                    if (ytMatch) {
                        ogImageUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
                    }
                }
                
                debugInfo.push('Source: Supabase');
                
                // Увеличиваем счётчик просмотров
                try {
                    await fetch(
                        `${SUPABASE_URL}/rest/v1/rpc/increment_card_views`,
                        {
                            method: 'POST',
                            headers: {
                                'apikey': SUPABASE_KEY,
                                'Authorization': `Bearer ${SUPABASE_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ card_short_code: code })
                        }
                    );
                } catch (viewErr) {
                    // Не критично если не сработало
                    console.warn('Views increment failed:', viewErr.message);
                }
            } else {
                console.log('📭 Card not found in Supabase:', code);
                debugInfo.push('Not found in Supabase');
            }
        } catch (err) {
            console.error('❌ Supabase error:', err.message);
            debugInfo.push(`Supabase error: ${err.message}`);
        }
    } else {
        console.error('❌ Supabase not configured');
        debugInfo.push('Supabase not configured');
    }
    
    // Если картинка не найдена - SVG fallback
    if (!ogImageUrl) {
        ogImageUrl = `${baseUrl}/api/og-image?title=${encodeURIComponent(title)}&text=${encodeURIComponent(description)}&style=classic`;
        debugInfo.push('Fallback: SVG generator');
    }
    
    // ═══════════════════════════════════════════════════════════
    // ВАЖНО: Передаём ref в card-viewer чтобы цепочка не рвалась!
    // ═══════════════════════════════════════════════════════════
    let viewerUrl = `${baseUrl}/card-viewer.html?sc=${code}`;
    if (ref) {
        viewerUrl += `&ref=${encodeURIComponent(ref)}`;
    }
    const shortUrl = `${baseUrl}/c/${code}${ref ? '?ref=' + encodeURIComponent(ref) : ''}`;
    
    console.log('📋 Final OG:', title.substring(0, 30), '| Found:', cardFound);
    
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
