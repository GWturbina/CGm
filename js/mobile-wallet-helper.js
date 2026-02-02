/* =====================================================
   MOBILE WALLET HELPER v1.0
   Deep Links для SafePal на мобильных устройствах
   
   Февраль 2026
   ===================================================== */

const MobileWalletHelper = {
    
    // Конфигурация
    config: {
        // SafePal deep link
        safePalLink: 'https://link.safepal.io/open',
        // Или альтернативный формат
        safePalDeepLink: 'safepalwallet://open',
        // Минимальная задержка показа модалки (мс)
        showDelay: 1500
    },
    
    // Определить мобильное устройство
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Определить iOS
    isIOS() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    },
    
    // Определить Android
    isAndroid() {
        return /Android/i.test(navigator.userAgent);
    },
    
    // Проверить есть ли кошелёк (window.ethereum)
    hasWallet() {
        return typeof window.ethereum !== 'undefined';
    },
    
    // Проверить что мы внутри SafePal
    isInSafePal() {
        // SafePal добавляет специальные маркеры
        return window.ethereum?.isSafePal || 
               navigator.userAgent.includes('SafePal') ||
               window.safepalProvider;
    },
    
    // Проверить что мы внутри Telegram
    isInTelegram() {
        return window.Telegram?.WebApp || 
               navigator.userAgent.includes('Telegram');
    },
    
    // Получить текущий URL для deep link
    getCurrentUrl() {
        return window.location.href;
    },
    
    // Создать SafePal deep link
    getSafePalLink() {
        const currentUrl = encodeURIComponent(this.getCurrentUrl());
        return `${this.config.safePalLink}?url=${currentUrl}`;
    },
    
    // Открыть в SafePal
    openInSafePal() {
        const link = this.getSafePalLink();
        console.log('📱 Opening in SafePal:', link);
        
        // Пробуем deep link
        window.location.href = link;
        
        // Если не сработало через 2 сек - показываем инструкцию
        setTimeout(() => {
            if (document.visibilityState === 'visible') {
                this.showInstruction();
            }
        }, 2000);
    },
    
    // Скопировать ссылку
    copyLink() {
        const url = this.getCurrentUrl();
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                this.showNotification('✅ Ссылка скопирована!');
            }).catch(() => {
                this.fallbackCopy(url);
            });
        } else {
            this.fallbackCopy(url);
        }
    },
    
    // Fallback копирование
    fallbackCopy(text) {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        this.showNotification('✅ Ссылка скопирована!');
    },
    
    // Показать уведомление
    showNotification(message) {
        // Используем существующую систему уведомлений если есть
        if (window.showNotification) {
            window.showNotification(message, 'success');
            return;
        }
        
        // Иначе простой alert
        alert(message);
    },
    
    // Показать инструкцию
    showInstruction() {
        const message = `
📱 Как открыть в SafePal:

1. Скопируй ссылку (кнопка ниже)
2. Открой приложение SafePal
3. Перейди в раздел "Браузер" (dApp Browser)
4. Вставь ссылку и открой

Или установи SafePal если ещё нет:
• App Store (iPhone)
• Google Play (Android)
        `.trim();
        
        alert(message);
    },
    
    // Создать модальное окно
    createModal() {
        // Проверяем что модалка ещё не создана
        if (document.getElementById('safePalModal')) {
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'safePalModal';
        modal.innerHTML = `
            <div class="safepal-modal-overlay">
                <div class="safepal-modal-content">
                    <div class="safepal-modal-icon">📱</div>
                    <h2>Откройте в SafePal</h2>
                    <p>Для работы с кошельком откройте эту страницу в приложении SafePal</p>
                    
                    <div class="safepal-modal-buttons">
                        <button onclick="MobileWalletHelper.openInSafePal()" class="safepal-btn safepal-btn-primary">
                            🔗 Открыть в SafePal
                        </button>
                        <button onclick="MobileWalletHelper.copyLink()" class="safepal-btn safepal-btn-secondary">
                            📋 Скопировать ссылку
                        </button>
                    </div>
                    
                    <div class="safepal-modal-install">
                        <p>Нет SafePal? <a href="https://www.safepal.com/download" target="_blank">Скачать бесплатно</a></p>
                    </div>
                    
                    <button onclick="MobileWalletHelper.closeModal()" class="safepal-close-btn">
                        Продолжить без кошелька
                    </button>
                </div>
            </div>
        `;
        
        // Добавляем стили
        const style = document.createElement('style');
        style.textContent = `
            .safepal-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(10, 10, 26, 0.95);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                backdrop-filter: blur(10px);
            }
            
            .safepal-modal-content {
                background: linear-gradient(135deg, #12122a, #1a1a3a);
                border: 2px solid #2a2a4a;
                border-radius: 24px;
                padding: 40px 30px;
                max-width: 400px;
                width: 100%;
                text-align: center;
                animation: safepalSlideIn 0.3s ease;
            }
            
            @keyframes safepalSlideIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .safepal-modal-icon {
                font-size: 60px;
                margin-bottom: 15px;
            }
            
            .safepal-modal-content h2 {
                color: #FFD700;
                margin-bottom: 10px;
                font-size: 22px;
            }
            
            .safepal-modal-content p {
                color: #9CA3AF;
                margin-bottom: 25px;
                line-height: 1.6;
                font-size: 14px;
            }
            
            .safepal-modal-buttons {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .safepal-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 14px 24px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                border: none;
                transition: all 0.3s;
            }
            
            .safepal-btn-primary {
                background: linear-gradient(135deg, #3B82F6, #8B5CF6);
                color: white;
            }
            
            .safepal-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
            }
            
            .safepal-btn-secondary {
                background: rgba(255,255,255,0.1);
                color: white;
                border: 1px solid #3a3a5a;
            }
            
            .safepal-btn-secondary:hover {
                background: rgba(255,255,255,0.15);
            }
            
            .safepal-modal-install {
                margin-bottom: 20px;
            }
            
            .safepal-modal-install a {
                color: #3B82F6;
                text-decoration: none;
            }
            
            .safepal-modal-install a:hover {
                text-decoration: underline;
            }
            
            .safepal-close-btn {
                background: transparent;
                border: none;
                color: #6B7280;
                font-size: 13px;
                cursor: pointer;
                padding: 10px;
            }
            
            .safepal-close-btn:hover {
                color: #9CA3AF;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
    },
    
    // Показать модалку
    showModal() {
        this.createModal();
        const modal = document.getElementById('safePalModal');
        if (modal) {
            modal.style.display = 'block';
        }
    },
    
    // Закрыть модалку
    closeModal() {
        const modal = document.getElementById('safePalModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // Инициализация - проверяем нужно ли показать модалку
    init() {
        console.log('📱 MobileWalletHelper initializing...');
        console.log('   isMobile:', this.isMobile());
        console.log('   hasWallet:', this.hasWallet());
        console.log('   isInSafePal:', this.isInSafePal());
        console.log('   isInTelegram:', this.isInTelegram());
        
        // Показываем модалку только если:
        // 1. Мобильное устройство
        // 2. Нет window.ethereum (не в кошельке)
        // 3. Не уже отказался (localStorage)
        if (this.isMobile() && !this.hasWallet()) {
            const dismissed = localStorage.getItem('safepal_modal_dismissed');
            const dismissedTime = dismissed ? parseInt(dismissed) : 0;
            const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
            
            // Показываем снова через 24 часа
            if (!dismissed || hoursSinceDismissed > 24) {
                setTimeout(() => {
                    this.showModal();
                }, this.config.showDelay);
            }
        }
        
        console.log('✅ MobileWalletHelper ready');
    },
    
    // Запомнить что пользователь отказался
    rememberDismiss() {
        localStorage.setItem('safepal_modal_dismissed', Date.now().toString());
        this.closeModal();
    }
};

// Обновляем closeModal чтобы запоминал
MobileWalletHelper.closeModal = function() {
    const modal = document.getElementById('safePalModal');
    if (modal) {
        modal.style.display = 'none';
    }
    localStorage.setItem('safepal_modal_dismissed', Date.now().toString());
};

// Автоматическая инициализация при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MobileWalletHelper.init());
} else {
    MobileWalletHelper.init();
}

// Экспорт
window.MobileWalletHelper = MobileWalletHelper;

console.log('📱 MobileWalletHelper v1.0 loaded');
