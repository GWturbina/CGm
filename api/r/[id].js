// Vercel Serverless Function - Короткие реферальные ссылки
// v1.0 - /api/r/[id].js
// Пример: cardgift.io/r/9729645 → /registration.html?ref=9729645

module.exports = async function handler(req, res) {
    const { id } = req.query;
    
    console.log('🔗 Referral link request:', id);
    
    if (!id || id.length < 3) {
        return res.status(400).send('Invalid referral ID');
    }
    
    const baseUrl = `https://${req.headers.host}`;
    
    // Очищаем ID от возможных префиксов
    let cleanId = id;
    if (cleanId.startsWith('GW')) cleanId = cleanId.substring(2);
    if (cleanId.startsWith('CG_TEMP_')) cleanId = cleanId.substring(8);
    
    const registrationUrl = `${baseUrl}/registration.html?ref=${cleanId}`;
    const shortUrl = `${baseUrl}/r/${id}`;
    
    // Данные для OG
    const title = '🎁 CardGift - Бесплатный генератор открыток';
    const description = 'Получите бесплатный генератор персональных открыток! Создавайте уникальные поздравления с AI.';
    const ogImageUrl = `${baseUrl}/images/og-referral.jpg`; // или SVG fallback
    
    console.log('📋 Redirect to:', registrationUrl);
    
    // HTML с Open Graph для красивого превью в мессенджерах
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
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="CardGift">
    <meta property="og:locale" content="ru_RU">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${ogImageUrl}">
    
    <!-- Instant redirect -->
    <script>window.location.replace('${registrationUrl}');</script>
    <noscript><meta http-equiv="refresh" content="0;url=${registrationUrl}"></noscript>
    
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;text-align:center;padding:20px}
        .container{background:rgba(255,215,0,0.1);padding:40px;border-radius:24px;backdrop-filter:blur(10px);max-width:400px;width:100%;border:1px solid rgba(255,215,0,0.2)}
        .logo{font-size:72px;margin-bottom:20px;animation:bounce 1s ease infinite}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        h1{color:#FFD700;margin:15px 0;font-size:24px}
        p{color:rgba(255,255,255,0.8);margin:10px 0;font-size:14px}
        .spinner{width:40px;height:40px;border:3px solid rgba(255,215,0,.2);border-top-color:#FFD700;border-radius:50%;animation:spin 1s linear infinite;margin:25px auto}
        @keyframes spin{to{transform:rotate(360deg)}}
        a{color:#1a1a2e;background:#FFD700;padding:14px 28px;border-radius:25px;display:inline-block;margin-top:15px;font-weight:600;text-decoration:none;transition:all 0.3s}
        a:hover{transform:scale(1.05);box-shadow:0 5px 20px rgba(255,215,0,0.4)}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🎁</div>
        <h1>CardGift</h1>
        <p>Бесплатный генератор персональных открыток</p>
        <div class="spinner"></div>
        <p style="font-size:12px;opacity:0.6">Переходим к регистрации...</p>
        <a href="${registrationUrl}">Получить генератор →</a>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
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
