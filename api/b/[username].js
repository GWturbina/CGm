// Vercel Serverless Function - Короткие ссылки на блог
// v2.0 - /api/b/[username].js
// Пример: cardgift.io/b/grigory → /blog.html?user=grigory

module.exports = async function handler(req, res) {
    const { username } = req.query;
    
    console.log('📝 Blog link request:', username);
    
    if (!username || username.length < 2) {
        return res.status(400).send('Invalid username');
    }
    
    const baseUrl = `https://${req.headers.host}`;
    const blogUrl = `${baseUrl}/blog.html?user=${encodeURIComponent(username)}`;
    const shortUrl = `${baseUrl}/b/${username}`;
    
    // Загружаем данные блога из Supabase
    let title = `Блог @${username}`;
    let description = `Читайте блог пользователя ${username} на платформе CardGift`;
    let themeColor = '#FFD700';
    let customOgImage = null;
    
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (SUPABASE_URL && SUPABASE_KEY) {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/blog_settings?username=eq.${encodeURIComponent(username)}&select=*`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    }
                }
            );
            const data = await response.json();
            
            if (data && data[0]) {
                title = data[0].blog_title || title;
                description = data[0].blog_description || description;
                themeColor = data[0].theme_color || themeColor;
                // Если есть своя картинка превью — используем её
                if (data[0].og_image_url) {
                    customOgImage = data[0].og_image_url;
                }
                console.log('✅ Blog settings loaded for:', username);
            }
        } catch (e) {
            console.warn('⚠️ Supabase error:', e.message);
        }
    }
    
    // Если есть своя картинка — используем её, иначе генерируем
    let ogImageUrl;
    if (customOgImage) {
        ogImageUrl = customOgImage;
    } else {
        const ogImageParams = new URLSearchParams({
            title: title,
            desc: description.slice(0, 100),
            username: username,
            color: themeColor
        });
        ogImageUrl = `${baseUrl}/api/og-blog?${ogImageParams}`;
    }
    
    console.log('📋 Redirect to:', blogUrl);
    
    // HTML с Open Graph для красивого превью
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
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="CardGift">
    <meta property="og:locale" content="ru_RU">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${ogImageUrl}">
    
    <!-- Theme Color -->
    <meta name="theme-color" content="${themeColor}">
    
    <!-- Instant redirect -->
    <script>window.location.replace('${blogUrl}');</script>
    <noscript><meta http-equiv="refresh" content="0;url=${blogUrl}"></noscript>
    
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;text-align:center;padding:20px}
        .container{background:rgba(255,215,0,0.1);padding:40px;border-radius:24px;backdrop-filter:blur(10px);max-width:400px;width:100%;border:1px solid ${themeColor}40}
        .logo{font-size:72px;margin-bottom:20px}
        h1{color:${themeColor};margin:15px 0;font-size:24px}
        p{color:rgba(255,255,255,0.8);margin:10px 0;font-size:14px}
        .spinner{width:40px;height:40px;border:3px solid ${themeColor}30;border-top-color:${themeColor};border-radius:50%;animation:spin 1s linear infinite;margin:25px auto}
        @keyframes spin{to{transform:rotate(360deg)}}
        a{color:#1a1a2e;background:${themeColor};padding:14px 28px;border-radius:25px;display:inline-block;margin-top:15px;font-weight:600;text-decoration:none;transition:all 0.3s}
        a:hover{transform:scale(1.05);box-shadow:0 5px 20px ${themeColor}60}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">📝</div>
        <h1>${esc(title.replace(' | CardGift', ''))}</h1>
        <p>Переходим в блог...</p>
        <div class="spinner"></div>
        <a href="${blogUrl}">Открыть блог →</a>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
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
