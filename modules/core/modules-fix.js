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
    
    // Загрузка данных при переключении секций
    if (sectionId === 'contacts') {
        if (typeof loadContacts === 'function') loadContacts();
    }
    if (sectionId === 'archive') {
        // Задержка чтобы archive.js успел переопределить loadCards
        setTimeout(function() {
            if (typeof window.loadCards === 'function') {
                window.loadCards();
            }
        }, 100);
    }
    if (sectionId === 'referrals') {
        if (typeof updateReferralLink === 'function') updateReferralLink();
        if (typeof loadReferrals === 'function') loadReferrals();
    }
    if (sectionId === 'panel') {
        if (typeof loadPanelData === 'function') loadPanelData();
    }
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
    
    // Обновляем блок "ВАШ ТЕКУЩИЙ УРОВЕНЬ" на панели
    var promoLevel = document.getElementById('promoCurrentLevel');
    if (promoLevel) {
        promoLevel.textContent = window.currentUserLevel;
    }
    
    // Обновляем текст "Следующий уровень откроет"
    var nextFeatureText = document.getElementById('nextFeatureText');
    if (nextFeatureText) {
        var nextLevel = window.currentUserLevel + 1;
        var features = {
            1: '📁 Архив + 📊 Панель',
            2: '👥 Контакты + 📈 Аналитика',
            3: '🌐 Реферальная программа',
            4: '💼 CRM система',
            5: '📝 Опросы + ✍️ Блог',
            6: '📧 Рассылки',
            7: '🎬 GlobalStudio',
            8: '🏗️ Создание МЛМ',
            9: '📋 Организатор бизнеса'
        };
        nextFeatureText.textContent = features[nextLevel] || '✨ Все возможности открыты!';
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

// ============ GENERATOR ============
function goToGenerator() {
    console.log('🎨 goToGenerator() called');
    
    var cgId = window.currentCgId || window.currentDisplayId || localStorage.getItem('cardgift_cg_id');
    console.log('👤 CG_ID:', cgId);
    
    var url = 'generator.html';
    if (cgId) {
        url += '?userId=' + cgId;
    }
    
    console.log('🚀 Navigating to:', url);
    window.location.href = url;
}

// ============ ARCHIVE TABS ============
var currentArchiveTab = 'my';

function switchArchiveTab(tabName) {
    currentArchiveTab = tabName;
    
    // Обновляем активную вкладку
    document.querySelectorAll('.archive-tab').forEach(function(tab) {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Показываем соответствующий контент
    document.querySelectorAll('.archive-tab-content').forEach(function(content) {
        content.classList.remove('active');
    });
    var tabContent = document.getElementById('tab-' + tabName);
    if (tabContent) tabContent.classList.add('active');
    
    // Загружаем данные
    switch (tabName) {
        case 'my':
            loadMyCards();
            break;
        case 'corporate':
            loadCorporateTemplates();
            break;
        case 'leader':
            loadLeaderTemplates();
            break;
        case 'myTemplates':
            loadMyTemplates();
            break;
        case 'moderation':
            loadModerationTemplates();
            break;
    }
    
    console.log('📂 Switched to tab:', tabName);
}

function loadMyCards() {
    console.log('📂 loadMyCards called');
    if (typeof loadCards === 'function') {
        loadCards();
    }
}

function loadCorporateTemplates() {
    var grid = document.getElementById('corporateGrid');
    var empty = document.getElementById('emptyCorporate');
    
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">Корпоративные шаблоны скоро появятся...</div>';
    if (empty) empty.style.display = 'none';
}

function loadLeaderTemplates() {
    var grid = document.getElementById('leaderGrid');
    var empty = document.getElementById('emptyLeader');
    
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">Шаблоны от лидеров скоро появятся...</div>';
    if (empty) empty.style.display = 'none';
}

function loadMyTemplates() {
    var grid = document.getElementById('myTemplatesGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">Ваши шаблоны появятся здесь...</div>';
}

function loadModerationTemplates() {
    var grid = document.getElementById('moderationGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">Шаблоны на модерации...</div>';
}

// ============ CARDS (ЗАГРУЖАЕТСЯ ИЗ archive.js) ============
var cards = [];

// Заглушка - реальная функция в modules/archive/archive.js
async function loadCards() {
    console.log('📂 loadCards: delegating to archive.js...');
    // archive.js переопределит window.loadCards
}

function renderCards() {
    console.log('🎴 renderCards: delegating to archive.js...');
    // archive.js переопределит window.renderCards
}

function viewCard(shortCode) {
    if (shortCode) {
        window.open('/card-viewer.html?sc=' + shortCode, '_blank');
    }
}

function copyCardLink(shortCode) {
    var link = window.location.origin + '/c/' + shortCode;
    navigator.clipboard.writeText(link).then(function() {
        showToast('Ссылка скопирована! 📋', 'success');
    }).catch(function() {
        showToast('Не удалось скопировать', 'error');
    });
}

function shareCard(shortCode) {
    var link = window.location.origin + '/c/' + shortCode;
    if (navigator.share) {
        navigator.share({
            title: 'CardGift - Открытка',
            url: link
        });
    } else {
        copyCardLink(shortCode);
    }
}

// Используем cardService.deleteCard() - твой рабочий метод!
async function deleteCardHandler(shortCode) {
    if (!confirm('Удалить эту открытку?')) return;
    
    try {
        if (window.cardService) {
            var result = await cardService.deleteCard(shortCode);
            if (result.success) {
                showToast('Открытка удалена', 'success');
                loadCards();
                return;
            }
        }
        
        // Fallback - напрямую из Supabase
        if (window.SupabaseClient && SupabaseClient.client) {
            await SupabaseClient.client
                .from('cards')
                .delete()
                .eq('card_code', shortCode);
            showToast('Открытка удалена', 'success');
            loadCards();
        }
    } catch (e) {
        console.error('Delete error:', e);
        showToast('Ошибка удаления', 'error');
    }
}

window.viewCard = viewCard;
window.copyCardLink = copyCardLink;
window.shareCard = shareCard;
window.deleteCardHandler = deleteCardHandler;
window.deleteCard = deleteCardHandler;

// ============ CONTACTS (заглушки) ============
var contacts = [];

async function loadContacts() {
    // Получаем ID текущего пользователя (v4.0)
    var userId = window.currentDisplayId 
                || window.currentGwId 
                || window.currentTempId 
                || window.currentCgId
                || localStorage.getItem('cardgift_display_id')
                || localStorage.getItem('cardgift_gw_id')
                || localStorage.getItem('cardgift_temp_id')
                || localStorage.getItem('cardgift_cg_id');
    
    console.log('═══════════════════════════════════════');
    console.log('📋 LOADING CONTACTS v4.0');
    console.log('═══════════════════════════════════════');
    console.log('👤 User ID:', userId);
    console.log('📦 ContactsService:', !!window.ContactsService);
    
    if (!userId || userId === '—' || userId === 'undefined') {
        console.log('⚠️ No User ID, cannot load contacts');
        contacts = [];
        renderContacts();
        return;
    }
    
    // Используем ContactsService v4.0
    if (window.ContactsService) {
        try {
            contacts = await ContactsService.getContacts(userId);
            console.log('✅ Contacts loaded:', contacts.length);
        } catch (error) {
            console.warn('ContactsService error:', error);
            contacts = [];
        }
    } else {
        // Fallback - localStorage
        var contactsKey = 'cardgift_contacts_' + userId;
        var saved = localStorage.getItem(contactsKey);
        contacts = saved ? JSON.parse(saved) : [];
        console.log('📋 Contacts from localStorage:', contacts.length);
    }
    
    console.log('═══════════════════════════════════════');
    console.log('📊 FINAL: contacts array has', contacts.length, 'items');
    console.log('═══════════════════════════════════════');
    
    renderContacts();
    updateContactsCounts();
    
    // Загружаем статистику
    if (window.ContactsService && userId) {
        try {
            var stats = await ContactsService.getStats(userId);
            updateStatsDisplay(stats);
        } catch (e) {
            console.warn('Stats error:', e);
        }
    }
}

function updateStatsDisplay(stats) {
    var totalContactsEl = document.getElementById('totalContacts');
    var totalReferralsEl = document.getElementById('totalReferrals');
    var activeReferralsEl = document.getElementById('activeReferrals');
    var monthContactsEl = document.getElementById('monthContacts');
    
    if (totalContactsEl) totalContactsEl.textContent = stats.totalContacts || 0;
    if (totalReferralsEl) totalReferralsEl.textContent = stats.totalReferrals || 0;
    if (activeReferralsEl) activeReferralsEl.textContent = stats.activeReferrals || 0;
    if (monthContactsEl) monthContactsEl.textContent = stats.contactsThisMonth || 0;
}

function renderContacts() {
    var tbody = document.getElementById('contactsTableBody');
    var empty = document.getElementById('emptyContacts');
    
    if (!tbody) return;
    
    // Проверяем есть ли доступ к разделу
    var cgId = window.currentCgId || localStorage.getItem('cardgift_cg_id');
    
    if (!cgId) {
        tbody.innerHTML = '';
        if (empty) {
            empty.textContent = 'Подключите кошелек для управления контактами';
            empty.style.display = 'block';
        }
        return;
    }
    
    if (contacts.length === 0) {
        tbody.innerHTML = '';
        if (empty) {
            empty.textContent = 'У вас пока нет контактов. Создайте открытку и поделитесь ссылкой!';
            empty.style.display = 'block';
        }
        return;
    }
    
    if (empty) empty.style.display = 'none';
    
    tbody.innerHTML = contacts.map(function(c, i) {
        // Поддержка обоих форматов (Supabase и localStorage)
        var name = c.name || 'Без имени';
        var platform = c.platform || c.messenger || 'unknown';
        var contact = c.contact || '';
        var pushConsent = c.push_consent || c.pushConsent || false;
        var source = c.source || 'Manual';
        var status = c.status || 'new';
        var date = c.created_at ? new Date(c.created_at).toLocaleDateString() : (c.date || '-');
        var contactId = c.id || i;
        
        // ID пользователя (если зарегистрирован)
        var referralBadge = c.referral_gw_id 
            ? '<span class="gw-badge">' + c.referral_gw_id + '</span>'
            : (c.referral_temp_id 
                ? '<span class="temp-badge" title="' + c.referral_temp_id + '">Temp</span>' 
                : '<span class="no-id">—</span>');
        
        // Статус бейдж
        var statusBadges = {
            'new': '<span class="status-badge new">Новый</span>',
            'contacted': '<span class="status-badge contacted">Связались</span>',
            'active': '<span class="status-badge active">Активен</span>',
            'inactive': '<span class="status-badge inactive">Неактивен</span>'
        };
        var statusBadge = statusBadges[status] || '<span class="status-badge">' + status + '</span>';
        
        return '<tr data-contact-id="' + contactId + '">' +
            '<td>' + escapeHtml(name) + '</td>' +
            '<td><span class="platform-badge ' + platform + '">' + platform + '</span></td>' +
            '<td>' + escapeHtml(contact) + '</td>' +
            '<td>' + (pushConsent ? '✅' : '❌') + '</td>' +
            '<td>' + escapeHtml(source) + '</td>' +
            '<td>' + referralBadge + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td>' + date + '</td>' +
            '<td>' +
                '<button class="btn-icon" onclick="editContact(\'' + contactId + '\')" title="Редактировать">✏️</button>' +
                '<button class="btn-icon" onclick="deleteContact(\'' + contactId + '\')" title="Удалить">🗑️</button>' +
                '<button class="btn-icon" onclick="messageContact(' + i + ')" title="Написать">💬</button>' +
            '</td>' +
        '</tr>';
    }).join('');
}

function updateContactsCounts() {
    var platforms = ['telegram', 'whatsapp', 'email', 'phone', 'instagram', 'facebook', 'tiktok', 'twitter', 'viber'];
    
    platforms.forEach(function(p) {
        // Поддержка обоих полей: platform и messenger
        var count = contacts.filter(function(c) { 
            return (c.platform || c.messenger) === p; 
        }).length;
        var el = document.getElementById('count-' + p);
        if (el) el.textContent = count;
    });
    
    var allEl = document.getElementById('count-all');
    if (allEl) allEl.textContent = contacts.length;
    
    var totalEl = document.getElementById('totalContacts');
    if (totalEl) totalEl.textContent = contacts.length;
    
    var countEl = document.getElementById('contactsCount');
    if (countEl) countEl.textContent = contacts.length;
}

function saveContacts() {
    localStorage.setItem('cardgift_contacts', JSON.stringify(contacts));
}

// ============ REFERRAL LINK ============
function updateReferralLink() {
    var displayId = window.currentDisplayId || window.currentGwId || window.currentTempId;
    var linkEl = document.getElementById('referralLinkDisplay');
    
    if (linkEl && displayId) {
        var link = window.location.origin + '/registration.html?ref=' + displayId;
        linkEl.value = link;
    }
    
    // Загружаем рефералов при открытии секции
    loadReferrals();
}

// ============ REFERRALS - ПОЛНАЯ ВЕРСИЯ ============
var allReferrals = [];

async function loadReferrals() {
    var userId = window.currentDisplayId 
                || window.currentGwId 
                || window.currentTempId
                || localStorage.getItem('cardgift_display_id')
                || localStorage.getItem('cardgift_gw_id');
    
    console.log('📋 Loading referrals for:', userId);
    
    if (!userId || userId === '—') {
        renderEmptyReferrals('Подключите кошелек для просмотра рефералов');
        return;
    }
    
    var tbody = document.getElementById('referralsTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding: 40px; text-align: center; color: #888;">' +
            '<div style="font-size: 32px; margin-bottom: 10px;">⏳</div>' +
            '<div>Загрузка...</div></td></tr>';
    }
    
    try {
        // Нормализуем ID
        var searchId = userId;
        if (!searchId.toString().startsWith('GW') && /^\d+$/.test(searchId)) {
            searchId = 'GW' + searchId;
        }
        
        // 1. Загружаем из users (кто пришёл по реф ссылке)
        var referralsFromUsers = [];
        if (window.SupabaseClient && SupabaseClient.client) {
            var gwNum = searchId.toString().replace('GW', '');
            
            var result = await SupabaseClient.client
                .from('users')
                .select('temp_id, gw_id, name, messenger, contact, gw_level, source, created_at, referrer_gw_id, referrer_temp_id')
                .or('referrer_gw_id.eq.' + searchId + ',referrer_gw_id.eq.' + gwNum)
                .order('created_at', { ascending: false });
            
            referralsFromUsers = result.data || [];
            console.log('📊 Referrals from users:', referralsFromUsers.length);
        }
        
        // 2. Загружаем из contacts с source='viral'
        var viralContacts = [];
        if (window.SupabaseClient && SupabaseClient.client) {
            var gwNum = searchId.toString().replace('GW', '');
            
            var result2 = await SupabaseClient.client
                .from('contacts')
                .select('cg_id, name, messenger, contact, source, created_at, owner_gw_id, referral_temp_id')
                .eq('source', 'viral')
                .or('owner_gw_id.eq.' + searchId + ',owner_gw_id.eq.' + gwNum)
                .order('created_at', { ascending: false });
            
            viralContacts = result2.data || [];
            console.log('📊 Viral contacts:', viralContacts.length);
        }
        
        // 3. Объединяем
        var seen = {};
        allReferrals = [];
        
        referralsFromUsers.forEach(function(r) {
            var key = (r.contact || r.temp_id || '').toLowerCase();
            if (!seen[key]) {
                seen[key] = true;
                allReferrals.push({
                    id: r.gw_id || r.temp_id,
                    name: r.name || 'Без имени',
                    messenger: r.messenger,
                    contact: r.contact,
                    source: r.source || 'registration',
                    gwLevel: r.gw_level || 0,
                    line: 1,
                    createdAt: r.created_at
                });
            }
        });
        
        viralContacts.forEach(function(c) {
            var key = (c.contact || c.cg_id || '').toLowerCase();
            if (!seen[key]) {
                seen[key] = true;
                allReferrals.push({
                    id: c.cg_id || c.referral_temp_id,
                    name: c.name || 'Без имени',
                    messenger: c.messenger,
                    contact: c.contact,
                    source: c.source || 'viral',
                    gwLevel: 0,
                    line: 1,
                    createdAt: c.created_at
                });
            }
        });
        
        console.log('📊 Total referrals:', allReferrals.length);
        renderReferrals();
        
    } catch (error) {
        console.error('❌ Error loading referrals:', error);
        renderEmptyReferrals('Ошибка загрузки: ' + error.message);
    }
}

function renderReferrals() {
    var tbody = document.getElementById('referralsTableBody');
    if (!tbody) return;
    
    if (allReferrals.length === 0) {
        renderEmptyReferrals('У вас пока нет рефералов. Поделитесь своей ссылкой!');
        return;
    }
    
    tbody.innerHTML = allReferrals.map(function(r) {
        var gwStatus = r.gwLevel > 0 
            ? '<span class="status-badge active">GW Lvl ' + r.gwLevel + '</span>'
            : '<span class="status-badge inactive">Не в GW</span>';
        
        var date = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-';
        
        return '<tr>' +
            '<td>' + (r.id || '-') + '</td>' +
            '<td>' + escapeHtml(r.name) + '</td>' +
            '<td>' + escapeHtml(r.contact || '-') + '</td>' +
            '<td>' + (r.line || 1) + '</td>' +
            '<td>' + escapeHtml(r.source || '-') + '</td>' +
            '<td>' + gwStatus + '</td>' +
            '<td>' + date + '</td>' +
        '</tr>';
    }).join('');
    
    // Обновляем счётчики
    var totalEl = document.getElementById('totalReferrals');
    var activeEl = document.getElementById('activeReferrals');
    if (totalEl) totalEl.textContent = allReferrals.length;
    if (activeEl) activeEl.textContent = allReferrals.filter(function(r) { return r.gwLevel > 0; }).length;
}

function renderEmptyReferrals(message) {
    var tbody = document.getElementById('referralsTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding: 40px; text-align: center; color: #888;">' +
            '<div style="font-size: 48px; margin-bottom: 15px;">👥</div>' +
            '<div>' + message + '</div></td></tr>';
    }
}

window.loadReferrals = loadReferrals;
window.renderReferrals = renderReferrals;

// ============ PANEL STATISTICS ============
async function updatePanelStats() {
    console.log('📊 Updating panel stats...');
    
    var teamEl = document.getElementById('stat-team');
    var activeEl = document.getElementById('stat-active');
    var earningsEl = document.getElementById('stat-earnings');
    var conversionEl = document.getElementById('stat-conversion');
    
    // Пробуем загрузить из GlobalWay контракта
    if (window.GlobalWayBridge && window.walletAddress) {
        try {
            // Получаем данные из контракта
            if (typeof GlobalWayBridge.getUserStats === 'function') {
                var stats = await GlobalWayBridge.getUserStats(window.walletAddress);
                if (stats) {
                    if (teamEl) teamEl.textContent = stats.totalTeam || 0;
                    if (activeEl) activeEl.textContent = stats.activeUsers || 0;
                    if (earningsEl) earningsEl.textContent = (stats.earnings || 0).toFixed(3);
                    if (conversionEl) conversionEl.textContent = (stats.conversion || 0) + '%';
                    console.log('✅ Stats loaded from contract');
                    return;
                }
            }
            
            // Fallback - получаем referrals count
            if (typeof GlobalWayBridge.getReferralsCount === 'function') {
                var count = await GlobalWayBridge.getReferralsCount(window.walletAddress);
                if (teamEl) teamEl.textContent = count || 0;
            }
        } catch (e) {
            console.warn('Stats from contract failed:', e);
        }
    }
    
    // Fallback - показываем данные из localStorage
    var savedStats = localStorage.getItem('cardgift_stats');
    if (savedStats) {
        try {
            var stats = JSON.parse(savedStats);
            if (teamEl) teamEl.textContent = stats.team || 0;
            if (activeEl) activeEl.textContent = stats.active || 0;
            if (earningsEl) earningsEl.textContent = (stats.earnings || 0).toFixed(3);
            if (conversionEl) conversionEl.textContent = (stats.conversion || 0) + '%';
        } catch (e) {}
    }
    
    console.log('📊 Stats updated');
}

window.updatePanelStats = updatePanelStats;

// ============ UPGRADE MODAL ============
function showUpgradeModal() {
    showSection('wallet');
}

function closeUpgradeModal() {
    closeModal('upgradeModal');
}

// ============ LEVEL ACTIVATION ============
function activateLevel(level) {
    console.log('⬆️ Activate level:', level);
    showToast('Активация уровня ' + level + '...', 'info');
    // TODO: Реальная активация через контракт
}

function showActivationModal(level) {
    console.log('📋 Show activation modal for level:', level);
}

function closeActivationModal() {
    closeModal('activationModal');
}

function confirmActivation() {
    console.log('✅ Confirm activation');
}

// ============ GLOBALWAY ============
function goToGlobalWay() {
    window.open('https://gwr-navy.vercel.app', '_blank');
}

function openGlobalWay() {
    goToGlobalWay();
}

// Экспорты
window.goToGenerator = goToGenerator;
window.switchArchiveTab = switchArchiveTab;
window.loadMyCards = loadMyCards;
window.loadCorporateTemplates = loadCorporateTemplates;
window.loadLeaderTemplates = loadLeaderTemplates;
window.loadMyTemplates = loadMyTemplates;
window.loadModerationTemplates = loadModerationTemplates;
window.loadCards = loadCards;
window.renderCards = renderCards;
window.loadContacts = loadContacts;
window.renderContacts = renderContacts;
window.updateContactsCounts = updateContactsCounts;
window.saveContacts = saveContacts;
window.updateReferralLink = updateReferralLink;
window.showUpgradeModal = showUpgradeModal;
window.closeUpgradeModal = closeUpgradeModal;
window.activateLevel = activateLevel;
window.showActivationModal = showActivationModal;
window.closeActivationModal = closeActivationModal;
window.confirmActivation = confirmActivation;
window.goToGlobalWay = goToGlobalWay;
window.openGlobalWay = openGlobalWay;

// ============ SIDEBAR INITIALIZATION ============
function initSidebar() {
    var navItems = document.querySelectorAll('.nav-item');
    var toggle = document.getElementById('sidebarToggle');
    var overlay = document.getElementById('sidebarOverlay');
    var sidebar = document.getElementById('sidebar');

    navItems.forEach(function(item) {
        item.addEventListener('click', function() {
            var section = item.dataset.section;
            var requiredLevel = parseInt(item.dataset.level) || 0;
            
            if (window.currentUserLevel >= requiredLevel) {
                showSection(section);
                closeSidebar();
            } else {
                showToast('Доступ ограничен. Повысьте уровень аккаунта.', 'error');
            }
        });
    });

    if (toggle) {
        toggle.addEventListener('click', function() {
            if (sidebar) sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('active');
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
    
    console.log('✅ Sidebar initialized, nav items:', navItems.length);
}

function closeSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

// ============ LANGUAGE SWITCHER ============
function initLanguageSwitcher() {
    var buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            buttons.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            showToast('Язык: ' + btn.dataset.lang.toUpperCase(), 'success');
        });
    });
}

// ============ DATE/TIME ============
function updateDateTime() {
    var el = document.getElementById('currentDateTime');
    if (el) {
        var now = new Date();
        el.textContent = now.toLocaleDateString('ru-RU') + ', ' + now.toLocaleTimeString('ru-RU');
    }
}

// ============ AUTHOR MODE ============
var AUTHOR_KEY = 'cardgift2025';

function checkAuthorMode() {
    var urlParams = new URLSearchParams(window.location.search);
    var authorParam = urlParams.get('author');
    var savedAuthor = localStorage.getItem('cardgift_author');
    
    if (authorParam === AUTHOR_KEY || savedAuthor === AUTHOR_KEY) {
        enableAuthorMode();
        if (authorParam === AUTHOR_KEY) {
            localStorage.setItem('cardgift_author', AUTHOR_KEY);
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
        }
    }
}

function enableAuthorMode() {
    window.currentUserLevel = 12;
    window.walletConnected = true;
    window.walletAddress = '0xAUTHOR_MODE';
    
    var logo = document.querySelector('.logo-text');
    if (logo) logo.innerHTML = 'CardGift <span style="font-size:10px;color:#4CAF50;">👑 AUTHOR</span>';
    
    showToast('👑 Режим автора активирован!', 'success');
    console.log('👑 Author mode enabled');
}

// ============ ГЛАВНАЯ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Modules Fix - DOMContentLoaded');
    
    // Инициализация sidebar (привязка кликов к меню)
    initSidebar();
    
    // Переключатель языка
    initLanguageSwitcher();
    
    // Автоподключение кошелька из localStorage
    await initWallet();
    
    // Дата/время
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Проверка режима автора
    checkAuthorMode();
    
    // Обновляем UI
    updateAccessLocks();
    updateLevelButtons();
    updateUserIds();
    
    // SafePal баннер на мобильных
    setTimeout(showSafePalBanner, 1500);
    
    // Загружаем статистику панели
    setTimeout(updatePanelStats, 2000);
    
    // Проверяем hash в URL
    var hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById('section-' + hash)) {
        showSection(hash);
    }
    
    console.log('✅ Modules Fix - initialization complete');
});

// Экспорты для sidebar
window.initSidebar = initSidebar;
window.closeSidebar = closeSidebar;
window.initLanguageSwitcher = initLanguageSwitcher;
window.updateDateTime = updateDateTime;
window.checkAuthorMode = checkAuthorMode;
window.enableAuthorMode = enableAuthorMode;

console.log('✅ Modules Fix v2.0 loaded - connectWallet() now opens wallet section!');
