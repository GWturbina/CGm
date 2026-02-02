/* =====================================================
   CARDGIFT - SECURE AUTH SERVICE v1.0
   
   Безопасная авторизация через подпись кошелька
   
   ПРИНЦИП:
   1. Клиент запрашивает challenge (nonce) с сервера
   2. Пользователь подписывает сообщение в кошельке
   3. Сервер верифицирует подпись
   4. Сервер выдаёт JWT токен
   5. Токен используется для всех проверок
   
   ВАЖНО: Все проверки прав — ТОЛЬКО через сервер!
   ===================================================== */

const SecureAuth = {
    
    // ═══════════════════════════════════════════════════════════
    // СОСТОЯНИЕ
    // ═══════════════════════════════════════════════════════════
    
    token: null,
    user: null,
    isAuthenticated: false,
    isAuthenticating: false,
    
    // ═══════════════════════════════════════════════════════════
    // КОНСТАНТЫ
    // ═══════════════════════════════════════════════════════════
    
    TOKEN_KEY: 'cg_auth_token',
    USER_KEY: 'cg_auth_user',
    
    // ═══════════════════════════════════════════════════════════
    // ИНИЦИАЛИЗАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    async init() {
        console.log('🔐 SecureAuth initializing...');
        
        // Пробуем восстановить сессию из localStorage
        const savedToken = localStorage.getItem(this.TOKEN_KEY);
        
        if (savedToken) {
            // Проверяем токен на сервере
            const isValid = await this.validateToken(savedToken);
            
            if (isValid) {
                this.token = savedToken;
                this.user = JSON.parse(localStorage.getItem(this.USER_KEY) || '{}');
                this.isAuthenticated = true;
                console.log('✅ Session restored for:', this.user.wallet);
                return true;
            } else {
                // Токен невалиден — очищаем
                this.clearSession();
            }
        }
        
        return false;
    },
    
    // ═══════════════════════════════════════════════════════════
    // ГЛАВНЫЙ МЕТОД: АВТОРИЗАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Авторизация через подпись кошелька
     * @param {string} walletAddress - адрес кошелька
     * @returns {Promise<object>} - данные пользователя
     */
    async authenticate(walletAddress) {
        if (this.isAuthenticating) {
            console.log('⏳ Authentication already in progress...');
            return null;
        }
        
        this.isAuthenticating = true;
        const wallet = walletAddress.toLowerCase();
        
        console.log('🔐 Starting secure authentication for:', wallet);
        
        try {
            // ШАГ 1: Получаем challenge с сервера
            console.log('📤 Requesting challenge...');
            const challengeResponse = await fetch('/api/auth/challenge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: wallet })
            });
            
            if (!challengeResponse.ok) {
                throw new Error('Failed to get challenge');
            }
            
            const { message, nonce } = await challengeResponse.json();
            console.log('✅ Challenge received');
            
            // ШАГ 2: Подписываем сообщение в кошельке
            console.log('✍️ Requesting signature...');
            const signature = await this.signMessage(wallet, message);
            
            if (!signature) {
                throw new Error('User rejected signature');
            }
            console.log('✅ Message signed');
            
            // ШАГ 3: Отправляем на верификацию
            console.log('📤 Verifying signature...');
            const verifyResponse = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: wallet,
                    signature: signature,
                    message: message,
                    nonce: nonce
                })
            });
            
            if (!verifyResponse.ok) {
                const error = await verifyResponse.json();
                throw new Error(error.error || 'Verification failed');
            }
            
            const { token, user } = await verifyResponse.json();
            console.log('✅ Authentication successful!');
            console.log('   Role:', user.role);
            
            // ШАГ 4: Сохраняем сессию
            this.token = token;
            this.user = user;
            this.isAuthenticated = true;
            
            localStorage.setItem(this.TOKEN_KEY, token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
            
            // Событие для других модулей
            window.dispatchEvent(new CustomEvent('secureAuthComplete', { 
                detail: { user, token } 
            }));
            
            this.isAuthenticating = false;
            return user;
            
        } catch (error) {
            console.error('❌ Authentication failed:', error);
            this.isAuthenticating = false;
            
            if (typeof showToast === 'function') {
                showToast('Ошибка авторизации: ' + error.message, 'error');
            }
            
            throw error;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПОДПИСЬ СООБЩЕНИЯ
    // ═══════════════════════════════════════════════════════════
    
    async signMessage(walletAddress, message) {
        const provider = this.getProvider();
        
        if (!provider) {
            throw new Error('Wallet not connected');
        }
        
        try {
            // Используем personal_sign для SafePal
            const signature = await provider.request({
                method: 'personal_sign',
                params: [message, walletAddress]
            });
            
            return signature;
            
        } catch (error) {
            if (error.code === 4001) {
                // Пользователь отклонил
                console.log('User rejected signature request');
                return null;
            }
            throw error;
        }
    },
    
    getProvider() {
        // SafePal приоритет
        if (window.safepalProvider) return window.safepalProvider;
        if (window.safepal?.ethereum) return window.safepal.ethereum;
        if (window.ethereum?.isSafePal) return window.ethereum;
        
        if (window.ethereum?.providers) {
            const safePal = window.ethereum.providers.find(p => p.isSafePal);
            if (safePal) return safePal;
        }
        
        return window.ethereum || null;
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПРОВЕРКА ТОКЕНА
    // ═══════════════════════════════════════════════════════════
    
    async validateToken(token) {
        try {
            const response = await fetch('/api/auth/check-access', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) return false;
            
            const data = await response.json();
            return data.authenticated === true;
            
        } catch (error) {
            console.warn('Token validation error:', error);
            return false;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПРОВЕРКА ДОСТУПА (ЧЕРЕЗ СЕРВЕР!)
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Проверка доступа к функции
     * ВАЖНО: Проверка происходит НА СЕРВЕРЕ!
     */
    async checkAccess(feature) {
        if (!this.token) {
            return { hasAccess: false, reason: 'not_authenticated' };
        }
        
        try {
            const response = await fetch(`/api/auth/check-access?feature=${feature}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Токен истёк
                    this.clearSession();
                    return { hasAccess: false, reason: 'token_expired' };
                }
                return { hasAccess: false, reason: 'server_error' };
            }
            
            const data = await response.json();
            return {
                hasAccess: data.hasAccess,
                role: data.role,
                reason: data.hasAccess ? 'allowed' : 'insufficient_permissions'
            };
            
        } catch (error) {
            console.error('Check access error:', error);
            return { hasAccess: false, reason: 'network_error' };
        }
    },
    
    /**
     * Проверка доступа к админке
     */
    async hasAdminAccess() {
        const result = await this.checkAccess('admin');
        return result.hasAccess;
    },
    
    /**
     * Проверка - это OWNER?
     */
    async isOwner() {
        if (!this.token) return false;
        
        try {
            const response = await fetch('/api/auth/check-access', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            return data.isOwner === true;
        } catch (e) {
            return false;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПОЛУЧЕНИЕ ЗАГОЛОВКОВ ДЛЯ API ЗАПРОСОВ
    // ═══════════════════════════════════════════════════════════
    
    getAuthHeaders() {
        if (!this.token) return {};
        return {
            'Authorization': `Bearer ${this.token}`
        };
    },
    
    // ═══════════════════════════════════════════════════════════
    // ВЫХОД
    // ═══════════════════════════════════════════════════════════
    
    logout() {
        this.clearSession();
        
        // Также очищаем старые ключи
        localStorage.removeItem('cg_wallet_address');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('cardgift_wallet');
        
        window.dispatchEvent(new CustomEvent('secureAuthLogout'));
        
        console.log('🔐 Logged out');
    },
    
    clearSession() {
        this.token = null;
        this.user = null;
        this.isAuthenticated = false;
        
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    },
    
    // ═══════════════════════════════════════════════════════════
    // ГЕТТЕРЫ
    // ═══════════════════════════════════════════════════════════
    
    getUser() {
        return this.user;
    },
    
    getWallet() {
        return this.user?.wallet || null;
    },
    
    getRole() {
        return this.user?.role || 'guest';
    },
    
    getGwLevel() {
        return this.user?.gwLevel || 0;
    },
    
    // ═══════════════════════════════════════════════════════════
    // ДИАГНОСТИКА
    // ═══════════════════════════════════════════════════════════
    
    diagnose() {
        console.log('═══════════════════════════════════════');
        console.log('🔐 SECURE AUTH DIAGNOSTICS');
        console.log('═══════════════════════════════════════');
        console.log('Authenticated:', this.isAuthenticated);
        console.log('Token:', this.token ? '✅ Present' : '❌ None');
        console.log('User:', this.user);
        console.log('Wallet:', this.getWallet());
        console.log('Role:', this.getRole());
        console.log('GW Level:', this.getGwLevel());
        console.log('═══════════════════════════════════════');
    }
};

// ═══════════════════════════════════════════════════════════
// ГЛОБАЛЬНЫЙ ЭКСПОРТ
// ═══════════════════════════════════════════════════════════

window.SecureAuth = SecureAuth;

// Автоинициализация
document.addEventListener('DOMContentLoaded', () => {
    SecureAuth.init();
});

console.log('🔐 SecureAuth v1.0 loaded');
