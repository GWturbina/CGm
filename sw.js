/* =====================================================
   CARDGIFT - SERVICE WORKER
   v1.0 - PWA, Offline support, Push notifications
   ===================================================== */

const CACHE_NAME = 'cardgift-v2';
const OFFLINE_URL = '/offline.html';

// Файлы для кэширования
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/generator.html',
    '/card-viewer.html',
    '/registration.html',
    '/offline.html',
    '/css/common.css',
    '/css/dashboard.css',
    '/css/generator.css',
    '/css/card-viewer.css',
    '/js/config.js',
    '/js/common.js',
    '/js/auth.js',
    '/js/supabase.js',
    '/js/globalway-bridge.js',
    '/js/cardService.js',
    '/js/cloudinary.js',
    '/manifest.json'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('📦 Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Caching app shell...');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('✅ Service Worker installed');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.warn('⚠️ Some assets failed to cache:', error);
                return self.skipWaiting();
            })
    );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('🗑️ Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('✅ Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Пропускаем внешние запросы и API
    if (!url.origin.includes(self.location.origin)) {
        return;
    }
    
    // API запросы - всегда сеть
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ error: 'Offline' }),
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                })
        );
        return;
    }
    
    // Для остальных - сначала кэш, потом сеть
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Обновляем кэш в фоне
                    event.waitUntil(
                        fetch(request)
                            .then((response) => {
                                if (response.ok) {
                                    caches.open(CACHE_NAME)
                                        .then((cache) => cache.put(request, response));
                                }
                            })
                            .catch(() => {})
                    );
                    return cachedResponse;
                }
                
                return fetch(request)
                    .then((response) => {
                        // Кэшируем новые ресурсы
                        if (response.ok && request.method === 'GET') {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => cache.put(request, responseClone));
                        }
                        return response;
                    })
                    .catch(() => {
                        // Офлайн - показываем офлайн страницу для HTML
                        if (request.headers.get('accept')?.includes('text/html')) {
                            return caches.match(OFFLINE_URL);
                        }
                    });
            })
    );
});

// Push уведомления
self.addEventListener('push', (event) => {
    console.log('📬 Push received:', event);
    
    let data = {
        title: 'CardGift',
        body: 'У вас новое уведомление',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        tag: 'cardgift-notification'
    };
    
    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            tag: data.tag,
            data: data.data || {},
            actions: data.actions || [
                { action: 'open', title: 'Открыть' },
                { action: 'close', title: 'Закрыть' }
            ],
            vibrate: [200, 100, 200]
        })
    );
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Notification clicked:', event);
    
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/dashboard.html';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Если есть открытое окно - фокусируемся на нём
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Иначе открываем новое
                return clients.openWindow(urlToOpen);
            })
    );
});

// Синхронизация в фоне (когда появится интернет)
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync:', event.tag);
    
    if (event.tag === 'sync-cards') {
        event.waitUntil(syncCards());
    }
});

async function syncCards() {
    console.log('🔄 Syncing cards...');
}

console.log('📦 CardGift Service Worker loaded');
