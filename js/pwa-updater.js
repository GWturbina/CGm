/* =====================================================
   CARDGIFT - PWA AUTO UPDATE
   Автоматическое обновление приложения
   
   Подключение: <script src="js/pwa-updater.js"></script>
   (в конце body, после всех скриптов)
   ===================================================== */

(function() {
    'use strict';
    
    const PWA_VERSION = '2.1.0';  // Текущая версия клиента
    const CHECK_INTERVAL = 60 * 1000; // Проверка каждую минуту
    const SW_PATH = '/sw.js';
    
    let updateAvailable = false;
    let waitingWorker = null;
    let updateBanner = null;
    
    // ===== ИНИЦИАЛИЗАЦИЯ =====
    function init() {
        if (!('serviceWorker' in navigator)) {
            console.log('❌ Service Worker не поддерживается');
            return;
        }
        
        console.log(`📱 PWA Updater v${PWA_VERSION} initialized`);
        
        // Регистрируем/обновляем Service Worker
        registerServiceWorker();
        
        // Периодическая проверка обновлений
        setInterval(checkForUpdates, CHECK_INTERVAL);
        
        // Проверяем при возвращении на вкладку
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkForUpdates();
            }
        });
        
        // Проверяем при восстановлении сети
        window.addEventListener('online', checkForUpdates);
    }
    
    // ===== РЕГИСТРАЦИЯ SERVICE WORKER =====
    async function registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register(SW_PATH, {
                updateViaCache: 'none' // Всегда проверять обновления SW
            });
            
            console.log('✅ Service Worker registered');
            
            // Слушаем обновления
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 New Service Worker installing...');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Новая версия готова!
                        console.log('✨ New version available!');
                        waitingWorker = newWorker;
                        showUpdateBanner();
                    }
                });
            });
            
            // Если уже есть ожидающий воркер
            if (registration.waiting) {
                waitingWorker = registration.waiting;
                showUpdateBanner();
            }
            
            // Слушаем сообщения от SW
            navigator.serviceWorker.addEventListener('message', handleSWMessage);
            
            // Перезагрузка после активации нового SW
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    console.log('🔄 Reloading for new version...');
                    window.location.reload();
                }
            });
            
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
        }
    }
    
    // ===== ПРОВЕРКА ОБНОВЛЕНИЙ =====
    async function checkForUpdates() {
        if (!navigator.serviceWorker.controller) return;
        
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.update();
            console.log('🔍 Checked for updates');
        } catch (error) {
            console.warn('⚠️ Update check failed:', error);
        }
    }
    
    // ===== ПРИМЕНЕНИЕ ОБНОВЛЕНИЯ =====
    function applyUpdate() {
        if (!waitingWorker) {
            console.warn('⚠️ No waiting worker');
            window.location.reload();
            return;
        }
        
        console.log('🚀 Applying update...');
        
        // Говорим новому SW активироваться
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        
        // Скрываем баннер
        hideUpdateBanner();
    }
    
    // ===== БАННЕР ОБНОВЛЕНИЯ =====
    function showUpdateBanner() {
        if (updateBanner) return; // Уже показан
        
        updateAvailable = true;
        
        // Создаём баннер
        updateBanner = document.createElement('div');
        updateBanner.id = 'pwa-update-banner';
        updateBanner.innerHTML = `
            <div class="pwa-update-content">
                <div class="pwa-update-icon">🎉</div>
                <div class="pwa-update-text">
                    <strong>Доступно обновление!</strong>
                    <span>Новая версия CardGift готова к установке</span>
                </div>
                <div class="pwa-update-actions">
                    <button class="pwa-update-btn pwa-update-later" onclick="window.PWAUpdater.dismissBanner()">
                        Позже
                    </button>
                    <button class="pwa-update-btn pwa-update-now" onclick="window.PWAUpdater.update()">
                        Обновить
                    </button>
                </div>
            </div>
        `;
        
        // Добавляем стили если их нет
        if (!document.getElementById('pwa-update-styles')) {
            const styles = document.createElement('style');
            styles.id = 'pwa-update-styles';
            styles.textContent = `
                #pwa-update-banner {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 999999;
                    animation: pwa-slide-up 0.4s ease-out;
                }
                
                @keyframes pwa-slide-up {
                    from {
                        transform: translateX(-50%) translateY(100px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                }
                
                .pwa-update-content {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 1px solid #FFD700;
                    border-radius: 16px;
                    padding: 16px 20px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.2);
                    max-width: 90vw;
                }
                
                .pwa-update-icon {
                    font-size: 32px;
                    animation: pwa-bounce 1s ease infinite;
                }
                
                @keyframes pwa-bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                
                .pwa-update-text {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .pwa-update-text strong {
                    color: #FFD700;
                    font-size: 16px;
                }
                
                .pwa-update-text span {
                    color: #aaa;
                    font-size: 13px;
                }
                
                .pwa-update-actions {
                    display: flex;
                    gap: 10px;
                    margin-left: 10px;
                }
                
                .pwa-update-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .pwa-update-later {
                    background: rgba(255, 255, 255, 0.1);
                    color: #888;
                }
                
                .pwa-update-later:hover {
                    background: rgba(255, 255, 255, 0.2);
                    color: #fff;
                }
                
                .pwa-update-now {
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    color: #000;
                }
                
                .pwa-update-now:hover {
                    transform: scale(1.05);
                    box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
                }
                
                @media (max-width: 600px) {
                    #pwa-update-banner {
                        bottom: 10px;
                        left: 10px;
                        right: 10px;
                        transform: none;
                    }
                    
                    @keyframes pwa-slide-up {
                        from {
                            transform: translateY(100px);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }
                    
                    .pwa-update-content {
                        flex-wrap: wrap;
                        justify-content: center;
                        text-align: center;
                    }
                    
                    .pwa-update-text {
                        width: 100%;
                    }
                    
                    .pwa-update-actions {
                        width: 100%;
                        justify-content: center;
                        margin-left: 0;
                        margin-top: 10px;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(updateBanner);
        
        // Звук уведомления (опционально)
        playUpdateSound();
        
        // Автоскрытие через 30 секунд
        setTimeout(() => {
            if (updateBanner && updateBanner.parentNode) {
                dismissBanner();
            }
        }, 30000);
    }
    
    function hideUpdateBanner() {
        if (updateBanner && updateBanner.parentNode) {
            updateBanner.remove();
            updateBanner = null;
        }
    }
    
    function dismissBanner() {
        hideUpdateBanner();
        // Показать снова через 5 минут
        setTimeout(() => {
            if (updateAvailable && waitingWorker) {
                showUpdateBanner();
            }
        }, 5 * 60 * 1000);
    }
    
    // ===== ЗВУК ОБНОВЛЕНИЯ =====
    function playUpdateSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // Звук не обязателен
        }
    }
    
    // ===== ОБРАБОТКА СООБЩЕНИЙ ОТ SW =====
    function handleSWMessage(event) {
        const { data } = event;
        
        if (data.type === 'VERSION') {
            console.log(`📦 SW Version: ${data.version}`);
        }
        
        if (data.type === 'CACHE_UPDATED') {
            console.log('📦 Cache updated');
        }
    }
    
    // ===== ПУБЛИЧНЫЙ API =====
    window.PWAUpdater = {
        version: PWA_VERSION,
        
        // Принудительно проверить обновления
        check: checkForUpdates,
        
        // Применить обновление
        update: applyUpdate,
        
        // Скрыть баннер
        dismissBanner: dismissBanner,
        
        // Есть ли обновление
        hasUpdate: () => updateAvailable,
        
        // Очистить кэш и обновить
        forceUpdate: async () => {
            try {
                const registration = await navigator.serviceWorker.ready;
                
                // Отправляем команду очистить кэш
                if (navigator.serviceWorker.controller) {
                    const messageChannel = new MessageChannel();
                    messageChannel.port1.onmessage = (event) => {
                        if (event.data.success) {
                            console.log('✅ Cache cleared');
                            window.location.reload(true);
                        }
                    };
                    navigator.serviceWorker.controller.postMessage(
                        { type: 'CLEAR_CACHE' },
                        [messageChannel.port2]
                    );
                } else {
                    window.location.reload(true);
                }
            } catch (error) {
                console.error('❌ Force update failed:', error);
                window.location.reload(true);
            }
        },
        
        // Получить версию SW
        getSWVersion: async () => {
            return new Promise((resolve) => {
                if (!navigator.serviceWorker.controller) {
                    resolve(null);
                    return;
                }
                
                const messageChannel = new MessageChannel();
                messageChannel.port1.onmessage = (event) => {
                    resolve(event.data.version);
                };
                
                navigator.serviceWorker.controller.postMessage(
                    { type: 'GET_VERSION' },
                    [messageChannel.port2]
                );
                
                // Таймаут
                setTimeout(() => resolve(null), 1000);
            });
        }
    };
    
    // ===== ЗАПУСК =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
