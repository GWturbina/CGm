// Vercel Serverless Function
// /api/p/[id].js
// Короткая ссылка на пост с Open Graph превью

export default async function handler(req, res) {
    const { id } = req.query;
    
    if (!id) {
        res.status(404).send('Post not found');
        return;
    }
    
    const baseUrl = `https://${req.headers.host}`;
    const postUrl = `${baseUrl}/blog.html?post=${id}`;
    const shortUrl = `${baseUrl}/p/${id}`;
    
    // Данные по умолчанию
    let title = 'Пост на CardGift';
    let description = 'Читайте интересный пост на платформе CardGift';
    let themeColor = '#FFD700';
    // Дефолтная картинка - генерируется через API
    let ogImageUrl = `${baseUrl}/api/og-blog?title=Пост&desc=CardGift&type=post`;
    
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://imgpysvdosdsqucoghqa.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
    
    if (SUPABASE_KEY) {
        try {
            // Загружаем данные поста
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${encodeURIComponent(id)}&select=*`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    }
                }
            );
            const posts = await response.json();
            
            if (posts && posts[0]) {
                const post = posts[0];
                title = post.title || title;
                
                // Описание: excerpt или начало content
                if (post.excerpt) {
                    description = post.excerpt;
                } else if (post.content) {
                    description = post.content.replace(/<[^>]*>/g, '').slice(0, 150) + '...';
                }
                
                // Картинка: og_image_url > media_url > генерация
                // ВАЖНО: base64 (data:) не работает для OG - только URL!
                const hasValidOgImage = post.og_image_url && !post.og_image_url.startsWith('data:');
                const hasValidMedia = post.media_url && !post.media_url.startsWith('data:');
                
                if (hasValidOgImage) {
                    ogImageUrl = post.og_image_url;
                } else if (hasValidMedia) {
                    ogImageUrl = post.media_url;
                } else {
                    // Генерируем картинку через API
                    const ogParams = new URLSearchParams({
                        title: (title || 'Пост').slice(0, 40),
                        desc: (description || '').slice(0, 80),
                        type: 'post'
                    });
                    ogImageUrl = `${baseUrl}/api/og-blog?${ogParams}`;
                }
                
                console.log('✅ Post loaded:', id, title, 'image:', ogImageUrl.slice(0, 50) + '...');
            }
        } catch (e) {
            console.warn('⚠️ Supabase error:', e.message);
        }
    }
    
    // HTML с Open Graph метатегами
    const html = `<!DOCTYPE html>
<html lang="ru" prefix="og: https://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)} | CardGift</title>
    
    <!-- Open Graph -->
    <meta property="og:type" content="article">
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
    
    <!-- Redirect -->
    <meta http-equiv="refresh" content="0;url=${postUrl}">
    <script>window.location.replace('${postUrl}');</script>
    
    <style>
        body {
            font-family: system-ui, sans-serif;
            background: #0a0a14;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
        }
        .loading { text-align: center; }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #333;
            border-top-color: ${themeColor};
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        a { color: ${themeColor}; }
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <p>Загрузка поста...</p>
        <p><a href="${postUrl}">Нажмите здесь</a>, если не перенаправило</p>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    res.status(200).send(html);
}

function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
