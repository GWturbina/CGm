/* =====================================================
   CARDGIFT - CONFIGURATION v3.0
   Единый источник конфигурации проекта
   
   ВАЖНО: Все константы должны браться ТОЛЬКО отсюда!
   Не дублировать в других файлах!
   
   v3.0 - Исправлена структура OWNER/Соавторов
        - Только SafePal кошелёк
        - Унифицированы ID
   ===================================================== */

const CONFIG = {
    // ═══════════════════════════════════════════════════════════
    // СЕТЬ opBNB
    // ═══════════════════════════════════════════════════════════
    NETWORK: {
        chainId: 204,
        chainIdHex: '0xCC',
        name: 'opBNB Mainnet',
        rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
        symbol: 'BNB',
        decimals: 18,
        explorer: 'https://opbnbscan.com'
    },
    
    // ═══════════════════════════════════════════════════════════
    // КОШЕЛЁК - ТОЛЬКО SAFEPAL!
    // ═══════════════════════════════════════════════════════════
    WALLET: {
        allowedWallets: ['safepal'],  // ТОЛЬКО SafePal!
        deepLink: 'https://link.safepal.io/dapp?url=',
        autoConnect: true,  // Автоподключение при загрузке
        reconnectOnRefresh: true  // Переподключение при обновлении
    },
    
    // ═══════════════════════════════════════════════════════════
    // API ENDPOINTS
    // ═══════════════════════════════════════════════════════════
    API: {
        baseUrl: '',
        saveCard: '/api/save-card',
        getCard: '/api/card',
        register: '/api/register',
        aiCredits: '/api/ai/credits',
        aiImage: '/api/ai/image',
        aiVoice: '/api/ai/voice',
        aiVoiceFree: '/api/ai/voice-free'
    },
    
    // ═══════════════════════════════════════════════════════════
    // ЦЕНЫ УРОВНЕЙ (в BNB) - ЕДИНСТВЕННЫЙ ИСТОЧНИК!
    // ═══════════════════════════════════════════════════════════
    LEVEL_PRICES: {
        1: 0.0015, 2: 0.003, 3: 0.006, 4: 0.012, 5: 0.024, 6: 0.048,
        7: 0.096, 8: 0.192, 9: 0.384, 10: 0.768, 11: 1.536, 12: 3.072
    },
    
    // ═══════════════════════════════════════════════════════════
    // ЛИМИТЫ
    // ═══════════════════════════════════════════════════════════
    LIMITS: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxArchiveCards: {
            GUEST: 5,
            USER: 20,
            MINI_ADMIN: 100,
            ADMIN: 200,
            SUPER_ADMIN: 500,
            MANAGER: 1000,
            AUTHOR: -1  // Безлимит
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // GLOBALWAY INTEGRATION
    // ═══════════════════════════════════════════════════════════
    
    // Главный ID в GlobalWay (верхушка структуры)
    ROOT_GW_ID: 'GW9729645',
    
    // Bridge контракт
    BRIDGE: {
        address: '0x75231309172544886f27449446A9A2a43D5Ac801',
        chainId: 204,
        projectId: 'CG'
    },
    
    // ═══════════════════════════════════════════════════════════
    // CARDGIFT - ВЛАДЕЛЕЦ И СОАВТОРЫ
    // ═══════════════════════════════════════════════════════════
    
    // OWNER - единственный кто управляет админкой!
    OWNER: {
        wallet: '0x7bcd1753868895971e12448412cb3216d47884c8',
        gwId: 'GW9729645',
        name: 'Григорий'
    },
    
    // Соавторы - НЕ имеют доступа к админке, только расширенные права
    COAUTHORS: [
        { 
            wallet: '0x9b49bd9c9458615e11c051afd1ebe983563b67ee', 
            gwId: 'GW7346221', 
            name: 'Соавтор 1'
        },
        { 
            wallet: '0x03284a899147f5a07f82c622f34df92198671635', 
            gwId: 'GW1514866', 
            name: 'Соавтор 2'
        },
        { 
            wallet: '0xa3496cacc8523421dd151f1d92a456c2dafa28c2', 
            gwId: 'GW7649513', 
            name: 'Соавтор 3'
        }
    ],
    
    // Центральный аккаунт (для рефералов без спонсора)
    CENTRAL_GW_ID: 'GW9729645',
    CENTRAL_WALLET: '0x7bcd1753868895971e12448412cb3216d47884c8',
    
    // ═══════════════════════════════════════════════════════════
    // DEV WALLETS (безлимитный доступ к AI Studio и др.)
    // OWNER + Соавторы = уровень 12 автоматически
    // ═══════════════════════════════════════════════════════════
    DEV_WALLETS: [
        '0x7bcd1753868895971e12448412cb3216d47884c8',  // OWNER
        '0x9b49bd9c9458615e11c051afd1ebe983563b67ee',  // Соавтор 1
        '0x03284a899147f5a07f82c622f34df92198671635',  // Соавтор 2
        '0xa3496cacc8523421dd151f1d92a456c2dafa28c2'   // Соавтор 3
    ],
    
    // ═══════════════════════════════════════════════════════════
    // RANK SYSTEM (from GlobalWay)
    // ═══════════════════════════════════════════════════════════
    RANKS: {
        UNREGISTERED: 0,
        CLIENT: 1,
        MINI_ADMIN: 2,
        ADMIN: 3,
        SUPER_ADMIN: 4,
        BUSINESSMAN: 5
    },
    
    RANK_LIMITS: {
        0: { archive: 0, referralLevels: 0, contacts: false, name: 'Unregistered' },
        1: { archive: 3, referralLevels: 0, contacts: false, name: 'Client' },
        2: { archive: 10, referralLevels: 3, contacts: true, name: 'MiniAdmin' },
        3: { archive: 50, referralLevels: 5, contacts: true, name: 'Admin' },
        4: { archive: 200, referralLevels: 9, contacts: true, name: 'SuperAdmin' },
        5: { archive: -1, referralLevels: 9, contacts: true, name: 'Businessman' }
    },
    
    // ═══════════════════════════════════════════════════════════
    // USER LEVELS (для совместимости)
    // ═══════════════════════════════════════════════════════════
    USER_LEVELS: {
        0: 'GUEST',
        1: 'USER',
        2: 'MINI_ADMIN',
        3: 'ADMIN',
        4: 'SUPER_ADMIN',
        5: 'MANAGER',
        6: 'AUTHOR'
    }
};

// ═══════════════════════════════════════════════════════════
// SUPABASE CONFIGURATION
// ═══════════════════════════════════════════════════════════
window.SUPABASE_URL = 'https://imgpysvdosdsqucoghqa.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZ3B5c3Zkb3Nkc3F1Y29naHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NTU0ODYsImV4cCI6MjA4MjEzMTQ4Nn0.HTRDARe0DkeyI4et9I5xcElToiHzrfJTr2kFpwoik0Y';

// ═══════════════════════════════════════════════════════════
// ГЛОБАЛЬНЫЙ ДОСТУП
// ═══════════════════════════════════════════════════════════
window.CONFIG = CONFIG;

// Удобные алиасы для совместимости со старым кодом
window.USER_LEVELS = CONFIG.USER_LEVELS;
window.DEV_WALLETS = CONFIG.DEV_WALLETS;
window.ROOT_GW_ID = CONFIG.ROOT_GW_ID;
window.LEVEL_PRICES = CONFIG.LEVEL_PRICES;
window.CENTRAL_WALLET = CONFIG.CENTRAL_WALLET;
window.OWNER_WALLET = CONFIG.OWNER.wallet;

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Проверка является ли адрес OWNER (единственный с доступом к админке)
 */
CONFIG.isOwner = function(address) {
    if (!address) return false;
    return CONFIG.OWNER.wallet.toLowerCase() === address.toLowerCase();
};

/**
 * Проверка является ли адрес DEV кошельком (OWNER + Соавторы)
 * Даёт уровень 12 автоматически
 */
CONFIG.isDevWallet = function(address) {
    if (!address) return false;
    return CONFIG.DEV_WALLETS.some(addr => 
        addr.toLowerCase() === address.toLowerCase()
    );
};

/**
 * Проверка является ли адрес соавтором (БЕЗ доступа к админке)
 */
CONFIG.isCoauthor = function(address) {
    if (!address) return false;
    return CONFIG.COAUTHORS.some(author => 
        author.wallet.toLowerCase() === address.toLowerCase()
    );
};

/**
 * Получить информацию о соавторе по адресу
 */
CONFIG.getCoauthorInfo = function(address) {
    if (!address) return null;
    return CONFIG.COAUTHORS.find(author => 
        author.wallet.toLowerCase() === address.toLowerCase()
    ) || null;
};

/**
 * Проверка доступа к админке (ТОЛЬКО OWNER!)
 */
CONFIG.hasAdminAccess = function(address) {
    return CONFIG.isOwner(address);
};

/**
 * Получить роль пользователя
 */
CONFIG.getUserRole = function(address) {
    if (!address) return 'guest';
    if (CONFIG.isOwner(address)) return 'owner';
    if (CONFIG.isCoauthor(address)) return 'coauthor';
    if (CONFIG.isDevWallet(address)) return 'dev';
    return 'user';
};

console.log('⚙️ CardGift Config v3.0 loaded');
console.log('   OWNER:', CONFIG.OWNER.wallet.slice(0,10) + '...');
console.log('   Соавторов:', CONFIG.COAUTHORS.length);
console.log('   DEV_WALLETS:', CONFIG.DEV_WALLETS.length);
console.log('   Только SafePal:', CONFIG.WALLET.allowedWallets);
