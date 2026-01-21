// =============================================
// SERVICE WORKER - Push Notifications
// Файл: sw-push.js (положить в корень сайта!)
// =============================================

const CACHE_NAME = 'cardgift-v1';

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('📦 Service Worker installed');
    self.skipWaiting();
});

// Активация
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker activated');
    event.waitUntil(clients.claim());
});

// Получение Push уведомления
self.addEventListener('push', (event) => {
    console.log('📬 Push received:', event);
    
    let data = {
        title: 'CardGift',
        body: 'Новое уведомление',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        url: '/'
    };
    
    // Парсим данные из push
    if (event.data) {
        try {
            const payload = event.data.json();
            data = { ...data, ...payload };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192.png',
        badge: data.badge || '/icons/badge-72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
            dateOfArrival: Date.now()
        },
        actions: [
            {
                action: 'open',
                title: '📂 Открыть'
            },
            {
                action: 'close',
                title: '✕ Закрыть'
            }
        ],
        requireInteraction: false,
        tag: data.tag || 'cardgift-notification',
        renotify: true
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Если есть открытое окно - фокусируемся
                for (let client of windowClients) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Иначе открываем новое
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Закрытие уведомления
self.addEventListener('notificationclose', (event) => {
    console.log('❌ Notification closed');
});

// Синхронизация в фоне (опционально)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-messages') {
        console.log('🔄 Background sync');
    }
});

console.log('🔔 Push Service Worker loaded');
