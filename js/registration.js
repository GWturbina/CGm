/* =====================================================
   CARDGIFT - REGISTRATION v4.4
   
   Новая архитектура:
   - temp_id (CG_TEMP_xxx) — временный ID до покупки пакета GW
   - gw_id (GW1234567) — постоянный ID после покупки пакета
   - Вся структура рефералов через GlobalWay
   
   v4.4:
   - Конфигурация загружается из CONFIG (config.js)
   - Спонсор получается из КОНТРАКТА GlobalWay (не из Supabase)
   - Защита от спама (30 сек между регистрациями)
   - Дедупликация контактов на всех уровнях
   - referral_temp_id / referral_gw_id в контактах
   ===================================================== */

// ═══════════════════════════════════════════════════════════
// КОНФИГУРАЦИЯ (из config.js с fallback)
// ═══════════════════════════════════════════════════════════

// ROOT GW ID — главный аккаунт системы
const ROOT_GW_ID = window.CONFIG?.ROOT_GW_ID || 'GW9729645';

// Соавторы для рандомизации новых пользователей без реферала
// Берём из CONFIG (только соавторы, не OWNER)
const FOUNDERS = window.CONFIG?.COAUTHORS?.map(c => ({ gwId: c.gwId, tempId: null })) || [
    { gwId: 'GW7346221', tempId: null },  // Соавтор 1
    { gwId: 'GW1514866', tempId: null },  // Соавтор 2
    { gwId: 'GW7649513', tempId: null }   // Соавтор 3
];

// Максимальная глубина распространения контактов вверх
const MAX_UPLINE_LEVELS = 10;

// Защита от спама: минимальный интервал между регистрациями (мс)
const SPAM_PROTECTION_INTERVAL = 30000; // 30 секунд

// Хранилище времени последней регистрации по карточке
const lastRegistrationTime = {};

/**
 * Получить случайного FOUNDER для новых пользователей без реферала
 */
function getRandomFounder() {
    const index = Math.floor(Math.random() * FOUNDERS.length);
    return FOUNDERS[index];
}

/**
 * Генерация временного ID (CG_TEMP_xxxxx)
 */
function generateTempId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'CG_TEMP_';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Проверка защиты от спама
 * @returns {object} { allowed: boolean, remainingSeconds: number }
 */
function checkSpamProtection(cardId) {
    const key = cardId || 'global';
    const now = Date.now();
    const lastTime = lastRegistrationTime[key] || 0;
    const elapsed = now - lastTime;
    
    if (elapsed < SPAM_PROTECTION_INTERVAL) {
        const remainingMs = SPAM_PROTECTION_INTERVAL - elapsed;
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        return { allowed: false, remainingSeconds };
    }
    
    return { allowed: true, remainingSeconds: 0 };
}

/**
 * Обновить время последней регистрации
 */
function updateLastRegistrationTime(cardId) {
    const key = cardId || 'global';
    lastRegistrationTime[key] = Date.now();
}

// ═══════════════════════════════════════════════════════════
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ═══════════════════════════════════════════════════════════

let referrerId = null;          // ID реферера (GW ID или temp_id)
let referrerIsGw = false;       // true если реферер имеет GW ID
let walletConnected = false;
let userWalletAddress = null;
let registeredUserId = null;
let sourceCardId = null;

// ═══════════════════════════════════════════════════════════
// ПАТТЕРНЫ ВАЛИДАЦИИ КОНТАКТОВ
// ═══════════════════════════════════════════════════════════

const CONTACT_PATTERNS = {
    telegram: {
        pattern: /^(@[a-zA-Z][a-zA-Z0-9_]{4,31}|\+[0-9]{10,15})$/,
        examples: '@username, +380123456789'
    },
    whatsapp: {
        pattern: /^\+[0-9]{10,15}$/,
        examples: '+380123456789'
    },
    email: {
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        examples: 'example@mail.com'
    },
    instagram: {
        pattern: /^@[a-zA-Z0-9._]{1,30}$/,
        examples: '@username'
    },
    viber: {
        pattern: /^\+[0-9]{10,15}$/,
        examples: '+380123456789'
    },
    facebook: {
        pattern: /^(https?:\/\/)?(www\.)?facebook\.com\/[a-zA-Z0-9.]+|^[a-zA-Zа-яА-ЯіІїЇєЄёЁ]{2,}\s+[a-zA-Zа-яА-ЯіІїЇєЄёЁ]{2,}/,
        examples: 'facebook.com/username'
    },
    tiktok: {
        pattern: /^@[a-zA-Z0-9._]{2,24}$/,
        examples: '@username'
    },
    twitter: {
        pattern: /^@[a-zA-Z0-9_]{1,15}$/,
        examples: '@username'
    }
};

const validationErrors = {
    en: {
        invalidFormat: 'Invalid format. Expected: ',
        contactExists: 'This contact is already registered.',
        nameTooShort: 'Name must be at least 2 characters.'
    },
    ru: {
        invalidFormat: 'Неверный формат. Ожидается: ',
        contactExists: 'Этот контакт уже зарегистрирован.',
        nameTooShort: 'Имя должно содержать минимум 2 символа.'
    },
    ua: {
        invalidFormat: 'Невірний формат. Очікується: ',
        contactExists: 'Цей контакт вже зареєстрований.',
        nameTooShort: "Ім'я повинно містити мінімум 2 символи."
    }
};

// ═══════════════════════════════════════════════════════════
// ПЕРЕВОДЫ
// ═══════════════════════════════════════════════════════════

const registrationTranslations = {
    en: {
        pageTitle: "🎁 CardGift - Get Card Generator",
        referralText: "You were invited by user",
        referralSubtext: "Get free greeting card generator!",
        mainTitle: "🎁 Get Generator as Gift",
        nameLabel: "👤 Your Name:",
        namePlaceholder: "How should we address you?",
        nameHint: "Enter your name or nickname",
        messengerLabel: "📱 Where to find you:",
        messengerPlaceholder: "Choose messenger",
        messengerHint: "Choose convenient way to contact",
        contactLabel: "📞 Your Contact:",
        consentText: "I consent to receive <strong>push notifications</strong> and informational messages. This will help stay updated on new features and CardGift opportunities.",
        submitBtnText: "GET GENERATOR AS GIFT!",
        walletBtnText: "🔗 Connect Wallet",
        walletConnectedText: "✅ Wallet Connected",
        successTitle: "Congratulations!",
        successDesc: "Greeting card generator is ready to use",
        successId: "Your unique ID:",
        countdownText: "Redirecting in",
        seconds: "seconds...",
        web3OfferTitle: "Want to Earn Money?",
        web3OfferDesc: "Invite friends and earn cryptocurrency rewards!",
        web3BenefitsTitle: "💎 Benefits of Web3 Activation:",
        web3Benefit1: "Earn opBNB for each friend who activates",
        web3Benefit2: "Get access to 9-level referral system",
        web3Benefit3: "Unlimited card storage",
        web3Benefit4: "AI Studio access",
        web3Benefit5: "Advanced analytics",
        startEarningBtn: "🚀 START EARNING NOW",
        maybeLaterBtn: "Maybe Later",
        requirementText: "💡 Requires SafePal or MetaMask wallet",
        messengers: {
            telegram: { placeholder: "@username or +380123456789", hint: "Enter Telegram username or phone" },
            whatsapp: { placeholder: "+380123456789", hint: "Enter phone with country code" },
            email: { placeholder: "your@email.com", hint: "Enter your email" },
            instagram: { placeholder: "@username", hint: "Enter Instagram username" },
            viber: { placeholder: "+380123456789", hint: "Enter phone with country code" },
            facebook: { placeholder: "facebook.com/username", hint: "Enter profile link or name" },
            tiktok: { placeholder: "@username", hint: "Enter TikTok username" },
            twitter: { placeholder: "@username", hint: "Enter Twitter/X username" }
        },
        errors: {
            registrationFailed: "Registration failed. Please try again.",
            walletNotFound: "Wallet not found. Install SafePal or MetaMask.",
            walletConnectionFailed: "Failed to connect wallet."
        }
    },
    ru: {
        pageTitle: "🎁 CardGift - Получить генератор",
        referralText: "Вас пригласил пользователь",
        referralSubtext: "Получите бесплатный генератор открыток!",
        mainTitle: "🎁 Получить генератор в подарок",
        nameLabel: "👤 Ваше имя:",
        namePlaceholder: "Как к вам обращаться?",
        nameHint: "Введите имя или никнейм",
        messengerLabel: "📱 Где вас найти:",
        messengerPlaceholder: "Выберите мессенджер",
        messengerHint: "Выберите способ связи",
        contactLabel: "📞 Ваш контакт:",
        consentText: "Я даю согласие на получение <strong>уведомлений</strong> и информационных сообщений.",
        submitBtnText: "ПОЛУЧИТЬ ГЕНЕРАТОР В ПОДАРОК!",
        walletBtnText: "🔗 Подключить кошелек",
        walletConnectedText: "✅ Кошелек подключен",
        successTitle: "Поздравляем!",
        successDesc: "Генератор открыток готов к использованию",
        successId: "Ваш уникальный ID:",
        countdownText: "Перенаправление через",
        seconds: "секунды...",
        web3OfferTitle: "Хотите зарабатывать?",
        web3OfferDesc: "Приглашайте друзей и получайте криптовалюту!",
        web3BenefitsTitle: "💎 Преимущества Web3:",
        web3Benefit1: "Зарабатывайте opBNB за активации",
        web3Benefit2: "9-уровневая реферальная система",
        web3Benefit3: "Безлимитное хранение открыток",
        web3Benefit4: "Доступ к AI Studio",
        web3Benefit5: "Продвинутая аналитика",
        startEarningBtn: "🚀 НАЧАТЬ ЗАРАБАТЫВАТЬ",
        maybeLaterBtn: "Возможно позже",
        requirementText: "💡 Требуется SafePal или MetaMask",
        messengers: {
            telegram: { placeholder: "@username или +380123456789", hint: "Telegram username или телефон" },
            whatsapp: { placeholder: "+380123456789", hint: "Телефон с кодом страны" },
            email: { placeholder: "ваш@email.com", hint: "Ваш email" },
            instagram: { placeholder: "@username", hint: "Instagram username" },
            viber: { placeholder: "+380123456789", hint: "Телефон с кодом страны" },
            facebook: { placeholder: "facebook.com/username", hint: "Ссылка или имя" },
            tiktok: { placeholder: "@username", hint: "TikTok username" },
            twitter: { placeholder: "@username", hint: "Twitter/X username" }
        },
        errors: {
            registrationFailed: "Регистрация не удалась. Попробуйте ещё раз.",
            walletNotFound: "Кошелек не найден. Установите SafePal или MetaMask.",
            walletConnectionFailed: "Не удалось подключить кошелек."
        }
    },
    ua: {
        pageTitle: "🎁 CardGift - Отримати генератор",
        referralText: "Вас запросив користувач",
        referralSubtext: "Отримайте безкоштовний генератор листівок!",
        mainTitle: "🎁 Отримати генератор в подарунок",
        nameLabel: "👤 Ваше ім'я:",
        namePlaceholder: "Як до вас звертатися?",
        nameHint: "Введіть ім'я або нікнейм",
        messengerLabel: "📱 Де вас знайти:",
        messengerPlaceholder: "Оберіть месенджер",
        messengerHint: "Оберіть спосіб зв'язку",
        contactLabel: "📞 Ваш контакт:",
        consentText: "Я даю згоду на отримання <strong>сповіщень</strong> та інформаційних повідомлень.",
        submitBtnText: "ОТРИМАТИ ГЕНЕРАТОР В ПОДАРУНОК!",
        walletBtnText: "🔗 Підключити гаманець",
        walletConnectedText: "✅ Гаманець підключено",
        successTitle: "Вітаємо!",
        successDesc: "Генератор листівок готовий до використання",
        successId: "Ваш унікальний ID:",
        countdownText: "Перенаправлення через",
        seconds: "секунди...",
        web3OfferTitle: "Хочете заробляти?",
        web3OfferDesc: "Запрошуйте друзів та отримуйте криптовалюту!",
        web3BenefitsTitle: "💎 Переваги Web3:",
        web3Benefit1: "Заробляйте opBNB за активації",
        web3Benefit2: "9-рівнева реферальна система",
        web3Benefit3: "Безлімітне зберігання листівок",
        web3Benefit4: "Доступ до AI Studio",
        web3Benefit5: "Прогресивна аналітика",
        startEarningBtn: "🚀 ПОЧАТИ ЗАРОБЛЯТИ",
        maybeLaterBtn: "Можливо пізніше",
        requirementText: "💡 Потрібен SafePal або MetaMask",
        messengers: {
            telegram: { placeholder: "@username або +380123456789", hint: "Telegram username або телефон" },
            whatsapp: { placeholder: "+380123456789", hint: "Телефон з кодом країни" },
            email: { placeholder: "ваш@email.com", hint: "Ваш email" },
            instagram: { placeholder: "@username", hint: "Instagram username" },
            viber: { placeholder: "+380123456789", hint: "Телефон з кодом країни" },
            facebook: { placeholder: "facebook.com/username", hint: "Посилання або ім'я" },
            tiktok: { placeholder: "@username", hint: "TikTok username" },
            twitter: { placeholder: "@username", hint: "Twitter/X username" }
        },
        errors: {
            registrationFailed: "Реєстрація не вдалася. Спробуйте ще раз.",
            walletNotFound: "Гаманець не знайдено. Встановіть SafePal або MetaMask.",
            walletConnectionFailed: "Не вдалося підключити гаманець."
        }
    }
};

// ═══════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    initializeLanguage();
    checkReferralLink();
    initializeForm();
    checkWalletConnection();
});

// ═══════════════════════════════════════════════════════════
// ФУНКЦИИ ЯЗЫКА
// ═══════════════════════════════════════════════════════════

function switchLanguage(lang) {
    window.currentLanguage = lang;
    localStorage.setItem('cardgift_language', lang); // Унифицированный ключ
    updateLanguageButtons();
    updateRegistrationContent();
}

function initializeLanguage() {
    const urlParams = new URLSearchParams(window.location.search);
    const langFromUrl = urlParams.get('lang');
    // Унифицированный ключ + старый для обратной совместимости
    const savedLang = localStorage.getItem('cardgift_language') || localStorage.getItem('preferredLanguage');
    
    window.currentLanguage = langFromUrl || savedLang || 'en';
    updateLanguageButtons();
    updateRegistrationContent();
}

function updateLanguageButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    const langBtn = document.getElementById(`lang${window.currentLanguage.charAt(0).toUpperCase() + window.currentLanguage.slice(1)}`);
    if (langBtn) langBtn.classList.add('active');
}

function updateRegistrationContent() {
    const trans = registrationTranslations[window.currentLanguage];
    if (!trans) return;
    
    document.title = trans.pageTitle;
    
    const elements = {
        'referralText': `${trans.referralText} <span id="referrerDisplay">${referrerId || 'ID'}</span>`,
        'referralSubtext': trans.referralSubtext,
        'mainTitle': trans.mainTitle,
        'nameLabel': trans.nameLabel,
        'nameHint': trans.nameHint,
        'messengerLabel': trans.messengerLabel,
        'messengerHint': trans.messengerHint,
        'contactLabel': trans.contactLabel,
        'consentText': trans.consentText,
        'submitBtnText': trans.submitBtnText,
        'walletBtnText': trans.walletBtnText,
        'walletConnectedText': trans.walletConnectedText,
        'successTitle': trans.successTitle,
        'successDesc': trans.successDesc,
        'web3OfferTitle': trans.web3OfferTitle,
        'web3OfferDesc': trans.web3OfferDesc,
        'web3BenefitsTitle': trans.web3BenefitsTitle,
        'web3Benefit1': trans.web3Benefit1,
        'web3Benefit2': trans.web3Benefit2,
        'web3Benefit3': trans.web3Benefit3,
        'web3Benefit4': trans.web3Benefit4,
        'web3Benefit5': trans.web3Benefit5,
        'startEarningBtn': trans.startEarningBtn,
        'maybeLaterBtn': trans.maybeLaterBtn,
        'requirementText': trans.requirementText
    };
    
    for (const [id, content] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'consentText' || id === 'referralText') {
                el.innerHTML = content;
            } else {
                el.textContent = content;
            }
        }
    }
    
    const userNameInput = document.getElementById('userName');
    if (userNameInput) userNameInput.placeholder = trans.namePlaceholder;
    
    const messengerSelect = document.getElementById('messengerSelect');
    if (messengerSelect) {
        const placeholder = messengerSelect.querySelector('option[value=""]');
        if (placeholder) placeholder.textContent = trans.messengerPlaceholder;
        
        if (messengerSelect.value) {
            updateContactField(messengerSelect.value);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// РЕФЕРАЛЬНАЯ ССЫЛКА
// ═══════════════════════════════════════════════════════════

function checkReferralLink() {
    const urlParams = new URLSearchParams(window.location.search);
    referrerId = urlParams.get('ref') || urlParams.get('referral') || urlParams.get('r');
    sourceCardId = urlParams.get('from') || urlParams.get('card') || null;
    
    // Определяем тип ID реферера
    if (referrerId) {
        referrerIsGw = referrerId.startsWith('GW') || /^\d{7,9}$/.test(referrerId);
        // Если числовой ID без префикса - добавляем GW
        if (/^\d{7,9}$/.test(referrerId)) {
            referrerId = 'GW' + referrerId;
            referrerIsGw = true;
        }
    }
    
    // Если нет реферера — выбираем случайного FOUNDER
    if (!referrerId) {
        const founder = getRandomFounder();
        referrerId = founder.gwId;
        referrerIsGw = true;
        console.log('🎲 No referral, random founder:', referrerId);
    }
    
    console.log('📋 Referral:', { referrerId, referrerIsGw, sourceCardId });
    
    // Показываем инфо о реферере
    if (referrerId) {
        const referrerDisplay = document.getElementById('referrerDisplay');
        if (referrerDisplay) referrerDisplay.textContent = referrerId;
        
        const referralInfo = document.getElementById('referralInfo');
        if (referralInfo) referralInfo.classList.add('show');
    }
}

// ═══════════════════════════════════════════════════════════
// ФОРМА
// ═══════════════════════════════════════════════════════════

function initializeForm() {
    const form = document.getElementById('registrationForm');
    const messengerSelect = document.getElementById('messengerSelect');
    const nameInput = document.getElementById('userName');
    const contactInput = document.getElementById('contactInput');
    const consentCheckbox = document.getElementById('pushConsent');

    if (messengerSelect) {
        messengerSelect.addEventListener('change', function() {
            const contactGroup = document.getElementById('contactInputGroup');
            if (this.value && contactGroup) {
                updateContactField(this.value);
                contactGroup.style.display = 'block';
            } else if (contactGroup) {
                contactGroup.style.display = 'none';
            }
            checkFormValidity();
        });
    }

    [nameInput, messengerSelect, consentCheckbox].forEach(el => {
        if (el) {
            el.addEventListener('input', checkFormValidity);
            el.addEventListener('change', checkFormValidity);
        }
    });
    
    if (contactInput) {
        contactInput.addEventListener('input', checkFormValidity);
    }

    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

function updateContactField(messenger) {
    const trans = registrationTranslations[currentLanguage];
    if (!trans || !trans.messengers[messenger]) return;
    
    const contactInput = document.getElementById('contactInput');
    const contactHint = document.getElementById('contactHint');
    
    if (contactInput) contactInput.placeholder = trans.messengers[messenger].placeholder;
    if (contactHint) contactHint.textContent = trans.messengers[messenger].hint;
}

function checkFormValidity() {
    const name = document.getElementById('userName')?.value.trim();
    const messenger = document.getElementById('messengerSelect')?.value;
    const contact = document.getElementById('contactInput')?.value.trim();
    const consent = document.getElementById('pushConsent')?.checked;
    
    const isValid = name && name.length >= 2 && messenger && contact && contact.length >= 3 && consent;
    const submitBtn = document.getElementById('submitBtn');
    
    if (submitBtn) submitBtn.disabled = !isValid;
}

// ═══════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ
// ═══════════════════════════════════════════════════════════

function validateContactFormat(messenger, contact) {
    if (!messenger || !contact) return { valid: false, error: 'Empty' };
    
    const pattern = CONTACT_PATTERNS[messenger];
    if (!pattern) {
        return contact.length >= 3 ? { valid: true } : { valid: false, error: 'Too short' };
    }
    
    if (pattern.pattern.test(contact)) {
        return { valid: true };
    }
    
    return { 
        valid: false, 
        error: (validationErrors[currentLanguage]?.invalidFormat || 'Invalid: ') + pattern.examples 
    };
}

async function checkContactExists(messenger, contact) {
    try {
        if (window.SupabaseClient && SupabaseClient.client) {
            const { data, error } = await SupabaseClient.client
                .from('users')
                .select('temp_id, gw_id')
                .eq('messenger', messenger)
                .eq('contact', contact)
                .limit(1);
            
            if (!error && data && data.length > 0) {
                return data[0];
            }
        }
    } catch (e) {
        console.warn('checkContactExists error:', e);
    }
    return null;
}

// ═══════════════════════════════════════════════════════════
// ОТПРАВКА ФОРМЫ
// ═══════════════════════════════════════════════════════════

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
    }

    try {
        // ═══════════════════════════════════════════════════════════
        // ЗАЩИТА ОТ СПАМА
        // ═══════════════════════════════════════════════════════════
        const spamCheck = checkSpamProtection(sourceCardId);
        if (!spamCheck.allowed) {
            throw new Error(`Подождите ${spamCheck.remainingSeconds} сек. перед следующей регистрацией`);
        }
        
        const name = document.getElementById('userName').value.trim();
        const messenger = document.getElementById('messengerSelect').value;
        const contact = document.getElementById('contactInput').value.trim();
        
        // Валидация имени
        if (name.length < 2) {
            throw new Error(validationErrors[currentLanguage]?.nameTooShort);
        }
        
        // Валидация контакта
        const validation = validateContactFormat(messenger, contact);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        
        // Проверка существующего контакта
        const existingUser = await checkContactExists(messenger, contact);
        
        if (existingUser) {
            // Пользователь уже существует — добавляем контакт к рефереру
            console.log('👤 User exists:', existingUser.gw_id || existingUser.temp_id);
            
            const pushConsent = document.getElementById('pushConsent')?.checked || false;
            
            await distributeContactToUpline(referrerId, {
                name: name,
                messenger: messenger,
                contact: contact,
                push_consent: pushConsent,
                source: sourceCardId ? `Card: ${sourceCardId}` : 'Re-subscription',
                referral_temp_id: existingUser.temp_id || null,
                referral_gw_id: existingUser.gw_id || null
            });
            
            // Обновляем время последней регистрации (защита от спама)
            updateLastRegistrationTime(sourceCardId);
            
            const userId = existingUser.gw_id || existingUser.temp_id;
            showSuccess(userId, null, true);
            return;
        }
        
        // Новый пользователь — создаём
        const result = await saveNewUser({
            name,
            messenger,
            contact,
            pushConsent: document.getElementById('pushConsent')?.checked || false,
            language: currentLanguage,
            referrerId: referrerId,
            referrerIsGw: referrerIsGw,
            sourceCardId: sourceCardId,
            walletAddress: userWalletAddress
        });
        
        if (result.success) {
            registeredUserId = result.userId;
            
            // Обновляем время последней регистрации (защита от спама)
            updateLastRegistrationTime(sourceCardId);
            
            showSuccess(result.userId, userWalletAddress);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Registration error:', error);
        showError(error.message || registrationTranslations[currentLanguage]?.errors?.registrationFailed);
        
        if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }
}

// ═══════════════════════════════════════════════════════════
// СОХРАНЕНИЕ НОВОГО ПОЛЬЗОВАТЕЛЯ
// ═══════════════════════════════════════════════════════════

async function saveNewUser(userData) {
    try {
        // Генерируем временный ID
        const tempId = generateTempId();
        
        console.log('📝 Creating user with temp_id:', tempId);
        
        // Сохраняем в Supabase
        if (window.SupabaseClient && SupabaseClient.client) {
            const insertData = {
                temp_id: tempId,
                gw_id: null,  // Будет заполнен после покупки пакета GW
                wallet_address: userData.walletAddress ? userData.walletAddress.toLowerCase() : null,
                
                // Реферер
                referrer_temp_id: userData.referrerIsGw ? null : userData.referrerId,
                referrer_gw_id: userData.referrerIsGw ? userData.referrerId : null,
                
                // Контактные данные
                name: userData.name,
                messenger: userData.messenger,
                contact: userData.contact,
                
                // Настройки
                push_consent: userData.pushConsent,
                language: userData.language,
                
                // Уровень
                gw_level: 0,
                
                // Вирусный маркетинг
                viral_count: 0,
                viral_target: 5,
                viral_completed: false,
                
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await SupabaseClient.client
                .from('users')
                .insert(insertData)
                .select();
            
            if (error) {
                console.error('Supabase insert error:', error);
                throw new Error(error.message);
            }
            
            console.log('✅ User saved to Supabase:', tempId);
        }
        
        // Сохраняем локально
        localStorage.setItem('cardgift_user_id', tempId);
        localStorage.setItem('cardgift_user_data', JSON.stringify({
            tempId,
            name: userData.name,
            messenger: userData.messenger,
            contact: userData.contact,
            language: userData.language,
            createdAt: new Date().toISOString()
        }));
        
        // Распределяем контакт вверх по структуре
        if (userData.referrerId) {
            await distributeContactToUpline(userData.referrerId, {
                name: userData.name,
                messenger: userData.messenger,
                contact: userData.contact,
                push_consent: userData.pushConsent || false,
                source: userData.sourceCardId ? `Card: ${userData.sourceCardId}` : 'Registration',
                // ID нового пользователя для связи
                referral_temp_id: tempId,
                referral_gw_id: null  // У нового пользователя ещё нет GW ID
            });
        }
        
        return { success: true, userId: tempId };
        
    } catch (error) {
        console.error('saveNewUser error:', error);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════
// РАСПРЕДЕЛЕНИЕ КОНТАКТА ВВЕРХ ПО СТРУКТУРЕ
// ═══════════════════════════════════════════════════════════

async function distributeContactToUpline(startId, contactData) {
    console.log('═══════════════════════════════════════');
    console.log('📤 DISTRIBUTING CONTACT TO UPLINE');
    console.log('Starting from:', startId);
    console.log('═══════════════════════════════════════');
    
    let currentId = startId;
    let level = 0;
    const visitedIds = new Set(); // Защита от циклов
    
    // ═══════════════════════════════════════════════════════════
    // 1. Распределяем по 9 уровням вверх
    // ═══════════════════════════════════════════════════════════
    while (currentId && level < 9) {
        // Защита от циклов
        if (visitedIds.has(currentId)) {
            console.log(`🔄 Cycle detected at ${currentId}, stopping`);
            break;
        }
        visitedIds.add(currentId);
        
        console.log(`Level ${level}: Adding to ${currentId}`);
        
        // Сохраняем контакт владельцу
        await saveContactToOwner(currentId, contactData, level);
        
        // Получаем реферера текущего владельца
        const referrer = await getReferrerId(currentId);
        
        if (!referrer || referrer === currentId) {
            console.log(`🛑 No referrer for ${currentId}, stopping at level ${level}`);
            break;
        }
        
        currentId = referrer;
        level++;
    }
    
    // ═══════════════════════════════════════════════════════════
    // 2. ВСЕГДА отправляем к OWNER (ROOT) из любой глубины
    // ═══════════════════════════════════════════════════════════
    const OWNER_ID = ROOT_GW_ID || 'GW9729645';
    
    // Проверяем что OWNER ещё не получил этот контакт
    if (!visitedIds.has(OWNER_ID) && startId !== OWNER_ID) {
        console.log(`📤 Always sending to OWNER: ${OWNER_ID}`);
        await saveContactToOwner(OWNER_ID, contactData, 99); // source_level 99 = от OWNER
    }
    
    console.log(`✅ Contact distributed to ${level + 1} levels + OWNER`);
}

async function getReferrerId(userId) {
    try {
        console.log(`  🔍 getReferrerId for: ${userId}`);
        
        // Определяем тип ID
        const isGwId = userId.startsWith('GW') || /^\d{7,9}$/.test(userId);
        const isTempId = userId.startsWith('CG_TEMP_');
        
        // ═══════════════════════════════════════════════════════════
        // Для GW ID — получаем спонсора из блокчейна
        // ═══════════════════════════════════════════════════════════
        if (isGwId) {
            const numericId = userId.replace('GW', '');
            const sponsorId = await getSponsorFromContract(numericId);
            
            if (sponsorId) {
                console.log(`  ✅ Sponsor from contract: GW${sponsorId}`);
                return `GW${sponsorId}`;
            }
            
            console.log(`  ⚠️ No sponsor in contract for ${userId}`);
            return null;
        }
        
        // ═══════════════════════════════════════════════════════════
        // Для temp_id — получаем из Supabase
        // ═══════════════════════════════════════════════════════════
        if (isTempId && window.SupabaseClient && SupabaseClient.client) {
            const { data, error } = await SupabaseClient.client
                .from('users')
                .select('referrer_gw_id, referrer_temp_id')
                .eq('temp_id', userId)
                .limit(1);
            
            if (!error && data && data.length > 0) {
                const referrer = data[0].referrer_gw_id || data[0].referrer_temp_id;
                console.log(`  ✅ Referrer from Supabase: ${referrer}`);
                return referrer;
            }
        }
        
        console.log(`  ⚠️ No referrer found for ${userId}`);
        return null;
        
    } catch (e) {
        console.warn('getReferrerId error:', e);
        return null;
    }
}

/**
 * Получить ID спонсора из контракта GlobalWay
 * @param {string} numericId - числовой ID (без GW префикса)
 * @returns {string|null} - числовой ID спонсора или null
 */
async function getSponsorFromContract(numericId) {
    try {
        if (!window.ethers) {
            console.warn('ethers.js not available');
            return null;
        }
        
        const RPC_URL = window.GlobalWayBridge?.RPC_URL || 'https://opbnb-mainnet-rpc.bnbchain.org';
        const MATRIX_REGISTRY = window.GlobalWayBridge?.MATRIX_REGISTRY_ADDRESS || '0xC12b57B8B4BcE9134788FBb2290Cf4d496c4eE4a';
        
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        
        // 1. Получаем адрес кошелька по ID
        const abiGetAddress = ['function getAddressById(uint256 userId) view returns (address)'];
        const contract = new ethers.Contract(MATRIX_REGISTRY, abiGetAddress, provider);
        const walletAddress = await contract.getAddressById(numericId);
        
        if (!walletAddress || walletAddress === '0x0000000000000000000000000000000000000000') {
            console.log(`  ⚠️ No wallet for ID ${numericId}`);
            return null;
        }
        
        // 2. Получаем информацию о пользователе (включая sponsorId)
        const abiUserInfo = ['function getUserInfo(address user) view returns (bool, uint256, uint256, uint256, address[], bool)'];
        const contract2 = new ethers.Contract(MATRIX_REGISTRY, abiUserInfo, provider);
        const info = await contract2.getUserInfo(walletAddress);
        
        // info[2] = sponsorId
        const sponsorId = info[2];
        
        if (sponsorId && sponsorId.toString() !== '0') {
            return sponsorId.toString();
        }
        
        return null;
        
    } catch (e) {
        console.warn('getSponsorFromContract error:', e);
        return null;
    }
}

async function saveContactToOwner(ownerId, contactData, level) {
    try {
        if (!window.SupabaseClient || !SupabaseClient.client) return false;
        
        // Определяем тип ID
        // GW ID может быть: 'GW7346221' или '7346221' (7-9 цифр)
        const isGwId = ownerId.startsWith('GW') || /^\d{7,9}$/.test(ownerId);
        const isTempId = ownerId.startsWith('CG_TEMP_');
        
        // Нормализуем GW ID (добавляем префикс если нужно)
        const normalizedGwId = isGwId ? 
            (ownerId.startsWith('GW') ? ownerId : 'GW' + ownerId) : null;
        
        const ownerTempId = isTempId ? ownerId : null;
        const ownerGwId = normalizedGwId;
        
        // ═══════════════════════════════════════════════════════════
        // ПРОВЕРКА ДЕДУПЛИКАЦИИ
        // Проверяем есть ли уже контакт с таким messenger+contact у этого владельца
        // ═══════════════════════════════════════════════════════════
        let existsQuery = SupabaseClient.client
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .eq('messenger', contactData.messenger)
            .ilike('contact', contactData.contact);
        
        if (ownerGwId) {
            existsQuery = existsQuery.eq('owner_gw_id', ownerGwId);
        } else if (ownerTempId) {
            existsQuery = existsQuery.eq('owner_temp_id', ownerTempId);
        }
        
        const { count } = await existsQuery;
        
        if (count > 0) {
            console.log(`  ⏭️ Contact already exists for ${ownerGwId || ownerTempId}`);
            return true; // Уже есть — не дубликат, просто пропускаем
        }
        
        // ═══════════════════════════════════════════════════════════
        // СОХРАНЕНИЕ КОНТАКТА
        // ═══════════════════════════════════════════════════════════
        const insertData = {
            owner_temp_id: ownerTempId,
            owner_gw_id: ownerGwId,
            name: contactData.name,
            messenger: contactData.messenger,
            contact: contactData.contact,
            push_consent: contactData.push_consent || false,
            source: contactData.source || 'Registration',
            source_level: level,
            status: 'new',
            // Связка с зарегистрированным пользователем (если есть)
            referral_temp_id: contactData.referral_temp_id || null,
            referral_gw_id: contactData.referral_gw_id || null,
            created_at: new Date().toISOString()
        };
        
        console.log(`  📝 Saving contact to:`, ownerGwId || ownerTempId);
        
        const { error } = await SupabaseClient.client
            .from('contacts')
            .insert(insertData);
        
        if (error) {
            // Игнорируем дубликаты (на случай race condition)
            if (error.code === '23505') {
                console.log(`  ⏭️ Duplicate contact for ${ownerGwId || ownerTempId}`);
                return true;
            }
            console.error(`  ❌ Error saving to ${ownerGwId || ownerTempId}:`, error);
            return false;
        }
        
        console.log(`  ✅ Contact saved for ${ownerGwId || ownerTempId}`);
        return true;
        
    } catch (e) {
        console.error('saveContactToOwner error:', e);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════
// УСПЕХ / ОШИБКИ
// ═══════════════════════════════════════════════════════════

function showSuccess(userId, walletAddress, isExisting = false) {
    const form = document.getElementById('registrationForm');
    if (form) form.style.display = 'none';
    
    const successMessage = document.getElementById('successMessage');
    const newUserIdEl = document.getElementById('newUserId');
    
    if (newUserIdEl) newUserIdEl.textContent = userId;
    
    if (isExisting) {
        const successTitle = document.getElementById('successTitle');
        if (successTitle) {
            successTitle.textContent = currentLanguage === 'ru' ? '✅ Подписка оформлена!' :
                                       currentLanguage === 'ua' ? '✅ Підписку оформлено!' :
                                       '✅ Subscribed!';
        }
    }
    
    if (walletAddress) {
        const userWalletEl = document.getElementById('userWallet');
        const walletInfoEl = document.getElementById('walletInfo');
        
        if (userWalletEl) {
            userWalletEl.textContent = walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4);
        }
        if (walletInfoEl) walletInfoEl.style.display = 'block';
    }
    
    if (successMessage) successMessage.classList.add('show');
    
    // Web3 предложение или countdown
    if (!walletAddress && !isExisting) {
        setTimeout(() => showWeb3Offer(), 3000);
    } else {
        startCountdown(userId);
    }
}

function showWeb3Offer() {
    const web3Offer = document.getElementById('web3Offer');
    if (web3Offer) web3Offer.classList.add('show');
    
    if (window.countdownInterval) clearInterval(window.countdownInterval);
    
    const countdownText = document.getElementById('countdownText');
    if (countdownText) countdownText.style.display = 'none';
}

function goToWeb3Dashboard() {
    localStorage.setItem('pendingWeb3Activation', 'true');
    localStorage.setItem('registeredUserId', registeredUserId);
    
    window.location.href = `/dashboard.html?userId=${registeredUserId}&upgrade=true&lang=${currentLanguage}`;
}

function skipWeb3Offer() {
    const web3Offer = document.getElementById('web3Offer');
    if (web3Offer) web3Offer.classList.remove('show');
    
    const countdownText = document.getElementById('countdownText');
    if (countdownText) countdownText.style.display = 'block';
    
    startCountdown(registeredUserId);
}

function startCountdown(userId) {
    let timeLeft = 5;
    const countdownEl = document.getElementById('countdown');
    
    window.countdownInterval = setInterval(() => {
        timeLeft--;
        if (countdownEl) countdownEl.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(window.countdownInterval);
            window.location.href = `/generator.html?userId=${userId}&lang=${currentLanguage}`;
        }
    }, 1000);
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
        setTimeout(() => errorEl.classList.remove('show'), 5000);
    }
}

// ═══════════════════════════════════════════════════════════
// КОШЕЛЁК
// ═══════════════════════════════════════════════════════════

async function connectWallet() {
    const walletBtn = document.getElementById('walletBtnSmall');
    if (walletBtn) {
        walletBtn.disabled = true;
        walletBtn.innerHTML = '<span>🔄 ...</span>';
    }

    try {
        const provider = window.ethereum || 
                        (window.safepalProvider) || 
                        (window.safepal && window.safepal.ethereum);
        
        if (!provider) {
            throw new Error('Wallet not found');
        }
        
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        
        if (accounts && accounts.length > 0) {
            userWalletAddress = accounts[0];
            walletConnected = true;
            showWalletConnected();
        }
    } catch (error) {
        console.error('Wallet error:', error);
        const trans = registrationTranslations[currentLanguage];
        
        if (walletBtn) {
            walletBtn.disabled = false;
            walletBtn.innerHTML = `<span>${trans?.walletBtnText || '🔗 Connect Wallet'}</span>`;
        }
        showError(trans?.errors?.walletConnectionFailed || 'Wallet connection failed');
    }
}

function showWalletConnected() {
    const walletBtn = document.getElementById('walletBtnSmall');
    const walletStatus = document.getElementById('walletStatusSmall');
    
    if (walletBtn) walletBtn.style.display = 'none';
    if (walletStatus) walletStatus.classList.add('show');
}

async function checkWalletConnection() {
    try {
        const provider = window.ethereum || 
                        (window.safepalProvider) || 
                        (window.safepal && window.safepal.ethereum);
        
        if (provider) {
            const accounts = await provider.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                userWalletAddress = accounts[0];
                walletConnected = true;
                showWalletConnected();
            }
        }
    } catch (e) {
        console.log('Wallet not connected');
    }
}

// ═══════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════

window.switchLanguage = switchLanguage;
window.connectWallet = connectWallet;
window.goToWeb3Dashboard = goToWeb3Dashboard;
window.skipWeb3Offer = skipWeb3Offer;

// Для отладки
window.generateTempId = generateTempId;
window.distributeContactToUpline = distributeContactToUpline;
window.getReferrerId = getReferrerId;

console.log('📝 Registration v4.0 loaded (temp_id + GW ID architecture)');
