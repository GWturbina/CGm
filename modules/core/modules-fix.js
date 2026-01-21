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
    const walletBox = document.getElementById('walletBox');
    const walletStatus = document.getElementById('walletStatus');
    const walletStatusText = document.getElementById('walletStatusText');
    const walletBtn = document.getElementById('walletButton');
    const walletThumb = document.getElementById('walletThumb');
    
    if (window.walletConnected && window.walletAddress) {
        // Подключен
        const shortAddr = window.walletAddress.slice(0, 6) + '...' + window.walletAddress.slice(-4);
        
        if (walletBox) walletBox.classList.add('connected');
        if (walletStatus) walletStatus.textContent = shortAddr;
        if (walletStatusText) walletStatusText.textContent = shortAddr;
        if (walletThumb) walletThumb.style.transform = 'translateX(24px)';
        
        if (walletBtn) {
            walletBtn.innerHTML = `<span class="wallet-icon">💳</span><span class="wallet-text">${shortAddr}</span>`;
            walletBtn.classList.add('connected');
        }
        
        // Загружаем данные
        if (typeof loadContacts === 'function') loadContacts();
        if (typeof updateReferralLink === 'function') updateReferralLink();
        if (typeof updateUserIds === 'function') updateUserIds();
        
        console.log('✅ Wallet UI updated: CONNECTED', shortAddr);
    } else {
        // Не подключен
        if (walletBox) walletBox.classList.remove('connected');
        if (walletStatus) walletStatus.textContent = 'NOT_CONNECTED';
        if (walletStatusText) walletStatusText.textContent = 'Not Connected';
        if (walletThumb) walletThumb.style.transform = 'translateX(0)';
        
        if (walletBtn) {
            walletBtn.innerHTML = `<span class="wallet-icon">💳</span><span class="wallet-text">Подключить</span>`;
            walletBtn.classList.remove('connected');
        }
        
        console.log('⚠️ Wallet UI updated: NOT CONNECTED');
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

function closeModal(modalId) {
    if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.setProperty('display', 'none', 'important');
            modal.classList.remove('show', 'active', 'open');
        }
    } else {
        // Fallback: удалить overlay
        document.querySelector('.modal-overlay')?.remove();
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}

// ===== CONTACT MODAL =====

function showAddContactModal() {
    if (!window.walletConnected) {
        if (typeof showToast === 'function') {
            showToast('Сначала подключите кошелек', 'error');
        }
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>➕ Добавить контакт</h3>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-group"><label>Имя:</label><input type="text" id="contactName" class="form-input" placeholder="Имя контакта"></div>
                <div class="form-group"><label>Платформа:</label>
                    <select id="contactPlatform" class="form-select">
                        <option value="telegram">Telegram</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                        <option value="phone">Телефон</option>
                        <option value="instagram">Instagram</option>
                    </select>
                </div>
                <div class="form-group"><label>Контакт:</label><input type="text" id="contactValue" class="form-input" placeholder="@username или номер"></div>
                <div class="form-group"><label class="checkbox-item"><input type="checkbox" id="contactPush"> Согласие на пуш</label></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-gray" onclick="closeModal()">Отмена</button>
                <button class="btn btn-green" onclick="addContact()">Добавить</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function addContact() {
    console.log('📝 addContact() called');
    
    const name = document.getElementById('contactName')?.value.trim();
    const platform = document.getElementById('contactPlatform')?.value;
    const contact = document.getElementById('contactValue')?.value.trim();
    const pushConsent = document.getElementById('contactPush')?.checked;
    
    if (!name || !contact) {
        if (typeof showToast === 'function') {
            showToast('Заполните имя и контакт', 'error');
        }
        return;
    }
    
    const cgId = window.currentDisplayId || window.currentGwId || window.currentCgId || localStorage.getItem('cardgift_cg_id');
    
    if (!cgId) {
        if (typeof showToast === 'function') {
            showToast('Ошибка: не найден ID пользователя', 'error');
        }
        return;
    }
    
    // Используем ContactsService если доступен
    if (window.ContactsService) {
        const result = await ContactsService.addContact(cgId, {
            name,
            messenger: platform,
            contact,
            pushConsent,
            source: 'Manual'
        });
        
        if (result.success) {
            if (typeof loadContacts === 'function') await loadContacts();
            closeModal();
            if (typeof showToast === 'function') {
                showToast('Контакт добавлен!', 'success');
            }
        } else {
            if (typeof showToast === 'function') {
                showToast(result.error || 'Ошибка добавления', 'error');
            }
        }
    } else {
        // Fallback - localStorage
        const newContact = {
            id: Date.now(),
            name,
            messenger: platform,
            contact,
            pushConsent,
            source: 'Manual',
            created_at: new Date().toISOString()
        };
        
        window.contacts = window.contacts || [];
        window.contacts.push(newContact);
        
        if (typeof saveContacts === 'function') saveContacts();
        if (typeof renderContacts === 'function') renderContacts();
        closeModal();
        if (typeof showToast === 'function') {
            showToast('Контакт добавлен!', 'success');
        }
    }
}

// ===== CONNECT WALLET (главная функция подключения) =====

async function connectWallet() {
    const provider = getWeb3Provider();
    
    // Если нет провайдера - открываем секцию кошелька с кнопками
    if (!provider) {
        console.log('No provider, opening wallet section...');
        if (typeof showSection === 'function') {
            showSection('wallet');
        }
        return null;
    }
    
    // Если на десктопе без подключенного кошелька - тоже открываем секцию
    if (!window.walletConnected) {
        console.log('Wallet not connected, showing wallet section...');
        if (typeof showSection === 'function') {
            showSection('wallet');
        }
    }
    
    try {
        console.log('Connecting wallet...');
        
        let accounts;
        try {
            accounts = await provider.request({ method: 'eth_requestAccounts' });
        } catch (e) {
            console.warn('eth_requestAccounts failed:', e);
            if (provider.enable) {
                accounts = await provider.enable();
            } else {
                throw e;
            }
        }
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found');
        }
        
        const address = accounts[0];
        console.log('Got address:', address);
        
        // Проверяем сеть
        try {
            const chainId = await provider.request({ method: 'eth_chainId' });
            const currentChainId = parseInt(chainId, 16);
            if (currentChainId !== 204) {
                console.log('Switching to opBNB...');
                if (typeof switchToOpBNB === 'function') {
                    await switchToOpBNB();
                }
            }
        } catch (e) {
            console.warn('Network check failed:', e);
        }
        
        // Сохраняем
        window.walletAddress = address.toLowerCase();
        window.walletConnected = true;
        
        localStorage.setItem('cardgift_wallet', window.walletAddress);
        localStorage.setItem('cg_wallet_address', window.walletAddress);
        
        if (window.WalletState) {
            WalletState.setConnected(window.walletAddress, 204);
        }
        
        console.log('Wallet connected:', window.walletAddress);
        
        // Связываем с IdLinkingService
        if (window.IdLinkingService) {
            const result = await IdLinkingService.onWalletConnected(window.walletAddress);
            if (result && result.success) {
                window.currentUserLevel = result.level || 0;
                window.currentDisplayId = result.displayId;
                window.currentGwId = result.gwId;
            }
        }
        
        // Обновляем UI
        updateWalletUI();
        if (typeof updateAccessLocks === 'function') updateAccessLocks();
        if (typeof updateLevelButtons === 'function') updateLevelButtons();
        if (typeof updateUserIds === 'function') updateUserIds();
        if (typeof loadContacts === 'function') loadContacts();
        if (typeof loadCards === 'function') loadCards();
        
        // Показываем toast
        if (typeof showToast === 'function') {
            showToast('Кошелёк подключен!', 'success');
        }
        
        return address;
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        // Открываем секцию чтобы пользователь мог выбрать кошелёк
        if (typeof showSection === 'function') {
            showSection('wallet');
        }
        return null;
    }
}

// ===== PWA FUNCTIONS =====

function initPWA() {
    // PWA инициализация обрабатывается в pwa-updater.js
    console.log('📱 PWA initialized');
}

function installPWA() {
    if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        window.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('✅ PWA installed');
            }
            window.deferredPrompt = null;
        });
    } else {
        if (typeof showToast === 'function') {
            showToast('Приложение уже установлено или недоступно', 'info');
        }
    }
}

// Сохраняем событие для установки PWA
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    console.log('📱 PWA install prompt ready');
});

// ===== WALLET DROPDOWN =====

function toggleWalletDropdown() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function toggleWalletConnection() {
    if (window.walletConnected) {
        disconnectWallet();
    } else {
        // Показываем секцию кошелька или пытаемся подключить
        if (typeof showSection === 'function') {
            showSection('wallet');
        } else if (typeof connectWallet === 'function') {
            connectWallet();
        } else if (window.ethereum) {
            window.ethereum.request({ method: 'eth_requestAccounts' })
                .then(() => location.reload())
                .catch(console.error);
        } else {
            if (typeof showToast === 'function') {
                showToast('Установите SafePal или MetaMask', 'error');
            }
        }
    }
}

// ===== IMPORT/EXPORT CONTACTS =====

function showImportExportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>📁 Импорт/Экспорт</h3>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <button class="btn btn-green btn-block" onclick="exportContacts()" style="width:100%;padding:15px;margin-bottom:15px;background:#4CAF50;color:white;border:none;border-radius:8px;cursor:pointer;">📤 Экспорт (JSON)</button>
                <label class="btn btn-blue btn-block" style="display:block;width:100%;padding:15px;background:#2196F3;color:white;border:none;border-radius:8px;cursor:pointer;text-align:center;">
                    📥 Импорт
                    <input type="file" accept=".json" onchange="importContacts(event)" style="display:none;">
                </label>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function exportContacts() {
    const contactsData = window.contacts || [];
    const blob = new Blob([JSON.stringify(contactsData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cardgift_contacts.json';
    a.click();
    if (typeof showToast === 'function') {
        showToast('Контакты экспортированы!', 'success');
    }
}

function importContacts(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                window.contacts = [...(window.contacts || []), ...imported];
                if (typeof saveContacts === 'function') saveContacts();
                if (typeof renderContacts === 'function') renderContacts();
                if (typeof updateContactsCounts === 'function') updateContactsCounts();
                closeModal();
                if (typeof showToast === 'function') {
                    showToast(`Импортировано ${imported.length} контактов!`, 'success');
                }
            }
        } catch (err) {
            console.error('Import error:', err);
            if (typeof showToast === 'function') {
                showToast('Ошибка импорта файла', 'error');
            }
        }
    };
    reader.readAsText(file);
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
window.closeModal = closeModal;
window.openModal = openModal;

// Contact Modal
window.showAddContactModal = showAddContactModal;
window.addContact = addContact;

// Connect Wallet (главная функция)
window.connectWallet = connectWallet;

// PWA
window.initPWA = initPWA;
window.installPWA = installPWA;

// Wallet dropdown
window.toggleWalletDropdown = toggleWalletDropdown;
window.toggleWalletConnection = toggleWalletConnection;

// Import/Export
window.showImportExportModal = showImportExportModal;
window.exportContacts = exportContacts;
window.importContacts = importContacts;

// ===== ACCESS LOCKS & LEVELS =====

function updateAccessLocks() {
    const level = window.currentUserLevel || 0;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        const requiredLevel = parseInt(item.dataset.level) || 0;
        const lock = item.querySelector('.nav-lock');
        
        if (lock) {
            lock.style.display = level >= requiredLevel ? 'none' : 'inline';
        }
        
        item.classList.toggle('locked', level < requiredLevel);
    });
    
    updateSectionRestrictions();
    console.log('🔓 Access locks updated for level:', level);
}

function updateSectionRestrictions() {
    const level = window.currentUserLevel || 0;
    
    // Referrals - Level 3
    const referralRestricted = document.getElementById('referralRestricted');
    if (referralRestricted) {
        referralRestricted.style.display = level >= 3 ? 'none' : 'block';
    }
    
    // Restricted blocks
    document.querySelectorAll('.restricted-block').forEach(block => {
        const requiredLevel = parseInt(block.dataset.level) || 0;
        block.style.display = level >= requiredLevel ? 'none' : 'block';
    });
}

function updateLevelButtons() {
    const level = window.currentUserLevel || 0;
    const levelCards = document.querySelectorAll('.level-card');
    
    levelCards.forEach(card => {
        const cardLevel = parseInt(card.dataset.level) || 0;
        const btn = card.querySelector('.btn-level');
        
        if (!btn) return;
        
        if (cardLevel <= level) {
            card.classList.add('active');
            card.classList.remove('current');
            btn.className = 'btn btn-level btn-completed';
            btn.textContent = '✅ Активирован';
            btn.disabled = true;
        } else if (cardLevel === level + 1) {
            card.classList.remove('active');
            card.classList.add('current');
            btn.className = 'btn btn-level btn-activate';
            btn.textContent = 'Активировать';
            btn.disabled = false;
        } else {
            card.classList.remove('active', 'current');
            btn.className = 'btn btn-level btn-locked';
            btn.textContent = '🔒 Уровень ' + cardLevel;
            btn.disabled = true;
        }
    });
    
    console.log('🎯 Level buttons updated for level:', level);
}

// Access & Levels exports
window.updateAccessLocks = updateAccessLocks;
window.updateSectionRestrictions = updateSectionRestrictions;
window.updateLevelButtons = updateLevelButtons;

// ===== SHOW SECTION =====

function showSection(sectionId) {
    // Переход на отдельные страницы
    if (sectionId === 'studio') {
        window.location.href = 'studio.html';
        return;
    }
    if (sectionId === 'ai-studio') {
        window.location.href = 'ai-studio.html';
        return;
    }
    
    // Скрываем все секции
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Показываем нужную
    const section = document.getElementById('section-' + sectionId);
    if (section) {
        section.classList.add('active');
        window.location.hash = sectionId;
        console.log('📂 Showing section:', sectionId);
    }
    
    // Обновляем навигацию
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });
}

// ===== TOAST NOTIFICATIONS =====

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.log('Toast:', type, message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

window.showSection = showSection;
window.showToast = showToast;

console.log('✅ Modules Fix loaded - all missing functions defined');
