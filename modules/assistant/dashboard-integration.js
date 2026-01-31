/* =====================================================
   VIRTUAL ASSISTANT - DASHBOARD INTEGRATION
   
   Добавьте этот скрипт в dashboard.html перед </body>
   
   <script src="js/lessons-data.js"></script>
   <script src="js/modules/assistant/assistant.js"></script>
   <script src="js/modules/assistant/assistant-ui.js"></script>
   <script src="js/modules/assistant/assistant-init.js"></script>
   <script src="js/modules/assistant/dashboard-integration.js"></script>
   ===================================================== */

(function() {
    'use strict';
    
    // ═══════════════════════════════════════════════════════════
    // КОНФИГУРАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    const CONFIG = {
        autoStart: true,                    // Автозапуск помощника
        startDelay: 1500,                   // Задержка перед запуском (мс)
        showWelcomeOnFirstVisit: true,      // Показывать приветствие новичкам
        trackUserActions: true,             // Отслеживать действия пользователя
        debug: false,                       // Режим отладки
        maxRetries: 10,                     // ⭐ Максимум попыток загрузки
        retryDelay: 500                     // Задержка между попытками (мс)
    };
    
    // ⭐ Счётчик попыток
    let retryCount = 0;
    
    // ═══════════════════════════════════════════════════════════
    // ЗАПУСК
    // ═══════════════════════════════════════════════════════════
    
    function initAssistantIntegration() {
        console.log('🔌 Initializing Assistant Dashboard Integration...');
        
        // Ждём загрузки всех зависимостей
        const missing = [];
        if (typeof AssistantInit === 'undefined') missing.push('AssistantInit');
        if (typeof VirtualAssistant === 'undefined') missing.push('VirtualAssistant');
        if (typeof LessonsData === 'undefined') missing.push('LessonsData');
        
        if (missing.length > 0) {
            retryCount++;
            
            // ⭐ ПРОВЕРКА ЛИМИТА ПОПЫТОК
            if (retryCount > CONFIG.maxRetries) {
                console.warn(`⚠️ Assistant: dependencies not loaded after ${CONFIG.maxRetries} attempts.`);
                console.warn('Missing:', missing.join(', '));
                console.info('💡 Assistant will not start. To enable, load these scripts:');
                console.info('   - js/lessons-data.js');
                console.info('   - js/modules/assistant/assistant.js');
                console.info('   - js/modules/assistant/assistant-ui.js');
                console.info('   - js/modules/assistant/assistant-init.js');
                return; // ⭐ ПРЕКРАЩАЕМ попытки, не зацикливаемся!
            }
            
            console.log(`⏳ Waiting for dependencies (${retryCount}/${CONFIG.maxRetries})...`);
            setTimeout(initAssistantIntegration, CONFIG.retryDelay);
            return;
        }
        
        // ✅ Все зависимости загружены!
        retryCount = 0;
        console.log('✅ All dependencies loaded!');
        
        // Получаем userId из текущей сессии
        const userId = getUserId();
        
        // Запускаем помощника
        AssistantInit.start({
            userId: userId,
            gwId: window.currentUser?.gw_id || null,
            position: 'bottom-right',
            assistantName: 'Помощник',
            
            onReady: (assistant, ui) => {
                console.log('✅ Assistant ready!');
                
                // Привязываем события CardGift
                bindCardGiftEvents();
                
                // Показываем приветствие новичкам
                if (CONFIG.showWelcomeOnFirstVisit) {
                    checkFirstVisit(ui);
                }
                
                // Добавляем ссылку на программу в меню
                addProgramLink();
            },
            
            onAchievement: (achievement) => {
                console.log('🏆 Achievement unlocked:', achievement.name);
            },
            
            onDayComplete: (day, bonus) => {
                console.log(`✅ Day ${day} completed! +${bonus} bonus points`);
            },
            
            onProgramComplete: (totalPoints) => {
                console.log(`🎓 Program completed! Total: ${totalPoints} points`);
                showProgramCompleteCelebration();
            }
        });
    }
    
    // ═══════════════════════════════════════════════════════════
    // ПОЛУЧЕНИЕ USER ID
    // ═══════════════════════════════════════════════════════════
    
    function getUserId() {
        // Пробуем разные источники
        if (window.currentUser?.gw_id) return window.currentUser.gw_id;
        if (window.currentUser?.cg_id) return window.currentUser.cg_id;
        if (window.currentUser?.temp_id) return window.currentUser.temp_id;
        
        // Из localStorage
        try {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                const user = JSON.parse(stored);
                if (user.gw_id) return user.gw_id;
                if (user.cg_id) return user.cg_id;
                if (user.temp_id) return user.temp_id;
            }
        } catch (e) {}
        
        // Генерируем временный
        let tempId = localStorage.getItem('assistant_temp_id');
        if (!tempId) {
            tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('assistant_temp_id', tempId);
        }
        
        return tempId;
    }
    
    // ═══════════════════════════════════════════════════════════
    // ПРИВЯЗКА СОБЫТИЙ CARDGIFT
    // ═══════════════════════════════════════════════════════════
    
    function bindCardGiftEvents() {
        if (!CONFIG.trackUserActions) return;
        
        console.log('🔗 Binding CardGift events...');
        
        // ⭐ Проверяем наличие AssistantEvents
        if (typeof AssistantEvents === 'undefined') {
            console.warn('⚠️ AssistantEvents not available');
            return;
        }
        
        // === Генератор открыток ===
        const originalSaveCard = window.saveCard;
        if (typeof originalSaveCard === 'function') {
            window.saveCard = async function(...args) {
                const result = await originalSaveCard.apply(this, args);
                if (result) {
                    AssistantEvents.trackCardCreated();
                    logEvent('card_created');
                }
                return result;
            };
        }
        
        // === Опросы ===
        const originalSaveSurvey = window.saveSurvey;
        if (typeof originalSaveSurvey === 'function') {
            window.saveSurvey = async function(...args) {
                const result = await originalSaveSurvey.apply(this, args);
                if (result) {
                    AssistantEvents.trackSurveyCreated();
                    logEvent('survey_created');
                }
                return result;
            };
        }
        
        // === Блог ===
        const originalSaveBlogSettings = window.saveBlogSettings;
        if (typeof originalSaveBlogSettings === 'function') {
            window.saveBlogSettings = async function(...args) {
                const result = await originalSaveBlogSettings.apply(this, args);
                if (result) {
                    AssistantEvents.trackBlogSetup('profile');
                    logEvent('blog_settings_saved');
                }
                return result;
            };
        }
        
        // === Контакты ===
        const originalAddContact = window.addContact || window.ContactsService?.addContact;
        if (typeof originalAddContact === 'function') {
            const wrapper = async function(...args) {
                const result = await originalAddContact.apply(this, args);
                if (result) {
                    const count = await getContactsCount();
                    AssistantEvents.trackContactAdded(count);
                    logEvent('contact_added', { count });
                }
                return result;
            };
            
            if (window.addContact) window.addContact = wrapper;
            if (window.ContactsService?.addContact) window.ContactsService.addContact = wrapper;
        }
        
        // === Навигация ===
        observeNavigation();
    }
    
    // ═══════════════════════════════════════════════════════════
    // ОТСЛЕЖИВАНИЕ НАВИГАЦИИ
    // ═══════════════════════════════════════════════════════════
    
    function observeNavigation() {
        if (typeof AssistantEvents === 'undefined') return;
        
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('[data-section], [href*="#"]');
            if (navLink) {
                const section = navLink.dataset.section || 
                               navLink.getAttribute('href')?.replace('#', '');
                if (section) {
                    AssistantEvents.trackSectionVisit(section);
                    logEvent('section_visited', { section });
                }
            }
        });
        
        window.addEventListener('hashchange', () => {
            const section = window.location.hash.replace('#', '');
            if (section) {
                AssistantEvents.trackSectionVisit(section);
                logEvent('section_visited', { section });
            }
        });
    }
    
    // ═══════════════════════════════════════════════════════════
    // ПЕРВОЕ ПОСЕЩЕНИЕ
    // ═══════════════════════════════════════════════════════════
    
    function checkFirstVisit(ui) {
        if (!ui) return;
        
        const visited = localStorage.getItem('assistant_visited');
        
        if (!visited) {
            localStorage.setItem('assistant_visited', 'true');
            
            setTimeout(() => {
                if (ui.open) ui.open();
                if (ui.showNotification) {
                    ui.showNotification(
                        'info',
                        '👋 Добро пожаловать!',
                        'Я буду помогать вам освоить все инструменты за 21 день'
                    );
                }
            }, 2000);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // ДОБАВЛЕНИЕ ССЫЛКИ НА ПРОГРАММУ
    // ═══════════════════════════════════════════════════════════
    
    function addProgramLink() {
        const nav = document.querySelector('.sidebar-nav, .main-nav, .dashboard-nav, nav');
        if (!nav) return;
        if (nav.querySelector('[href="program.html"]')) return;
        
        const link = document.createElement('a');
        link.href = 'program.html';
        link.className = 'nav-link program-link';
        link.innerHTML = `
            <span class="nav-icon">🎓</span>
            <span class="nav-text">21-дневная программа</span>
        `;
        link.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            color: inherit;
            text-decoration: none;
            border-radius: 8px;
            transition: background 0.2s;
        `;
        
        link.addEventListener('mouseenter', () => link.style.background = 'rgba(99, 102, 241, 0.1)');
        link.addEventListener('mouseleave', () => link.style.background = 'transparent');
        
        nav.insertBefore(link, nav.firstChild);
    }
    
    // ═══════════════════════════════════════════════════════════
    // ПРАЗДНОВАНИЕ
    // ═══════════════════════════════════════════════════════════
    
    function showProgramCompleteCelebration() {
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        
        for (let i = 0; i < 100; i++) {
            setTimeout(() => createConfetti(colors[Math.floor(Math.random() * colors.length)]), i * 30);
        }
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex; align-items: center; justify-content: center;
            z-index: 999999;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 40px; text-align: center; max-width: 500px; margin: 20px;">
                <div style="font-size: 80px; margin-bottom: 20px;">🎓</div>
                <h1 style="margin: 0 0 16px; color: #6366f1;">Поздравляем!</h1>
                <p style="margin: 0 0 24px; font-size: 18px; color: #64748b;">
                    Вы успешно завершили 21-дневную программу!
                </p>
                <p style="margin: 0 0 24px; font-size: 24px; font-weight: bold; color: #10b981;">
                    +2000 бонусных очков!
                </p>
                <button onclick="this.closest('div').closest('div').remove()" 
                        style="padding: 14px 40px; background: #6366f1; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer;">
                    Отлично!
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    function createConfetti(color) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed; width: 10px; height: 10px; background: ${color};
            left: ${Math.random() * 100}vw; top: -10px; border-radius: 2px;
            z-index: 9999999; pointer-events: none;
            animation: confetti-fall 3s ease-out forwards;
        `;
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
    }
    
    // Анимация конфетти
    const style = document.createElement('style');
    style.textContent = `
        @keyframes confetti-fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // ═══════════════════════════════════════════════════════════
    // УТИЛИТЫ
    // ═══════════════════════════════════════════════════════════
    
    async function getContactsCount() {
        if (window.ContactsService?.getStats) {
            const stats = await window.ContactsService.getStats();
            return stats.total || 0;
        }
        return 0;
    }
    
    function logEvent(event, data = {}) {
        if (CONFIG.debug) {
            console.log(`📊 [Assistant Event] ${event}:`, data);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // АВТОЗАПУСК
    // ═══════════════════════════════════════════════════════════
    
    if (CONFIG.autoStart) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initAssistantIntegration, CONFIG.startDelay);
            });
        } else {
            setTimeout(initAssistantIntegration, CONFIG.startDelay);
        }
    }
    
    // Экспорт
    window.AssistantDashboard = {
        init: initAssistantIntegration,
        config: CONFIG
    };
    
    console.log('📦 Dashboard Integration module loaded');
    
})();
