/* =====================================================
   VIRTUAL ASSISTANT - UI MODULE v1.0
   Интерфейс виртуального помощника
   
   Компоненты:
   - Плавающая кнопка (правый нижний угол)
   - Панель чата
   - Карточки уроков и заданий
   - Прогресс-бар
   - Уведомления
   ===================================================== */

class AssistantUI {
    constructor(assistant, options = {}) {
        this.assistant = assistant;
        this.options = {
            position: options.position || 'bottom-right',
            theme: options.theme || 'light',
            language: options.language || 'ru',
            avatarUrl: options.avatarUrl || null,
            assistantName: options.assistantName || 'Помощник',
            ...options
        };
        
        this.isOpen = false;
        this.currentView = 'main'; // main, tasks, lessons, achievements, settings
        this.container = null;
        
        this.init();
    }
    
    // ═══════════════════════════════════════════════════════════
    // ИНИЦИАЛИЗАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    init() {
        this.createStyles();
        this.createContainer();
        this.createFloatingButton();
        this.createPanel();
        this.bindEvents();
        this.updateUI();
        
        console.log('🎨 AssistantUI initialized');
    }
    
    // ═══════════════════════════════════════════════════════════
    // СОЗДАНИЕ ЭЛЕМЕНТОВ
    // ═══════════════════════════════════════════════════════════
    
    createStyles() {
        if (document.getElementById('assistant-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'assistant-styles';
        styles.textContent = `
            /* ═══ ПЕРЕМЕННЫЕ ═══ */
            :root {
                --assistant-primary: #6366f1;
                --assistant-primary-dark: #4f46e5;
                --assistant-success: #10b981;
                --assistant-warning: #f59e0b;
                --assistant-danger: #ef4444;
                --assistant-bg: #ffffff;
                --assistant-bg-secondary: #f8fafc;
                --assistant-text: #1e293b;
                --assistant-text-secondary: #64748b;
                --assistant-border: #e2e8f0;
                --assistant-shadow: 0 10px 40px rgba(0,0,0,0.15);
                --assistant-radius: 16px;
                --assistant-transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* ═══ КОНТЕЙНЕР ═══ */
            .assistant-container {
                position: fixed;
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            }
            
            .assistant-container.bottom-right {
                bottom: 20px;
                right: 20px;
            }
            
            .assistant-container.bottom-left {
                bottom: 20px;
                left: 20px;
            }
            
            /* ═══ ПЛАВАЮЩАЯ КНОПКА ═══ */
            .assistant-fab {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--assistant-primary), var(--assistant-primary-dark));
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: var(--assistant-transition);
                position: relative;
                overflow: hidden;
            }
            
            .assistant-fab:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 30px rgba(99, 102, 241, 0.5);
            }
            
            .assistant-fab:active {
                transform: scale(0.95);
            }
            
            .assistant-fab-icon {
                width: 32px;
                height: 32px;
                fill: white;
                transition: var(--assistant-transition);
            }
            
            .assistant-fab.open .assistant-fab-icon {
                transform: rotate(45deg);
            }
            
            /* Пульсация */
            .assistant-fab::before {
                content: '';
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: var(--assistant-primary);
                animation: assistant-pulse 2s infinite;
                z-index: -1;
            }
            
            @keyframes assistant-pulse {
                0% { transform: scale(1); opacity: 0.5; }
                100% { transform: scale(1.5); opacity: 0; }
            }
            
            /* Бейдж уведомлений */
            .assistant-fab-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                width: 24px;
                height: 24px;
                background: var(--assistant-danger);
                border-radius: 50%;
                color: white;
                font-size: 12px;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                animation: assistant-bounce 0.5s;
            }
            
            @keyframes assistant-bounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }
            
            /* ═══ ПАНЕЛЬ ═══ */
            .assistant-panel {
                position: absolute;
                bottom: 80px;
                right: 0;
                width: 380px;
                max-height: 600px;
                background: var(--assistant-bg);
                border-radius: var(--assistant-radius);
                box-shadow: var(--assistant-shadow);
                overflow: hidden;
                transform: scale(0.8) translateY(20px);
                opacity: 0;
                visibility: hidden;
                transition: var(--assistant-transition);
                display: flex;
                flex-direction: column;
            }
            
            .assistant-panel.open {
                transform: scale(1) translateY(0);
                opacity: 1;
                visibility: visible;
            }
            
            /* ═══ ЗАГОЛОВОК ПАНЕЛИ ═══ */
            .assistant-header {
                background: linear-gradient(135deg, var(--assistant-primary), var(--assistant-primary-dark));
                color: white;
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .assistant-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: rgba(255,255,255,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                flex-shrink: 0;
            }
            
            .assistant-avatar img {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                object-fit: cover;
            }
            
            .assistant-header-info {
                flex: 1;
            }
            
            .assistant-header-title {
                font-size: 18px;
                font-weight: 600;
                margin: 0 0 4px 0;
            }
            
            .assistant-header-subtitle {
                font-size: 13px;
                opacity: 0.9;
                margin: 0;
            }
            
            .assistant-header-close {
                background: rgba(255,255,255,0.2);
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: var(--assistant-transition);
            }
            
            .assistant-header-close:hover {
                background: rgba(255,255,255,0.3);
            }
            
            .assistant-header-close svg {
                width: 16px;
                height: 16px;
                fill: white;
            }
            
            /* ═══ ПРОГРЕСС-БАР ═══ */
            .assistant-progress {
                padding: 16px 20px;
                background: var(--assistant-bg-secondary);
                border-bottom: 1px solid var(--assistant-border);
            }
            
            .assistant-progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .assistant-progress-day {
                font-weight: 600;
                color: var(--assistant-text);
            }
            
            .assistant-progress-points {
                display: flex;
                align-items: center;
                gap: 4px;
                color: var(--assistant-primary);
                font-weight: 600;
            }
            
            .assistant-progress-bar {
                height: 8px;
                background: var(--assistant-border);
                border-radius: 4px;
                overflow: hidden;
            }
            
            .assistant-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--assistant-primary), var(--assistant-success));
                border-radius: 4px;
                transition: width 0.5s ease;
            }
            
            .assistant-progress-stats {
                display: flex;
                justify-content: space-between;
                margin-top: 8px;
                font-size: 12px;
                color: var(--assistant-text-secondary);
            }
            
            /* ═══ НАВИГАЦИЯ ═══ */
            .assistant-nav {
                display: flex;
                border-bottom: 1px solid var(--assistant-border);
            }
            
            .assistant-nav-btn {
                flex: 1;
                padding: 12px;
                border: none;
                background: none;
                cursor: pointer;
                color: var(--assistant-text-secondary);
                font-size: 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                transition: var(--assistant-transition);
                border-bottom: 2px solid transparent;
            }
            
            .assistant-nav-btn:hover {
                background: var(--assistant-bg-secondary);
            }
            
            .assistant-nav-btn.active {
                color: var(--assistant-primary);
                border-bottom-color: var(--assistant-primary);
            }
            
            .assistant-nav-btn svg {
                width: 20px;
                height: 20px;
            }
            
            /* ═══ КОНТЕНТ ═══ */
            .assistant-content {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }
            
            /* ═══ СООБЩЕНИЕ ПРИВЕТСТВИЯ ═══ */
            .assistant-greeting {
                background: var(--assistant-bg-secondary);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
            }
            
            .assistant-greeting-text {
                white-space: pre-line;
                line-height: 1.6;
                color: var(--assistant-text);
                font-size: 14px;
            }
            
            /* ═══ КАРТОЧКИ ЗАДАНИЙ ═══ */
            .assistant-tasks {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .assistant-task {
                background: var(--assistant-bg);
                border: 1px solid var(--assistant-border);
                border-radius: 12px;
                padding: 14px;
                transition: var(--assistant-transition);
                cursor: pointer;
            }
            
            .assistant-task:hover {
                border-color: var(--assistant-primary);
                box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
            }
            
            .assistant-task.completed {
                background: #f0fdf4;
                border-color: var(--assistant-success);
            }
            
            .assistant-task-header {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            
            .assistant-task-check {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 2px solid var(--assistant-border);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: var(--assistant-transition);
            }
            
            .assistant-task.completed .assistant-task-check {
                background: var(--assistant-success);
                border-color: var(--assistant-success);
            }
            
            .assistant-task-check svg {
                width: 14px;
                height: 14px;
                fill: white;
                opacity: 0;
                transition: var(--assistant-transition);
            }
            
            .assistant-task.completed .assistant-task-check svg {
                opacity: 1;
            }
            
            .assistant-task-info {
                flex: 1;
            }
            
            .assistant-task-title {
                font-weight: 500;
                color: var(--assistant-text);
                margin: 0 0 4px 0;
                font-size: 14px;
            }
            
            .assistant-task-desc {
                color: var(--assistant-text-secondary);
                font-size: 13px;
                margin: 0;
            }
            
            .assistant-task-points {
                display: flex;
                align-items: center;
                gap: 4px;
                color: var(--assistant-warning);
                font-weight: 600;
                font-size: 13px;
            }
            
            /* ═══ КНОПКА ДЕЙСТВИЯ ═══ */
            .assistant-action-btn {
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, var(--assistant-primary), var(--assistant-primary-dark));
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: var(--assistant-transition);
                margin-top: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .assistant-action-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            }
            
            .assistant-action-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            /* ═══ ДОСТИЖЕНИЯ ═══ */
            .assistant-achievements {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
            }
            
            .assistant-achievement {
                text-align: center;
                padding: 12px 8px;
                border-radius: 12px;
                background: var(--assistant-bg-secondary);
                transition: var(--assistant-transition);
            }
            
            .assistant-achievement.earned {
                background: linear-gradient(135deg, #fef3c7, #fde68a);
            }
            
            .assistant-achievement.locked {
                opacity: 0.5;
            }
            
            .assistant-achievement-icon {
                font-size: 28px;
                margin-bottom: 4px;
            }
            
            .assistant-achievement-name {
                font-size: 11px;
                color: var(--assistant-text);
                font-weight: 500;
            }
            
            .assistant-achievement-points {
                font-size: 10px;
                color: var(--assistant-text-secondary);
            }
            
            /* ═══ УВЕДОМЛЕНИЕ ═══ */
            .assistant-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--assistant-bg);
                border-radius: 12px;
                box-shadow: var(--assistant-shadow);
                padding: 16px 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 9999999;
                transform: translateX(120%);
                transition: var(--assistant-transition);
                max-width: 360px;
            }
            
            .assistant-notification.show {
                transform: translateX(0);
            }
            
            .assistant-notification-icon {
                font-size: 32px;
            }
            
            .assistant-notification-content h4 {
                margin: 0 0 4px 0;
                font-size: 15px;
                color: var(--assistant-text);
            }
            
            .assistant-notification-content p {
                margin: 0;
                font-size: 13px;
                color: var(--assistant-text-secondary);
            }
            
            /* ═══ МОБИЛЬНАЯ АДАПТАЦИЯ ═══ */
            @media (max-width: 480px) {
                .assistant-panel {
                    width: calc(100vw - 40px);
                    max-height: 70vh;
                    bottom: 80px;
                    right: 0;
                }
                
                .assistant-fab {
                    width: 56px;
                    height: 56px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.className = `assistant-container ${this.options.position}`;
        this.container.id = 'virtual-assistant';
        document.body.appendChild(this.container);
    }
    
    createFloatingButton() {
        const fab = document.createElement('button');
        fab.className = 'assistant-fab';
        fab.id = 'assistant-fab';
        fab.innerHTML = `
            <svg class="assistant-fab-icon" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span class="assistant-fab-badge" style="display: none;">0</span>
        `;
        
        this.container.appendChild(fab);
        this.fabButton = fab;
        this.fabBadge = fab.querySelector('.assistant-fab-badge');
    }
    
    createPanel() {
        const panel = document.createElement('div');
        panel.className = 'assistant-panel';
        panel.id = 'assistant-panel';
        panel.innerHTML = this.getPanelHTML();
        
        this.container.appendChild(panel);
        this.panel = panel;
    }
    
    getPanelHTML() {
        return `
            <!-- Header -->
            <div class="assistant-header">
                <div class="assistant-avatar">
                    ${this.options.avatarUrl 
                        ? `<img src="${this.options.avatarUrl}" alt="Avatar">` 
                        : '🤖'}
                </div>
                <div class="assistant-header-info">
                    <h3 class="assistant-header-title">${this.options.assistantName}</h3>
                    <p class="assistant-header-subtitle" id="assistant-subtitle">21-дневная программа</p>
                </div>
                <button class="assistant-header-close" id="assistant-close">
                    <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>
            
            <!-- Progress -->
            <div class="assistant-progress">
                <div class="assistant-progress-header">
                    <span class="assistant-progress-day" id="assistant-day">День 1 / 21</span>
                    <span class="assistant-progress-points">
                        ⭐ <span id="assistant-points">0</span> очков
                    </span>
                </div>
                <div class="assistant-progress-bar">
                    <div class="assistant-progress-fill" id="assistant-progress-fill" style="width: 0%"></div>
                </div>
                <div class="assistant-progress-stats">
                    <span>🔥 <span id="assistant-streak">0</span> дней подряд</span>
                    <span>🏆 <span id="assistant-achievements-count">0</span> достижений</span>
                </div>
            </div>
            
            <!-- Navigation -->
            <div class="assistant-nav">
                <button class="assistant-nav-btn active" data-view="main">
                    <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                    <span>Главная</span>
                </button>
                <button class="assistant-nav-btn" data-view="tasks">
                    <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    <span>Задания</span>
                </button>
                <button class="assistant-nav-btn" data-view="achievements">
                    <svg viewBox="0 0 24 24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/></svg>
                    <span>Награды</span>
                </button>
            </div>
            
            <!-- Content -->
            <div class="assistant-content" id="assistant-content">
                <!-- Динамический контент -->
            </div>
        `;
    }
    
    // ═══════════════════════════════════════════════════════════
    // СОБЫТИЯ
    // ═══════════════════════════════════════════════════════════
    
    bindEvents() {
        // Клик по FAB
        this.fabButton.addEventListener('click', () => this.toggle());
        
        // Закрытие
        this.panel.querySelector('#assistant-close').addEventListener('click', () => this.close());
        
        // Навигация
        this.panel.querySelectorAll('.assistant-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });
        
        // Слушаем изменения состояния
        window.addEventListener('assistant:stateChange', () => this.updateUI());
        
        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    // ═══════════════════════════════════════════════════════════
    // ОТКРЫТИЕ/ЗАКРЫТИЕ
    // ═══════════════════════════════════════════════════════════
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.isOpen = true;
        this.panel.classList.add('open');
        this.fabButton.classList.add('open');
        this.updateUI();
    }
    
    close() {
        this.isOpen = false;
        this.panel.classList.remove('open');
        this.fabButton.classList.remove('open');
    }
    
    // ═══════════════════════════════════════════════════════════
    // ПЕРЕКЛЮЧЕНИЕ ВИДОВ
    // ═══════════════════════════════════════════════════════════
    
    switchView(view) {
        this.currentView = view;
        
        // Обновляем активную кнопку
        this.panel.querySelectorAll('.assistant-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        this.updateContent();
    }
    
    // ═══════════════════════════════════════════════════════════
    // ОБНОВЛЕНИЕ UI
    // ═══════════════════════════════════════════════════════════
    
    updateUI() {
        if (!this.assistant.state.initialized) return;
        
        const stats = this.assistant.getStats();
        
        // День
        this.panel.querySelector('#assistant-day').textContent = 
            `День ${stats.currentDay} / ${stats.totalDays}`;
        
        // Очки
        this.panel.querySelector('#assistant-points').textContent = 
            stats.totalPoints.toLocaleString();
        
        // Прогресс
        this.panel.querySelector('#assistant-progress-fill').style.width = 
            `${stats.programProgress}%`;
        
        // Streak
        this.panel.querySelector('#assistant-streak').textContent = stats.streakDays;
        
        // Достижения
        this.panel.querySelector('#assistant-achievements-count').textContent = 
            `${stats.achievementsEarned}/${stats.achievementsTotal}`;
        
        // Контент
        this.updateContent();
        
        // Badge
        this.updateBadge();
    }
    
    updateContent() {
        const content = this.panel.querySelector('#assistant-content');
        
        switch (this.currentView) {
            case 'main':
                content.innerHTML = this.renderMainView();
                break;
            case 'tasks':
                content.innerHTML = this.renderTasksView();
                break;
            case 'achievements':
                content.innerHTML = this.renderAchievementsView();
                break;
        }
        
        this.bindContentEvents();
    }
    
    updateBadge() {
        const tasks = this.assistant.getTodayTasks();
        const pending = tasks.filter(t => !t.completed).length;
        
        if (pending > 0) {
            this.fabBadge.textContent = pending;
            this.fabBadge.style.display = 'flex';
        } else {
            this.fabBadge.style.display = 'none';
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // РЕНДЕРИНГ ВИДОВ
    // ═══════════════════════════════════════════════════════════
    
    renderMainView() {
        const greeting = this.assistant.getGreeting();
        const currentDay = this.assistant.getCurrentDay();
        const tasks = this.assistant.getTodayTasks().slice(0, 3); // Первые 3 задания
        
        return `
            <!-- Приветствие -->
            <div class="assistant-greeting">
                <div class="assistant-greeting-text">${this.formatText(greeting)}</div>
            </div>
            
            <!-- Задания на сегодня -->
            <h4 style="margin: 0 0 12px; font-size: 14px; color: var(--assistant-text);">
                📋 Задания на сегодня
            </h4>
            <div class="assistant-tasks">
                ${tasks.map(task => this.renderTaskCard(task)).join('')}
            </div>
            
            ${tasks.length < this.assistant.getTodayTasks().length ? `
                <button class="assistant-action-btn" data-action="show-all-tasks">
                    Все задания (${this.assistant.getTodayTasks().length})
                </button>
            ` : ''}
            
            <!-- Теория дня -->
            ${currentDay.data?.theory ? `
                <button class="assistant-action-btn" data-action="show-theory" 
                        style="background: linear-gradient(135deg, #10b981, #059669);">
                    📚 Теория дня: ${currentDay.data.theory.title}
                </button>
            ` : ''}
        `;
    }
    
    renderTasksView() {
        const tasks = this.assistant.getTodayTasks();
        const progress = this.assistant.getDayProgress(this.assistant.state.currentDay);
        
        return `
            <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px; font-size: 14px; color: var(--assistant-text);">
                    День ${this.assistant.state.currentDay}: ${this.assistant.currentDayData?.title || ''}
                </h4>
                <p style="margin: 0; font-size: 13px; color: var(--assistant-text-secondary);">
                    Выполнено: ${progress.completed} / ${progress.total} (${progress.percentage}%)
                </p>
            </div>
            
            <div class="assistant-tasks">
                ${tasks.map(task => this.renderTaskCard(task)).join('')}
            </div>
            
            ${progress.isComplete ? `
                <div style="text-align: center; padding: 20px; background: #f0fdf4; border-radius: 12px; margin-top: 16px;">
                    <div style="font-size: 48px; margin-bottom: 8px;">🎉</div>
                    <h4 style="margin: 0 0 8px; color: #059669;">День завершён!</h4>
                    <p style="margin: 0; font-size: 13px; color: #065f46;">
                        Отличная работа! Возвращайтесь завтра.
                    </p>
                </div>
            ` : ''}
        `;
    }
    
    renderAchievementsView() {
        const achievements = this.assistant.getAchievements();
        
        return `
            <h4 style="margin: 0 0 16px; font-size: 14px; color: var(--assistant-text);">
                🏆 Ваши достижения
            </h4>
            
            <div class="assistant-achievements">
                ${achievements.map(a => `
                    <div class="assistant-achievement ${a.earned ? 'earned' : 'locked'}">
                        <div class="assistant-achievement-icon">${a.icon}</div>
                        <div class="assistant-achievement-name">${a.name}</div>
                        <div class="assistant-achievement-points">+${a.points}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderTaskCard(task) {
        return `
            <div class="assistant-task ${task.completed ? 'completed' : ''}" 
                 data-task-id="${task.id}">
                <div class="assistant-task-header">
                    <div class="assistant-task-check">
                        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    </div>
                    <div class="assistant-task-info">
                        <h5 class="assistant-task-title">${task.title}</h5>
                        <p class="assistant-task-desc">${task.description || ''}</p>
                    </div>
                    <div class="assistant-task-points">
                        +${task.points}
                    </div>
                </div>
            </div>
        `;
    }
    
    // ═══════════════════════════════════════════════════════════
    // СОБЫТИЯ КОНТЕНТА
    // ═══════════════════════════════════════════════════════════
    
    bindContentEvents() {
        // Клик по заданию
        this.panel.querySelectorAll('.assistant-task').forEach(el => {
            el.addEventListener('click', () => {
                const taskId = el.dataset.taskId;
                this.handleTaskClick(taskId);
            });
        });
        
        // Кнопки действий
        this.panel.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleAction(action);
            });
        });
    }
    
    async handleTaskClick(taskId) {
        const task = this.assistant.findTask(taskId);
        if (!task) return;
        
        if (this.assistant.isTaskCompleted(taskId)) {
            // Уже выполнено - показываем детали
            this.showTaskDetails(task);
        } else {
            // Показываем подтверждение
            const confirmed = await this.showConfirmTask(task);
            if (confirmed) {
                const result = await this.assistant.completeTask(taskId);
                if (result.success) {
                    this.showNotification('success', 'Задание выполнено!', `+${result.points} очков`);
                    this.updateUI();
                }
            }
        }
    }
    
    handleAction(action) {
        switch (action) {
            case 'show-all-tasks':
                this.switchView('tasks');
                break;
            case 'show-theory':
                this.showTheoryModal();
                break;
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // МОДАЛЬНЫЕ ОКНА
    // ═══════════════════════════════════════════════════════════
    
    async showConfirmTask(task) {
        return new Promise(resolve => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999999;
            `;
            
            modal.innerHTML = `
                <div style="background: white; border-radius: 16px; padding: 24px; max-width: 340px; margin: 20px;">
                    <h3 style="margin: 0 0 12px;">✅ Подтвердить выполнение?</h3>
                    <p style="margin: 0 0 8px; font-weight: 500;">${task.title}</p>
                    <p style="margin: 0 0 20px; color: #64748b; font-size: 14px;">${task.description || ''}</p>
                    <p style="margin: 0 0 20px; color: #f59e0b; font-weight: 600;">+${task.points} очков</p>
                    <div style="display: flex; gap: 12px;">
                        <button id="modal-cancel" style="flex: 1; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer;">Отмена</button>
                        <button id="modal-confirm" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: #6366f1; color: white; cursor: pointer; font-weight: 500;">Выполнено!</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('#modal-cancel').onclick = () => {
                modal.remove();
                resolve(false);
            };
            
            modal.querySelector('#modal-confirm').onclick = () => {
                modal.remove();
                resolve(true);
            };
            
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            };
        });
    }
    
    showTheoryModal() {
        const theory = this.assistant.getTodayTheory();
        if (!theory) return;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999999;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; padding: 24px; max-width: 500px; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0;">📚 ${theory.title}</h3>
                    <button id="modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
                </div>
                <div style="white-space: pre-line; line-height: 1.7; color: #334155;">
                    ${this.formatText(theory.content)}
                </div>
                ${theory.videoUrl ? `
                    <a href="${theory.videoUrl}" target="_blank" 
                       style="display: block; margin-top: 20px; padding: 12px; background: #6366f1; color: white; text-align: center; border-radius: 8px; text-decoration: none; font-weight: 500;">
                        🎬 Смотреть видео
                    </a>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#modal-close').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }
    
    showTaskDetails(task) {
        // Простое уведомление
        this.showNotification('info', task.title, task.hint || 'Задание уже выполнено');
    }
    
    // ═══════════════════════════════════════════════════════════
    // УВЕДОМЛЕНИЯ
    // ═══════════════════════════════════════════════════════════
    
    showNotification(type, title, message) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            achievement: '🏆'
        };
        
        const notification = document.createElement('div');
        notification.className = 'assistant-notification';
        notification.innerHTML = `
            <div class="assistant-notification-icon">${icons[type] || '📢'}</div>
            <div class="assistant-notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Автоудаление
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    showAchievementNotification(achievement) {
        this.showNotification(
            'achievement',
            `🎉 Достижение: ${achievement.name}`,
            `+${achievement.points} очков! ${achievement.description || ''}`
        );
    }
    
    // ═══════════════════════════════════════════════════════════
    // УТИЛИТЫ
    // ═══════════════════════════════════════════════════════════
    
    formatText(text) {
        if (!text) return '';
        
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }
    
    // ═══════════════════════════════════════════════════════════
    // ПУБЛИЧНОЕ API
    // ═══════════════════════════════════════════════════════════
    
    show() { this.open(); }
    hide() { this.close(); }
    
    setBadge(count) {
        if (count > 0) {
            this.fabBadge.textContent = count;
            this.fabBadge.style.display = 'flex';
        } else {
            this.fabBadge.style.display = 'none';
        }
    }
    
    destroy() {
        this.container.remove();
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssistantUI;
}

window.AssistantUI = AssistantUI;

console.log('🎨 AssistantUI module loaded');
