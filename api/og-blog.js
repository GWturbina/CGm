// Vercel Serverless Function - OG Image для блога
// /api/og-blog.js
// Генерирует красивое превью для шаринга блога

module.exports = async function handler(req, res) {
    const { 
        title = 'Блог на CardGift',
        desc = 'Читайте интересные посты',
        username = 'user',
        color = '#FFD700',
        avatar = ''
    } = req.query;
    
    // Обрезаем текст если слишком длинный
    const safeTitle = String(title).slice(0, 40);
    const safeDesc = String(desc).slice(0, 100);
    const safeUsername = String(username).slice(0, 20);
    
    // Цвет темы
    const themeColor = color.startsWith('#') ? color : '#FFD700';
    
    // SVG картинка 1200x630 (стандарт для OG)
    const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a14"/>
      <stop offset="50%" style="stop-color:#12121e"/>
      <stop offset="100%" style="stop-color:#1a1a2e"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FFD700"/>
      <stop offset="100%" style="stop-color:#FFA500"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${themeColor}"/>
      <stop offset="100%" style="stop-color:${themeColor}99"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Фон -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  
  <!-- Декоративные элементы -->
  <circle cx="100" cy="100" r="200" fill="${themeColor}" opacity="0.05"/>
  <circle cx="1100" cy="530" r="250" fill="${themeColor}" opacity="0.05"/>
  
  <!-- Верхняя полоса с цветом темы -->
  <rect x="0" y="0" width="1200" height="8" fill="url(#accent)"/>
  
  <!-- CardGift лого в углу -->
  <g transform="translate(50, 40)">
    <rect x="0" y="0" width="50" height="50" rx="12" fill="url(#gold)"/>
    <text x="25" y="35" font-size="28" text-anchor="middle" fill="#000">🎁</text>
    <text x="65" y="35" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#gold)">CardGift</text>
  </g>
  
  <!-- Аватар блога (круг) -->
  <g transform="translate(600, 180)">
    <circle cx="0" cy="0" r="85" fill="${themeColor}" opacity="0.2"/>
    <circle cx="0" cy="0" r="75" fill="#1a1a2e" stroke="${themeColor}" stroke-width="4"/>
    <text x="0" y="15" font-size="50" text-anchor="middle" fill="${themeColor}">📝</text>
  </g>
  
  <!-- Название блога -->
  <text x="600" y="320" 
        font-family="Georgia, serif" 
        font-size="52" 
        font-weight="bold" 
        text-anchor="middle" 
        fill="#ffffff"
        filter="url(#shadow)">
    ${escapeXml(safeTitle)}
  </text>
  
  <!-- Username -->
  <text x="600" y="370" 
        font-family="Arial, sans-serif" 
        font-size="24" 
        text-anchor="middle" 
        fill="${themeColor}">
    @${escapeXml(safeUsername)}
  </text>
  
  <!-- Описание -->
  <text x="600" y="430" 
        font-family="Arial, sans-serif" 
        font-size="22" 
        text-anchor="middle" 
        fill="#a0a0b0">
    ${escapeXml(safeDesc)}
  </text>
  
  <!-- Призыв к действию -->
  <g transform="translate(600, 520)">
    <rect x="-140" y="-30" width="280" height="60" rx="30" fill="url(#accent)"/>
    <text x="0" y="8" 
          font-family="Arial, sans-serif" 
          font-size="22" 
          font-weight="bold"
          text-anchor="middle" 
          fill="#000">
      Читать блог →
    </text>
  </g>
  
  <!-- Нижняя полоса -->
  <rect x="0" y="622" width="1200" height="8" fill="url(#accent)"/>
</svg>`;

    // Возвращаем SVG как изображение
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.status(200).send(svg);
};

function escapeXml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
