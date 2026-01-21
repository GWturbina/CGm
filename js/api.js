/* =====================================================
   CARDGIFT - API FUNCTIONS
   Функции работы с API сервера
   ===================================================== */

const API = {
    baseUrl: '',
    
    // Сохранить карту
    async saveCard(cardData) {
        try {
            const response = await fetch(`${this.baseUrl}/api/save-card`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cardId: cardData.cardId,
                    cardData: cardData
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save card');
            }
            
            const result = await response.json();
            console.log('✅ Card saved to server:', cardData.cardId);
            return result;
        } catch (error) {
            console.warn('API save failed, using localStorage:', error);
            
            // Fallback to localStorage
            const cardId = cardData.cardId || 'card_' + Date.now();
            localStorage.setItem(`card_${cardId}`, JSON.stringify(cardData));
            
            return {
                success: true,
                cardId: cardId,
                source: 'localStorage'
            };
        }
    },
    
    // Получить карту
    async getCard(cardId) {
        try {
            // Пробуем получить с сервера
            const response = await fetch(`${this.baseUrl}/api/get-card?id=${cardId}`);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log('✅ Card loaded from server:', cardId);
                    return result.data;
                }
            }
            
            throw new Error('Card not found on server');
        } catch (error) {
            console.warn('API get failed, trying localStorage:', error);
            
            // Fallback to localStorage
            const localData = localStorage.getItem(`card_${cardId}`);
            if (localData) {
                console.log('✅ Card loaded from localStorage:', cardId);
                return JSON.parse(localData);
            }
            
            return null;
        }
    },
    
    // Регистрация пользователя
    async registerUser(userData) {
        try {
            const response = await fetch(`${this.baseUrl}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                throw new Error('Registration failed');
            }
            
            return await response.json();
        } catch (error) {
            console.warn('API register failed, using localStorage:', error);
            
            // Fallback to localStorage
            const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const user = {
                ...userData,
                id: userId,
                createdAt: new Date().toISOString(),
                level: 0
            };
            
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            return {
                success: true,
                userId: userId,
                source: 'localStorage'
            };
        }
    },
    
    // Получить пользователя
    async getUser(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/user/${userId}`);
            
            if (!response.ok) {
                throw new Error('User not found');
            }
            
            return await response.json();
        } catch (error) {
            console.warn('API getUser failed, trying localStorage:', error);
            
            const localData = localStorage.getItem('currentUser');
            if (localData) {
                return JSON.parse(localData);
            }
            
            return null;
        }
    }
};

// Глобальный доступ
window.API = API;

console.log('🌐 API functions loaded');
