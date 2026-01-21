/**
 * ═══════════════════════════════════════════════════════════
 * ID LINKING SERVICE v4.0
 * ═══════════════════════════════════════════════════════════
 * 
 * НОВАЯ АРХИТЕКТУРА:
 * - temp_id (CG_TEMP_xxx) — временный ID до покупки пакета GW
 * - gw_id (GW1234567) — постоянный ID после покупки пакета
 * - Один кошелёк = один ID везде
 * - Приоритет: gw_id > temp_id
 * 
 * ГЛАВНЫЙ ПРИНЦИП:
 * При подключении кошелька СНАЧАЛА проверяем базу,
 * потом localStorage. База — источник истины!
 * 
 * ═══════════════════════════════════════════════════════════
 */

const IdLinkingService = {
    
    // ═══════════════════════════════════════════════════════════
    // КОНФИГУРАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    ROOT_GW_ID: 'GW9729645',
    ROOT_WALLET: '0x7bcd1753868895971e12448412cb3216d47884c8',
    
    FOUNDERS: [
        { gwId: 'GW7346221', wallet: '0x9b49bd9c9458615e11c051afd1ebe983563b67ee' },
        { gwId: 'GW1514866', wallet: '0x03284a899147f5a07f82c622f34df92198671635' }
    ],
    
    // DEV кошельки с полным доступом
    DEV_WALLETS: [
        '0xa3496cacc8523421dd151f1d92a456c2dafa28c2',
        '0x7bcd1753868895971e12448412cb3216d47884c8'
    ],
    
    getRandomFounder() {
        return this.FOUNDERS[Math.floor(Math.random() * this.FOUNDERS.length)];
    },
    
    // ═══════════════════════════════════════════════════════════
    // ГЕНЕРАЦИЯ TEMP_ID
    // ═══════════════════════════════════════════════════════════
    
    generateTempId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = 'CG_TEMP_';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },
    
    // ═══════════════════════════════════════════════════════════
    // ОЖИДАНИЕ SUPABASE
    // ═══════════════════════════════════════════════════════════
    
    async waitForSupabase(maxWait = 5000) {
        const startTime = Date.now();
        
        if (window.SupabaseClient && SupabaseClient.client) {
            return true;
        }
        
        console.log('⏳ Waiting for SupabaseClient...');
        
        while (Date.now() - startTime < maxWait) {
            if (window.SupabaseClient && SupabaseClient.client) {
                console.log('✅ SupabaseClient ready after', Date.now() - startTime, 'ms');
                return true;
            }
            await new Promise(r => setTimeout(r, 50));
        }
        
        console.warn('⚠️ SupabaseClient not ready after', maxWait, 'ms');
        return false;
    },
    
    isSupabaseReady() {
        return !!(window.SupabaseClient && SupabaseClient.client);
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПОЛУЧЕНИЕ ДАННЫХ ИЗ БАЗЫ
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Поиск пользователя по кошельку
     * ГЛАВНАЯ ФУНКЦИЯ — источник истины!
     */
    async getUserByWallet(walletAddress) {
        const wallet = walletAddress.toLowerCase();
        
        if (!this.isSupabaseReady()) {
            await this.waitForSupabase(3000);
        }
        
        if (!this.isSupabaseReady()) {
            console.warn('⚠️ Supabase not available');
            return null;
        }
        
        try {
            const { data, error } = await SupabaseClient.client
                .from('users')
                .select('*')
                .eq('wallet_address', wallet)
                .limit(1);
            
            if (error) {
                console.warn('getUserByWallet error:', error);
                return null;
            }
            
            if (data && data.length > 0) {
                console.log('✅ Found user by wallet:', data[0].gw_id || data[0].temp_id);
                return data[0];
            }
            
            return null;
            
        } catch (e) {
            console.warn('getUserByWallet exception:', e);
            return null;
        }
    },
    
    /**
     * Поиск по temp_id
     */
    async getUserByTempId(tempId) {
        if (!this.isSupabaseReady()) return null;
        
        try {
            const { data, error } = await SupabaseClient.client
                .from('users')
                .select('*')
                .eq('temp_id', tempId)
                .limit(1);
            
            if (error || !data || data.length === 0) return null;
            return data[0];
        } catch (e) {
            return null;
        }
    },
    
    /**
     * Поиск по gw_id
     */
    async getUserByGwId(gwId) {
        if (!this.isSupabaseReady()) return null;
        
        try {
            const { data, error } = await SupabaseClient.client
                .from('users')
                .select('*')
                .eq('gw_id', gwId)
                .limit(1);
            
            if (error || !data || data.length === 0) return null;
            return data[0];
        } catch (e) {
            return null;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ГЛАВНАЯ ФУНКЦИЯ: ПОДКЛЮЧЕНИЕ КОШЕЛЬКА
    // ═══════════════════════════════════════════════════════════
    
    /**
     * ГЛАВНАЯ ТОЧКА ВХОДА
     * 
     * 1. Ждём Supabase
     * 2. Ищем пользователя по wallet в базе
     * 3. Если найден → возвращаем его данные
     * 4. Если НЕ найден → проверяем GW, создаём запись
     */
    async onWalletConnected(walletAddress) {
        const wallet = walletAddress.toLowerCase();
        console.log('═══════════════════════════════════════');
        console.log('🔗 onWalletConnected:', wallet);
        console.log('═══════════════════════════════════════');
        
        // ШАГ 1: Ждём Supabase
        await this.waitForSupabase(5000);
        
        // ШАГ 2: Ищем в базе по кошельку
        let user = await this.getUserByWallet(wallet);
        
        if (user) {
            // Пользователь найден!
            console.log('✅ User exists in DB');
            
            const displayId = user.gw_id || user.temp_id;
            const level = user.gw_level || 0;
            
            // Сохраняем в localStorage
            this.saveToLocalStorage(user);
            
            // Проверяем уровень в GlobalWay (может обновился)
            let gwLevel = level;
            if (window.GlobalWayBridge) {
                try {
                    gwLevel = await GlobalWayBridge.getUserLevel(wallet);
                    if (gwLevel !== level) {
                        await this.updateUserLevel(wallet, gwLevel);
                    }
                } catch (e) {
                    console.warn('GW level check failed:', e);
                }
            }
            
            return {
                success: true,
                isNew: false,
                user: user,
                tempId: user.temp_id,
                gwId: user.gw_id,
                displayId: displayId,
                level: gwLevel,
                wallet: wallet
            };
        }
        
        // ШАГ 3: Пользователь НЕ найден — проверяем GlobalWay
        console.log('⚠️ User not found in DB, checking GlobalWay...');
        
        let gwId = null;
        let gwLevel = 0;
        let isRegisteredInGw = false;
        
        if (window.GlobalWayBridge) {
            try {
                isRegisteredInGw = await GlobalWayBridge.isRegisteredInGlobalWay(wallet);
                
                if (isRegisteredInGw) {
                    gwId = await GlobalWayBridge.getGlobalWayId(wallet);
                    gwLevel = await GlobalWayBridge.getUserLevel(wallet);
                    console.log('✅ Found in GlobalWay:', gwId, 'Level:', gwLevel);
                }
            } catch (e) {
                console.warn('GlobalWay check error:', e);
            }
        }
        
        // ШАГ 4: Создаём нового пользователя
        const tempId = this.generateTempId();
        
        console.log('📝 Creating new user:', {
            tempId: tempId,
            gwId: gwId,
            level: gwLevel
        });
        
        const newUser = await this.createUser({
            tempId: tempId,
            gwId: gwId,
            wallet: wallet,
            level: gwLevel
        });
        
        if (newUser) {
            this.saveToLocalStorage(newUser);
            
            return {
                success: true,
                isNew: true,
                user: newUser,
                tempId: tempId,
                gwId: gwId,
                displayId: gwId || tempId,
                level: gwLevel,
                wallet: wallet
            };
        }
        
        // Fallback если не удалось создать
        return {
            success: false,
            isNew: true,
            tempId: tempId,
            gwId: gwId,
            displayId: gwId || tempId,
            level: gwLevel,
            wallet: wallet
        };
    },
    
    // ═══════════════════════════════════════════════════════════
    // СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ
    // ═══════════════════════════════════════════════════════════
    
    async createUser({ tempId, gwId, wallet, level, referrerId }) {
        if (!this.isSupabaseReady()) {
            console.warn('⚠️ Cannot create user - Supabase not ready');
            return null;
        }
        
        try {
            // Определяем тип реферера
            let referrerTempId = null;
            let referrerGwId = null;
            
            if (referrerId) {
                if (referrerId.startsWith('GW') || /^\d{7,9}$/.test(referrerId)) {
                    referrerGwId = referrerId.startsWith('GW') ? referrerId : 'GW' + referrerId;
                } else if (referrerId.startsWith('CG_TEMP_')) {
                    referrerTempId = referrerId;
                }
            }
            
            const insertData = {
                temp_id: tempId,
                gw_id: gwId,
                wallet_address: wallet,
                gw_level: level || 0,
                referrer_temp_id: referrerTempId,
                referrer_gw_id: referrerGwId,
                name: 'User ' + (gwId || tempId).slice(-6),
                messenger: 'wallet',
                contact: wallet,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await SupabaseClient.client
                .from('users')
                .insert(insertData)
                .select()
                .single();
            
            if (error) {
                // Если дубликат — получаем существующего
                if (error.code === '23505') {
                    console.log('⚠️ User already exists, fetching...');
                    return await this.getUserByWallet(wallet);
                }
                throw error;
            }
            
            console.log('✅ User created:', data.temp_id || data.gw_id);
            return data;
            
        } catch (e) {
            console.error('createUser error:', e);
            return null;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ОБНОВЛЕНИЕ ДАННЫХ
    // ═══════════════════════════════════════════════════════════
    
    async updateUserLevel(wallet, level) {
        if (!this.isSupabaseReady()) return false;
        
        try {
            const { error } = await SupabaseClient.client
                .from('users')
                .update({ 
                    gw_level: level,
                    updated_at: new Date().toISOString()
                })
                .eq('wallet_address', wallet.toLowerCase());
            
            if (error) throw error;
            
            localStorage.setItem('cardgift_level', level);
            return true;
            
        } catch (e) {
            console.error('updateUserLevel error:', e);
            return false;
        }
    },
    
    /**
     * Привязка GW ID к существующему пользователю
     * Вызывается после покупки пакета в GlobalWay
     */
    async linkGwId(tempId, gwId, wallet) {
        if (!this.isSupabaseReady()) return false;
        
        console.log('🔗 Linking GW ID:', tempId, '→', gwId);
        
        try {
            const { error } = await SupabaseClient.client
                .from('users')
                .update({ 
                    gw_id: gwId,
                    gw_registered_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('temp_id', tempId);
            
            if (error) throw error;
            
            // Обновляем localStorage
            localStorage.setItem('cardgift_gw_id', gwId);
            localStorage.setItem('cardgift_display_id', gwId);
            
            // Запускаем миграцию данных (контакты, открытки)
            await this.migrateUserData(tempId, gwId);
            
            console.log('✅ GW ID linked successfully');
            return true;
            
        } catch (e) {
            console.error('linkGwId error:', e);
            return false;
        }
    },
    
    /**
     * Миграция данных при получении GW ID
     */
    async migrateUserData(tempId, gwId) {
        if (!this.isSupabaseReady()) return;
        
        console.log('🔄 Migrating data:', tempId, '→', gwId);
        
        try {
            // Обновляем контакты
            await SupabaseClient.client
                .from('contacts')
                .update({ owner_gw_id: gwId })
                .eq('owner_temp_id', tempId);
            
            // Обновляем открытки
            await SupabaseClient.client
                .from('cards')
                .update({ owner_gw_id: gwId })
                .eq('owner_temp_id', tempId);
            
            // Обновляем рефералов
            await SupabaseClient.client
                .from('users')
                .update({ referrer_gw_id: gwId })
                .eq('referrer_temp_id', tempId);
            
            // Обновляем AI credits
            await SupabaseClient.client
                .from('ai_credits')
                .update({ user_gw_id: gwId })
                .eq('user_temp_id', tempId);
            
            console.log('✅ Data migration complete');
            
        } catch (e) {
            console.error('migrateUserData error:', e);
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // LOCALSTORAGE
    // ═══════════════════════════════════════════════════════════
    
    saveToLocalStorage(user) {
        if (!user) return;
        
        const displayId = user.gw_id || user.temp_id;
        
        localStorage.setItem('cardgift_temp_id', user.temp_id || '');
        localStorage.setItem('cardgift_gw_id', user.gw_id || '');
        localStorage.setItem('cardgift_display_id', displayId);
        localStorage.setItem('cardgift_wallet', user.wallet_address || '');
        localStorage.setItem('cardgift_level', user.gw_level || 0);
        
        // Для совместимости со старым кодом
        localStorage.setItem('cardgift_cg_id', displayId);
        
        console.log('💾 Saved to localStorage:', displayId);
    },
    
    clearLocalStorage() {
        console.log('🧹 Clearing localStorage...');
        
        localStorage.removeItem('cardgift_temp_id');
        localStorage.removeItem('cardgift_gw_id');
        localStorage.removeItem('cardgift_display_id');
        localStorage.removeItem('cardgift_cg_id');
        localStorage.removeItem('cardgift_wallet');
        localStorage.removeItem('cardgift_level');
        localStorage.removeItem('cg_wallet_address');
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПОЛУЧЕНИЕ ТЕКУЩЕГО ID
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Получить display ID (gw_id если есть, иначе temp_id)
     */
    getDisplayId() {
        const gwId = localStorage.getItem('cardgift_gw_id');
        const tempId = localStorage.getItem('cardgift_temp_id');
        const legacyCgId = localStorage.getItem('cardgift_cg_id');
        
        return gwId || tempId || legacyCgId || null;
    },
    
    /**
     * Получить полные данные из localStorage
     */
    getLocalData() {
        return {
            tempId: localStorage.getItem('cardgift_temp_id'),
            gwId: localStorage.getItem('cardgift_gw_id'),
            displayId: this.getDisplayId(),
            wallet: localStorage.getItem('cardgift_wallet'),
            level: parseInt(localStorage.getItem('cardgift_level')) || 0
        };
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПОИСК СПОНСОРА (для регистрации в GW)
    // ═══════════════════════════════════════════════════════════
    
    async findGwSponsor(userId) {
        let currentId = userId;
        let depth = 0;
        const MAX_DEPTH = 50;
        
        console.log('🔍 Finding GW sponsor for:', userId);
        
        while (currentId && depth < MAX_DEPTH) {
            // Получаем пользователя
            let user = null;
            
            if (currentId.startsWith('GW')) {
                user = await this.getUserByGwId(currentId);
            } else if (currentId.startsWith('CG_TEMP_')) {
                user = await this.getUserByTempId(currentId);
            }
            
            if (!user) break;
            
            // Если у него есть GW ID — нашли!
            if (user.gw_id && user.wallet_address) {
                console.log(`✅ Found GW sponsor at depth ${depth}:`, user.gw_id);
                return {
                    gwId: user.gw_id,
                    wallet: user.wallet_address
                };
            }
            
            // Идём к рефереру
            const nextId = user.referrer_gw_id || user.referrer_temp_id;
            if (!nextId || nextId === currentId) break;
            
            currentId = nextId;
            depth++;
        }
        
        // Не нашли — используем случайного основателя
        const founder = this.getRandomFounder();
        console.log('⚠️ No GW sponsor found, using founder:', founder.gwId);
        
        return {
            gwId: founder.gwId,
            wallet: founder.wallet
        };
    },
    
    // ═══════════════════════════════════════════════════════════
    // УТИЛИТЫ
    // ═══════════════════════════════════════════════════════════
    
    isDevWallet(wallet) {
        if (!wallet) return false;
        return this.DEV_WALLETS.includes(wallet.toLowerCase());
    },
    
    /**
     * Принудительный сброс и перезагрузка
     */
    forceReset() {
        console.log('🔄 FORCE RESET...');
        this.clearLocalStorage();
        setTimeout(() => location.reload(), 500);
    },
    
    /**
     * Диагностика
     */
    diagnose() {
        console.log('═══════════════════════════════════════');
        console.log('🔍 ID LINKING SERVICE v4.0 DIAGNOSTICS');
        console.log('═══════════════════════════════════════');
        console.log('');
        console.log('📦 localStorage:');
        console.log('   temp_id:', localStorage.getItem('cardgift_temp_id'));
        console.log('   gw_id:', localStorage.getItem('cardgift_gw_id'));
        console.log('   display_id:', this.getDisplayId());
        console.log('   wallet:', localStorage.getItem('cardgift_wallet'));
        console.log('   level:', localStorage.getItem('cardgift_level'));
        console.log('');
        console.log('🔗 Services:');
        console.log('   Supabase:', this.isSupabaseReady() ? '✅' : '❌');
        console.log('   GlobalWayBridge:', !!window.GlobalWayBridge ? '✅' : '❌');
        console.log('');
        console.log('💡 Commands:');
        console.log('   IdLinkingService.forceReset() — сброс');
        console.log('═══════════════════════════════════════');
    }
};

// ═══════════════════════════════════════════════════════════
// ГЛОБАЛЬНЫЙ ЭКСПОРТ
// ═══════════════════════════════════════════════════════════

window.IdLinkingService = IdLinkingService;

// Для совместимости
window.findGlobalWaySponsor = async function(userId) {
    return await IdLinkingService.findGwSponsor(userId);
};

console.log('🔗 IdLinkingService v4.0 loaded (temp_id + gw_id architecture)');
