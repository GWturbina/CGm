// =============================================
// PUSH NOTIFICATIONS MODULE
// Браузерные Push уведомления
// =============================================

// VAPID ключи - ЗАМЕНИ НА СВОИ!
// Сгенерировать: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'BObvaB3DSGyVXXCbRBQ8OZ0cgxubAL4KXDBStxxFqzwaPlNaWzu7IjxCicDRqdcJU9mWJ3KJYjMnEMrJPTnrywM';

let pushSubscription = null;
let pushSupported = false;

// =============================================
// ИНИЦИАЛИЗАЦИЯ
// =============================================

async function initPushNotifications() {
    console.log('🔔 Initializing Push Notifications...');
    
    // Проверка поддержки
    if (!('serviceWorker' in navigator)) {
        console.log('❌ Service Workers not supported');
        return false;
    }
    
    if (!('PushManager' in window)) {
        console.log('❌ Push not supported');
        return false;
    }
    
    pushSupported = true;
    
    try {
        // Регистрация Service Worker
        const registration = await navigator.serviceWorker.register('/sw-push.js');
        console.log('✅ Service Worker registered:', registration.scope);
        
        // Проверить существующую подписку
        pushSubscription = await registration.pushManager.getSubscription();
        
        if (pushSubscription) {
            console.log('✅ Already subscribed to push');
            updatePushUI(true);
        } else {
            console.log('📭 Not subscribed to push');
            updatePushUI(false);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Push init error:', error);
        return false;
    }
}

// =============================================
// ПОДПИСКА
// =============================================

// Запросить разрешение и подписаться
async function subscribeToPush() {
    if (!pushSupported) {
        showNotification('Push уведомления не поддерживаются', 'error');
        return false;
    }
    
    try {
        // Запрос разрешения
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
            showNotification('Вы отклонили уведомления', 'warning');
            return false;
        }
        
        // Получить регистрацию SW
        const registration = await navigator.serviceWorker.ready;
        
        // Подписаться
        pushSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        console.log('✅ Push subscription:', pushSubscription);
        
        // Сохранить в базу
        await savePushSubscription(pushSubscription);
        
        showNotification('🔔 Push уведомления включены!', 'success');
        updatePushUI(true);
        
        return true;
    } catch (error) {
        console.error('❌ Subscribe error:', error);
        showNotification('Ошибка подписки: ' + error.message, 'error');
        return false;
    }
}

// Отписаться
async function unsubscribeFromPush() {
    if (!pushSubscription) {
        return true;
    }
    
    try {
        await pushSubscription.unsubscribe();
        
        // Удалить из базы
        await removePushSubscription(pushSubscription.endpoint);
        
        pushSubscription = null;
        
        showNotification('🔕 Push уведомления отключены', 'info');
        updatePushUI(false);
        
        return true;
    } catch (error) {
        console.error('❌ Unsubscribe error:', error);
        return false;
    }
}

// =============================================
// БАЗА ДАННЫХ
// =============================================

// Сохранить подписку в Supabase
async function savePushSubscription(subscription) {
    const gwId = window.userGwId || window.displayId;
    const json = subscription.toJSON();
    
    const data = {
        user_gw_id: gwId?.replace('GW', '') || null,
        subscribed_to_gw_id: gwId?.replace('GW', '') || null,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
        is_active: true
    };
    
    const { error } = await supabase
        .from('push_subscriptions')
        .upsert(data, { onConflict: 'endpoint' });
    
    if (error) {
        console.error('Error saving subscription:', error);
        throw error;
    }
    
    console.log('✅ Subscription saved');
}

// Удалить подписку
async function removePushSubscription(endpoint) {
    await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('endpoint', endpoint);
}

// Загрузить подписчиков (для рассылки)
async function loadPushSubscribers() {
    const gwId = window.userGwId || window.displayId;
    if (!gwId) return [];
    
    const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('subscribed_to_gw_id', gwId.replace('GW', ''))
        .eq('is_active', true);
    
    return data || [];
}

// =============================================
// ОТПРАВКА (через сервер)
// =============================================

// Отправить Push всем подписчикам
async function sendPushBroadcast(title, body, options = {}) {
    const gwId = window.userGwId || window.displayId;
    if (!gwId) return { success: 0, failed: 0 };
    
    const subscribers = await loadPushSubscribers();
    
    if (subscribers.length === 0) {
        showNotification('Нет подписчиков на Push', 'info');
        return { success: 0, failed: 0 };
    }
    
    showNotification(`📤 Отправляем ${subscribers.length} уведомлений...`, 'info');
    
    let success = 0;
    let failed = 0;
    
    // Отправка через API endpoint
    try {
        const response = await fetch('/api/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ownerGwId: gwId.replace('GW', ''),
                title: title,
                body: body,
                icon: options.icon || '/icons/icon-192.png',
                url: options.url || '/',
                tag: options.tag || 'broadcast'
            })
        });
        
        const result = await response.json();
        success = result.success || 0;
        failed = result.failed || 0;
    } catch (e) {
        console.error('Push broadcast error:', e);
        
        // Fallback: показать локальное уведомление для теста
        if (Notification.permission === 'granted') {
            new Notification(title, { body: body });
            success = 1;
        }
    }
    
    // Сохранить в историю
    await supabase.from('push_history').insert({
        sender_gw_id: gwId.replace('GW', ''),
        title: title,
        body: body,
        icon_url: options.icon,
        click_url: options.url,
        sent_count: subscribers.length,
        delivered_count: success,
        failed_count: failed
    });
    
    showNotification(`✅ Отправлено: ${success}, ошибок: ${failed}`, success > 0 ? 'success' : 'error');
    
    return { success, failed };
}

// Локальный тест (без сервера)
async function testPushLocal() {
    if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            showNotification('Разрешите уведомления', 'error');
            return;
        }
    }
    
    new Notification('🧪 Тест Push', {
        body: 'Если вы видите это — Push работает!',
        icon: '/icons/icon-192.png'
    });
    
    showNotification('✅ Локальный тест отправлен', 'success');
}

// =============================================
// UI
// =============================================

function updatePushUI(isSubscribed) {
    const statusEl = document.getElementById('push-status');
    const actionsEl = document.getElementById('push-actions');
    
    if (statusEl) {
        if (!pushSupported) {
            statusEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: rgba(255,100,100,0.1); border: 1px solid #ff6b6b; border-radius: 10px;">
                    <span style="font-size: 24px;">❌</span>
                    <div>
                        <div style="font-weight: 600; color: #ff6b6b;">Не поддерживается</div>
                        <div style="font-size: 13px; color: var(--text-muted);">Ваш браузер не поддерживает Push</div>
                    </div>
                </div>
            `;
        } else if (isSubscribed) {
            statusEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: rgba(76,175,80,0.1); border: 1px solid var(--green); border-radius: 10px;">
                    <span style="font-size: 24px;">🔔</span>
                    <div>
                        <div style="font-weight: 600; color: var(--green);">Push включены</div>
                        <div style="font-size: 13px; color: var(--text-muted);">Вы будете получать уведомления</div>
                    </div>
                </div>
            `;
        } else {
            statusEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; padding: 15px; background: rgba(255,215,0,0.1); border: 1px solid var(--gold); border-radius: 10px;">
                    <span style="font-size: 24px;">🔕</span>
                    <div>
                        <div style="font-weight: 600;">Push отключены</div>
                        <div style="font-size: 13px; color: var(--text-muted);">Включите для получения уведомлений</div>
                    </div>
                </div>
            `;
        }
    }
    
    if (actionsEl) {
        if (!pushSupported) {
            actionsEl.innerHTML = '';
        } else if (isSubscribed) {
            actionsEl.innerHTML = `
                <button class="btn btn-gray" onclick="testPushLocal()">🧪 Тест</button>
                <button class="btn btn-gray" onclick="showPushBroadcast()">📤 Рассылка</button>
                <button class="btn btn-gray" onclick="unsubscribeFromPush()">🔕 Отключить</button>
            `;
        } else {
            actionsEl.innerHTML = `
                <button class="btn btn-yellow" onclick="subscribeToPush()">🔔 Включить Push</button>
            `;
        }
    }
}

// Модалка рассылки Push
function showPushBroadcast() {
    document.getElementById('push-broadcast-modal')?.remove();
    
    const html = `
        <div id="push-broadcast-modal" class="modal-overlay" style="display: flex !important;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>🔔 Push рассылка</h2>
                    <button class="modal-close" onclick="document.getElementById('push-broadcast-modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Заголовок *</label>
                        <input type="text" id="push-title" class="form-input" placeholder="Важное уведомление" maxlength="50">
                    </div>
                    
                    <div class="form-group">
                        <label>Текст *</label>
                        <textarea id="push-body" class="form-input" rows="3" placeholder="Текст уведомления..." maxlength="200"></textarea>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 5px;">Макс. 200 символов</div>
                    </div>
                    
                    <div class="form-group">
                        <label>Ссылка при клике (опционально)</label>
                        <input type="url" id="push-url" class="form-input" placeholder="https://...">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-gray" onclick="document.getElementById('push-broadcast-modal').remove()">Отмена</button>
                    <button class="btn btn-yellow" onclick="executePushBroadcast()">📤 Отправить</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

async function executePushBroadcast() {
    const title = document.getElementById('push-title')?.value?.trim();
    const body = document.getElementById('push-body')?.value?.trim();
    const url = document.getElementById('push-url')?.value?.trim();
    
    if (!title || !body) {
        showNotification('Заполните заголовок и текст', 'error');
        return;
    }
    
    document.getElementById('push-broadcast-modal')?.remove();
    
    await sendPushBroadcast(title, body, { url: url || '/' });
}

// =============================================
// УТИЛИТЫ
// =============================================

// Конвертация VAPID ключа
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
}

// =============================================
// ИНИЦИАЛИЗАЦИЯ
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // Закрыть модалки
    document.getElementById('push-broadcast-modal')?.remove();
    
    // Инициализация через 2 секунды
    setTimeout(initPushNotifications, 2000);
});

window.addEventListener('hashchange', () => {
    if (window.location.hash === '#mailings') {
        initPushNotifications();
    }
});

console.log('✅ Push Notifications module loaded');
