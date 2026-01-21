/* =====================================================
   CARDGIFT - BIDIRECTIONAL SYNC
   Синхронизация с GlobalWay при переходе из экосистемы
   v1.0 - 2025-01-02
   ===================================================== */

const BidirectionalSync = {
    
    // ═══════════════════════════════════════════════════════════
    // КОНФИГУРАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    config: {
        // Адреса контрактов GlobalWay
        GLOBALWAY_ADDRESS: '0xc6E769A790cE87f9Dd952Dca6Ac1A9526Bc0FBe7',
        MATRIX_REGISTRY_ADDRESS: '0xC12b57B8B4BcE9134788FBb2290Cf4d496c4eE4a',
        
        // RPC
        RPC_URL: 'https://opbnb-mainnet-rpc.bnbchain.org',
        
        // ROOT пользователь
        ROOT_CG_ID: 'CG9729645',
        ROOT_GW_ID: 'GW9729645'
    },
    
    // Селекторы функций контрактов
    SELECTORS: {
        isUserRegistered: '0x163f7522',
        getUserMaxLevel: '0x7bc4cf17',
        getUserIdByAddress: '0x6d166867',
        getUserSponsor: '0x84f2deef'
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПРОВЕРКА ПАРАМЕТРОВ URL (переход из GlobalWay)
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Проверяет URL на параметры перехода из GlobalWay
     */
    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        
        const fromGlobalWay = params.get('from') === 'globalway';
        const refId = params.get('ref');
        const walletParam = params.get('wallet');
        
        if (fromGlobalWay) {
            console.log('🌉 Detected transition from GlobalWay');
            console.log('   Referrer GW ID:', refId);
            console.log('   Wallet hint:', walletParam);
            
            return {
                fromGlobalWay: true,
                referrerGwId: refId,
                walletHint: walletParam
            };
        }
        
        return null;
    },
    
    /**
     * Очищает URL от параметров перехода
     */
    cleanUrl() {
        const url = new URL(window.location.href);
        url.searchParams.delete('from');
        url.searchParams.delete('ref');
        url.searchParams.delete('wallet');
        
        window.history.replaceState({}, '', url.toString());
    },
    
    // ═══════════════════════════════════════════════════════════
    // ГЛАВНАЯ ТОЧКА ВХОДА
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Синхронизация при подключении кошелька
     */
    async syncOnWalletConnect(walletAddress, supabase) {
        console.log('🔄 BidirectionalSync: Starting sync for', walletAddress);
        
        const wallet = walletAddress.toLowerCase();
        const urlParams = this.checkUrlParams();
        
        const result = {
            walletAddress: wallet,
            fromGlobalWay: urlParams?.fromGlobalWay || false,
            gw: { isRegistered: false, gwId: null, level: 0, sponsorGwId: null },
            cg: { exists: false, cgId: null },
            action: null,
            autoCreatedCg: false
        };
        
        try {
            // Проверяем GlobalWay
            result.gw = await this.getGlobalWayStatus(wallet);
            console.log('📊 GW Status:', result.gw);
            
            // Проверяем CardGift
            result.cg = await this.getCardGiftStatus(wallet, supabase);
            console.log('📊 CG Status:', result.cg);
            
            // === ЛОГИКА СИНХРОНИЗАЦИИ ===
            
            // Пришли из GlobalWay
            if (urlParams?.fromGlobalWay) {
                if (!result.gw.isRegistered) {
                    // Ошибка - пришёл из GW но не зарегистрирован
                    console.error('❌ Came from GW but not registered!');
                    result.action = 'error';
                    return result;
                }
                
                // Зарегистрирован в GW, нет в CG - создаём
                if (!result.cg.exists) {
                    console.log('🔧 Auto-creating CG account from GW');
                    const newUser = await this.createCardGiftFromGlobalWay(wallet, result.gw, supabase);
                    result.cg.exists = true;
                    result.cg.cgId = newUser.cg_id;
                    result.autoCreatedCg = true;
                }
                
                this.cleanUrl();
                result.action = 'login';
                return result;
            }
            
            // Стандартная логика
            if (result.gw.isRegistered && !result.cg.exists) {
                // Есть в GW, нет в CG - создаём
                const newUser = await this.createCardGiftFromGlobalWay(wallet, result.gw, supabase);
                result.cg.exists = true;
                result.cg.cgId = newUser.cg_id;
                result.autoCreatedCg = true;
                result.action = 'login';
            }
            else if (!result.gw.isRegistered && result.cg.exists) {
                // Есть в CG, нет в GW - просто логин
                result.action = 'login';
            }
            else if (result.gw.isRegistered && result.cg.exists) {
                // Есть везде - синхронизируем и логин
                await this.syncGlobalWayData(result.cg.cgId, result.gw, supabase);
                result.action = 'login';
            }
            else {
                // Нигде нет - нужна регистрация в GlobalWay
                result.action = 'need_globalway_registration';
            }
            
            console.log('✅ Sync complete:', result.action);
            return result;
            
        } catch (error) {
            console.error('❌ Sync error:', error);
            throw error;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПРОВЕРКА GLOBALWAY (БЛОКЧЕЙН)
    // ═══════════════════════════════════════════════════════════
    
    async getGlobalWayStatus(walletAddress) {
        const result = {
            isRegistered: false,
            gwId: null,
            numericId: null,
            level: 0,
            sponsorGwId: null
        };
        
        try {
            // Проверяем регистрацию
            const isReg = await this.callContract(
                this.config.GLOBALWAY_ADDRESS,
                this.SELECTORS.isUserRegistered,
                this.encodeAddress(walletAddress)
            );
            result.isRegistered = parseInt(isReg, 16) !== 0;
            
            if (!result.isRegistered) return result;
            
            // Получаем ID
            const idHex = await this.callContract(
                this.config.MATRIX_REGISTRY_ADDRESS,
                this.SELECTORS.getUserIdByAddress,
                this.encodeAddress(walletAddress)
            );
            result.numericId = parseInt(idHex, 16);
            result.gwId = 'GW' + result.numericId;
            
            // Получаем уровень
            const lvlHex = await this.callContract(
                this.config.GLOBALWAY_ADDRESS,
                this.SELECTORS.getUserMaxLevel,
                this.encodeAddress(walletAddress)
            );
            result.level = parseInt(lvlHex, 16);
            
            // Получаем спонсора
            const sponsorHex = await this.callContract(
                this.config.GLOBALWAY_ADDRESS,
                this.SELECTORS.getUserSponsor,
                this.encodeAddress(walletAddress)
            );
            const sponsorAddr = '0x' + sponsorHex.slice(-40);
            
            if (sponsorAddr !== '0x0000000000000000000000000000000000000000') {
                const sponsorIdHex = await this.callContract(
                    this.config.MATRIX_REGISTRY_ADDRESS,
                    this.SELECTORS.getUserIdByAddress,
                    this.encodeAddress(sponsorAddr)
                );
                result.sponsorGwId = 'GW' + parseInt(sponsorIdHex, 16);
            }
            
        } catch (error) {
            console.error('getGlobalWayStatus error:', error);
        }
        
        return result;
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПРОВЕРКА CARDGIFT (SUPABASE)
    // ═══════════════════════════════════════════════════════════
    
    async getCardGiftStatus(walletAddress, supabase) {
        const result = {
            exists: false,
            cgId: null,
            gwId: null,
            gwLevel: 0
        };
        
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('cg_id, gw_id, gw_level')
                .eq('wallet_address', walletAddress.toLowerCase())
                .single();
            
            if (!error && user) {
                result.exists = true;
                result.cgId = user.cg_id;
                result.gwId = user.gw_id;
                result.gwLevel = user.gw_level || 0;
            }
        } catch (error) {
            console.error('getCardGiftStatus error:', error);
        }
        
        return result;
    },
    
    // ═══════════════════════════════════════════════════════════
    // СОЗДАНИЕ CG АККАУНТА ИЗ GLOBALWAY
    // ═══════════════════════════════════════════════════════════
    
    async createCardGiftFromGlobalWay(walletAddress, gwStatus, supabase) {
        console.log('🔧 Creating CG account from GW data...');
        
        // CG_ID = тот же номер что и GW_ID
        const cgId = 'CG' + gwStatus.numericId;
        
        // Находим реферера
        let referrerCgId = this.config.ROOT_CG_ID;
        
        if (gwStatus.sponsorGwId) {
            const { data: sponsor } = await supabase
                .from('users')
                .select('cg_id')
                .eq('gw_id', gwStatus.sponsorGwId)
                .single();
            
            if (sponsor) {
                referrerCgId = sponsor.cg_id;
            }
        }
        
        // Создаём пользователя
        const newUser = {
            cg_id: cgId,
            gw_id: gwStatus.gwId,
            wallet_address: walletAddress.toLowerCase(),
            referrer_cg_id: referrerCgId,
            gw_level: gwStatus.level,
            gw_registered: true,
            gw_registered_at: new Date().toISOString(),
            name: `User ${gwStatus.numericId}`,
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('users')
            .insert(newUser)
            .select()
            .single();
        
        if (error) {
            // Возможно уже существует
            if (error.code === '23505') {
                const { data: existing } = await supabase
                    .from('users')
                    .select('*')
                    .eq('cg_id', cgId)
                    .single();
                
                if (existing) {
                    console.log('✅ CG user already exists:', cgId);
                    return existing;
                }
            }
            throw error;
        }
        
        console.log('✅ CG user created:', cgId);
        return data;
    },
    
    // ═══════════════════════════════════════════════════════════
    // СИНХРОНИЗАЦИЯ ДАННЫХ GW → CG
    // ═══════════════════════════════════════════════════════════
    
    async syncGlobalWayData(cgId, gwStatus, supabase) {
        const { error } = await supabase
            .from('users')
            .update({
                gw_id: gwStatus.gwId,
                gw_level: gwStatus.level,
                gw_registered: gwStatus.isRegistered,
                updated_at: new Date().toISOString()
            })
            .eq('cg_id', cgId);
        
        if (!error) {
            console.log('✅ GW data synced to CG');
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // RPC ВЫЗОВЫ
    // ═══════════════════════════════════════════════════════════
    
    async callContract(contractAddress, selector, encodedParams = '') {
        const response = await fetch(this.config.RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{ to: contractAddress, data: selector + encodedParams }, 'latest'],
                id: Date.now()
            })
        });
        
        const json = await response.json();
        if (json.error) throw new Error(json.error.message);
        return json.result;
    },
    
    encodeAddress(address) {
        return address.toLowerCase().replace('0x', '').padStart(64, '0');
    }
};

// ═══════════════════════════════════════════════════════════
// ХЕЛПЕР: Показать сообщение о необходимости регистрации в GW
// ═══════════════════════════════════════════════════════════

function showNeedGlobalWayMessage() {
    // Проверяем, не показано ли уже
    if (document.querySelector('.gw-registration-modal')) return;
    
    const modal = document.createElement('div');
    modal.className = 'gw-registration-modal';
    modal.innerHTML = `
        <div class="gw-modal-content">
            <div class="gw-modal-icon">🔒</div>
            <h3>Требуется регистрация в GlobalWay</h3>
            <p>Для использования CardGift необходимо сначала зарегистрироваться в GlobalWay.</p>
            <p>После регистрации вы автоматически получите доступ ко всем инструментам.</p>
            <a href="https://globalway.vercel.app" class="gw-modal-btn">
                Перейти в GlobalWay
            </a>
        </div>
    `;
    
    // Стили
    const style = document.createElement('style');
    style.textContent = `
        .gw-registration-modal {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        }
        .gw-modal-content {
            background: linear-gradient(135deg, #0a1628, #1a2d4a);
            border-radius: 20px;
            border: 2px solid #ffd700;
            padding: 40px;
            max-width: 400px;
            text-align: center;
        }
        .gw-modal-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        .gw-modal-content h3 {
            color: #ffd700;
            margin-bottom: 15px;
            font-size: 1.5rem;
        }
        .gw-modal-content p {
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 15px;
            line-height: 1.5;
        }
        .gw-modal-btn {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #ffd700, #ffaa00);
            color: #000;
            text-decoration: none;
            border-radius: 12px;
            font-weight: bold;
            font-size: 1.1rem;
            margin-top: 10px;
            transition: all 0.3s;
        }
        .gw-modal-btn:hover {
            background: linear-gradient(135deg, #ffaa00, #ff8800);
            transform: scale(1.05);
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
}

// ═══════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
    window.BidirectionalSync = BidirectionalSync;
    window.showNeedGlobalWayMessage = showNeedGlobalWayMessage;
}

console.log('🔄 BidirectionalSync loaded');
