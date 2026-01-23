/* =====================================================
   CARDGIFT - GENERATOR PAGE JAVASCRIPT v4.5
   
   Логика страницы генератора открыток
   
   v4.5:
   - LEVEL_PRICES теперь из CONFIG (config.js)
   
   v4.4:
   - Интеграция с системой шаблонов
   - Загрузка шаблона из Архива (from=template)
   
   v4.3:
   - Добавлен thumbnailUrl для видео-карточек (YouTube)
   - VideoProcessor.getThumbnailUrl() для Open Graph превью
   ===================================================== */

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
// currentLanguage уже в common.js
let selectedStyle = 'classic';
let selectedTextPosition = 'bottom';
let selectedCTAPosition = 'bottom';
let uploadedMedia = null;
let uploadedThumbnail = null;  // Загруженная обложка для видео
let currentUser = null;
let walletConnected = false;
let loadedFromTemplate = false;  // Флаг загрузки из шаблона

// ===== ЗАГРУЗКА ШАБЛОНА ИЗ URL =====
async function loadTemplateFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const templateId = urlParams.get('template');
    const templateTitle = urlParams.get('title');
    const templateMedia = urlParams.get('media');
    const fromTemplate = urlParams.get('from');
    
    // ═══════════════════════════════════════════════════════════
    // НОВОЕ: Загрузка шаблона из Архива (localStorage)
    // ═══════════════════════════════════════════════════════════
    if (fromTemplate === 'template') {
        const templateDataStr = localStorage.getItem('cg_template_data');
        if (templateDataStr) {
            try {
                const templateData = JSON.parse(templateDataStr);
                console.log('📋 Loading template from Archive:', templateData.templateName);
                
                loadedFromTemplate = true;
                
                // Загружаем изображение
                if (templateData.imageUrl) {
                    const mediaPreview = document.getElementById('mediaPreview');
                    if (mediaPreview) {
                        mediaPreview.innerHTML = `<img src="${templateData.imageUrl}" alt="Template" style="max-width:100%;max-height:200px;border-radius:8px;">`;
                        uploadedMedia = { data: templateData.imageUrl, type: 'image' };
                    }
                }
                
                // Загружаем данные карточки если есть
                if (templateData.cardData) {
                    const cardData = templateData.cardData;
                    
                    // Текст поздравления
                    if (cardData.greetingText) {
                        const greetingField = document.getElementById('greetingText');
                        if (greetingField) greetingField.value = cardData.greetingText;
                    }
                    
                    // Название
                    if (cardData.title) {
                        const titleField = document.getElementById('cardTitle');
                        if (titleField) titleField.value = cardData.title;
                    }
                    
                    // Стиль
                    if (cardData.selectedStyle) {
                        selectStyle(cardData.selectedStyle);
                    }
                    
                    // Позиция текста
                    if (cardData.textPosition) {
                        setTextPosition(cardData.textPosition);
                    }
                    
                    // CTA кнопка
                    if (cardData.ctaText) {
                        const ctaField = document.getElementById('ctaText');
                        if (ctaField) ctaField.value = cardData.ctaText;
                    }
                    if (cardData.ctaLink) {
                        const ctaLinkField = document.getElementById('ctaLink');
                        if (ctaLinkField) ctaLinkField.value = cardData.ctaLink;
                    }
                }
                
                // Показываем уведомление
                if (typeof notificationManager !== 'undefined') {
                    notificationManager.show(`📋 Шаблон "${templateData.templateName}" загружен! Отредактируйте и сохраните.`, 'success', 5000);
                } else if (typeof showToast === 'function') {
                    showToast(`Шаблон "${templateData.templateName}" загружен!`, 'success');
                }
                
                // Очищаем localStorage и URL
                localStorage.removeItem('cg_template_data');
                window.history.replaceState({}, '', window.location.pathname);
                
                // Обновляем превью
                setTimeout(() => {
                    if (typeof updatePreview === 'function') {
                        updatePreview();
                    }
                }, 500);
                
                return;
                
            } catch (e) {
                console.error('Error parsing template data:', e);
                localStorage.removeItem('cg_template_data');
            }
        }
    }
    // ═══════════════════════════════════════════════════════════
    
    if (!templateId && !templateMedia) return;
    
    console.log('📋 Loading template:', templateId || 'from params');
    
    // Если есть прямые параметры (title, media)
    if (templateMedia) {
        // Загружаем картинку
        const mediaPreview = document.getElementById('mediaPreview');
        if (mediaPreview && templateMedia) {
            mediaPreview.innerHTML = `<img src="${templateMedia}" alt="Template" style="max-width:100%;max-height:200px;border-radius:8px;">`;
            uploadedMedia = { data: templateMedia, type: 'image' };
        }
        
        // Показываем уведомление
        if (typeof notificationManager !== 'undefined') {
            notificationManager.show('📋 Шаблон загружен! Отредактируйте текст и отправьте.', 'success', 5000);
        }
        
        // Очищаем URL
        window.history.replaceState({}, '', window.location.pathname);
        return;
    }
    
    // Если есть templateId — загружаем из Supabase
    if (templateId && window.SupabaseClient && SupabaseClient.url) {
        try {
            const templates = await SupabaseClient.query('templates', 'GET', {
                select: '*',
                filter: `id=eq.${templateId}`
            });
            
            if (templates && templates.length > 0) {
                const template = templates[0];
                
                // Загружаем картинку
                if (template.media_url || template.preview_url) {
                    const mediaUrl = template.media_url || template.preview_url;
                    const mediaPreview = document.getElementById('mediaPreview');
                    if (mediaPreview) {
                        mediaPreview.innerHTML = `<img src="${mediaUrl}" alt="Template" style="max-width:100%;max-height:200px;border-radius:8px;">`;
                        uploadedMedia = { data: mediaUrl, type: 'image' };
                    }
                }
                
                // Загружаем текст если есть
                if (template.greeting_text) {
                    const greetingField = document.getElementById('greetingText');
                    if (greetingField) {
                        greetingField.value = template.greeting_text;
                    }
                }
                
                // Загружаем стиль
                if (template.style && typeof template.style === 'object') {
                    if (template.style.selectedStyle) {
                        selectStyle(template.style.selectedStyle);
                    }
                }
                
                console.log('✅ Template loaded:', template.title);
                
                if (typeof notificationManager !== 'undefined') {
                    notificationManager.show(`📋 Шаблон "${template.title}" загружен!`, 'success', 5000);
                }
            }
        } catch (e) {
            console.error('Error loading template:', e);
        }
        
        // Очищаем URL
        window.history.replaceState({}, '', window.location.pathname);
    }
}

// USER_LEVELS, ARCHIVE_LIMITS, ACTIVATION_PRICES, FOUNDERS_ADDRESSES, CENTRAL_FOUNDER
// уже определены в common.js

// forbiddenWords уже в common.js

// ===== ЭМОДЗИ ПО КАТЕГОРИЯМ =====
const emojis = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '🙄', '😏', '😪', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟'],
    food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥒', '🥬', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓'],
    travel: ['✈️', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉'],
    activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♂️', '🤼‍♂️', '🤸‍♂️', '⛹️‍♂️', '🤺'],
    objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌'],
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐'],
    flags: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇻🇬']
};

// ===== ШАБЛОНЫ ТЕКСТОВ =====
const templates = {
    birthday: {
        en: { greeting: "🎂 Happy Birthday! 🎉\nWishing you all the best on your special day!", personal: "May all your dreams come true!" },
        ru: { greeting: "🎂 С Днем Рождения! 🎉\nЖелаю всего самого лучшего!", personal: "Пусть все мечты сбудутся!" },
        ua: { greeting: "🎂 З Днем Народження! 🎉\nБажаю всього найкращого!", personal: "Нехай всі мрії здійсняться!" }
    },
    newyear: {
        en: { greeting: "🎄 Happy New Year! ✨\nMay the coming year be filled with magic!", personal: "Health, happiness, and prosperity!" },
        ru: { greeting: "🎄 С Новым Годом! ✨\nПусть год будет полон волшебства!", personal: "Здоровья, счастья и процветания!" },
        ua: { greeting: "🎄 З Новим Роком! ✨\nНехай рік буде повний магії!", personal: "Здоров'я, щастя та процвітання!" }
    },
    love: {
        en: { greeting: "💕 With Love 💕\nYou make every day special!", personal: "I love you!" },
        ru: { greeting: "💕 С любовью 💕\nТы делаешь каждый день особенным!", personal: "Я люблю тебя!" },
        ua: { greeting: "💕 З любов'ю 💕\nТи робиш кожен день особливим!", personal: "Я люблю тебе!" }
    },
    thanks: {
        en: { greeting: "🙏 Thank You! 🙏\nYour kindness means the world!", personal: "You're amazing!" },
        ru: { greeting: "🙏 Спасибо! 🙏\nТвоя доброта бесценна!", personal: "Ты потрясающий!" },
        ua: { greeting: "🙏 Дякую! 🙏\nТвоя доброта безцінна!", personal: "Ти дивовижний!" }
    },
    congrats: {
        en: { greeting: "🎉 Congratulations! 🎊\nYou did it! So proud of you!", personal: "Keep shining!" },
        ru: { greeting: "🎉 Поздравляю! 🎊\nТы сделал это! Горжусь тобой!", personal: "Продолжай светить!" },
        ua: { greeting: "🎉 Вітаю! 🎊\nТи зробив це! Пишаюся тобою!", personal: "Продовжуй сяяти!" }
    }
};

// ===== КЛАСС ВИДЕО ПРОЦЕССОРА =====
class VideoProcessor {
    constructor() {
        this.supportedPlatforms = {
            youtube: {
                patterns: [
                    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
                    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
                    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
                ],
                embed: (id) => `https://www.youtube.com/embed/${id}?enablejsapi=1&controls=1&rel=0`
            },
            tiktok: {
                patterns: [
                    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
                    /vm\.tiktok\.com\/([a-zA-Z0-9]+)/
                ],
                embed: (id) => `https://embed.tiktok.com/embed/v2/${id}`
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
        
        if (!this.isUrlSafe(url)) {
            return { isValid: false, error: 'Unsafe URL detected' };
        }

        for (const [platform, config] of Object.entries(this.supportedPlatforms)) {
            for (const pattern of config.patterns) {
                const match = url.match(pattern);
                if (match) {
                    return {
                        isValid: true,
                        platform: platform,
                        videoId: match[1],
                        originalUrl: url,
                        embedUrl: config.embed(match[1])
                    };
                }
            }
        }

        return { isValid: false, error: 'Unsupported video platform' };
    }

    isUrlSafe(url) {
        const lowerUrl = url.toLowerCase();
        const blockedDomains = ['malware', 'virus', 'phishing', 'spam', 'adult', 'xxx', 'porn'];
        
        for (const blocked of blockedDomains) {
            if (lowerUrl.includes(blocked)) return false;
        }

        if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
            return false;
        }

        return true;
    }

    createVideoElement(videoData, container) {
        container.innerHTML = '';
        
        if (!videoData.isValid) {
            this.showVideoError(container, videoData.error);
            return;
        }

        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';
        
        const iframe = document.createElement('iframe');
        iframe.className = 'video-iframe';
        iframe.src = videoData.embedUrl;
        iframe.frameBorder = '0';
        iframe.allowFullscreen = true;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        
        videoContainer.appendChild(iframe);
        container.appendChild(videoContainer);
        
        return iframe;
    }

    showVideoError(container, message) {
        container.innerHTML = '';
        const error = document.createElement('div');
        error.className = 'video-placeholder video-error';
        error.innerHTML = `❌ ${message}`;
        container.appendChild(error);
    }
    
    /**
     * Получить URL превью (thumbnail) для видео
     * @param {string} url - URL видео
     * @returns {string|null} - URL превью или null
     */
    getThumbnailUrl(url) {
        const videoData = this.parseVideoUrl(url);
        
        if (!videoData.isValid) return null;
        
        switch (videoData.platform) {
            case 'youtube':
                // YouTube предоставляет несколько размеров превью:
                // maxresdefault.jpg (1280x720) - может не существовать
                // hqdefault.jpg (480x360) - всегда есть
                // mqdefault.jpg (320x180)
                // sddefault.jpg (640x480)
                return `https://img.youtube.com/vi/${videoData.videoId}/hqdefault.jpg`;
                
            case 'tiktok':
                // TikTok не даёт прямой доступ к превью без API
                // Возвращаем null - будет использоваться заглушка
                return null;
                
            case 'instagram':
                // Instagram тоже требует API
                return null;
                
            default:
                return null;
        }
    }
    
    /**
     * Получить лучшее превью для YouTube (с fallback)
     * @param {string} videoId - ID видео YouTube
     * @returns {Promise<string>} - URL превью
     */
    async getBestYoutubeThumbnail(videoId) {
        const sizes = ['maxresdefault', 'hqdefault', 'mqdefault', 'default'];
        
        for (const size of sizes) {
            const url = `https://img.youtube.com/vi/${videoId}/${size}.jpg`;
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    return url;
                }
            } catch (e) {
                // Продолжаем к следующему размеру
            }
        }
        
        // Fallback - hqdefault всегда существует
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
}

const videoProcessor = new VideoProcessor();

// ===== ФУНКЦИИ ДЛЯ ОБЛОЖКИ ВИДЕО =====

/**
 * Показать/скрыть секцию загрузки обложки при вводе видео URL
 */
function onVideoUrlChange() {
    const videoUrl = document.getElementById('videoUrl')?.value?.trim() || '';
    const thumbnailSection = document.getElementById('videoThumbnailSection');
    
    if (!thumbnailSection) return;
    
    if (videoUrl) {
        const videoData = videoProcessor.parseVideoUrl(videoUrl);
        if (videoData.isValid) {
            thumbnailSection.style.display = 'block';
            console.log('🎬 Video detected, showing thumbnail upload section');
        } else {
            thumbnailSection.style.display = 'none';
        }
    } else {
        thumbnailSection.style.display = 'none';
        // Очищаем загруженную обложку если видео удалено
        removeThumbnail();
    }
}

/**
 * Загрузка обложки видео
 */
async function handleThumbnailUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, загрузите изображение');
        return;
    }
    
    // Проверяем размер (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой. Максимум 5MB');
        return;
    }
    
    console.log('🖼️ Uploading thumbnail:', file.name, file.type);
    
    try {
        // Читаем файл как data URL
        const imageData = await readFileAsDataURL(file);
        
        uploadedThumbnail = {
            data: imageData,
            name: file.name,
            type: file.type
        };
        
        // Показываем превью
        const preview = document.getElementById('thumbnailPreview');
        const placeholder = document.getElementById('thumbnailPlaceholder');
        const removeBtn = document.getElementById('removeThumbnailBtn');
        
        if (preview) {
            preview.innerHTML = `<img src="${imageData}" style="max-width: 100%; max-height: 150px; border-radius: 8px; object-fit: cover;">`;
            preview.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'inline-block';
        
        console.log('✅ Thumbnail uploaded successfully');
        
    } catch (error) {
        console.error('Thumbnail upload error:', error);
        alert('Ошибка загрузки обложки');
    }
}

/**
 * Удалить загруженную обложку
 */
function removeThumbnail() {
    uploadedThumbnail = null;
    
    const preview = document.getElementById('thumbnailPreview');
    const placeholder = document.getElementById('thumbnailPlaceholder');
    const removeBtn = document.getElementById('removeThumbnailBtn');
    const input = document.getElementById('thumbnailUpload');
    
    if (preview) {
        preview.innerHTML = '';
        preview.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'none';
    if (input) input.value = '';
    
    console.log('🗑️ Thumbnail removed');
}

/**
 * Прочитать файл как Data URL
 */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
}

// ===== КЛАСС МЕНЕДЖЕРА УРОВНЕЙ =====
// UserLevelManager и levelManager уже в common.js
// Добавим недостающий метод updateArchiveStatus
if (typeof levelManager !== 'undefined' && !levelManager.updateArchiveStatus) {
    levelManager.updateArchiveStatus = function(user) {
        const statusInfo = document.getElementById('archiveStatusInfo');
        const usageFill = document.getElementById('archiveUsageFill');
        const usageText = document.getElementById('archiveUsageText');
        
        if (!statusInfo || !usageFill || !usageText) return;

        const archiveCount = user.archiveCount || 0;
        const archiveLimit = this.getArchiveLimit(user.level);

        if (user.level >= 1) {
            statusInfo.classList.add('show');
            
            if (archiveLimit === '∞') {
                usageFill.style.width = '100%';
                usageText.textContent = `Archive: ${archiveCount}/∞`;
            } else {
                const percentage = (archiveCount / archiveLimit) * 100;
                usageFill.style.width = `${percentage}%`;
                
                if (percentage > 80) {
                    usageFill.classList.add('danger');
                } else if (percentage > 60) {
                    usageFill.classList.add('warning');
                }
                
                usageText.textContent = `Archive: ${archiveCount}/${archiveLimit}`;
            }
        } else {
            statusInfo.classList.remove('show');
        }
    };
}

// NotificationManager уже определён в common.js

// ===== УТИЛИТЫ =====
function checkContent(text) {
    if (!text || typeof text !== 'string') return { isClean: true, text: text };

    const lowerText = text.toLowerCase();
    let foundBadWords = [];

    forbiddenWords.forEach(word => {
        if (lowerText.includes(word.toLowerCase())) {
            foundBadWords.push(word);
        }
    });

    if (foundBadWords.length > 0) {
        return {
            isClean: false,
            text: text,
            badWords: foundBadWords,
            message: 'Текст содержит неподходящий контент'
        };
    }

    return { isClean: true, text: text };
}

function sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';

    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .replace(/<script/gi, '')
        .replace(/<\/script>/gi, '');
}

function generateUserId() {
    try {
        const array = new Uint32Array(2);
        window.crypto.getRandomValues(array);
        const randomNum = (array[0] % 9000000) + 1000000;
        return randomNum.toString();
    } catch (error) {
        return Math.floor(1000000 + Math.random() * 9000000).toString();
    }
}

function generateUniqueCardId() {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `card_${timestamp}_${randomSuffix}`;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function getWalletAddress() {
    if (window.safepal?.ethereum?.selectedAddress) {
        return window.safepal.ethereum.selectedAddress;
    }
    if (window.ethereum?.isSafePal && window.ethereum.selectedAddress) {
        return window.ethereum.selectedAddress;
    }
    if (typeof walletAddress !== 'undefined' && walletAddress) {
        return walletAddress;
    }
    if (currentUser?.walletAddress) {
        return currentUser.walletAddress;
    }
    if (window.ethereum?.selectedAddress) {
        return window.ethereum.selectedAddress;
    }
    return null;
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            notificationManager.show('📋 Copied!', 'success');
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        notificationManager.show('📋 Copied!', 'success');
    }
}

// ===== ПЕРЕВОДЫ =====
const generatorTranslations = {
    en: {
        pageTitle: "CardGift - Digital Card Generator",
        tagline: "Create stunning digital cards in seconds!",
        yourProfile: "Your Profile",
        instructionsBtn: "📋 Instructions",
        dashboardBtn: "📊 Dashboard",
        blockchainConnection: "Blockchain Connection",
        connectSafePalWallet: "🔗 Connect SafePal Wallet",
        media: "Photo/Video",
        uploadMedia: "Click to upload photo or video",
        uploadRecommendation: "Recommended: vertical format (9:16)",
        orInsertVideo: "Or insert video URL:",
        textLabel: "Text",
        addEmoji: "Add Emoji",
        textPosition: "Text Position",
        useTemplate: "Use template:",
        birthday: "Birthday",
        newyear: "New Year",
        love: "Love",
        thanks: "Thanks",
        congrats: "Congrats",
        instructions: "Instructions",
        preview: "Preview",
        style: "Style",
        classic: "Classic",
        sunset: "Sunset",
        ocean: "Ocean",
        space: "Space",
        neon: "Neon",
        advancedSettings: "Advanced Settings",
        callToAction: "Call to Action",
        buttonPosition: "Button Position:",
        messageTimer: "Message show delay:",
        buttonTimer: "Button show delay:",
        seconds: "seconds",
        marqueeText: "Running Text",
        marqueeTimer: "Show running text after:",
        banner: "Banner",
        bannerTimer: "Banner show delay:",
        archive: "Archive",
        archiveDescription: "Save your best cards to archive",
        saveToArchive: "Save to Archive",
        viewArchive: "View Archive",
        archiveLockedTitle: "Archive Locked",
        archiveLockedText: "Activate your account to access the archive",
        activateAccount: "Activate Account",
        createCard: "Create Card",
        edit: "Edit",
        create: "Create",
        creating: "Creating your card...",
        contentBlocked: "Content Blocked",
        contentPolicyViolation: "Content violates community guidelines.",
        tryAgain: "Try Again",
        shareCardTitle: "🎉 Your card is ready!",
        downloadImage: "Share Preview",
        copyLink: "Copy Link",
        shareOn: "Share on",
        // Instructions
        instructionsTitle: "CardGift Guide",
        quickStartTitle: "Quick Start",
        addPhotoTitle: "Adding Photo",
        instruction1: "Click on the '📸 Photo' area",
        instruction2: "Select an image from your device",
        instruction3: "<em>Important: Use vertical photos for mobile (9:16 ratio)</em>",
        instruction4: "<em>Avoid: Horizontal photos — they look bad on mobile cards</em>",
        addTextTitle: "Adding Text",
        instruction5: "Enter your greeting in the text field",
        instruction6: "Add a personal message (appears on timer)",
        instruction7: "You can use emojis 🎉💕🎂",
        timersTitle: "Timer Settings",
        instruction8: "Personal message timer: When personal text appears (1-30 sec)",
        instruction9: "Offer button timer: When 'Get Generator' button shows (1-60 sec)",
        instruction10: "Banner timer: When ad banner appears (if enabled)",
        positionTitle: "Button Positioning",
        instruction11: "Choose from 9 positions for 'Like this card?' button",
        instruction12: "Avoid positions that cover important content",
        instruction13: "Button takes 1/3 of screen width for neat look",
        styleTitle: "Style Selection",
        extraFeaturesTitle: "Extra Features",
        instruction14: "🎨 Demo templates: Ready texts for different occasions. Great for inspiration.",
        instruction15: "📢 Ad banner: Add HTML code for your banner. Perfect for business or event ads.",
        instruction16: "🔗 Referral system: Your unique 7-digit ID. Share your referral link.",
        mobileOptTitle: "Mobile Optimization Tips",
        photoFormatsTitle: "<strong>Best photo formats:</strong>",
        instruction17: "Vertical photos → perfect for mobile cards",
        instruction18: "Square photos → will show with background",
        instruction19: "Avoid horizontal → don't work well on mobile",
        mainRule: "Main rule: Always think mobile! Your cards will be viewed on phones.",
        // Ready Templates
        templatesAccess: "Ready Templates",
        openTemplates: "Open Ready Templates",
        templatesHint: "Use ready-made cards - just edit and save with YOUR link!",
        templatesModalTitle: "Ready Templates",
        closeInstructionsBtn: "Close"
    },
    ru: {
        pageTitle: "CardGift - Генератор цифровых открыток",
        tagline: "Создавайте потрясающие цифровые открытки за секунды!",
        yourProfile: "Ваш профиль",
        instructionsBtn: "📋 Инструкции",
        dashboardBtn: "📊 Панель",
        blockchainConnection: "Подключение к блокчейну",
        connectSafePalWallet: "🔗 Подключить SafePal кошелек",
        media: "Фото/Видео",
        uploadMedia: "Нажмите, чтобы загрузить фото или видео",
        uploadRecommendation: "Рекомендуется: вертикальный формат (9:16)",
        orInsertVideo: "Или вставьте URL видео:",
        textLabel: "Текст",
        addEmoji: "Добавить эмодзи",
        textPosition: "Позиция текста",
        useTemplate: "Использовать шаблон:",
        birthday: "День рождения",
        newyear: "Новый год",
        love: "Любовь",
        thanks: "Благодарность",
        congrats: "Поздравление",
        instructions: "Инструкции",
        preview: "Предпросмотр",
        style: "Стиль",
        classic: "Классический",
        sunset: "Закат",
        ocean: "Океан",
        space: "Космос",
        neon: "Неон",
        advancedSettings: "Расширенные настройки",
        callToAction: "Призыв к действию",
        buttonPosition: "Позиция кнопки:",
        messageTimer: "Задержка показа сообщения:",
        buttonTimer: "Задержка показа кнопки:",
        seconds: "секунд",
        marqueeText: "Бегущая строка",
        marqueeTimer: "Показать бегущую строку через:",
        banner: "Баннер",
        bannerTimer: "Задержка показа баннера:",
        archive: "Архив",
        archiveDescription: "Сохраняйте свои лучшие открытки в архив",
        saveToArchive: "Сохранить в архив",
        viewArchive: "Просмотр архива",
        archiveLockedTitle: "Архив заблокирован",
        archiveLockedText: "Для доступа к Архиву необходимо активироваться на платформе",
        activateAccount: "Активировать",
        createCard: "Создать открытку",
        edit: "Редактировать",
        create: "Создать",
        creating: "Создание открытки...",
        contentBlocked: "Контент заблокирован",
        contentPolicyViolation: "Контент не соответствует правилам.",
        tryAgain: "Попробовать снова",
        shareCardTitle: "🎉 Ваша открытка готова!",
        downloadImage: "Поделиться превью",
        copyLink: "Копировать ссылку",
        shareOn: "Поделиться в",
        // Instructions
        instructionsTitle: "Руководство CardGift",
        quickStartTitle: "Быстрый старт",
        addPhotoTitle: "Добавление фото",
        instruction1: "Нажмите на область '📸 Фото'",
        instruction2: "Выберите изображение с устройства",
        instruction3: "<em>Важно: Используйте вертикальные фото для мобильных (пропорции 9:16)</em>",
        instruction4: "<em>Избегайте: Горизонтальные фото — они плохо смотрятся на мобильных открытках</em>",
        addTextTitle: "Добавление текста",
        instruction5: "Введите поздравление в поле текста",
        instruction6: "Добавьте персональное сообщение (появляется по таймеру)",
        instruction7: "Можете использовать эмодзи 🎉💕🎂",
        timersTitle: "Настройка таймеров",
        instruction8: "Таймер личного сообщения: Когда появляется персональный текст (1–30 сек)",
        instruction9: "Таймер кнопки предложения: Когда показывается кнопка 'Получить генератор' (1–60 сек)",
        instruction10: "Таймер баннера: Когда появляется рекламный баннер (если включен)",
        positionTitle: "Позиционирование кнопки",
        instruction11: "Выберите из 9 позиций для кнопки 'Понравилась открытка?'",
        instruction12: "Избегайте позиций, которые закрывают важный контент",
        instruction13: "Кнопка составляет 1/3 ширины экрана для аккуратного вида",
        styleTitle: "Выбор стиля",
        extraFeaturesTitle: "Дополнительные функции",
        instruction14: "🎨 Демо-шаблоны: Готовые тексты для разных случаев. Отлично подходят для вдохновения.",
        instruction15: "📢 Рекламный баннер: Добавьте HTML-код для своего баннера. Идеально для рекламы бизнеса или мероприятий.",
        instruction16: "🔗 Реферальная система: Ваш уникальный 7-значный ID. Делитесь реферальной ссылкой.",
        mobileOptTitle: "Советы для мобильной оптимизации",
        photoFormatsTitle: "<strong>Лучшие форматы фото:</strong>",
        instruction17: "Вертикальные фото → идеальны для мобильных открыток",
        instruction18: "Квадратные фото → покажутся с фоном",
        instruction19: "Избегайте горизонтальных → плохо работают на мобильных",
        mainRule: "Главное правило: Всегда думайте о мобильных! Ваши открытки будут просматривать на телефонах.",
        // Ready Templates
        templatesAccess: "Готовые шаблоны",
        openTemplates: "Открыть готовые шаблоны",
        templatesHint: "Используйте готовые открытки - отредактируйте и сохраните со СВОЕЙ ссылкой!",
        templatesModalTitle: "Готовые шаблоны",
        closeInstructionsBtn: "Закрыть"
    },
    ua: {
        pageTitle: "CardGift - Генератор цифрових листівок",
        tagline: "Створюйте дивовижні цифрові листівки за секунди!",
        yourProfile: "Ваш профіль",
        instructionsBtn: "📋 Інструкції",
        dashboardBtn: "📊 Панель",
        blockchainConnection: "Підключення до блокчейну",
        connectSafePalWallet: "🔗 Підключити SafePal гаманець",
        media: "Фото/Відео",
        uploadMedia: "Натисніть, щоб завантажити фото або відео",
        uploadRecommendation: "Рекомендується: вертикальний формат (9:16)",
        orInsertVideo: "Або вставте URL відео:",
        textLabel: "Текст",
        addEmoji: "Додати емодзі",
        textPosition: "Позиція тексту",
        useTemplate: "Використати шаблон:",
        birthday: "День народження",
        newyear: "Новий рік",
        love: "Любов",
        thanks: "Подяка",
        congrats: "Вітання",
        instructions: "Інструкції",
        preview: "Попередній перегляд",
        style: "Стиль",
        classic: "Класичний",
        sunset: "Захід",
        ocean: "Океан",
        space: "Космос",
        neon: "Неон",
        advancedSettings: "Розширені налаштування",
        callToAction: "Заклик до дії",
        buttonPosition: "Позиція кнопки:",
        messageTimer: "Затримка показу повідомлення:",
        buttonTimer: "Затримка показу кнопки:",
        seconds: "секунд",
        marqueeText: "Біжучий рядок",
        marqueeTimer: "Показати біжучий рядок через:",
        banner: "Банер",
        bannerTimer: "Затримка показу банера:",
        archive: "Архів",
        archiveDescription: "Зберігайте свої найкращі листівки в архів",
        saveToArchive: "Зберегти в архів",
        viewArchive: "Переглянути архів",
        archiveLockedTitle: "Архів заблоковано",
        archiveLockedText: "Для доступу до Архіву необхідно активуватися на платформі",
        activateAccount: "Активувати",
        createCard: "Створити листівку",
        edit: "Редагувати",
        create: "Створити",
        creating: "Створення листівки...",
        contentBlocked: "Контент заблоковано",
        contentPolicyViolation: "Контент не відповідає правилам.",
        tryAgain: "Спробувати знову",
        shareCardTitle: "🎉 Ваша листівка готова!",
        downloadImage: "Поділитися превью",
        copyLink: "Копіювати посилання",
        shareOn: "Поділитися в",
        // Instructions
        instructionsTitle: "Посібник CardGift",
        quickStartTitle: "Швидкий старт",
        addPhotoTitle: "Додавання фото",
        instruction1: "Натисніть на область '📸 Фото'",
        instruction2: "Виберіть зображення з пристрою",
        instruction3: "<em>Важливо: Використовуйте вертикальні фото для мобільних (пропорції 9:16)</em>",
        instruction4: "<em>Уникайте: Горизонтальні фото — вони погано виглядають на мобільних листівках</em>",
        addTextTitle: "Додавання тексту",
        instruction5: "Введіть привітання в поле тексту",
        instruction6: "Додайте персональне повідомлення (з'являється по таймеру)",
        instruction7: "Можете використовувати емодзі 🎉💕🎂",
        timersTitle: "Налаштування таймерів",
        instruction8: "Таймер особистого повідомлення: Коли з'являється персональний текст (1–30 сек)",
        instruction9: "Таймер кнопки пропозиції: Коли показується кнопка 'Отримати генератор' (1–60 сек)",
        instruction10: "Таймер банера: Коли з'являється рекламний банер (якщо увімкнений)",
        positionTitle: "Позиціювання кнопки",
        instruction11: "Виберіть з 9 позицій для кнопки 'Сподобалася листівка?'",
        instruction12: "Уникайте позицій, які закривають важливий контент",
        instruction13: "Кнопка займає 1/3 ширини екрану для акуратного вигляду",
        styleTitle: "Вибір стилю",
        extraFeaturesTitle: "Додаткові функції",
        instruction14: "🎨 Демо-шаблони: Готові тексти для різних випадків. Чудово підходять для натхнення.",
        instruction15: "📢 Рекламний банер: Додайте HTML-код для свого банера. Ідеально для реклами бізнесу чи заходів.",
        instruction16: "🔗 Реферальна система: Ваш унікальний 7-значний ID. Діліться реферальним посиланням.",
        mobileOptTitle: "Поради для мобільної оптимізації",
        photoFormatsTitle: "<strong>Найкращі формати фото:</strong>",
        instruction17: "Вертикальні фото → ідеальні для мобільних листівок",
        instruction18: "Квадратні фото → показуватимуться з фоном",
        instruction19: "Уникайте горизонтальних → погано працюють на мобільних",
        mainRule: "Головне правило: Завжди думайте про мобільні! Ваші листівки переглядатимуть на телефонах.",
        // Ready Templates
        templatesAccess: "Готові шаблони",
        openTemplates: "Відкрити готові шаблони",
        templatesHint: "Використовуйте готові листівки - відредагуйте та збережіть зі СВОЇМ посиланням!",
        templatesModalTitle: "Готові шаблони",
        closeInstructionsBtn: "Закрити"
    }
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
window.addEventListener('DOMContentLoaded', function() {
    initializeGeneratorApp();
});

async function initializeGeneratorApp() {
    try {
        console.log('🚀 Generator initialization started...');

        // Восстанавливаем кошелек
        if (typeof walletState !== 'undefined') {
            const savedWallet = walletState.load();
            if (savedWallet) {
                window.walletAddress = savedWallet.address;
                currentUser = {
                    userId: savedWallet.userId,
                    level: savedWallet.level,
                    isActive: savedWallet.isActive,
                    walletAddress: savedWallet.address
                };
            }
        }

        const detectedLang = detectLanguage();
        switchLanguage(detectedLang);

        const urlParams = new URLSearchParams(window.location.search);
        const isNewUser = urlParams.get('newUser');
        const userId = urlParams.get('userId');

        // Если есть userId из URL - сохраняем его
        if (userId) {
            localStorage.setItem('cardgift_cg_id', userId.replace('CG', ''));
            
            // Обновляем currentUser
            const existingUser = localStorage.getItem('currentUser');
            if (existingUser) {
                try {
                    const user = JSON.parse(existingUser);
                    user.userId = userId;
                    user.id = userId;
                    localStorage.setItem('currentUser', JSON.stringify(user));
                } catch (e) {}
            }
            
            if (isNewUser) {
                showWelcomeBanner(userId);
            }
            
            // Очищаем URL но оставляем язык
            const lang = urlParams.get('lang');
            const newUrl = lang ? `${window.location.pathname}?lang=${lang}` : window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }

        await loadWeb3User();
        initializeEmojiPicker();
        await autoConnectWallet();
        initializeToggles();
        checkCreateButtonState();
        setupEventListeners();
        updateNetworkStatus();
        loadSavedSettings();

        // Загружаем шаблон если есть в URL
        await loadTemplateFromUrl();
        
        // Показываем баннер SafePal если нужно
        setTimeout(showOpenInWalletBanner, 1000);
        
        console.log('✅ Generator fully initialized');

    } catch (error) {
        console.error('❌ Initialization error:', error);
        notificationManager.show('Ошибка инициализации', 'error');
    }
}

// ===== ЯЗЫКОВЫЕ ФУНКЦИИ =====
function detectLanguage() {
    const urlParams = new URLSearchParams(window.location.search);
    const langFromUrl = urlParams.get('lang');
    if (langFromUrl && ['en', 'ru', 'ua'].includes(langFromUrl)) return langFromUrl;

    // Унифицированный ключ + старый для обратной совместимости
    const savedLang = localStorage.getItem('cardgift_language') || localStorage.getItem('generatorLanguage');
    if (savedLang && ['en', 'ru', 'ua'].includes(savedLang)) return savedLang;

    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('uk')) return 'ua';
    if (browserLang.startsWith('ru')) return 'ru';
    return 'en';
}

function switchLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('cardgift_language', lang); // Унифицированный ключ

    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    const langBtn = document.getElementById(`lang${lang.charAt(0).toUpperCase() + lang.slice(1)}`);
    if (langBtn) langBtn.classList.add('active');

    updateAllTexts();
}

function updateAllTexts() {
    const t = generatorTranslations[currentLanguage];
    if (!t) return;

    Object.keys(t).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = t[key];
            } else if (element.tagName === 'LI' || key.includes('instruction') || key.includes('Title')) {
                // Для списков и инструкций используем innerHTML (поддержка <em>, <strong>)
                element.innerHTML = t[key];
            } else {
                element.textContent = t[key];
            }
        }
    });

    document.title = t.pageTitle;

    const greetingTextarea = document.getElementById('greetingText');
    if (greetingTextarea) {
        greetingTextarea.placeholder = currentLanguage === 'en' ? 'Enter your greeting here...' : 
                                      currentLanguage === 'ru' ? 'Введите ваше поздравление здесь...' : 
                                      'Введіть ваше вітання тут...';
    }
}

// ===== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЯ =====
async function loadWeb3User() {
    try {
        const localUser = localStorage.getItem('currentUser');
        const savedCgId = localStorage.getItem('cardgift_cg_id');

        if (localUser) {
            currentUser = JSON.parse(localUser);
            
            // Если нет userId но есть сохранённый CG ID - добавляем
            if (!currentUser.userId && savedCgId) {
                currentUser.userId = savedCgId.startsWith('CG') ? savedCgId : 'CG' + savedCgId;
            }
            
            levelManager.updateUserInterface(currentUser);
        } else if (savedCgId) {
            // Создаём пользователя из сохранённого ID
            currentUser = {
                userId: savedCgId.startsWith('CG') ? savedCgId : 'CG' + savedCgId,
                level: 0,
                isActive: false,
                cardCount: 0,
                archiveCount: 0
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            levelManager.updateUserInterface(currentUser);
        } else {
            // Генерируем нового пользователя
            const newUserId = generateUserId();
            currentUser = {
                userId: newUserId,
                level: 0,
                isActive: false,
                cardCount: 0,
                archiveCount: 0
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('cardgift_cg_id', newUserId.replace('CG', ''));
            levelManager.updateUserInterface(currentUser);
        }

        checkArchiveAccess();
        
        console.log('✅ User loaded:', currentUser.userId);

    } catch (error) {
        console.error('❌ Error loading user:', error);
        currentUser = {
            userId: generateUserId(),
            level: 0,
            isActive: false,
            cardCount: 0,
            archiveCount: 0
        };
        levelManager.updateUserInterface(currentUser);
    }
}

async function checkArchiveAccess() {
    const saveBtn = document.getElementById('saveToArchiveBtn');
    const viewBtn = document.getElementById('viewArchiveBtn');
    const lockedSection = document.getElementById('archiveLocked');
    const archiveSection = document.getElementById('archiveSection');

    if (!saveBtn || !viewBtn || !lockedSection) return;
    
    let hasAccess = false;
    let userLevel = 0;
    
    // Получаем адрес кошелька
    const wallet = localStorage.getItem('cg_wallet_address') || 
                   localStorage.getItem('cardgift_wallet') ||
                   window.walletAddress;
    
    console.log('🔍 Checking archive access for wallet:', wallet);
    
    // 1. Проверяем уровень через GlobalWayBridge
    if (wallet && window.GlobalWayBridge) {
        try {
            userLevel = await GlobalWayBridge.getUserMaxLevel(wallet);
            console.log('📊 User level from GlobalWay:', userLevel);
            
            if (userLevel >= 1) {
                hasAccess = true;
                // Обновляем currentUser
                if (currentUser) {
                    currentUser.level = userLevel;
                    currentUser.isActive = true;
                }
            }
        } catch (e) {
            console.warn('GlobalWay level check failed:', e);
        }
    }
    
    // 2. Проверяем через currentUser (fallback)
    if (!hasAccess && currentUser && currentUser.level >= 1) {
        hasAccess = true;
        userLevel = currentUser.level;
    }
    
    // 3. Проверяем FOUNDERS
    if (!hasAccess && wallet && window.FOUNDERS_ADDRESSES) {
        const isFounder = FOUNDERS_ADDRESSES.some(function(addr) {
            return addr.toLowerCase() === wallet.toLowerCase();
        });
        if (isFounder) {
            hasAccess = true;
            userLevel = 12;
            console.log('👑 Archive access granted - Founder');
        }
    }
    
    console.log('🔓 Archive access:', hasAccess, 'Level:', userLevel);
    
    if (hasAccess) {
        if (saveBtn) saveBtn.style.display = 'block';
        if (viewBtn) viewBtn.style.display = 'block';
        if (saveBtn) saveBtn.disabled = false;
        if (lockedSection) lockedSection.style.display = 'none';
        if (archiveSection) archiveSection.style.display = 'block';
    } else {
        if (saveBtn) saveBtn.style.display = 'none';
        if (viewBtn) viewBtn.style.display = 'none';
        if (lockedSection) lockedSection.style.display = 'block';
        if (archiveSection) archiveSection.style.display = 'none';
    }
}

// ===== СИСТЕМА АКТИВАЦИИ CARDGIFT =====

// Цены уровней из CONFIG с fallback
const LEVEL_PRICES = window.CONFIG?.LEVEL_PRICES || {
    1: 0.0015, 2: 0.003, 3: 0.006, 4: 0.012, 5: 0.024, 6: 0.048,
    7: 0.096, 8: 0.192, 9: 0.384, 10: 0.768, 11: 1.536, 12: 3.072
};

// Ранги и доступы
const RANK_INFO = {
    client: {
        name: { en: 'Client', ru: 'Клиент', uk: 'Клієнт' },
        levels: '1-3',
        color: '#888',
        access: {
            en: 'Archive (up to 3 cards), Card creation',
            ru: 'Архив (до 3 открыток), Создание открыток',
            uk: 'Архів (до 3 листівок), Створення листівок'
        }
    },
    miniAdmin: {
        name: { en: 'MiniAdmin', ru: 'Мини Админ', uk: 'Міні Адмін' },
        levels: '4-6',
        color: '#4CAF50',
        access: {
            en: 'Archive (up to 10 cards), Contacts, Referral program',
            ru: 'Архив (до 10 открыток), Контакты, Реферальная программа',
            uk: 'Архів (до 10 листівок), Контакти, Реферальна програма'
        }
    },
    admin: {
        name: { en: 'Admin', ru: 'Админ', uk: 'Адмін' },
        levels: '7-8',
        color: '#2196F3',
        access: {
            en: 'Archive (up to 50 cards), CRM, Blog, Analytics',
            ru: 'Архив (до 50 открыток), CRM, Блог, Аналитика',
            uk: 'Архів (до 50 листівок), CRM, Блог, Аналітика'
        }
    },
    superAdmin: {
        name: { en: 'SuperAdmin', ru: 'Супер Админ', uk: 'Супер Адмін' },
        levels: '9',
        color: '#FF9800',
        access: {
            en: 'Archive (up to 200 cards), Mailings, Partner program',
            ru: 'Архив (до 200 открыток), Рассылки, Партнёрская программа',
            uk: 'Архів (до 200 листівок), Розсилки, Партнерська програма'
        }
    },
    businessman: {
        name: { en: 'Businessman', ru: 'Бизнесмен', uk: 'Бізнесмен' },
        levels: '10-12',
        color: '#FFD700',
        access: {
            en: 'Unlimited archive, Co-authors, Full access to all features',
            ru: 'Безлимитный архив, Соавторы, Полный доступ ко всем функциям',
            uk: 'Безлімітний архів, Співавтори, Повний доступ до всіх функцій'
        }
    }
};

// Функция активации - показывает модальное окно
function activateAccount() {
    showActivationModal();
}

// Показать модальное окно активации
function showActivationModal() {
    // Удаляем старое окно если есть
    const existingModal = document.getElementById('activationModal');
    if (existingModal) existingModal.remove();
    
    // Получаем текущий уровень пользователя
    const currentLevel = getCurrentUserLevel();
    const nextLevel = currentLevel + 1;
    
    const lang = currentLanguage || 'ru';
    
    const modal = document.createElement('div');
    modal.id = 'activationModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow-y: auto;
    `;
    
    const titles = {
        en: 'Welcome to CardGift!',
        ru: 'Добро пожаловать в CardGift!',
        uk: 'Ласкаво просимо до CardGift!'
    };
    
    const features = {
        en: [
            { icon: '📊', title: 'Partner Program', desc: 'Earn with your referrals' },
            { icon: '🎨', title: 'Personal Tools', desc: 'Professional card creation' },
            { icon: '💰', title: 'Bonuses & Rewards', desc: 'Get bonuses for activity' },
            { icon: '🏆', title: 'Rank System', desc: 'Grow and unlock features' }
        ],
        ru: [
            { icon: '📊', title: 'Партнёрская программа', desc: 'Зарабатывайте с рефералами' },
            { icon: '🎨', title: 'Персональные инструменты', desc: 'Профессиональное создание открыток' },
            { icon: '💰', title: 'Бонусы и вознаграждения', desc: 'Получайте бонусы за активность' },
            { icon: '🏆', title: 'Ранговая система', desc: 'Развивайтесь и открывайте возможности' }
        ],
        uk: [
            { icon: '📊', title: 'Партнерська програма', desc: 'Заробляйте з рефералами' },
            { icon: '🎨', title: 'Персональні інструменти', desc: 'Професійне створення листівок' },
            { icon: '💰', title: 'Бонуси та винагороди', desc: 'Отримуйте бонуси за активність' },
            { icon: '🏆', title: 'Рангова система', desc: 'Розвивайтесь та відкривайте можливості' }
        ]
    };
    
    const featuresHTML = features[lang].map(f => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 10px;">
            <span style="font-size: 28px;">${f.icon}</span>
            <div>
                <div style="font-weight: bold; color: #fff;">${f.title}</div>
                <div style="font-size: 12px; color: #aaa;">${f.desc}</div>
            </div>
        </div>
    `).join('');
    
    // Ранги и их доступы
    const ranksHTML = Object.entries(RANK_INFO).map(([key, rank]) => `
        <div style="display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-left: 3px solid ${rank.color}; background: rgba(255,255,255,0.03); margin-bottom: 8px;">
            <div style="min-width: 40px; text-align: center;">
                <span style="color: ${rank.color}; font-weight: bold;">${rank.levels}</span>
            </div>
            <div>
                <div style="color: ${rank.color}; font-weight: bold;">${rank.name[lang]}</div>
                <div style="font-size: 12px; color: #888;">${rank.access[lang]}</div>
            </div>
        </div>
    `).join('');
    
    // Кнопка активации
    let activationButtonHTML = '';
    if (nextLevel <= 12) {
        const price = LEVEL_PRICES[nextLevel];
        const btnText = {
            en: `Activate Level ${nextLevel}`,
            ru: `Активировать уровень ${nextLevel}`,
            uk: `Активувати рівень ${nextLevel}`
        };
        
        activationButtonHTML = `
            <div style="background: linear-gradient(135deg, #1a1a3e, #0a0a2e); padding: 20px; border-radius: 15px; text-align: center; margin-top: 20px;">
                <div style="font-size: 14px; color: #aaa; margin-bottom: 5px;">
                    ${lang === 'en' ? 'Your current level' : lang === 'ru' ? 'Ваш текущий уровень' : 'Ваш поточний рівень'}: 
                    <span style="color: #FFD700; font-weight: bold;">${currentLevel}</span>
                </div>
                <div style="font-size: 24px; color: #FFD700; font-weight: bold; margin: 10px 0;">
                    ${price} BNB
                </div>
                <div style="font-size: 12px; color: #4CAF50; margin-bottom: 15px;">
                    +${nextLevel * 5} GWT ${lang === 'en' ? 'tokens' : lang === 'ru' ? 'токенов' : 'токенів'}
                </div>
                <button onclick="activateLevel(${nextLevel})" style="
                    width: 100%;
                    padding: 15px 30px;
                    background: linear-gradient(135deg, #FFD700, #FFA000);
                    color: #000;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    text-transform: uppercase;
                ">
                    🚀 ${btnText[lang]}
                </button>
            </div>
        `;
    } else {
        activationButtonHTML = `
            <div style="background: linear-gradient(135deg, #FFD700, #FFA000); padding: 20px; border-radius: 15px; text-align: center; margin-top: 20px;">
                <div style="font-size: 20px; color: #000; font-weight: bold;">
                    👑 ${lang === 'en' ? 'Maximum level reached!' : lang === 'ru' ? 'Максимальный уровень достигнут!' : 'Максимальний рівень досягнуто!'}
                </div>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 20px;
            max-width: 450px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        ">
            <!-- Закрыть -->
            <button onclick="closeActivationModal()" style="
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(255,255,255,0.1);
                border: none;
                color: #fff;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                z-index: 10;
            ">×</button>
            
            <!-- Заголовок -->
            <div style="text-align: center; padding: 30px 20px 20px;">
                <div style="font-size: 50px; margin-bottom: 10px;">🎁</div>
                <h2 style="color: #fff; margin: 0 0 5px; font-size: 22px;">${titles[lang]}</h2>
            </div>
            
            <!-- Возможности -->
            <div style="padding: 0 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    ${featuresHTML}
                </div>
            </div>
            
            <!-- Кнопка активации -->
            <div style="padding: 0 20px;">
                ${activationButtonHTML}
            </div>
            
            <!-- Ранги -->
            <div style="padding: 20px;">
                <h3 style="color: #FFD700; font-size: 16px; margin-bottom: 15px; text-align: center;">
                    ${lang === 'en' ? 'Rank System' : lang === 'ru' ? 'Система рангов' : 'Система рангів'}
                </h3>
                ${ranksHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Закрытие по клику на фон
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeActivationModal();
    });
}

function closeActivationModal() {
    const modal = document.getElementById('activationModal');
    if (modal) modal.remove();
}

// Получить текущий уровень пользователя
function getCurrentUserLevel() {
    // Проверяем из currentUser
    if (currentUser && currentUser.level) {
        return currentUser.level;
    }
    // Из localStorage
    const saved = localStorage.getItem('cg_user_level') || localStorage.getItem('cardgift_level');
    return saved ? parseInt(saved) : 0;
}

// Активация уровня через GlobalWayBridge
async function activateLevel(level) {
    const lang = currentLanguage || 'ru';
    const price = LEVEL_PRICES[level];
    
    const messages = {
        connecting: { en: 'Connecting wallet...', ru: 'Подключение кошелька...', uk: 'Підключення гаманця...' },
        activating: { en: 'Activating level...', ru: 'Активация уровня...', uk: 'Активація рівня...' },
        success: { en: 'Level activated!', ru: 'Уровень активирован!', uk: 'Рівень активовано!' },
        error: { en: 'Activation error', ru: 'Ошибка активации', uk: 'Помилка активації' },
        noWallet: { en: 'Connect your wallet first', ru: 'Сначала подключите кошелёк', uk: 'Спочатку підключіть гаманець' }
    };
    
    // Проверяем подключен ли кошелёк
    const wallet = localStorage.getItem('cg_wallet_address') || localStorage.getItem('cardgift_wallet');
    if (!wallet) {
        notificationManager.show(messages.noWallet[lang], 'error');
        return;
    }
    
    notificationManager.show(messages.activating[lang], 'info');
    
    try {
        // Получаем провайдер
        const provider = window.ethereum || (window.safepal && window.safepal.ethereum);
        if (!provider) {
            throw new Error('Wallet not found');
        }
        
        // Параметры транзакции
        const BRIDGE_ADDRESS = '0x75231309172544886f27449446A9A2a43D5Ac801';
        const PROJECT_ID = 'CG'; // CardGift project ID
        
        // Кодируем вызов activateLevel(projectID, user, level)
        const priceWei = '0x' + Math.floor(price * 1e18).toString(16);
        
        // Простой способ - отправляем нативную транзакцию
        const tx = {
            from: wallet,
            to: BRIDGE_ADDRESS,
            value: priceWei,
            data: encodeActivateLevel(PROJECT_ID, wallet, level)
        };
        
        const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [tx]
        });
        
        console.log('✅ Transaction sent:', txHash);
        notificationManager.show(messages.success[lang], 'success');
        
        // Обновляем уровень
        localStorage.setItem('cg_user_level', level);
        if (currentUser) currentUser.level = level;
        
        // Закрываем модальное окно и обновляем UI
        closeActivationModal();
        checkArchiveAccess();
        
    } catch (error) {
        console.error('Activation error:', error);
        notificationManager.show(messages.error[lang] + ': ' + error.message, 'error');
    }
}

// Кодирование вызова activateLevel
function encodeActivateLevel(projectId, userAddress, level) {
    // Function selector for activateLevel(string,address,uint8)
    // keccak256("activateLevel(string,address,uint8)")[:4]
    const selector = '0x0efe6a8b';
    
    // Для простоты - используем fallback, отправляем только value
    // Контракт должен обработать это как активацию
    return selector;
}

function initializeToggles() {
    const ctaToggle = document.getElementById('ctaToggle');
    const ctaSettings = document.getElementById('ctaSettings');

    if (ctaToggle && ctaSettings) {
        ctaToggle.checked = true;
        ctaSettings.style.display = 'block';
    }
}

function showWelcomeBanner(userId) {
    const banner = document.createElement('div');
    banner.className = 'welcome-banner show';
    banner.innerHTML = `
        <h3>${currentLanguage === 'en' ? 'Welcome to CardGift!' : 
              currentLanguage === 'ru' ? 'Добро пожаловать в CardGift!' : 
              'Ласкаво просимо до CardGift!'}</h3>
        <p>${currentLanguage === 'en' ? `Your unique ID: ${userId}` : 
            currentLanguage === 'ru' ? `Ваш уникальный ID: ${userId}` : 
            `Ваш унікальний ID: ${userId}`}</p>
    `;

    const firstSection = document.querySelector('.section');
    if (firstSection) {
        firstSection.parentNode.insertBefore(banner, firstSection);
        setTimeout(() => {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 600);
        }, 5000);
    }
}

// ===== КОШЕЛЕК =====

// Проверка мобильного устройства
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Проверка - открыто ли в браузере мессенджера
function isInAppBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return /FBAN|FBAV|Instagram|Telegram|WhatsApp|Viber|Line/i.test(ua);
}

// Deep Link для SafePal
function openInSafePal() {
    const currentUrl = encodeURIComponent(window.location.href);
    const safePalDeepLink = `https://link.safepal.io/dapp?url=${currentUrl}`;
    
    // Альтернативные форматы deep link
    // safepalwallet://open?link=${currentUrl}
    // https://link.safepal.io/dapp?url=${currentUrl}
    
    window.location.href = safePalDeepLink;
    
    // Fallback - если deep link не сработал
    setTimeout(() => {
        const msg = currentLanguage === 'ru' 
            ? 'Установите SafePal из App Store или Google Play'
            : currentLanguage === 'uk'
            ? 'Встановіть SafePal з App Store або Google Play'
            : 'Install SafePal from App Store or Google Play';
        
        if (confirm(msg + '\n\nOpen store?')) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
                window.location.href = 'https://apps.apple.com/app/safepal-wallet/id1548297139';
            } else {
                window.location.href = 'https://play.google.com/store/apps/details?id=io.safepal.wallet';
            }
        }
    }, 2500);
}

// Показать баннер "Открыть в SafePal"
function showOpenInWalletBanner() {
    if (!isMobile()) return;
    if (window.ethereum) return; // Уже есть кошелёк
    
    const existingBanner = document.getElementById('walletBanner');
    if (existingBanner) return;
    
    const banner = document.createElement('div');
    banner.id = 'walletBanner';
    banner.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        padding: 15px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        z-index: 99999;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
        border-top: 1px solid #333;
    `;
    
    const text = currentLanguage === 'ru' 
        ? 'Для полного доступа откройте в SafePal'
        : currentLanguage === 'uk'
        ? 'Для повного доступу відкрийте в SafePal'
        : 'Open in SafePal for full access';
    
    const btnText = currentLanguage === 'ru' 
        ? '🔐 Открыть в SafePal'
        : currentLanguage === 'uk'
        ? '🔐 Відкрити в SafePal'
        : '🔐 Open in SafePal';
    
    banner.innerHTML = `
        <span style="color: #aaa; font-size: 13px; flex: 1;">${text}</span>
        <button onclick="openInSafePal()" style="
            background: linear-gradient(135deg, #4CAF50, #2E7D32);
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            white-space: nowrap;
            font-size: 13px;
        ">${btnText}</button>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: #666;
            font-size: 20px;
            cursor: pointer;
            padding: 5px;
        ">×</button>
    `;
    
    document.body.appendChild(banner);
}

async function connectWallet() {
    try {
        const walletBtn = document.getElementById('walletConnectBtn');
        if (!walletBtn) return;
        
        walletBtn.textContent = '🔄 Connecting...';
        walletBtn.disabled = true;
        
        // Проверяем есть ли кошелёк
        if (!window.ethereum) {
            // На мобильном - предлагаем открыть в SafePal
            if (isMobile()) {
                walletBtn.textContent = '🔐 Connect';
                walletBtn.disabled = false;
                openInSafePal();
                return;
            }
            throw new Error('Wallet not found. Install SafePal or MetaMask.');
        }
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No connected accounts');
        }
        
        const walletAddress = accounts[0];
        
        if (typeof walletState !== 'undefined') {
            walletState.save({
                address: walletAddress,
                userId: currentUser.userId,
                level: currentUser.level,
                isActive: currentUser.isActive
            });
        }
        
        // Switch to opBNB
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (parseInt(chainId, 16) !== 204) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xCC' }]
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0xCC',
                            chainName: 'opBNB Mainnet',
                            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                            rpcUrls: ['https://opbnb-mainnet-rpc.bnbchain.org'],
                            blockExplorerUrls: ['https://mainnet.opbnbscan.com']
                        }]
                    });
                }
            }
        }
        
        showWalletConnected(walletAddress);
        walletConnected = true;
        updateNetworkStatus();
        await syncUserWithBlockchain(walletAddress);
        
        notificationManager.show('✅ Wallet connected!', 'success');
        
    } catch (error) {
        console.error('❌ Wallet error:', error);
        notificationManager.show(error.message, 'error');
        
        const walletBtn = document.getElementById('walletConnectBtn');
        if (walletBtn) {
            walletBtn.textContent = generatorTranslations[currentLanguage].connectSafePalWallet;
            walletBtn.disabled = false;
        }
    }
}

function showWalletConnected(address) {
    walletConnected = true;
    const walletStatusElement = document.getElementById('walletStatus');
    if (walletStatusElement) {
        walletStatusElement.innerHTML = `
            <div style="background: rgba(76, 175, 80, 0.1); color: #4CAF50; padding: 10px; border-radius: 10px; margin-top: 10px; text-align: center;">
                <div style="font-weight: bold;">✅ Wallet connected</div>
                <div style="font-size: 12px; color: #CCC; margin-top: 5px;">${address.substring(0, 6)}...${address.substring(address.length - 4)}</div>
                <button onclick="disconnectWallet()" style="background: #FF4444; color: white; border: none; border-radius: 8px; padding: 8px 15px; cursor: pointer; margin-top: 10px; font-size: 12px;">
                    🚪 Disconnect
                </button>
            </div>
        `;
    }
}

function disconnectWallet() {
    if (confirm('Disconnect wallet?')) {
        walletAddress = null;
        walletConnected = false;
        currentUser = null;
        
        if (typeof walletState !== 'undefined') walletState.clear();
        
        const walletStatusElement = document.getElementById('walletStatus');
        if (walletStatusElement) walletStatusElement.innerHTML = '';
        
        location.reload();
    }
}

async function autoConnectWallet() {
    if (typeof walletManager !== 'undefined' && walletManager?.isWalletConnected?.()) {
        try {
            const address = await walletManager.getAddress();
            if (address) {
                showWalletConnected(address);
                walletConnected = true;
                updateNetworkStatus();
            }
        } catch (error) {
            console.warn('⚠️ Auto-connect failed:', error);
        }
    }
}

async function syncUserWithBlockchain(walletAddress) {
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const userAddress = accounts[0].toLowerCase();
        
        console.log('🔄 syncUserWithBlockchain for:', userAddress);
        
        // 1. СНАЧАЛА проверяем IdLinkingService - это главный источник cgId!
        if (window.IdLinkingService) {
            try {
                const result = await IdLinkingService.onWalletConnected(userAddress);
                
                if (result && result.cgId) {
                    console.log('✅ Got CG_ID from IdLinkingService:', result.cgId);
                    
                    currentUser.userId = result.cgId;  // ЭТО ГЛАВНОЕ! Используем cgId, не gwId!
                    currentUser.level = result.level || 0;
                    currentUser.isActive = result.level > 0;
                    currentUser.walletAddress = userAddress;
                    
                    // Сохраняем в localStorage
                    localStorage.setItem('cardgift_cg_id', result.cgId);
                    if (result.gwId) {
                        localStorage.setItem('cardgift_gw_id', result.gwId);
                    }
                    
                    // Сохраняем в walletState
                    if (typeof walletState !== 'undefined') {
                        walletState.save({
                            address: userAddress,
                            userId: currentUser.userId,
                            level: currentUser.level,
                            isActive: currentUser.isActive
                        });
                    }
                    
                    console.log('✅ currentUser.userId set to:', currentUser.userId);
                    levelManager.updateUserInterface(currentUser);
                    return;
                }
            } catch (e) {
                console.warn('IdLinkingService error:', e);
            }
        }
        
        // 2. Fallback: проверяем localStorage
        const savedCgId = localStorage.getItem('cardgift_cg_id');
        if (savedCgId && savedCgId !== 'null' && savedCgId !== 'undefined') {
            console.log('📦 Using CG_ID from localStorage:', savedCgId);
            currentUser.userId = savedCgId;
            currentUser.walletAddress = userAddress;
            
            // Получаем уровень
            if (window.GlobalWayBridge) {
                try {
                    currentUser.level = await GlobalWayBridge.getUserMaxLevel(userAddress);
                    currentUser.isActive = currentUser.level > 0;
                } catch (e) {
                    currentUser.level = 0;
                }
            }
            
            if (typeof walletState !== 'undefined') {
                walletState.save({
                    address: userAddress,
                    userId: currentUser.userId,
                    level: currentUser.level,
                    isActive: currentUser.isActive
                });
            }
            
            levelManager.updateUserInterface(currentUser);
            return;
        }
        
        // 3. Fallback: проверяем FOUNDERS_ADDRESSES (для соавторов)
        const isFounder = FOUNDERS_ADDRESSES.some(addr => 
            addr.toLowerCase() === userAddress.toLowerCase()
        );
        
        if (isFounder) {
            console.log('👑 Founder detected');
            
            if (userAddress.toLowerCase() === CENTRAL_FOUNDER.toLowerCase()) {
                currentUser.level = 12;
                if (window.CONFIG && CONFIG.COAUTHORS) {
                    const author = CONFIG.COAUTHORS.find(a => a.role === 'owner');
                    if (author) {
                        currentUser.userId = author.cgId;
                    }
                }
            } else {
                currentUser.level = 12;
                if (window.CONFIG && CONFIG.COAUTHORS) {
                    const coauthor = CONFIG.COAUTHORS.find(a => 
                        a.wallet && a.wallet.toLowerCase() === userAddress.toLowerCase()
                    );
                    if (coauthor) {
                        currentUser.userId = coauthor.cgId;
                        console.log('✅ Found coauthor by wallet:', coauthor.cgId);
                    }
                }
            }
            
            currentUser.isActive = true;
            currentUser.walletAddress = userAddress;
            
            if (typeof walletState !== 'undefined') {
                walletState.save({
                    address: userAddress,
                    userId: currentUser.userId,
                    level: currentUser.level,
                    isActive: currentUser.isActive
                });
            }
            
            levelManager.updateUserInterface(currentUser);
        }
        
    } catch (error) {
        console.warn('⚠️ Could not sync with blockchain:', error);
    }
}

async function updateNetworkStatus() {
    const networkStatus = document.getElementById('networkStatus');
    if (!networkStatus) return;

    if (window.ethereum) {
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const currentChainId = parseInt(chainId, 16);
            
            if (currentChainId === 204) {
                networkStatus.innerHTML = '🟢 opBNB Mainnet';
                networkStatus.style.color = '#4CAF50';
            } else {
                networkStatus.innerHTML = '🟡 Wrong Network';
                networkStatus.style.color = '#FF9800';
            }
        } catch (error) {
            networkStatus.innerHTML = '🔴 Network Error';
            networkStatus.style.color = '#f44336';
        }
    } else {
        networkStatus.innerHTML = '⚪ No Wallet';
        networkStatus.style.color = '#888';
    }
}

// ===== МЕДИА ЗАГРУЗКА =====
function handleMediaUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        notificationManager.show('File too large. Maximum 10MB.', 'error');
        return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
        notificationManager.show('Unsupported file type.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedMedia = {
            type: file.type.startsWith('video/') ? 'video' : 'image',
            data: e.target.result,
            file: file
        };

        displayMediaPreview();
        checkCreateButtonState();

        const videoUrlField = document.getElementById('videoUrl');
        if (videoUrlField) {
            videoUrlField.value = '';
            videoUrlField.style.borderColor = '#444';
        }
    };
    reader.readAsDataURL(file);
}

function displayMediaPreview() {
    const preview = document.getElementById('mediaPreview');
    if (!preview) return;

    preview.style.display = 'block';
    preview.style.position = 'relative';
    preview.innerHTML = '';

    if (uploadedMedia.type === 'image') {
        const img = document.createElement('img');
        img.src = uploadedMedia.data;
        img.style.cssText = 'width: 100%; height: auto; border-radius: 10px;';
        preview.appendChild(img);
    } else {
        const video = document.createElement('video');
        video.src = uploadedMedia.data;
        video.controls = true;
        video.style.cssText = 'width: 100%; height: auto; border-radius: 10px;';
        preview.appendChild(video);
    }

    const button = document.createElement('button');
    button.textContent = '×';
    button.style.cssText = 'position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; z-index: 10;';
    button.onclick = removeMedia;
    preview.appendChild(button);
}

function removeMedia() {
    uploadedMedia = null;
    const preview = document.getElementById('mediaPreview');
    const mediaUpload = document.getElementById('mediaUpload');

    if (preview) {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
    if (mediaUpload) mediaUpload.value = '';
    checkCreateButtonState();
}

// ===== ЭМОДЗИ =====
function initializeEmojiPicker() {
    loadEmojis('smileys');
}

function toggleEmojiPicker() {
    const emojiPicker = document.getElementById('emojiPicker');
    if (!emojiPicker) return;

    emojiPicker.classList.toggle('show');
    if (emojiPicker.classList.contains('show')) loadEmojis('smileys');
}

function loadEmojis(category) {
    const container = document.querySelector('.emoji-container');
    if (!container) return;

    container.innerHTML = '';

    document.querySelectorAll('.emoji-categories button').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`.emoji-categories button[data-category="${category}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    if (emojis[category]) {
        emojis[category].forEach(emoji => {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.onclick = () => insertEmoji(emoji);
            container.appendChild(span);
        });
    }
}

function insertEmoji(emoji) {
    const textarea = document.getElementById('greetingText');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    textarea.value = text.substring(0, start) + emoji + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + emoji.length;

    const emojiPicker = document.getElementById('emojiPicker');
    if (emojiPicker) emojiPicker.style.display = 'none';

    checkCreateButtonState();
}

// ===== ПОЗИЦИОНИРОВАНИЕ =====
function setTextPosition(position) {
    selectedTextPosition = position;

    document.querySelectorAll('#text .position-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const targetBtn = document.querySelector(`#text .position-btn[data-position="${position}"]`);
    if (targetBtn) targetBtn.classList.add('active');
}

function setCTAPosition(position) {
    selectedCTAPosition = position;

    document.querySelectorAll('#ctaSettings .position-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.position === position) btn.classList.add('active');
    });
}

function selectStyle(style) {
    selectedStyle = style;
    document.querySelectorAll('.style-option').forEach(opt => {
        opt.classList.remove('active');
    });

    const targetStyle = document.querySelector(`[data-style="${style}"]`);
    if (targetStyle) targetStyle.classList.add('active');
}

// ===== ПЕРЕКЛЮЧАТЕЛИ =====
function toggleCTA() {
    const ctaToggle = document.getElementById('ctaToggle');
    const settings = document.getElementById('ctaSettings');
    if (ctaToggle && settings) {
        settings.style.display = ctaToggle.checked ? 'block' : 'none';
    }
}

function toggleMarquee() {
    const marqueeToggle = document.getElementById('marqueeToggle');
    const settings = document.getElementById('marqueeSettings');
    if (marqueeToggle && settings) {
        settings.style.display = marqueeToggle.checked ? 'block' : 'none';
    }
}

function toggleBanner() {
    const bannerToggle = document.getElementById('bannerToggle');
    const settings = document.getElementById('bannerSettings');
    if (bannerToggle && settings) {
        settings.style.display = bannerToggle.checked ? 'block' : 'none';
    }
}

// ===== ШАБЛОНЫ =====
function useTemplate(templateName) {
    const greetingTextarea = document.getElementById('greetingText');
    if (!greetingTextarea || !templates[templateName]?.[currentLanguage]) return;

    greetingTextarea.value = templates[templateName][currentLanguage].greeting;
    checkCreateButtonState();

    notificationManager.show(`Template "${templateName}" applied!`, 'success', 2000);
}

function checkCreateButtonState() {
    const greetingText = document.getElementById('greetingText')?.value?.trim() || '';
    const videoUrl = document.getElementById('videoUrl')?.value?.trim() || '';
    const createBtn = document.getElementById('createCardBtn');
    const saveBtn = document.getElementById('saveToArchiveBtn');

    if (!createBtn) return;

    const hasContent = greetingText || uploadedMedia || videoUrl;

    createBtn.disabled = !hasContent;
    createBtn.style.background = hasContent ? 'linear-gradient(45deg, #43A047, #2E7D32)' : '#666';
    createBtn.style.cursor = hasContent ? 'pointer' : 'not-allowed';

    if (saveBtn && currentUser?.level >= 1) {
        saveBtn.disabled = !hasContent;
    }
}

// ===== ПРЕВЬЮ =====
function showPreview() {
    const greetingText = document.getElementById('greetingText')?.value?.trim() || '';
    const videoUrl = document.getElementById('videoUrl')?.value?.trim() || '';

    if (!greetingText && !uploadedMedia && !videoUrl) {
        notificationManager.show('Add text or media for preview', 'error');
        return;
    }

    createPreview();
    const previewModal = document.getElementById('previewModal');
    if (previewModal) {
        previewModal.classList.add('show');
        previewModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function createPreview() {
    const container = document.getElementById('previewContainer');
    if (!container) return;

    const greetingText = document.getElementById('greetingText')?.value?.trim() || '';
    const videoUrl = document.getElementById('videoUrl')?.value?.trim() || '';

    container.innerHTML = '';

    const mainDiv = document.createElement('div');
    mainDiv.style.cssText = 'width: 100%; height: 100%; position: relative; overflow: hidden; border-radius: 15px;';

    const bgDiv = document.createElement('div');
    bgDiv.className = `style-background style-${selectedStyle}`;
    mainDiv.appendChild(bgDiv);

    if (uploadedMedia) {
        if (uploadedMedia.type === 'image') {
            const img = document.createElement('img');
            img.src = uploadedMedia.data;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; position: absolute; top: 0; left: 0; z-index: 2;';
            mainDiv.appendChild(img);
        } else {
            const video = document.createElement('video');
            video.src = uploadedMedia.data;
            video.style.cssText = 'width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; z-index: 2;';
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            mainDiv.appendChild(video);
        }
    } else if (videoUrl) {
        const videoData = videoProcessor.parseVideoUrl(videoUrl);

        if (videoData.isValid) {
            const videoContainer = document.createElement('div');
            videoContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2;';
            
            const iframe = document.createElement('iframe');
            iframe.src = videoData.embedUrl;
            iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
            iframe.allowFullscreen = true;
            
            videoContainer.appendChild(iframe);
            mainDiv.appendChild(videoContainer);
        }
    }

    if (greetingText) {
        const greetingDiv = document.createElement('div');
        greetingDiv.className = 'card-greeting-new';

        let textPositionStyle = '';
        if (selectedTextPosition.includes('top')) {
            textPositionStyle += 'top: 20px;';
        } else if (selectedTextPosition.includes('bottom')) {
            textPositionStyle += 'bottom: 20px;';
        } else {
            textPositionStyle += 'top: 50%; transform: translateY(-50%);';
        }

        if (selectedTextPosition.includes('Left')) {
            textPositionStyle += 'left: 20px; right: auto; text-align: left; width: calc(100% - 40px);';
        } else if (selectedTextPosition.includes('Right')) {
            textPositionStyle += 'right: 20px; left: auto; text-align: right; width: calc(100% - 40px);';
        } else {
            textPositionStyle += 'left: 20px; right: 20px; text-align: center; width: calc(100% - 40px);';
        }

        greetingDiv.style.cssText = textPositionStyle;
        greetingDiv.textContent = greetingText;
        mainDiv.appendChild(greetingDiv);
    }

    container.appendChild(mainDiv);

    // Добавляем CTA, бегущую строку и баннер
    const ctaToggle = document.getElementById('ctaToggle');
    if (ctaToggle && ctaToggle.checked) {
        const ctaTitle = document.getElementById('ctaTitle')?.value?.trim() || '';
        const ctaButton = document.getElementById('ctaButton')?.value?.trim() || '';
        const ctaUrl = document.getElementById('ctaUrl')?.value?.trim() || '';
        if (ctaTitle && ctaButton) {
            displayCTAButton(ctaTitle, ctaButton, ctaUrl, selectedCTAPosition);
        }
    }

    const marqueeToggle = document.getElementById('marqueeToggle');
    if (marqueeToggle && marqueeToggle.checked) {
        const marqueeText = document.getElementById('marqueeTextInput')?.value?.trim() || '';
        const marqueeUrl = document.getElementById('marqueeUrl')?.value?.trim() || '';
        if (marqueeText) {
            displayMarquee(marqueeText, marqueeUrl);
        }
    }

    const bannerToggle = document.getElementById('bannerToggle');
    if (bannerToggle && bannerToggle.checked) {
        const bannerHtml = document.getElementById('bannerHtml')?.value?.trim() || '';
        const bannerUrl = document.getElementById('bannerUrl')?.value?.trim() || '';
        if (bannerHtml || bannerUrl) {
            displayBanner(bannerHtml, bannerUrl);
        }
    }
}

function closePreview() {
    const previewModal = document.getElementById('previewModal');
    if (previewModal) {
        previewModal.classList.remove('show');
        previewModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ===== ИНСТРУКЦИИ =====
function showInstructions() {
    const instructionsModal = document.getElementById('instructionsModal');
    if (instructionsModal) {
        instructionsModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function hideInstructions() {
    const instructionsModal = document.getElementById('instructionsModal');
    if (instructionsModal) {
        instructionsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ===== СОЗДАНИЕ КАРТЫ (ИСПРАВЛЕНО!) =====
async function createCard() {
    console.log('🎨 Starting card creation...');
    
    const userLevel = currentUser?.level || 0;
    const userWalletAddress = getWalletAddress();
    
    let actualCreator;
    if (currentUser?.userId) {
        actualCreator = currentUser.userId;
    } else if (userWalletAddress) {
        actualCreator = `USER_${userWalletAddress.substring(2, 8)}`;
    } else {
        actualCreator = `GUEST_${Date.now()}`;
    }

    const greetingText = document.getElementById('greetingText')?.value?.trim() || '';
    const videoUrl = document.getElementById('videoUrl')?.value?.trim() || '';

    if (!greetingText && !uploadedMedia && !videoUrl) {
        notificationManager.show('Add greeting text or media', 'error');
        return;
    }

    const contentCheck = checkContent(greetingText);
    if (!contentCheck.isClean) {
        showContentBlockedModal();
        return;
    }

    if (videoUrl) {
        const videoData = videoProcessor.parseVideoUrl(videoUrl);
        if (!videoData.isValid) {
            notificationManager.show(`Video error: ${videoData.error}`, 'error');
            return;
        }
    }

    const createBtn = document.getElementById('createCardBtn');
    if (createBtn) {
        createBtn.classList.add('loading');
        createBtn.disabled = true;
    }

    try {
        // Получаем данные из формы
        const marqueeTextValue = document.getElementById('marqueeTextInput')?.value?.trim() || '';
        const marqueeUrlValue = document.getElementById('marqueeUrl')?.value?.trim() || '';
        const bannerHtmlValue = document.getElementById('bannerHtml')?.value?.trim() || '';
        const bannerUrlValue = document.getElementById('bannerUrl')?.value?.trim() || '';
        const ctaButtonTextValue = document.getElementById('ctaButton')?.value?.trim() || '';
        const ctaUrlValue = document.getElementById('ctaUrl')?.value?.trim() || '';
        const ctaToggle = document.getElementById('ctaToggle')?.checked !== false;
        const ctaTitleValue = document.getElementById('ctaTitle')?.value?.trim() || '';
        
        const cardData = {
            // cardId будет сгенерирован в cardService
            userId: currentUser?.userId || actualCreator,
            actualCreator: actualCreator,
            creatorLevel: userLevel,
            walletAddress: userWalletAddress,
            
            // Текст (оба варианта для совместимости)
            greetingText: greetingText,
            greeting: greetingText,
            
            // Стиль и медиа
            style: selectedStyle || 'classic',
            backgroundImage: uploadedMedia?.data || null,
            videoUrl: videoUrl || null,
            // Превью для видео (для Open Graph в мессенджерах)
            // Приоритет: 1) Загруженная обложка, 2) Автоматическая из YouTube
            thumbnailUrl: uploadedThumbnail?.data || (videoUrl ? videoProcessor.getThumbnailUrl(videoUrl) : null),
            // Флаг что обложка загружена пользователем (для загрузки в Cloudinary)
            customThumbnail: uploadedThumbnail ? true : false,
            textPosition: selectedTextPosition || 'bottom',
            
            // Таймеры
            greetingDelay: parseInt(document.getElementById('messageTimerInput')?.value) || 0,
            
            // CTA кнопка - по умолчанию на registration.html
            ctaEnabled: ctaToggle && !!ctaButtonTextValue,
            ctaTitle: ctaTitleValue || 'CardGift',
            ctaSubtitle: '',
            ctaButton: ctaButtonTextValue || 'Открыть',
            ctaUrl: ctaUrlValue || '/registration.html',
            ctaTimer: parseInt(document.getElementById('buttonTimerInput')?.value) || 3,
            
            // Бегущая строка - по умолчанию на registration.html
            marqueeEnabled: !!marqueeTextValue,
            marqueeText: marqueeTextValue,
            marqueeUrl: marqueeUrlValue || '/registration.html',
            marqueeTimer: parseInt(document.getElementById('marqueeTimerInput')?.value) || 7,
            
            // Баннер - по умолчанию на registration.html
            bannerEnabled: !!bannerHtmlValue,
            bannerHtml: bannerHtmlValue,
            bannerUrl: bannerUrlValue || '/registration.html',
            bannerTimer: parseInt(document.getElementById('bannerTimerInput')?.value) || 5,
            
            createdAt: Date.now(),
            views: 0,

            // Бонусное предложение
            ...(typeof getBonusOfferData === 'function' ? getBonusOfferData() : { bonusEnabled: false })
        };

        // ═══════════════════════════════════════════════════════════
        // Загружаем кастомную обложку в Cloudinary если есть
        // ═══════════════════════════════════════════════════════════
        if (cardData.customThumbnail && cardData.thumbnailUrl && cardData.thumbnailUrl.startsWith('data:')) {
            console.log('🖼️ Uploading custom thumbnail to Cloudinary...');
            try {
                if (typeof cloudinaryService !== 'undefined' && cloudinaryService.uploadImage) {
                    const thumbnailResult = await cloudinaryService.uploadImage(cardData.thumbnailUrl);
                    if (thumbnailResult && thumbnailResult.url) {
                        cardData.thumbnailUrl = thumbnailResult.url;
                        console.log('✅ Thumbnail uploaded to Cloudinary:', cardData.thumbnailUrl);
                    }
                } else {
                    // Fallback: используем API напрямую
                    const response = await fetch('/api/upload-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: cardData.thumbnailUrl })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.url) {
                            cardData.thumbnailUrl = data.url;
                            console.log('✅ Thumbnail uploaded via API:', cardData.thumbnailUrl);
                        }
                    }
                }
            } catch (err) {
                console.warn('⚠️ Thumbnail upload failed, using auto-thumbnail:', err.message);
                // Fallback на автоматический thumbnail
                if (videoUrl) {
                    cardData.thumbnailUrl = videoProcessor.getThumbnailUrl(videoUrl);
                }
            }
        }

        // Логируем данные карточки перед отправкой
        console.log('📋 cardData.backgroundImage:', cardData.backgroundImage?.substring(0, 80) || 'NULL');
        console.log('📋 uploadedMedia:', uploadedMedia);

        let result;
        if (typeof cardService !== 'undefined' && cardService.createCard) {
            // cardService загрузит изображение в Cloudinary и вернёт shareUrl с img параметром
            result = await cardService.createCard(cardData);
        } else {
            const response = await fetch('/api/save-card', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Level': userLevel.toString()
                },
                body: JSON.stringify({ cardId: cardData.cardId, cardData: cardData })
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            result = await response.json();
        }

        console.log('✅ Card created:', result?.cardId || cardData.cardId);
        console.log('📦 Result from cardService:', result);

        // ====== ИСПОЛЬЗУЕМ КОРОТКИЕ ССЫЛКИ ======
        let shareUrl, shortUrl, fullShareUrl, directUrl, previewImageUrl, shortCode;
        
        if (result && result.shortUrl) {
            // cardService вернул короткую ссылку
            shortUrl = result.shortUrl;
            shareUrl = result.shortUrl;  // Используем короткую ссылку как основную
            fullShareUrl = result.fullShareUrl || result.shareUrl;
            directUrl = result.directUrl || `${window.location.origin}/card-viewer.html?id=${cardData.cardId}`;
            shortCode = result.shortCode;
            
            console.log('🔗 Short URL:', shortUrl);
            console.log('🔗 Full URL:', fullShareUrl);
            
            // Для previewImageUrl берём mediaUrl из card если есть Cloudinary
            if (result.card && result.card.isCloudImage && result.card.mediaUrl) {
                previewImageUrl = result.card.mediaUrl;
                console.log('☁️ Using Cloudinary image for preview:', previewImageUrl);
            } else {
                const titleParam = encodeURIComponent(greetingText.split('\n')[0] || 'Personal Greeting Card');
                const textParam = encodeURIComponent(greetingText.split('\n').slice(1).join(' ').substring(0, 100) || 'Beautiful card from CardGift');
                previewImageUrl = `${window.location.origin}/api/og-image?title=${titleParam}&text=${textParam}&style=${selectedStyle || 'classic'}&id=${cardData.cardId}`;
            }
        } else if (result && result.shareUrl) {
            // Fallback на старый формат
            shareUrl = result.shareUrl;
            shortUrl = result.shareUrl;
            fullShareUrl = result.shareUrl;
            directUrl = result.directUrl || `${window.location.origin}/card-viewer.html?id=${cardData.cardId}`;
            
            if (result.card && result.card.isCloudImage && result.card.mediaUrl) {
                previewImageUrl = result.card.mediaUrl;
            } else {
                const titleParam = encodeURIComponent(greetingText.split('\n')[0] || 'Personal Greeting Card');
                const textParam = encodeURIComponent(greetingText.split('\n').slice(1).join(' ').substring(0, 100) || 'Beautiful card from CardGift');
                previewImageUrl = `${window.location.origin}/api/og-image?title=${titleParam}&text=${textParam}&style=${selectedStyle || 'classic'}&id=${cardData.cardId}`;
            }
        } else {
            // Fallback - создаём URL вручную
            const titleParam = encodeURIComponent(greetingText.split('\n')[0] || 'Personal Greeting Card');
            const textParam = encodeURIComponent(greetingText.split('\n').slice(1).join(' ').substring(0, 100) || 'Beautiful card from CardGift');
            const styleParam = selectedStyle || 'classic';
            
            shareUrl = `${window.location.origin}/api/card/${cardData.cardId}?title=${titleParam}&text=${textParam}&style=${styleParam}`;
            shortUrl = shareUrl;
            fullShareUrl = shareUrl;
            directUrl = `${window.location.origin}/card-viewer.html?id=${cardData.cardId}`;
            previewImageUrl = `${window.location.origin}/api/og-image?title=${titleParam}&text=${textParam}&style=${styleParam}&id=${cardData.cardId}`;
        }
        
        console.log('🔗 Final shareUrl:', shareUrl);
        
        // Сохраняем данные последней созданной карточки для архива
        const lastCardInfo = {
            shortCode: shortCode,
            shortUrl: shortUrl,
            title: greetingText.split('\n')[0] || 'Untitled',
            mediaUrl: previewImageUrl,
            cardId: cardData.cardId,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('last_created_card', JSON.stringify(lastCardInfo));
        console.log('💾 Last card info saved for archive');

        showEnhancedCardResult(cardData, {
            success: true,
            shareUrl: shareUrl,
            shortUrl: shortUrl,
            fullShareUrl: fullShareUrl,
            directUrl: directUrl,
            previewImageUrl: previewImageUrl,
            shortCode: shortCode
        });

        notificationManager.show('✨ Card created successfully!', 'success');
        // НЕ очищаем форму - пользователь может создать еще одну или сохранить в архив
        
        // АВТОСОХРАНЕНИЕ В АРХИВ
        setTimeout(async () => {
            try {
                await saveCurrentToArchive();
                console.log('✅ Auto-saved to archive');
            } catch (error) {
                console.error('⚠️ Auto-save to archive failed:', error);
            }
        }, 1000);

        return result;

    } catch (error) {
        console.error('❌ Card creation error:', error);
        notificationManager.show(`❌ Error: ${error.message}`, 'error');
        throw error;
    } finally {
        if (createBtn) {
            createBtn.classList.remove('loading');
            createBtn.disabled = false;
        }
    }
}

function showContentBlockedModal() {
    const t = generatorTranslations[currentLanguage];
    
    const modal = document.createElement('div');
    modal.className = 'content-blocked-modal';
    modal.innerHTML = `
        <div class="content-blocked-content">
            <div class="content-blocked-icon">🚫</div>
            <div class="content-blocked-title">${t.contentBlocked}</div>
            <div class="content-blocked-message">${t.contentPolicyViolation}</div>
            <button class="content-blocked-button" onclick="this.parentElement.parentElement.remove()">
                ${t.tryAgain}
            </button>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.remove(), 5000);
}

function showEnhancedCardResult(cardMetadata, result) {
    const t = generatorTranslations[currentLanguage];

    const overlay = document.createElement('div');
    overlay.className = 'share-modal';

    const modal = document.createElement('div');
    modal.className = 'share-modal-content';
    
    // Используем короткую ссылку для шаринга
    const displayUrl = result.shortUrl || result.shareUrl;
    const fullUrl = result.fullShareUrl || result.shareUrl;

    modal.innerHTML = `
        <button onclick="this.parentElement.parentElement.remove(); document.body.style.overflow = 'auto';" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: #FFD700; font-size: 24px; cursor: pointer;">×</button>
        
        <h2 style="color: #FFD700; margin-bottom: 20px; text-align: center;">🎉 ${t.shareCardTitle}</h2>
        
        <div class="share-methods">
            <div class="share-method">
                <h4>📱 Поделиться</h4>
                <div class="share-method-buttons">
                    <button class="share-method-btn" onclick="sharePreviewDirectly('${cardMetadata.cardId}', '${displayUrl}')">
                        📱 ${t.downloadImage}
                    </button>
                </div>
                <div class="social-platforms" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px;">
                    <button class="social-platform-btn" onclick="shareToMessenger('telegram', '${displayUrl}')" style="background: #0088cc; color: white; border: none; border-radius: 10px; padding: 12px 8px; cursor: pointer;">📱<br>Telegram</button>
                    <button class="social-platform-btn" onclick="shareToMessenger('whatsapp', '${displayUrl}')" style="background: #25D366; color: white; border: none; border-radius: 10px; padding: 12px 8px; cursor: pointer;">💬<br>WhatsApp</button>
                    <button class="social-platform-btn" onclick="shareToMessenger('email', '${displayUrl}')" style="background: #EA4335; color: white; border: none; border-radius: 10px; padding: 12px 8px; cursor: pointer;">📧<br>Email</button>
                    <button class="social-platform-btn" onclick="shareToMessenger('instagram', '${displayUrl}')" style="background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: white; border: none; border-radius: 10px; padding: 12px 8px; cursor: pointer;">📷<br>Instagram</button>
                    <button class="social-platform-btn" onclick="shareToMessenger('viber', '${displayUrl}')" style="background: #7360F2; color: white; border: none; border-radius: 10px; padding: 12px 8px; cursor: pointer;">💜<br>Viber</button>
                    <button class="social-platform-btn" onclick="shareToMessenger('facebook', '${displayUrl}')" style="background: #1877F2; color: white; border: none; border-radius: 10px; padding: 12px 8px; cursor: pointer;">👤<br>Facebook</button>
                    <button class="social-platform-btn" onclick="shareToMessenger('tiktok', '${displayUrl}')" style="background: #000; color: white; border: none; border-radius: 10px; padding: 12px 8px; cursor: pointer;">🎵<br>TikTok</button>
                    <button class="social-platform-btn" onclick="shareToMessenger('twitter', '${displayUrl}')" style="background: #000; color: white; border: none; border-radius: 10px; padding: 12px 8px; cursor: pointer;">🐦<br>Twitter/X</button>
                </div>
            </div>
            
            <div class="share-method">
                <h4>🔗 Короткая ссылка</h4>
                <div style="background: linear-gradient(135deg, #1a1a2e, #2d2d44); padding: 15px; border-radius: 12px; margin-bottom: 15px; border: 1px solid rgba(255, 215, 0, 0.3);">
                    <div style="color: #FFD700; word-break: break-all; font-size: 16px; font-weight: bold; text-align: center;">${displayUrl}</div>
                    ${result.shortCode ? `<div style="color: rgba(255,255,255,0.5); font-size: 11px; margin-top: 8px; text-align: center;">Код: ${result.shortCode}</div>` : ''}
                </div>
                <div class="share-method-buttons" style="display: flex; gap: 10px;">
                    <button class="share-method-btn" onclick="copyToClipboard('${displayUrl}')" style="flex: 1; background: linear-gradient(45deg, #FFD700, #FFA500); color: #000; font-weight: bold;">
                        📋 Копировать
                    </button>
                    <button class="share-method-btn secondary" onclick="window.open('${displayUrl}', '_blank')" style="flex: 1;">
                        👁️ Открыть
                    </button>
                </div>
            </div>
            
            ${fullUrl !== displayUrl ? `
            <div class="share-method" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                <details style="cursor: pointer;">
                    <summary style="color: rgba(255,255,255,0.6); font-size: 12px; margin-bottom: 10px;">📎 Полная ссылка (если короткая не работает)</summary>
                    <div style="background: #222; padding: 10px; border-radius: 8px; margin-top: 10px;">
                        <div style="color: #AAA; word-break: break-all; font-size: 11px;">${fullUrl}</div>
                    </div>
                    <button class="share-method-btn" onclick="copyToClipboard('${fullUrl}')" style="margin-top: 10px; font-size: 12px; padding: 8px 15px;">
                        📋 Копировать полную
                    </button>
                </details>
            </div>
            ` : ''}
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
            document.body.style.overflow = 'auto';
        }
    });
}

// ===== ШАРИНГ =====
function sharePreviewDirectly(cardId, shareUrl) {
    if (navigator.share) {
        navigator.share({
            title: 'CardGift',
            url: shareUrl
        }).catch(console.error);
    } else {
        copyToClipboard(shareUrl);
        notificationManager.show('📋 Ссылка скопирована!', 'info', 3000);
    }
}

function shareToMessenger(platform, shareUrl) {
    const shareUrls = {
        telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(shareUrl)}`,
        email: `mailto:?body=${encodeURIComponent(shareUrl)}`,
        instagram: `https://www.instagram.com/`,
        viber: `viber://forward?text=${encodeURIComponent(shareUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        tiktok: `https://www.tiktok.com/`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`
    };

    if (['instagram', 'tiktok', 'viber'].includes(platform)) {
        copyToClipboard(shareUrl);
        notificationManager.show('📋 Ссылка скопирована!', 'success', 3000);
    }

    if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank');
    }
}

function shareToSocial(platform, url) {
    const shareUrls = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
        instagram: url,
        tiktok: url
    };

    if (platform === 'instagram' || platform === 'tiktok') {
        copyToClipboard(url);
        notificationManager.show('📋 Ссылка скопирована!', 'info', 3000);
    } else if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank');
    }
}

// ===== АРХИВ =====
async function saveCurrentToArchive() {
    const greetingText = document.getElementById('greetingText')?.value?.trim() || '';
    const videoUrl = document.getElementById('videoUrl')?.value?.trim() || '';
    
    if (!greetingText && !uploadedMedia && !videoUrl) {
        notificationManager.show('Create content first', 'error');
        return;
    }
    
    if (!currentUser || currentUser.level < 1) {
        notificationManager.show('Archive requires account activation', 'warning');
        return;
    }
    
    // Проверка лимита только для уровней < 10 (не для owner/founder)
    if (currentUser.level < 10 && !levelManager.canSaveToArchive(currentUser.level, currentUser.archiveCount || 0)) {
        notificationManager.show('Archive limit reached. Upgrade your level for more storage!', 'warning', 5000);
        return;
    }
    
    try {
        // Получаем данные последней созданной карточки из localStorage
        const lastCardData = localStorage.getItem('last_created_card');
        if (!lastCardData) {
            notificationManager.show('Please create card first', 'warning');
            return;
        }
        
        const cardInfo = JSON.parse(lastCardData);
        
        // Получаем userId
        const gwId = localStorage.getItem('cardgift_gw_id') || 
                     localStorage.getItem('gw_id') || 
                     window.userGwId || 
                     window.displayId;
        
        const cleanGwId = gwId ? gwId.toString().replace('GW', '') : null;
        const gwIdWithPrefix = gwId ? (gwId.toString().startsWith('GW') ? gwId : 'GW' + gwId) : null;
        const userId = gwIdWithPrefix || cleanGwId || window.walletAddress || currentUser?.userId;
        
        if (!userId) {
            notificationManager.show('User ID not found', 'error');
            return;
        }
        
        // МИНИМАЛЬНЫЕ данные с shortCode!
        const cardMetadata = {
            shortCode: cardInfo.shortCode,
            title: cardInfo.title || 'Untitled',
            date: cardInfo.createdAt || new Date().toISOString(),
            preview: cardInfo.mediaUrl || '',
            shortUrl: cardInfo.shortUrl || '',
            userId: userId,
            userLevel: currentUser?.level || 0,
            isArchived: true,
            archivedAt: new Date().toISOString()
        };
        
        console.log('💾 Saving to archive via API for user:', userId);
        console.log('📦 Card metadata size:', JSON.stringify(cardMetadata).length, 'bytes');
        
        // Сохраняем через API
        const response = await fetch('/api/save-to-archive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                cardData: cardMetadata
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API error:', response.status, errorText);
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Saved to archive:', result);
        
        currentUser.archiveCount = (currentUser.archiveCount || 0) + 1;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        levelManager.updateUserInterface(currentUser);
        
        notificationManager.show('💾 Card saved to archive! Open Dashboard to view.', 'success', 5000);
        // НЕ очищаем форму
        
    } catch (error) {
        console.error('❌ Archive save error:', error);
        notificationManager.show('Error saving to archive', 'error');
    }
}

async function prepareCardMetadata() {
    const cardId = generateUniqueCardId();
    const greetingText = sanitizeInput(document.getElementById('greetingText')?.value?.trim() || '');
    const videoUrl = sanitizeInput(document.getElementById('videoUrl')?.value?.trim() || '');

    const metadata = {
        cardId: cardId,
        userId: currentUser?.userId || generateUserId(),
        userLevel: currentUser?.level || 0,
        greeting: greetingText,
        videoUrl: videoUrl,
        style: selectedStyle || 'classic',
        textPosition: selectedTextPosition || 'center',
        ctaEnabled: document.getElementById('ctaToggle')?.checked || false,
        ctaTitle: sanitizeInput(document.getElementById('ctaTitle')?.value || ''),
        ctaButton: sanitizeInput(document.getElementById('ctaButton')?.value || ''),
        ctaUrl: sanitizeInput(document.getElementById('ctaUrl')?.value || ''),
        ctaPosition: selectedCTAPosition || 'bottom-center',
        marqueeEnabled: document.getElementById('marqueeToggle')?.checked || false,
        marqueeText: sanitizeInput(document.getElementById('marqueeTextInput')?.value || ''),
        bannerEnabled: document.getElementById('bannerToggle')?.checked || false,
        bannerHtml: sanitizeInput(document.getElementById('bannerHtml')?.value || ''),
        timers: {
            message: parseInt(document.getElementById('messageTimerInput')?.value) || 0,
            button: parseInt(document.getElementById('buttonTimerInput')?.value) || 3,
            banner: parseInt(document.getElementById('bannerTimerInput')?.value) || 5
        },
        createdAt: new Date().toISOString(),
        language: currentLanguage || 'en'
    };

    if (uploadedMedia?.file) {
        metadata.mediaType = uploadedMedia.type;
        metadata.mediaUrl = await fileToBase64(uploadedMedia.file);
    }

    if (videoUrl) {
        const videoData = videoProcessor.parseVideoUrl(videoUrl);
        if (videoData.isValid) {
            metadata.videoData = videoData;
            metadata.mediaType = 'video';
            metadata.embedUrl = videoData.embedUrl;
        }
    }

    return metadata;
}

function clearForm() {
    const greetingInput = document.getElementById('greetingText');
    if (greetingInput) greetingInput.value = '';
    
    const videoInput = document.getElementById('videoUrl');
    if (videoInput) {
        videoInput.value = '';
        videoInput.style.borderColor = '#444';
    }
    
    uploadedMedia = null;
    
    const preview = document.getElementById('mediaPreview');
    if (preview) {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
    
    checkCreateButtonState();
}

// ===== НАВИГАЦИЯ =====
function goToDashboard() {
    window.location.href = `/dashboard.html?lang=${currentLanguage}`;
}

function goToArchive() {
    if (currentUser?.level >= 1) {
        window.location.href = `/dashboard.html?section=archive&lang=${currentLanguage}`;
    } else {
        notificationManager.show('Archive requires account activation', 'warning');
    }
}

function goToActivation() {
    window.location.href = `/dashboard.html?section=wallet&lang=${currentLanguage}`;
}

// ===== ФУНКЦИИ ОТОБРАЖЕНИЯ ЭЛЕМЕНТОВ =====
function displayCTAButton(ctaTitle, ctaButton, ctaUrl, position) {
    const existingCTA = document.querySelector('.cta-container');
    if (existingCTA) existingCTA.remove();

    const ctaEl = document.createElement('div');
    ctaEl.className = 'cta-container';
    ctaEl.style.cssText = 'position: absolute; z-index: 20; text-align: center; color: white; font-weight: bold;';

    if (position.includes('Left')) {
        ctaEl.style.left = '20px';
    } else if (position.includes('Right')) {
        ctaEl.style.right = '20px';
    } else {
        ctaEl.style.left = '50%';
        ctaEl.style.transform = 'translateX(-50%)';
    }

    if (position.includes('top')) {
        ctaEl.style.top = '20px';
    } else if (position.includes('bottom')) {
        ctaEl.style.bottom = '20px';
    } else {
        ctaEl.style.top = '50%';
        ctaEl.style.transform += ' translateY(-50%)';
    }

    const titleDiv = document.createElement('div');
    titleDiv.style.marginBottom = '5px';
    titleDiv.textContent = ctaTitle;

    const button = document.createElement('button');
    button.style.cssText = 'background: linear-gradient(45deg, #FFD700, #FFA500); color: #000; border: none; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-weight: bold;';
    button.textContent = ctaButton;
    button.onclick = () => window.open(ctaUrl || 'registration.html', '_blank');

    ctaEl.appendChild(titleDiv);
    ctaEl.appendChild(button);

    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer) previewContainer.appendChild(ctaEl);
}

function displayMarquee(marqueeText, marqueeUrl) {
    const marqueeEl = document.createElement('div');
    marqueeEl.className = 'marquee-container';

    const marqueeTextDiv = document.createElement('div');
    marqueeTextDiv.className = 'marquee-text';
    marqueeTextDiv.textContent = marqueeText;
    marqueeEl.appendChild(marqueeTextDiv);

    if (marqueeUrl && marqueeUrl.trim()) {
        marqueeEl.style.cursor = 'pointer';
        marqueeEl.onclick = () => {
            if (marqueeUrl.startsWith('http')) window.open(marqueeUrl, '_blank');
        };
    }

    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer) previewContainer.appendChild(marqueeEl);
}

function displayBanner(bannerHtml, bannerUrl) {
    const bannerEl = document.createElement('div');
    bannerEl.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; z-index: 25; text-align: center; padding: 10px; background: rgba(255, 0, 0, 0.9); color: white; font-weight: bold;';

    if (bannerHtml) {
        bannerEl.innerHTML = sanitizeInput(bannerHtml);
    } else {
        bannerEl.innerHTML = '<div>Banner</div>';
    }

    if (bannerUrl) {
        bannerEl.style.cursor = 'pointer';
        bannerEl.onclick = () => window.open(bannerUrl, '_blank');
    }

    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer) previewContainer.appendChild(bannerEl);
}

function loadSavedSettings() {
    const settingsInputs = document.querySelectorAll('input, select, textarea');
    settingsInputs.forEach(input => {
        if (input.id && !['greetingText', 'videoUrl', 'mediaUpload'].includes(input.id)) {
            const settingKey = `generator_setting_${input.id}`;
            const savedValue = localStorage.getItem(settingKey);
            
            if (savedValue !== null) {
                try {
                    const parsedValue = JSON.parse(savedValue);
                    if (input.type === 'checkbox') {
                        input.checked = parsedValue;
                    } else {
                        input.value = parsedValue;
                    }
                    
                    if (input.id === 'ctaToggle') toggleCTA();
                    if (input.id === 'marqueeToggle') toggleMarquee();
                    if (input.id === 'bannerToggle') toggleBanner();
                } catch (error) {
                    console.warn('Error loading setting:', settingKey);
                }
            }
        }
    });
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
function setupEventListeners() {
    const greetingTextarea = document.getElementById('greetingText');
    if (greetingTextarea) {
        greetingTextarea.addEventListener('input', checkCreateButtonState);
    }

    const videoUrlField = document.getElementById('videoUrl');
    if (videoUrlField) {
        videoUrlField.addEventListener('input', function() {
            checkCreateButtonState();
            
            if (this.value.trim() && uploadedMedia) removeMedia();
            
            const url = this.value.trim();
            if (url) {
                const videoData = videoProcessor.parseVideoUrl(url);
                this.style.borderColor = videoData.isValid ? '#4CAF50' : '#f44336';
            } else {
                this.style.borderColor = '#444';
            }
        });
    }

    const instructionsModal = document.getElementById('instructionsModal');
    if (instructionsModal) {
        instructionsModal.addEventListener('click', function(e) {
            if (e.target === this) hideInstructions();
        });
    }

    const previewModal = document.getElementById('previewModal');
    if (previewModal) {
        previewModal.addEventListener('click', function(e) {
            if (e.target === this) closePreview();
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal, .instructions-modal, .share-modal').forEach(modal => {
                modal.style.display = 'none';
            });
            const emojiPicker = document.getElementById('emojiPicker');
            if (emojiPicker) emojiPicker.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'Enter' && !document.getElementById('createCardBtn').disabled) {
                e.preventDefault();
                createCard();
            }
            if (e.key === 'p') {
                e.preventDefault();
                showPreview();
            }
        }
    });
}

// ===== WEB3 СОБЫТИЯ =====
if (window.ethereum) {
    window.ethereum.on('chainChanged', (chainId) => {
        const currentChainId = parseInt(chainId, 16);
        if (currentChainId !== 204) {
            notificationManager.show('⚠️ Switch to opBNB', 'warning', 5000);
        } else {
            notificationManager.show('✅ Connected to opBNB!', 'success');
        }
        updateNetworkStatus();
    });
    
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            notificationManager.show('Wallet disconnected', 'info');
            setTimeout(() => location.reload(), 2000);
        } else {
            notificationManager.show('Account changed', 'info');
            setTimeout(() => location.reload(), 1500);
        }
    });
}

// ===== ЭКСПОРТ ГЛОБАЛЬНЫХ ФУНКЦИЙ =====
window.switchLanguage = switchLanguage;
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.handleMediaUpload = handleMediaUpload;
window.toggleEmojiPicker = toggleEmojiPicker;
window.loadEmojis = loadEmojis;
window.setTextPosition = setTextPosition;
window.selectStyle = selectStyle;
window.useTemplate = useTemplate;
window.showInstructions = showInstructions;
window.hideInstructions = hideInstructions;
window.showPreview = showPreview;
window.closePreview = closePreview;
window.createCard = createCard;
window.toggleCTA = toggleCTA;
window.setCTAPosition = setCTAPosition;
window.toggleMarquee = toggleMarquee;
window.toggleBanner = toggleBanner;
window.saveCurrentToArchive = saveCurrentToArchive;
window.goToDashboard = goToDashboard;
window.goToArchive = goToArchive;
window.goToActivation = goToActivation;
window.activateAccount = activateAccount;
window.showActivationModal = showActivationModal;
window.closeActivationModal = closeActivationModal;
window.activateLevel = activateLevel;
window.openInSafePal = openInSafePal;
window.showOpenInWalletBanner = showOpenInWalletBanner;
window.sharePreviewDirectly = sharePreviewDirectly;
window.shareToMessenger = shareToMessenger;
window.shareToSocial = shareToSocial;
window.copyToClipboard = copyToClipboard;

// Функции для обложки видео
window.onVideoUrlChange = onVideoUrlChange;
window.handleThumbnailUpload = handleThumbnailUpload;
window.removeThumbnail = removeThumbnail;

// ============ TEMPLATES (UNIFIED) ============

/**
 * Открыть готовые шаблоны (все помеченные открытки)
 */
async function openTemplates() {
    const modal = document.getElementById('templatesModal');
    if (!modal) return;
    
    modal.classList.add('show');
    
    // Получить ВСЕ открытки из localStorage
    const archiveCards = getArchiveCards();
    console.log('📂 Total archive cards:', archiveCards.length);
    
    // Фильтр: берём ВСЕ помеченные (isTemplate ИЛИ isCorporate)
    const templates = archiveCards.filter(card => {
        return (card.isTemplate || card.is_template || card.isCorporate || card.is_corporate);
    });
    console.log('📋 Templates found:', templates.length);
    
    displayTemplateCards('templatesList', templates);
}

/**
 * Закрыть шаблоны
 */
function closeTemplates() {
    const modal = document.getElementById('templatesModal');
    if (modal) modal.classList.remove('show');
}

/**
 * Получить открытки из localStorage (архив dashboard)
 */
function getArchiveCards() {
    try {
        const savedCards = localStorage.getItem('cardgift_cards');
        if (!savedCards) return [];
        
        const cards = JSON.parse(savedCards);
        return Array.isArray(cards) ? cards : [];
    } catch (error) {
        console.error('Error loading archive cards:', error);
        return [];
    }
}

/**
 * Отобразить открытки в модальном окне
 */
function displayTemplateCards(containerId, cards) {
    const listEl = document.getElementById(containerId);
    if (!listEl) return;
    
    if (!cards || cards.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📂</div>
                <div class="empty-state-text">No templates yet</div>
                <div class="empty-state-hint">Mark your cards as templates in Dashboard → Archive</div>
            </div>
        `;
        return;
    }
    
    // Отобразить карточки с бейджами типа
    listEl.innerHTML = `
        <div class="template-grid">
            ${cards.map(card => {
                const imageUrl = card.mediaUrl || card.imageUrl || card.thumbnailUrl || card.preview || card.image_url;
                const title = card.title || card.greetingText?.substring(0, 30) || 'Untitled';
                const created = card.created_at || card.timestamp || Date.now();
                
                // Определяем тип шаблона
                const isCorporate = card.isCorporate || card.is_corporate;
                const isTemplate = card.isTemplate || card.is_template;
                
                let badge = '';
                if (isCorporate) {
                    badge = '<div style="position: absolute; top: 8px; right: 8px; background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; padding: 4px 8px; border-radius: 12px; font-size: 9px; font-weight: bold;">🏢 CORPORATE</div>';
                } else if (isTemplate) {
                    badge = '<div style="position: absolute; top: 8px; right: 8px; background: #4CAF50; color: white; padding: 4px 8px; border-radius: 12px; font-size: 9px; font-weight: bold;">📋 TEMPLATE</div>';
                }
                
                return `
                    <div class="template-card" onclick="loadTemplateCard('${card.shortCode || card.short_code || card.code || card.id}')">
                        <div style="position: relative;">
                            ${imageUrl ? 
                                `<img src="${imageUrl}" alt="${title}" class="template-card-image">` :
                                `<div class="template-card-image">🎁</div>`
                            }
                            ${badge}
                        </div>
                        <div class="template-card-info">
                            <div class="template-card-title">${title}</div>
                            <div class="template-card-meta">
                                ${formatDate(created)}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Загрузить шаблон открытки в генератор
 */
async function loadTemplateCard(cardId) {
    try {
        console.log('🔍 Loading template:', cardId);
        
        // Получить данные карточки
        let card = null;
        
        // Сначала ищем в localStorage
        const archiveCards = getArchiveCards();
        console.log('📂 Archive cards:', archiveCards.length);
        
        card = archiveCards.find(c => 
            c.shortCode === cardId || 
            c.short_code === cardId || 
            c.code === cardId || 
            c.id === cardId
        );
        
        console.log('🎴 Found card:', card ? 'YES' : 'NO');
        if (card) {
            console.log('📋 Card data:', {
                title: card.title,
                greetingText: card.greetingText?.substring(0, 50),
                greeting: card.greeting?.substring(0, 50),
                hasImage: !!(card.mediaUrl || card.imageUrl || card.preview || card.image_url),
                hasVideo: !!card.videoUrl,
                allFields: Object.keys(card)
            });
        }
        
        // Если не нашли - пробуем загрузить через API
        if (!card) {
            console.log('📡 Trying API...');
            const response = await fetch(`/api/get-card?sc=${cardId}`);
            if (response.ok) {
                const result = await response.json();
                card = result.data;
                console.log('✅ Loaded from API');
            }
        }
        
        if (!card) {
            throw new Error('Card not found');
        }
        
        // === ЗАГРУЗКА ИЗОБРАЖЕНИЯ ===
        const imageUrl = card.mediaUrl || card.imageUrl || card.preview || card.image_url;
        console.log('🖼️ Image URL:', imageUrl?.substring(0, 50));
        
        if (imageUrl) {
            const mediaPreview = document.getElementById('mediaPreview');
            
            if (mediaPreview) {
                if (card.mediaType === 'video' || card.videoUrl) {
                    console.log('📹 Loading video...');
                    mediaPreview.innerHTML = `
                        <div style="padding: 15px; background: rgba(255,215,0,0.1); border: 2px solid #FFD700; border-radius: 10px; margin: 10px 0;">
                            <div style="color: #FFD700; font-weight: bold; margin-bottom: 5px;">📹 Видео загружено</div>
                            <div style="color: #CCC; font-size: 12px;">${card.videoUrl || card.mediaUrl}</div>
                        </div>
                    `;
                    const videoUrlField = document.getElementById('videoUrl');
                    if (videoUrlField) videoUrlField.value = card.videoUrl || card.mediaUrl;
                } else {
                    console.log('🖼️ Loading image...');
                    mediaPreview.innerHTML = `
                        <div style="position: relative;">
                            <img src="${imageUrl}" alt="Template" style="max-width:100%;max-height:200px;border-radius:8px;border:2px solid #4CAF50;">
                            <div style="position: absolute; top: 8px; right: 8px; background: #4CAF50; color: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;">
                                ✅ ЗАГРУЖЕНО
                            </div>
                        </div>
                    `;
                    uploadedMedia = { data: imageUrl, type: 'image' };
                }
            }
        }
        
        // === ЗАГРУЗКА ТЕКСТА ===
        const greetingText = card.greetingText || card.greeting_text || card.greeting || card.text;
        console.log('✍️ Greeting text:', greetingText?.substring(0, 30));
        
        if (greetingText) {
            const greetingField = document.getElementById('greetingText');
            if (greetingField) {
                greetingField.value = greetingText;
                // Подсветка поля
                greetingField.style.borderColor = '#4CAF50';
                greetingField.style.boxShadow = '0 0 15px rgba(76, 175, 80, 0.5)';
                setTimeout(() => {
                    greetingField.style.borderColor = '#FFD700';
                    greetingField.style.boxShadow = 'none';
                }, 2000);
                console.log('✅ Text loaded to field');
            }
        } else {
            console.warn('⚠️ No greeting text found in card data');
        }
        
        // === ЗАГРУЗКА НАЗВАНИЯ ===
        if (card.title) {
            const titleField = document.getElementById('cardTitle');
            if (titleField) {
                titleField.value = card.title;
                console.log('✅ Title loaded:', card.title);
            }
        }
        
        // === ЗАГРУЗКА СТИЛЯ ===
        if (card.selectedStyle) {
            console.log('🎨 Setting style:', card.selectedStyle);
            if (typeof selectStyle === 'function') {
                selectStyle(card.selectedStyle);
            }
        }
        
        // === ПРОКРУТКА К ФОРМЕ ===
        setTimeout(() => {
            const textSection = document.getElementById('text');
            if (textSection) {
                textSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                console.log('📜 Scrolled to form');
            }
        }, 300);
        
        // Закрыть модальное окно
        closeTemplates();
        
        // Показать уведомление
        const isCorporate = card.isCorporate || card.is_corporate;
        const message = isCorporate ? 
            '✅ Корпоративный шаблон загружен! Отредактируйте и сохраните со СВОЕЙ ссылкой 🏢' :
            '✅ Шаблон загружен! Отредактируйте и сохраните со СВОЕЙ ссылкой 📋';
        
        if (typeof notificationManager !== 'undefined') {
            notificationManager.show(message, 'success', 5000);
        } else if (typeof showToast === 'function') {
            showToast(message, 'success');
        }
        
        console.log('✅ Template loaded successfully!');
        
    } catch (error) {
        console.error('❌ Error loading template card:', error);
        
        if (typeof notificationManager !== 'undefined') {
            notificationManager.show('Ошибка загрузки шаблона', 'error', 3000);
        } else if (typeof showToast === 'function') {
            showToast('❌ Ошибка загрузки шаблона', 'error');
        }
    }
}

/**
 * Форматирование даты
 */
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    
    return date.toLocaleDateString();
}

// Экспорт функций
window.openTemplates = openTemplates;
window.closeTemplates = closeTemplates;
window.loadTemplateCard = loadTemplateCard;


// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE BUTTONS - МОДАЛКИ НА ГЕНЕРАТОРЕ (НЕ РЕДИРЕКТ!)
// v5.0 - Шаблоны открываются прямо здесь
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Открыть модалку шаблонов от лидера
 */
async function openLeaderTemplates() {
    console.log('📋 Opening LEADER templates modal');
    await showTemplatesModal('leader');
}

/**
 * Открыть модалку корпоративных шаблонов
 */
async function openCorporateTemplates() {
    console.log('🏢 Opening CORPORATE templates modal');
    await showTemplatesModal('corporate');
}

/**
 * Показать модалку с шаблонами
 */
async function showTemplatesModal(type) {
    // Создаём модалку если её нет
    let modal = document.getElementById('generatorTemplatesModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'generatorTemplatesModal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:10000;overflow-y:auto;padding:20px;';
        document.body.appendChild(modal);
    }
    
    const isLeader = type === 'leader';
    const title = isLeader ? '👔 Шаблоны от лидера' : '🏢 Корпоративные шаблоны';
    const color = isLeader ? '#FFD700' : '#4CAF50';
    const instruction = isLeader 
        ? 'Выберите готовую открытку от вашего лидера. После выбора она станет ВАШЕЙ — с вашим ID!'
        : 'Выберите корпоративную открытку клуба. После выбора она станет ВАШЕЙ — с вашим ID!';
    
    modal.innerHTML = `
        <div style="max-width:900px;margin:0 auto;background:linear-gradient(135deg,#1a1a2e,#2d2d44);border-radius:20px;padding:25px;border:2px solid ${color};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h2 style="color:${color};margin:0;">${title}</h2>
                <button onclick="closeGeneratorTemplatesModal()" style="background:none;border:none;color:#fff;font-size:32px;cursor:pointer;line-height:1;">×</button>
            </div>
            
            <div style="background:rgba(255,255,255,0.05);padding:15px;border-radius:12px;margin-bottom:20px;border-left:4px solid ${color};">
                <p style="color:#ccc;margin:0;font-size:14px;">📋 ${instruction}</p>
            </div>
            
            <div id="templatesGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;min-height:200px;">
                <div style="grid-column:1/-1;color:#888;text-align:center;padding:60px;">
                    <div style="font-size:36px;margin-bottom:15px;">⏳</div>
                    <div>Загрузка шаблонов...</div>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Закрытие по клику на фон
    modal.onclick = function(e) {
        if (e.target === modal) closeGeneratorTemplatesModal();
    };
    
    // Загружаем шаблоны
    await loadTemplatesForModal(type);
}

/**
 * Загрузить шаблоны для модалки
 */
async function loadTemplatesForModal(type) {
    const grid = document.getElementById('templatesGrid');
    if (!grid) return;
    
    try {
        let templates = [];
        const isLeader = type === 'leader';
        
        // Способ 1: Через API
        try {
            const gwId = localStorage.getItem('cardgift_gw_id') || localStorage.getItem('gw_id') || '';
            const cleanGwId = gwId.replace('GW', '');
            const url = `/api/get-templates?type=${type}&gw_id=${cleanGwId}`;
            console.log('📡 Loading templates from API:', url);
            
            const response = await fetch(url);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.templates && result.templates.length > 0) {
                    templates = result.templates;
                    console.log('✅ Loaded', templates.length, 'templates via API');
                }
            }
        } catch (apiErr) {
            console.warn('⚠️ API error:', apiErr.message);
        }
        
        // Способ 2: Напрямую из Supabase
        if (templates.length === 0 && window.SupabaseClient && SupabaseClient.client) {
            try {
                const templateType = isLeader ? 'leader' : 'corporate';
                const { data, error } = await SupabaseClient.client
                    .from('card_templates')
                    .select('*')
                    .eq('template_type', templateType)
                    .order('created_at', { ascending: false })
                    .limit(50);
                
                if (!error && data && data.length > 0) {
                    templates = data.map(t => ({
                        code: t.code || t.short_code,
                        title: t.name || 'Без названия',
                        image_url: t.image_url || t.preview_url,
                        card_data: t.card_data
                    }));
                    console.log('✅ Loaded', templates.length, 'templates from Supabase card_templates');
                }
            } catch (dbErr) {
                console.warn('⚠️ Supabase card_templates error:', dbErr.message);
            }
        }
        
        // Способ 3: Из таблицы cards (помеченные как шаблоны)
        if (templates.length === 0 && window.SupabaseClient && SupabaseClient.client) {
            try {
                let query = SupabaseClient.client.from('cards').select('*');
                
                if (isLeader) {
                    // Шаблоны от лидера - ищем по referrer или owner с флагом is_template
                    query = query.or('card_data->>isTemplate.eq.true,card_data->>is_template.eq.true');
                } else {
                    // Корпоративные
                    query = query.or('card_data->>isCorporate.eq.true,card_data->>is_corporate.eq.true');
                }
                
                const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
                
                if (!error && data && data.length > 0) {
                    templates = data.map(t => ({
                        code: t.short_code,
                        title: t.card_data?.title || t.card_data?.greetingText?.substring(0, 30) || 'Без названия',
                        image_url: t.card_data?.image_url || t.card_data?.mediaUrl,
                        card_data: t.card_data
                    }));
                    console.log('✅ Loaded', templates.length, 'templates from cards table');
                }
            } catch (dbErr) {
                console.warn('⚠️ Supabase cards error:', dbErr.message);
            }
        }
        
        // Способ 4: Из localStorage
        if (templates.length === 0) {
            const archiveCards = JSON.parse(localStorage.getItem('cardgift_cards') || '[]');
            templates = archiveCards.filter(c => {
                if (isLeader) return c.isTemplate || c.is_template;
                return c.isCorporate || c.is_corporate;
            }).map(c => ({
                code: c.shortCode || c.short_code,
                title: c.title || c.greetingText?.substring(0, 30) || 'Без названия',
                image_url: c.mediaUrl || c.preview || c.imageUrl,
                card_data: c
            }));
            console.log('📦 Loaded', templates.length, 'templates from localStorage');
        }
        
        // Отображаем
        if (templates.length === 0) {
            const emptyMsg = isLeader 
                ? 'Ваш лидер ещё не назначил шаблоны для вас'
                : 'Корпоративные шаблоны ещё не добавлены администратором';
            
            grid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:60px;color:#888;">
                    <div style="font-size:64px;margin-bottom:20px;">📭</div>
                    <div style="font-size:18px;margin-bottom:10px;">Шаблонов пока нет</div>
                    <div style="font-size:13px;color:#666;">${emptyMsg}</div>
                </div>
            `;
            return;
        }
        
        const color = isLeader ? '#FFD700' : '#4CAF50';
        
        grid.innerHTML = templates.map(t => {
            const imageUrl = t.image_url || '';
            const title = t.title || 'Без названия';
            const code = t.code || '';
            
            return `
                <div class="template-card-item" onclick="useTemplateFromModal('${code}')" 
                     style="cursor:pointer;background:rgba(255,255,255,0.05);border-radius:16px;overflow:hidden;transition:all 0.3s;border:2px solid transparent;"
                     onmouseover="this.style.transform='translateY(-5px)';this.style.borderColor='${color}';this.style.boxShadow='0 10px 30px rgba(0,0,0,0.5)';"
                     onmouseout="this.style.transform='translateY(0)';this.style.borderColor='transparent';this.style.boxShadow='none';">
                    <div style="height:180px;background:${imageUrl ? `url('${imageUrl}') center/cover no-repeat` : 'linear-gradient(135deg, #333, #222)'};">
                        ${!imageUrl ? '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#555;font-size:48px;">🖼️</div>' : ''}
                    </div>
                    <div style="padding:15px;">
                        <div style="color:#fff;font-weight:bold;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:12px;">${title}</div>
                        <button style="width:100%;padding:12px;background:linear-gradient(45deg,${color},${isLeader ? '#FFA500' : '#2E7D32'});border:none;border-radius:10px;color:${isLeader ? '#000' : '#fff'};font-weight:bold;font-size:14px;cursor:pointer;transition:opacity 0.2s;"
                                onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                            ✨ Выбрать
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('❌ Error loading templates:', error);
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;color:#f44;padding:40px;">
                <div style="font-size:48px;margin-bottom:15px;">❌</div>
                <div>Ошибка загрузки: ${error.message}</div>
            </div>
        `;
    }
}

/**
 * Закрыть модалку шаблонов
 */
function closeGeneratorTemplatesModal() {
    const modal = document.getElementById('generatorTemplatesModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

/**
 * Применить шаблон из модалки и СРАЗУ создать открытку
 */
async function useTemplateFromModal(code) {
    console.log('🎯 Using template:', code);
    closeGeneratorTemplatesModal();
    
    // Показываем загрузку
    if (typeof notificationManager !== 'undefined') {
        notificationManager.show('⏳ Загружаем шаблон...', 'info', 2000);
    }
    
    try {
        let template = null;
        
        // Способ 1: Через API get-card
        try {
            const response = await fetch(`/api/get-card?sc=${code}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    template = result.data;
                    console.log('✅ Template loaded via API');
                }
            }
        } catch (e) {
            console.warn('API get-card error:', e.message);
        }
        
        // Способ 2: Из Supabase card_templates
        if (!template && window.SupabaseClient && SupabaseClient.client) {
            try {
                const { data } = await SupabaseClient.client
                    .from('card_templates')
                    .select('*')
                    .eq('code', code)
                    .single();
                    
                if (data) {
                    template = data.card_data || {};
                    template.image_url = data.image_url || template.image_url;
                    template.greetingText = template.message || template.greetingText;
                    console.log('✅ Template loaded from card_templates');
                }
            } catch (e) {}
        }
        
        // Способ 3: Из Supabase cards
        if (!template && window.SupabaseClient && SupabaseClient.client) {
            try {
                const { data } = await SupabaseClient.client
                    .from('cards')
                    .select('*')
                    .eq('short_code', code)
                    .single();
                    
                if (data) {
                    template = data.card_data || {};
                    template.image_url = template.image_url || data.card_data?.image_url;
                    console.log('✅ Template loaded from cards');
                }
            } catch (e) {}
        }
        
        // Способ 4: Из localStorage
        if (!template) {
            const cards = JSON.parse(localStorage.getItem('cardgift_cards') || '[]');
            const found = cards.find(c => c.shortCode === code || c.short_code === code);
            if (found) {
                template = found;
                console.log('✅ Template loaded from localStorage');
            }
        }
        
        if (!template) {
            throw new Error('Шаблон не найден');
        }
        
        // === ЗАГРУЖАЕМ ДАННЫЕ В ФОРМУ ===
        
        // Изображение
        const imageUrl = template.image_url || template.mediaUrl || template.preview || template.cloudinaryUrl;
        if (imageUrl) {
            const mediaPreview = document.getElementById('mediaPreview');
            if (mediaPreview) {
                mediaPreview.innerHTML = `
                    <div style="position:relative;">
                        <img src="${imageUrl}" alt="Template" style="max-width:100%;max-height:200px;border-radius:8px;border:3px solid #4CAF50;">
                        <div style="position:absolute;top:8px;right:8px;background:#4CAF50;color:#fff;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:bold;">
                            ✓ ШАБЛОН
                        </div>
                    </div>
                `;
                uploadedMedia = { data: imageUrl, type: 'image' };
            }
        }
        
        // Текст
        const text = template.greetingText || template.greeting || template.message || template.text || '';
        if (text) {
            const field = document.getElementById('greetingText');
            if (field) {
                field.value = text;
                field.style.borderColor = '#4CAF50';
                setTimeout(() => { field.style.borderColor = ''; }, 2000);
            }
        }
        
        // Стиль
        if (template.style || template.selectedStyle) {
            if (typeof selectStyle === 'function') {
                selectStyle(template.style || template.selectedStyle);
            }
        }
        
        // Прокрутка к форме
        setTimeout(() => {
            const textSection = document.getElementById('text') || document.getElementById('greetingText');
            if (textSection) {
                textSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
        
        notificationManager.show('✅ Шаблон готов к использованию!', 'success', 3000);
        
        // === НОВАЯ ЛОГИКА: НЕ создаём копию, используем оригинал с ref ===
        // Получаем ID пользователя для реферальной ссылки
        let userId = window.currentCgId || 
                     localStorage.getItem('cardgift_cg_id') || 
                     localStorage.getItem('cardgift_gw_id');
        
        if (!userId) {
            // Новичок - нужно сначала получить ID
            console.log('👤 New user - need to get ID first');
            notificationManager.show('⏳ Получаем ваш ID...', 'info', 2000);
            
            // Генерируем временный ID если нет
            userId = 'CG_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            localStorage.setItem('cardgift_cg_id', userId);
        }
        
        console.log('👤 User ID for ref:', userId);
        
        // Формируем ссылку с реферальным параметром
        const originalCode = code;
        const refLink = `${window.location.origin}/c/${originalCode}?ref=${userId}`;
        const shortLink = `${window.location.origin}/c/${originalCode}`;
        
        console.log('🔗 Reference link:', refLink);
        
        // Сохраняем в localStorage как "используемый шаблон"
        const usedTemplates = JSON.parse(localStorage.getItem('cardgift_used_templates') || '[]');
        const templateEntry = {
            originalCode: originalCode,
            userId: userId,
            refLink: refLink,
            title: template.greetingText || template.title || 'Шаблон',
            imageUrl: template.image_url || template.mediaUrl || template.preview,
            usedAt: new Date().toISOString()
        };
        
        // Проверяем не добавлен ли уже
        if (!usedTemplates.find(t => t.originalCode === originalCode)) {
            usedTemplates.push(templateEntry);
            localStorage.setItem('cardgift_used_templates', JSON.stringify(usedTemplates));
            console.log('💾 Template saved to used templates');
        }
        
        // Показываем модалку с готовой ссылкой
        showTemplateReadyModal(refLink, shortLink, template);
        
    } catch (error) {
        console.error('❌ Error using template:', error);
        if (typeof notificationManager !== 'undefined') {
            notificationManager.show('❌ Ошибка: ' + error.message, 'error', 3000);
        }
    }
}

/**
 * Показать модалку с готовой ссылкой на шаблон
 */
function showTemplateReadyModal(refLink, shortLink, template) {
    const imageUrl = template.image_url || template.mediaUrl || template.preview || '';
    const title = template.greetingText?.split('\n')[0] || template.title || 'Ваша открытка готова!';
    
    const modal = document.createElement('div');
    modal.id = 'templateReadyModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;';
    
    modal.innerHTML = `
        <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:20px;max-width:500px;width:100%;padding:30px;text-align:center;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="position:absolute;top:15px;right:15px;background:rgba(255,255,255,0.1);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:20px;">×</button>
            
            <div style="font-size:60px;margin-bottom:15px;">🎉</div>
            <h2 style="color:#FFD700;margin-bottom:20px;font-size:24px;">Открытка готова!</h2>
            
            ${imageUrl ? `<img src="${imageUrl}" style="width:100%;max-height:200px;object-fit:cover;border-radius:12px;margin-bottom:20px;">` : ''}
            
            <p style="color:#ccc;margin-bottom:20px;font-size:14px;">
                Эта ссылка содержит ваш реферальный ID.<br>
                Все кто перейдут — станут вашими рефералами!
            </p>
            
            <div style="background:rgba(255,215,0,0.1);border:2px solid #FFD700;border-radius:12px;padding:15px;margin-bottom:20px;">
                <input type="text" value="${refLink}" readonly 
                       id="templateRefLinkInput"
                       style="width:100%;background:transparent;border:none;color:#FFD700;font-size:14px;text-align:center;outline:none;">
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
                <button onclick="copyTemplateLink()" 
                        style="background:linear-gradient(135deg,#FFD700,#FFA500);color:#000;border:none;padding:15px;border-radius:10px;font-weight:bold;cursor:pointer;font-size:16px;">
                    📋 Копировать
                </button>
                <button onclick="shareTemplateLink('${refLink}')" 
                        style="background:linear-gradient(135deg,#4CAF50,#2E7D32);color:#fff;border:none;padding:15px;border-radius:10px;font-weight:bold;cursor:pointer;font-size:16px;">
                    📤 Поделиться
                </button>
            </div>
            
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                <a href="https://t.me/share/url?url=${encodeURIComponent(refLink)}" target="_blank"
                   style="background:#0088cc;color:#fff;padding:12px;border-radius:8px;text-decoration:none;font-size:20px;">
                    📱
                </a>
                <a href="https://wa.me/?text=${encodeURIComponent('Посмотри открытку! ' + refLink)}" target="_blank"
                   style="background:#25D366;color:#fff;padding:12px;border-radius:8px;text-decoration:none;font-size:20px;">
                    💬
                </a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}" target="_blank"
                   style="background:#1877F2;color:#fff;padding:12px;border-radius:8px;text-decoration:none;font-size:20px;">
                    📘
                </a>
                <a href="viber://forward?text=${encodeURIComponent('Посмотри открытку! ' + refLink)}" target="_blank"
                   style="background:#7360F2;color:#fff;padding:12px;border-radius:8px;text-decoration:none;font-size:20px;">
                    📞
                </a>
            </div>
            
            <p style="color:#666;font-size:11px;margin-top:15px;">
                💡 Карточка не копируется — вы используете оригинал со своей ссылкой
            </p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Закрытие по клику на оверлей
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

/**
 * Копировать ссылку на шаблон
 */
function copyTemplateLink() {
    const input = document.getElementById('templateRefLinkInput');
    if (input) {
        input.select();
        document.execCommand('copy');
        notificationManager.show('✅ Ссылка скопирована!', 'success', 2000);
    }
}

/**
 * Поделиться ссылкой на шаблон
 */
async function shareTemplateLink(url) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: '🎁 Открытка для тебя!',
                text: 'Посмотри эту открытку!',
                url: url
            });
        } catch (e) {
            console.log('Share cancelled');
        }
    } else {
        copyTemplateLink();
    }
}

// Экспорт новых функций
window.copyTemplateLink = copyTemplateLink;
window.shareTemplateLink = shareTemplateLink;

// Экспорт функций
window.openLeaderTemplates = openLeaderTemplates;
window.openCorporateTemplates = openCorporateTemplates;
window.showTemplatesModal = showTemplatesModal;
window.closeGeneratorTemplatesModal = closeGeneratorTemplatesModal;
window.useTemplateFromModal = useTemplateFromModal;

console.log('🎁 CardGift Generator v4.7 loaded (templates modal ON generator)');
console.log('✅ Template buttons now open modals instead of redirecting!');
