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
    
    var savedAddress = localStorage.getItem('cardgift_wallet') || localStorage.getItem('cg_wallet_address');
    
    if (savedAddress) {
        window.walletAddress = savedAddress.toLowerCase();
        window.walletConnected = true;
        
        if (window.IdLinkingService) {
            try {
                const result = await IdLinkingService.onWalletConnected(window.walletAddress);
                if (result && result.success) {
                    window.currentUserLevel = result.level || 0;
                    window.currentTempId = result.tempId;
                    window.currentGwId = result.gwId;
                    window.currentDisplayId = result.displayId;
                    console.log('✅ Wallet linked:', result);
                }
            } catch (e) {
                console.warn('IdLinkingService error:', e);
            }
        }
        
        updateWalletUI();
    }
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

// Referral
window.copyReferralLink = copyReferralLink;

// Mobile
window.isMobile = isMobile;
window.isInAppBrowser = isInAppBrowser;
window.openInSafePal = openInSafePal;

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
