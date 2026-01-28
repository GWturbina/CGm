// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS CENTER v1.0 - Центр уведомлений CardGift
// ═══════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';
    
    console.log('🔔 Notifications Center v1.0 loading...');
    
    // ═══════════════════════════════════════════════════════════════════════
    // КОНФИГУРАЦИЯ
    // ═══════════════════════════════════════════════════════════════════════
    
    const CONFIG = {
        refreshInterval: 60000,      // Обновление каждую минуту
        maxNotifications: 50,        // Максимум уведомлений в списке
        animationDuration: 300       // Длительность анимаций (мс)
    };
    
    // Состояние модуля
    const state = {
        isOpen: false,
        activeTab: 'news',
        counts: {
            news: 0,
            messages: 0,
            notifications: 0
        },
        data: {
            news: [],
            messages: [],
            notifications: []
        },
        initialized: false
    };
    
    // ═══════════════════════════════════════════════════════════════════════
    // ИНИЦИАЛИЗАЦИЯ
    // ═══════════════════════════════════════════════════════════════════════
    
    async function init() {
        if (state.initialized) return;
        
        console.log('🔔 Initializing Notifications Center...');
        
        // Создаём UI
        createNotificationCenterUI();
        
        // Привязываем обработчики
        bindEventHandlers();
        
        // Загружаем данные
        await loadAllNotifications();
        
        // Обновляем бейдж
        updateBellBadge();
        
        // Запускаем периодическое обновление
        setInterval(async () => {
            await loadAllNotifications();
            updateBellBadge();
        }, CONFIG.refreshInterval);
        
        state.initialized = true;
        console.log('✅ Notifications Center initialized');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // СОЗДАНИЕ UI
    // ═══════════════════════════════════════════════════════════════════════
    
    function createNotificationCenterUI() {
        // Проверяем, не создан ли уже
        if (document.getElementById('notificationCenter')) return;
        
        // Находим существующую модалку новостей и заменяем её
        const existingModal = document.getElementById('newsModal');
        if (existingModal) {
            existingModal.id = 'newsModal_old';
            existingModal.style.display = 'none';
        }
        
        // Создаём новую модалку
        const centerHTML = `
            <div class="notification-center-overlay" id="notificationCenter" style="display: none;">
                <div class="notification-center-modal">
                    <!-- Шапка -->
                    <div class="nc-header">
                        <h2>🔔 Центр уведомлений</h2>
                        <button class="nc-close" onclick="NotificationCenter.close()">×</button>
                    </div>
                    
                    <!-- Вкладки -->
                    <div class="nc-tabs">
                        <button class="nc-tab active" data-tab="news" onclick="NotificationCenter.switchTab('news')">
                            <span class="nc-tab-icon">📰</span>
                            <span class="nc-tab-text">Новости</span>
                            <span class="nc-tab-badge" id="nc-badge-news">0</span>
                        </button>
                        <button class="nc-tab" data-tab="messages" onclick="NotificationCenter.switchTab('messages')">
                            <span class="nc-tab-icon">💬</span>
                            <span class="nc-tab-text">Сообщения</span>
                            <span class="nc-tab-badge" id="nc-badge-messages">0</span>
                        </button>
                        <button class="nc-tab" data-tab="notifications" onclick="NotificationCenter.switchTab('notifications')">
                            <span class="nc-tab-icon">🔔</span>
                            <span class="nc-tab-text">Системные</span>
                            <span class="nc-tab-badge" id="nc-badge-notifications">0</span>
                        </button>
                    </div>
                    
                    <!-- Контент вкладок -->
                    <div class="nc-content">
                        <!-- Новости -->
                        <div class="nc-tab-content active" id="nc-content-news">
                            <div class="nc-loading">Загрузка новостей...</div>
                        </div>
                        
                        <!-- Сообщения -->
                        <div class="nc-tab-content" id="nc-content-messages">
                            <div class="nc-loading">Загрузка сообщений...</div>
                        </div>
                        
                        <!-- Системные уведомления -->
                        <div class="nc-tab-content" id="nc-content-notifications">
                            <div class="nc-loading">Загрузка уведомлений...</div>
                        </div>
                    </div>
                    
                    <!-- Подвал -->
                    <div class="nc-footer">
                        <button class="nc-action-btn" onclick="NotificationCenter.markAllRead()">
                            ✓ Отметить всё прочитанным
                        </button>
                        <button class="nc-action-btn nc-action-secondary" onclick="NotificationCenter.goToMailings()">
                            📧 Все сообщения →
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем в DOM
        document.body.insertAdjacentHTML('beforeend', centerHTML);
        
        // Добавляем стили
        addStyles();
    }
    
    function addStyles() {
        if (document.getElementById('nc-styles')) return;
        
        const styles = `
            <style id="nc-styles">
                /* ═══════════════════════════════════════════════════════════ */
                /* NOTIFICATION CENTER STYLES                                  */
                /* ═══════════════════════════════════════════════════════════ */
                
                .notification-center-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(5px);
                    z-index: 10001;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    animation: ncFadeIn 0.3s ease;
                }
                
                @keyframes ncFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .notification-center-modal {
                    background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
                    border: 1px solid #FFD700;
                    border-radius: 20px;
                    width: 100%;
                    max-width: 550px;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 215, 0, 0.1);
                    animation: ncSlideIn 0.3s ease;
                }
                
                @keyframes ncSlideIn {
                    from { transform: translateY(-30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                /* Header */
                .nc-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 25px;
                    border-bottom: 1px solid #333;
                }
                
                .nc-header h2 {
                    color: #FFD700;
                    font-size: 20px;
                    margin: 0;
                }
                
                .nc-close {
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 28px;
                    cursor: pointer;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.3s;
                }
                
                .nc-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #FFD700;
                }
                
                /* Tabs */
                .nc-tabs {
                    display: flex;
                    border-bottom: 1px solid #333;
                    padding: 0 15px;
                }
                
                .nc-tab {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 15px 10px;
                    background: none;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    transition: all 0.3s;
                    border-bottom: 3px solid transparent;
                    margin-bottom: -1px;
                }
                
                .nc-tab:hover {
                    color: #FFD700;
                    background: rgba(255, 215, 0, 0.05);
                }
                
                .nc-tab.active {
                    color: #FFD700;
                    border-bottom-color: #FFD700;
                }
                
                .nc-tab-icon {
                    font-size: 18px;
                }
                
                .nc-tab-text {
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .nc-tab-badge {
                    background: #ff4444;
                    color: white;
                    font-size: 11px;
                    font-weight: bold;
                    min-width: 20px;
                    height: 20px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 6px;
                }
                
                .nc-tab-badge:empty,
                .nc-tab-badge[data-count="0"] {
                    display: none;
                }
                
                /* Content */
                .nc-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 15px;
                    min-height: 300px;
                    max-height: 400px;
                }
                
                .nc-tab-content {
                    display: none;
                }
                
                .nc-tab-content.active {
                    display: block;
                    animation: ncFadeIn 0.2s ease;
                }
                
                .nc-loading {
                    text-align: center;
                    padding: 40px;
                    color: #888;
                }
                
                .nc-empty {
                    text-align: center;
                    padding: 40px 20px;
                    color: #888;
                }
                
                .nc-empty-icon {
                    font-size: 50px;
                    margin-bottom: 15px;
                    opacity: 0.5;
                }
                
                .nc-empty-text {
                    font-size: 14px;
                }
                
                /* Notification Item */
                .nc-item {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid #333;
                    border-radius: 12px;
                    padding: 15px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .nc-item:hover {
                    border-color: #FFD700;
                    background: rgba(255, 215, 0, 0.05);
                    transform: translateX(5px);
                }
                
                .nc-item.unread {
                    border-left: 3px solid #FFD700;
                    background: rgba(255, 215, 0, 0.08);
                }
                
                .nc-item-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                
                .nc-item-title {
                    font-weight: 600;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .nc-item-icon {
                    font-size: 18px;
                }
                
                .nc-item-time {
                    font-size: 11px;
                    color: #666;
                }
                
                .nc-new-badge {
                    background: #FFD700;
                    color: #000;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-weight: bold;
                    margin-left: 8px;
                }
                
                .nc-item-body {
                    font-size: 13px;
                    color: #aaa;
                    line-height: 1.5;
                }
                
                .nc-item-body a {
                    color: #FFD700;
                    text-decoration: none;
                }
                
                .nc-item-body a:hover {
                    text-decoration: underline;
                }
                
                /* Footer */
                .nc-footer {
                    display: flex;
                    gap: 10px;
                    padding: 15px 20px;
                    border-top: 1px solid #333;
                }
                
                .nc-action-btn {
                    flex: 1;
                    padding: 12px 15px;
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                    border: none;
                    border-radius: 10px;
                    color: #000;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .nc-action-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
                }
                
                .nc-action-btn.nc-action-secondary {
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                }
                
                .nc-action-btn.nc-action-secondary:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
                
                /* Mobile */
                @media (max-width: 600px) {
                    .notification-center-modal {
                        max-height: 90vh;
                        border-radius: 15px;
                    }
                    
                    .nc-tab-text {
                        display: none;
                    }
                    
                    .nc-tab {
                        padding: 12px;
                    }
                    
                    .nc-tab-icon {
                        font-size: 22px;
                    }
                    
                    .nc-footer {
                        flex-direction: column;
                    }
                }
                
                /* Переопределяем колокольчик */
                .news-bell {
                    position: fixed;
                    top: 15px;
                    right: 150px;
                    z-index: 1001;
                    cursor: pointer;
                    padding: 10px;
                    border-radius: 50%;
                    background: rgba(26, 26, 46, 0.95);
                    border: 1px solid #444;
                    transition: all 0.3s ease;
                }
                
                .news-bell:hover {
                    background: rgba(255, 215, 0, 0.2);
                    border-color: #FFD700;
                    transform: scale(1.1);
                }
                
                .news-bell.has-notifications {
                    animation: bellShake 0.5s ease-in-out;
                }
                
                @keyframes bellShake {
                    0%, 100% { transform: rotate(0deg); }
                    20%, 60% { transform: rotate(15deg); }
                    40%, 80% { transform: rotate(-15deg); }
                }
                
                .bell-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: linear-gradient(135deg, #ff4444, #cc0000);
                    color: white;
                    font-size: 11px;
                    font-weight: bold;
                    min-width: 20px;
                    height: 20px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid #1a1a2e;
                    padding: 0 4px;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ОБРАБОТЧИКИ СОБЫТИЙ
    // ═══════════════════════════════════════════════════════════════════════
    
    function bindEventHandlers() {
        // Перехватываем клик на колокольчик
        const bell = document.getElementById('newsBell');
        if (bell) {
            bell.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                open();
            };
        }
        
        // Закрытие по клику на overlay
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('notification-center-overlay')) {
                close();
            }
        });
        
        // Закрытие по Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && state.isOpen) {
                close();
            }
        });
        
        // Переопределяем глобальные функции
        window.openNewsModal = open;
        window.closeNewsModal = close;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ЗАГРУЗКА ДАННЫХ
    // ═══════════════════════════════════════════════════════════════════════
    
    // Получить клиент Supabase
    function getSupabase() {
        return window.supabase || 
               (window.SupabaseClient && window.SupabaseClient.client) || 
               null;
    }
    
    async function loadAllNotifications() {
        const gwId = window.userGwId || window.displayId;
        const sb = getSupabase();
        
        if (!gwId || !sb) {
            console.log('🔔 No user or supabase, skipping notifications load');
            return;
        }
        
        await Promise.all([
            loadNews(),
            loadMessages(),
            loadSystemNotifications()
        ]);
        
        console.log('🔔 Notifications loaded:', state.counts);
    }
    
    // Загрузка новостей
    async function loadNews() {
        const sb = getSupabase();
        if (!sb) return;
        
        try {
            // Получаем активные новости
            const { data: news, error } = await sb
                .from('news')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(CONFIG.maxNotifications);
            
            if (error) throw error;
            
            // Получаем прочитанные из localStorage (как в оригинале)
            const readIds = JSON.parse(localStorage.getItem('readNewsIds') || '[]');
            
            state.data.news = (news || []).map(n => ({
                ...n,
                isRead: readIds.includes(n.id)
            }));
            
            state.counts.news = state.data.news.filter(n => !n.isRead).length;
            
            console.log('🔔 News loaded:', state.data.news.length, 'items,', state.counts.news, 'unread');
            
        } catch (e) {
            console.log('Error loading news:', e.message);
            state.data.news = [];
            state.counts.news = 0;
        }
    }
    
    // Загрузка сообщений от спонсора
    async function loadMessages() {
        const gwId = window.userGwId || window.displayId;
        const sb = getSupabase();
        if (!sb) return;
        
        try {
            const { data: messages, error } = await sb
                .from('internal_messages')
                .select('*')
                .eq('to_gw_id', gwId)
                .order('created_at', { ascending: false })
                .limit(CONFIG.maxNotifications);
            
            if (error) throw error;
            
            state.data.messages = messages || [];
            state.counts.messages = state.data.messages.filter(m => !m.is_read).length;
            
        } catch (e) {
            console.log('Error loading messages:', e.message);
            state.data.messages = [];
            state.counts.messages = 0;
        }
    }
    
    // Загрузка системных уведомлений
    async function loadSystemNotifications() {
        const gwId = window.userGwId || window.displayId;
        const sb = getSupabase();
        if (!sb) return;
        
        try {
            // Пробуем загрузить из таблицы notifications (если есть)
            const { data: notifications, error } = await sb
                .from('notifications')
                .select('*')
                .eq('user_gw_id', gwId)
                .order('created_at', { ascending: false })
                .limit(CONFIG.maxNotifications);
            
            if (error) {
                // Таблица может не существовать - это нормально
                console.log('Notifications table may not exist yet');
                state.data.notifications = [];
                state.counts.notifications = 0;
                return;
            }
            
            state.data.notifications = notifications || [];
            state.counts.notifications = state.data.notifications.filter(n => !n.is_read).length;
            
        } catch (e) {
            console.log('Error loading notifications:', e.message);
            state.data.notifications = [];
            state.counts.notifications = 0;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // РЕНДЕРИНГ
    // ═══════════════════════════════════════════════════════════════════════
    
    function renderTab(tabName) {
        const container = document.getElementById(`nc-content-${tabName}`);
        if (!container) return;
        
        const data = state.data[tabName] || [];
        
        if (data.length === 0) {
            container.innerHTML = renderEmpty(tabName);
            return;
        }
        
        switch (tabName) {
            case 'news':
                container.innerHTML = data.map(renderNewsItem).join('');
                break;
            case 'messages':
                container.innerHTML = data.map(renderMessageItem).join('');
                break;
            case 'notifications':
                container.innerHTML = data.map(renderNotificationItem).join('');
                break;
        }
    }
    
    function renderEmpty(tabName) {
        const emptyTexts = {
            news: { icon: '📰', text: 'Нет новых новостей' },
            messages: { icon: '💬', text: 'Нет новых сообщений' },
            notifications: { icon: '🔔', text: 'Нет уведомлений' }
        };
        
        const { icon, text } = emptyTexts[tabName];
        
        return `
            <div class="nc-empty">
                <div class="nc-empty-icon">${icon}</div>
                <div class="nc-empty-text">${text}</div>
            </div>
        `;
    }
    
    function renderNewsItem(news) {
        const date = formatDate(news.created_at);
        const isUnread = !news.isRead;
        
        // Иконки по типу новости
        const typeIcons = { 
            'info': 'ℹ️', 
            'update': '🔄', 
            'promo': '🎁', 
            'warning': '⚠️', 
            'urgent': '🚨',
            'default': '📰'
        };
        const icon = typeIcons[news.type] || typeIcons.default;
        
        return `
            <div class="nc-item ${isUnread ? 'unread' : ''}" onclick="NotificationCenter.markNewsRead('${news.id}')">
                <div class="nc-item-header">
                    <div class="nc-item-title">
                        <span class="nc-item-icon">${icon}</span>
                        ${escapeHtml(news.title || 'Новость')}
                        ${isUnread ? '<span class="nc-new-badge">NEW</span>' : ''}
                    </div>
                    <div class="nc-item-time">${date}</div>
                </div>
                <div class="nc-item-body">
                    ${escapeHtml(news.content || '')}
                </div>
            </div>
        `;
    }
    
    // Функция экранирования HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function renderMessageItem(msg) {
        const date = formatDate(msg.created_at);
        const isUnread = !msg.is_read;
        const senderIcon = msg.from_messenger === 'sponsor' ? '👑' : '💬';
        const senderName = msg.from_name || msg.from_gw_id || 'Спонсор';
        
        return `
            <div class="nc-item ${isUnread ? 'unread' : ''}" onclick="NotificationCenter.markMessageRead('${msg.id}')">
                <div class="nc-item-header">
                    <div class="nc-item-title">
                        <span class="nc-item-icon">${senderIcon}</span>
                        ${senderName}
                    </div>
                    <div class="nc-item-time">${date}</div>
                </div>
                <div class="nc-item-body">
                    ${msg.message || ''}
                </div>
            </div>
        `;
    }
    
    function renderNotificationItem(notif) {
        const date = formatDate(notif.created_at);
        const isUnread = !notif.is_read;
        
        const icons = {
            'referral': '👤',
            'purchase': '💰',
            'level_up': '⬆️',
            'system': '⚙️',
            'default': '🔔'
        };
        
        const icon = icons[notif.type] || icons.default;
        
        return `
            <div class="nc-item ${isUnread ? 'unread' : ''}" onclick="NotificationCenter.markNotificationRead('${notif.id}')">
                <div class="nc-item-header">
                    <div class="nc-item-title">
                        <span class="nc-item-icon">${icon}</span>
                        ${notif.title || 'Уведомление'}
                    </div>
                    <div class="nc-item-time">${date}</div>
                </div>
                <div class="nc-item-body">
                    ${notif.message || ''}
                </div>
            </div>
        `;
    }
    
    function formatDate(dateStr) {
        if (!dateStr) return '';
        
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        
        // Меньше минуты
        if (diff < 60000) return 'Только что';
        
        // Меньше часа
        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return `${mins} мин. назад`;
        }
        
        // Меньше суток
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} ч. назад`;
        }
        
        // Меньше недели
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days} дн. назад`;
        }
        
        // Больше недели - показываем дату
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ОБНОВЛЕНИЕ БЕЙДЖА
    // ═══════════════════════════════════════════════════════════════════════
    
    function updateBellBadge() {
        const totalUnread = state.counts.news + state.counts.messages + state.counts.notifications;
        
        const badge = document.getElementById('newsBadge');
        const bell = document.getElementById('newsBell');
        
        if (badge) {
            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
        
        if (bell) {
            if (totalUnread > 0) {
                bell.classList.add('has-notifications');
            } else {
                bell.classList.remove('has-notifications');
            }
        }
        
        // Обновляем бейджи на вкладках
        updateTabBadges();
    }
    
    function updateTabBadges() {
        const badgeNews = document.getElementById('nc-badge-news');
        const badgeMessages = document.getElementById('nc-badge-messages');
        const badgeNotifications = document.getElementById('nc-badge-notifications');
        
        if (badgeNews) {
            badgeNews.textContent = state.counts.news || '';
            badgeNews.dataset.count = state.counts.news;
        }
        
        if (badgeMessages) {
            badgeMessages.textContent = state.counts.messages || '';
            badgeMessages.dataset.count = state.counts.messages;
        }
        
        if (badgeNotifications) {
            badgeNotifications.textContent = state.counts.notifications || '';
            badgeNotifications.dataset.count = state.counts.notifications;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ПУБЛИЧНЫЕ МЕТОДЫ
    // ═══════════════════════════════════════════════════════════════════════
    
    function open() {
        const center = document.getElementById('notificationCenter');
        if (!center) {
            init();
            return setTimeout(open, 100);
        }
        
        center.style.display = 'flex';
        state.isOpen = true;
        
        // Рендерим активную вкладку
        renderTab(state.activeTab);
        
        console.log('🔔 Notification Center opened');
    }
    
    function close() {
        const center = document.getElementById('notificationCenter');
        if (center) {
            center.style.display = 'none';
        }
        state.isOpen = false;
        
        console.log('🔔 Notification Center closed');
    }
    
    function switchTab(tabName) {
        state.activeTab = tabName;
        
        // Обновляем активную вкладку
        document.querySelectorAll('.nc-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.nc-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `nc-content-${tabName}`);
        });
        
        // Рендерим контент
        renderTab(tabName);
    }
    
    async function markAllRead() {
        const gwId = window.userGwId || window.displayId;
        if (!gwId) return;
        
        try {
            // Отмечаем новости
            const newsIds = state.data.news.filter(n => !n.isRead).map(n => n.id);
            if (newsIds.length > 0) {
                for (const newsId of newsIds) {
                    await supabase
                        .from('news_read_status')
                        .upsert({
                            user_gw_id: gwId,
                            news_id: newsId,
                            read_at: new Date().toISOString()
                        }, { onConflict: 'user_gw_id,news_id' });
                }
            }
            
            // Отмечаем сообщения
            const msgIds = state.data.messages.filter(m => !m.is_read).map(m => m.id);
            if (msgIds.length > 0) {
                await supabase
                    .from('internal_messages')
                    .update({ is_read: true })
                    .in('id', msgIds);
            }
            
            // Отмечаем уведомления
            const notifIds = state.data.notifications.filter(n => !n.is_read).map(n => n.id);
            if (notifIds.length > 0) {
                await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .in('id', notifIds);
            }
            
            // Перезагружаем данные
            await loadAllNotifications();
            updateBellBadge();
            renderTab(state.activeTab);
            
            showToast('Все уведомления отмечены как прочитанные', 'success');
            
        } catch (e) {
            console.error('Error marking all as read:', e);
            showToast('Ошибка при обновлении', 'error');
        }
    }
    
    async function markNewsRead(newsId) {
        // Сохраняем в localStorage (как в оригинале)
        const readIds = JSON.parse(localStorage.getItem('readNewsIds') || '[]');
        if (!readIds.includes(newsId)) {
            readIds.push(newsId);
            localStorage.setItem('readNewsIds', JSON.stringify(readIds));
        }
        
        // Обновляем локальное состояние
        const news = state.data.news.find(n => n.id === newsId);
        if (news && !news.isRead) {
            news.isRead = true;
            state.counts.news = Math.max(0, state.counts.news - 1);
        }
        
        updateBellBadge();
        renderTab('news');
    }
    
    async function markMessageRead(msgId) {
        try {
            await supabase
                .from('internal_messages')
                .update({ is_read: true })
                .eq('id', msgId);
            
            // Обновляем локальное состояние
            const msg = state.data.messages.find(m => m.id === msgId);
            if (msg && !msg.is_read) {
                msg.is_read = true;
                state.counts.messages = Math.max(0, state.counts.messages - 1);
            }
            
            updateBellBadge();
            renderTab('messages');
            
        } catch (e) {
            console.error('Error marking message as read:', e);
        }
    }
    
    async function markNotificationRead(notifId) {
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notifId);
            
            // Обновляем локальное состояние
            const notif = state.data.notifications.find(n => n.id === notifId);
            if (notif && !notif.is_read) {
                notif.is_read = true;
                state.counts.notifications = Math.max(0, state.counts.notifications - 1);
            }
            
            updateBellBadge();
            renderTab('notifications');
            
        } catch (e) {
            console.error('Error marking notification as read:', e);
        }
    }
    
    function goToMailings() {
        close();
        
        // Переходим в раздел Рассылки
        if (typeof showSection === 'function') {
            showSection('mailings');
        } else {
            window.location.hash = '#mailings';
        }
    }
    
    // Вспомогательная функция для тостов
    function showToast(message, type) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log(`Toast [${type}]: ${message}`);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ЭКСПОРТ
    // ═══════════════════════════════════════════════════════════════════════
    
    window.NotificationCenter = {
        init,
        open,
        close,
        switchTab,
        markAllRead,
        markNewsRead,
        markMessageRead,
        markNotificationRead,
        goToMailings,
        refresh: loadAllNotifications
    };
    
    // Автоинициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(init, 1000);
        });
    } else {
        setTimeout(init, 1000);
    }
    
    console.log('✅ Notifications Center v1.0 loaded');
    
})();
