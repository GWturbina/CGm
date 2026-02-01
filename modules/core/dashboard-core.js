/* =====================================================
   CARDGIFT - DASHBOARD CORE (ЯДРО)
   
   Это минимальное ядро dashboard.js
   Все модули вынесены в отдельные файлы
   
   Содержит:
   - Constants (цены, ранги)
   - State (глобальные переменные)
   - Initialization
   - Sidebar & Navigation
   - Date/Time, Language
   - Global exports
   
   Порядок загрузки модулей в HTML:
   1. core/config.js
   2. core/supabase.js
   3. core/wallet-state.js
   4. core/wallet.js
   5. core/common.js
   6. core/dashboard-core.js  ← ЭТО ЯДРО
   7. mobile/mobile.js
   8. debug/debug.js
   9. author/author-mode.js
   10. contacts/contacts.js
   11. archive/archive.js
   12. referrals/referrals.js
   13. blog/blog.js
   14. panel/panel.js
   15. upgrade/upgrade.js
   16. admin/admin-stats.js
   17. modals/modals.js
   ===================================================== */

/**
 * CARDGIFT DASHBOARD JS
 * v4.5 - Template filters + Use template button
 * - FIX: Фильтр по платформам теперь работает с полем messenger
 * - FIX: Отображение platform/messenger в таблице
 * - FIX: Поддержка push_consent из Supabase
 * - FIX: Реферальная секция разблокируется при level >= 3
 * - NEW: Фильтр шаблонов (leader/corporate)
 * - NEW: Кнопка "Использовать шаблон" с реферальной ссылкой
 */

// ============ URL PARAMETERS ============
const urlParams = new URLSearchParams(window.location.search);
const templateFilter = urlParams.get('filter'); // 'leader' или 'corporate'

// ============ CONSTANTS ============

// Какой пакет (уровень) нужен для доступа к разделу
const SECTION_ACCESS = {
    'panel': 1,      // Пакет 1 - Панель инструментов
    'archive': 1,    // Пакет 1 - Архив открыток
    'contacts': 2,   // Пакет 2 - Контакты
    'analytics': 2,  // Пакет 2 - Аналитика
    'referrals': 3,  // Пакет 3 - Реферальная ссылка
    'crm': 4,        // Пакет 4 - CRM система
    'surveys': 5,    // Пакет 5 - Опросы
    'blog': 5,       // Пакет 5 - Блог
    'mailings': 6,   // Пакет 6 - Рассылки
    'studio': 7,     // Пакет 7 - GlobalStudio
    'mlm': 8,        // Пакет 8 - Создание МЛМ
    'organizer': 9,  // Пакет 9 - Организатор бизнеса
    'wallet': 0,     // Всегда доступно
    'settings': 0    // Всегда доступно
};

// Названия пакетов
const LEVEL_NAMES = {
    0: 'Не активирован',
    1: 'Стартовый',
    2: 'Контакты',
    3: 'Партнёр',
    4: 'Бизнес',
    5: 'Маркетолог',
    6: 'Рассылки',
    7: 'Студия',
    8: 'Предприниматель',
    9: 'Организатор',
    10: 'Организатор', 
    11: 'Организатор', 
    12: 'Максимум'
};

// Цвета пакетов
const LEVEL_COLORS = {
    0: '#666',
    1: '#4CAF50',  // Зелёный
    2: '#2196F3',  // Синий
    3: '#9C27B0',  // Фиолетовый
    4: '#FF9800',  // Оранжевый
    5: '#E91E63',  // Розовый
    6: '#00BCD4',  // Бирюзовый
    7: '#FF5722',  // Красно-оранжевый
    8: '#673AB7',  // Тёмно-фиолетовый
    9: '#FFD700',  // Золотой
    10: '#FFD700', 
    11: '#FFD700', 
    12: '#FFD700'
};

// LEVEL_PRICES - БЕРЁМ ТОЛЬКО ИЗ CONFIG! (единственный источник)
const LEVEL_PRICES = window.CONFIG?.LEVEL_PRICES || {
    1: 0.0015, 2: 0.003, 3: 0.006, 4: 0.012, 5: 0.024, 6: 0.048,
    7: 0.096, 8: 0.192, 9: 0.384, 10: 0.768, 11: 1.536, 12: 3.072
};

// ============ STATE ============
let currentUserLevel = 0;
let walletConnected = false;
let walletAddress = null;
let contacts = [];
let cards = [];
let currentSection = 'panel';

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initLanguageSwitcher();
    await initWallet();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    loadContacts();
    await loadCards();
    checkAuthorMode();
    updateAccessLocks();
    updateLevelButtons(); // Обновляем кнопки уровней
    updateUserIds(); // Обновляем блок ID
    setTimeout(showSafePalBanner, 1500);
    
    // Перерендер карточек после определения уровня
    setTimeout(() => {
        console.log('🔄 Re-rendering cards with level:', currentUserLevel);
        renderCards();
    }, 3000);
    
    if (window.location.search.includes('debug=1')) {
        setTimeout(showDebugPanel, 2000);
    }
    
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(`section-${hash}`)) {
        showSection(hash);
    }
});


// ============ SIDEBAR & NAVIGATION ============
function initSidebar() {
    const navItems = document.querySelectorAll('.nav-item');
    const toggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            const requiredLevel = parseInt(item.dataset.level) || 0;
            
            if (currentUserLevel >= requiredLevel) {
                showSection(section);
                closeSidebar();
            } else {
                showToast('Доступ ограничен. Повысьте уровень аккаунта.', 'error');
            }
        });
    });

    if (toggle) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
}

async function showSection(sectionId) {
    // Переход на отдельные страницы
    if (sectionId === 'studio') {
        window.location.href = 'studio.html';
        return;
    }
    if (sectionId === 'ai-studio') {
        window.location.href = 'ai-studio.html';
        return;
    }
    const requiredLevel = SECTION_ACCESS[sectionId] || 0;
    
    if (currentUserLevel < requiredLevel) {
        showToast('Доступ ограничен', 'error');
        return;
    }

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    const section = document.getElementById(`section-${sectionId}`);
    if (section) {
        section.classList.add('active');
        currentSection = sectionId;
        window.location.hash = sectionId;
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });

    if (sectionId === 'contacts') updateContactsCounts();
    if (sectionId === 'archive') await loadCards();
    if (sectionId === 'referrals') updateReferralLink();
}

function updateAccessLocks() {
    document.querySelectorAll('.nav-item').forEach(item => {
        const requiredLevel = parseInt(item.dataset.level) || 0;
        const lock = item.querySelector('.nav-lock');
        
        if (lock) {
            lock.style.display = currentUserLevel >= requiredLevel ? 'none' : 'inline';
        }
        
        item.classList.toggle('locked', currentUserLevel < requiredLevel);
    });
    
    // ✅ FIX v4.3: Обновляем restricted блоки внутри секций
    updateSectionRestrictions();
}

/**
 * ✅ v4.3: Обновление restricted блоков внутри секций
 */
function updateSectionRestrictions() {
    // Referrals - Level 3
    const referralRestricted = document.getElementById('referralRestricted');
    if (referralRestricted) {
        referralRestricted.style.display = currentUserLevel >= 3 ? 'none' : 'block';
    }
    
    // CRM - Level 4
    const crmSection = document.getElementById('section-crm');
    if (crmSection) {
        const crmRestricted = crmSection.querySelector('.restricted-block');
        if (crmRestricted) {
            crmRestricted.style.display = currentUserLevel >= 4 ? 'none' : 'block';
        }
    }
    
    // Surveys - Level 5
    const surveysSection = document.getElementById('section-surveys');
    if (surveysSection) {
        const surveysRestricted = surveysSection.querySelector('.restricted-block');
        if (surveysRestricted) {
            surveysRestricted.style.display = currentUserLevel >= 5 ? 'none' : 'block';
        }
    }
    
    // Blog - Level 5
    const blogSection = document.getElementById('section-blog');
    if (blogSection) {
        const blogRestricted = blogSection.querySelector('.restricted-block');
        if (blogRestricted) {
            blogRestricted.style.display = currentUserLevel >= 5 ? 'none' : 'block';
        }
    }
    
    // Mailings - Level 6
    const mailingsSection = document.getElementById('section-mailings');
    if (mailingsSection) {
        const mailingsRestricted = mailingsSection.querySelector('.restricted-block');
        if (mailingsRestricted) {
            mailingsRestricted.style.display = currentUserLevel >= 6 ? 'none' : 'block';
        }
    }
    
    // MLM - Level 8
    const mlmSection = document.getElementById('section-mlm');
    if (mlmSection) {
        const mlmRestricted = mlmSection.querySelector('.restricted-block');
        if (mlmRestricted) {
            mlmRestricted.style.display = currentUserLevel >= 8 ? 'none' : 'block';
        }
    }
    
    // Organizer - Level 9
    const organizerSection = document.getElementById('section-organizer');
    if (organizerSection) {
        const organizerRestricted = organizerSection.querySelector('.restricted-block');
        if (organizerRestricted) {
            organizerRestricted.style.display = currentUserLevel >= 9 ? 'none' : 'block';
        }
    }
    
    console.log('🔓 Section restrictions updated for level:', currentUserLevel);
}

// ============ DATE/TIME ============
function updateDateTime() {
    const el = document.getElementById('currentDateTime');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleDateString('ru-RU') + ', ' + now.toLocaleTimeString('ru-RU');
    }
}

// ============ LANGUAGE SWITCHER ============
function initLanguageSwitcher() {
    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showToast(`Язык: ${btn.dataset.lang.toUpperCase()}`, 'success');
        });
    });
}


// ============ GLOBAL ACCESS ============
window.showSection = showSection;
window.copyReferralLink = copyReferralLink;
window.shareReferralLink = shareReferralLink;
window.showAddContactModal = showAddContactModal;
window.showImportExportModal = showImportExportModal;
window.addContact = addContact;
window.editContact = editContact;
window.saveEditContact = saveEditContact;
window.deleteContact = deleteContact;
window.messageContact = messageContact;
window.filterByPlatform = filterByPlatform;
window.searchContacts = searchContacts;
window.clearSearch = clearSearch;
window.exportContacts = exportContacts;
window.importContacts = importContacts;
window.viewCard = viewCard;
window.shareCard = shareCard;
window.deleteCard = deleteCard;
window.searchArchive = searchArchive;
window.exportCards = exportCards;
window.forceReloadCards = forceReloadCards;
window.closeModal = closeModal;
window.connectSafePal = connectSafePal;
window.connectMetaMask = connectMetaMask;
window.connectWalletConnect = connectWalletConnect;
window.toggleWalletConnection = toggleWalletConnection;
window.activateLevel = activateLevel;
window.confirmActivation = confirmActivation;
window.showActivationModal = showActivationModal;
window.closeActivationModal = closeActivationModal;
window.updateLevelButtons = updateLevelButtons;
window.updateUserIds = updateUserIds;
window.goToGlobalWay = goToGlobalWay;
window.showGlobalWayRegistrationModal = showGlobalWayRegistrationModal;
window.closeGwRegistrationModal = closeGwRegistrationModal;
window.registerInGlobalWay = registerInGlobalWay;
window.showUpgradeModal = showUpgradeModal;
window.closeUpgradeModal = closeUpgradeModal;
window.showInstallInstructions = showInstallInstructions;
window.closeInstallModal = closeInstallModal;
window.openInSafePal = openInSafePal;
window.installPWA = installPWA;
window.showSafePalBanner = showSafePalBanner;
window.openGlobalWay = openGlobalWay;
window.openGlobalWay = openGlobalWay;

// Функция перехода на генератор
function goToGenerator() {
    console.log('🎨 goToGenerator() called');
    console.log('🔗 Current URL:', window.location.href);
    
    // Сохраняем текущий CG_ID для генератора
    const cgId = window.currentCgId || localStorage.getItem('cardgift_cg_id');
    console.log('👤 CG_ID:', cgId);
    
    // Формируем URL
    let url = 'generator.html';
    if (cgId) {
        url += '?userId=' + cgId;
    }
    
    console.log('🚀 Navigating to:', url);
    
    // Используем разные методы навигации
    try {
        window.location.href = url;
    } catch (e) {
        console.error('❌ Navigation failed:', e);
        // Fallback
        window.open(url, '_self');
    }
}
window.goToGenerator = goToGenerator;


console.log('🎯 Dashboard Core loaded');
