/* =====================================================
   CARDGIFT - SECURE ADMIN ACCESS v2.1
   
   С fallback на локальную проверку пока API не настроен
   ===================================================== */

// OWNER кошелёк - проверка на клиенте как fallback
const SECURE_OWNER_WALLET = '0x7bcd1753868895971e12448412cb3216d47884c8'.toLowerCase();

/**
 * Проверка прав доступа к админке
 * Сначала пробует SecureAuth, потом fallback на локальную проверку
 */
async function checkAdminAccessSecure() {
    console.log('🛡️ Checking admin access (SECURE v2.1)...');
    
    try {
        // Получаем кошелёк из всех возможных мест
        const walletAddress = localStorage.getItem('cardgift_wallet') ||
                             localStorage.getItem('walletAddress') || 
                             localStorage.getItem('cg_wallet_address') ||
                             localStorage.getItem('connectedWallet') ||
                             window.userWalletAddress;
        
        if (!walletAddress) {
            console.log('🛡️ No wallet found');
            hideAdminAccess();
            return;
        }
        
        const normalizedWallet = walletAddress.toLowerCase();
        console.log('🛡️ Checking wallet:', normalizedWallet);
        
        // ═══════════════════════════════════════════════════════════
        // ВАРИАНТ 1: Пробуем SecureAuth (если токен уже есть)
        // ═══════════════════════════════════════════════════════════
        
        if (window.SecureAuth && SecureAuth.isAuthenticated && SecureAuth.token) {
            console.log('🔐 SecureAuth token found, checking access...');
            
            const accessResult = await SecureAuth.checkAccess('admin');
            
            if (accessResult.hasAccess) {
                console.log('👑 Admin access GRANTED by SecureAuth');
                
                currentAdminUser = {
                    wallet_address: SecureAuth.getWallet(),
                    role: SecureAuth.getRole(),
                    permissions: SecureAuth.user?.permissions || ['all'],
                    is_active: true
                };
                
                showAdminAccess(SecureAuth.getRole(), SecureAuth.user?.permissions);
                return;
            }
        }
        
        // ═══════════════════════════════════════════════════════════
        // ВАРИАНТ 2: Fallback - локальная проверка OWNER
        // (временно, пока API не настроен)
        // ═══════════════════════════════════════════════════════════
        
        console.log('🔄 Fallback to local check...');
        
        // Проверяем OWNER
        if (normalizedWallet === SECURE_OWNER_WALLET) {
            console.log('👑 OWNER detected via fallback check');
            
            currentAdminUser = {
                wallet_address: normalizedWallet,
                role: 'owner',
                permissions: ['all'],
                is_active: true
            };
            
            showAdminAccess('owner', ['all']);
            
            // Пробуем запустить SecureAuth в фоне для будущих проверок
            trySecureAuthInBackground(normalizedWallet);
            return;
        }
        
        // Проверяем DEV кошельки (coauthors)
        const DEV_WALLETS = [
            '0x9b49bd9c9458615e11c051afd1ebe983563b67ee',
            '0x03284a899147f5a07f82c622f34df92198671635',
            '0xa3496cacc8523421dd151f1d92a456c2dafa28c2'
        ].map(w => w.toLowerCase());
        
        if (DEV_WALLETS.includes(normalizedWallet)) {
            console.log('🔧 Coauthor detected via fallback check');
            
            currentAdminUser = {
                wallet_address: normalizedWallet,
                role: 'coauthor',
                permissions: ['studio', 'generator', 'full_access'],
                is_active: true
            };
            
            showAdminAccess('coauthor', ['studio', 'generator', 'full_access']);
            return;
        }
        
        // Проверяем team_members в базе
        if (typeof SupabaseClient !== 'undefined' && SupabaseClient.client) {
            const { data: teamMember } = await SupabaseClient.client
                .from('team_members')
                .select('*')
                .ilike('wallet_address', normalizedWallet)
                .eq('is_active', true)
                .single();
            
            if (teamMember) {
                console.log('👥 Team member detected:', teamMember.role);
                
                currentAdminUser = teamMember;
                showAdminAccess(teamMember.role, teamMember.permissions);
                return;
            }
        }
        
        console.log('🛡️ No admin access');
        hideAdminAccess();
        
    } catch (error) {
        console.error('Secure admin check error:', error);
        hideAdminAccess();
    }
}

/**
 * Пробуем запустить SecureAuth в фоне
 */
async function trySecureAuthInBackground(walletAddress) {
    if (!window.SecureAuth || SecureAuth.isAuthenticated) return;
    
    console.log('🔐 Trying SecureAuth in background...');
    
    try {
        // Проверяем доступность API
        const testResponse = await fetch('/api/auth/challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress })
        });
        
        if (testResponse.ok) {
            console.log('✅ SecureAuth API available');
            // API доступен, но не запускаем автоматическую подпись
            // Пользователь может вызвать её вручную
        } else {
            console.log('⚠️ SecureAuth API not ready yet');
        }
    } catch (e) {
        console.log('⚠️ SecureAuth API not available:', e.message);
    }
}

// ═══════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    console.log('🛡️ Secure Admin Access v2.1 initializing...');
    
    // Ждём немного для загрузки всех модулей
    setTimeout(() => {
        console.log('🛡️ Starting admin access check...');
        checkAdminAccessSecure();
    }, 1500);
});

// Слушаем подключение кошелька
window.addEventListener('walletConnected', () => {
    console.log('🔐 Wallet connected event - checking admin access');
    setTimeout(checkAdminAccessSecure, 500);
});

// Слушаем SecureAuth
window.addEventListener('secureAuthComplete', (e) => {
    console.log('🔐 SecureAuth complete - checking admin access');
    setTimeout(checkAdminAccessSecure, 500);
});

// ═══════════════════════════════════════════════════════════
// ЗАМЕНА ГЛОБАЛЬНЫХ ФУНКЦИЙ
// ═══════════════════════════════════════════════════════════

window.checkAdminAccess = checkAdminAccessSecure;
window.checkAdminAccessSecure = checkAdminAccessSecure;

console.log('🛡️ Secure Admin Access v2.1 loaded');
console.log('   ✅ checkAdminAccess replaced with secure version');
console.log('   ⚠️ Fallback mode enabled until API is ready');
