/* =====================================================
   KNOWLEDGE BASE - БАЗА ЗНАНИЙ v1.0
   
   Кнопка "?" на каждой странице + модальное окно
   с ссылками на видео/текст/инструкции
   ===================================================== */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    // ДАННЫЕ БАЗЫ ЗНАНИЙ ПО МОДУЛЯМ
    // ═══════════════════════════════════════════════════════════
    
    const KnowledgeBase = {
        
        // Генератор открыток
        generator: {
            title: "Генератор открыток",
            icon: "🎁",
            video: {
                url: "", // Заполнить когда будет видео
                duration: "3 мин",
                placeholder: true
            },
            buttons: [
                { name: "Выбрать шаблон", desc: "Готовые дизайны открыток на все случаи" },
                { name: "Загрузить фон", desc: "Добавить своё изображение или AI-картинку" },
                { name: "Добавить текст", desc: "Написать поздравление или использовать AI" },
                { name: "Добавить музыку", desc: "Выбрать фоновую музыку из библиотеки" },
                { name: "Настроить popup", desc: "Включить сбор контактов при просмотре" },
                { name: "Сохранить", desc: "Сохранить открытку как шаблон" },
                { name: "Отправить", desc: "Получить ссылку для отправки" }
            ],
            steps: [
                "Выберите шаблон или загрузите свой фон",
                "Добавьте текст поздравления",
                "Выберите музыку (опционально)",
                "Включите popup для сбора контактов",
                "Нажмите 'Сохранить' и 'Отправить'",
                "Скопируйте ссылку и отправьте получателю"
            ],
            tips: [
                "💡 Используйте AI Studio для генерации уникальных текстов",
                "💡 Popup с подарком увеличивает конверсию в 3 раза",
                "💡 Персонализируйте открытку — добавьте имя получателя"
            ]
        },
        
        // Блог
        blog: {
            title: "Мой блог",
            icon: "📝",
            video: {
                url: "",
                duration: "2 мин",
                placeholder: true
            },
            buttons: [
                { name: "Настройки профиля", desc: "Имя, описание, аватар блога" },
                { name: "Новый пост", desc: "Написать и опубликовать статью" },
                { name: "Редактор", desc: "Форматирование текста, добавление картинок" },
                { name: "Категории", desc: "Организация постов по темам" },
                { name: "Статистика", desc: "Просмотры, подписчики, популярные посты" }
            ],
            steps: [
                "Заполните профиль: имя, описание, аватар",
                "Нажмите 'Новый пост'",
                "Напишите заголовок и текст",
                "Добавьте картинку (обязательно!)",
                "Нажмите 'Опубликовать'",
                "Поделитесь ссылкой в соцсетях"
            ],
            tips: [
                "💡 Пишите регулярно — минимум 1 пост в день",
                "💡 Используйте AI для генерации идей",
                "💡 Картинки увеличивают вовлечённость в 2 раза"
            ]
        },
        
        // AI Studio
        'ai-studio': {
            title: "AI Studio",
            icon: "🤖",
            video: {
                url: "",
                duration: "4 мин",
                placeholder: true
            },
            buttons: [
                { name: "Текст", desc: "Генерация текстов: посты, поздравления, сообщения" },
                { name: "Изображения", desc: "Создание уникальных картинок по описанию" },
                { name: "Голос", desc: "Озвучка текста — 15 профессиональных голосов" },
                { name: "История", desc: "Все ваши генерации сохраняются здесь" },
                { name: "Кредиты", desc: "Баланс и пополнение кредитов AI" }
            ],
            steps: [
                "Выберите тип контента: Текст / Изображение / Голос",
                "Введите описание (промпт)",
                "Нажмите 'Сгенерировать'",
                "Дождитесь результата (5-30 сек)",
                "Скачайте или используйте в других модулях"
            ],
            tips: [
                "💡 Чем подробнее промпт — тем лучше результат",
                "💡 Для изображений указывайте стиль: реализм, акварель, минимализм",
                "💡 Голос можно добавить прямо в открытку"
            ]
        },
        
        // Опросы
        surveys: {
            title: "Опросы",
            icon: "📊",
            video: {
                url: "",
                duration: "3 мин",
                placeholder: true
            },
            buttons: [
                { name: "Создать опрос", desc: "Новый опрос с нуля или из шаблона" },
                { name: "Шаблоны", desc: "Готовые опросы для разных целей" },
                { name: "Вопросы", desc: "Добавить/редактировать вопросы" },
                { name: "Результаты", desc: "Показывать после заполнения контакта" },
                { name: "Статистика", desc: "Ответы, конверсия, аналитика" }
            ],
            steps: [
                "Нажмите 'Создать опрос' или выберите шаблон",
                "Добавьте вопросы (3-7 оптимально)",
                "Настройте показ результатов",
                "Включите сбор контактов",
                "Сохраните и получите ссылку",
                "Отправьте опрос в соцсети и мессенджеры"
            ],
            tips: [
                "💡 Короткие опросы (3-5 вопросов) заполняют чаще",
                "💡 Интригующие результаты мотивируют оставить контакт",
                "💡 Опросы — отличный повод для первого касания"
            ]
        },
        
        // Контакты
        contacts: {
            title: "Контакты",
            icon: "👥",
            video: {
                url: "",
                duration: "2 мин",
                placeholder: true
            },
            buttons: [
                { name: "Добавить контакт", desc: "Новый контакт вручную" },
                { name: "Импорт", desc: "Загрузить из файла или телефона" },
                { name: "Фильтры", desc: "Поиск по платформе, статусу, дате" },
                { name: "Заметки", desc: "Добавить информацию о контакте" },
                { name: "Действия", desc: "Написать, позвонить, отправить открытку" }
            ],
            steps: [
                "Нажмите 'Добавить контакт'",
                "Заполните имя и контактные данные",
                "Выберите платформу (WhatsApp, Telegram...)",
                "Добавьте заметку — что знаете о человеке",
                "Сохраните контакт",
                "Используйте для касаний и рассылок"
            ],
            tips: [
                "💡 Добавляйте заметки — это поможет персонализировать общение",
                "💡 Контакты из открыток и опросов добавляются автоматически",
                "💡 Сегментируйте по платформам для удобства"
            ]
        },
        
        // CRM
        crm: {
            title: "CRM / Воронка",
            icon: "🎯",
            video: {
                url: "",
                duration: "4 мин",
                placeholder: true
            },
            buttons: [
                { name: "Этапы воронки", desc: "Новый → В диалоге → Интерес → Презентация → Партнёр" },
                { name: "Перемещение", desc: "Перетащите контакт на нужный этап" },
                { name: "Задачи", desc: "Запланировать следующее действие" },
                { name: "История", desc: "Все взаимодействия с контактом" },
                { name: "Аналитика", desc: "Конверсия между этапами" }
            ],
            steps: [
                "Перенесите контакты в CRM",
                "Распределите по текущим этапам",
                "Создайте задачи для каждого контакта",
                "Выполняйте задачи и двигайте по воронке",
                "Анализируйте конверсию и улучшайте"
            ],
            tips: [
                "💡 Каждый контакт должен иметь задачу",
                "💡 Не держите контакты на одном этапе больше недели",
                "💡 Анализируйте где 'застревают' — там проблема"
            ]
        },
        
        // Рассылки
        mailings: {
            title: "Рассылки",
            icon: "📧",
            video: {
                url: "",
                duration: "3 мин",
                placeholder: true
            },
            buttons: [
                { name: "Новая рассылка", desc: "Создать и отправить массовое сообщение" },
                { name: "Шаблоны", desc: "Сохранённые тексты для быстрой отправки" },
                { name: "Выбор получателей", desc: "Фильтр по платформе, тегам, статусу" },
                { name: "Персонализация", desc: "Вставка имени {name} в текст" },
                { name: "История", desc: "Отправленные рассылки и статистика" }
            ],
            steps: [
                "Нажмите 'Новая рассылка'",
                "Напишите текст (используйте {name} для имени)",
                "Выберите получателей",
                "Проверьте превью",
                "Нажмите 'Отправить'",
                "Отслеживайте ответы"
            ],
            tips: [
                "💡 Персонализация увеличивает ответы в 2 раза",
                "💡 Не отправляйте чаще 2-3 раз в неделю",
                "💡 Рассылка ≠ спам — это информирование СВОИХ контактов"
            ]
        },
        
        // GlobalStudio
        globalstudio: {
            title: "GlobalStudio (Видео)",
            icon: "🎬",
            video: {
                url: "",
                duration: "5 мин",
                placeholder: true
            },
            buttons: [
                { name: "Новый проект", desc: "Создать видео из картинок и аудио" },
                { name: "Медиа", desc: "Загрузить картинки, фото, AI-изображения" },
                { name: "Аудио", desc: "Добавить голос из AI Studio или загрузить" },
                { name: "Музыка", desc: "Выбрать фоновую музыку из библиотеки" },
                { name: "Субтитры", desc: "Добавить текст на видео" },
                { name: "Рендер", desc: "Собрать и скачать готовое видео" }
            ],
            steps: [
                "Создайте новый проект",
                "Загрузите 3-10 картинок",
                "Добавьте аудио-дорожку (голос)",
                "Выберите фоновую музыку",
                "Настройте длительность слайдов",
                "Нажмите 'Рендер' и дождитесь готовности",
                "Скачайте видео и загрузите на YouTube/TikTok"
            ],
            tips: [
                "💡 Оптимальная длина: 30-60 сек для Shorts/Reels",
                "💡 Используйте AI-картинки для уникальности",
                "💡 Голос + музыка = профессиональное видео"
            ]
        },
        
        // Рефералы
        referrals: {
            title: "Команда / Рефералы",
            icon: "👥",
            video: {
                url: "",
                duration: "3 мин",
                placeholder: true
            },
            buttons: [
                { name: "Моя ссылка", desc: "Уникальная ссылка для приглашения" },
                { name: "Структура", desc: "Дерево партнёров по уровням" },
                { name: "Статистика", desc: "Количество, активность, доход" },
                { name: "Уведомления", desc: "Новые регистрации и активации" }
            ],
            steps: [
                "Скопируйте свою реферальную ссылку",
                "Отправляйте её вместе с открытками и постами",
                "Когда человек регистрируется — он в вашей команде",
                "Помогите ему пройти 21-дневную программу",
                "Получайте бонусы от его активности"
            ],
            tips: [
                "💡 Добавляйте ссылку во ВСЕ открытки и посты",
                "💡 Помогайте новичкам — это ускоряет их и ваш рост",
                "💡 Качество важнее количества — лучше 5 активных, чем 50 спящих"
            ]
        },
        
        // Dashboard (главная)
        dashboard: {
            title: "Панель управления",
            icon: "🏠",
            video: {
                url: "",
                duration: "2 мин",
                placeholder: true
            },
            buttons: [
                { name: "Статистика", desc: "Контакты, рефералы, доход" },
                { name: "Быстрые действия", desc: "Создать открытку, пост, опрос" },
                { name: "Уведомления", desc: "Новые события и напоминания" },
                { name: "Прогресс", desc: "21-дневная программа" }
            ],
            steps: [
                "Проверяйте статистику каждый день",
                "Выполняйте задания 21-дневной программы",
                "Реагируйте на уведомления",
                "Делайте минимум 5 касаний в день"
            ],
            tips: [
                "💡 Начинайте день с проверки панели",
                "💡 Ставьте цели на день и отслеживайте прогресс",
                "💡 Используйте все инструменты — они работают вместе"
            ]
        }
    };

    // ═══════════════════════════════════════════════════════════
    // СОЗДАНИЕ UI
    // ═══════════════════════════════════════════════════════════
    
    function createKnowledgeBaseUI() {
        // Добавляем стили
        addStyles();
        
        // Создаём кнопку
        createHelpButton();
        
        // Создаём модальное окно
        createModal();
        
        console.log('📚 Knowledge Base UI initialized');
    }
    
    function addStyles() {
        if (document.getElementById('kb-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'kb-styles';
        styles.textContent = `
            /* Кнопка помощи */
            .kb-help-btn {
                position: fixed;
                bottom: 100px;
                right: 24px;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: linear-gradient(135deg, #f59e0b, #d97706);
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                color: white;
                z-index: 999998;
                transition: all 0.3s ease;
            }
            
            .kb-help-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
            }
            
            /* Модальное окно */
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
            
            /* Заголовок */
            .kb-modal-header {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                padding: 20px 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .kb-modal-title {
                display: flex;
                align-items: center;
                gap: 12px;
                color: white;
                font-size: 20px;
                font-weight: 600;
            }
            
            .kb-modal-title-icon {
                font-size: 28px;
            }
            
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
                transition: background 0.2s;
            }
            
            .kb-modal-close:hover {
                background: rgba(255,255,255,0.3);
            }
            
            /* Контент */
            .kb-modal-content {
                padding: 20px 24px;
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
            
            .kb-video-section:hover {
                background: #3f4f63;
            }
            
            .kb-video-icon {
                width: 56px;
                height: 56px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
            }
            
            .kb-video-info h4 {
                color: white;
                margin: 0 0 4px;
                font-size: 16px;
            }
            
            .kb-video-info p {
                color: #94a3b8;
                margin: 0;
                font-size: 13px;
            }
            
            .kb-video-placeholder {
                background: #475569 !important;
            }
            
            .kb-video-placeholder .kb-video-icon {
                background: #64748b !important;
            }
            
            /* Секции */
            .kb-section {
                margin-bottom: 20px;
            }
            
            .kb-section-title {
                color: #f59e0b;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            /* Кнопки */
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
                min-width: 120px;
            }
            
            .kb-button-desc {
                color: #94a3b8;
                font-size: 13px;
            }
            
            /* Шаги */
            .kb-steps-list {
                counter-reset: step;
            }
            
            .kb-step-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 10px 0;
                border-bottom: 1px solid #334155;
            }
            
            .kb-step-item:last-child {
                border-bottom: none;
            }
            
            .kb-step-number {
                width: 28px;
                height: 28px;
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
            
            /* Ссылка на полную базу */
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
                transition: transform 0.2s;
            }
            
            .kb-full-link:hover {
                transform: translateY(-2px);
            }
            
            /* Мобильная адаптация */
            @media (max-width: 480px) {
                .kb-help-btn {
                    bottom: 90px;
                    right: 16px;
                    width: 44px;
                    height: 44px;
                }
                
                .kb-modal {
                    width: 95%;
                    max-height: 85vh;
                }
                
                .kb-modal-content {
                    padding: 16px;
                }
                
                .kb-button-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 4px;
                }
                
                .kb-button-name {
                    min-width: auto;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    function createHelpButton() {
        if (document.getElementById('kb-help-btn')) return;
        
        const btn = document.createElement('button');
        btn.id = 'kb-help-btn';
        btn.className = 'kb-help-btn';
        btn.innerHTML = '❓';
        btn.title = 'Как пользоваться';
        btn.onclick = openModal;
        
        document.body.appendChild(btn);
    }
    
    function createModal() {
        if (document.getElementById('kb-modal-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'kb-modal-overlay';
        overlay.className = 'kb-modal-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) closeModal();
        };
        
        overlay.innerHTML = `
            <div class="kb-modal">
                <div class="kb-modal-header">
                    <div class="kb-modal-title">
                        <span class="kb-modal-title-icon">📚</span>
                        <span id="kb-modal-title-text">База знаний</span>
                    </div>
                    <button class="kb-modal-close" onclick="KnowledgeBaseUI.close()">×</button>
                </div>
                <div class="kb-modal-content" id="kb-modal-content">
                    <!-- Контент генерируется динамически -->
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }
    
    // ═══════════════════════════════════════════════════════════
    // ОПРЕДЕЛЕНИЕ ТЕКУЩЕГО МОДУЛЯ
    // ═══════════════════════════════════════════════════════════
    
    function detectCurrentModule() {
        const hash = window.location.hash.replace('#', '');
        const path = window.location.pathname;
        
        // Проверяем hash
        if (hash) {
            const moduleMap = {
                'generator': 'generator',
                'blog': 'blog',
                'ai-studio': 'ai-studio',
                'ai': 'ai-studio',
                'surveys': 'surveys',
                'contacts': 'contacts',
                'crm': 'crm',
                'mailings': 'mailings',
                'globalstudio': 'globalstudio',
                'video': 'globalstudio',
                'referrals': 'referrals',
                'team': 'referrals'
            };
            
            if (moduleMap[hash]) {
                return moduleMap[hash];
            }
        }
        
        // Проверяем путь
        if (path.includes('ai-studio')) return 'ai-studio';
        if (path.includes('blog')) return 'blog';
        if (path.includes('generator')) return 'generator';
        if (path.includes('globalstudio')) return 'globalstudio';
        
        // Проверяем активную секцию в DOM
        const activeNav = document.querySelector('.nav-link.active, .sidebar-link.active, [data-section].active');
        if (activeNav) {
            const section = activeNav.dataset.section || activeNav.getAttribute('href')?.replace('#', '');
            if (section && KnowledgeBase[section]) {
                return section;
            }
        }
        
        // По умолчанию
        return 'dashboard';
    }
    
    // ═══════════════════════════════════════════════════════════
    // ГЕНЕРАЦИЯ КОНТЕНТА
    // ═══════════════════════════════════════════════════════════
    
    function generateContent(moduleKey) {
        const module = KnowledgeBase[moduleKey] || KnowledgeBase.dashboard;
        
        return `
            <!-- Видео -->
            <div class="kb-video-section ${module.video.placeholder ? 'kb-video-placeholder' : ''}"
                 onclick="${module.video.url ? `window.open('${module.video.url}', '_blank')` : `alert('Видео скоро будет!')`}">
                <div class="kb-video-icon">▶️</div>
                <div class="kb-video-info">
                    <h4>📹 Видео-инструкция</h4>
                    <p>${module.video.placeholder ? 'Скоро будет • ' : ''}${module.video.duration}</p>
                </div>
            </div>
            
            <!-- Кнопки -->
            <div class="kb-section">
                <div class="kb-section-title">🔘 Описание кнопок</div>
                <div class="kb-buttons-list">
                    ${module.buttons.map(btn => `
                        <div class="kb-button-item">
                            <span class="kb-button-name">${btn.name}</span>
                            <span class="kb-button-desc">${btn.desc}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Пошаговая инструкция -->
            <div class="kb-section">
                <div class="kb-section-title">📋 Пошаговая инструкция</div>
                <div class="kb-steps-list">
                    ${module.steps.map((step, i) => `
                        <div class="kb-step-item">
                            <div class="kb-step-number">${i + 1}</div>
                            <div class="kb-step-text">${step}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Подсказки -->
            <div class="kb-section">
                <div class="kb-section-title">💡 Полезные советы</div>
                <div class="kb-tips-list">
                    ${module.tips.map(tip => `
                        <div class="kb-tip-item">${tip}</div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Ссылка на полную базу знаний -->
            <a href="knowledge-base.html#${moduleKey}" class="kb-full-link">
                📖 Открыть полную базу знаний
            </a>
        `;
    }
    
    // ═══════════════════════════════════════════════════════════
    // ОТКРЫТИЕ/ЗАКРЫТИЕ
    // ═══════════════════════════════════════════════════════════
    
    function openModal(moduleKey) {
        const key = moduleKey || detectCurrentModule();
        const module = KnowledgeBase[key] || KnowledgeBase.dashboard;
        
        // Обновляем заголовок
        document.getElementById('kb-modal-title-text').innerHTML = 
            `${module.icon} ${module.title}`;
        
        // Генерируем контент
        document.getElementById('kb-modal-content').innerHTML = generateContent(key);
        
        // Показываем
        document.getElementById('kb-modal-overlay').classList.add('active');
        
        // Блокируем скролл body
        document.body.style.overflow = 'hidden';
    }
    
    function closeModal() {
        document.getElementById('kb-modal-overlay').classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // ═══════════════════════════════════════════════════════════
    // ИНИЦИАЛИЗАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    // Запуск при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createKnowledgeBaseUI);
    } else {
        createKnowledgeBaseUI();
    }
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
    
    // Глобальный API
    window.KnowledgeBaseUI = {
        open: openModal,
        close: closeModal,
        data: KnowledgeBase
    };
    
    console.log('📚 Knowledge Base module loaded');
    
})();
