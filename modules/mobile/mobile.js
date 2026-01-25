/* =====================================================
   CARDGIFT - MOBILE & PWA MODULE
   Вырезано из dashboard.js (строки 595-1135)
   
   Включает:
   - Mobile detection
   - PWA functions
   - SafePal integration
   - User IDs management
   ===================================================== */

// ============ MOBILE & PWA ============
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function openInSafePal() {
    const currentUrl = encodeURIComponent(window.location.href);
    const safePalDeepLink = `https://link.safepal.io/dapp?url=${currentUrl}`;
    
    showToast('Открываем в SafePal...', 'info');
    window.location.href = safePalDeepLink;
    
    setTimeout(() => {
        if (confirm('Установите SafePal из App Store или Google Play\n\nОткрыть магазин?')) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
                window.location.href = 'https://apps.apple.com/app/safepal-wallet/id1548297139';
            } else {
                window.location.href = 'https://play.google.com/store/apps/details?id=io.safepal.wallet';
            }
        }
    }, 2500);
}

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

async function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            showToast('✅ Приложение установлено!', 'success');
        }
        deferredPrompt = null;
        return;
    }
    showInstallInstructions();
}

function showInstallInstructions() {
    const existingModal = document.getElementById('installModal');
    if (existingModal) existingModal.remove();
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (isStandalone) {
        showToast('✅ Приложение уже установлено!', 'success');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'installModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.9); z-index: 100000;
        display: flex; align-items: center; justify-content: center; padding: 20px;
    `;
    
    let instructionsHTML = isIOS ? `
        <div style="text-align: center;">
            <div style="font-size: 60px; margin-bottom: 15px;">📱</div>
            <h2 style="color: #fff; margin: 0 0 20px;">Установка на iPhone/iPad</h2>
            <div style="text-align: left; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px;">
                <p style="color: #fff; margin: 10px 0;">1. Нажмите кнопку <strong style="color: #007AFF;">Поделиться</strong> (📤)</p>
                <p style="color: #fff; margin: 10px 0;">2. Выберите <strong style="color: #007AFF;">На экран «Домой»</strong></p>
                <p style="color: #fff; margin: 10px 0;">3. Нажмите <strong style="color: #007AFF;">Добавить</strong></p>
            </div>
        </div>
    ` : `
        <div style="text-align: center;">
            <div style="font-size: 60px; margin-bottom: 15px;">📱</div>
            <h2 style="color: #fff; margin: 0 0 20px;">Установка на Android</h2>
            <div style="text-align: left; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px;">
                <p style="color: #fff; margin: 10px 0;">1. Нажмите меню <strong style="color: #4CAF50;">⋮</strong> (три точки)</p>
                <p style="color: #fff; margin: 10px 0;">2. Выберите <strong style="color: #4CAF50;">Добавить на главный экран</strong></p>
                <p style="color: #fff; margin: 10px 0;">3. Нажмите <strong style="color: #4CAF50;">Установить</strong></p>
            </div>
        </div>
    `;
    
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 20px; max-width: 400px; width: 100%; padding: 30px; position: relative;">
            <button onclick="closeInstallModal()" style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.1); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer;">×</button>
            ${instructionsHTML}
            <button onclick="closeInstallModal()" style="width: 100%; margin-top: 20px; padding: 12px; background: rgba(255,255,255,0.1); color: #fff; border: none; border-radius: 10px; cursor: pointer;">Понятно</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeInstallModal(); });
}

function closeInstallModal() {
    const modal = document.getElementById('installModal');
    if (modal) modal.remove();
}

function showSafePalBanner() {
    if (!isMobile()) return;
    if (getWeb3Provider()) return;
    if (document.getElementById('safePalBanner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'safePalBanner';
    banner.style.cssText = `
        position: fixed; bottom: 0; left: 0; right: 0;
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        padding: 15px 20px; display: flex; align-items: center;
        justify-content: space-between; gap: 10px; z-index: 99999;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.5); border-top: 1px solid #333;
    `;
    
    banner.innerHTML = `
        <span style="color: #aaa; font-size: 13px; flex: 1;">Для полного доступа откройте в SafePal</span>
        <button onclick="openInSafePal()" style="background: linear-gradient(135deg, #4CAF50, #2E7D32); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">🔐 SafePal</button>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #666; font-size: 20px; cursor: pointer;">×</button>
    `;
    
    document.body.appendChild(banner);
}

async function connectWalletGeneric(provider) {
    showToast(`Подключение ${provider}...`, 'info');
    
    var web3Provider = getWeb3Provider();
    
    if (web3Provider) {
        try {
            var accounts = await web3Provider.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts[0]) {
                walletAddress = accounts[0].toLowerCase();
                walletConnected = true;
                
                console.log('🔄 Checking wallet with IdLinkingService v4.0...');
                
                // Используем IdLinkingService v4.0
                if (window.IdLinkingService) {
                    const result = await IdLinkingService.onWalletConnected(walletAddress);
                    
                    console.log('📋 IdLinkingService result:', result);
                    
                    if (result.success) {
                        currentUserLevel = result.level || 0;
                        
                        // Сохраняем ВСЕ типы ID (v4.0)
                        window.currentTempId = result.tempId;
                        window.currentGwId = result.gwId;
                        window.currentDisplayId = result.displayId;
                        window.currentCgId = result.displayId; // для совместимости
                        
                        console.log('✅ Wallet connected:', {
                            displayId: result.displayId,
                            tempId: result.tempId,
                            gwId: result.gwId,
                            level: result.level,
                            isNew: result.isNew
                        });
                        
                        if (result.isNew) {
                            showToast(`Добро пожаловать! Ваш ID: ${result.displayId}`, 'success');
                        }
                    } else {
                        console.warn('⚠️ IdLinkingService returned error');
                        currentUserLevel = await checkWalletLevel(walletAddress);
                    }
                } else {
                    // Fallback - старый метод
                    currentUserLevel = await checkWalletLevel(walletAddress);
                }
                
                console.log('✅ Level:', currentUserLevel);
                
                localStorage.setItem('cardgift_wallet', walletAddress);
                localStorage.setItem('cardgift_level', currentUserLevel);
                
                updateWalletUI();
                updateAccessLocks();
                updateLevelButtons();
                updateUserIds();
                
                // Перезагружаем контакты
                loadContacts();
                
                showToast('Кошелек подключен! Уровень: ' + currentUserLevel, 'success');
                showSection('panel');
            }
        } catch (err) {
            console.error('Wallet connection error:', err);
            showToast('Ошибка подключения: ' + err.message, 'error');
        }
    } else {
        if (isMobile()) {
            openInSafePal();
        } else {
            showToast('Установите SafePal или MetaMask', 'error');
        }
    }
}

function getWeb3Provider() {
    if (window.safepal && window.safepal.ethereum) return window.safepal.ethereum;
    if (window.ethereum && window.ethereum.isSafePal) return window.ethereum;
    if (window.ethereum) return window.ethereum;
    return null;
}

async function checkWalletLevel(address) {
    var wallet = address.toLowerCase();
    
    // Проверяем Owner/Founders (hardcoded для гарантии)
    var ownerAddresses = [
        '0x7bcd1753868895971e12448412cb3216d47884c8',
        '0x9b49bd9c9458615e11c051afd1ebe983563b67ee',
        '0x03284a899147f5a07f82c622f34df92198671635'
    ];
    
    if (ownerAddresses.includes(wallet)) {
        console.log('👑 Owner detected! Level 12');
        return 12;
    }
    
    // Читаем уровень из контракта GlobalWay
    if (window.GlobalWayBridge) {
        try {
            if (typeof GlobalWayBridge.getUserLevel === 'function') {
                var level = await GlobalWayBridge.getUserLevel(wallet);
                console.log('✅ GlobalWay level from contract:', level);
                return level;
            }
            // Fallback на getUserRank если getUserLevel нет
            if (typeof GlobalWayBridge.getUserRank === 'function') {
                var rank = await GlobalWayBridge.getUserRank(wallet);
                var mappedLevel = mapRankToLevel(rank);
                console.log('✅ GlobalWay rank:', rank, '→ level:', mappedLevel);
                return mappedLevel;
            }
        } catch (e) {
            console.warn('GlobalWay check failed:', e);
        }
    }
    
    console.log('⚠️ Could not get level from contract, returning 0');
    return 0;
}

function mapRankToLevel(rank) {
    var mapping = { 0: 0, 1: 3, 2: 6, 3: 8, 4: 9, 5: 12 };
    return mapping[rank] !== undefined ? mapping[rank] : 0;
}

function disconnectWallet() {
    walletAddress = null;
    walletConnected = false;
    currentUserLevel = 0;
    
    // Очищаем все window переменные
    window.currentTempId = null;
    window.currentGwId = null;
    window.currentDisplayId = null;
    window.currentCgId = null;
    
    // Очищаем localStorage через IdLinkingService или вручную
    if (window.IdLinkingService && typeof IdLinkingService.clearLocalStorage === 'function') {
        IdLinkingService.clearLocalStorage();
    } else {
        localStorage.removeItem('cardgift_wallet');
        localStorage.removeItem('cardgift_level');
        localStorage.removeItem('cardgift_temp_id');
        localStorage.removeItem('cardgift_gw_id');
        localStorage.removeItem('cardgift_display_id');
        localStorage.removeItem('cardgift_cg_id');
    }
    
    updateWalletUI();
    updateAccessLocks();
    showToast('Кошелек отключен', 'success');
    showSection('panel');
}

function updateWalletUI() {
    const walletBox = document.getElementById('walletBox');
    const walletStatus = document.getElementById('walletStatus');
    const walletStatusText = document.getElementById('walletStatusText');
    
    if (walletConnected && walletAddress) {
        walletBox?.classList.add('connected');
        const shortAddr = walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4);
        if (walletStatus) walletStatus.textContent = shortAddr;
        if (walletStatusText) walletStatusText.textContent = shortAddr;
        loadContacts();
    } else {
        walletBox?.classList.remove('connected');
        if (walletStatus) walletStatus.textContent = 'NOT_CONNECTED';
        if (walletStatusText) walletStatusText.textContent = 'Not Connected';
    }
    
    updateReferralLink();
    updateUserIds(); // Обновляем блок ID
}

// Обновление блока ID пользователя (v4.0)
async function updateUserIds() {
    const cgIdDisplay = document.getElementById('userCgIdDisplay');
    const gwIdDisplay = document.getElementById('userGwIdDisplay');
    const levelDisplay = document.getElementById('userLevelDisplay');
    const walletDisplay = document.getElementById('userWalletDisplay');
    
    // Owner данные (hardcoded для гарантии)
    const ownerData = {
        '0x7bcd1753868895971e12448412cb3216d47884c8': { displayId: 'GW9729645', gwId: 'GW9729645' },
        '0x9b49bd9c9458615e11c051afd1ebe983563b67ee': { displayId: 'GW7346221', gwId: 'GW7346221' },
        '0x03284a899147f5a07f82c622f34df92198671635': { displayId: 'GW1514866', gwId: 'GW1514866' }
    };
    
    let displayId = '—';
    let gwId = '—';
    
    // 1. Проверяем URL параметры
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('userId') || urlParams.get('id');
    if (urlUserId) {
        displayId = urlUserId;
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
    
    // 2. Проверяем Owner
    if (walletAddress && ownerData[walletAddress.toLowerCase()]) {
        const owner = ownerData[walletAddress.toLowerCase()];
        displayId = owner.displayId;
        gwId = owner.gwId;
        console.log('👑 Owner detected:', displayId);
    } 
    // 3. Используем данные из window (установлены при подключении кошелька)
    else if (displayId === '—') {
        // Приоритет: displayId → gwId → tempId → cgId (legacy)
        if (window.currentDisplayId) {
            displayId = window.currentDisplayId;
        } else if (window.currentGwId) {
            displayId = window.currentGwId;
        } else if (window.currentTempId) {
            displayId = window.currentTempId;
        } else if (window.currentCgId && window.currentCgId !== 'undefined') {
            displayId = window.currentCgId;
        }
        
        // Из localStorage
        if (displayId === '—') {
            displayId = localStorage.getItem('cardgift_display_id') 
                     || localStorage.getItem('cardgift_gw_id') 
                     || localStorage.getItem('cardgift_temp_id')
                     || localStorage.getItem('cardgift_cg_id')
                     || '—';
        }
        
        // GW ID отдельно
        gwId = window.currentGwId 
            || localStorage.getItem('cardgift_gw_id') 
            || '—';
    }
    
    // Убираем undefined
    if (displayId === 'undefined' || displayId === undefined) displayId = '—';
    if (gwId === 'undefined' || gwId === undefined) gwId = '—';
    
    // Сохраняем глобально
    if (displayId && displayId !== '—') {
        window.currentDisplayId = displayId;
        window.currentCgId = displayId; // для совместимости
    }
    
    // Отображаем
    if (cgIdDisplay) cgIdDisplay.textContent = displayId;
    if (gwIdDisplay) gwIdDisplay.textContent = gwId;
    
    // Level
    if (levelDisplay) {
        levelDisplay.textContent = `${currentUserLevel} (${LEVEL_NAMES[currentUserLevel] || 'Неизвестно'})`;
        levelDisplay.style.color = LEVEL_COLORS[currentUserLevel] || '#666';
    }
    
    // Wallet
    if (walletDisplay) {
        if (walletAddress && walletAddress !== '0xAUTHOR_MODE') {
            walletDisplay.textContent = walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4);
        } else {
            walletDisplay.textContent = 'Не подключен';
        }
    }
    
    // Обновляем реферальную ссылку
    updateReferralLink();
    
    // Обновляем промо-блок
    if (typeof updateLevelPromo === 'function') {
        updateLevelPromo();
    }
    
    console.log('📋 Updated IDs:', { displayId, gwId, level: currentUserLevel });
}

// Данные о том, что открывает каждый уровень
const LEVEL_UNLOCKS = {
    1: '📊 Панель + 📁 Архив',
    2: '👥 Контакты + 📈 Аналитика',
    3: '🔗 Рефералы (1 уровень партнёрки)',
    4: '💼 CRM (3 уровня партнёрки)',
    5: '📋 Опросы + 📝 Блог',
    6: '📧 Рассылки',
    7: '🎬 GlobalStudio',
    8: '💰 МЛМ Проекты',
    9: '🏢 Организатор + 👑 Соавторы',
    10: '⭐ Все возможности',
    11: '⭐ Все возможности',
    12: '⭐ Все возможности (Максимум)'
};

function updateLevelPromo() {
    const promoLevel = document.getElementById('promoCurrentLevel');
    const nextFeatureText = document.getElementById('nextFeatureText');
    const nextFeaturesBlock = document.getElementById('nextFeaturesBlock');
    
    if (promoLevel) {
        promoLevel.textContent = currentUserLevel;
    }
    
    if (nextFeatureText && nextFeaturesBlock) {
        const nextLevel = currentUserLevel + 1;
        
        if (currentUserLevel >= 12) {
            // Максимальный уровень
            nextFeaturesBlock.innerHTML = `
                <span class="promo-label">Статус:</span>
                <span class="next-feature-text" style="color: #FFD700;">👑 Максимальный уровень достигнут!</span>
            `;
        } else if (currentUserLevel >= 9) {
            // Уровни 9-11
            nextFeaturesBlock.innerHTML = `
                <span class="promo-label">Следующий уровень откроет:</span>
                <span class="next-feature-text">${LEVEL_UNLOCKS[nextLevel] || 'Дополнительные бонусы'}</span>
            `;
        } else {
            nextFeatureText.textContent = LEVEL_UNLOCKS[nextLevel] || 'Новые возможности';
        }
    }
}

// ═══════════════════════════════════════════════════════════
// ЗАМЕНИ функцию updateReferralLink() в dashboard.js (строки 1036-1103)
// ═══════════════════════════════════════════════════════════

function updateReferralLink() {
    const input = document.getElementById('referralLinkInput');
    const userIdDisplay = document.getElementById('userCgIdDisplay');
    const restrictedBlock = document.getElementById('referralRestricted');
    const shortLinkSpan = document.getElementById('shortReferralLink'); // ← НОВОЕ
    
    // ✅ FIX v4.3: Скрываем/показываем замок в зависимости от уровня
    if (restrictedBlock) {
        if (currentUserLevel >= 3) {
            restrictedBlock.style.display = 'none';
        } else {
            restrictedBlock.style.display = 'block';
        }
    }
    
    // Получаем ID для реферальной ссылки - ПРИОРИТЕТ GW ID!
    let displayId = window.currentGwId 
                 || window.currentDisplayId 
                 || window.currentCgId
                 || localStorage.getItem('cardgift_gw_id')
                 || localStorage.getItem('cardgift_display_id')
                 || localStorage.getItem('cardgift_cg_id');
    
    // Owner данные
    const ownerIds = {
        '0x7bcd1753868895971e12448412cb3216d47884c8': 'GW9729645',
        '0x9b49bd9c9458615e11c051afd1ebe983563b67ee': 'GW7346221',
        '0x03284a899147f5a07f82c622f34df92198671635': 'GW1514866'
    };
    
    // Проверяем Owner
    if (walletAddress && ownerIds[walletAddress.toLowerCase()]) {
        displayId = ownerIds[walletAddress.toLowerCase()];
        console.log('👑 Owner ID:', displayId);
    }
    
    // Убираем undefined
    if (!displayId || displayId === 'undefined' || displayId === '—') {
        displayId = null;
    }
    
    console.log('📋 Referral ID:', displayId);
    
    // Обновляем реферальную ссылку
    if (input) {
        if (displayId) {
            // Убираем префиксы для красивой ссылки
            let refId = displayId;
            if (refId.startsWith('GW')) refId = refId.substring(2);
            if (refId.startsWith('CG_TEMP_')) refId = refId.substring(8);
            
            // ✅ Используем основной домен cardgift.site
            const domain = 'https://cardgift.site';
            
            // Полная ссылка (на корень сайта)
            input.value = `${domain}/?ref=${refId}`;
            
            // ═══════════════════════════════════════════════════════════
            // ✅ НОВОЕ: Короткая ссылка
            // ═══════════════════════════════════════════════════════════
            if (shortLinkSpan) {
                const shortLink = `${domain}/r/${refId}`;
                shortLinkSpan.innerHTML = `<a href="${shortLink}" target="_blank" style="color: #4CAF50; text-decoration: none;">${shortLink}</a>`;
            }
        } else {
            input.value = 'Зарегистрируйтесь для получения реф. ссылки';
            if (shortLinkSpan) {
                shortLinkSpan.textContent = '—';
            }
        }
    }
    
    // Обновляем отображение ID
    if (userIdDisplay) {
        userIdDisplay.textContent = displayId || 'Не зарегистрирован';
    }
    
    // Сохраняем глобально
    if (displayId) {
        window.currentDisplayId = displayId;
        window.currentCgId = displayId;
    }
}


// ===== ЭКСПОРТ =====
window.isMobile = isMobile;
window.isInAppBrowser = isInAppBrowser;
window.openInSafePal = openInSafePal;
window.showOpenInWalletBanner = showOpenInWalletBanner;
window.updateUserIds = updateUserIds;
window.initPWA = initPWA;

console.log('📱 Mobile & PWA Module loaded');
