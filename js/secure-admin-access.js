/* =====================================================
   CARDGIFT - SECURE ADMIN ACCESS v2.0
   
   Замена для admin-panel.js функции checkAdminAccess
   Использует серверную проверку через JWT
   
   ПОДКЛЮЧЕНИЕ:
   1. Подключить этот файл ПОСЛЕ secure-auth.js
   2. Заменяет старую функцию checkAdminAccess
   ===================================================== */

// ═══════════════════════════════════════════════════════════
// БЕЗОПАСНАЯ ПРОВЕРКА ДОСТУПА К АДМИНКЕ
// ═══════════════════════════════════════════════════════════

/**
 * Проверка прав доступа к админке
 * ИСПОЛЬЗУЕТ СЕРВЕРНУЮ ВАЛИДАЦИЮ!
 */
async function checkAdminAccessSecure() {
    console.log('🛡️ Checking admin access (SECURE v2.0)...');
    
    try {
        // Проверяем, авторизован ли пользователь через SecureAuth
        if (!window.SecureAuth || !SecureAuth.isAuthenticated) {
            console.log('🛡️ Not authenticated via SecureAuth');
            
            // Пробуем автоматическую авторизацию если есть кошелёк
            const walletAddress = localStorage.getItem('cg_wallet_address');
            
            if (walletAddress && window.SecureAuth) {
                console.log('🔐 Attempting secure authentication...');
                
                try {
                    await SecureAuth.authenticate(walletAddress);
                } catch (e) {
                    console.warn('Auto-auth failed:', e.message);
                    hideAdminAccess();
                    return;
                }
            } else {
                hideAdminAccess();
                return;
            }
        }
        
        // Проверяем доступ к админке через СЕРВЕР
        console.log('🔐 Verifying admin access on server...');
        
        const accessResult = await SecureAuth.checkAccess('admin');
        
        if (accessResult.hasAccess) {
            console.log('👑 Admin access GRANTED by server');
            
            currentAdminUser = {
                wallet_address: SecureAuth.getWallet(),
                role: SecureAuth.getRole(),
                permissions: SecureAuth.user?.permissions || ['all'],
                is_active: true
            };
            
            showAdminAccess(SecureAuth.getRole(), SecureAuth.user?.permissions);
            return;
        }
        
        // Проверяем доступ к team функциям
        const teamResult = await SecureAuth.checkAccess('team');
        
        if (teamResult.hasAccess) {
            console.log('👥 Team access GRANTED by server, role:', teamResult.role);
            
            currentAdminUser = {
                wallet_address: SecureAuth.getWallet(),
                role: teamResult.role,
                permissions: SecureAuth.user?.permissions || [],
                is_active: true
            };
            
            showAdminAccess(teamResult.role, SecureAuth.user?.permissions);
            return;
        }
        
        console.log('🛡️ No admin access granted');
        hideAdminAccess();
        
    } catch (error) {
        console.error('Secure admin check error:', error);
        hideAdminAccess();
    }
}

// ═══════════════════════════════════════════════════════════
// ПЕРЕХВАТ ПОДКЛЮЧЕНИЯ КОШЕЛЬКА
// ═══════════════════════════════════════════════════════════

/**
 * Безопасное подключение кошелька с авторизацией
 */
async function connectWalletSecure() {
    console.log('🔗 Secure wallet connection...');
    
    // Используем оригинальную функцию подключения
    let walletAddress;
    
    if (typeof connectWallet === 'function') {
        walletAddress = await connectWallet();
    } else if (typeof AuthService !== 'undefined') {
        const user = await AuthService.connectWallet();
        walletAddress = user?.wallet_address;
    }
    
    if (!walletAddress) {
        console.log('❌ Wallet connection failed');
        return null;
    }
    
    // Теперь выполняем безопасную авторизацию
    console.log('🔐 Starting secure authentication...');
    
    try {
        const user = await SecureAuth.authenticate(walletAddress);
        console.log('✅ Secure auth complete:', user.role);
        
        // Проверяем доступ к админке
        setTimeout(checkAdminAccessSecure, 500);
        
        return user;
        
    } catch (error) {
        console.error('Secure auth failed:', error);
        
        // Показываем сообщение пользователю
        if (typeof showToast === 'function') {
            showToast('Подпишите сообщение в кошельке для авторизации', 'warning');
        }
        
        return null;
    }
}

// ═══════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    console.log('🛡️ Secure Admin Access v2.0 initializing...');
    
    // Ждём загрузки SecureAuth
    let attempts = 0;
    const waitForSecureAuth = setInterval(() => {
        attempts++;
        
        if (window.SecureAuth) {
            clearInterval(waitForSecureAuth);
            console.log('🛡️ SecureAuth found, checking access...');
            
            // Даём время на инициализацию SecureAuth
            setTimeout(checkAdminAccessSecure, 1000);
        } else if (attempts >= 20) {
            clearInterval(waitForSecureAuth);
            console.warn('⚠️ SecureAuth not loaded, admin access disabled');
            hideAdminAccess();
        }
    }, 250);
});

// Слушаем событие успешной авторизации
window.addEventListener('secureAuthComplete', (e) => {
    console.log('🔐 SecureAuth complete event received');
    setTimeout(checkAdminAccessSecure, 500);
});

// Слушаем выход
window.addEventListener('secureAuthLogout', () => {
    console.log('🔐 SecureAuth logout event received');
    hideAdminAccess();
});

// ═══════════════════════════════════════════════════════════
// ЗАМЕНА ГЛОБАЛЬНЫХ ФУНКЦИЙ
// ═══════════════════════════════════════════════════════════

// Заменяем старую функцию на безопасную
window.checkAdminAccess = checkAdminAccessSecure;
window.checkAdminAccessSecure = checkAdminAccessSecure;
window.connectWalletSecure = connectWalletSecure;

console.log('🛡️ Secure Admin Access v2.0 loaded');
console.log('   ✅ checkAdminAccess replaced with secure version');
