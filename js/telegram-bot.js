// =============================================
// TELEGRAM BOT MODULE
// CardGift Telegram Integration
// =============================================

let telegramBotData = null;
let telegramSubscribers = [];

// =============================================
// ИНИЦИАЛИЗАЦИЯ
// =============================================

async function initTelegramBot() {
    console.log('📱 Initializing Telegram Bot...');
    await loadTelegramBot();
    updateTelegramBotUI();
}

// Загрузить данные бота
async function loadTelegramBot() {
    const gwId = window.userGwId || window.displayId;
    if (!gwId) return null;
    
    try {
        const { data, error } = await supabase
            .from('telegram_bots')
            .select('*')
            .eq('owner_gw_id', gwId.replace('GW', ''))
            .single();
        
        if (data) {
            telegramBotData = data;
            console.log('📱 Bot loaded:', data.bot_username);
        }
        return data;
    } catch (e) {
        console.log('No Telegram bot configured');
        return null;
    }
}

// =============================================
// UI ОБНОВЛЕНИЕ
// =============================================

function updateTelegramBotUI() {
    const statusEl = document.getElementById('telegram-bot-status');
    const actionsEl = document.getElementById('telegram-bot-actions');
    
    if (!statusEl) return;
    
    if (telegramBotData && telegramBotData.is_active) {
        statusEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(76,175,80,0.1); border: 1px solid var(--green); border-radius: 10px;">
                <span style="font-size: 32px;">✅</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--green);">Бот подключен</div>
                    <div style="font-size: 13px; color: var(--text-muted);">
                        @${telegramBotData.bot_username || 'bot'} • ${telegramBotData.subscribers_count || 0} подписчиков
                    </div>
                </div>
            </div>
        `;
        
        if (actionsEl) {
            actionsEl.innerHTML = `
                <button class="btn btn-yellow" onclick="copyTelegramBotLink()">📋 Скопировать ссылку</button>
                <button class="btn btn-gray" onclick="showTelegramSubscribers()">👥 Подписчики</button>
                <button class="btn btn-gray" onclick="showTelegramBroadcast()">📤 Рассылка</button>
                <button class="btn btn-gray" onclick="testTelegramBot()">🧪 Тест</button>
                <button class="btn btn-gray" onclick="showTelegramBotSettings()">⚙️</button>
            `;
        }
    } else {
        statusEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(255,215,0,0.1); border: 1px solid var(--gold); border-radius: 10px;">
                <span style="font-size: 32px;">🤖</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600;">Telegram Bot не подключен</div>
                    <div style="font-size: 13px; color: var(--text-muted);">Подключите бота для рассылок в Telegram</div>
                </div>
            </div>
        `;
        
        if (actionsEl) {
            actionsEl.innerHTML = `
                <button class="btn btn-yellow" onclick="showTelegramBotSettings()">🤖 Подключить бота</button>
            `;
        }
    }
}

// =============================================
// НАСТРОЙКА БОТА
// =============================================

function showTelegramBotSettings() {
    const modal = document.getElementById('telegram-bot-modal');
    if (modal) {
        modal.style.cssText = 'display: flex !important;';
        
        // Заполнить если уже есть бот
        if (telegramBotData) {
            const tokenInput = modal.querySelector('[name="bot_token"]');
            const welcomeInput = modal.querySelector('[name="welcome_message"]');
            if (tokenInput) tokenInput.value = telegramBotData.bot_token || '';
            if (welcomeInput) welcomeInput.value = telegramBotData.welcome_message || '';
        }
    }
}

function closeTelegramBotModal() {
    const modal = document.getElementById('telegram-bot-modal');
    if (modal) {
        modal.style.cssText = 'display: none !important;';
    }
}

// Проверить и сохранить бота
async function saveTelegramBot() {
    const gwId = window.userGwId || window.displayId;
    if (!gwId) return;
    
    const modal = document.getElementById('telegram-bot-modal');
    const token = modal.querySelector('[name="bot_token"]')?.value?.trim();
    const welcomeMsg = modal.querySelector('[name="welcome_message"]')?.value?.trim();
    
    if (!token) {
        showNotification('Введите токен бота', 'error');
        return;
    }
    
    // Проверка формата токена
    if (!token.match(/^\d+:[A-Za-z0-9_-]+$/)) {
        showNotification('Неверный формат токена', 'error');
        return;
    }
    
    showNotification('Проверяем бота...', 'info');
    
    try {
        // Проверить бота через Telegram API
        const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const result = await response.json();
        
        if (!result.ok) {
            showNotification('Бот не найден. Проверьте токен.', 'error');
            return;
        }
        
        const botInfo = result.result;
        
        // Сохранить в базу
        const botData = {
            owner_gw_id: gwId.replace('GW', ''),
            bot_token: token,
            bot_username: botInfo.username,
            bot_name: botInfo.first_name,
            welcome_message: welcomeMsg || '👋 Добро пожаловать! Вы подписались на уведомления.',
            is_active: true
        };
        
        const { data, error } = await supabase
            .from('telegram_bots')
            .upsert(botData, { onConflict: 'owner_gw_id' })
            .select()
            .single();
        
        if (error) throw error;
        
        telegramBotData = data;
        
        showNotification(`✅ Бот @${botInfo.username} подключен!`, 'success');
        closeTelegramBotModal();
        updateTelegramBotUI();
        
    } catch (e) {
        console.error('Error saving bot:', e);
        showNotification('Ошибка сохранения: ' + e.message, 'error');
    }
}

// =============================================
// ПОДПИСЧИКИ
// =============================================

async function loadTelegramSubscribers() {
    const gwId = window.userGwId || window.displayId;
    if (!gwId) return [];
    
    try {
        const { data, error } = await supabase
            .from('telegram_subscribers')
            .select('*')
            .eq('bot_owner_gw_id', gwId.replace('GW', ''))
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        telegramSubscribers = data || [];
        return telegramSubscribers;
    } catch (e) {
        console.error('Error loading subscribers:', e);
        return [];
    }
}

async function showTelegramSubscribers() {
    await loadTelegramSubscribers();
    
    // Удалить старую модалку
    document.getElementById('tg-subscribers-modal')?.remove();
    
    const html = `
        <div id="tg-subscribers-modal" class="modal-overlay" style="display: flex !important;">
            <div class="modal-content" style="max-width: 500px; max-height: 80vh;">
                <div class="modal-header">
                    <h2>👥 Подписчики (${telegramSubscribers.length})</h2>
                    <button class="modal-close" onclick="document.getElementById('tg-subscribers-modal').remove()">✕</button>
                </div>
                <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                    ${telegramSubscribers.length === 0 ? `
                        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                            <div style="font-size: 50px; margin-bottom: 15px;">📱</div>
                            <p>Пока нет подписчиков</p>
                            <p style="font-size: 12px; margin-top: 10px;">Поделитесь ссылкой на бота!</p>
                            <button class="btn btn-yellow" style="margin-top: 15px;" onclick="copyTelegramBotLink()">📋 Скопировать ссылку</button>
                        </div>
                    ` : telegramSubscribers.map(sub => `
                        <div style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid var(--border);">
                            <div style="width: 40px; height: 40px; background: #0088cc; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 12px;">
                                ${(sub.telegram_first_name || 'U')[0].toUpperCase()}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600;">${sub.telegram_first_name || ''} ${sub.telegram_last_name || ''}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">
                                    ${sub.telegram_username ? '@' + sub.telegram_username : 'ID: ' + sub.telegram_id}
                                </div>
                            </div>
                            <div style="font-size: 11px; color: var(--text-muted);">
                                ${new Date(sub.created_at).toLocaleDateString('ru-RU')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-gray" onclick="document.getElementById('tg-subscribers-modal').remove()">Закрыть</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

// =============================================
// ССЫЛКА НА БОТА
// =============================================

function copyTelegramBotLink() {
    if (!telegramBotData?.bot_username) {
        showNotification('Сначала подключите бота', 'error');
        return;
    }
    
    const gwId = window.userGwId || window.displayId;
    const link = `https://t.me/${telegramBotData.bot_username}?start=${gwId.replace('GW', '')}`;
    
    navigator.clipboard.writeText(link).then(() => {
        showNotification('Ссылка скопирована! 📋', 'success');
    });
}

// =============================================
// ОТПРАВКА СООБЩЕНИЙ
// =============================================

// Отправить одно сообщение
async function sendTelegramMessage(chatId, text, options = {}) {
    if (!telegramBotData?.bot_token) {
        throw new Error('Bot not configured');
    }
    
    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: options.parse_mode || 'HTML'
    };
    
    // Добавить кнопку если есть
    if (options.button_text && options.button_url) {
        body.reply_markup = {
            inline_keyboard: [[{
                text: options.button_text,
                url: options.button_url
            }]]
        };
    }
    
    const response = await fetch(`https://api.telegram.org/bot${telegramBotData.bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    return await response.json();
}

// Тест бота
async function testTelegramBot() {
    if (!telegramBotData?.bot_token) {
        showNotification('Бот не подключен', 'error');
        return;
    }
    
    await loadTelegramSubscribers();
    
    if (telegramSubscribers.length === 0) {
        showNotification('Нет подписчиков. Подпишитесь на бота сами!', 'info');
        copyTelegramBotLink();
        return;
    }
    
    const testSub = telegramSubscribers[0];
    
    try {
        const result = await sendTelegramMessage(
            testSub.telegram_id,
            '🧪 <b>Тестовое сообщение</b>\n\nЕсли вы видите это — рассылка работает!',
            { parse_mode: 'HTML' }
        );
        
        if (result.ok) {
            showNotification('✅ Тест успешен! Сообщение отправлено.', 'success');
        } else {
            showNotification('❌ Ошибка: ' + result.description, 'error');
        }
    } catch (e) {
        showNotification('Ошибка отправки: ' + e.message, 'error');
    }
}

// =============================================
// РАССЫЛКА
// =============================================

function showTelegramBroadcast() {
    if (!telegramBotData?.is_active) {
        showNotification('Сначала подключите бота', 'error');
        return;
    }
    
    document.getElementById('tg-broadcast-modal')?.remove();
    
    const html = `
        <div id="tg-broadcast-modal" class="modal-overlay" style="display: flex !important;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>📤 Рассылка в Telegram</h2>
                    <button class="modal-close" onclick="document.getElementById('tg-broadcast-modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div style="padding: 10px; background: var(--bg-card); border-radius: 8px; margin-bottom: 15px;">
                        Получателей: <span style="color: var(--gold); font-weight: bold;">${telegramBotData.subscribers_count || 0}</span>
                    </div>
                    
                    <div class="form-group">
                        <label>Сообщение *</label>
                        <textarea id="tg-broadcast-text" class="form-input" rows="5" placeholder="Текст сообщения...

Поддерживается HTML:
<b>жирный</b> <i>курсив</i>"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Текст кнопки (опционально)</label>
                        <input type="text" id="tg-broadcast-btn-text" class="form-input" placeholder="Подробнее">
                    </div>
                    
                    <div class="form-group">
                        <label>Ссылка кнопки</label>
                        <input type="url" id="tg-broadcast-btn-url" class="form-input" placeholder="https://...">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-gray" onclick="document.getElementById('tg-broadcast-modal').remove()">Отмена</button>
                    <button class="btn btn-yellow" onclick="sendTelegramBroadcast()">📤 Отправить всем</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

async function sendTelegramBroadcast() {
    const text = document.getElementById('tg-broadcast-text')?.value?.trim();
    const btnText = document.getElementById('tg-broadcast-btn-text')?.value?.trim();
    const btnUrl = document.getElementById('tg-broadcast-btn-url')?.value?.trim();
    
    if (!text) {
        showNotification('Введите текст сообщения', 'error');
        return;
    }
    
    await loadTelegramSubscribers();
    
    if (telegramSubscribers.length === 0) {
        showNotification('Нет подписчиков', 'error');
        return;
    }
    
    document.getElementById('tg-broadcast-modal')?.remove();
    showNotification(`📤 Отправляем ${telegramSubscribers.length} сообщений...`, 'info');
    
    let sent = 0;
    let failed = 0;
    
    for (const sub of telegramSubscribers) {
        try {
            const result = await sendTelegramMessage(sub.telegram_id, text, {
                parse_mode: 'HTML',
                button_text: btnText,
                button_url: btnUrl
            });
            
            if (result.ok) {
                sent++;
            } else {
                failed++;
                // Если заблокировал — деактивировать
                if (result.error_code === 403) {
                    await supabase
                        .from('telegram_subscribers')
                        .update({ is_active: false, is_blocked: true })
                        .eq('id', sub.id);
                }
            }
            
            // Задержка 35ms (лимит Telegram ~30 msg/sec)
            await new Promise(r => setTimeout(r, 35));
            
        } catch (e) {
            failed++;
        }
    }
    
    // Обновить статистику
    await supabase
        .from('telegram_bots')
        .update({ 
            messages_sent: (telegramBotData.messages_sent || 0) + sent,
            updated_at: new Date().toISOString()
        })
        .eq('owner_gw_id', telegramBotData.owner_gw_id);
    
    // Сохранить рассылку
    await supabase.from('telegram_broadcasts').insert({
        owner_gw_id: telegramBotData.owner_gw_id,
        message_text: text,
        button_text: btnText,
        button_url: btnUrl,
        recipients_count: telegramSubscribers.length,
        sent_count: sent,
        failed_count: failed
    });
    
    showNotification(`✅ Отправлено: ${sent}, ошибок: ${failed}`, sent > 0 ? 'success' : 'error');
    
    // Обновить данные бота
    await loadTelegramBot();
    updateTelegramBotUI();
}

// =============================================
// ОБРАБОТКА ВХОДЯЩИХ (для Webhook)
// =============================================

// Эта функция вызывается из API endpoint
async function handleTelegramUpdate(update, botOwnerGwId) {
    const message = update.message;
    if (!message) return;
    
    const chatId = message.chat.id;
    const text = message.text || '';
    
    // Команда /start
    if (text.startsWith('/start')) {
        const params = text.split(' ');
        const referrerId = params[1]; // параметр после /start
        
        // Сохранить подписчика
        const subData = {
            telegram_id: message.from.id,
            telegram_username: message.from.username,
            telegram_first_name: message.from.first_name,
            telegram_last_name: message.from.last_name,
            bot_owner_gw_id: botOwnerGwId,
            source: referrerId ? 'referral' : 'direct',
            source_id: referrerId
        };
        
        await supabase
            .from('telegram_subscribers')
            .upsert(subData, { onConflict: 'telegram_id,bot_owner_gw_id' });
        
        // Отправить приветствие
        const { data: bot } = await supabase
            .from('telegram_bots')
            .select('bot_token, welcome_message')
            .eq('owner_gw_id', botOwnerGwId)
            .single();
        
        if (bot) {
            await fetch(`https://api.telegram.org/bot${bot.bot_token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: bot.welcome_message || '👋 Добро пожаловать!'
                })
            });
        }
    }
    
    // Команда /stop
    if (text === '/stop') {
        await supabase
            .from('telegram_subscribers')
            .update({ is_active: false })
            .eq('telegram_id', message.from.id)
            .eq('bot_owner_gw_id', botOwnerGwId);
    }
}

// =============================================
// INIT
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // Закрыть модалку при загрузке
    const modal = document.getElementById('telegram-bot-modal');
    if (modal) modal.style.cssText = 'display: none !important;';
    
    // Инициализация
    setTimeout(initTelegramBot, 1500);
});

window.addEventListener('hashchange', () => {
    if (window.location.hash === '#mailings') {
        initTelegramBot();
    }
});

console.log('✅ Telegram Bot module loaded');
