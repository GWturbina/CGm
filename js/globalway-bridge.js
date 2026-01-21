/* =====================================================
   CARDGIFT - GLOBALWAY BRIDGE INTEGRATION
   v2.0 - Полная интеграция с уровнями 1-12
   ===================================================== */

const GlobalWayBridge = {
    // ═══════════════════════════════════════════════════════════
    // КОНФИГУРАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    // Адреса контрактов на opBNB Mainnet
    GLOBALWAY_ADDRESS: '0xc6E769A790cE87f9Dd952Dca6Ac1A9526Bc0FBe7',
    BRIDGE_ADDRESS: '0x75231309172544886f27449446A9A2a43D5Ac801',
    MATRIX_REGISTRY_ADDRESS: '0xC12b57B8B4BcE9134788FBb2290Cf4d496c4eE4a',
    
    CHAIN_ID: 204, // opBNB Mainnet
    RPC_URL: 'https://opbnb-mainnet-rpc.bnbchain.org',
    
    // ROOT спонсор (для компрессии когда никого нет в цепочке)
    ROOT_GW_ID: 'GW9729645',
    ROOT_GW_NUMERIC_ID: 9729645, // Числовой ID для контракта
    
    // ═══════════════════════════════════════════════════════════
    // ЦЕНЫ УРОВНЕЙ (в BNB/opBNB)
    // ═══════════════════════════════════════════════════════════
    
    LEVEL_PRICES: {
        1: '0.0015',
        2: '0.003',
        3: '0.006',
        4: '0.012',
        5: '0.024',
        6: '0.048',
        7: '0.096',
        8: '0.192',
        9: '0.384',
        10: '0.768',
        11: '1.536',
        12: '3.072'
    },
    
    // Токены GWT за уровень
    TOKEN_REWARDS: {
        1: 5, 2: 5, 3: 10, 4: 15, 5: 35, 6: 75,
        7: 150, 8: 300, 9: 600, 10: 1200, 11: 2400, 12: 4500
    },
    
    // ═══════════════════════════════════════════════════════════
    // МАППИНГ ПАКЕТОВ (1-9) НА ФУНКЦИИ CARDGIFT
    // Пакет = Уровень в GlobalWay
    // ═══════════════════════════════════════════════════════════
    
    LEVEL_ACCESS: {
        // Пакет 0: Не активирован (только генератор без сохранения)
        0:  { archive: false, panel: false, contacts: false, analytics: false, referralLevels: 0, crm: false, surveys: false, blog: false, mailings: false, studio: false, mlm: false, organizer: false },
        // Пакет 1: Стартовый - Архив + Панель
        1:  { archive: true, panel: true, contacts: false, analytics: false, referralLevels: 0, crm: false, surveys: false, blog: false, mailings: false, studio: false, mlm: false, organizer: false },
        // Пакет 2: Контакты + Аналитика
        2:  { archive: true, panel: true, contacts: true, analytics: true, referralLevels: 0, crm: false, surveys: false, blog: false, mailings: false, studio: false, mlm: false, organizer: false },
        // Пакет 3: Реферальная ссылка (1 уровень)
        3:  { archive: true, panel: true, contacts: true, analytics: true, referralLevels: 1, crm: false, surveys: false, blog: false, mailings: false, studio: false, mlm: false, organizer: false },
        // Пакет 4: CRM (2-3 уровня)
        4:  { archive: true, panel: true, contacts: true, analytics: true, referralLevels: 3, crm: true, surveys: false, blog: false, mailings: false, studio: false, mlm: false, organizer: false },
        // Пакет 5: Опросы + Блог
        5:  { archive: true, panel: true, contacts: true, analytics: true, referralLevels: 3, crm: true, surveys: true, blog: true, mailings: false, studio: false, mlm: false, organizer: false },
        // Пакет 6: Рассылки
        6:  { archive: true, panel: true, contacts: true, analytics: true, referralLevels: 3, crm: true, surveys: true, blog: true, mailings: true, studio: false, mlm: false, organizer: false },
        // Пакет 7: GlobalStudio (4-5 уровней)
        7:  { archive: true, panel: true, contacts: true, analytics: true, referralLevels: 5, crm: true, surveys: true, blog: true, mailings: true, studio: true, mlm: false, organizer: false },
        // Пакет 8: МЛМ (6-7 уровней)
        8:  { archive: true, panel: true, contacts: true, analytics: true, referralLevels: 7, crm: true, surveys: true, blog: true, mailings: true, studio: true, mlm: true, organizer: false },
        // Пакет 9: Организатор (8-9 уровней)
        9:  { archive: true, panel: true, contacts: true, analytics: true, referralLevels: 9, crm: true, surveys: true, blog: true, mailings: true, studio: true, mlm: true, organizer: true },
        // Уровни 10-12 для совместимости = Пакет 9
        10: { archive: true, panel: true, contacts: true, analytics: true, referralLevels: 9, crm: true, surveys: true, blog: true, mailings: true, studio: true, mlm: true, organizer: true },
        11: { archive: true, panel: true, contacts: true, analytics: true, referralLevels: 9, crm: true, surveys: true, blog: true, mailings: true, studio: true, mlm: true, organizer: true },
        12: { archive: true, panel: true, contacts: true, analytics: true, referralLevels: 9, crm: true, surveys: true, blog: true, mailings: true, studio: true, mlm: true, organizer: true }
    },
    
    // Названия пакетов
    LEVEL_NAMES: {
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
        10: 'Организатор', 11: 'Организатор', 12: 'Максимум'
    },
    
    // ═══════════════════════════════════════════════════════════
    // СЕЛЕКТОРЫ ФУНКЦИЙ (keccak256 первые 4 байта)
    // ═══════════════════════════════════════════════════════════
    
    SELECTORS: {
        // GlobalWay контракт
        getUserMaxLevel: '0x7bc4cf17',      // getUserMaxLevel(address)
        isUserRegistered: '0x163f7522',     // isUserRegistered(address)
        isLevelActive: '0x3e8eba9d',        // isLevelActive(address,uint8)
        register: '0x1aa3a008',             // register(uint256)
        activateLevel: '0x68a69bc7',        // activateLevel(uint8)
        levelPrices: '0x67b1f42e',          // levelPrices(uint8)
        
        // MatrixRegistry контракт
        getUserIdByAddress: '0x6d166867',   // getUserIdByAddress(address)
        isRegisteredMatrix: '0xc3c5a547',   // isRegistered(address)
        
        // Bridge контракт (для справки)
        getUserRank: '0xb2d1573f',          // getUserRank(address)
        getUserStatus: '0xea0d5dcd'         // getUserStatus(string,address)
    },
    
    // ═══════════════════════════════════════════════════════════
    // СОСТОЯНИЕ
    // ═══════════════════════════════════════════════════════════
    
    provider: null,
    isInitialized: false,
    cachedLevels: {}, // Кэш уровней пользователей
    
    // ═══════════════════════════════════════════════════════════
    // ИНИЦИАЛИЗАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    getProvider: function() {
        if (window.safepalProvider) return window.safepalProvider;
        if (window.safepal && window.safepal.ethereum) return window.safepal.ethereum;
        if (window.ethereum && window.ethereum.isSafePal) return window.ethereum;
        if (window.ethereum && window.ethereum.providers) {
            var sp = window.ethereum.providers.find(function(p) { return p.isSafePal; });
            if (sp) return sp;
        }
        if (window.ethereum) return window.ethereum;
        return null;
    },
    
    async init() {
        var provider = this.getProvider();
        
        if (!provider) {
            console.log('⚠️ GlobalWayBridge: No wallet, using RPC only');
        } else {
            console.log('✅ GlobalWayBridge: Provider found');
            this.provider = provider;
        }
        
        this.isInitialized = true;
        console.log('✅ GlobalWayBridge v2.0 initialized');
        return true;
    },
    
    // ═══════════════════════════════════════════════════════════
    // СЕТЬ
    // ═══════════════════════════════════════════════════════════
    
    async checkNetwork() {
        var provider = this.getProvider();
        if (!provider) return false;
        try {
            var chainId = await provider.request({ method: 'eth_chainId' });
            return parseInt(chainId, 16) === this.CHAIN_ID;
        } catch (e) {
            return false;
        }
    },
    
    async switchToOpBNB() {
        var provider = this.getProvider();
        if (!provider) return false;
        
        try {
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xCC' }]
            });
            return true;
        } catch (e) {
            if (e.code === 4902) {
                await provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0xCC',
                        chainName: 'opBNB Mainnet',
                        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                        rpcUrls: [this.RPC_URL],
                        blockExplorerUrls: ['https://opbnbscan.com']
                    }]
                });
                return true;
            }
            console.error('Switch network error:', e);
            return false;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПОЛУЧЕНИЕ УРОВНЯ ПОЛЬЗОВАТЕЛЯ (1-12)
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Получить максимальный активный уровень пользователя (1-12)
     * @param {string} walletAddress - Адрес кошелька
     * @returns {number} Уровень 0-12 (0 = не активирован)
     */
    async getUserLevel(walletAddress) {
        // Проверяем FOUNDERS/OWNER сначала (hardcoded для гарантии)
        var wallet = walletAddress.toLowerCase();
        var ownerAddresses = [
            '0x7bcd1753868895971e12448412cb3216d47884c8', // Owner 1
            '0x03284a899147f5a07f82c622f34df92198671635'  // Owner 2
        ];
        
        if (ownerAddresses.includes(wallet)) {
            console.log('👑 Owner detected, level 12');
            return 12;
        }
        
        // Проверяем кэш
        if (this.cachedLevels[walletAddress.toLowerCase()]) {
            var cached = this.cachedLevels[walletAddress.toLowerCase()];
            if (Date.now() - cached.timestamp < 60000) { // 1 минута
                console.log('📦 Using cached level:', cached.level);
                return cached.level;
            }
        }
        
        try {
            var level = await this._getUserMaxLevelRPC(walletAddress);
            
            // Кэшируем
            this.cachedLevels[walletAddress.toLowerCase()] = {
                level: level,
                timestamp: Date.now()
            };
            
            console.log('✅ User level from contract:', level);
            return level;
        } catch (error) {
            console.error('getUserLevel error:', error);
            return 0;
        }
    },
    
    /**
     * Получить уровень используя ethers.js (как GlobalWay делает)
     */
    async _getUserMaxLevelEthers(walletAddress) {
        console.log('🔄 Trying ethers.js for getUserMaxLevel...');
        
        // Ждём загрузки ethers если нужно
        let attempts = 0;
        while (!window.ethers && attempts < 10) {
            console.log('⏳ Waiting for ethers.js...', attempts);
            await new Promise(r => setTimeout(r, 200));
            attempts++;
        }
        
        if (!window.ethers) {
            console.warn('❌ ethers.js not loaded after waiting');
            return null;
        }
        
        console.log('✅ ethers.js available');
        
        try {
            // Создаём провайдер
            var provider = new ethers.providers.JsonRpcProvider(this.RPC_URL);
            console.log('✅ Provider created for RPC:', this.RPC_URL);
            
            // Пробуем MatrixRegistry (основной контракт для уровней)
            try {
                console.log('📡 Calling MatrixRegistry.getUserMaxLevel...');
                var abiMatrix = ['function getUserMaxLevel(address user) view returns (uint8)'];
                var contractMatrix = new ethers.Contract(this.MATRIX_REGISTRY_ADDRESS, abiMatrix, provider);
                var level = await contractMatrix.getUserMaxLevel(walletAddress);
                console.log('✅ Level from ethers.js (MatrixRegistry):', Number(level));
                return Number(level);
            } catch (e1) {
                console.warn('❌ MatrixRegistry getUserMaxLevel failed:', e1.message);
            }
            
            // Fallback на GlobalWay контракт
            try {
                console.log('📡 Calling GlobalWay.getUserMaxLevel...');
                var abiGW = ['function getUserMaxLevel(address user) view returns (uint8)'];
                var contractGW = new ethers.Contract(this.GLOBALWAY_ADDRESS, abiGW, provider);
                var level = await contractGW.getUserMaxLevel(walletAddress);
                console.log('✅ Level from ethers.js (GlobalWay):', Number(level));
                return Number(level);
            } catch (e2) {
                console.warn('❌ GlobalWay getUserMaxLevel failed:', e2.message);
            }
        } catch (e) {
            console.warn('❌ ethers.js call failed:', e);
        }
        return null;
    },
    
    /**
     * RPC вызов getUserMaxLevel (fallback)
     */
    async _getUserMaxLevelRPC(walletAddress) {
        // Сначала пробуем через ethers.js
        var ethersLevel = await this._getUserMaxLevelEthers(walletAddress);
        if (ethersLevel !== null) {
            return ethersLevel;
        }
        
        // Fallback на прямой RPC - пробуем MatrixRegistry (там хранится уровень)
        try {
            var addressClean = walletAddress.toLowerCase().replace('0x', '');
            var addressPadded = addressClean.padStart(64, '0');
            var data = this.SELECTORS.getUserMaxLevel + addressPadded;
            
            // Пробуем сначала MatrixRegistry
            console.log('📡 RPC call to MatrixRegistry:', this.MATRIX_REGISTRY_ADDRESS);
            console.log('📡 Data:', data);
            
            var response = await fetch(this.RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_call',
                    params: [{ to: this.MATRIX_REGISTRY_ADDRESS, data: data }, 'latest'],
                    id: 1
                })
            });
            
            var result = await response.json();
            console.log('📡 MatrixRegistry RPC result:', result);
            
            if (result.result && result.result !== '0x' && result.result !== '0x0') {
                var level = parseInt(result.result, 16);
                console.log('✅ Level from MatrixRegistry RPC:', level);
                return level;
            }
            
            // Если MatrixRegistry не сработал - пробуем GlobalWay
            console.log('📡 Trying GlobalWay contract...');
            var response2 = await fetch(this.RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_call',
                    params: [{ to: this.GLOBALWAY_ADDRESS, data: data }, 'latest'],
                    id: 2
                })
            });
            
            var result2 = await response2.json();
            console.log('📡 GlobalWay RPC result:', result2);
            
            if (result2.result && result2.result !== '0x' && result2.result !== '0x0') {
                var level = parseInt(result2.result, 16);
                console.log('✅ Level from GlobalWay RPC:', level);
                return level;
            }
            
            console.log('⚠️ Both contracts returned empty/zero');
            return 0;
        } catch (e) {
            console.error('_getUserMaxLevelRPC error:', e);
            return 0;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПРОВЕРКА РЕГИСТРАЦИИ В GLOBALWAY
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Проверить зарегистрирован ли пользователь в GlobalWay
     * Использует MatrixRegistry.isRegistered() как в оригинальном GlobalWay
     * @param {string} walletAddress - Адрес кошелька
     * @returns {boolean} true если зарегистрирован
     */
    async isRegisteredInGlobalWay(walletAddress) {
        // Сначала пробуем через ethers.js
        try {
            if (window.ethers && (window.web3Manager?.provider || this.provider)) {
                var provider = window.web3Manager?.provider || 
                               new ethers.providers.JsonRpcProvider(this.RPC_URL);
                
                // Используем MatrixRegistry как в GlobalWay app.js
                var abi = ['function isRegistered(address user) view returns (bool)'];
                var contract = new ethers.Contract(this.MATRIX_REGISTRY_ADDRESS, abi, provider);
                
                var isRegistered = await contract.isRegistered(walletAddress);
                console.log('✅ isRegistered from ethers (MatrixRegistry):', isRegistered);
                return isRegistered;
            }
        } catch (e) {
            console.warn('ethers.js isRegistered failed:', e);
        }
        
        // Fallback на RPC - MatrixRegistry контракт
        try {
            var addressClean = walletAddress.toLowerCase().replace('0x', '');
            var addressPadded = addressClean.padStart(64, '0');
            var data = this.SELECTORS.isRegisteredMatrix + addressPadded;
            
            console.log('📡 Checking registration on MatrixRegistry:', this.MATRIX_REGISTRY_ADDRESS);
            
            var response = await fetch(this.RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_call',
                    params: [{ to: this.MATRIX_REGISTRY_ADDRESS, data: data }, 'latest'],
                    id: 1
                })
            });
            
            var result = await response.json();
            console.log('📡 MatrixRegistry isRegistered result:', result);
            
            if (result.result && result.result !== '0x') {
                var isRegistered = parseInt(result.result, 16) === 1;
                console.log('✅ isRegisteredInGlobalWay:', isRegistered);
                return isRegistered;
            }
            
            return false;
        } catch (e) {
            console.error('isRegisteredInGlobalWay error:', e);
            return false;
        }
    },
    
    /**
     * Получить GW ID пользователя по адресу кошелька
     * @param {string} walletAddress - Адрес кошелька
     * @returns {string|null} GW ID (числовой, например "3236084") или null
     */
    async getGlobalWayId(walletAddress) {
        console.log('🔍 Getting GW ID for:', walletAddress);
        
        // Сначала пробуем через ethers.js
        if (window.ethers) {
            try {
                const provider = new ethers.providers.JsonRpcProvider(this.RPC_URL);
                
                // MatrixRegistry.getUserIdByAddress
                const abi = ['function getUserIdByAddress(address user) view returns (uint256)'];
                const contract = new ethers.Contract(this.MATRIX_REGISTRY_ADDRESS, abi, provider);
                const userId = await contract.getUserIdByAddress(walletAddress);
                
                if (userId && userId.toString() !== '0') {
                    console.log('✅ GW ID from ethers.js:', userId.toString());
                    return userId.toString();
                }
            } catch (e) {
                console.warn('ethers.js getUserIdByAddress failed:', e.message);
            }
        }
        
        // Fallback на RPC
        try {
            var data = this.SELECTORS.getUserIdByAddress + 
                       walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
            
            var response = await fetch(this.RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_call',
                    params: [{ to: this.MATRIX_REGISTRY_ADDRESS, data: data }, 'latest'],
                    id: 1
                })
            });
            
            var result = await response.json();
            
            if (result.result && result.result !== '0x' && result.result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                var numericId = parseInt(result.result, 16);
                if (numericId > 0) {
                    console.log('✅ GW ID from RPC:', numericId);
                    return numericId.toString();
                }
            }
            
            return null;
        } catch (e) {
            console.error('getGlobalWayId error:', e);
            return null;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // РЕГИСТРАЦИЯ В GLOBALWAY
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Регистрация в GlobalWay
     * @param {number} sponsorNumericId - Числовой ID спонсора (без GW префикса)
     * @returns {object} { success: boolean, txHash: string, error: string }
     */
    async registerInGlobalWay(sponsorNumericId) {
        var provider = this.getProvider();
        if (!provider) {
            return { success: false, error: 'Кошелёк не найден' };
        }
        
        try {
            // Проверяем сеть
            var isCorrectNetwork = await this.checkNetwork();
            if (!isCorrectNetwork) {
                await this.switchToOpBNB();
            }
            
            // Получаем адрес пользователя
            var accounts = await provider.request({ method: 'eth_accounts' });
            if (!accounts || accounts.length === 0) {
                accounts = await provider.request({ method: 'eth_requestAccounts' });
            }
            var userAddress = accounts[0];
            
            // Кодируем вызов register(uint256 sponsorId)
            var sponsorHex = sponsorNumericId.toString(16).padStart(64, '0');
            var data = this.SELECTORS.register + sponsorHex;
            
            // Отправляем транзакцию (регистрация бесплатная, только газ)
            var txHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: userAddress,
                    to: this.GLOBALWAY_ADDRESS,
                    data: data,
                    value: '0x0'
                }]
            });
            
            console.log('✅ Registration TX:', txHash);
            return { success: true, txHash: txHash };
            
        } catch (error) {
            console.error('registerInGlobalWay error:', error);
            return { success: false, error: error.message || 'Ошибка регистрации' };
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // АКТИВАЦИЯ УРОВНЯ
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Активация уровня в GlobalWay
     * @param {number} level - Уровень для активации (1-12)
     * @returns {object} { success: boolean, txHash: string, error: string }
     */
    async activateLevel(level) {
        var provider = this.getProvider();
        if (!provider) {
            return { success: false, error: 'Кошелёк не найден' };
        }
        
        if (level < 1 || level > 12) {
            return { success: false, error: 'Неверный уровень' };
        }
        
        try {
            // Проверяем сеть
            var isCorrectNetwork = await this.checkNetwork();
            if (!isCorrectNetwork) {
                await this.switchToOpBNB();
            }
            
            // Получаем адрес пользователя
            var accounts = await provider.request({ method: 'eth_accounts' });
            if (!accounts || accounts.length === 0) {
                accounts = await provider.request({ method: 'eth_requestAccounts' });
            }
            var userAddress = accounts[0];
            
            // Цена уровня
            var price = this.LEVEL_PRICES[level];
            var priceWei = this._toWei(price);
            
            // Кодируем вызов activateLevel(uint8 level)
            var levelHex = level.toString(16).padStart(64, '0');
            var data = this.SELECTORS.activateLevel + levelHex;
            
            // Отправляем транзакцию
            var txHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: userAddress,
                    to: this.GLOBALWAY_ADDRESS,
                    data: data,
                    value: priceWei
                }]
            });
            
            console.log('✅ Activation TX:', txHash);
            
            // Очищаем кэш уровня
            delete this.cachedLevels[userAddress.toLowerCase()];
            
            return { success: true, txHash: txHash };
            
        } catch (error) {
            console.error('activateLevel error:', error);
            return { success: false, error: error.message || 'Ошибка активации' };
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Конвертация BNB в Wei (hex)
     */
    _toWei: function(bnbAmount) {
        var wei = parseFloat(bnbAmount) * 1e18;
        return '0x' + Math.floor(wei).toString(16);
    },
    
    /**
     * Парсинг GW ID в числовой формат
     * "GW1234567" → 1234567
     */
    parseGwId: function(gwId) {
        if (!gwId) return null;
        var match = gwId.match(/GW(\d+)/i);
        return match ? parseInt(match[1]) : null;
    },
    
    /**
     * Получить доступы для уровня
     */
    getAccessForLevel: function(level) {
        return this.LEVEL_ACCESS[level] || this.LEVEL_ACCESS[0];
    },
    
    /**
     * Получить название уровня
     */
    getLevelName: function(level) {
        return this.LEVEL_NAMES[level] || 'Не активирован';
    },
    
    /**
     * Получить цену уровня
     */
    getLevelPrice: function(level) {
        return this.LEVEL_PRICES[level] || '0';
    },
    
    /**
     * Получить награду токенов за уровень
     */
    getTokenReward: function(level) {
        return this.TOKEN_REWARDS[level] || 0;
    },
    
    /**
     * Проверить доступ к функции по уровню
     */
    hasAccess: function(level, feature) {
        var access = this.getAccessForLevel(level);
        switch (feature) {
            case 'archive': return level >= 1;
            case 'contacts': return access.contacts;
            case 'referrals': return access.referralLevels > 0;
            case 'crm': return access.crm;
            case 'surveys': return access.surveys;
            case 'blog': return access.blog;
            case 'mailings': return access.mailings;
            case 'analytics': return access.analytics;
            case 'mlm': return access.mlm;
            case 'coauthors': return access.coauthors;
            default: return false;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // LEGACY: Совместимость со старым кодом (getUserRank)
    // ═══════════════════════════════════════════════════════════
    
    /**
     * @deprecated Используйте getUserLevel()
     * Возвращает ранг 0-5 для обратной совместимости
     */
    async getUserRank(walletAddress) {
        var level = await this.getUserLevel(walletAddress);
        // Конвертируем уровень в ранг
        if (level === 0) return 0;
        if (level <= 3) return 1;  // Client
        if (level <= 6) return 2;  // MiniAdmin
        if (level <= 8) return 3;  // Admin
        if (level === 9) return 4; // SuperAdmin
        return 5; // Businessman
    },
    
    // Legacy названия рангов
    RANK_NAMES: {
        0: 'Unregistered',
        1: 'Client',
        2: 'MiniAdmin',
        3: 'Admin',
        4: 'SuperAdmin',
        5: 'Businessman'
    },
    
    getRankName: function(rank) {
        return this.RANK_NAMES[rank] || 'Unknown';
    }
};

// ═══════════════════════════════════════════════════════════
// ФУНКЦИЯ КОМПРЕССИИ - Поиск спонсора GlobalWay
// ═══════════════════════════════════════════════════════════

/**
 * Найти спонсора в GlobalWay с компрессией
 * Идёт вверх по цепочке CardGift пока не найдёт того, кто уже в GlobalWay
 * 
 * @param {string} userCgId - CG ID пользователя
 * @param {object} supabase - Supabase клиент
 * @returns {number} Числовой GW ID спонсора
 */
async function findGlobalWaySponsor(userCgId, supabase) {
    let currentCgId = userCgId;
    let depth = 0;
    const MAX_DEPTH = 100;
    
    console.log('🔍 Поиск GW спонсора для:', userCgId);
    
    while (currentCgId && depth < MAX_DEPTH) {
        try {
            // Получаем данные пользователя из Supabase
            const { data: user, error } = await supabase
                .from('users')
                .select('gw_id, referrer_cg_id')
                .eq('cg_id', currentCgId)
                .single();
            
            if (error || !user) {
                console.log('⚠️ Пользователь не найден:', currentCgId);
                break;
            }
            
            // Если у него есть GW_ID - нашли спонсора!
            if (user.gw_id) {
                var numericId = GlobalWayBridge.parseGwId(user.gw_id);
                console.log(`✅ Найден GW спонсор: ${user.gw_id} (глубина: ${depth})`);
                return numericId;
            }
            
            // Иначе идём к его рефереру в CardGift
            currentCgId = user.referrer_cg_id;
            depth++;
            
        } catch (e) {
            console.error('findGlobalWaySponsor error:', e);
            break;
        }
    }
    
    // Если никого не нашли - рандомизация из двух спонсоров
    const randomSponsors = [7346221, 1514866]; // GW7346221 и GW1514866
    const randomSponsor = randomSponsors[Math.floor(Math.random() * randomSponsors.length)];
    console.log('⚠️ GW спонсор не найден, используем рандомный:', 'GW' + randomSponsor);
    return randomSponsor;
}

// ═══════════════════════════════════════════════════════════
// ПОЛНЫЙ FLOW РЕГИСТРАЦИИ И АКТИВАЦИИ
// ═══════════════════════════════════════════════════════════

/**
 * Полный процесс активации уровня с автоматической регистрацией
 * 
 * @param {string} walletAddress - Адрес кошелька
 * @param {number} level - Уровень для активации
 * @param {string} userCgId - CG ID пользователя
 * @param {object} supabase - Supabase клиент
 * @param {function} onStatus - Callback для статуса
 * @returns {object} { success, txHash, error, newGwId }
 */
async function activateWithAutoRegistration(walletAddress, level, userCgId, supabase, onStatus) {
    onStatus = onStatus || function() {};
    
    try {
        // 1. Проверяем зарегистрирован ли в GlobalWay
        onStatus('Проверка регистрации...');
        var isRegistered = await GlobalWayBridge.isRegisteredInGlobalWay(walletAddress);
        
        var newGwId = null;
        
        // 2. Если не зарегистрирован - регистрируем с компрессией
        if (!isRegistered) {
            onStatus('Поиск спонсора...');
            var sponsorId = await findGlobalWaySponsor(userCgId, supabase);
            
            onStatus('Регистрация в GlobalWay...');
            var regResult = await GlobalWayBridge.registerInGlobalWay(sponsorId);
            
            if (!regResult.success) {
                return { success: false, error: 'Ошибка регистрации: ' + regResult.error };
            }
            
            // Ждём подтверждения транзакции
            onStatus('Ожидание подтверждения регистрации...');
            await new Promise(r => setTimeout(r, 3000));
            
            // Получаем новый GW ID
            newGwId = await GlobalWayBridge.getGlobalWayId(walletAddress);
            
            // Сохраняем GW ID в Supabase
            if (newGwId && supabase) {
                await supabase
                    .from('users')
                    .update({ 
                        gw_id: newGwId,
                        gw_registered_at: new Date().toISOString(),
                        wallet_address: walletAddress.toLowerCase()
                    })
                    .eq('cg_id', userCgId);
                    
                console.log('✅ GW ID сохранён:', newGwId);
            }
        }
        
        // 3. Активируем уровень
        onStatus(`Активация уровня ${level}...`);
        var activateResult = await GlobalWayBridge.activateLevel(level);
        
        if (!activateResult.success) {
            return { success: false, error: 'Ошибка активации: ' + activateResult.error };
        }
        
        // 4. Обновляем уровень в Supabase
        if (supabase) {
            await supabase
                .from('users')
                .update({ gw_level: level })
                .eq('cg_id', userCgId);
        }
        
        onStatus('Готово!');
        return { 
            success: true, 
            txHash: activateResult.txHash,
            newGwId: newGwId
        };
        
    } catch (error) {
        console.error('activateWithAutoRegistration error:', error);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════
// АЛИАСЫ ФУНКЦИЙ (для совместимости с IdLinkingService)
// ═══════════════════════════════════════════════════════════

// Алиас для isUserRegistered
GlobalWayBridge.isUserRegistered = async function(walletAddress) {
    return await GlobalWayBridge.isRegisteredInGlobalWay(walletAddress);
};

// Алиас для getUserId
GlobalWayBridge.getUserId = async function(walletAddress) {
    return await GlobalWayBridge.getGlobalWayId(walletAddress);
};

// Алиас для getUserMaxLevel
GlobalWayBridge.getUserMaxLevel = async function(walletAddress) {
    return await GlobalWayBridge.getUserLevel(walletAddress);
};

// Алиас для getUserSponsor (используем MatrixRegistry)
GlobalWayBridge.getUserSponsor = async function(walletAddress) {
    try {
        if (window.ethers) {
            const provider = new ethers.providers.JsonRpcProvider(GlobalWayBridge.RPC_URL);
            const abi = ['function getUserInfo(address user) view returns (bool, uint256, uint256, uint256, address[], bool)'];
            const contract = new ethers.Contract(GlobalWayBridge.MATRIX_REGISTRY_ADDRESS, abi, provider);
            
            const info = await contract.getUserInfo(walletAddress);
            // info[2] = sponsorId
            const sponsorId = info[2];
            
            if (sponsorId && sponsorId.toString() !== '0') {
                // Получаем адрес спонсора по ID
                const abiGetAddress = ['function getAddressById(uint256 userId) view returns (address)'];
                const contract2 = new ethers.Contract(GlobalWayBridge.MATRIX_REGISTRY_ADDRESS, abiGetAddress, provider);
                const sponsorAddress = await contract2.getAddressById(sponsorId);
                return sponsorAddress;
            }
        }
    } catch (e) {
        console.warn('getUserSponsor error:', e);
    }
    return null;
};

// ═══════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════

window.GlobalWayBridge = GlobalWayBridge;
window.findGlobalWaySponsor = findGlobalWaySponsor;
window.activateWithAutoRegistration = activateWithAutoRegistration;

console.log('🌉 GlobalWayBridge v2.1 loaded (Levels 1-12, Compression, Aliases)');
