// ═══════════════════════════════════════════════════════════════════════════
// CARDGIFT TELEGRAM BOT v1.0 - Единый бот-напоминалка
// ═══════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';
    
    console.log('🤖 CardGift Bot v1.0 loading...');
    
    // ═══════════════════════════════════════════════════════════════════════
    // КОНФИГУРАЦИЯ
    // ═══════════════════════════════════════════════════════════════════════
    
    const CONFIG = {
        // Имя бота CardGift (замени на реальное после создания)
        BOT_USERNAME: 'CardGift_Notify_Bot',
        BOT_NAME: 'CardGift Уведомления',
        
        // URL платформы
        PLATFORM_URL: 'https://cgm-brown.vercel.app',
        
        // Таблица подписчиков единого бота
        SUBSCRIBERS_TABLE: 'cardgift_bot_subscribers'
    };
    
    // Состояние
    const state = {
        isConnected: false,
        telegramId: null,
        telegramUsername: null,
        initialized: false
    };
    
    // ═══════════════════════════════════════════════════════════════════════
    // УТИЛИТЫ
    // ═══════════════════════════════════════════════════════════════════════
    
    function getSupabase() {
        if (window.SupabaseClient && window.SupabaseClient.client) {
            return window.SupabaseClient.client;
        }
        return null;
    }
    
    function getUserGwId() {
        return window.userGwId || 
               window.displayId || 
               window.currentGwId ||
               localStorage.getItem('cardgift_display_id') ||
               null;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ИНИЦИАЛИЗАЦИЯ
    // ═══════════════════════════════════════════════════════════════════════
    
    async function init() {
        if (state.initialized) return;
        
        console.log('🤖 Initializing CardGift Bot...');
        
        // Проверяем статус подключения
        await checkConnectionStatus();
        
        // Создаём UI в настройках
        createSettingsUI();
        
        // Добавляем в раздел Рассылки
        updateMailingsSectionUI();
        
        state.initialized = true;
        console.log('✅ CardGift Bot initialized, connected:', state.isConnected);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ПРОВЕРКА СТАТУСА
    // ═══════════════════════════════════════════════════════════════════════
    
    async function checkConnectionStatus() {
        const gwId = getUserGwId();
        const sb = getSupabase();
        
        if (!gwId || !sb) {
            state.isConnected = false;
            return;
        }
        
        try {
            const { data, error } = await sb
                .from(CONFIG.SUBSCRIBERS_TABLE)
                .select('telegram_id, telegram_username, is_active')
                .eq('user_gw_id', gwId.toString().replace('GW', ''))
                .eq('is_active', true)
                .single();
            
            if (data && !error) {
                state.isConnected = true;
                state.telegramId = data.telegram_id;
                state.telegramUsername = data.telegram_username;
            } else {
                state.isConnected = false;
            }
        } catch (e) {
            console.log('🤖 Subscription check:', e.message);
            state.isConnected = false;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // UI В РАЗДЕЛЕ РАССЫЛКИ
    // ═══════════════════════════════════════════════════════════════════════
    
    function updateMailingsSectionUI() {
        const container = document.getElementById('telegram-bot-status');
        if (!container) return;
        
        const gwId = getUserGwId();
        const connectUrl = `https://t.me/${CONFIG.BOT_USERNAME}?start=${gwId}`;
        
        if (state.isConnected) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(76,175,80,0.1); border: 1px solid #4CAF50; border-radius: 12px;">
                    <span style="font-size: 32px;">✅</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #4CAF50;">Telegram подключен</div>
                        <div style="font-size: 13px; color: var(--text-muted);">
                            @${state.telegramUsername || 'user'} • Уведомления включены
                        </div>
                    </div>
                    <button class="btn btn-small" onclick="CardGiftBot.disconnect()" style="background: rgba(255,255,255,0.1);">
                        Отключить
                    </button>
                </div>
                
                <div style="margin-top: 15px; padding: 15px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px;">
                    <div style="font-weight: 600; margin-bottom: 10px;">📱 Вы будете получать:</div>
                    <ul style="margin: 0; padding-left: 20px; color: var(--text-muted); font-size: 14px;">
                        <li>Новости и обновления платформы</li>
                        <li>Напоминания о заданиях</li>
                        <li>Уведомления о новых рефералах</li>
                        <li>Важные системные сообщения</li>
                    </ul>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(255,215,0,0.1); border: 1px solid var(--gold); border-radius: 12px;">
                    <span style="font-size: 32px;">🤖</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">Telegram уведомления</div>
                        <div style="font-size: 13px; color: var(--text-muted);">
                            Получайте важные уведомления в Telegram
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 15px; padding: 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📱</div>
                    <div style="font-weight: 600; margin-bottom: 10px;">Подключите Telegram</div>
                    <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 20px;">
                        Нажмите кнопку ниже и запустите бота
                    </div>
                    <a href="${connectUrl}" target="_blank" class="btn btn-yellow" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none;">
                        <span style="font-size: 20px;">📲</span>
                        Подключить @${CONFIG.BOT_USERNAME}
                    </a>
                    <div style="margin-top: 15px; font-size: 12px; color: var(--text-muted);">
                        После подключения обновите страницу
                    </div>
                </div>
            `;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // UI В НАСТРОЙКАХ (отдельная секция)
    // ═══════════════════════════════════════════════════════════════════════
    
    function createSettingsUI() {
        // Найти секцию настроек или создать
        const settingsSection = document.getElementById('section-settings');
        if (!settingsSection) return;
        
        // Проверить не добавлен ли уже блок
        if (document.getElementById('telegram-settings-block')) return;
        
        const gwId = getUserGwId();
        const connectUrl = `https://t.me/${CONFIG.BOT_USERNAME}?start=${gwId}`;
        
        const html = `
            <div id="telegram-settings-block" class="content-card" style="margin-top: 20px;">
                <div class="card-header">
                    <span class="header-icon">📱</span> Telegram уведомления
                </div>
                <div style="padding: 15px;" id="telegram-settings-content">
                    ${state.isConnected ? `
                        <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(76,175,80,0.1); border: 1px solid #4CAF50; border-radius: 10px;">
                            <span style="font-size: 24px;">✅</span>
                            <div>
                                <div style="font-weight: 600; color: #4CAF50;">Подключено</div>
                                <div style="font-size: 13px; color: var(--text-muted);">@${state.telegramUsername || 'user'}</div>
                            </div>
                            <button class="btn btn-small" onclick="CardGiftBot.disconnect()" style="margin-left: auto;">
                                Отключить
                            </button>
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 20px;">
                            <a href="${connectUrl}" target="_blank" class="btn btn-yellow" style="text-decoration: none;">
                                📲 Подключить Telegram
                            </a>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        // Добавить в секцию настроек
        const firstCard = settingsSection.querySelector('.content-card');
        if (firstCard) {
            firstCard.insertAdjacentHTML('afterend', html);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ОТКЛЮЧЕНИЕ
    // ═══════════════════════════════════════════════════════════════════════
    
    async function disconnect() {
        const gwId = getUserGwId();
        const sb = getSupabase();
        
        if (!gwId || !sb) return;
        
        if (!confirm('Отключить Telegram уведомления?')) return;
        
        try {
            await sb
                .from(CONFIG.SUBSCRIBERS_TABLE)
                .update({ is_active: false })
                .eq('user_gw_id', gwId.toString().replace('GW', ''));
            
            state.isConnected = false;
            state.telegramId = null;
            state.telegramUsername = null;
            
            // Обновить UI
            updateMailingsSectionUI();
            
            if (typeof showNotification === 'function') {
                showNotification('Telegram отключен', 'success');
            }
            
        } catch (e) {
            console.error('Error disconnecting:', e);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ПОЛУЧЕНИЕ ССЫЛКИ ДЛЯ ПОДКЛЮЧЕНИЯ
    // ═══════════════════════════════════════════════════════════════════════
    
    function getConnectLink() {
        const gwId = getUserGwId();
        return `https://t.me/${CONFIG.BOT_USERNAME}?start=${gwId}`;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ЭКСПОРТ
    // ═══════════════════════════════════════════════════════════════════════
    
    window.CardGiftBot = {
        init,
        checkStatus: checkConnectionStatus,
        disconnect,
        getConnectLink,
        isConnected: () => state.isConnected,
        getConfig: () => CONFIG
    };
    
    // Автоинициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 2000));
    } else {
        setTimeout(init, 2000);
    }
    
    console.log('✅ CardGift Bot v1.0 loaded');
    
})();
