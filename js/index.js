/* =====================================================
   CARDGIFT - INDEX PAGE JAVASCRIPT
   Скрипты для главной страницы
   ===================================================== */

// ===== ПЕРЕМЕННЫЕ =====
let deferredPrompt;
// currentLanguage уже объявлена в common.js

// ===== ПЕРЕВОДЫ ДЛЯ INDEX =====
const indexTranslations = {
    en: {
        pageTitle: "CardGift - Digital Greeting Cards",
        tagline: "Create golden greeting cards for free!",
        heroTitle: "Digital Cards for Every Occasion",
        heroSubtitle: "Send beautiful personalized greeting cards powered by blockchain technology",
        createCardBtn: "🎨 Create Card",
        registerBtn: "📝 Register",
        dashboardBtn: "📊 Dashboard",
        featuresTitle: "Why Choose CardGift?",
        feature1Title: "Card Creation",
        feature1Desc: "Create beautiful digital greeting cards with photos, videos, text and effects",
        feature2Title: "Web3 Powered",
        feature2Desc: "Secure blockchain technology ensures your cards are unique",
        feature3Title: "Share Anywhere",
        feature3Desc: "Send via WhatsApp, Telegram, Email or any social platform",
        feature4Title: "Video Support",
        feature4Desc: "Add YouTube, TikTok or Instagram videos to your cards",
        howItWorksTitle: "How It Works",
        step1Title: "Choose Template",
        step1Desc: "Select from our beautiful collection",
        step2Title: "Customize",
        step2Desc: "Add your message, photos or videos",
        step3Title: "Share",
        step3Desc: "Send to your loved ones instantly",
        statCardsLabel: "Cards Created",
        statUsersLabel: "Happy Users",
        statCountriesLabel: "Countries",
        ctaTitle: "Ready to Create Your First Card?",
        ctaDesc: "Join thousands of users who are already sending amazing digital cards",
        ctaBtn: "🚀 Get Started Free",
        footerDesc: "Web3 Digital Greeting Cards Platform",
        footerCreate: "Create Card",
        footerRegister: "Register",
        footerDemo: "Demo Card",
        footerFollow: "Follow us:",
        footerRights: "All rights reserved.",
        footerPowered: "Powered by opBNB Blockchain"
    },
    ru: {
        pageTitle: "CardGift - Цифровые открытки",
        tagline: "Создавайте золотые поздравительные открытки бесплатно!",
        heroTitle: "Цифровые открытки на любой случай",
        heroSubtitle: "Отправляйте красивые персональные открытки с блокчейн технологией",
        createCardBtn: "🎨 Создать карту",
        registerBtn: "📝 Регистрация",
        dashboardBtn: "📊 Кабинет",
        featuresTitle: "Почему CardGift?",
        feature1Title: "Создание карт",
        feature1Desc: "Создавайте красивые цифровые открытки с фото, видео и эффектами",
        feature2Title: "Web3 технология",
        feature2Desc: "Блокчейн технология гарантирует уникальность ваших открыток",
        feature3Title: "Делитесь везде",
        feature3Desc: "Отправляйте через WhatsApp, Telegram, Email или соцсети",
        feature4Title: "Поддержка видео",
        feature4Desc: "Добавляйте видео с YouTube, TikTok или Instagram",
        howItWorksTitle: "Как это работает",
        step1Title: "Выберите шаблон",
        step1Desc: "Выберите из нашей коллекции",
        step2Title: "Настройте",
        step2Desc: "Добавьте сообщение, фото или видео",
        step3Title: "Поделитесь",
        step3Desc: "Отправьте близким мгновенно",
        statCardsLabel: "Создано открыток",
        statUsersLabel: "Счастливых пользователей",
        statCountriesLabel: "Стран",
        ctaTitle: "Готовы создать первую открытку?",
        ctaDesc: "Присоединяйтесь к тысячам пользователей",
        ctaBtn: "🚀 Начать бесплатно",
        footerDesc: "Платформа цифровых открыток Web3",
        footerCreate: "Создать карту",
        footerRegister: "Регистрация",
        footerDemo: "Демо карта",
        footerFollow: "Мы в соцсетях:",
        footerRights: "Все права защищены.",
        footerPowered: "Работает на блокчейне opBNB"
    },
    ua: {
        pageTitle: "CardGift - Цифрові листівки",
        tagline: "Створюйте золоті привітальні листівки безкоштовно!",
        heroTitle: "Цифрові листівки на будь-який випадок",
        heroSubtitle: "Надсилайте красиві персональні листівки з блокчейн технологією",
        createCardBtn: "🎨 Створити карту",
        registerBtn: "📝 Реєстрація",
        dashboardBtn: "📊 Кабінет",
        featuresTitle: "Чому CardGift?",
        feature1Title: "Створення карт",
        feature1Desc: "Створюйте красиві цифрові листівки з фото, відео та ефектами",
        feature2Title: "Web3 технологія",
        feature2Desc: "Блокчейн технологія гарантує унікальність ваших листівок",
        feature3Title: "Діліться скрізь",
        feature3Desc: "Надсилайте через WhatsApp, Telegram, Email або соцмережі",
        feature4Title: "Підтримка відео",
        feature4Desc: "Додавайте відео з YouTube, TikTok або Instagram",
        howItWorksTitle: "Як це працює",
        step1Title: "Оберіть шаблон",
        step1Desc: "Оберіть з нашої колекції",
        step2Title: "Налаштуйте",
        step2Desc: "Додайте повідомлення, фото або відео",
        step3Title: "Поділіться",
        step3Desc: "Надішліть близьким миттєво",
        statCardsLabel: "Створено листівок",
        statUsersLabel: "Щасливих користувачів",
        statCountriesLabel: "Країн",
        ctaTitle: "Готові створити першу листівку?",
        ctaDesc: "Приєднуйтесь до тисяч користувачів",
        ctaBtn: "🚀 Почати безкоштовно",
        footerDesc: "Платформа цифрових листівок Web3",
        footerCreate: "Створити карту",
        footerRegister: "Реєстрація",
        footerDemo: "Демо карта",
        footerFollow: "Ми в соцмережах:",
        footerRights: "Всі права захищені.",
        footerPowered: "Працює на блокчейні opBNB"
    }
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    initializeIndexPage();
});

function initializeIndexPage() {
    // Определяем язык
    const savedLang = localStorage.getItem('selectedLanguage') || detectLanguage();
    currentLanguage = savedLang;
    switchLanguage(savedLang);
    
    // Проверяем реферальный параметр
    checkReferralParam();
    
    // Регистрируем Service Worker
    registerServiceWorker();
    
    console.log('✅ Index page initialized');
}

// ===== ОПРЕДЕЛЕНИЕ ЯЗЫКА =====
function detectLanguage() {
    const browserLang = navigator.language || navigator.userLanguage || 'en';
    if (browserLang.startsWith('uk')) return 'ua';
    if (browserLang.startsWith('ru')) return 'ru';
    return 'en';
}

// ===== ПЕРЕКЛЮЧЕНИЕ ЯЗЫКА =====
function switchLanguage(lang) {
    if (!['en', 'ru', 'ua'].includes(lang)) lang = 'en';
    
    currentLanguage = lang;
    localStorage.setItem('selectedLanguage', lang);
    
    // Обновляем кнопки языка
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById('lang' + lang.charAt(0).toUpperCase() + lang.slice(1));
    if (activeBtn) activeBtn.classList.add('active');
    
    // Обновляем тексты
    updateIndexTexts();
    
    // Обновляем атрибут lang
    document.documentElement.lang = lang === 'ua' ? 'uk' : lang;
}

// ===== ОБНОВЛЕНИЕ ТЕКСТОВ =====
function updateIndexTexts() {
    const t = indexTranslations[currentLanguage];
    if (!t) return;
    
    Object.keys(t).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.textContent = t[key];
        }
    });
    
    if (t.pageTitle) {
        document.title = t.pageTitle;
    }
}

// ===== РЕФЕРАЛЬНАЯ СИСТЕМА =====
function checkReferralParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');
    
    if (refId) {
        // Сохраняем ref для последующей регистрации
        localStorage.setItem('referralId', refId);
        console.log('📋 Referral ID saved:', refId);
        
        // Показываем уведомление о реферале (не перенаправляем!)
        showReferralBanner(refId);
    }
}

// Показываем баннер что пользователь пришёл по реферальной ссылке
function showReferralBanner(refId) {
    // Проверяем не показывали ли уже
    if (document.getElementById('referralBanner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'referralBanner';
    banner.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #4CAF50, #2E7D32);
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 90%;
    `;
    banner.innerHTML = `
        <span>🎁 Вас пригласил партнёр #\${refId}</span>
        <a href="registration.html?ref=\${refId}" style="background: white; color: #2E7D32; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-weight: 600;">Регистрация</a>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">✕</button>
    `;
    document.body.appendChild(banner);
    
    // Автоскрытие через 15 секунд
    setTimeout(() => {
        if (banner.parentElement) banner.remove();
    }, 15000);
}

// ===== SERVICE WORKER =====
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker registered'))
            .catch(err => console.warn('⚠️ SW failed:', err));
    }
}

// ===== ЭКСПОРТ =====
window.switchLanguage = switchLanguage;

console.log('✅ Index JS loaded');
