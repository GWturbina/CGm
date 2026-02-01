/* =====================================================
   CARDGIFT - CARD VIEWER PAGE JAVASCRIPT
   Логика страницы просмотра открыток
   v4.0 - Добавлена поддержка textPosition
   ===================================================== */

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let cardId = null;
let cardData = null;
let currentLanguage = 'en';
let currentUrl = window.location.href;
let viewStartTime = Date.now();
let isDemo = false;

// ===== ВИДЕО ПРОЦЕССОР =====
class EnhancedVideoProcessor {
    constructor() {
        this.supportedPlatforms = {
            youtube: {
                patterns: [
                    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
                    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
                    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
                    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
                ],
                embed: (id) => `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&controls=1&rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`
            },
            tiktok: {
                patterns: [
                    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
                    /vm\.tiktok\.com\/([a-zA-Z0-9]+)/
                ],
                embed: (id) => `https://www.tiktok.com/embed/v2/${id}`
            },
            instagram: {
                patterns: [
                    /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
                    /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/
                ],
                embed: (id) => `https://www.instagram.com/p/${id}/embed/`
            }
        };
    }

    parseVideoUrl(url) {
        if (!url || typeof url !== 'string') {
            return { isValid: false, error: 'Invalid URL' };
        }

        url = url.trim();
        
        url = url
            .replace(/&#x2F;/g, '/')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'");

        for (const [platform, config] of Object.entries(this.supportedPlatforms)) {
            for (const pattern of config.patterns) {
                const match = url.match(pattern);
                if (match) {
                    const videoId = match[1];
                    return {
                        isValid: true,
                        platform: platform,
                        videoId: videoId,
                        originalUrl: url,
                        embedUrl: config.embed(videoId)
                    };
                }
            }
        }

        return { isValid: false, error: 'Unsupported video platform' };
    }

    createEnhancedVideoElement(videoData, container) {
        if (!videoData.isValid) {
            this.showVideoError(container, videoData.error || 'Invalid video URL');
            return;
        }

        container.innerHTML = '';
        container.style.background = '#000';

        const videoContainer = document.createElement('div');
        videoContainer.className = `${videoData.platform}-container video-container`;
        videoContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 5;
            background: #000;
            border-radius: inherit;
            overflow: hidden;
        `;

        const iframe = document.createElement('iframe');
        iframe.src = videoData.embedUrl;
        iframe.frameBorder = '0';
        iframe.allowFullscreen = true;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
        iframe.sandbox = 'allow-scripts allow-same-origin allow-presentation allow-forms';
        iframe.loading = 'lazy';
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: all;
            border-radius: inherit;
        `;

        iframe.onload = () => {
            console.log(`✅ ${videoData.platform} video loaded successfully`);
            this.hideVideoLoading(videoContainer);
        };

        iframe.onerror = () => {
            console.error(`❌ ${videoData.platform} video failed to load`);
            this.showVideoError(container, `Failed to load ${videoData.platform} video`);
        };

        this.showVideoLoading(videoContainer, videoData.platform);

        videoContainer.appendChild(iframe);
        container.appendChild(videoContainer);

        if (videoData.platform === 'youtube') {
            this.createSoundControlButton(videoContainer, iframe);
        }

        return { iframe, container: videoContainer };
    }

    createSoundControlButton(container, iframe) {
        const soundBtn = document.createElement('button');
        soundBtn.className = 'sound-control-btn';
        soundBtn.innerHTML = '🔊 Sound';
        soundBtn.style.cssText = `
            position: absolute;
            top: 15px;
            right: 15px;
            z-index: 100;
            background: rgba(0, 0, 0, 0.8);
            color: #FFD700;
            border: 2px solid #FFD700;
            padding: 8px 12px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: bold;
            font-size: 12px;
            backdrop-filter: blur(5px);
            transition: all 0.3s ease;
        `;

        soundBtn.onmouseover = () => {
            soundBtn.style.background = 'rgba(255, 215, 0, 0.2)';
            soundBtn.style.transform = 'scale(1.05)';
        };

        soundBtn.onmouseout = () => {
            soundBtn.style.background = 'rgba(0, 0, 0, 0.8)';
            soundBtn.style.transform = 'scale(1)';
        };

        soundBtn.onclick = () => this.enableSound(iframe, soundBtn);

        container.appendChild(soundBtn);
    }

    enableSound(iframe, button) {
        try {
            iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
            iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            
            button.innerHTML = '🔊 ON';
            button.style.background = 'rgba(76, 175, 80, 0.8)';
            button.style.borderColor = '#4CAF50';
            
            setTimeout(() => {
                button.style.opacity = '0';
                setTimeout(() => button.remove(), 300);
            }, 2000);
            
        } catch (error) {
            console.warn('Could not control video player:', error);
            button.innerHTML = '❌ Error';
            button.style.background = 'rgba(244, 67, 54, 0.8)';
        }
    }

    showVideoLoading(container, platform) {
        const loading = document.createElement('div');
        loading.className = 'video-loading';
        loading.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #FFD700;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 10;
            font-weight: bold;
        `;
        loading.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">🔄</div>
            <div>Loading ${platform} video...</div>
        `;
        container.appendChild(loading);
    }

    showVideoError(container, message) {
        container.innerHTML = `
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 68, 68, 0.9);
                color: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                z-index: 10;
                font-weight: bold;
                max-width: 80%;
            ">
                <div style="font-size: 32px; margin-bottom: 10px;">❌</div>
                <div>${message}</div>
            </div>
        `;
    }

    hideVideoLoading(container) {
        const loading = container.querySelector('.video-loading');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => loading.remove(), 300);
        }
    }
}

const videoProcessor = new EnhancedVideoProcessor();

// ===== СИСТЕМА УВЕДОМЛЕНИЙ =====
class CardNotificationSystem {
    constructor() {
        this.container = null;
    }

    init() {
        if (!this.container) {
            this.container = this.createContainer();
        }
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'cardNotificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10001;
            pointer-events: none;
            max-width: 90vw;
        `;
        
        if (document.body) {
            document.body.appendChild(container);
        }
        
        return container;
    }

    show(message, type = 'info', duration = 3000) {
        this.init();
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            margin-bottom: 10px;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid #333;
            text-align: center;
            font-weight: 500;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(8px);
            pointer-events: auto;
            cursor: pointer;
            font-size: 14px;
        `;

        const colors = {
            success: { border: '#4CAF50', bg: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50' },
            error: { border: '#f44336', bg: 'rgba(244, 67, 54, 0.15)', color: '#f44336' },
            warning: { border: '#FF9800', bg: 'rgba(255, 152, 0, 0.15)', color: '#FF9800' },
            info: { border: '#2196F3', bg: 'rgba(33, 150, 243, 0.15)', color: '#2196F3' }
        };

        if (colors[type]) {
            notification.style.borderColor = colors[type].border;
            notification.style.background = colors[type].bg;
            notification.style.color = colors[type].color;
        }

        notification.textContent = message;
        
        if (this.container) {
            this.container.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateY(0)';
            }, 100);
            
            const timeoutId = setTimeout(() => {
                this.remove(notification);
            }, duration);
            
            notification.addEventListener('click', () => {
                clearTimeout(timeoutId);
                this.remove(notification);
            });
            
            return notification;
        }
        
        console.log(`${type}: ${message}`);
        return null;
    }

    remove(notification) {
        if (!notification) return;
        
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }
}

const cardNotifications = new CardNotificationSystem();

// ===== МЕНЕДЖЕР УРОВНЕЙ =====
class UserLevelManager {
    constructor() {
        this.levels = {
            0: { name: 'FREE', features: ['Basic viewing'] },
            1: { name: 'USER', features: ['Archive access', 'Basic sharing'] },
            2: { name: 'MINI', features: ['Advanced sharing', 'Templates'] },
            3: { name: 'ADMIN', features: ['All features', 'Priority support'] },
            4: { name: 'SUPER', features: ['Unlimited sharing', 'Custom branding'] },
            5: { name: 'MANAGER', features: ['Team features', 'Analytics'] },
            6: { name: 'AUTHOR', features: ['Unlimited everything', 'Co-author access'] }
        };
    }

    getLevelInfo(level) {
        return this.levels[level] || this.levels[0];
    }

    getUserLevel(userId) {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                return user.level || 0;
            }
        } catch (error) {
            console.warn('Error getting user level:', error);
        }
        return 0;
    }
}

const levelManager = new UserLevelManager();

// ===== ПЕРЕВОДЫ =====
const translations = {
    en: {
        loading: "Loading card...",
        loadingSubtext: "Powered by CardGift Web3",
        error: "Error",
        cardNotFound: "Card not found",
        checkLink: "Check the link or create a new card",
        createCard: "Create Card",
        errorSubtext: "CardGift - Web3 Digital Cards",
        ctaText: "Welcome to CardGift! 🎉",
        ctaSubtitle: "This is a demo card with Web3 integration.",
        bottomBanner: "🎁 CardGift - Web3 Digital Cards",
        actionButton: "Get Started",
        marqueeText: "Welcome to CardGift - Create amazing Web3 cards!",
        demoTitle: "🎉 Welcome to CardGift! 🌟",
        demoSubtitle: "Create amazing digital cards with Web3",
        demoText: "This is a demonstration card with Web3 integration and enhanced features.",
        userLevel: "Level"
    },
    ru: {
        loading: "Загружаем открытку...",
        loadingSubtext: "Работает на CardGift Web3",
        error: "Ошибка",
        cardNotFound: "Открытка не найдена",
        checkLink: "Проверьте ссылку или создайте новую открытку",
        createCard: "Создать открытку",
        errorSubtext: "CardGift - Web3 цифровые открытки",
        ctaText: "Добро пожаловать в CardGift! 🎉",
        ctaSubtitle: "Это демонстрационная открытка с Web3 интеграцией.",
        bottomBanner: "🎁 CardGift - Web3 цифровые открытки",
        actionButton: "Начать",
        marqueeText: "Добро пожаловать в CardGift - Создавайте потрясающие Web3 открытки!",
        demoTitle: "🎉 Добро пожаловать в CardGift! 🌟",
        demoSubtitle: "Создавайте потрясающие цифровые открытки с Web3",
        demoText: "Это демонстрационная открытка с Web3 интеграцией и расширенными возможностями.",
        userLevel: "Уровень"
    },
    ua: {
        loading: "Завантажуємо листівку...",
        loadingSubtext: "Працює на CardGift Web3",
        error: "Помилка",
        cardNotFound: "Листівку не знайдено",
        checkLink: "Перевірте посилання або створіть нову листівку",
        createCard: "Створити листівку",
        errorSubtext: "CardGift - Web3 цифрові листівки",
        ctaText: "Ласкаво просимо до CardGift! 🎉",
        ctaSubtitle: "Це демонстраційна листівка з Web3 інтеграцією.",
        bottomBanner: "🎁 CardGift - Web3 цифрові листівки",
        actionButton: "Почати",
        marqueeText: "Ласкаво просимо до CardGift - Створюйте дивовижні Web3 листівки!",
        demoTitle: "🎉 Ласкаво просимо до CardGift! 🌟",
        demoSubtitle: "Створюйте дивовижні цифрові листівки з Web3",
        demoText: "Це демонстраційна листівка з Web3 інтеграцією та розширеними можливостями.",
        userLevel: "Рівень"
    }
};

// ===== УТИЛИТЫ =====
function cleanUrl(url) {
    if (!url || typeof url !== 'string') return '';
    
    let cleanedUrl = url
        .replace(/&amp;/g, '&')
        .replace(/&#x2F;/g, '/')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'");
    
    try {
        if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) {
            new URL(cleanedUrl);
            return cleanedUrl;
        } else if (cleanedUrl.startsWith('/')) {
            return cleanedUrl;
        }
    } catch (e) {
        console.warn('Invalid URL:', cleanedUrl);
    }
    
    return '';
}

// ===== ПОЛУЧЕНИЕ CARD ID ИЗ URL =====
function getCardIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 1. Проверяем shortCode (sc параметр)
    const shortCode = urlParams.get('sc');
    if (shortCode) {
        console.log('🔗 Short code from URL:', shortCode);
        return `sc:${shortCode}`;
    }
    
    // 2. Проверяем d параметр (encoded data)
    const encodedData = urlParams.get('d');
    if (encodedData) {
        console.log('📦 Encoded data from URL');
        return `encoded:${encodedData}`;
    }
    
    // 3. Проверяем id параметр
    let id = urlParams.get('id') || window.location.hash.replace('#', '');
    if (id) {
        id = id.replace(/[^a-zA-Z0-9_-]/g, '');
        console.log('🔍 Card ID from URL:', id);
        return id;
    }
    
    console.log('🔍 No card ID found in URL');
    return null;
}

// ===== ПОИСК ДАННЫХ КАРТЫ =====
async function findCardData(cardId) {
    console.log('🔍 Searching for card:', cardId);
    
    // 1. Если это shortCode - загружаем с сервера
    if (cardId && cardId.startsWith('sc:')) {
        const shortCode = cardId.substring(3);
        console.log('📡 Loading card from server, shortCode:', shortCode);
        
        // Сначала пробуем локально
        try {
            const local = localStorage.getItem(`card_${shortCode}`);
            if (local) {
                console.log('✅ Card found locally');
                return JSON.parse(local);
            }
        } catch (e) {}
        
        // Загружаем с сервера
        try {
            const response = await fetch(`/api/get-card?sc=${shortCode}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                console.log('✅ Card loaded from server');
                return result.data;
            } else {
                console.log('❌ Card not found on server:', result.error);
            }
        } catch (error) {
            console.error('❌ Server load error:', error);
        }
        
        return null;
    }
    
    // 2. Если это encoded data - декодируем
    if (cardId && cardId.startsWith('encoded:')) {
        const encodedData = cardId.substring(8);
        console.log('📦 Decoding card data...');
        
        try {
            let base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            const json = decodeURIComponent(escape(atob(base64)));
            const data = JSON.parse(json);
            
            return {
                cardId: data.c || 'shared_card',
                greeting: data.t + (data.d ? '\n' + data.d : ''),
                greetingText: data.t + (data.d ? '\n' + data.d : ''),
                mediaUrl: data.i || null,
                isCloudImage: !!data.i,
                isSharedCard: true
            };
        } catch (error) {
            console.error('❌ Decode error:', error);
            return null;
        }
    }
    
    // 3. Поиск по полному cardId в localStorage
    if (cardId) {
        try {
            let cardDataLocal = localStorage.getItem(`card_${cardId}`);
            if (cardDataLocal) {
                console.log('✅ Card found in localStorage');
                return JSON.parse(cardDataLocal);
            }
        } catch (error) {
            console.warn('localStorage error:', error);
        }
        
        // Поиск в userCards
        try {
            const userCards = localStorage.getItem('userCards');
            if (userCards) {
                const userCardsData = JSON.parse(userCards);
                for (const userId in userCardsData) {
                    const cards = userCardsData[userId] || [];
                    const found = cards.find(card => card.cardId === cardId);
                    if (found) {
                        console.log('✅ Card found in userCards');
                        return found;
                    }
                }
            }
        } catch (error) {
            console.warn('userCards search error:', error);
        }
    }
    
    console.log('❌ Card not found');
    return null;
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 CardGift Enhanced Card Viewer v3.2 LOADING...');
    
    cardId = getCardIdFromUrl();
    initializeLanguage();
    updateTime();
    showUserLevel();
    loadAndDisplayCard();
    
    setInterval(updateTime, 60000);
    trackViewStart();
});

// ===== ВРЕМЯ В СТАТУС БАРЕ =====
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString(currentLanguage === 'en' ? 'en-US' : 'ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    });
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// ===== ПОКАЗ УРОВНЯ ПОЛЬЗОВАТЕЛЯ =====
function showUserLevel() {
    const userLevel = levelManager.getUserLevel();
    const levelInfo = levelManager.getLevelInfo(userLevel);
    const indicator = document.getElementById('userLevelIndicator');
    
    if (indicator && userLevel > 0) {
        indicator.textContent = `${translations[currentLanguage].userLevel} ${levelInfo.name}`;
        indicator.classList.remove('hidden');
    }
}

// ===== ЯЗЫКОВЫЕ ФУНКЦИИ =====
function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('cardGift_language', lang);
    
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`lang-${lang}`).classList.add('active');
    
    updateTexts();
    console.log('🌍 Language changed to:', lang);
    
    cardNotifications.show(
        `Language changed to ${lang.toUpperCase()}`,
        'info',
        2000
    );
}

function initializeLanguage() {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    const savedLang = localStorage.getItem('cardGift_language');
    
    if (langParam && ['en', 'ru', 'ua'].includes(langParam)) {
        currentLanguage = langParam;
    } else if (savedLang && ['en', 'ru', 'ua'].includes(savedLang)) {
        currentLanguage = savedLang;
    } else {
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('uk')) {
            currentLanguage = 'ua';
        } else if (browserLang.startsWith('ru')) {
            currentLanguage = 'ru';
        } else {
            currentLanguage = 'en';
        }
    }
    
    document.documentElement.lang = currentLanguage;
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`lang-${currentLanguage}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    updateTexts();
}

function updateTexts() {
    const t = translations[currentLanguage];
    
    // Базовые элементы интерфейса - всегда из переводов
    const textElements = {
        'loadingText': t.loading,
        'errorTitle': t.cardNotFound,
        'errorText': t.checkLink,
        'errorButton': t.createCard
    };

    Object.keys(textElements).forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = textElements[elementId];
        }
    });

    // CTA элементы - берём из cardData если есть, иначе из переводов (для демо)
    if (cardData && cardData.ctaTitle) {
        // Используем данные карты - НЕ перезаписываем!
        console.log('🎯 Keeping card CTA data:', cardData.ctaTitle);
    } else {
        // Только для демо или если нет данных карты
        const ctaTextEl = document.getElementById('ctaText');
        const ctaSubtitleEl = document.getElementById('ctaSubtitle');
        const actionButtonEl = document.getElementById('actionButton');
        
        if (ctaTextEl) ctaTextEl.textContent = t.ctaText;
        if (ctaSubtitleEl) ctaSubtitleEl.textContent = t.ctaSubtitle;
        if (actionButtonEl) actionButtonEl.textContent = t.actionButton;
    }
    
    // Bottom banner - из cardData если есть
    if (cardData && cardData.bannerHtml) {
        // Используем данные карты
    } else {
        const bottomBannerText = document.getElementById('bottomBannerText');
        if (bottomBannerText) bottomBannerText.innerHTML = t.bottomBanner;
    }
    
    // Marquee - из cardData если есть
    if (cardData && cardData.marqueeText) {
        // Используем данные карты
    } else {
        const marqueeContent = document.getElementById('marqueeContent');
        if (marqueeContent) marqueeContent.textContent = t.marqueeText;
    }

    document.getElementById('pageTitle').textContent = `CardGift - ${t.cardNotFound}`;
}

// ===== ЗАГРУЗКА И ОТОБРАЖЕНИЕ КАРТЫ =====
async function loadAndDisplayCard() {
    try {
        console.log('🔄 Loading card with ID:', cardId);
        
        if (!cardId) {
            console.log('📝 No card ID, showing enhanced demo');
            displayDemoCard();
            return;
        }
        
        cardData = await findCardData(cardId);
        
        if (cardData) {
            console.log('✅ Card found:', cardData);
            displayCard(cardData);
            // ✅ v4.1: Инициализация вирусной механики
            if (cardData.bonusEnabled && typeof ViralMechanics !== 'undefined') {
                setTimeout(() => {
                    ViralMechanics.init(cardData);
                    console.log('🎁 Viral mechanics initialized');
                }, 2000); // Даём время на загрузку страницы
            }
        } else {
            console.log('🎭 Card not found, showing enhanced demo');
            displayDemoCard();
        }
        
    } catch (error) {
        console.error('❌ Loading error:', error);
        showError();
    }
}

// ===== ДЕМО КАРТА =====
function displayDemoCard() {
    isDemo = true;
    const demoStyles = ['classic', 'sunset', 'ocean', 'space', 'neon'];
    const randomStyle = demoStyles[Math.floor(Math.random() * demoStyles.length)];
    
    const t = translations[currentLanguage];
    
    cardData = {
        cardId: 'demo_card_' + Date.now(),
        userId: 'demo_user',
        userLevel: 0,
        greeting: `${t.demoTitle}\n${t.demoSubtitle}\n${t.demoText}`,
        style: randomStyle,
        backgroundImage: null,
        mediaType: null,
        mediaUrl: null,
        videoUrl: null,
        fontColor: '#FFFFFF',
        fontSize: 'medium',
        shareLink: currentUrl,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        views: Math.floor(Math.random() * 1000) + 1,
        isDemo: true,
        language: currentLanguage,
        
        ctaEnabled: true,
        ctaTitle: t.ctaText,
        ctaSubtitle: t.ctaSubtitle,
        ctaButton: t.actionButton,
        ctaUrl: '/registration.html',
        ctaTimer: 3,
        
        marqueeEnabled: true,
        marqueeText: t.marqueeText,
        marqueeUrl: '/registration.html',
        marqueeTimer: 4,
        
        bannerEnabled: true,
        bannerHtml: t.bottomBanner,
        bannerUrl: '/registration.html',
        bannerTimer: 6
    };
    
    console.log('🎭 Displaying enhanced demo card with style:', randomStyle);
    displayCard(cardData);
    
    setTimeout(() => {
        cardNotifications.show(
            currentLanguage === 'en' ? '🎭 This is a demo card. Create your own!' :
            currentLanguage === 'ru' ? '🎭 Это демо открытка. Создайте свою!' :
            '🎭 Це демо листівка. Створіть свою!',
            'info',
            4000
        );
    }, 2000);
}

// ===== ОТОБРАЖЕНИЕ КАРТЫ =====
async function displayCard(data) {
    setTimeout(async () => {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('mainCard').classList.remove('hidden');
        
        updateMetaTags(data);
        
        const cardArea = document.getElementById('cardArea');
        if (data.style) {
            cardArea.className = `card-area style-${data.style}`;
            console.log('🎨 Applied style:', data.style);
        }
        
        await handleMediaContent(data);
        handleTextContent(data);
        handleCTAElements(data);
        handleAdditionalElements(data);
        incrementViews(data);
        
        trackEvent('card_displayed', {
            cardId: data.cardId,
            style: data.style,
            hasVideo: !!(data.videoUrl || (data.mediaType === 'video')),
            hasImage: !!(data.backgroundImage || data.mediaUrl),
            isDemo: data.isDemo || false
        });
        
        console.log('✅ Card displayed successfully');
        
    }, 1500);
}

// ===== ОБНОВЛЕНИЕ МЕТА-ТЕГОВ =====
function updateMetaTags(data) {
    const greetingSource = data.greeting || data.greetingText || '';
    
    if (greetingSource && greetingSource.trim()) {
        const greetingLines = greetingSource.split('\n').filter(line => line.trim());
        
        if (greetingLines.length > 0) {
            const title = greetingLines[0] || 'CardGift - Digital Card';
            const description = greetingLines.length > 1 ? 
                greetingLines[1] : 
                'Beautiful personalized card created with CardGift Web3 platform';
            
            document.title = `${title} - CardGift`;
            document.getElementById('pageTitle').textContent = `${title} - CardGift`;
            
            document.getElementById('ogTitle').content = title;
            document.getElementById('ogDescription').content = description;
            document.getElementById('ogUrl').content = window.location.href;
            
            document.getElementById('twitterTitle').content = title;
            document.getElementById('twitterDescription').content = description;
            
            console.log('✅ Meta tags updated:', { title, description });
        }
    }
}

// ===== ОБРАБОТКА МЕДИА КОНТЕНТА =====
async function handleMediaContent(data) {
    const bgElement = document.getElementById('backgroundImage');
    const cardContent = document.getElementById('cardContent');
    
    bgElement.innerHTML = '';
    bgElement.style.backgroundImage = 'none';
    cardContent.classList.remove('has-video');
    
    if (data.mediaType === 'video' && data.mediaUrl && data.mediaUrl.startsWith('data:video/')) {
        console.log('🎬 Processing local video');
        
        const videoElement = document.createElement('video');
        videoElement.src = data.mediaUrl;
        videoElement.style.cssText = `
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
            position: absolute; 
            top: 0; 
            left: 0; 
            z-index: 2;
        `;
        videoElement.controls = true;
        videoElement.loop = true;
        videoElement.muted = true;
        videoElement.autoplay = true;
        videoElement.playsinline = true;

        videoElement.addEventListener('loadeddata', () => {
            videoElement.play().catch(e => console.log('Autoplay failed'));
        });

        bgElement.appendChild(videoElement);
        cardContent.classList.add('has-video');
        
        setTimeout(() => {
            createSoundButton(videoElement);
        }, 500);
    }
    else if (data.videoUrl && data.videoUrl.trim()) {
        console.log('🎬 Processing video URL:', data.videoUrl);
        
        const cleanVideoUrl = cleanUrl(data.videoUrl);
        if (cleanVideoUrl) {
            const videoData = videoProcessor.parseVideoUrl(cleanVideoUrl);
            if (videoData.isValid) {
                console.log('✅ Valid video data:', videoData);
                videoProcessor.createEnhancedVideoElement(videoData, bgElement);
                cardContent.classList.add('has-video');
            } else {
                console.warn('❌ Invalid video URL:', cleanVideoUrl);
                showVideoError(bgElement, videoData.error);
            }
        }
    }
    else if (data.backgroundImage || data.mediaUrl) {
    const imageUrl = data.backgroundImage || data.mediaUrl;
    console.log('🖼️ Processing image:', imageUrl);
    
    bgElement.style.backgroundImage = `url(${imageUrl})`;
    bgElement.style.backgroundSize = 'contain';
    bgElement.style.backgroundPosition = 'center';
    bgElement.style.backgroundRepeat = 'no-repeat';
  }
}

// ===== СОЗДАНИЕ КНОПКИ ЗВУКА =====
function createSoundButton(videoElement) {
    const cardArea = document.getElementById('cardArea');
    const soundButton = document.createElement('button');
    soundButton.innerHTML = '🔊 Sound';
    soundButton.className = 'sound-control-btn';
    soundButton.id = 'localVideoSoundBtn';
    
    soundButton.onclick = () => {
        videoElement.muted = false;
        videoElement.play();
        soundButton.innerHTML = '🔊 ON';
        soundButton.style.background = 'rgba(76, 175, 80, 0.8)';
        soundButton.style.borderColor = '#4CAF50';
        
        setTimeout(() => {
            soundButton.style.opacity = '0';
            setTimeout(() => soundButton.remove(), 300);
        }, 2000);
        
        cardNotifications.show('🔊 Sound enabled!', 'success', 2000);
    };
    
    cardArea.appendChild(soundButton);
}

// ===== ПОКАЗ ОШИБКИ ВИДЕО =====
function showVideoError(container, message) {
    container.innerHTML = `
        <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 68, 68, 0.9);
            color: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            z-index: 10;
            font-weight: bold;
            max-width: 80%;
            backdrop-filter: blur(10px);
        ">
            <div style="font-size: 32px; margin-bottom: 10px;">❌</div>
            <div>${message || 'Video loading error'}</div>
        </div>
    `;
}

// ===== ОБРАБОТКА ТЕКСТОВОГО КОНТЕНТА =====
function handleTextContent(data) {
    let title = '';
    let subtitle = '';
    let mainText = '';

    const greetingSource = data.greeting || data.greetingText || '';
    
    if (greetingSource && greetingSource.trim()) {
        const greetingLines = greetingSource.split('\n').filter(line => line.trim());
        
        if (greetingLines.length > 0) {
            title = greetingLines[0];
            if (greetingLines.length > 1) {
                subtitle = greetingLines[1];
            }
            if (greetingLines.length > 2) {
                mainText = greetingLines.slice(2).join('\n');
            }
        }
    }

    const hasVideo = (data.videoUrl && data.videoUrl.trim()) || 
                    (data.mediaType === 'video' && data.mediaUrl);
    
    const titleElement = document.getElementById('cardTitle');
    const subtitleElement = document.getElementById('cardSubtitle');
    const textElement = document.getElementById('greetingText');
    const cardContent = document.getElementById('cardContent');

    if (hasVideo) {
        titleElement.style.display = 'none';
        subtitleElement.style.display = 'none';
        textElement.style.display = 'none';
    } else {
        titleElement.textContent = title;
        titleElement.style.display = title ? 'block' : 'none';
        
        subtitleElement.textContent = subtitle;
        subtitleElement.style.display = subtitle ? 'block' : 'none';
        
        textElement.textContent = mainText;
        textElement.style.display = mainText ? 'block' : 'none';
        
        // ═══════════════════════════════════════════════════════════
        // ПРИМЕНЯЕМ ПОЗИЦИОНИРОВАНИЕ ТЕКСТА (v4.0)
        // ═══════════════════════════════════════════════════════════
        if (cardContent && data.textPosition) {
            const pos = data.textPosition.toLowerCase();
            
            // Вертикальное позиционирование
            if (pos.includes('top')) {
                cardContent.style.justifyContent = 'flex-start';
                cardContent.style.paddingTop = '20px';
                cardContent.style.paddingBottom = '0';
            } else if (pos.includes('bottom')) {
                cardContent.style.justifyContent = 'flex-end';
                cardContent.style.paddingBottom = '20px';
                cardContent.style.paddingTop = '0';
            } else {
                // center (по умолчанию)
                cardContent.style.justifyContent = 'center';
                cardContent.style.paddingTop = '0';
                cardContent.style.paddingBottom = '0';
            }
            
            // Горизонтальное позиционирование
            if (pos.includes('left')) {
                cardContent.style.alignItems = 'flex-start';
                cardContent.style.textAlign = 'left';
            } else if (pos.includes('right')) {
                cardContent.style.alignItems = 'flex-end';
                cardContent.style.textAlign = 'right';
            } else {
                // center (по умолчанию)
                cardContent.style.alignItems = 'center';
                cardContent.style.textAlign = 'center';
            }
            
            console.log('📍 Text position applied:', data.textPosition);
        }
    }
}

// ===== ОБРАБОТКА CTA ЭЛЕМЕНТОВ =====
function handleCTAElements(data) {
    const ctaSection = document.getElementById('ctaSection');
    const actionButton = document.getElementById('actionButton');
    
    if (data.ctaEnabled && data.ctaTitle && data.ctaButton) {
        document.getElementById('ctaText').textContent = data.ctaTitle;
        document.getElementById('ctaSubtitle').textContent = data.ctaSubtitle || '';
        actionButton.textContent = data.ctaButton;
        
        const buttonDelay = (data.ctaTimer || 3) * 1000;
        setTimeout(() => {
            ctaSection.classList.add('show');
            actionButton.classList.add('show');
            console.log('✅ CTA shown after', data.ctaTimer, 'seconds');
            
            trackEvent('cta_shown', {
                cardId: data.cardId,
                delay: data.ctaTimer
            });
        }, buttonDelay);
    } else {
        ctaSection.classList.remove('show');
        actionButton.classList.remove('show');
    }
}

// ===== ОБРАБОТКА ДОПОЛНИТЕЛЬНЫХ ЭЛЕМЕНТОВ =====
function handleAdditionalElements(data) {
    const topMarquee = document.getElementById('topMarquee');
    if (data.marqueeEnabled && data.marqueeText) {
        document.getElementById('marqueeContent').textContent = data.marqueeText;
        const marqueeDelay = (data.marqueeTimer || 5) * 1000;
        setTimeout(() => {
            topMarquee.classList.add('show');
            console.log('✅ Marquee shown after', data.marqueeTimer, 'seconds');
            
            trackEvent('marquee_shown', {
                cardId: data.cardId,
                delay: data.marqueeTimer
            });
        }, marqueeDelay);
    } else {
        topMarquee.classList.remove('show');
    }
    
    const bottomBanner = document.getElementById('bottomBanner');
    if (data.bannerEnabled && data.bannerHtml) {
        const bannerDelay = (data.bannerTimer || 5) * 1000;
        setTimeout(() => {
            bottomBanner.classList.add('show');
            document.getElementById('bottomBannerText').innerHTML = data.bannerHtml;
            console.log('✅ Bottom banner shown after', data.bannerTimer || 5, 'seconds');
            
            trackEvent('banner_shown', {
                cardId: data.cardId,
                delay: data.bannerTimer || 5
            });
        }, bannerDelay);
    } else {
        bottomBanner.classList.remove('show');
    }
}

// ===== СЧЕТЧИК ПРОСМОТРОВ =====
function incrementViews(data) {
    if (data.isDemo) return;
    
    try {
        data.views = (data.views || 0) + 1;
        data.lastViewed = new Date().toISOString();
        data.viewDuration = Date.now() - viewStartTime;
        
        localStorage.setItem(`card_${data.cardId}`, JSON.stringify(data));
        
        console.log('📊 View counted:', data.views);
        
        trackEvent('view_counted', {
            cardId: data.cardId,
            views: data.views,
            duration: data.viewDuration
        });
    } catch (error) {
        console.warn('⚠️ Error updating views:', error);
    }
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
function handleMarqueeClick() {
    console.log('🎯 Marquee clicked');
    
    trackEvent('marquee_clicked', {
        cardId: cardData?.cardId || 'demo'
    });
    
    // ═══════════════════════════════════════════════════════════
    // Приоритет для refId: owner_gw_id > userId > ref из URL открытки
    // owner_gw_id - это GW или CardGift ID владельца открытки
    // ═══════════════════════════════════════════════════════════
    const urlRef = new URLSearchParams(window.location.search).get('ref') || '';
    const refId = cardData?.owner_gw_id || cardData?.ownerGwId || 
                  cardData?.userId || cardData?.walletAddress || cardData?.actualCreator || 
                  urlRef || '';
    
    if (cardData && cardData.marqueeUrl && cardData.marqueeUrl.trim()) {
        let cleanedUrl = cleanUrl(cardData.marqueeUrl);
        if (cleanedUrl) {
            // Добавляем ref к ЛЮБОМУ URL (не только registration)
            if (refId && !cleanedUrl.includes('ref=')) {
                const separator = cleanedUrl.includes('?') ? '&' : '?';
                cleanedUrl += `${separator}ref=${encodeURIComponent(refId)}&from=${encodeURIComponent(cardData.cardId || '')}`;
            }
            window.open(cleanedUrl, '_blank');
        } else {
            // Переход на generator.html С параметром ref!
            let genUrl = '/generator.html';
            if (refId) {
                genUrl += `?ref=${encodeURIComponent(refId)}&from=${encodeURIComponent(cardData?.cardId || '')}`;
            }
            window.open(genUrl, '_blank');
        }
    } else {
        let regUrl = '/registration.html';
        if (refId) {
            regUrl += `?ref=${encodeURIComponent(refId)}&from=${encodeURIComponent(cardData?.cardId || '')}`;
        }
        window.open(regUrl, '_blank');
    }
}

function handleActionClick() {
    console.log('🎯 Action button clicked');
    
    trackEvent('action_button_clicked', {
        cardId: cardData?.cardId || 'demo'
    });
    
    cardNotifications.show(
        currentLanguage === 'en' ? '🚀 Redirecting to CardGift...' :
        currentLanguage === 'ru' ? '🚀 Переход в CardGift...' :
        '🚀 Перехід до CardGift...',
        'info',
        2000
    );
    
    // ═══════════════════════════════════════════════════════════
    // Приоритет для refId: owner_gw_id > userId > ref из URL открытки
    // ═══════════════════════════════════════════════════════════
    const urlRefAction = new URLSearchParams(window.location.search).get('ref') || '';
    const refId = cardData?.owner_gw_id || cardData?.ownerGwId || 
                  cardData?.userId || cardData?.walletAddress || cardData?.actualCreator || 
                  urlRefAction || '';
    
    if (cardData && cardData.ctaUrl && cardData.ctaUrl.trim()) {
        let cleanedUrl = cleanUrl(cardData.ctaUrl);
        if (cleanedUrl) {
            // Добавляем ref к ЛЮБОМУ URL (не только registration)
            if (refId && !cleanedUrl.includes('ref=')) {
                const separator = cleanedUrl.includes('?') ? '&' : '?';
                cleanedUrl += `${separator}ref=${encodeURIComponent(refId)}&from=${encodeURIComponent(cardData.cardId || '')}`;
            }
            setTimeout(() => window.open(cleanedUrl, '_blank'), 500);
        } else {
            // Переход на generator.html С параметром ref!
            let genUrl = '/generator.html';
            if (refId) {
                genUrl += `?ref=${encodeURIComponent(refId)}&from=${encodeURIComponent(cardData?.cardId || '')}`;
            }
            setTimeout(() => window.open(genUrl, '_blank'), 500);
        }
    } else {
        let regUrl = '/registration.html';
        if (refId) {
            regUrl += `?ref=${encodeURIComponent(refId)}&from=${encodeURIComponent(cardData?.cardId || '')}`;
        }
        setTimeout(() => window.open(regUrl, '_blank'), 500);
    }
}

function handleBottomBannerClick() {
    console.log('🎯 Bottom banner clicked');
    
    trackEvent('banner_clicked', {
        cardId: cardData?.cardId || 'demo'
    });
    
    // ═══════════════════════════════════════════════════════════
    // Приоритет для refId: owner_gw_id > userId > ref из URL открытки
    // ═══════════════════════════════════════════════════════════
    const urlRefBanner = new URLSearchParams(window.location.search).get('ref') || '';
    const refId = cardData?.owner_gw_id || cardData?.ownerGwId || 
                  cardData?.userId || cardData?.walletAddress || cardData?.actualCreator || 
                  urlRefBanner || '';
    
    if (cardData && cardData.bannerUrl && cardData.bannerUrl.trim()) {
        let cleanedUrl = cleanUrl(cardData.bannerUrl);
        if (cleanedUrl) {
            // Добавляем ref к ЛЮБОМУ URL (не только registration)
            if (refId && !cleanedUrl.includes('ref=')) {
                const separator = cleanedUrl.includes('?') ? '&' : '?';
                cleanedUrl += `${separator}ref=${encodeURIComponent(refId)}&from=${encodeURIComponent(cardData.cardId || '')}`;
            }
            window.open(cleanedUrl, '_blank');
        } else {
            // Переход на generator.html С параметром ref!
            let genUrl = '/generator.html';
            if (refId) {
                genUrl += `?ref=${encodeURIComponent(refId)}&from=${encodeURIComponent(cardData?.cardId || '')}`;
            }
            window.open(genUrl, '_blank');
        }
    } else {
        let regUrl = '/registration.html';
        if (refId) {
            regUrl += `?ref=${encodeURIComponent(refId)}&from=${encodeURIComponent(cardData?.cardId || '')}`;
        }
        window.open(regUrl, '_blank');
    }
}

// ===== ПОКАЗ ОШИБКИ =====
function showError() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('errorScreen').classList.remove('hidden');
    
    trackEvent('error_shown', {
        cardId: cardId || 'none',
        url: currentUrl
    });
}

// ===== ОТСЛЕЖИВАНИЕ НАЧАЛА ПРОСМОТРА =====
function trackViewStart() {
    viewStartTime = Date.now();
    trackEvent('view_started', {
        cardId: cardId || 'demo',
        language: currentLanguage,
        userAgent: navigator.userAgent,
        referrer: document.referrer
    });
}

// ===== WEB3 ИНТЕГРАЦИЯ =====
async function initWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        console.log('🔗 Web3 wallet detected');
        
        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts.length > 0) {
                console.log('✅ Wallet already connected:', accounts[0]);
                
                const chainId = await window.ethereum.request({ 
                    method: 'eth_chainId' 
                });
                const currentChainId = parseInt(chainId, 16);
                
                if (currentChainId === 204) {
                    cardNotifications.show('✅ Connected to opBNB', 'success', 3000);
                } else {
                    cardNotifications.show('⚠️ Switch to opBNB network', 'warning', 4000);
                }
                
                return accounts[0];
            }
        } catch (error) {
            console.warn('⚠️ Web3 check error:', error);
        }
    }
    
    return null;
}

// ===== ШЕРИНГ =====
function shareCard() {
    const title = document.getElementById('cardTitle').textContent || 'CardGift Card';
    const text = document.getElementById('greetingText').textContent || 'Check out this card!';
    
    trackEvent('share_attempted', {
        cardId: cardData?.cardId || 'demo',
        method: navigator.share ? 'native' : 'clipboard'
    });
    
    if (navigator.share) {
        navigator.share({
            title: title,
            text: text,
            url: currentUrl,
        }).then(() => {
            cardNotifications.show('📱 Shared successfully!', 'success', 3000);
            trackEvent('share_completed', { method: 'native' });
        }).catch((error) => {
            console.log('Share cancelled or failed:', error);
        });
    } else {
        const shareText = `${title}\n${text}\n${currentUrl}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                cardNotifications.show('📋 Link copied to clipboard!', 'success', 3000);
                trackEvent('share_completed', { method: 'clipboard' });
            });
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            cardNotifications.show('📋 Link copied!', 'success', 3000);
            trackEvent('share_completed', { method: 'legacy_clipboard' });
        }
    }
}

// ===== ГОРЯЧИЕ КЛАВИШИ =====
document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch(e.key.toLowerCase()) {
        case 'escape':
            document.querySelectorAll('[style*="position: fixed"]').forEach(el => {
                if (el.style.zIndex === '10000') {
                    el.remove();
                }
            });
            trackEvent('escape_pressed');
            break;
            
        case 's':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                shareCard();
            }
            break;
            
        case 'r':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                location.reload();
            }
            break;
            
        case 'f':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
            }
            break;
            
        case ' ':
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
            });
            e.preventDefault();
            break;
    }
});

// ===== АНАЛИТИКА =====
function trackEvent(eventName, eventData = {}) {
    const analyticsData = {
        event: eventName,
        cardId: cardData?.cardId || 'demo',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        language: currentLanguage,
        url: currentUrl,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        referrer: document.referrer || 'direct',
        ...eventData
    };
    
    console.log('📊 Event tracked:', analyticsData);
    
    try {
        const events = JSON.parse(localStorage.getItem('cardGift_analytics') || '[]');
        events.push(analyticsData);
        
        if (events.length > 100) {
            events.splice(0, events.length - 100);
        }
        
        localStorage.setItem('cardGift_analytics', JSON.stringify(events));
    } catch (error) {
        console.warn('Analytics storage error:', error);
    }
}

// ===== ОБРАБОТКА ОШИБОК =====
window.addEventListener('error', function(e) {
    console.error('❌ Global error:', e.error);
    
    trackEvent('javascript_error', {
        message: e.message,
        filename: e.filename,
        line: e.lineno,
        column: e.colno,
        stack: e.error?.stack
    });
    
    if (e.message && (e.message.includes('fetch') || e.message.includes('network'))) {
        cardNotifications.show(
            currentLanguage === 'en' ? 'Network error occurred' :
            currentLanguage === 'ru' ? 'Произошла ошибка сети' :
            'Сталася помилка мережі',
            'error',
            4000
        );
    }
});

// ===== ОТСЛЕЖИВАНИЕ ВИДИМОСТИ СТРАНИЦЫ =====
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        trackEvent('page_hidden', {
            viewDuration: Date.now() - viewStartTime
        });
    } else {
        trackEvent('page_visible');
        viewStartTime = Date.now();
    }
});

// ===== ОТСЛЕЖИВАНИЕ СКРОЛЛА =====
let scrollTrackingThrottle = false;
window.addEventListener('scroll', function() {
    if (!scrollTrackingThrottle) {
        scrollTrackingThrottle = true;
        setTimeout(() => {
            trackEvent('page_scrolled', {
                scrollY: window.scrollY,
                scrollPercent: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
            });
            scrollTrackingThrottle = false;
        }, 1000);
    }
});

// ===== ОЧИСТКА РЕСУРСОВ ПРИ ЗАКРЫТИИ =====
window.addEventListener('beforeunload', function() {
    trackEvent('page_unload', {
        totalViewDuration: Date.now() - viewStartTime
    });
    
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        video.pause();
        video.src = '';
    });
    
    console.log('🧹 Resources cleaned up');
});

// ===== ИНИЦИАЛИЗАЦИЯ WEB3 =====
setTimeout(() => {
    initWeb3();
}, 2000);

// ===== ЭКСПОРТ ГЛОБАЛЬНЫХ ФУНКЦИЙ =====
window.changeLanguage = changeLanguage;
window.handleMarqueeClick = handleMarqueeClick;
window.handleActionClick = handleActionClick;
window.handleBottomBannerClick = handleBottomBannerClick;
window.shareCard = shareCard;

// ===== ОТЛАДОЧНЫЙ РЕЖИМ =====
if (window.location.search.includes('debug=true')) {
    window.cardViewerDebug = {
        cardData: () => cardData,
        currentLanguage: () => currentLanguage,
        trackEvent: trackEvent,
        showNotification: (msg, type) => cardNotifications.show(msg, type || 'info'),
        changeLanguage: changeLanguage,
        reloadCard: loadAndDisplayCard,
        analytics: () => JSON.parse(localStorage.getItem('cardGift_analytics') || '[]'),
        clearAnalytics: () => localStorage.removeItem('cardGift_analytics'),
        version: 'CardGift Card Viewer v3.2',
        features: [
            'Enhanced video support (YouTube, TikTok, Instagram)',
            'Redis card loading',
            'Multi-level user system integration',
            'Advanced analytics tracking',
            'Improved notification system',
            'Web3 integration with opBNB',
            'Better error handling',
            'Mobile-first responsive design',
            'Multi-language support',
            'Keyboard shortcuts',
            'Social sharing capabilities',
            'Short URL support (shortCode)'
        ]
    };
    
    console.log('🐛 Debug mode enabled. Use cardViewerDebug object for debugging.');
    console.log('Available debug commands:', Object.keys(window.cardViewerDebug));
}

console.log('📱 CardGift Enhanced Card Viewer v4.0 loaded (with textPosition support)');
console.log('💡 Горячие клавиши: Ctrl+S (поделиться), Ctrl+F (полноэкран), Space (пауза видео)');
