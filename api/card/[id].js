// Vercel Serverless Function - страница карточки с OG мета-тегами
// Путь: /api/card/[id].js
// URL: /api/card/card_xxx?title=...&text=...&style=...&img=...
// ИСПРАВЛЕНО: Динамический og:image:type для Cloudinary

module.exports = function handler(req, res) {
    const { id } = req.query;
    const title = decodeURIComponent(req.query.title || 'Personal Greeting Card');
    const text = decodeURIComponent(req.query.text || 'Beautiful personalized card created with CardGift');
    const style = req.query.style || 'classic';
    const img = req.query.img ? decodeURIComponent(req.query.img) : null;
    
    // Базовый URL сайта
    const baseUrl = `https://${req.headers.host}`;
    
    // URL картинки превью - если есть реальное фото, используем его
    let ogImageUrl;
    let ogImageType = 'image/png'; // По умолчанию для SVG fallback
    
    if (img && img.includes('cloudinary')) {
        // Используем Cloudinary URL напрямую (он уже оптимизирован)
        ogImageUrl = img;
        
        // Определяем тип изображения по расширению
        if (img.includes('.jpg') || img.includes('.jpeg')) {
            ogImageType = 'image/jpeg';
        } else if (img.includes('.png')) {
            ogImageType = 'image/png';
        } else if (img.includes('.webp')) {
            ogImageType = 'image/webp';
        } else if (img.includes('.gif')) {
            ogImageType = 'image/gif';
        } else {
            // Cloudinary по умолчанию отдаёт JPEG
            ogImageType = 'image/jpeg';
        }
        
        console.log('☁️ Using Cloudinary image:', ogImageUrl);
    } else {
        // Генерируем превью через API (SVG fallback)
        ogImageUrl = `${baseUrl}/api/og-image?title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}&style=${style}&id=${id}`;
        ogImageType = 'image/png';
    }
    
    // URL страницы просмотра (куда редиректим)
    const viewerUrl = `${baseUrl}/card-viewer.html?id=${id}`;
    
    // НЕ используем meta refresh - боты его читают и следуют
    // Используем ТОЛЬКО JavaScript редирект - боты НЕ выполняют JS
    const redirectScript = `
    <script>
        // Редирект только через JS - боты не выполняют JavaScript
        setTimeout(function() {
            window.location.href = '${viewerUrl}';
        }, 500);
    </script>`;
    
    // HTML страница с мета-тегами
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} - CardGift</title>
    
    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${baseUrl}/api/card/${id}">
    <meta property="og:title" content="🎁 ${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(text)}">
    <meta property="og:image" content="${ogImageUrl}">
    <meta property="og:image:type" content="${ogImageType}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${escapeHtml(title)}">
    <meta property="og:site_name" content="CardGift">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="🎁 ${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(text)}">
    <meta name="twitter:image" content="${ogImageUrl}">
    
    <!-- Favicon -->
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎁</text></svg>">
    
    <!-- БЕЗ meta refresh - боты его читают! Редирект только через JS -->
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #0d0d0d 100%);
            color: #fff;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
        }
        .loader {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 215, 0, 0.3);
            border-top-color: #FFD700;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        h1 { color: #FFD700; margin: 0; }
        p { opacity: 0.7; margin: 10px 0; }
        a { color: #FFD700; }
        .preview-img { max-width: 100%; border-radius: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="loader">
        <div class="spinner"></div>
        <h1>🎁 CardGift</h1>
        <p>Загружаем открытку...</p>
        <p><a href="${viewerUrl}">Нажмите здесь, если перенаправление не сработало</a></p>
    </div>
    ${redirectScript}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.status(200).send(html);
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
