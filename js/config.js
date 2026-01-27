/* =====================================================
   CARDGIFT - CONFIGURATION v2.0
   Единый источник конфигурации проекта
   
   ВАЖНО: Все константы должны браться ТОЛЬКО отсюда!
   Не дублировать в других файлах!
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
    // ЦЕНЫ АКТИВАЦИИ (BNB)
    // ═══════════════════════════════════════════════════════════
    ACTIVATION_PRICES: {
        USER: '0.0015',
        MINI_ADMIN: '0.0225',
        ADMIN: '0.2145',
        SUPER_ADMIN: '0.2145'
    },
    
    // ═══════════════════════════════════════════════════════════
    // ЦЕНЫ УРОВНЕЙ (в BNB)
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
    // CARDGIFT ВЛАДЕЛЬЦЫ
    // ═══════════════════════════════════════════════════════════
    
    // Центральный аккаунт CardGift (все без реферала идут сюда)
    CENTRAL_CG_ID: '9729645',
    CENTRAL_GW_ID: 'GW9729645',
    CENTRAL_FOUNDER: '0x7bcd1753868895971e12448412cb3216d47884c8',
    
    // OWNER и Соавторы системы (имеют доступ к админке)
    COAUTHORS: [
        { 
            cgId: '9729645', 
            gwId: 'GW9729645', 
            wallet: '0x7bcd1753868895971e12448412cb3216d47884c8', 
            name: 'Григорий',
            role: 'owner'
        },
        { 
            cgId: '7346221', 
            gwId: 'GW7346221', 
            wallet: '0x9b49bd9c9458615e11c051afd1ebe983563b67ee', 
            name: 'Соавтор 1',
            role: 'coauthor'
        },
        { 
            cgId: '1514866', 
            gwId: 'GW1514866', 
            wallet: '0x03284a899147f5a07f82c622f34df92198671635', 
            name: 'Соавтор 2',
            role: 'coauthor'
        },
        { 
            cgId: '7649513', 
            gwId: 'GW7649513', 
            wallet: '0xa3496cacc8523421dd151f1d92a456c2dafa28c2', 
            name: 'Соавтор 3',
            role: 'coauthor'
        }
    ],
    
    // Адреса основателей (имеют особые привилегии)
    FOUNDERS: [
        '0x0099188030174e381e7a7ee36d2783ecc31b6728',
        '0xa3496caCC8523421Dd151f1d92A456c2daFa28c2',
        '0x0AB97e3934b1Afc9F1F6447CCF676E4f1D8B9639',
        '0xb0E256cA055937a8FD9CA1F5e3D8A6bD44146d50',
        '0xAB17aDbe29c4E1d695C239206682B02ebdB3f707',
        '0xB5986B808dad481ad86D63DF152cC0ad7B473e48',
        '0x8af1BC6B4a5aACED37889CC06bed4569A6B64044',
        '0x03284A899147f5a07F82C622F34DF92198671635'
    ],
    
    // ═══════════════════════════════════════════════════════════
    // DEV WALLETS (безлимитный доступ к AI Studio и др.)
    // OWNER + Соавторы
    // ═══════════════════════════════════════════════════════════
    DEV_WALLETS: [
        '0x7bcd1753868895971e12448412cb3216d47884c8',  // OWNER (GW9729645)
        '0x9b49bd9c9458615e11c051afd1ebe983563b67ee',  // Соавтор (GW7346221)
        '0x03284a899147f5a07f82c622f34df92198671635',  // Соавтор (GW1514866)
        '0xa3496cacc8523421dd151f1d92a456c2dafa28c2'   // Соавтор (GW7649513)
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
    // USER LEVELS (для совместимости с common.js)
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
window.FOUNDERS_ADDRESSES = CONFIG.FOUNDERS;
window.CENTRAL_FOUNDER = CONFIG.CENTRAL_FOUNDER;
window.DEV_WALLETS = CONFIG.DEV_WALLETS;
window.ROOT_GW_ID = CONFIG.ROOT_GW_ID;
window.LEVEL_PRICES = CONFIG.LEVEL_PRICES;

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Проверка является ли адрес основателем
 */
CONFIG.isFounder = function(address) {
    if (!address) return false;
    return CONFIG.FOUNDERS.some(addr => 
        addr.toLowerCase() === address.toLowerCase()
    );
};

/**
 * Проверка является ли адрес DEV кошельком
 */
CONFIG.isDevWallet = function(address) {
    if (!address) return false;
    return CONFIG.DEV_WALLETS.some(addr => 
        addr.toLowerCase() === address.toLowerCase()
    );
};

/**
 * Проверка является ли адрес соавтором
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

console.log('⚙️ CardGift Config v2.0 loaded');
console.log('   ROOT_GW_ID:', CONFIG.ROOT_GW_ID);
console.log('   CENTRAL_GW_ID:', CONFIG.CENTRAL_GW_ID);
console.log('   DEV_WALLETS:', CONFIG.DEV_WALLETS.length);
console.log('   FOUNDERS:', CONFIG.FOUNDERS.length);
