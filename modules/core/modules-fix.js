/* =====================================================
   CARDGIFT - MODULES FIX
   
   Этот файл содержит все недостающие функции
   которые были пропущены при модуляризации
   
   ПОДКЛЮЧАТЬ ПЕРВЫМ из модулей:
   <script src="modules/core/modules-fix.js"></script>
   <script src="modules/core/dashboard-core.js"></script>
   ...
   ===================================================== */

console.log('🔧 Loading Modules Fix...');

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
window.walletAddress = window.walletAddress || null;
window.walletConnected = window.walletConnected || false;
window.currentUserLevel = window.currentUserLevel || 0;
window.currentDisplayId = window.currentDisplayId || null;
window.currentGwId = window.currentGwId || null;
window.currentTempId = window.currentTempId || null;

// ===== WALLET FUNCTIONS =====

async function initWallet() {
    console.log('🔐 Initializing wallet...');
    
    // Проверяем WalletState
    if (window.WalletState && WalletState.isConnected()) {
        window.walletAddress = WalletState.address.toLowerCase();
        window.walletConnected = true;
        console.log('✅ Wallet restored from WalletState:', window.walletAddress);
    }
    
    // Проверяем localStorage
    var savedAddress = localStorage.getItem('cardgift_wallet') || localStorage.getItem('cg_wallet_address');
    
    if (savedAddress && !window.walletConnected) {
        window.walletAddress = savedAddress.toLowerCase();
        window.walletConnected = true;
        console.log('✅ Wallet restored from localStorage:', window.walletAddress);
    }
    
    if (window.walletConnected && window.walletAddress) {
        // Используем IdLinkingService v4.0
        if (window.IdLinkingService) {
            try {
                const result = await IdLinkingService.onWalletConnected(window.walletAddress);
                if (result && result.success) {
                    window.currentUserLevel = result.level || 0;
                    window.currentTempId = result.tempId;
                    window.currentGwId = result.gwId;
                    window.currentDisplayId = result.displayId;
                    window.currentCgId = result.displayId;
                    
                    console.log('✅ Wallet linked:', {
                        displayId: result.displayId,
                        gwId: result.gwId,
                        level: result.level
                    });
                }
            } catch (e) {
                console.warn('IdLinkingService error:', e);
            }
        }
        
        // Сохраняем уровень
        localStorage.setItem('cardgift_level', window.currentUserLevel);
        
        // Обновляем UI
        updateWalletUI();
        
        // Вызываем дополнительные функции обновления
        if (typeof updateAccessLocks === 'function') updateAccessLocks();
        if (typeof updateLevelButtons === 'function') updateLevelButtons();
        if (typeof updateUserIds === 'function') updateUserIds();
        
        return;
    }
    
    // Проверяем AuthService
    if (window.AuthService) {
        try {
            var user = await AuthService.init();
            if (user && user.wallet_address) {
                window.walletAddress = user.wallet_address.toLowerCase();
                window.walletConnected = true;
                
                if (window.IdLinkingService) {
                    const result = await IdLinkingService.onWalletConnected(window.walletAddress);
                    if (result && result.success) {
                        window.currentUserLevel = result.level || 0;
                        window.currentDisplayId = result.displayId;
                        window.currentGwId = result.gwId;
                    }
                }
                
                console.log('✅ User loaded from AuthService:', window.walletAddress);
                
                updateWalletUI();
                if (typeof updateAccessLocks === 'function') updateAccessLocks();
                if (typeof updateLevelButtons === 'function') updateLevelButtons();
                if (typeof updateUserIds === 'function') updateUserIds();
                return;
            }
        } catch (e) {
            console.warn('AuthService init error:', e);
        }
    }
    
    // Автоподключение через provider если есть
    const provider = getWeb3Provider();
    if (provider) {
        try {
            // Проверяем уже подключенные аккаунты (без запроса)
            const accounts = await provider.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                window.walletAddress = accounts[0].toLowerCase();
                window.walletConnected = true;
                
                localStorage.setItem('cardgift_wallet', window.walletAddress);
                localStorage.setItem('cg_wallet_address', window.walletAddress);
                
                if (window.WalletState) {
                    WalletState.setConnected(window.walletAddress, 204);
                }
                
                console.log('✅ Auto-connected wallet:', window.walletAddress);
                
                if (window.IdLinkingService) {
                    const result = await IdLinkingService.onWalletConnected(window.walletAddress);
                    if (result && result.success) {
                        window.currentUserLevel = result.level || 0;
                        window.currentDisplayId = result.displayId;
                        window.currentGwId = result.gwId;
                    }
                }
                
                updateWalletUI();
                if (typeof updateAccessLocks === 'function') updateAccessLocks();
                if (typeof updateLevelButtons === 'function') updateLevelButtons();
                if (typeof updateUserIds === 'function') updateUserIds();
            }
        } catch (e) {
            console.warn('Auto-connect check failed:', e);
        }
    }
    
    // Добавляем кнопки если на мобильном
    if (isMobile() && !window.walletConnected) {
        addSafePalButton();
    }
}

function addSafePalButton() {
    setTimeout(() => {
        const walletSection = document.getElementById('section-wallet');
        if (!walletSection) return;
        if (document.getElementById('openInSafePalBtn')) return;
        
        const walletCard = walletSection.querySelector('.wallet-card');
        if (walletCard) {
            const safePalDiv = document.createElement('div');
            safePalDiv.style.cssText = 'margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;';
            safePalDiv.innerHTML = `
                <p style="color:#4CAF50; font-size:14px; margin-bottom:15px; text-align:center;">
                    📱 На мобильном? Откройте в приложении SafePal:
                </p>
                <button id="openInSafePalBtn" onclick="openInSafePal()" style="
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(135deg, #4CAF50, #2E7D32);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                ">🔐 Открыть в SafePal</button>
            `;
            walletCard.appendChild(safePalDiv);
        }
    }, 500);
}

function updateWalletUI() {
    const walletBtn = document.getElementById('walletButton');
    
    if (window.walletConnected && window.walletAddress) {
        if (walletBtn) {
            walletBtn.innerHTML = `<span class="wallet-icon">💳</span><span class="wallet-text">${window.walletAddress.slice(0, 6)}...${window.walletAddress.slice(-4)}</span>`;
            walletBtn.classList.add('connected');
        }
    } else {
        if (walletBtn) {
            walletBtn.innerHTML = `<span class="wallet-icon">💳</span><span class="wallet-text">Подключить</span>`;
            walletBtn.classList.remove('connected');
        }
    }
}

function getWeb3Provider() {
    if (window.safepal) return window.safepal;
    if (window.ethereum?.isSafePal) return window.ethereum;
    if (window.ethereum) return window.ethereum;
    return null;
}

async function connectSafePal() {
    if (isMobile() && !getWeb3Provider()) {
        openInSafePal();
        return;
    }
    await connectWalletGeneric('SafePal');
}

async function connectMetaMask() {
    await connectWalletGeneric('MetaMask');
}

async function connectWalletConnect() {
    await connectWalletGeneric('WalletConnect');
}

async function connectWalletGeneric(walletType) {
    console.log(`Connecting ${walletType}...`);
    
    const provider = getWeb3Provider();
    if (!provider) {
        if (typeof showToast === 'function') {
            showToast('Кошелёк не найден. Установите SafePal или MetaMask', 'error');
        }
        return;
    }
    
    try {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
            window.walletAddress = accounts[0].toLowerCase();
            window.walletConnected = true;
            
            localStorage.setItem('cardgift_wallet', window.walletAddress);
            localStorage.setItem('cg_wallet_address', window.walletAddress);
            
            updateWalletUI();
            
            if (window.IdLinkingService) {
                const result = await IdLinkingService.onWalletConnected(window.walletAddress);
                if (result && result.success) {
                    window.currentUserLevel = result.level || 0;
                    window.currentDisplayId = result.displayId;
                    window.currentGwId = result.gwId;
                }
            }
            
            if (typeof showToast === 'function') {
                showToast('Кошелёк подключен!', 'success');
            }
        }
    } catch (error) {
        console.error('Wallet connection error:', error);
    }
}

function disconnectWallet() {
    window.walletAddress = null;
    window.walletConnected = false;
    window.currentUserLevel = 0;
    
    localStorage.removeItem('cardgift_wallet');
    localStorage.removeItem('cg_wallet_address');
    
    updateWalletUI();
    
    if (typeof showToast === 'function') {
        showToast('Кошелёк отключен', 'info');
    }
}

// ===== REFERRAL FUNCTIONS =====

function copyReferralLink() {
    const displayId = window.currentDisplayId || window.currentGwId || window.currentTempId;
    if (!displayId) {
        if (typeof showToast === 'function') {
            showToast('Сначала подключите кошелёк', 'error');
        }
        return;
    }
    
    const link = `${window.location.origin}/registration.html?ref=${displayId}`;
    
    navigator.clipboard.writeText(link).then(() => {
        if (typeof showToast === 'function') {
            showToast('Реферальная ссылка скопирована!', 'success');
        }
    }).catch(() => {
        const input = document.createElement('input');
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        if (typeof showToast === 'function') {
            showToast('Реферальная ссылка скопирована!', 'success');
        }
    });
}

function shareReferralLink() {
    const input = document.getElementById('referralLinkInput');
    const displayId = window.currentDisplayId || window.currentGwId || window.currentTempId;
    const link = input ? input.value : `${window.location.origin}/registration.html?ref=${displayId}`;
    
    if (navigator.share) {
        navigator.share({ 
            title: 'CardGift', 
            text: 'Присоединяйся к CardGift!',
            url: link 
        }).catch(() => {
            copyReferralLink();
        });
    } else {
        copyReferralLink();
    }
}

// ===== MOBILE FUNCTIONS =====

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isInAppBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return /FBAN|FBAV|Instagram|Telegram|WhatsApp|Viber|Line/i.test(ua);
}

function openInSafePal() {
    const currentUrl = encodeURIComponent(window.location.href);
    const safePalDeepLink = `https://link.safepal.io/dapp?url=${currentUrl}`;
    window.location.href = safePalDeepLink;
}

function showOpenInWalletBanner() {
    if (!isMobile()) return;
    if (window.ethereum || window.safepal) return; // Уже есть кошелёк
    
    const existingBanner = document.getElementById('walletBanner');
    if (existingBanner) return;
    
    const banner = document.createElement('div');
    banner.id = 'walletBanner';
    banner.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        padding: 15px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        z-index: 99999;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
        border-top: 1px solid #333;
    `;
    
    banner.innerHTML = `
        <span style="color: #fff; font-size: 14px;">📱 Для полного доступа откройте в SafePal</span>
        <button onclick="openInSafePal()" style="
            background: linear-gradient(135deg, #4CAF50, #2E7D32);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
        ">Открыть</button>
        <button onclick="this.parentElement.remove()" style="
            background: transparent;
            color: #888;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 5px;
        ">×</button>
    `;
    
    document.body.appendChild(banner);
}

// ===== DEBUG FUNCTIONS =====

let debugPanelVisible = false;

function toggleDebugPanel() {
    if (debugPanelVisible) {
        const panel = document.getElementById('debugPanel');
        if (panel) panel.remove();
        debugPanelVisible = false;
    } else {
        showDebugPanel();
        debugPanelVisible = true;
    }
}

function showDebugPanel() {
    const existingPanel = document.getElementById('debugPanel');
    if (existingPanel) existingPanel.remove();
    
    const panel = document.createElement('div');
    panel.id = 'debugPanel';
    panel.style.cssText = `
        position: fixed;
        bottom: 60px;
        left: 10px;
        right: 10px;
        background: rgba(0,0,0,0.95);
        color: #0f0;
        padding: 15px;
        border-radius: 10px;
        font-family: monospace;
        font-size: 12px;
        z-index: 999999;
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #0f0;
    `;
    
    let info = '<b>🔧 DEBUG INFO</b><br><br>';
    info += `<b>Wallet:</b> ${window.walletAddress ? window.walletAddress.slice(0,10) + '...' : 'NOT CONNECTED'}<br>`;
    info += `<b>Connected:</b> ${window.walletConnected ? '✅ YES' : '❌ NO'}<br>`;
    info += `<b>Level:</b> ${window.currentUserLevel || 0}<br>`;
    info += `<b>Display ID:</b> ${window.currentDisplayId || '—'}<br>`;
    info += `<b>GW ID:</b> ${window.currentGwId || '—'}<br>`;
    info += `<b>isMobile:</b> ${isMobile() ? '📱 YES' : '💻 NO'}<br>`;
    
    panel.innerHTML = info + '<br><button onclick="toggleDebugPanel()" style="background:#333;color:#fff;border:none;padding:8px 15px;border-radius:5px;width:100%;">Close</button>';
    
    document.body.appendChild(panel);
}

function updateDebugInfo() {
    // Заглушка для совместимости
}

// ===== NEWS MODAL FUNCTIONS =====

function showNewsModal() {
    const modal = document.getElementById('newsModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}

function closeNewsModal() {
    const modal = document.getElementById('newsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
}

function openNewsModal() {
    showNewsModal();
}

// ===== WALLET DROPDOWN =====

function toggleWalletDropdown() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// ===== EXPORT ALL =====

// Wallet
window.initWallet = initWallet;
window.updateWalletUI = updateWalletUI;
window.getWeb3Provider = getWeb3Provider;
window.connectSafePal = connectSafePal;
window.connectMetaMask = connectMetaMask;
window.connectWalletConnect = connectWalletConnect;
window.connectWalletGeneric = connectWalletGeneric;
window.disconnectWallet = disconnectWallet;
window.addSafePalButton = addSafePalButton;

// Referral
window.copyReferralLink = copyReferralLink;
window.shareReferralLink = shareReferralLink;

// Mobile
window.isMobile = isMobile;
window.isInAppBrowser = isInAppBrowser;
window.openInSafePal = openInSafePal;
window.showOpenInWalletBanner = showOpenInWalletBanner;

// Debug
window.toggleDebugPanel = toggleDebugPanel;
window.showDebugPanel = showDebugPanel;
window.updateDebugInfo = updateDebugInfo;

// News Modal
window.showNewsModal = showNewsModal;
window.closeNewsModal = closeNewsModal;
window.openNewsModal = openNewsModal;

// Wallet dropdown
window.toggleWalletDropdown = toggleWalletDropdown;

console.log('✅ Modules Fix loaded - all missing functions defined');
