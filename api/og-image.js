// Vercel Serverless Function - генерация OG изображения (SVG)
// Поддерживает: открытки (card) и опросы (survey)

module.exports = function handler(req, res) {
    const type = req.query.type || 'card'; // card, survey
    const title = decodeURIComponent(req.query.title || 'CardGift');
    const text = decodeURIComponent(req.query.text || req.query.desc || '');
    const style = req.query.style || req.query.theme || 'classic';
    const emoji = decodeURIComponent(req.query.emoji || '');
    const questions = req.query.q || '';
    const author = decodeURIComponent(req.query.author || '');
    
    // Цветовые схемы
    const styles = {
        // Для открыток
        classic: { bg1: '#1a1a2e', bg2: '#16213e', accent: '#FFD700', text: '#fff' },
        sunset: { bg1: '#ff6b6b', bg2: '#ee5a24', accent: '#feca57', text: '#fff' },
        ocean: { bg1: '#0077b6', bg2: '#023e8a', accent: '#00b4d8', text: '#fff' },
        forest: { bg1: '#2d6a4f', bg2: '#1b4332', accent: '#95d5b2', text: '#fff' },
        space: { bg1: '#0d0221', bg2: '#240046', accent: '#9d4edd', text: '#fff' },
        neon: { bg1: '#0a0a0a', bg2: '#1a1a2e', accent: '#00ff87', text: '#fff' },
        romantic: { bg1: '#ffafcc', bg2: '#ff85a1', accent: '#ff006e', text: '#fff' },
        minimal: { bg1: '#ffffff', bg2: '#f8f9fa', accent: '#000000', text: '#333' },
        // Для опросов
        dark: { bg1: '#1a1a2e', bg2: '#0f0f23', accent: '#FFD700', text: '#fff' },
        light: { bg1: '#f5f7fa', bg2: '#c3cfe2', accent: '#d4a017', text: '#1a1a2e' },
        gold: { bg1: '#2c1810', bg2: '#0d0705', accent: '#FFD700', text: '#FFD700' },
        blue: { bg1: '#667eea', bg2: '#764ba2', accent: '#FFD700', text: '#fff' },
        green: { bg1: '#134e5e', bg2: '#71b280', accent: '#FFD700', text: '#fff' }
    };
    
    const colors = styles[style] || styles.classic;
    
    let svg;
    
    if (type === 'survey') {
        // === ОПРОС ===
        svg = generateSurveySvg(title, text, emoji, colors, questions, author);
    } else {
        // === ОТКРЫТКА ===
        svg = generateCardSvg(title, text, colors, style);
    }
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.status(200).send(svg);
};

// Генератор SVG для открытки
function generateCardSvg(title, text, colors, style) {
    const displayTitle = title.length > 40 ? title.substring(0, 37) + '...' : title;
    const displayText = text.length > 80 ? text.substring(0, 77) + '...' : text;
    const btnTextColor = style === 'minimal' ? '#fff' : '#000';
    
    return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${colors.bg1}"/>
                <stop offset="100%" style="stop-color:${colors.bg2}"/>
            </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#bg)"/>
        <circle cx="100" cy="80" r="120" fill="rgba(255,255,255,0.1)"/>
        <circle cx="1100" cy="550" r="180" fill="rgba(255,255,255,0.05)"/>
        <rect x="150" y="80" width="900" height="470" rx="30" fill="rgba(255,255,255,0.1)" stroke="${colors.accent}" stroke-width="3"/>
        <text x="600" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="60" fill="${colors.accent}">🎁 CardGift</text>
        <text x="600" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="${colors.text}">${escapeXml(displayTitle)}</text>
        <text x="600" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="${colors.text}" opacity="0.8">${escapeXml(displayText)}</text>
        <rect x="400" y="420" width="400" height="60" rx="30" fill="${colors.accent}"/>
        <text x="600" y="462" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${btnTextColor}">Открыть открытку</text>
        <text x="600" y="590" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="${colors.text}" opacity="0.6">Web3 Digital Greeting Cards Platform</text>
    </svg>`;
}

// Генератор SVG для опроса
function generateSurveySvg(title, description, emoji, colors, questions, author) {
    const displayTitle = title.length > 45 ? title.substring(0, 42) + '...' : title;
    const displayDesc = description.length > 90 ? description.substring(0, 87) + '...' : description;
    const icon = emoji || '📋';
    
    // Метаданные
    let metaText = '';
    if (questions) metaText += `📝 ${questions} вопросов`;
    if (author) metaText += (metaText ? '   •   ' : '') + `👤 ${author}`;
    
    return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${colors.bg1}"/>
                <stop offset="100%" style="stop-color:${colors.bg2}"/>
            </linearGradient>
        </defs>
        
        <!-- Фон -->
        <rect width="1200" height="630" fill="url(#bg)"/>
        
        <!-- Декоративные элементы -->
        <circle cx="1050" cy="100" r="200" fill="rgba(255,255,255,0.03)"/>
        <circle cx="150" cy="530" r="150" fill="rgba(255,255,255,0.03)"/>
        
        <!-- Декоративная иконка справа вверху -->
        <text x="1080" y="120" text-anchor="middle" font-size="100" opacity="0.1">${icon}</text>
        
        <!-- Основная иконка -->
        <text x="600" y="200" text-anchor="middle" font-size="90">${icon}</text>
        
        <!-- Заголовок -->
        <text x="600" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="bold" fill="${colors.text}">${escapeXml(displayTitle)}</text>
        
        <!-- Описание -->
        ${displayDesc ? `<text x="600" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="${colors.text}" opacity="0.7">${escapeXml(displayDesc)}</text>` : ''}
        
        <!-- Метаданные -->
        ${metaText ? `<text x="600" y="450" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="${colors.accent}">${escapeXml(metaText)}</text>` : ''}
        
        <!-- Кнопка -->
        <rect x="420" y="480" width="360" height="55" rx="27" fill="${colors.accent}"/>
        <text x="600" y="518" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#000">Пройти опрос →</text>
        
        <!-- Футер -->
        <text x="600" y="600" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="${colors.text}" opacity="0.5">⭐ CardGift</text>
    </svg>`;
}

function escapeXml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
