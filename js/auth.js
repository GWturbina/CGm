/* =====================================================
   CARDGIFT - AUTHENTICATION SERVICE
   v1.4 - Убрана FOUNDERS_ADDRESSES, уровень ТОЛЬКО из контракта
   ===================================================== */

const AuthService = {
    currentUser: null,
    isInitialized: false,
    
    AUTHOR_WALLET: '0x0099188030174e381e7a7ee36d2783ecc31b6728',
    
    getProvider: function() {
        if (window.safepalProvider) {
            console.log('Using SafePal provider');
            return window.safepalProvider;
        }
        if (window.safepal && window.safepal.ethereum) {
            console.log('Using SafePal ethereum');
            return window.safepal.ethereum;
        }
        if (window.ethereum && window.ethereum.isSafePal) {
            console.log('Using ethereum.isSafePal');
            return window.ethereum;
        }
        if (window.ethereum && window.ethereum.providers && window.ethereum.providers.length) {
            var safePalProvider = window.ethereum.providers.find(function(p) { return p.isSafePal; });
            if (safePalProvider) {
                console.log('Using SafePal from providers');
                return safePalProvider;
            }
        }
        if (window.ethereum) {
            console.log('Using default ethereum');
            return window.ethereum;
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
            
            // Проверяем Owner/Founders (hardcoded для гарантии)
            var ownerAddresses = [
                '0x7bcd1753868895971e12448412cb3216d47884c8',
                '0x03284a899147f5a07f82c622f34df92198671635'
            ];
            
            if (ownerAddresses.includes(wallet)) {
                console.log('👑 Owner detected!');
                var ownerUser = {
                    wallet_address: wallet,
                    gw_level: 12,
                    rank: 5,
                    role: 'owner',
                    name: 'Owner',
                    cg_id: wallet === '0x7bcd1753868895971e12448412cb3216d47884c8' ? '7346221' : '1514866'
                };
                this.currentUser = ownerUser;
                localStorage.setItem('currentUser', JSON.stringify(ownerUser));
                localStorage.setItem('cardgift_cg_id', ownerUser.cg_id);
                localStorage.setItem('cardgift_level', '12');
                return ownerUser;
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
        
        // Проверяем автора
        var isAuthor = wallet === this.AUTHOR_WALLET.toLowerCase();
        var role = isAuthor ? 'author' : 'user';
        if (isAuthor) gwLevel = 12;
        
        // Генерируем CG ID (только цифры)
        var cgId = String(Math.floor(1000000 + Math.random() * 9000000));
        
        // Данные для новой схемы
        var userData = {
            cg_id: cgId,
            gw_id: gwId,
            wallet_address: wallet,
            gw_level: gwLevel,
            gw_registered: isRegisteredInGW,
            referrer_cg_id: referrerCgId || null,
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
                    localStorage.setItem('cardgift_cg_id', cgId);
                    if (gwId) localStorage.setItem('cardgift_gw_id', gwId);
                    console.log('New user created:', cgId, 'Level:', gwLevel);
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
        localStorage.setItem('cardgift_cg_id', cgId);
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
            
            // Автор = максимальный уровень
            if (user.wallet_address.toLowerCase() === this.AUTHOR_WALLET.toLowerCase()) {
                user.gw_level = 12;
                user.rank = 5;
                user.role = 'author';
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
    
    isAuthor: function() {
        var user = this.getUser();
        return user && (user.role === 'author' || (user.wallet_address && user.wallet_address.toLowerCase() === this.AUTHOR_WALLET.toLowerCase()));
    },
    
    isFounder: function() {
        var user = this.getUser();
        if (!user) return false;
        // Проверяем уровень 12 из контракта
        return user.gw_level === 12 && user.role !== 'author';
    },
    
    isCoauthor: function() {
        var user = this.getUser();
        return user && user.role === 'coauthor';
    },
    
    hasAccess: function(feature) {
        var level = this.getLevel();
        if (this.isAuthor()) return true;
        
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
            case 'admin': return this.isAuthor();
            default: return false;
        }
    },
    
    getLimits: function() {
        var level = this.getLevel();
        if (this.isAuthor()) {
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
console.log('AuthService v1.4 loaded (Level from contract only)');
