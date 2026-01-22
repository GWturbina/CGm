/**
 * MODULES FIX v2.0
 * Восстановление логики из оригинального dashboard.js v4.5
 * 
 * ВАЖНО: Этот файл загружается ПОСЛЕДНИМ и переопределяет connectWallet()
 * чтобы кнопка toggle работала правильно (открывала секцию, а не подключала)
 */

console.log('🔧 Loading Modules Fix v2.0...');

// ============ STATE ============
window.walletAddress = window.walletAddress || null;
window.walletConnected = window.walletConnected || false;
window.currentUserLevel = window.currentUserLevel || 0;
window.currentSection = window.currentSection || 'panel';

// ============ CONSTANTS ============
var SECTION_ACCESS = {
    'panel': 1, 'archive': 1, 'contacts': 2, 'analytics': 2,
    'referrals': 3, 'crm': 4, 'surveys': 5, 'blog': 5,
    'mailings': 6, 'studio': 7, 'mlm': 8, 'organizer': 9,
    'wallet': 0, 'settings': 0
};

var LEVEL_NAMES = {
    0: 'Не активирован', 1: 'Стартовый', 2: 'Контакты', 3: 'Партнёр',
    4: 'Бизнес', 5: 'Маркетолог', 6: 'Рассылки', 7: 'Студия',
    8: 'Предприниматель', 9: 'Организатор', 10: 'Организатор',
    11: 'Организатор', 12: 'Максимум'
};

// ============ ГЛАВНОЕ: КНОПКА TOGGLE ============
// Переопределяем connectWallet() из wallet.js!
// Теперь она работает как toggleWalletConnection() из оригинала

function connectWallet() {
    console.log('🔘 connectWallet() → toggle logic');
    
    if (window.walletConnected) {
        // Если подключен - отключаем
        disconnectWallet();
    } else {
        // Если не подключен - открываем секцию "Кошелек"
        showSection('wallet');
    }
}

// ============ АВТОПОДКЛЮЧЕНИЕ ПРИ ЗАГРУЗКЕ ============
async function initWallet() {
    console.log('🔐 Initializing wallet...');
    
    var savedAddress = localStorage.getItem('cardgift_wallet') || localStorage.getItem('cg_wallet_address');
    
    if (savedAddress) {
        window.walletAddress = savedAddress.toLowerCase();
        window.walletConnected = true;
        
        console.log('🔄 Checking wallet with IdLinkingService...');
        
        if (window.IdLinkingService) {
            try {
                var result = await IdLinkingService.onWalletConnected(window.walletAddress);
                
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
                } else {
                    window.currentUserLevel = await checkWalletLevel(window.walletAddress);
                }
            } catch (e) {
                console.warn('IdLinkingService error:', e);
                window.currentUserLevel = await checkWalletLevel(window.walletAddress);
            }
        } else {
            window.currentUserLevel = await checkWalletLevel(window.walletAddress);
        }
        
        console.log('✅ Wallet restored:', window.walletAddress, 'Level:', window.currentUserLevel);
        
        localStorage.setItem('cardgift_level', window.currentUserLevel);
        
        updateWalletUI();
        updateAccessLocks();
        updateLevelButtons();
        updateUserIds();
        
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
                    var result = await IdLinkingService.onWalletConnected(window.walletAddress);
                    if (result && result.success) {
                        window.currentUserLevel = result.level || 0;
                        window.currentDisplayId = result.displayId;
                        window.currentGwId = result.gwId;
                    }
                }
                
                console.log('✅ User loaded from AuthService');
                
                updateWalletUI();
                updateAccessLocks();
                updateLevelButtons();
                updateUserIds();
                return;
            }
        } catch (e) {
            console.warn('AuthService init error:', e);
        }
    }
    
    addWalletExtraButtons();
    
    if (isMobile() && !window.walletConnected) {
        addSafePalButton();
    }
}

// ============ РЕАЛЬНОЕ ПОДКЛЮЧЕНИЕ (вызывается из кнопок SafePal/MetaMask) ============
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

async function connectWalletGeneric(provider) {
    showToast('Подключение ' + provider + '...', 'info');
    
    var web3Provider = getWeb3Provider();
    
    if (web3Provider) {
        try {
            var accounts = await web3Provider.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts[0]) {
                window.walletAddress = accounts[0].toLowerCase();
                window.walletConnected = true;
                
                console.log('🔄 Checking wallet with IdLinkingService v4.0...');
                
                if (window.IdLinkingService) {
                    var result = await IdLinkingService.onWalletConnected(window.walletAddress);
                    
                    console.log('📋 IdLinkingService result:', result);
                    
                    if (result && result.success) {
                        window.currentUserLevel = result.level || 0;
                        window.currentTempId = result.tempId;
                        window.currentGwId = result.gwId;
                        window.currentDisplayId = result.displayId;
                        window.currentCgId = result.displayId;
                        
                        console.log('✅ Wallet connected:', {
                            displayId: result.displayId,
                            gwId: result.gwId,
                            level: result.level
                        });
                        
                        if (result.isNew) {
                            showToast('Добро пожаловать! Ваш ID: ' + result.displayId, 'success');
                        }
                    } else {
                        window.currentUserLevel = await checkWalletLevel(window.walletAddress);
                    }
                } else {
                    window.currentUserLevel = await checkWalletLevel(window.walletAddress);
                }
                
                console.log('✅ Level:', window.currentUserLevel);
                
                localStorage.setItem('cardgift_wallet', window.walletAddress);
                localStorage.setItem('cardgift_level', window.currentUserLevel);
                
                updateWalletUI();
                updateAccessLocks();
                updateLevelButtons();
                updateUserIds();
                
                if (typeof loadContacts === 'function') loadContacts();
                
                showToast('Кошелек подключен! Уровень: ' + window.currentUserLevel, 'success');
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
            showToast('Установите SafePal', 'error');
        }
    }
}

// ============ ОТКЛЮЧЕНИЕ ============
function disconnectWallet() {
    window.walletAddress = null;
    window.walletConnected = false;
    window.currentUserLevel = 0;
    window.currentTempId = null;
    window.currentGwId = null;
    window.currentDisplayId = null;
    window.currentCgId = null;
    
    if (window.IdLinkingService && typeof IdLinkingService.clearLocalStorage === 'function') {
        IdLinkingService.clearLocalStorage();
    } else {
        localStorage.removeItem('cardgift_wallet');
        localStorage.removeItem('cardgift_level');
        localStorage.removeItem('cardgift_temp_id');
        localStorage.removeItem('cardgift_gw_id');
        localStorage.removeItem('cardgift_display_id');
        localStorage.removeItem('cg_wallet_address');
    }
    
    updateWalletUI();
    updateAccessLocks();
    showToast('Кошелек отключен', 'success');
    showSection('panel');
}

// ============ UI КОШЕЛЬКА ============
function updateWalletUI() {
    var walletBox = document.getElementById('walletBox');
    var walletStatus = document.getElementById('walletStatus');
    var walletStatusText = document.getElementById('walletStatusText');
    var walletThumb = document.getElementById('walletThumb');
    
    if (window.walletConnected && window.walletAddress) {
        if (walletBox) walletBox.classList.add('connected');
        var shortAddr = window.walletAddress.slice(0, 6) + '...' + window.walletAddress.slice(-4);
        if (walletStatus) walletStatus.textContent = shortAddr;
        if (walletStatusText) walletStatusText.textContent = shortAddr;
        if (walletThumb) walletThumb.style.transform = 'translateX(24px)';
        
        if (typeof loadContacts === 'function') loadContacts();
    } else {
        if (walletBox) walletBox.classList.remove('connected');
        if (walletStatus) walletStatus.textContent = 'NOT_CONNECTED';
        if (walletStatusText) walletStatusText.textContent = 'Not Connected';
        if (walletThumb) walletThumb.style.transform = 'translateX(0)';
    }
    
    if (typeof updateReferralLink === 'function') updateReferralLink();
    updateUserIds();
}

// ============ ПРОВЕРКА УРОВНЯ ============
async function checkWalletLevel(address) {
    var wallet = address.toLowerCase();
    
    var ownerAddresses = [
        '0x7bcd1753868895971e12448412cb3216d47884c8',
        '0x9b49bd9c9458615e11c051afd1ebe983563b67ee',
        '0x03284a899147f5a07f82c622f34df92198671635'
    ];
    
    if (ownerAddresses.includes(wallet)) {
        console.log('👑 Owner detected! Level 12');
        return 12;
    }
    
    if (window.GlobalWayBridge) {
        try {
            if (typeof GlobalWayBridge.getUserLevel === 'function') {
                var level = await GlobalWayBridge.getUserLevel(wallet);
                console.log('✅ GlobalWay level:', level);
                return level;
            }
        } catch (e) {
            console.warn('GlobalWay check failed:', e);
        }
    }
    
    return 0;
}

// ============ WEB3 PROVIDER ============
function getWeb3Provider() {
    if (window.safepal && window.safepal.ethereum) return window.safepal.ethereum;
    if (window.ethereum && window.ethereum.isSafePal) return window.ethereum;
    if (window.ethereum) return window.ethereum;
    return null;
}

// ============ ПОКАЗАТЬ СЕКЦИЮ ============
function showSection(sectionId) {
    if (sectionId === 'studio') {
        window.location.href = 'studio.html';
        return;
    }
    if (sectionId === 'ai-studio') {
        window.location.href = 'ai-studio.html';
        return;
    }
    
    var requiredLevel = SECTION_ACCESS[sectionId] || 0;
    
    if (window.currentUserLevel < requiredLevel) {
        showToast('Доступ ограничен', 'error');
        return;
    }
    
    document.querySelectorAll('.section').forEach(function(s) {
        s.classList.remove('active');
    });
    
    var section = document.getElementById('section-' + sectionId);
    if (section) {
        section.classList.add('active');
        window.currentSection = sectionId;
        window.location.hash = sectionId;
    }
    
    document.querySelectorAll('.nav-item').forEach(function(item) {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });
    
    if (sectionId === 'contacts' && typeof updateContactsCounts === 'function') updateContactsCounts();
    if (sectionId === 'archive' && typeof loadCards === 'function') loadCards();
    if (sectionId === 'referrals' && typeof updateReferralLink === 'function') updateReferralLink();
}

// ============ ЗАМКИ И УРОВНИ ============
function updateAccessLocks() {
    document.querySelectorAll('.nav-item').forEach(function(item) {
        var requiredLevel = parseInt(item.dataset.level) || 0;
        var lock = item.querySelector('.nav-lock');
        
        if (lock) {
            lock.style.display = window.currentUserLevel >= requiredLevel ? 'none' : 'inline';
        }
        
        item.classList.toggle('locked', window.currentUserLevel < requiredLevel);
    });
    
    updateSectionRestrictions();
}

function updateSectionRestrictions() {
    var level = window.currentUserLevel || 0;
    
    var referralRestricted = document.getElementById('referralRestricted');
    if (referralRestricted) {
        referralRestricted.style.display = level >= 3 ? 'none' : 'block';
    }
    
    var crmSection = document.getElementById('section-crm');
    if (crmSection) {
        var crmRestricted = crmSection.querySelector('.restricted-block');
        if (crmRestricted) crmRestricted.style.display = level >= 4 ? 'none' : 'block';
    }
    
    var surveysSection = document.getElementById('section-surveys');
    if (surveysSection) {
        var surveysRestricted = surveysSection.querySelector('.restricted-block');
        if (surveysRestricted) surveysRestricted.style.display = level >= 5 ? 'none' : 'block';
    }
    
    var blogSection = document.getElementById('section-blog');
    if (blogSection) {
        var blogRestricted = blogSection.querySelector('.restricted-block');
        if (blogRestricted) blogRestricted.style.display = level >= 5 ? 'none' : 'block';
    }
    
    var mailingsSection = document.getElementById('section-mailings');
    if (mailingsSection) {
        var mailingsRestricted = mailingsSection.querySelector('.restricted-block');
        if (mailingsRestricted) mailingsRestricted.style.display = level >= 6 ? 'none' : 'block';
    }
    
    console.log('🔓 Section restrictions updated for level:', level);
}

function updateLevelButtons() {
    var levelCards = document.querySelectorAll('.level-card');
    
    levelCards.forEach(function(card) {
        var cardLevel = parseInt(card.dataset.level) || 0;
        var btn = card.querySelector('.btn-level');
        
        if (!btn) return;
        
        if (cardLevel <= window.currentUserLevel) {
            card.classList.add('active');
            card.classList.remove('current');
            btn.className = 'btn btn-level btn-completed';
            btn.textContent = '✅ Активирован';
            btn.disabled = true;
        } else if (cardLevel === window.currentUserLevel + 1) {
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
    
    var levelDisplay = document.getElementById('currentLevelDisplay');
    if (levelDisplay) {
        levelDisplay.textContent = window.currentUserLevel + ' (' + (LEVEL_NAMES[window.currentUserLevel] || '—') + ')';
    }
}

// ============ ОБНОВЛЕНИЕ ID ============
function updateUserIds() {
    var cgIdDisplay = document.getElementById('userCgIdDisplay');
    var gwIdDisplay = document.getElementById('userGwIdDisplay');
    var levelDisplay = document.getElementById('userLevelDisplay');
    var walletDisplay = document.getElementById('userWalletDisplay');
    
    var ownerData = {
        '0x7bcd1753868895971e12448412cb3216d47884c8': { displayId: 'GW9729645', gwId: 'GW9729645' },
        '0x9b49bd9c9458615e11c051afd1ebe983563b67ee': { displayId: 'GW7346221', gwId: 'GW7346221' },
        '0x03284a899147f5a07f82c622f34df92198671635': { displayId: 'GW1514866', gwId: 'GW1514866' }
    };
    
    var displayId = '—';
    var gwId = '—';
    
    if (window.walletAddress && ownerData[window.walletAddress.toLowerCase()]) {
        var owner = ownerData[window.walletAddress.toLowerCase()];
        displayId = owner.displayId;
        gwId = owner.gwId;
    } else {
        if (window.currentDisplayId) displayId = window.currentDisplayId;
        else if (window.currentGwId) displayId = window.currentGwId;
        else if (window.currentTempId) displayId = window.currentTempId;
        
        gwId = window.currentGwId || '—';
    }
    
    if (cgIdDisplay) cgIdDisplay.textContent = displayId;
    if (gwIdDisplay) gwIdDisplay.textContent = gwId;
    if (levelDisplay) levelDisplay.textContent = window.currentUserLevel + ' (' + (LEVEL_NAMES[window.currentUserLevel] || '—') + ')';
    if (walletDisplay && window.walletAddress) {
        walletDisplay.textContent = window.walletAddress.slice(0, 6) + '...' + window.walletAddress.slice(-4);
    }
}

// ============ MOBILE & PWA ============
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isInAppBrowser() {
    var ua = navigator.userAgent || navigator.vendor || window.opera;
    return /FBAN|FBAV|Instagram|Telegram|WhatsApp|Viber|Line/i.test(ua);
}

function openInSafePal() {
    var currentUrl = encodeURIComponent(window.location.href);
    var safePalDeepLink = 'https://link.safepal.io/dapp?url=' + currentUrl;
    showToast('Открываем в SafePal...', 'info');
    window.location.href = safePalDeepLink;
    
    setTimeout(function() {
        if (confirm('Установите SafePal из App Store или Google Play\n\nОткрыть магазин?')) {
            var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
                window.location.href = 'https://apps.apple.com/app/safepal-wallet/id1548297139';
            } else {
                window.location.href = 'https://play.google.com/store/apps/details?id=io.safepal.wallet';
            }
        }
    }, 2500);
}

function addWalletExtraButtons() {
    setTimeout(function() {
        var walletSection = document.getElementById('section-wallet');
        if (!walletSection) return;
        if (document.getElementById('extraWalletButtons')) return;
        
        var extraDiv = document.createElement('div');
        extraDiv.id = 'extraWalletButtons';
        extraDiv.className = 'wallet-card';
        extraDiv.style.cssText = 'margin-top: 20px;';
        extraDiv.innerHTML = '<h3 style="color: #FFD700; margin-bottom: 15px;">⚡ Дополнительно</h3>' +
            '<button onclick="showUpgradeModal()" style="width: 100%; padding: 15px; background: linear-gradient(135deg, #9C27B0, #673AB7); color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: bold; cursor: pointer; margin-bottom: 12px;">🚀 Повысить статус</button>' +
            '<button onclick="installPWA()" style="width: 100%; padding: 15px; background: linear-gradient(135deg, #2196F3, #1976D2); color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: bold; cursor: pointer;">📲 Установить приложение</button>';
        walletSection.appendChild(extraDiv);
    }, 600);
}

function addSafePalButton() {
    setTimeout(function() {
        var walletSection = document.getElementById('section-wallet');
        if (!walletSection) return;
        if (document.getElementById('openInSafePalBtn')) return;
        
        var walletCard = walletSection.querySelector('.wallet-card');
        if (walletCard) {
            var safePalDiv = document.createElement('div');
            safePalDiv.style.cssText = 'margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;';
            safePalDiv.innerHTML = '<p style="color:#4CAF50; font-size:14px; margin-bottom:15px; text-align:center;">📱 На мобильном? Откройте в приложении SafePal:</p>' +
                '<button id="openInSafePalBtn" onclick="openInSafePal()" style="width: 100%; padding: 15px; background: linear-gradient(135deg, #4CAF50, #2E7D32); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">🔐 Открыть в SafePal</button>';
            walletCard.appendChild(safePalDiv);
        }
    }, 500);
}

function showSafePalBanner() {
    if (!isMobile()) return;
    if (getWeb3Provider()) return;
    if (document.getElementById('safePalBanner')) return;
    
    var banner = document.createElement('div');
    banner.id = 'safePalBanner';
    banner.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; gap: 10px; z-index: 99999; box-shadow: 0 -4px 20px rgba(0,0,0,0.5); border-top: 1px solid #333;';
    banner.innerHTML = '<span style="color: #aaa; font-size: 13px; flex: 1;">Для полного доступа откройте в SafePal</span>' +
        '<button onclick="openInSafePal()" style="background: linear-gradient(135deg, #4CAF50, #2E7D32); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">🔐 SafePal</button>' +
        '<button onclick="this.parentElement.remove()" style="background: none; border: none; color: #666; font-size: 20px; cursor: pointer;">×</button>';
    document.body.appendChild(banner);
}

// ============ TOAST ============
function showToast(message, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    if (!container) {
        console.log('Toast:', type, message);
        return;
    }
    
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
}

// ============ MODALS ============
function closeModal(modalId) {
    if (modalId) {
        var modal = document.getElementById(modalId);
        if (modal) {
            modal.style.setProperty('display', 'none', 'important');
            modal.classList.remove('show', 'active', 'open');
        }
    } else {
        var overlay = document.querySelector('.modal-overlay');
        if (overlay) overlay.remove();
    }
}

function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}

function showNewsModal() {
    var modal = document.getElementById('newsModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        if (typeof loadUserNewsContent === 'function') loadUserNewsContent();
    }
}

function closeNewsModal() {
    var modal = document.getElementById('newsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
}

// ============ CONTACTS ============
function showAddContactModal() {
    if (!window.walletConnected) {
        showToast('Сначала подключите кошелек', 'error');
        return;
    }
    
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal">' +
        '<div class="modal-header"><h3>➕ Добавить контакт</h3><button class="modal-close" onclick="closeModal()">✕</button></div>' +
        '<div class="modal-body">' +
        '<div class="form-group"><label>Имя:</label><input type="text" id="contactName" class="form-input" placeholder="Имя контакта"></div>' +
        '<div class="form-group"><label>Платформа:</label><select id="contactPlatform" class="form-select"><option value="telegram">Telegram</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="phone">Телефон</option><option value="instagram">Instagram</option></select></div>' +
        '<div class="form-group"><label>Контакт:</label><input type="text" id="contactValue" class="form-input" placeholder="@username или номер"></div>' +
        '</div>' +
        '<div class="modal-footer"><button class="btn btn-gray" onclick="closeModal()">Отмена</button><button class="btn btn-green" onclick="addContact()">Добавить</button></div>' +
        '</div>';
    document.body.appendChild(modal);
}

async function addContact() {
    var name = document.getElementById('contactName')?.value.trim();
    var platform = document.getElementById('contactPlatform')?.value;
    var contact = document.getElementById('contactValue')?.value.trim();
    
    if (!name || !contact) {
        showToast('Заполните имя и контакт', 'error');
        return;
    }
    
    var cgId = window.currentDisplayId || window.currentGwId || localStorage.getItem('cardgift_cg_id');
    
    if (window.ContactsService && cgId) {
        var result = await ContactsService.addContact(cgId, {
            name: name,
            messenger: platform,
            contact: contact,
            source: 'Manual'
        });
        
        if (result.success) {
            if (typeof loadContacts === 'function') await loadContacts();
            closeModal();
            showToast('Контакт добавлен!', 'success');
        } else {
            showToast(result.error || 'Ошибка', 'error');
        }
    } else {
        closeModal();
        showToast('Контакт добавлен!', 'success');
    }
}

function showImportExportModal() {
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal">' +
        '<div class="modal-header"><h3>📁 Импорт/Экспорт</h3><button class="modal-close" onclick="closeModal()">✕</button></div>' +
        '<div class="modal-body">' +
        '<button onclick="exportContacts()" style="width:100%;padding:15px;margin-bottom:15px;background:#4CAF50;color:white;border:none;border-radius:8px;cursor:pointer;">📤 Экспорт (JSON)</button>' +
        '<label style="display:block;width:100%;padding:15px;background:#2196F3;color:white;border:none;border-radius:8px;cursor:pointer;text-align:center;">📥 Импорт<input type="file" accept=".json" onchange="importContacts(event)" style="display:none;"></label>' +
        '</div></div>';
    document.body.appendChild(modal);
}

function exportContacts() {
    var contactsData = window.contacts || [];
    var blob = new Blob([JSON.stringify(contactsData, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cardgift_contacts.json';
    a.click();
    showToast('Контакты экспортированы!', 'success');
}

function importContacts(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                window.contacts = (window.contacts || []).concat(imported);
                if (typeof renderContacts === 'function') renderContacts();
                closeModal();
                showToast('Импортировано ' + imported.length + ' контактов!', 'success');
            }
        } catch (err) {
            showToast('Ошибка импорта', 'error');
        }
    };
    reader.readAsText(file);
}

// ============ REFERRALS ============
function copyReferralLink() {
    var displayId = window.currentDisplayId || window.currentGwId || window.currentTempId;
    if (!displayId) {
        showToast('Сначала подключите кошелёк', 'error');
        return;
    }
    
    var link = window.location.origin + '/registration.html?ref=' + displayId;
    
    navigator.clipboard.writeText(link).then(function() {
        showToast('Реферальная ссылка скопирована!', 'success');
    }).catch(function() {
        var input = document.createElement('input');
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('Реферальная ссылка скопирована!', 'success');
    });
}

function shareReferralLink() {
    var displayId = window.currentDisplayId || window.currentGwId || window.currentTempId;
    var link = window.location.origin + '/registration.html?ref=' + displayId;
    
    if (navigator.share) {
        navigator.share({ title: 'CardGift', text: 'Присоединяйся!', url: link }).catch(function() {
            copyReferralLink();
        });
    } else {
        copyReferralLink();
    }
}

// ============ DEBUG ============
function showDebugPanel() {
    var existingPanel = document.getElementById('debugPanel');
    if (existingPanel) existingPanel.remove();
    
    var panel = document.createElement('div');
    panel.id = 'debugPanel';
    panel.style.cssText = 'position: fixed; bottom: 60px; left: 10px; right: 10px; background: rgba(0,0,0,0.95); color: #0f0; padding: 15px; border-radius: 10px; font-family: monospace; font-size: 12px; z-index: 999999; max-height: 300px; overflow-y: auto; border: 1px solid #0f0;';
    
    var info = '<b>🔧 DEBUG INFO</b><br><br>';
    info += '<b>Wallet:</b> ' + (window.walletAddress ? window.walletAddress.slice(0,10) + '...' : 'NOT CONNECTED') + '<br>';
    info += '<b>Connected:</b> ' + (window.walletConnected ? '✅ YES' : '❌ NO') + '<br>';
    info += '<b>Level:</b> ' + window.currentUserLevel + '<br>';
    info += '<b>DisplayID:</b> ' + (window.currentDisplayId || '—') + '<br>';
    info += '<br><button onclick="document.getElementById(\'debugPanel\').remove()" style="background:#333;color:#fff;border:none;padding:8px 15px;border-radius:5px;width:100%;">Close</button>';
    
    panel.innerHTML = info;
    document.body.appendChild(panel);
}

function toggleDebugPanel() {
    var panel = document.getElementById('debugPanel');
    if (panel) {
        panel.remove();
    } else {
        showDebugPanel();
    }
}

// ============ PWA ============
var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
});

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(result) {
            if (result.outcome === 'accepted') {
                showToast('✅ Приложение установлено!', 'success');
            }
            deferredPrompt = null;
        });
    } else {
        showToast('Приложение уже установлено', 'info');
    }
}

function initPWA() {
    console.log('📱 PWA initialized');
}

// ============ TOGGLE (для совместимости) ============
function toggleWalletConnection() {
    connectWallet();
}

function toggleWalletDropdown() {
    var dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

// ============ ЭКСПОРТЫ ============
// ВАЖНО: connectWallet() переопределяет версию из wallet.js!

window.connectWallet = connectWallet;
window.initWallet = initWallet;
window.disconnectWallet = disconnectWallet;
window.updateWalletUI = updateWalletUI;
window.getWeb3Provider = getWeb3Provider;
window.checkWalletLevel = checkWalletLevel;

window.connectSafePal = connectSafePal;
window.connectMetaMask = connectMetaMask;
window.connectWalletConnect = connectWalletConnect;
window.connectWalletGeneric = connectWalletGeneric;

window.showSection = showSection;
window.updateAccessLocks = updateAccessLocks;
window.updateSectionRestrictions = updateSectionRestrictions;
window.updateLevelButtons = updateLevelButtons;
window.updateUserIds = updateUserIds;

window.isMobile = isMobile;
window.isInAppBrowser = isInAppBrowser;
window.openInSafePal = openInSafePal;
window.addWalletExtraButtons = addWalletExtraButtons;
window.addSafePalButton = addSafePalButton;
window.showSafePalBanner = showSafePalBanner;

window.showToast = showToast;
window.closeModal = closeModal;
window.openModal = openModal;
window.showNewsModal = showNewsModal;
window.closeNewsModal = closeNewsModal;

window.showAddContactModal = showAddContactModal;
window.addContact = addContact;
window.showImportExportModal = showImportExportModal;
window.exportContacts = exportContacts;
window.importContacts = importContacts;

window.copyReferralLink = copyReferralLink;
window.shareReferralLink = shareReferralLink;

window.showDebugPanel = showDebugPanel;
window.toggleDebugPanel = toggleDebugPanel;

window.installPWA = installPWA;
window.initPWA = initPWA;

window.toggleWalletConnection = toggleWalletConnection;
window.toggleWalletDropdown = toggleWalletDropdown;

console.log('✅ Modules Fix v2.0 loaded - connectWallet() now opens wallet section!');
