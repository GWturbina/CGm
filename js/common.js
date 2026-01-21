/* =====================================================
   CARDGIFT - COMMON JAVASCRIPT v2.0
   Общие функции для всех страниц
   
   ВАЖНО: Константы загружаются из config.js
   Этот файл должен загружаться ПОСЛЕ config.js
   ===================================================== */

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let currentLanguage = 'en';

// ===== КОНСТАНТЫ ИЗ CONFIG.JS (с fallback) =====
// Используем CONFIG если загружен, иначе fallback значения
const ARCHIVE_LIMITS = window.CONFIG?.LIMITS?.maxArchiveCards || {
    GUEST: 5, USER: 20, MINI_ADMIN: 100, ADMIN: 200, 
    SUPER_ADMIN: 500, MANAGER: 1000, AUTHOR: -1
};

const ACTIVATION_PRICES = window.CONFIG?.ACTIVATION_PRICES || {
    USER: '0.0015', MINI_ADMIN: '0.0225', ADMIN: '0.2145', SUPER_ADMIN: '0.2145'
};

const FOUNDERS_ADDRESSES = window.CONFIG?.FOUNDERS || window.FOUNDERS_ADDRESSES || [];
const CENTRAL_FOUNDER = window.CONFIG?.CENTRAL_FOUNDER || '0x0099188030174e381e7a7ee36d2783ecc31b6728';

// ===== БАЗОВЫЕ ПЕРЕВОДЫ =====
const commonTranslations = {
    en: {
        loading: "Loading...",
        error: "Error",
        success: "Success",
        cancel: "Cancel",
        confirm: "Confirm",
        save: "Save",
        close: "Close",
        connectWallet: "Connect Wallet",
        walletConnected: "Wallet Connected",
        disconnectWallet: "Disconnect",
        switchNetwork: "Switch to opBNB",
        networkError: "Network Error"
    },
    ru: {
        loading: "Загрузка...",
        error: "Ошибка",
        success: "Успех",
        cancel: "Отмена",
        confirm: "Подтвердить",
        save: "Сохранить",
        close: "Закрыть",
        connectWallet: "Подключить кошелек",
        walletConnected: "Кошелек подключен",
        disconnectWallet: "Отключить",
        switchNetwork: "Переключить на opBNB",
        networkError: "Ошибка сети"
    },
    ua: {
        loading: "Завантаження...",
        error: "Помилка",
        success: "Успіх",
        cancel: "Скасувати",
        confirm: "Підтвердити",
        save: "Зберегти",
        close: "Закрити",
        connectWallet: "Підключити гаманець",
        walletConnected: "Гаманець підключено",
        disconnectWallet: "Відключити",
        switchNetwork: "Переключити на opBNB",
        networkError: "Помилка мережі"
    }
};

// ===== КЛАСС УВЕДОМЛЕНИЙ =====
class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = [];
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createContainer());
        } else {
            this.createContainer();
        }
    }

    createContainer() {
        this.container = document.getElementById('notificationContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = 3000) {
        if (!this.container) this.createContainer();

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        const id = Date.now() + Math.random();
        notification.dataset.id = id;

        this.container.appendChild(notification);
        this.notifications.push({ id, element: notification, timeout: null });

        setTimeout(() => notification.classList.add('show'), 100);

        const timeoutId = setTimeout(() => this.remove(id), duration);

        const notifIndex = this.notifications.findIndex(n => n.id === id);
        if (notifIndex !== -1) {
            this.notifications[notifIndex].timeout = timeoutId;
        }

        notification.addEventListener('click', () => this.remove(id));

        return id;
    }

    remove(id) {
        const notifIndex = this.notifications.findIndex(n => n.id === id);
        if (notifIndex === -1) return;

        const notification = this.notifications[notifIndex];

        if (notification.timeout) {
            clearTimeout(notification.timeout);
        }

        notification.element.classList.remove('show');

        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            this.notifications.splice(notifIndex, 1);
        }, 400);
    }

    clear() {
        this.notifications.forEach(notification => {
            if (notification.timeout) clearTimeout(notification.timeout);
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
        });
        this.notifications = [];
    }
}

// Глобальный экземпляр
const notificationManager = new NotificationManager();

// ===== КЛАСС УПРАВЛЕНИЯ УРОВНЯМИ =====
class UserLevelManager {
    constructor() {
        this.levels = {
            0: { name: 'GUEST', cardLimit: 5, archiveLimit: 0, features: ['Basic cards'] },
            1: { name: 'USER', cardLimit: 20, archiveLimit: 20, features: ['Archive', 'Basic sharing'] },
            2: { name: 'MINI', cardLimit: 100, archiveLimit: 100, features: ['Advanced sharing', 'Templates'] },
            3: { name: 'ADMIN', cardLimit: 200, archiveLimit: 200, features: ['All features', 'Priority support'] },
            4: { name: 'SUPER', cardLimit: 500, archiveLimit: 500, features: ['Unlimited sharing', 'Custom branding'] },
            5: { name: 'MANAGER', cardLimit: 1000, archiveLimit: 1000, features: ['Team features', 'Analytics'] },
            6: { name: 'AUTHOR', cardLimit: -1, archiveLimit: -1, features: ['Unlimited everything', 'Co-author access'] }
        };
    }

    getLevelInfo(level) {
        return this.levels[level] || this.levels[0];
    }

    getCardLimit(level) {
        const info = this.getLevelInfo(level);
        return info.cardLimit === -1 ? '∞' : info.cardLimit;
    }

    getArchiveLimit(level) {
        const info = this.getLevelInfo(level);
        return info.archiveLimit === -1 ? '∞' : info.archiveLimit;
    }

    canCreateCard(level, currentCount) {
        const info = this.getLevelInfo(level);
        return info.cardLimit === -1 || currentCount < info.cardLimit;
    }

    canSaveToArchive(level, currentArchiveCount) {
        const info = this.getLevelInfo(level);
        return info.archiveLimit === -1 || currentArchiveCount < info.archiveLimit;
    }

    getLevelBadgeClass(level) {
        return `user-level-${level}`;
    }

    updateUserInterface(user) {
        if (!user) return;

        const levelInfo = this.getLevelInfo(user.level);

        const badge = document.getElementById('userLevelBadge');
        if (badge) {
            badge.className = `user-level-badge ${this.getLevelBadgeClass(user.level)}`;
            badge.textContent = levelInfo.name;
        }

        const cardsElement = document.getElementById('userCards');
        if (cardsElement) {
            const currentCount = user.cardCount || 0;
            const limit = this.getCardLimit(user.level);
            cardsElement.textContent = `Cards: ${currentCount}/${limit}`;
        }
    }
}

const levelManager = new UserLevelManager();

// ===== СОСТОЯНИЕ КОШЕЛЬКА =====
const walletState = {
    save(data) {
        try {
            localStorage.setItem('walletState', JSON.stringify({
                ...data,
                savedAt: Date.now()
            }));
        } catch (e) {
            console.warn('Failed to save wallet state:', e);
        }
    },

    load() {
        try {
            const data = localStorage.getItem('walletState');
            if (data) {
                const parsed = JSON.parse(data);
                if (Date.now() - parsed.savedAt < 24 * 60 * 60 * 1000) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Failed to load wallet state:', e);
        }
        return null;
    },

    clear() {
        localStorage.removeItem('walletState');
        localStorage.removeItem('currentUser');
    }
};

// ===== ФУНКЦИИ ЯЗЫКА =====
function detectLanguage() {
    const urlParams = new URLSearchParams(window.location.search);
    const langFromUrl = urlParams.get('lang');

    if (langFromUrl && ['en', 'ru', 'ua'].includes(langFromUrl)) {
        return langFromUrl;
    }

    // Унифицированный ключ + старый для обратной совместимости
    const savedLang = localStorage.getItem('cardgift_language') || localStorage.getItem('selectedLanguage');
    if (savedLang && ['en', 'ru', 'ua'].includes(savedLang)) {
        return savedLang;
    }

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
    if (langBtn) {
        langBtn.classList.add('active');
    }

    if (typeof updateAllTexts === 'function') {
        updateAllTexts();
    }
}

// ===== УТИЛИТЫ БЕЗОПАСНОСТИ =====
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
        .replace(/<\/script>/gi, '')
        .replace(/<iframe/gi, '')
        .replace(/<object/gi, '')
        .replace(/<embed/gi, '');
}

// ===== ФИЛЬТРАЦИЯ КОНТЕНТА =====
const forbiddenWords = [
    'блядь', 'сука', 'хуй', 'пизда', 'ебать', 'ублюдок', 'мудак', 'гавно',
    'говно', 'дерьмо', 'срать', 'срака', 'жопа', 'пидор', 'педик',
    'порно', 'секс', 'трах', 'ебля', 'минет', 'оргия', 'мастурбация',
    'porn', 'sex', 'fuck', 'pussy', 'dick', 'cock', 'bitch', 'whore',
    'убить', 'убийство', 'смерть', 'кровь', 'расстрел', 'повесить',
    'зарезать', 'kill', 'murder', 'death', 'blood', 'violence',
    'героин', 'кокаин', 'марихуана', 'наркотик', 'наркота', 'трава',
    'drugs', 'cocaine', 'heroin', 'marijuana', 'weed',
    'фашист', 'нацист', 'расизм', 'экстремизм', 'терроризм',
    'fascist', 'nazi', 'racism', 'extremism', 'terrorism'
];

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
        console.warn('🚫 Inappropriate content detected:', foundBadWords);
        return {
            isClean: false,
            text: text,
            badWords: foundBadWords,
            message: 'Text contains inappropriate content'
        };
    }

    return { isClean: true, text: text };
}

// ===== ГЕНЕРАЦИЯ ID =====
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

// ===== КОНВЕРТАЦИЯ ФАЙЛОВ =====
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ===== СОЗДАНИЕ ХЕША =====
async function createSecureHash(data) {
    try {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.warn('Could not create hash:', error);
        return 'hash_' + Date.now();
    }
}

// ===== WEB3 ФУНКЦИИ =====
function getWalletAddress() {
    if (window.safepal?.ethereum?.selectedAddress) {
        return window.safepal.ethereum.selectedAddress;
    }
    if (window.safePal?.ethereum?.selectedAddress) {
        return window.safePal.ethereum.selectedAddress;
    }
    if (window.ethereum?.isSafePal && window.ethereum.selectedAddress) {
        return window.ethereum.selectedAddress;
    }
    if (typeof walletAddress !== 'undefined' && walletAddress) {
        return walletAddress;
    }
    if (window.ethereum?.selectedAddress) {
        return window.ethereum.selectedAddress;
    }
    return null;
}

async function switchToOpBNB() {
    if (!window.ethereum) {
        throw new Error('Wallet not found');
    }

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xCC' }]
        });
        return true;
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
            return true;
        }
        throw switchError;
    }
}

async function checkNetwork() {
    if (!window.ethereum) return null;

    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        return parseInt(chainId, 16);
    } catch (error) {
        console.error('Network check failed:', error);
        return null;
    }
}

function isFounder(address) {
    if (!address) return false;
    // Используем CONFIG.isFounder если доступен
    if (window.CONFIG?.isFounder) {
        return window.CONFIG.isFounder(address);
    }
    return FOUNDERS_ADDRESSES.some(addr => 
        addr.toLowerCase() === address.toLowerCase()
    );
}

function isAuthor(address) {
    if (!address) return false;
    // Проверяем соавторов через CONFIG если доступен
    if (window.CONFIG?.isCoauthor) {
        return window.CONFIG.isCoauthor(address);
    }
    return CENTRAL_FOUNDER.toLowerCase() === address.toLowerCase();
}

// ===== КОПИРОВАНИЕ В БУФЕР =====
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            notificationManager.show('📋 Copied!', 'success');
        }).catch(() => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
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

// ===== ЭКСПОРТ =====
window.notificationManager = notificationManager;
window.levelManager = levelManager;
window.walletState = walletState;
window.detectLanguage = detectLanguage;
window.switchLanguage = switchLanguage;
window.sanitizeInput = sanitizeInput;
window.checkContent = checkContent;
window.generateUserId = generateUserId;
window.generateUniqueCardId = generateUniqueCardId;
window.fileToBase64 = fileToBase64;
window.createSecureHash = createSecureHash;
window.getWalletAddress = getWalletAddress;
window.switchToOpBNB = switchToOpBNB;
window.checkNetwork = checkNetwork;
window.isFounder = isFounder;
window.isAuthor = isAuthor;
window.copyToClipboard = copyToClipboard;
window.ARCHIVE_LIMITS = ARCHIVE_LIMITS;
window.FOUNDERS_ADDRESSES = FOUNDERS_ADDRESSES;
window.CENTRAL_FOUNDER = CENTRAL_FOUNDER;
window.commonTranslations = commonTranslations;

console.log('✅ CardGift Common JS v2.0 loaded');
console.log('   CONFIG loaded:', !!window.CONFIG);
