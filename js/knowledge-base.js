/* =====================================================
   KNOWLEDGE BASE - БАЗА ЗНАНИЙ v1.1
   С АВАТАРОМ ВМЕСТО ЭМОДЗИ
   
   Кнопка с аватаром на каждой странице + модальное окно
   ===================================================== */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    // ДАННЫЕ БАЗЫ ЗНАНИЙ ПО МОДУЛЯМ
    // ═══════════════════════════════════════════════════════════
    
    const KnowledgeBase = {
        
        generator: {
            title: "Генератор открыток",
            icon: "🎁",
            video: { url: "", duration: "3 мин", placeholder: true },
            buttons: [
                { name: "Выбрать шаблон", desc: "Готовые дизайны открыток на все случаи" },
                { name: "Загрузить фон", desc: "Добавить своё изображение или AI-картинку" },
                { name: "Добавить текст", desc: "Написать поздравление или использовать AI" },
                { name: "Настроить popup", desc: "Включить сбор контактов при просмотре" },
                { name: "Отправить", desc: "Получить ссылку для отправки" }
            ],
            steps: [
                "Выберите шаблон или загрузите свой фон",
                "Добавьте текст поздравления",
                "Включите popup для сбора контактов",
                "Нажмите 'Отправить' и скопируйте ссылку"
            ],
            tips: [
                "💡 Используйте AI Studio для уникальных текстов",
                "💡 Popup увеличивает конверсию в 3 раза"
            ]
        },
        
        blog: {
            title: "Мой блог",
            icon: "📝",
            video: { url: "", duration: "2 мин", placeholder: true },
            buttons: [
                { name: "Настройки профиля", desc: "Имя, описание, аватар блога" },
                { name: "Новый пост", desc: "Написать и опубликовать статью" },
                { name: "Статистика", desc: "Просмотры и популярные посты" }
            ],
            steps: [
                "Заполните профиль: имя, описание, аватар",
                "Нажмите 'Новый пост' и напишите текст",
                "Добавьте картинку и опубликуйте"
            ],
            tips: [
                "💡 Пишите минимум 1 пост в день",
                "💡 Картинки увеличивают вовлечённость в 2 раза"
            ]
        },
        
        'ai-studio': {
            title: "AI Studio",
            icon: "🤖",
            video: { url: "", duration: "4 мин", placeholder: true },
            buttons: [
                { name: "Текст", desc: "Генерация текстов: посты, поздравления" },
                { name: "Изображения", desc: "Создание картинок по описанию" },
                { name: "Голос", desc: "Озвучка текста — 15 голосов" }
            ],
            steps: [
                "Выберите тип: Текст / Изображение / Голос",
                "Введите описание (промпт)",
                "Нажмите 'Сгенерировать' и дождитесь результата"
            ],
            tips: [
                "💡 Чем подробнее промпт — тем лучше результат",
                "💡 Голос можно добавить в открытку"
            ]
        },
        
        surveys: {
            title: "Опросы",
            icon: "📊",
            video: { url: "", duration: "3 мин", placeholder: true },
            buttons: [
                { name: "Создать опрос", desc: "Новый опрос с нуля или из шаблона" },
                { name: "Результаты", desc: "Показывать после контакта" },
                { name: "Статистика", desc: "Ответы и конверсия" }
            ],
            steps: [
                "Создайте опрос (3-5 вопросов оптимально)",
                "Включите 'Результат после контакта'",
                "Отправьте ссылку в соцсети"
            ],
            tips: [
                "💡 Короткие опросы заполняют чаще",
                "💡 Опросы — отличный повод для касания"
            ]
        },
        
        contacts: {
            title: "Контакты",
            icon: "👥",
            video: { url: "", duration: "2 мин", placeholder: true },
            buttons: [
                { name: "Добавить", desc: "Новый контакт вручную" },
                { name: "Фильтры", desc: "Поиск по платформе, дате" },
                { name: "Заметки", desc: "Информация о контакте" }
            ],
            steps: [
                "Добавляйте контакты вручную или автоматически",
                "Ведите заметки о каждом человеке",
                "Сегментируйте по платформам"
            ],
            tips: [
                "💡 Заметки помогут персонализировать общение",
                "💡 Контакты из открыток добавляются автоматически"
            ]
        },
        
        crm: {
            title: "CRM / Воронка",
            icon: "🎯",
            video: { url: "", duration: "4 мин", placeholder: true },
            buttons: [
                { name: "Воронка", desc: "Этапы от контакта до партнёра" },
                { name: "Задачи", desc: "Запланировать действие" },
                { name: "Аналитика", desc: "Конверсия по этапам" }
            ],
            steps: [
                "Распределите контакты по этапам воронки",
                "Создайте задачи для каждого контакта",
                "Двигайте контакты по воронке"
            ],
            tips: [
                "💡 У каждого контакта должна быть задача",
                "💡 Анализируйте где 'застревают' контакты"
            ]
        },
        
        mailings: {
            title: "Рассылки",
            icon: "📧",
            video: { url: "", duration: "3 мин", placeholder: true },
            buttons: [
                { name: "Новая рассылка", desc: "Создать массовое сообщение" },
                { name: "Персонализация", desc: "Вставка {name} в текст" },
                { name: "История", desc: "Отправленные рассылки" }
            ],
            steps: [
                "Напишите текст с {name} для персонализации",
                "Выберите получателей",
                "Отправьте и отслеживайте ответы"
            ],
            tips: [
                "💡 Персонализация увеличивает ответы в 2 раза",
                "💡 Рассылка — информирование СВОИХ контактов"
            ]
        },
        
        globalstudio: {
            title: "GlobalStudio",
            icon: "🎬",
            video: { url: "", duration: "5 мин", placeholder: true },
            buttons: [
                { name: "Новый проект", desc: "Создать видео из картинок" },
                { name: "Медиа", desc: "Загрузить картинки и аудио" },
                { name: "Рендер", desc: "Собрать готовое видео" }
            ],
            steps: [
                "Загрузите 3-10 картинок",
                "Добавьте озвучку и музыку",
                "Нажмите 'Рендер' и скачайте видео"
            ],
            tips: [
                "💡 Оптимальная длина: 30-60 сек",
                "💡 Голос + музыка = профессиональное видео"
            ]
        },
        
        referrals: {
            title: "Рефералы",
            icon: "🌐",
            video: { url: "", duration: "3 мин", placeholder: true },
            buttons: [
                { name: "Моя ссылка", desc: "Реферальная ссылка" },
                { name: "Структура", desc: "Дерево партнёров" },
                { name: "Статистика", desc: "Активность и доход" }
            ],
            steps: [
                "Скопируйте реферальную ссылку",
                "Добавляйте её во все открытки и посты",
                "Помогайте партнёрам пройти программу"
            ],
            tips: [
                "💡 Качество важнее количества",
                "💡 Помогайте новичкам — это ускоряет рост"
            ]
        },
        
        dashboard: {
            title: "Панель управления",
            icon: "🏠",
            video: { url: "", duration: "2 мин", placeholder: true },
            buttons: [
                { name: "Статистика", desc: "Контакты, рефералы, доход" },
                { name: "Прогресс", desc: "21-дневная программа" },
                { name: "Уведомления", desc: "Новые события" }
            ],
            steps: [
                "Проверяйте статистику каждый день",
                "Выполняйте задания программы",
                "Делайте минимум 5 касаний в день"
            ],
            tips: [
                "💡 Начинайте день с проверки панели",
                "💡 Используйте все инструменты вместе"
            ]
        }
    };

    // ═══════════════════════════════════════════════════════════
    // ПУТЬ К АВАТАРУ
    // ═══════════════════════════════════════════════════════════
    
    const AVATAR_PATH = 'images/knowledge-avatar.png';

    // ═══════════════════════════════════════════════════════════
    // СОЗДАНИЕ UI
    // ═══════════════════════════════════════════════════════════
    
    function createKnowledgeBaseUI() {
        addStyles();
        createHelpButton();
        createModal();
        console.log('📚 Knowledge Base UI initialized with avatar');
    }
    
    function addStyles() {
        if (document.getElementById('kb-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'kb-styles';
        styles.textContent = `
            /* ═══════════════════════════════════════════════════════════
               КНОПКА С АВАТАРОМ
               ═══════════════════════════════════════════════════════════ */
            
            .kb-help-btn {
                position: fixed;
                bottom: 90px;
                right: 20px;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: #0f172a;
                border: 3px solid #f59e0b;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
                z-index: 999998;
                transition: all 0.3s ease;
                padding: 0;
                overflow: hidden;
            }
            
            .kb-help-btn img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
            }
            
            .kb-help-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 25px rgba(245, 158, 11, 0.6);
                border-color: #fbbf24;
            }
            
            /* Пульсация */
            .kb-help-btn::before {
                content: '';
                position: absolute;
                top: -4px;
                left: -4px;
                right: -4px;
                bottom: -4px;
                border: 2px solid #f59e0b;
                border-radius: 50%;
                animation: kb-pulse 2s ease-out infinite;
                opacity: 0;
            }
            
            @keyframes kb-pulse {
                0% { transform: scale(1); opacity: 0.5; }
                100% { transform: scale(1.3); opacity: 0; }
            }
            
            /* Мобильная адаптация */
            @media (max-width: 768px) {
                .kb-help-btn {
                    width: 48px;
                    height: 48px;
                    bottom: 80px;
                    right: 15px;
                    border-width: 2px;
                }
            }
            
            @media (max-width: 480px) {
                .kb-help-btn {
                    width: 44px;
                    height: 44px;
                    bottom: 75px;
                    right: 12px;
                }
            }
            
            /* ═══════════════════════════════════════════════════════════
               МОДАЛЬНОЕ ОКНО
               ═══════════════════════════════════════════════════════════ */
            
            .kb-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            
            .kb-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            
            .kb-modal {
                background: #1e293b;
                border-radius: 20px;
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                overflow: hidden;
                transform: scale(0.9) translateY(20px);
                transition: all 0.3s ease;
            }
            
            .kb-modal-overlay.active .kb-modal {
                transform: scale(1) translateY(0);
            }
            
            .kb-modal-header {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .kb-modal-title {
                display: flex;
                align-items: center;
                gap: 12px;
                color: white;
                font-size: 18px;
                font-weight: 600;
            }
            
            .kb-modal-title-icon { font-size: 24px; }
            
            .kb-modal-close {
                background: rgba(255,255,255,0.2);
                border: none;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                color: white;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .kb-modal-close:hover { background: rgba(255,255,255,0.3); }
            
            .kb-modal-content {
                padding: 20px;
                overflow-y: auto;
                max-height: calc(80vh - 80px);
            }
            
            /* Секция видео */
            .kb-video-section {
                background: #334155;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 16px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .kb-video-section:hover { background: #3f4f63; }
            
            .kb-video-icon {
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
            }
            
            .kb-video-info h4 {
                color: white;
                margin: 0 0 4px;
                font-size: 15px;
            }
            
            .kb-video-info p {
                color: #94a3b8;
                margin: 0;
                font-size: 13px;
            }
            
            .kb-video-placeholder { background: #475569 !important; }
            .kb-video-placeholder .kb-video-icon { background: #64748b !important; }
            
            /* Секции */
            .kb-section { margin-bottom: 20px; }
            
            .kb-section-title {
                color: #f59e0b;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 12px;
            }
            
            .kb-buttons-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .kb-button-item {
                background: #334155;
                border-radius: 10px;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .kb-button-name {
                color: white;
                font-weight: 500;
                font-size: 14px;
                min-width: 100px;
            }
            
            .kb-button-desc {
                color: #94a3b8;
                font-size: 13px;
            }
            
            /* Шаги */
            .kb-steps-list { counter-reset: step; }
            
            .kb-step-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 10px 0;
                border-bottom: 1px solid #334155;
            }
            
            .kb-step-item:last-child { border-bottom: none; }
            
            .kb-step-number {
                width: 26px;
                height: 26px;
                background: #6366f1;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 13px;
                font-weight: 600;
                flex-shrink: 0;
            }
            
            .kb-step-text {
                color: #e2e8f0;
                font-size: 14px;
                line-height: 1.5;
            }
            
            /* Подсказки */
            .kb-tips-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .kb-tip-item {
                color: #fbbf24;
                font-size: 13px;
                padding: 8px 12px;
                background: rgba(251, 191, 36, 0.1);
                border-radius: 8px;
            }
            
            /* Ссылка */
            .kb-full-link {
                display: block;
                text-align: center;
                padding: 14px;
                background: linear-gradient(135deg, #6366f1, #4f46e5);
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 500;
                margin-top: 16px;
            }
            
            .kb-full-link:hover { transform: translateY(-2px); }
            
            @media (max-width: 480px) {
                .kb-modal { width: 95%; max-height: 85vh; }
                .kb-modal-content { padding: 16px; }
                .kb-button-item { flex-direction: column; align-items: flex-start; gap: 4px; }
                .kb-button-name { min-width: auto; }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    function createHelpButton() {
        if (document.getElementById('kb-help-btn')) return;
        
        const btn = document.createElement('button');
        btn.id = 'kb-help-btn';
        btn.className = 'kb-help-btn';
        btn.title = 'База знаний';
        btn.innerHTML = `<img src="${AVATAR_PATH}" alt="База знаний" onerror="this.parentElement.innerHTML='📚'">`;
        btn.onclick = openModal;
        
        document.body.appendChild(btn);
    }
    
    function createModal() {
        if (document.getElementById('kb-modal-overlay')) return;
        
        const modal = document.createElement('div');
        modal.id = 'kb-modal-overlay';
        modal.className = 'kb-modal-overlay';
        modal.innerHTML = `<div class="kb-modal"></div>`;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
        
        document.body.appendChild(modal);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    }
    
    function detectCurrentModule() {
        const hash = window.location.hash.replace('#', '');
        const moduleMap = {
            'generator': 'generator', 'blog': 'blog', 'ai-studio': 'ai-studio',
            'ai': 'ai-studio', 'surveys': 'surveys', 'contacts': 'contacts',
            'crm': 'crm', 'mailings': 'mailings', 'globalstudio': 'globalstudio',
            'referrals': 'referrals'
        };
        return moduleMap[hash] || 'dashboard';
    }
    
    function generateContent(moduleKey) {
        const m = KnowledgeBase[moduleKey] || KnowledgeBase.dashboard;
        return `
            <div class="kb-video-section ${m.video.placeholder ? 'kb-video-placeholder' : ''}"
                 onclick="${m.video.url ? `window.open('${m.video.url}')` : `alert('Видео скоро будет!')`}">
                <div class="kb-video-icon">▶️</div>
                <div class="kb-video-info">
                    <h4>📹 Видео-инструкция</h4>
                    <p>${m.video.placeholder ? 'Скоро • ' : ''}${m.video.duration}</p>
                </div>
            </div>
            <div class="kb-section">
                <div class="kb-section-title">🔘 Кнопки и функции</div>
                <div class="kb-buttons-list">
                    ${m.buttons.map(b => `<div class="kb-button-item"><span class="kb-button-name">${b.name}</span><span class="kb-button-desc">${b.desc}</span></div>`).join('')}
                </div>
            </div>
            <div class="kb-section">
                <div class="kb-section-title">📋 Пошаговая инструкция</div>
                <div class="kb-steps-list">
                    ${m.steps.map((s, i) => `<div class="kb-step-item"><div class="kb-step-number">${i+1}</div><div class="kb-step-text">${s}</div></div>`).join('')}
                </div>
            </div>
            <div class="kb-section">
                <div class="kb-section-title">💡 Советы</div>
                <div class="kb-tips-list">
                    ${m.tips.map(t => `<div class="kb-tip-item">${t}</div>`).join('')}
                </div>
            </div>
            <a href="knowledge-base.html#${moduleKey}" class="kb-full-link">📖 Полная база знаний</a>
        `;
    }
    
    function openModal(moduleKey) {
        const key = typeof moduleKey === 'string' ? moduleKey : detectCurrentModule();
        const m = KnowledgeBase[key] || KnowledgeBase.dashboard;
        
        document.querySelector('#kb-modal-overlay .kb-modal').innerHTML = `
            <div class="kb-modal-header">
                <div class="kb-modal-title">
                    <span class="kb-modal-title-icon">${m.icon}</span>
                    <span>${m.title}</span>
                </div>
                <button class="kb-modal-close" onclick="KnowledgeBaseUI.close()">×</button>
            </div>
            <div class="kb-modal-content">${generateContent(key)}</div>
        `;
        
        document.getElementById('kb-modal-overlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeModal() {
        document.getElementById('kb-modal-overlay').classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // Инициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createKnowledgeBaseUI);
    } else {
        createKnowledgeBaseUI();
    }
    
    window.KnowledgeBaseUI = { open: openModal, close: closeModal, data: KnowledgeBase };
    console.log('📚 Knowledge Base loaded with avatar');
})();
