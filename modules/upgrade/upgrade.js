/* =====================================================
   CARDGIFT - UPGRADE MODULE
   Вырезано из dashboard.js (строки 2237-3050)
   
   Включает:
   - UPGRADE MODAL (showUpgradeModal, activateLevel)
   - GLOBALWAY INTEGRATION (goToGlobalWay, registerInGlobalWay)
   - GLOBAL ACCESS (window exports)
   - СИСТЕМНАЯ СТАТИСТИКА
   
   Зависимости:
   - window.GlobalWayBridge (globalway-bridge.js)
   - window.SupabaseClient (supabase.js)
   - window.showToast (common.js)
   - window.getWeb3Provider (wallet.js)
   - LEVEL_PRICES, RANK_INFO (config.js)
   
   Глобальные переменные (из dashboard.js):
   - walletAddress
   - currentUserLevel
   ===================================================== */

// ============ UPGRADE MODAL ============
const RANK_INFO = {
    client: { name: 'Клиент', levels: '1-3', color: '#888', access: 'Архив (до 3 открыток)' },
    miniAdmin: { name: 'Мини Админ', levels: '4-6', color: '#4CAF50', access: 'Контакты, Рефералы' },
    admin: { name: 'Админ', levels: '7-8', color: '#2196F3', access: 'CRM, Блог, Аналитика' },
    superAdmin: { name: 'Супер Админ', levels: '9', color: '#FF9800', access: 'Рассылки, Партнёрка' },
    businessman: { name: 'Бизнесмен', levels: '10-12', color: '#FFD700', access: 'Полный доступ' }
};

function showUpgradeModal() {
    const existingModal = document.getElementById('upgradeModal');
    if (existingModal) existingModal.remove();
    
    if (walletAddress && walletAddress !== '0xAUTHOR_MODE' && window.GlobalWayBridge) {
        GlobalWayBridge.getUserLevel(walletAddress).then(level => renderUpgradeModal(level));
    } else {
        renderUpgradeModal(currentUserLevel);
    }
}

function renderUpgradeModal(currentLevel) {
    const modal = document.createElement('div');
    modal.id = 'upgradeModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;`;
    
    const nextLevel = currentLevel + 1;
    const price = LEVEL_PRICES[nextLevel] || 0;
    
    let currentRankInfo = RANK_INFO.client;
    if (currentLevel >= 10) currentRankInfo = RANK_INFO.businessman;
    else if (currentLevel >= 9) currentRankInfo = RANK_INFO.superAdmin;
    else if (currentLevel >= 7) currentRankInfo = RANK_INFO.admin;
    else if (currentLevel >= 4) currentRankInfo = RANK_INFO.miniAdmin;
    
    const ranksHTML = Object.entries(RANK_INFO).map(([key, rank]) => `
        <div style="display: flex; gap: 10px; padding: 10px; border-left: 3px solid ${rank.color}; background: rgba(255,255,255,0.03); margin-bottom: 8px; border-radius: 0 8px 8px 0;">
            <div style="min-width: 45px; color: ${rank.color}; font-weight: bold;">${rank.levels}</div>
            <div><div style="color: ${rank.color}; font-weight: bold;">${rank.name}</div><div style="font-size: 11px; color: #888;">${rank.access}</div></div>
        </div>
    `).join('');
    
    let activationHTML = nextLevel <= 12 ? `
        <div style="background: linear-gradient(135deg, #1a1a3e, #0a0a2e); padding: 20px; border-radius: 15px; text-align: center;">
            <div style="color: #aaa; font-size: 13px;">Текущий: <span style="color: ${currentRankInfo.color}; font-weight: bold;">${currentLevel}</span> (${currentRankInfo.name})</div>
            <div style="font-size: 28px; color: #FFD700; font-weight: bold; margin: 10px 0;">${price} BNB</div>
            <button onclick="activateLevel(${nextLevel})" style="width: 100%; padding: 15px; background: linear-gradient(135deg, #FFD700, #FFA000); color: #000; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">🚀 АКТИВИРОВАТЬ УРОВЕНЬ ${nextLevel}</button>
        </div>
    ` : `<div style="background: linear-gradient(135deg, #FFD700, #FFA000); padding: 20px; border-radius: 15px; text-align: center;"><div style="font-size: 24px;">👑</div><div style="font-size: 18px; color: #000; font-weight: bold;">Максимальный уровень!</div></div>`;
    
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 20px; max-width: 420px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
            <button onclick="closeUpgradeModal()" style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.1); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer;">×</button>
            <div style="text-align: center; padding: 25px 20px 15px;"><div style="font-size: 40px;">🎁</div><h2 style="color: #fff; margin: 0; font-size: 20px;">Повышение статуса</h2></div>
            <div style="padding: 0 20px 15px;">${activationHTML}</div>
            <div style="padding: 0 20px 20px;"><h3 style="color: #FFD700; font-size: 14px; text-align: center; margin-bottom: 12px;">Система рангов</h3>${ranksHTML}</div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeUpgradeModal(); });
}

function closeUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    if (modal) modal.remove();
}

async function activateLevel(level) {
    const price = LEVEL_PRICES[level];
    
    if (!walletAddress || walletAddress === '0xAUTHOR_MODE') {
        showToast('Подключите кошелёк', 'error');
        return;
    }
    
    // Проверяем что уровень следующий после текущего
    if (level > currentUserLevel + 1) {
        showToast(`Сначала активируйте уровень ${currentUserLevel + 1}`, 'warning');
        return;
    }
    
    // Показываем модальное окно активации
    showActivationModal(level, price);
}

// Модальное окно активации уровня
function showActivationModal(level, price) {
    const modal = document.createElement('div');
    modal.className = 'activation-modal';
    modal.id = 'activationModal';
    modal.innerHTML = `
        <div class="activation-modal-content">
            <h3>🚀 Активация уровня ${level}</h3>
            <div class="price">${price} BNB</div>
            <div class="status-text" id="activationStatus">Подтвердите транзакцию в кошельке</div>
            <div style="margin-top: 20px;">
                <button class="btn-confirm" onclick="confirmActivation(${level})">Активировать</button>
                <button class="btn-cancel" onclick="closeActivationModal()">Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeActivationModal() {
    const modal = document.getElementById('activationModal');
    if (modal) modal.remove();
}

async function confirmActivation(level) {
    const statusEl = document.getElementById('activationStatus');
    
    try {
        if (!walletAddress || walletAddress === '0xAUTHOR_MODE') {
            throw new Error('Подключите кошелёк');
        }
        
        // 1. Проверяем регистрацию в GlobalWay
        if (statusEl) statusEl.textContent = 'Проверка регистрации...';
        
        let isRegistered = false;
        if (window.GlobalWayBridge && typeof GlobalWayBridge.isRegisteredInGlobalWay === 'function') {
            isRegistered = await GlobalWayBridge.isRegisteredInGlobalWay(walletAddress);
            console.log('📋 Is registered in GlobalWay:', isRegistered);
        }
        
        // 2. Если НЕ зарегистрирован - сначала регистрируем
        if (!isRegistered) {
            if (statusEl) statusEl.textContent = 'Поиск спонсора...';
            
            // Получаем CG ID для поиска спонсора
            let userCgId = window.currentCgId || localStorage.getItem('cardgift_cg_id');
            if (window.AuthService) {
                const user = AuthService.getUser?.();
                if (user && user.cg_id) userCgId = user.cg_id;
            }
            
            // Ищем спонсора по цепочке CG
            let sponsorId = null;
            const supabase = window.supabase || window.SupabaseAPI?.client;
            
            if (window.findGlobalWaySponsor && userCgId && supabase) {
                sponsorId = await findGlobalWaySponsor(userCgId, supabase);
            } else {
                // Рандомный спонсор если функция недоступна
                const randomSponsors = [7346221, 1514866];
                sponsorId = randomSponsors[Math.floor(Math.random() * randomSponsors.length)];
            }
            
            console.log('📋 Sponsor for registration:', sponsorId);
            
            // Регистрируем в GlobalWay
            if (statusEl) statusEl.textContent = 'Регистрация (бесплатно)...';
            
            if (window.GlobalWayBridge && typeof GlobalWayBridge.registerInGlobalWay === 'function') {
                const regResult = await GlobalWayBridge.registerInGlobalWay(sponsorId);
                
                if (!regResult.success) {
                    throw new Error('Ошибка регистрации: ' + (regResult.error || 'Unknown'));
                }
                
                console.log('✅ Registration TX:', regResult.txHash);
                
                // Ждём подтверждения
                if (statusEl) statusEl.textContent = 'Ожидание подтверждения регистрации...';
                await new Promise(r => setTimeout(r, 3000));
                
                // Получаем новый GW ID
                if (typeof GlobalWayBridge.getGlobalWayId === 'function') {
                    const newGwId = await GlobalWayBridge.getGlobalWayId(walletAddress);
                    if (newGwId) {
                        console.log('✅ New GW ID:', newGwId);
                        localStorage.setItem('cardgift_gw_id', newGwId);
                        
                        // Сохраняем в Supabase
                        if (supabase && userCgId) {
                            await supabase
                                .from('users')
                                .update({ 
                                    gw_id: newGwId,
                                    gw_registered_at: new Date().toISOString(),
                                    wallet_address: walletAddress.toLowerCase()
                                })
                                .eq('cg_id', userCgId);
                        }
                    }
                }
            } else {
                throw new Error('GlobalWayBridge не загружен');
            }
        }
        
        // 3. Теперь активируем уровень
        if (statusEl) statusEl.textContent = `Активация уровня ${level}...`;
        
        if (window.GlobalWayBridge && typeof GlobalWayBridge.activateLevel === 'function') {
            const result = await GlobalWayBridge.activateLevel(level);
            
            if (result.success) {
                console.log('✅ Activation TX:', result.txHash);
                showToast(`Уровень ${level} активирован!`, 'success');
                
                // Обновляем данные
                localStorage.setItem('cardgift_level', level);
                currentUserLevel = level;
                
                closeActivationModal();
                updateLevelButtons();
                updateAccessLocks();
                updateUserIds();
            } else {
                throw new Error(result.error || 'Ошибка активации');
            }
        } else {
            // Fallback - прямой вызов контракта
            const provider = getWeb3Provider();
            if (!provider) {
                if (isMobile()) { openInSafePal(); return; }
                throw new Error('Кошелёк не найден');
            }
            
            const GLOBALWAY_ADDRESS = '0xc6E769A790cE87f9Dd952Dca6Ac1A9526Bc0FBe7';
            const priceWei = '0x' + Math.floor(LEVEL_PRICES[level] * 1e18).toString(16);
            const levelHex = level.toString(16).padStart(64, '0');
            const data = '0x68a69bc7' + levelHex;
            
            const txHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [{ from: walletAddress, to: GLOBALWAY_ADDRESS, value: priceWei, data: data }]
            });
            
            console.log('✅ TX:', txHash);
            showToast(`Уровень ${level} активирован!`, 'success');
            localStorage.setItem('cardgift_level', level);
            currentUserLevel = level;
            closeActivationModal();
            updateLevelButtons();
            updateAccessLocks();
            updateUserIds();
        }
        
    } catch (error) {
        console.error('Activation error:', error);
        showToast('Ошибка: ' + (error.message || 'Отклонено'), 'error');
        closeActivationModal();
    }
}

// Обновление кнопок уровней
function updateLevelButtons() {
    const levelCards = document.querySelectorAll('.level-card');
    
    levelCards.forEach(card => {
        const level = parseInt(card.dataset.level);
        const btn = card.querySelector('.btn-level');
        
        if (level <= currentUserLevel) {
            // Уровень активирован
            card.classList.add('active');
            card.classList.remove('current');
            btn.className = 'btn btn-level btn-completed';
            btn.textContent = '✅ Активирован';
            btn.disabled = true;
        } else if (level === currentUserLevel + 1) {
            // Следующий уровень для активации
            card.classList.remove('active');
            card.classList.add('current');
            btn.className = 'btn btn-level btn-activate';
            btn.textContent = 'Активировать';
            btn.disabled = false;
        } else {
            // Заблокированный уровень
            card.classList.remove('active', 'current');
            btn.className = 'btn btn-level btn-locked';
            btn.textContent = `🔒 Уровень ${level}`;
            btn.disabled = true;
        }
    });
    
    // Обновляем статус текущего уровня
    const levelDisplay = document.getElementById('currentLevelDisplay');
    if (levelDisplay) {
        const levelNames = {
            0: 'Не активирован',
            1: 'FREE', 2: 'USER', 3: 'MINI',
            4: 'LITE', 5: 'STANDARD', 6: 'BUSINESS',
            7: 'PREMIUM', 8: 'ADMIN', 9: 'SUPER',
            10: 'MANAGER', 11: 'LEADER', 12: 'AUTHOR'
        };
        levelDisplay.textContent = `${currentUserLevel} (${levelNames[currentUserLevel] || 'Неизвестно'})`;
    }
}

// ============ GLOBALWAY INTEGRATION ============

// Переход в GlobalWay с проверкой регистрации
async function goToGlobalWay() {
    const gwUrl = 'https://gwr-navy.vercel.app';
    
    if (!walletAddress || walletAddress === '0xAUTHOR_MODE') {
        // Просто открываем GlobalWay
        window.open(gwUrl, '_blank');
        return;
    }
    
    showToast('Проверка регистрации...', 'info');
    
    try {
        // Проверяем регистрацию в GlobalWay
        let isRegistered = false;
        
        if (window.GlobalWayBridge && typeof GlobalWayBridge.isRegisteredInGlobalWay === 'function') {
            isRegistered = await GlobalWayBridge.isRegisteredInGlobalWay(walletAddress);
        }
        
        if (isRegistered) {
            // Уже зарегистрирован - просто переходим
            const gwId = await GlobalWayBridge.getGlobalWayId?.(walletAddress);
            const params = new URLSearchParams({ wallet: walletAddress });
            if (gwId) params.append('gwid', gwId);
            window.open(`${gwUrl}?${params.toString()}`, '_blank');
            showToast('Переход в GlobalWay...', 'info');
        } else {
            // Не зарегистрирован - показываем модальное окно регистрации
            showGlobalWayRegistrationModal();
        }
        
    } catch (error) {
        console.error('goToGlobalWay error:', error);
        // При ошибке просто открываем
        window.open(gwUrl, '_blank');
    }
}

// Модальное окно регистрации в GlobalWay
function showGlobalWayRegistrationModal() {
    const modal = document.createElement('div');
    modal.className = 'activation-modal';
    modal.id = 'gwRegistrationModal';
    modal.innerHTML = `
        <div class="activation-modal-content">
            <h3>🌐 GlobalWay</h3>
            <p style="color: #999; margin-bottom: 20px;">Для доступа к GlobalWay необходима бесплатная регистрация</p>
            <div class="status-text" id="gwRegStatus">Нажмите кнопку для регистрации</div>
            <div style="margin-top: 20px;">
                <button class="btn-confirm" onclick="registerInGlobalWay()">Зарегистрироваться</button>
                <button class="btn-cancel" onclick="closeGwRegistrationModal()">Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeGwRegistrationModal() {
    const modal = document.getElementById('gwRegistrationModal');
    if (modal) modal.remove();
}

async function registerInGlobalWay() {
    const statusEl = document.getElementById('gwRegStatus');
    const gwUrl = 'https://gwr-navy.vercel.app';
    
    try {
        // Получаем CG ID
        let userCgId = null;
        if (window.AuthService) {
            const user = AuthService.getUser?.();
            if (user && user.cg_id) userCgId = user.cg_id;
        }
        if (!userCgId) {
            userCgId = localStorage.getItem('cardgift_cg_id');
        }
        
        // Получаем Supabase клиент
        const supabase = window.supabase || window.SupabaseAPI?.client;
        
        if (statusEl) statusEl.textContent = 'Поиск спонсора...';
        
        // Ищем спонсора по цепочке CardGift
        let sponsorId = null;
        if (window.findGlobalWaySponsor && userCgId && supabase) {
            sponsorId = await findGlobalWaySponsor(userCgId, supabase);
        } else {
            // Рандомный спонсор если функция недоступна
            const randomSponsors = [7346221, 1514866];
            sponsorId = randomSponsors[Math.floor(Math.random() * randomSponsors.length)];
        }
        
        if (statusEl) statusEl.textContent = 'Регистрация (бесплатно)...';
        
        // Регистрируем в GlobalWay
        if (window.GlobalWayBridge && typeof GlobalWayBridge.registerInGlobalWay === 'function') {
            const result = await GlobalWayBridge.registerInGlobalWay(sponsorId);
            
            if (result.success) {
                if (statusEl) statusEl.textContent = 'Ожидание подтверждения...';
                await new Promise(r => setTimeout(r, 3000));
                
                // Получаем GW ID и сохраняем
                const newGwId = await GlobalWayBridge.getGlobalWayId?.(walletAddress);
                
                if (newGwId && supabase && userCgId) {
                    await supabase
                        .from('users')
                        .update({ 
                            gw_id: newGwId,
                            gw_registered_at: new Date().toISOString(),
                            wallet_address: walletAddress.toLowerCase()
                        })
                        .eq('cg_id', userCgId);
                }
                
                showToast('Регистрация успешна!', 'success');
                closeGwRegistrationModal();
                
                // Переходим в GlobalWay
                const params = new URLSearchParams({ wallet: walletAddress });
                if (newGwId) params.append('gwid', newGwId);
                window.open(`${gwUrl}?${params.toString()}`, '_blank');
                
            } else {
                throw new Error(result.error || 'Ошибка регистрации');
            }
        } else {
            throw new Error('GlobalWayBridge не загружен');
        }
        
    } catch (error) {
        console.error('registerInGlobalWay error:', error);
        showToast('Ошибка: ' + error.message, 'error');
        if (statusEl) statusEl.textContent = 'Ошибка: ' + error.message;
    }
}

// Старая функция для совместимости
function openGlobalWay() {
    goToGlobalWay();
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

// ============ СИСТЕМНАЯ СТАТИСТИКА (для авторов) ============

/**
 * Проверяет является ли текущий пользователь автором/соавтором
 */
function isCoauthor() {
    if (!window.CONFIG || !CONFIG.COAUTHORS) return false;
    
    const currentCgId = window.currentCgId || localStorage.getItem('cardgift_cg_id');
    const currentWallet = (localStorage.getItem('cardgift_wallet') || '').toLowerCase();
    
    return CONFIG.COAUTHORS.some(author => 
        author.cgId === currentCgId || 
        author.wallet.toLowerCase() === currentWallet
    );
}

/**
 * Загружает системную статистику из Supabase
 */
async function loadSystemStats() {
    if (!isCoauthor()) {
        console.log('⚠️ System stats: not a coauthor');
        return null;
    }
    
    console.log('📊 Loading system statistics...');
    
    const stats = {
        totalUsers: 0,
        totalContacts: 0,
        usersToday: 0,
        usersThisWeek: 0,
        usersThisMonth: 0,
        topReferrers: [],
        recentUsers: []
    };
    
    if (!window.SupabaseClient || !SupabaseClient.client) {
        console.warn('⚠️ Supabase not available');
        return stats;
    }
    
    try {
        // Всего пользователей
        const { count: usersCount } = await SupabaseClient.client
            .from('users')
            .select('*', { count: 'exact', head: true });
        stats.totalUsers = usersCount || 0;
        
        // Всего контактов
        const { count: contactsCount } = await SupabaseClient.client
            .from('contacts')
            .select('*', { count: 'exact', head: true });
        stats.totalContacts = contactsCount || 0;
        
        // Пользователи за сегодня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: todayCount } = await SupabaseClient.client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());
        stats.usersToday = todayCount || 0;
        
        // За неделю
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: weekCount } = await SupabaseClient.client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekAgo.toISOString());
        stats.usersThisWeek = weekCount || 0;
        
        // За месяц
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const { count: monthCount } = await SupabaseClient.client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', monthAgo.toISOString());
        stats.usersThisMonth = monthCount || 0;
        
        // Топ рефереров
        const { data: referrersData } = await SupabaseClient.client
            .from('users')
            .select('referrer_cg_id')
            .not('referrer_cg_id', 'is', null);
        
        if (referrersData) {
            const referrerCounts = {};
            referrersData.forEach(u => {
                referrerCounts[u.referrer_cg_id] = (referrerCounts[u.referrer_cg_id] || 0) + 1;
            });
            
            stats.topReferrers = Object.entries(referrerCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([cgId, count]) => ({ cgId, count }));
        }
        
        // Последние пользователи
        const { data: recentData } = await SupabaseClient.client
            .from('users')
            .select('cg_id, name, messenger, created_at, referrer_cg_id')
            .order('created_at', { ascending: false })
            .limit(20);
        
        stats.recentUsers = recentData || [];
        
        console.log('✅ System stats loaded:', stats);
        return stats;
        
    } catch (error) {
        console.error('❌ Error loading system stats:', error);
        return stats;
    }
}

/**
 * Отображает системную статистику
 */
async function renderSystemStats() {
    const container = document.getElementById('systemStatsContainer');
    if (!container) return;
    
    if (!isCoauthor()) {
        container.innerHTML = '<p style="color: #888;">Доступ только для авторов</p>';
        return;
    }
    
    container.innerHTML = '<p style="color: #FFD700;">⏳ Загрузка статистики...</p>';
    
    const stats = await loadSystemStats();
    if (!stats) return;
    
    container.innerHTML = `
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div class="stat-card" style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 28px; color: #FFD700; font-weight: bold;">${stats.totalUsers}</div>
                <div style="color: #888; font-size: 12px;">Всего пользователей</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 28px; color: #4CAF50; font-weight: bold;">${stats.totalContacts}</div>
                <div style="color: #888; font-size: 12px;">Всего контактов</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 28px; color: #2196F3; font-weight: bold;">${stats.usersToday}</div>
                <div style="color: #888; font-size: 12px;">Сегодня</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 28px; color: #9C27B0; font-weight: bold;">${stats.usersThisWeek}</div>
                <div style="color: #888; font-size: 12px;">За неделю</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 28px; color: #FF9800; font-weight: bold;">${stats.usersThisMonth}</div>
                <div style="color: #888; font-size: 12px;">За месяц</div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- Топ рефереров -->
            <div style="background: #1a1a2e; padding: 15px; border-radius: 12px;">
                <h4 style="color: #FFD700; margin-bottom: 10px;">🏆 Топ рефереров</h4>
                <table style="width: 100%; font-size: 13px;">
                    <tr style="color: #888;"><th style="text-align: left;">ID</th><th style="text-align: right;">Рефералов</th></tr>
                    ${stats.topReferrers.map((r, i) => `
                        <tr style="color: ${i === 0 ? '#FFD700' : '#FFF'};">
                            <td>${r.cgId}</td>
                            <td style="text-align: right; font-weight: bold;">${r.count}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
            
            <!-- Последние регистрации -->
            <div style="background: #1a1a2e; padding: 15px; border-radius: 12px; max-height: 300px; overflow-y: auto;">
                <h4 style="color: #FFD700; margin-bottom: 10px;">📋 Последние регистрации</h4>
                <table style="width: 100%; font-size: 12px;">
                    <tr style="color: #888;"><th>ID</th><th>Имя</th><th>Спонсор</th><th>Дата</th></tr>
                    ${stats.recentUsers.map(u => `
                        <tr style="color: #CCC;">
                            <td>${u.cg_id}</td>
                            <td>${u.name || '-'}</td>
                            <td>${u.referrer_cg_id || '-'}</td>
                            <td>${new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        </div>
        
        <button onclick="renderSystemStats()" class="btn btn-primary" style="margin-top: 15px;">
            🔄 Обновить статистику
        </button>
    `;
}

window.isCoauthor = isCoauthor;
window.loadSystemStats = loadSystemStats;
window.renderSystemStats = renderSystemStats;
window.updateSectionRestrictions = updateSectionRestrictions;

/**
 * Экспорт всех пользователей в CSV
 */
async function exportAllUsers() {
    if (!isCoauthor()) {
        showToast('Доступ запрещён', 'error');
        return;
    }
    
    showToast('Загрузка данных...', 'info');
    
    try {
        const { data, error } = await SupabaseClient.client
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            showToast('Нет данных для экспорта', 'warning');
            return;
        }
        
        // Формируем CSV
        const headers = ['cg_id', 'name', 'messenger', 'contact', 'referrer_cg_id', 'wallet_address', 'created_at'];
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        // Скачиваем
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cardgift_users_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showToast(`Экспортировано ${data.length} пользователей`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showToast('Ошибка экспорта: ' + error.message, 'error');
    }
}

/**
 * Экспорт всех контактов в CSV
 */
async function exportAllContacts() {
    if (!isCoauthor()) {
        showToast('Доступ запрещён', 'error');
        return;
    }
    
    showToast('Загрузка данных...', 'info');
    
    try {
        const { data, error } = await SupabaseClient.client
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            showToast('Нет данных для экспорта', 'warning');
            return;
        }
        
        // Формируем CSV
        const headers = ['owner_cg_id', 'name', 'platform', 'contact', 'status', 'source', 'created_at'];
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        // Скачиваем
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cardgift_contacts_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showToast(`Экспортировано ${data.length} контактов`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showToast('Ошибка экспорта: ' + error.message, 'error');
    }
}

window.exportAllUsers = exportAllUsers;
window.exportAllContacts = exportAllContacts;

// ═══════════════════════════════════════════════════════════

console.log('🚀 Upgrade Module loaded');
