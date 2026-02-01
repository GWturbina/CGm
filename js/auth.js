/* =====================================================
   CARDGIFT - AUTHENTICATION SERVICE
   v2.0 - Исправлена структура OWNER/Соавторов
        - Убран старый AUTHOR_WALLET
        - Роли берутся из CONFIG
        - Только OWNER имеет доступ к админке
   ===================================================== */

const AuthService = {
    currentUser: null,
    isInitialized: false,
    
    // Используем CONFIG для определения ролей
    getProvider: function() {
        // Используем getSafePalProvider из wallet.js
        if (typeof getSafePalProvider === 'function') {
            return getSafePalProvider();
        }
        
        // Fallback - только SafePal!
        if (window.safepalProvider) {
            return window.safepalProvider;
        }
        if (window.safepal && window.safepal.ethereum) {
            return window.safepal.ethereum;
        }
        if (window.ethereum && window.ethereum.isSafePal) {
            return window.ethereum;
        }
        if (window.ethereum && window.ethereum.providers && window.ethereum.providers.length) {
            var safePalProvider = window.ethereum.providers.find(function(p) { return p.isSafePal; });
            if (safePalProvider) return safePalProvider;
        }
        return null;
    },
    
    init: async function() {
        console.log('AuthService initializing...');
        
        if (window.SupabaseClient) {
            SupabaseClient.init(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        }
        
        if (window.GlobalWayBridge) {
            await GlobalWayBridge.init();
        }
        
        // Проверяем параметры URL (переход из GlobalWay)
        this.checkGlobalWayTransition();
        
        var savedWallet = localStorage.getItem('cg_wallet_address');
        if (savedWallet) {
            await this.loadUser(savedWallet);
        }
        
        var provider = this.getProvider();
        if (provider && provider.on) {
            var self = this;
            provider.on('accountsChanged', function(accounts) {
                if (accounts.length > 0) {
                    self.loadUser(accounts[0]);
                } else {
                    self.logout();
                }
            });
        }
        
        this.isInitialized = true;
        console.log('AuthService initialized');
        return this.currentUser;
    },
    
    // Проверка перехода из GlobalWay
    checkGlobalWayTransition: function() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('from') === 'globalway') {
            console.log('🌉 Detected transition from GlobalWay');
            sessionStorage.setItem('fromGlobalWay', 'true');
            sessionStorage.setItem('gwRefId', params.get('ref') || '');
        }
    },
    
    connectWallet: async function() {
        var provider = this.getProvider();
        
        if (!provider) {
            var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                var currentUrl = encodeURIComponent(window.location.href);
                window.location.href = 'https://link.safepal.io/dapp?url=' + currentUrl;
                throw new Error('REDIRECT_TO_SAFEPAL');
            }
            throw new Error('Wallet not found. Install SafePal or MetaMask.');
        }
        
        try {
            console.log('Requesting wallet connection...');
            
            var accounts;
            try {
                accounts = await provider.request({ method: 'eth_requestAccounts' });
            } catch (reqError) {
                console.warn('eth_requestAccounts failed:', reqError);
                if (provider.enable) {
                    accounts = await provider.enable();
                } else {
                    throw reqError;
                }
            }
            
            if (!accounts || accounts.length === 0) {
                throw new Error('Could not access wallet');
            }
            
            var walletAddress = accounts[0].toLowerCase();
            console.log('Wallet address:', walletAddress);
            
            try {
                var chainId = await provider.request({ method: 'eth_chainId' });
                var currentChainId = parseInt(chainId, 16);
                if (currentChainId !== 204) {
                    console.log('Switching to opBNB...');
                    await this.switchToOpBNB(provider);
                }
            } catch (e) {
                console.warn('Network switch failed:', e);
            }
            
            // Используем BidirectionalSync для синхронизации
            var user = null;
            
            if (window.BidirectionalSync && window.SupabaseClient && window.SupabaseClient.client) {
                try {
                    console.log('🔄 Running BidirectionalSync...');
                    var syncResult = await BidirectionalSync.syncOnWalletConnect(
                        walletAddress, 
                        SupabaseClient.client
                    );
                    
                    console.log('📊 Sync result:', syncResult);
                    
                    if (syncResult.action === 'need_globalway_registration') {
                        console.log('⚠️ User needs to register in GlobalWay first');
                        if (typeof showNeedGlobalWayMessage === 'function') {
                            showNeedGlobalWayMessage();
                        }
                        return null;
                    }
                    
                    if (syncResult.action === 'login' && syncResult.cg.cgId) {
                        user = await this.loadUser(walletAddress);
                        
                        if (syncResult.autoCreatedCg) {
                            console.log('🎉 Auto-created CG account:', syncResult.cg.cgId);
                        }
                    }
                    
                } catch (syncError) {
                    console.warn('BidirectionalSync error, falling back:', syncError);
                    user = await this.loadOrCreateUser(walletAddress);
                }
            } else {
                user = await this.loadOrCreateUser(walletAddress);
            }
            
            if (!user) {
                user = await this.loadOrCreateUser(walletAddress);
            }
            
            localStorage.setItem('cg_wallet_address', walletAddress);
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            sessionStorage.removeItem('fromGlobalWay');
            sessionStorage.removeItem('gwRefId');
            
            console.log('Wallet connected:', walletAddress);
            return user;
            
        } catch (error) {
            console.error('Connect wallet error:', error);
            throw error;
        }
    },
    
    switchToOpBNB: async function(provider) {
        var opbnbChain = {
            chainId: '0xCC',
            chainName: 'opBNB Mainnet',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: ['https://opbnb-mainnet-rpc.bnbchain.org'],
            blockExplorerUrls: ['https://opbnbscan.com']
        };
        
        try {
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: opbnbChain.chainId }]
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [opbnbChain]
                });
            }
        }
    },
    
    loadUser: async function(walletAddress) {
        try {
            var wallet = walletAddress.toLowerCase();
            
            // Проверяем OWNER (единственный кто управляет админкой)
            if (window.CONFIG && CONFIG.isOwner(wallet)) {
                console.log('👑 OWNER detected!');
                var ownerUser = {
                    wallet_address: wallet,
                    gw_level: 12,
                    rank: 5,
                    role: 'owner',
                    name: CONFIG.OWNER.name || 'Owner',
                    gw_id: CONFIG.OWNER.gwId
                };
                this.currentUser = ownerUser;
                localStorage.setItem('currentUser', JSON.stringify(ownerUser));
                localStorage.setItem('cardgift_gw_id', ownerUser.gw_id);
                localStorage.setItem('cardgift_level', '12');
                return ownerUser;
            }
            
            // Проверяем соавторов (уровень 12, но БЕЗ доступа к админке)
            if (window.CONFIG && CONFIG.isCoauthor(wallet)) {
                console.log('👤 Coauthor detected!');
                var coauthorInfo = CONFIG.getCoauthorInfo(wallet);
                var coauthorUser = {
                    wallet_address: wallet,
                    gw_level: 12,
                    rank: 5,
                    role: 'coauthor',
                    name: coauthorInfo?.name || 'Соавтор',
                    gw_id: coauthorInfo?.gwId || null
                };
                this.currentUser = coauthorUser;
                localStorage.setItem('currentUser', JSON.stringify(coauthorUser));
                if (coauthorUser.gw_id) {
                    localStorage.setItem('cardgift_gw_id', coauthorUser.gw_id);
                }
                localStorage.setItem('cardgift_level', '12');
                return coauthorUser;
            }
            
            // Загружаем пользователя из Supabase
            var user = null;
            if (window.SupabaseClient) {
                user = await SupabaseClient.getUserByWallet(wallet);
            }
            
            if (user) {
                // ВСЕГДА обновляем уровень из контракта
                user = await this.updateLevelFromChain(user);
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // Сохраняем CG ID в localStorage для dashboard
                if (user.cg_id) {
                    localStorage.setItem('cardgift_cg_id', user.cg_id);
                }
                if (user.gw_id) {
                    localStorage.setItem('cardgift_gw_id', user.gw_id);
                }
                
                if (window.SupabaseClient) {
                    await SupabaseClient.updateUser(wallet, { last_activity: new Date().toISOString() });
                }
                
                console.log('User loaded:', user.cg_id || wallet, 'Level:', user.gw_level);
                return user;
            }
            
            return null;
        } catch (error) {
            console.error('Load user error:', error);
            return null;
        }
    },
    
    loadOrCreateUser: async function(walletAddress) {
        var wallet = walletAddress.toLowerCase();
        
        var user = await this.loadUser(wallet);
        if (!user) {
            user = await this.createUser(wallet);
        }
        return user;
    },
    
    createUser: async function(walletAddress, referrerCgId) {
        var wallet = walletAddress.toLowerCase();
        var gwLevel = 0;
        var gwId = null;
        var isRegisteredInGW = false;
        
        // Получаем данные из GlobalWay контракта
        if (window.GlobalWayBridge) {
            try {
                // Проверяем регистрацию в GlobalWay
                if (typeof GlobalWayBridge.isRegisteredInGlobalWay === 'function') {
                    isRegisteredInGW = await GlobalWayBridge.isRegisteredInGlobalWay(wallet);
                    
                    if (isRegisteredInGW) {
                        // Получаем уровень из контракта
                        if (typeof GlobalWayBridge.getUserLevel === 'function') {
                            gwLevel = await GlobalWayBridge.getUserLevel(wallet);
                        }
                        // Получаем GW ID
                        if (typeof GlobalWayBridge.getGlobalWayId === 'function') {
                            gwId = await GlobalWayBridge.getGlobalWayId(wallet);
                        }
                    }
                    
                    console.log('GlobalWay data from contract:', { isRegisteredInGW, gwLevel, gwId });
                }
            } catch (e) {
                console.warn('Could not get data from GlobalWay:', e);
            }
        }
        
        // Проверяем allowed_wallets
        var grantedLevel = 0;
        if (window.SupabaseClient) {
            try {
                var allowed = await SupabaseClient.isWalletAllowed(wallet);
                if (allowed && allowed.granted_rank) {
                    grantedLevel = this.rankToLevel(allowed.granted_rank);
                }
            } catch (e) {
                console.warn('Could not check allowed wallets:', e);
            }
        }
        
        // Берём максимальный уровень
        gwLevel = Math.max(gwLevel, grantedLevel);
        
        // Проверяем OWNER и соавторов через CONFIG
        var isOwner = window.CONFIG && CONFIG.isOwner(wallet);
        var isCoauthor = window.CONFIG && CONFIG.isCoauthor(wallet);
        var role = isOwner ? 'owner' : (isCoauthor ? 'coauthor' : 'user');
        
        if (isOwner || isCoauthor) {
            gwLevel = 12; // DEV кошельки всегда уровень 12
        }
        
        // Генерируем temp_id (новая архитектура v4.0)
        var tempId = 'CG_TEMP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        // Данные для новой схемы (v4.0)
        var userData = {
            temp_id: tempId,
            gw_id: gwId,
            wallet_address: wallet,
            gw_level: gwLevel,
            gw_registered: isRegisteredInGW,
            referrer_temp_id: referrerCgId || null,
            name: null,
            created_at: new Date().toISOString()
        };
        
        // Сохраняем в Supabase
        if (window.SupabaseClient) {
            try {
                var created = await SupabaseClient.createUser(userData);
                if (created) {
                    created.rank = this.levelToRank(created.gw_level || 0);
                    created.role = role;
                    this.currentUser = created;
                    localStorage.setItem('currentUser', JSON.stringify(created));
                    localStorage.setItem('cardgift_temp_id', tempId);
                    if (gwId) localStorage.setItem('cardgift_gw_id', gwId);
                    console.log('New user created:', tempId, 'Level:', gwLevel);
                    return created;
                }
            } catch (e) {
                console.error('Supabase create user error:', e);
            }
        }
        
        // Fallback - сохраняем локально
        userData.rank = this.levelToRank(gwLevel);
        userData.role = role;
        this.currentUser = userData;
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('cardgift_temp_id', tempId);
        return userData;
    },
    
    updateLevelFromChain: async function(user) {
        if (!window.GlobalWayBridge) return user;
        
        try {
            // ВСЕГДА получаем уровень из контракта
            var chainLevel = 0;
            if (typeof GlobalWayBridge.getUserLevel === 'function') {
                chainLevel = await GlobalWayBridge.getUserLevel(user.wallet_address);
                console.log('📊 Level from contract:', chainLevel);
            }
            
            // Проверяем allowed_wallets
            var grantedLevel = 0;
            if (window.SupabaseClient) {
                try {
                    var allowed = await SupabaseClient.isWalletAllowed(user.wallet_address);
                    if (allowed) grantedLevel = this.rankToLevel(allowed.granted_rank || 0);
                } catch (e) {}
            }
            
            var newLevel = Math.max(chainLevel, grantedLevel);
            
            // OWNER и соавторы = максимальный уровень 12
            if (window.CONFIG && CONFIG.isDevWallet(user.wallet_address)) {
                user.gw_level = 12;
                user.rank = 5;
                user.role = CONFIG.isOwner(user.wallet_address) ? 'owner' : 'coauthor';
            } else {
                // Обновляем уровень из контракта
                user.gw_level = newLevel;
                user.rank = this.levelToRank(newLevel);
                
                // Сохраняем в Supabase если изменился
                if (window.SupabaseClient && newLevel !== user.gw_level) {
                    try {
                        await SupabaseClient.updateUser(user.wallet_address, { gw_level: newLevel });
                    } catch (e) {}
                }
            }
            
            // Сохраняем уровень в localStorage
            localStorage.setItem('cardgift_level', user.gw_level);
            
            return user;
        } catch (error) {
            console.warn('Could not update level from chain:', error);
            return user;
        }
    },
    
    // Конвертация уровня (1-12) в ранг (0-5)
    levelToRank: function(level) {
        if (level === 0) return 0;
        if (level <= 3) return 1;  // Client
        if (level <= 6) return 2;  // MiniAdmin
        if (level <= 8) return 3;  // Admin
        if (level === 9) return 4; // SuperAdmin
        return 5; // Businessman
    },
    
    // Конвертация ранга (0-5) в уровень
    rankToLevel: function(rank) {
        var mapping = { 0: 0, 1: 3, 2: 6, 3: 8, 4: 9, 5: 12 };
        return mapping[rank] !== undefined ? mapping[rank] : 0;
    },
    
    logout: function() {
        this.currentUser = null;
        localStorage.removeItem('cg_wallet_address');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('cardgift_cg_id');
        localStorage.removeItem('cardgift_gw_id');
        localStorage.removeItem('cardgift_level');
        sessionStorage.removeItem('fromGlobalWay');
        sessionStorage.removeItem('gwRefId');
        console.log('User logged out');
        window.location.reload();
    },
    
    getUser: function() {
        if (this.currentUser) return this.currentUser;
        var saved = localStorage.getItem('currentUser');
        if (saved) {
            this.currentUser = JSON.parse(saved);
            return this.currentUser;
        }
        return null;
    },
    
    isAuthenticated: function() {
        return !!this.getUser();
    },
    
    // Получить уровень (1-12)
    getLevel: function() {
        var user = this.getUser();
        return user ? (user.gw_level || 0) : 0;
    },
    
    // Получить ранг (0-5) для обратной совместимости
    getRank: function() {
        var user = this.getUser();
        if (!user) return 0;
        if (user.rank !== undefined) return user.rank;
        return this.levelToRank(user.gw_level || 0);
    },
    
    // Проверка - это OWNER? (единственный кто управляет админкой)
    isOwner: function() {
        var user = this.getUser();
        if (!user) return false;
        if (window.CONFIG && CONFIG.isOwner(user.wallet_address)) return true;
        return user.role === 'owner';
    },
    
    // Проверка - это соавтор? (уровень 12, но без админки)
    isCoauthor: function() {
        var user = this.getUser();
        if (!user) return false;
        if (window.CONFIG && CONFIG.isCoauthor(user.wallet_address)) return true;
        return user.role === 'coauthor';
    },
    
    // Проверка - это DEV кошелёк? (OWNER или соавтор)
    isDevWallet: function() {
        var user = this.getUser();
        if (!user) return false;
        if (window.CONFIG && CONFIG.isDevWallet(user.wallet_address)) return true;
        return user.role === 'owner' || user.role === 'coauthor';
    },
    
    // Доступ к админке - ТОЛЬКО OWNER!
    hasAdminAccess: function() {
        return this.isOwner();
    },
    
    hasAccess: function(feature) {
        var level = this.getLevel();
        
        // OWNER и соавторы имеют полный доступ ко всем функциям
        if (this.isDevWallet()) return true;
        
        // Админка - ТОЛЬКО OWNER!
        if (feature === 'admin') return this.isOwner();
        
        if (window.GlobalWayBridge && typeof GlobalWayBridge.hasAccess === 'function') {
            return GlobalWayBridge.hasAccess(level, feature);
        }
        
        var rank = this.getRank();
        switch (feature) {
            case 'archive': return rank >= 1;
            case 'contacts': return rank >= 2;
            case 'referrals': return rank >= 2;
            case 'crm': return rank >= 3;
            case 'blog': return rank >= 3;
            case 'mailing': return rank >= 4;
            case 'analytics': return rank >= 3;
            case 'partner_program': return rank >= 2;
            case 'coauthors': return rank >= 5;
            default: return false;
        }
    },
    
    getLimits: function() {
        var level = this.getLevel();
        
        // OWNER и соавторы - безлимит
        if (this.isDevWallet()) {
            return { archive: -1, referralLevels: 9, contacts: true };
        }
        
        if (window.GlobalWayBridge && typeof GlobalWayBridge.getAccessForLevel === 'function') {
            return GlobalWayBridge.getAccessForLevel(level);
        }
        
        var rank = this.getRank();
        var limits = {
            0: { archive: 0, referralLevels: 0, contacts: false },
            1: { archive: 3, referralLevels: 0, contacts: false },
            2: { archive: 10, referralLevels: 3, contacts: true },
            3: { archive: 50, referralLevels: 5, contacts: true },
            4: { archive: 200, referralLevels: 9, contacts: true },
            5: { archive: -1, referralLevels: 9, contacts: true }
        };
        
        return limits[rank] || limits[0];
    }
};

window.AuthService = AuthService;
console.log('🔐 AuthService v2.0 loaded (OWNER/Coauthors from CONFIG)');
