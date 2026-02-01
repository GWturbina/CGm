/* =====================================================
   CARDGIFT - WALLET FUNCTIONS v2.0
   
   ТОЛЬКО SAFEPAL! Никаких других кошельков!
   
   v2.0:
   - Убран MetaMask и другие кошельки
   - Автоконнект при загрузке страницы
   - Автопереподключение при обновлении
   - Улучшенная обработка ошибок
   ===================================================== */

// Конфигурация сети opBNB
const OPBNB_CHAIN = {
    chainId: '0xCC',
    chainName: 'opBNB Mainnet',
    nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
    },
    rpcUrls: ['https://opbnb-mainnet-rpc.bnbchain.org'],
    blockExplorerUrls: ['https://opbnbscan.com']
};

// Флаг для предотвращения множественных подключений
let isConnecting = false;
let lastConnectedAddress = null;

/**
 * Получить провайдер SafePal
 * ТОЛЬКО SafePal! Никаких других кошельков!
 */
function getSafePalProvider() {
    // Приоритет 1: window.safepalProvider
    if (window.safepalProvider) {
        console.log('✅ SafePal: window.safepalProvider');
        return window.safepalProvider;
    }
    
    // Приоритет 2: window.safepal.ethereum
    if (window.safepal && window.safepal.ethereum) {
        console.log('✅ SafePal: window.safepal.ethereum');
        return window.safepal.ethereum;
    }
    
    // Приоритет 3: window.ethereum.isSafePal
    if (window.ethereum && window.ethereum.isSafePal) {
        console.log('✅ SafePal: window.ethereum.isSafePal');
        return window.ethereum;
    }
    
    // Приоритет 4: Ищем SafePal в массиве providers
    if (window.ethereum && window.ethereum.providers && window.ethereum.providers.length) {
        const safePalProvider = window.ethereum.providers.find(function(p) { 
            return p.isSafePal; 
        });
        if (safePalProvider) {
            console.log('✅ SafePal: найден в providers');
            return safePalProvider;
        }
    }
    
    // SafePal НЕ найден
    console.log('❌ SafePal не найден');
    return null;
}

/**
 * Проверка - установлен ли SafePal
 */
function isSafePalInstalled() {
    return getSafePalProvider() !== null;
}

/**
 * Проверка - мобильное устройство
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Открыть в SafePal (для мобильных)
 */
function openInSafePal() {
    const currentUrl = encodeURIComponent(window.location.href);
    const safePalDeepLink = window.CONFIG?.WALLET?.deepLink || 'https://link.safepal.io/dapp?url=';
    window.location.href = safePalDeepLink + currentUrl;
}

/**
 * Показать сообщение об установке SafePal
 */
function showSafePalRequired() {
    const isMobile = isMobileDevice();
    
    if (isMobile) {
        // На мобильном - перенаправляем в SafePal
        if (confirm('Для работы требуется кошелёк SafePal.\n\nОткрыть страницу в SafePal?')) {
            openInSafePal();
        }
    } else {
        // На десктопе - показываем инструкцию
        alert('Для работы требуется кошелёк SafePal.\n\nУстановите расширение SafePal для браузера:\nhttps://www.safepal.com/download');
    }
}

/**
 * Подключение кошелька SafePal
 */
async function connectWallet() {
    // Защита от множественных вызовов
    if (isConnecting) {
        console.log('⏳ Подключение уже в процессе...');
        return null;
    }
    
    isConnecting = true;
    
    const provider = getSafePalProvider();
    
    if (!provider) {
        isConnecting = false;
        showSafePalRequired();
        return null;
    }
    
    try {
        console.log('🔗 Подключение SafePal...');
        
        // Запрашиваем доступ к аккаунтам
        let accounts;
        try {
            accounts = await provider.request({ method: 'eth_requestAccounts' });
        } catch (reqError) {
            console.warn('eth_requestAccounts failed:', reqError);
            // Fallback на enable()
            if (provider.enable) {
                accounts = await provider.enable();
            } else {
                throw reqError;
            }
        }
        
        if (!accounts || accounts.length === 0) {
            throw new Error('Не удалось получить адрес кошелька');
        }
        
        const address = accounts[0].toLowerCase();
        console.log('✅ Адрес получен:', address);
        
        // Проверяем и переключаем сеть на opBNB
        try {
            const chainId = await provider.request({ method: 'eth_chainId' });
            const currentChainId = parseInt(chainId, 16);
            
            if (currentChainId !== 204) {
                console.log('🔄 Переключение на opBNB...');
                await switchToOpBNB();
            }
        } catch (networkError) {
            console.warn('Ошибка проверки сети:', networkError);
        }
        
        // Сохраняем состояние
        lastConnectedAddress = address;
        localStorage.setItem('cg_wallet_address', address);
        localStorage.setItem('cg_wallet_connected', 'true');
        localStorage.setItem('cg_wallet_timestamp', Date.now().toString());
        
        // Обновляем WalletState если есть
        if (window.WalletState) {
            WalletState.setConnected(address, 204);
        }
        
        // Обновляем UI
        updateWalletUI(address);
        
        console.log('✅ SafePal подключён:', address);
        isConnecting = false;
        
        return address;
        
    } catch (error) {
        console.error('❌ Ошибка подключения:', error);
        isConnecting = false;
        
        if (error.code === 4001) {
            // Пользователь отклонил запрос
            if (typeof showToast === 'function') {
                showToast('Подключение отклонено', 'warning');
            }
        } else {
            if (typeof showToast === 'function') {
                showToast('Ошибка подключения: ' + error.message, 'error');
            }
        }
        
        return null;
    }
}

/**
 * Переключение на сеть opBNB
 */
async function switchToOpBNB() {
    const provider = getSafePalProvider();
    if (!provider) return false;
    
    try {
        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: OPBNB_CHAIN.chainId }]
        });
        return true;
    } catch (switchError) {
        // Сеть не добавлена - добавляем
        if (switchError.code === 4902) {
            try {
                await provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [OPBNB_CHAIN]
                });
                return true;
            } catch (addError) {
                console.error('Не удалось добавить сеть opBNB:', addError);
                return false;
            }
        }
        console.error('Не удалось переключить сеть:', switchError);
        return false;
    }
}

/**
 * Отключение кошелька
 */
function disconnectWallet() {
    // Очищаем состояние
    lastConnectedAddress = null;
    
    if (window.WalletState) {
        WalletState.disconnect();
    }
    
    // Очищаем localStorage
    localStorage.removeItem('cg_wallet_address');
    localStorage.removeItem('cg_wallet_connected');
    localStorage.removeItem('cg_wallet_timestamp');
    localStorage.removeItem('walletState');
    localStorage.removeItem('connectedWallet');
    localStorage.removeItem('currentUser');
    
    // Обновляем UI
    updateWalletUI(null);
    
    console.log('🔌 Кошелёк отключён');
    
    // Перезагружаем страницу
    window.location.reload();
}

/**
 * Обновление UI кошелька
 */
function updateWalletUI(address) {
    const connectBtn = document.getElementById('walletConnectBtn');
    const walletStatus = document.getElementById('walletStatus');
    const walletBtnSmall = document.getElementById('walletBtnSmall');
    const walletStatusSmall = document.getElementById('walletStatusSmall');
    
    if (address) {
        const shortAddress = address.slice(0, 6) + '...' + address.slice(-4);
        
        if (connectBtn) {
            connectBtn.innerHTML = '✅ ' + shortAddress;
            connectBtn.onclick = disconnectWallet;
            connectBtn.classList.add('connected');
        }
        
        if (walletStatus) {
            walletStatus.innerHTML = '<span style="color: #4CAF50;">✅ ' + shortAddress + '</span>';
        }
        
        if (walletBtnSmall) {
            walletBtnSmall.style.display = 'none';
        }
        
        if (walletStatusSmall) {
            walletStatusSmall.textContent = shortAddress;
            walletStatusSmall.style.display = 'block';
        }
    } else {
        if (connectBtn) {
            connectBtn.innerHTML = '🔗 Подключить SafePal';
            connectBtn.onclick = connectWallet;
            connectBtn.classList.remove('connected');
        }
        
        if (walletStatus) {
            walletStatus.innerHTML = '';
        }
        
        if (walletBtnSmall) {
            walletBtnSmall.style.display = 'block';
        }
        
        if (walletStatusSmall) {
            walletStatusSmall.style.display = 'none';
        }
    }
}

/**
 * Получить текущий адрес кошелька
 */
async function getWalletAddress() {
    const provider = getSafePalProvider();
    if (!provider) return null;
    
    try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        return accounts[0]?.toLowerCase() || null;
    } catch (error) {
        console.warn('Ошибка получения адреса:', error);
        return null;
    }
}

/**
 * Автоподключение при загрузке страницы
 */
async function autoConnectWallet() {
    console.log('🔄 Проверка автоподключения...');
    
    // Проверяем сохранённое состояние
    const savedAddress = localStorage.getItem('cg_wallet_address');
    const wasConnected = localStorage.getItem('cg_wallet_connected') === 'true';
    
    if (!wasConnected || !savedAddress) {
        console.log('ℹ️ Нет сохранённого подключения');
        return null;
    }
    
    // Проверяем наличие SafePal
    const provider = getSafePalProvider();
    if (!provider) {
        console.log('⚠️ SafePal не найден для автоподключения');
        return null;
    }
    
    try {
        // Получаем текущий адрес без запроса разрешения
        const accounts = await provider.request({ method: 'eth_accounts' });
        
        if (accounts && accounts.length > 0) {
            const currentAddress = accounts[0].toLowerCase();
            
            // Проверяем совпадение адреса
            if (currentAddress === savedAddress.toLowerCase()) {
                console.log('✅ Автоподключение успешно:', currentAddress);
                
                lastConnectedAddress = currentAddress;
                
                if (window.WalletState) {
                    WalletState.setConnected(currentAddress, 204);
                }
                
                updateWalletUI(currentAddress);
                
                // Проверяем сеть
                try {
                    const chainId = await provider.request({ method: 'eth_chainId' });
                    if (parseInt(chainId, 16) !== 204) {
                        console.log('⚠️ Неверная сеть, нужно переключить на opBNB');
                    }
                } catch (e) {}
                
                return currentAddress;
            } else {
                console.log('⚠️ Адрес изменился, требуется повторное подключение');
                localStorage.removeItem('cg_wallet_connected');
            }
        } else {
            console.log('ℹ️ Кошелёк заблокирован, требуется ручное подключение');
        }
    } catch (error) {
        console.warn('Ошибка автоподключения:', error);
    }
    
    return null;
}

/**
 * Инициализация слушателей событий кошелька
 */
function initWalletListeners() {
    const provider = getSafePalProvider();
    
    if (provider && provider.on) {
        // Изменение аккаунта
        provider.on('accountsChanged', function(accounts) {
            console.log('📢 Аккаунт изменён:', accounts);
            
            if (accounts.length === 0) {
                // Кошелёк отключён
                disconnectWallet();
            } else {
                const newAddress = accounts[0].toLowerCase();
                
                if (newAddress !== lastConnectedAddress) {
                    // Адрес изменился
                    lastConnectedAddress = newAddress;
                    localStorage.setItem('cg_wallet_address', newAddress);
                    
                    if (window.WalletState) {
                        WalletState.setConnected(newAddress, 204);
                    }
                    
                    updateWalletUI(newAddress);
                    
                    // Перезагружаем страницу для обновления данных пользователя
                    window.location.reload();
                }
            }
        });
        
        // Изменение сети
        provider.on('chainChanged', function(chainId) {
            const newChainId = parseInt(chainId, 16);
            console.log('📢 Сеть изменена:', newChainId);
            
            if (newChainId !== 204) {
                if (typeof showToast === 'function') {
                    showToast('Переключитесь на сеть opBNB', 'warning');
                }
            }
        });
        
        console.log('✅ Слушатели кошелька инициализированы');
    }
}

/**
 * Инициализация при загрузке страницы
 */
function initWallet() {
    console.log('🚀 Инициализация кошелька...');
    
    // Инициализируем слушатели
    setTimeout(initWalletListeners, 500);
    
    // Автоподключение
    setTimeout(async () => {
        const address = await autoConnectWallet();
        if (address) {
            console.log('✅ Кошелёк готов:', address);
        }
    }, 1000);
}

// Автоматическая инициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWallet);
} else {
    initWallet();
}

// ═══════════════════════════════════════════════════════════
// ГЛОБАЛЬНЫЙ ЭКСПОРТ
// ═══════════════════════════════════════════════════════════
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.getWalletAddress = getWalletAddress;
window.autoConnectWallet = autoConnectWallet;
window.switchToOpBNB = switchToOpBNB;
window.getSafePalProvider = getSafePalProvider;
window.getWeb3Provider = getSafePalProvider; // Алиас для совместимости
window.isSafePalInstalled = isSafePalInstalled;
window.openInSafePal = openInSafePal;
window.initWallet = initWallet;

console.log('💼 Wallet v2.0 loaded (ONLY SafePal, AutoConnect)');
