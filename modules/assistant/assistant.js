/* =====================================================
   VIRTUAL ASSISTANT - INIT MODULE v1.0
   Инициализация и конфигурация помощника
   
   Использование:
   AssistantInit.start({ userId: 'user123' });
   ===================================================== */

const AssistantInit = {
    
    // Экземпляры
    assistant: null,
    ui: null,
    
    // Конфигурация по умолчанию
    defaultConfig: {
        userId: null,
        gwId: null,
        supabase: null,
        
        // UI настройки
        position: 'bottom-right',
        theme: 'light',
        language: 'ru',
        assistantName: 'Помощник',
        avatarUrl: 'images/assistant-avatar.png',
        
        // Callbacks
        onReady: null,
        onError: null,
        onStateChange: null,
        onAchievement: null,
        onDayComplete: null,
        onWeekComplete: null,
        onProgramComplete: null
    },
    
    // ═══════════════════════════════════════════════════════════
    // ЗАПУСК
    // ═══════════════════════════════════════════════════════════
    
    async start(config = {}) {
        console.log('🚀 Starting Virtual Assistant...');
        
        const options = { ...this.defaultConfig, ...config };
        
        // Проверяем зависимости
        if (!this.checkDependencies()) {
            const error = 'Missing dependencies';
            console.error('❌ ' + error);
            if (options.onError) options.onError(error);
            return false;
        }
        
        // Получаем userId если не передан
        if (!options.userId) {
            options.userId = this.getUserId();
        }
        
        if (!options.userId) {
            console.warn('⚠️ No userId, using demo mode');
            options.userId = 'demo_user_' + Date.now();
        }
        
        // Получаем Supabase клиент
        if (!options.supabase && window.supabase) {
            options.supabase = window.supabase;
        }
        
        try {
            // Создаём экземпляр логики
            this.assistant = new VirtualAssistant({
                userId: options.userId,
                gwId: options.gwId,
                supabase: options.supabase,
                onStateChange: options.onStateChange,
                onAchievement: (achievement) => {
                    // Показываем уведомление
                    if (this.ui) {
                        this.ui.showAchievementNotification(achievement);
                    }
                    if (options.onAchievement) {
                        options.onAchievement(achievement);
                    }
                },
                onDayComplete: options.onDayComplete,
                onWeekComplete: options.onWeekComplete,
                onProgramComplete: options.onProgramComplete
            });
            
            // Инициализируем
            await this.assistant.init();
            
            // Создаём UI
            this.ui = new AssistantUI(this.assistant, {
                position: options.position,
                theme: options.theme,
                language: options.language,
                assistantName: options.assistantName,
                avatarUrl: options.avatarUrl
            });
            
            // Делаем глобально доступным
            window.virtualAssistant = this.assistant;
            window.assistantUI = this.ui;
            
            console.log('✅ Virtual Assistant started!');
            
            if (options.onReady) {
                options.onReady(this.assistant, this.ui);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to start Virtual Assistant:', error);
            if (options.onError) options.onError(error);
            return false;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПРОВЕРКИ
    // ═══════════════════════════════════════════════════════════
    
    checkDependencies() {
        const missing = [];
        
        if (typeof LessonsData === 'undefined') {
            missing.push('LessonsData (lessons-data.js)');
        }
        
        if (typeof VirtualAssistant === 'undefined') {
            missing.push('VirtualAssistant (assistant.js)');
        }
        
        if (typeof AssistantUI === 'undefined') {
            missing.push('AssistantUI (assistant-ui.js)');
        }
        
        if (missing.length > 0) {
            console.error('❌ Missing dependencies:', missing.join(', '));
            return false;
        }
        
        return true;
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПОЛУЧЕНИЕ USER ID
    // ═══════════════════════════════════════════════════════════
    
    getUserId() {
        // Пробуем разные источники
        
        // 1. Из глобальной переменной currentUser
        if (window.currentUser?.gw_id) {
            return window.currentUser.gw_id;
        }
        if (window.currentUser?.userId) {
            return window.currentUser.userId;
        }
        if (window.currentUser?.id) {
            return window.currentUser.id;
        }
        if (window.currentUser?.cg_id) {
            return window.currentUser.cg_id;
        }
        
        // 1.5. Из глобальных переменных dashboard
        if (window.currentGwId) {
            return window.currentGwId;
        }
        if (window.currentDisplayId) {
            return window.currentDisplayId;
        }
        
        // 2. Из localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                // ⭐ FIX: В localStorage currentUser поле называется userId, не gw_id
                const foundId = user.gw_id || user.userId || user.id || user.cg_id;
                if (foundId) return foundId;
            } catch (e) {}
        }
        
        // 2.5 Отдельные ключи localStorage
        const gwId = localStorage.getItem('gwId') || localStorage.getItem('userGwId') || localStorage.getItem('cardgift_user_id');
        if (gwId) return gwId;
        
        // 3. Из URL параметров (для тестирования)
        const params = new URLSearchParams(window.location.search);
        if (params.get('user_id')) {
            return params.get('user_id');
        }
        
        // 4. Генерируем временный ID (последний вариант)
        let tempId = localStorage.getItem('assistant_temp_id');
        if (!tempId) {
            tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('assistant_temp_id', tempId);
        }
        
        return tempId;
    },
    
    // ═══════════════════════════════════════════════════════════
    // УПРАВЛЕНИЕ
    // ═══════════════════════════════════════════════════════════
    
    stop() {
        if (this.ui) {
            this.ui.destroy();
            this.ui = null;
        }
        this.assistant = null;
        window.virtualAssistant = null;
        window.assistantUI = null;
        console.log('🛑 Virtual Assistant stopped');
    },
    
    restart(config = {}) {
        this.stop();
        return this.start(config);
    },
    
    // ═══════════════════════════════════════════════════════════
    // БЫСТРЫЕ МЕТОДЫ
    // ═══════════════════════════════════════════════════════════
    
    // Открыть помощника
    open() {
        if (this.ui) this.ui.open();
    },
    
    // Закрыть помощника
    close() {
        if (this.ui) this.ui.close();
    },
    
    // Получить статистику
    getStats() {
        return this.assistant ? this.assistant.getStats() : null;
    },
    
    // Выполнить задание
    async completeTask(taskId, data = {}) {
        if (!this.assistant) return null;
        return await this.assistant.completeTask(taskId, data);
    },
    
    // Сбросить прогресс (для тестов)
    async reset() {
        if (this.assistant) {
            await this.assistant.resetProgress();
            if (this.ui) this.ui.updateUI();
        }
    }
};

// ═══════════════════════════════════════════════════════════
// АВТОЗАПУСК
// ═══════════════════════════════════════════════════════════

// Автоматический запуск когда DOM готов
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, нужен ли автозапуск
    const autoStart = document.querySelector('[data-assistant-autostart]');
    
    if (autoStart || window.ASSISTANT_AUTOSTART) {
        setTimeout(() => {
            AssistantInit.start();
        }, 1000); // Даём время загрузиться другим скриптам
    }
});

// ═══════════════════════════════════════════════════════════
// ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩИМИ СОБЫТИЯМИ
// ═══════════════════════════════════════════════════════════

// Автоматическое отслеживание событий CardGift
const AssistantEvents = {
    
    // Отслеживание создания открытки
    trackCardCreated() {
        if (window.virtualAssistant) {
            window.virtualAssistant.completeTask('d3_t6', { autoVerified: true });
        }
    },
    
    // Отслеживание создания опроса
    trackSurveyCreated() {
        if (window.virtualAssistant) {
            window.virtualAssistant.completeTask('d4_t2', { autoVerified: true });
        }
    },
    
    // Отслеживание настройки блога
    trackBlogSetup(field) {
        if (!window.virtualAssistant) return;
        
        switch (field) {
            case 'username':
                window.virtualAssistant.completeTask('d2_t2', { autoVerified: true });
                break;
            case 'profile':
                window.virtualAssistant.completeTask('d2_t3', { autoVerified: true });
                break;
            case 'logo':
                window.virtualAssistant.completeTask('d2_t4', { autoVerified: true });
                break;
        }
    },
    
    // Отслеживание добавления контактов
    trackContactAdded(count) {
        if (!window.virtualAssistant) return;
        
        if (count >= 10) {
            window.virtualAssistant.completeTask('d5_t2', { autoVerified: true });
        }
    },
    
    // Отслеживание посещения секции
    trackSectionVisit(section) {
        if (!window.virtualAssistant) return;
        
        const sectionTasks = {
            'blog': 'd2_t1',
            'generator': 'd3_t1',
            'surveys': 'd4_t1',
            'contacts': 'd5_t1',
            'crm': 'd8_t1',
            'ai-studio': 'd15_t1',
            'globalstudio': 'd18_t1'
        };
        
        const taskId = sectionTasks[section];
        if (taskId) {
            window.virtualAssistant.completeTask(taskId, { autoVerified: true });
        }
    },
    
    // Отслеживание касания (отправки)
    trackTouch() {
        // Увеличиваем счётчик касаний
        if (window.virtualAssistant) {
            // TODO: интеграция с daily_goals
        }
    }
};

// Делаем доступным глобально
window.AssistantInit = AssistantInit;
window.AssistantEvents = AssistantEvents;

console.log('🎯 AssistantInit module loaded');
console.log('💡 Usage: AssistantInit.start() or add data-assistant-autostart attribute');
