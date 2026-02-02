/* =====================================================
   CARDGIFT - SERVICE WORKER v3.0
   PWA, Offline support, Push notifications, Background sync
   
   Обновлено: Февраль 2026
   ===================================================== */

const CACHE_VERSION = 'v3.0';
const CACHE_NAME = `cardgift-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// ===== ФАЙЛЫ ДЛЯ КЭШИРОВАНИЯ =====
const PRECACHE_ASSETS = [
    // HTML страницы
    '/',
    '/index.html',
    '/dashboard.html',
    '/generator.html',
    '/card-viewer.html',
    '/registration.html',
    '/ai-studio.html',
    '/academy.html',
    '/blog.html',
    '/survey.html',
    '/offline.html',
    
    // CSS
    '/css/common.css',
    '/css/dashboard.css',
    '/css/generator.css',
    '/css/card-viewer.css',
    '/css/ai-studio.css',
    '/css/registration.css',
    '/css/index.css',
    '/css/mobile-header.css',
    
    // Core JS (загружаются всегда)
    '/js/config.js',
    '/js/common.js',
    '/js/supabase.js',
    '/js/supabase-api.js',
    '/js/auth.js',
    '/js/wallet-state.js',
    '/js/wallet.js',
    '/js/translations.js',
    '/js/id-linking-service.js',
    '/js/globalway-bridge.js',
    '/js/content-filter.js',
    
    // AI Studio
    '/js/ai-studio.js',
    '/js/voices-data.js',
    '/js/music-data.js',
    
    // Virtual Assistant
    '/js/lessons-data.js',
    '/js/lessons-data-extended.js',
    '/modules/assistant/assistant.js',
    '/modules/assistant/assistant-ui.js',
    '/modules/assistant/assistant-init.js',
    '/modules/assistant/dashboard-integration.js',
    
    // Dashboard модули
    '/modules/core/modules-fix.js',
    '/modules/contacts/contacts.js',
    '/modules/archive/archive.js',
    '/modules/referrals/referrals.js',
    '/modules/analytics/analytics.js',
    '/modules/panel/panel.js',
    
    // Другие важные JS
    '/js/generator.js',
    '/js/card-viewer.js',
    '/js/cardService.js',
    '/js/contacts-service.js',
    '/js/mailings.js',
    '/js/surveys.js',
    '/js/mobile-header.js',
    '/js/mobile-wallet-helper.js',
    
    // PWA
    '/manifest.json',
    
    // Иконки (основные)
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-72.png'
];

// Ресурсы которые НЕ кэшируем
const NEVER_CACHE = [
    '/api/',
    'supabase.co',
    'cloudinary.com',
    'jsdelivr.net',
    'cdnjs.cloudflare.com'
];

// ===== УСТАНОВКА =====
self.addEventListener('install', (event) => {
    console.log(`📦 Service Worker ${CACHE_VERSION} installing...`);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async (cache) => {
                console.log('📦 Caching app shell...');
                
                // Кэшируем по одному чтобы ошибка в одном не сломала все
                const results = await Promise.allSettled(
                    PRECACHE_ASSETS.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`⚠️ Failed to cache: ${url}`, err.message);
                        })
                    )
                );
                
                const cached = results.filter(r => r.status === 'fulfilled').length;
                console.log(`✅ Cached ${cached}/${PRECACHE_ASSETS.length} assets`);
            })
            .then(() => self.skipWaiting())
            .catch((error) => {
                console.error('❌ Cache failed:', error);
                return self.skipWaiting();
            })
    );
});

// ===== АКТИВАЦИЯ =====
self.addEventListener('activate', (event) => {
    console.log(`🚀 Service Worker ${CACHE_VERSION} activating...`);
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('cardgift-') && name !== CACHE_NAME)
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

// ===== ОБРАБОТКА ЗАПРОСОВ =====
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Пропускаем не-GET запросы
    if (request.method !== 'GET') {
        return;
    }
    
    // Пропускаем запросы которые не кэшируем
    if (NEVER_CACHE.some(pattern => request.url.includes(pattern))) {
        return;
    }
    
    // Пропускаем внешние ресурсы (кроме CDN)
    if (!url.origin.includes(self.location.origin) && 
        !url.href.includes('jsdelivr') && 
        !url.href.includes('cdnjs')) {
        return;
    }

    // API запросы - только сеть
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .catch(() => new Response(
                    JSON.stringify({ error: 'Offline', message: 'Нет подключения к интернету' }),
                    { 
                        status: 503,
                        headers: { 'Content-Type': 'application/json' } 
                    }
                ))
        );
        return;
    }

    // Стратегия: Stale-While-Revalidate
    // Отдаём из кэша сразу, обновляем в фоне
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // Запрос в сеть (для обновления кэша)
                const fetchPromise = fetch(request)
                    .then((networkResponse) => {
                        // Кэшируем успешные ответы
                        if (networkResponse.ok) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => cache.put(request, responseClone));
                        }
                        return networkResponse;
                    })
                    .catch((error) => {
                        console.warn('⚠️ Fetch failed:', url.pathname);
                        return null;
                    });

                // Если есть в кэше - отдаём сразу
                if (cachedResponse) {
                    // Обновляем кэш в фоне
                    event.waitUntil(fetchPromise);
                    return cachedResponse;
                }

                // Если нет в кэше - ждём сеть
                return fetchPromise.then((response) => {
                    if (response) return response;
                    
                    // Офлайн - показываем офлайн страницу для HTML
                    if (request.headers.get('accept')?.includes('text/html')) {
                        return caches.match(OFFLINE_URL);
                    }
                    
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// ===== PUSH УВЕДОМЛЕНИЯ =====
self.addEventListener('push', (event) => {
    console.log('📬 Push received');
    
    let data = {
        title: 'CardGift',
        body: 'У вас новое уведомление',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        tag: 'cardgift-notification',
        url: '/dashboard.html'
    };
    
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
        icon: data.icon,
        badge: data.badge,
        tag: data.tag,
        data: { url: data.url },
        actions: [
            { action: 'open', title: '📂 Открыть' },
            { action: 'close', title: '✕ Закрыть' }
        ],
        vibrate: [200, 100, 200],
        requireInteraction: false,
        renotify: true,
        silent: false
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ===== КЛИК ПО УВЕДОМЛЕНИЮ =====
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    const urlToOpen = event.notification.data?.url || '/dashboard.html';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Ищем открытое окно
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Открываем новое окно
                return clients.openWindow(urlToOpen);
            })
    );
});

// ===== ЗАКРЫТИЕ УВЕДОМЛЕНИЯ =====
self.addEventListener('notificationclose', (event) => {
    console.log('❌ Notification dismissed');
});

// ===== ФОНОВАЯ СИНХРОНИЗАЦИЯ =====
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync:', event.tag);
    
    switch (event.tag) {
        case 'sync-cards':
            event.waitUntil(syncCards());
            break;
        case 'sync-contacts':
            event.waitUntil(syncContacts());
            break;
        default:
            console.log('Unknown sync tag:', event.tag);
    }
});

async function syncCards() {
    console.log('🔄 Syncing cards in background...');
    // Здесь логика синхронизации карточек
}

async function syncContacts() {
    console.log('🔄 Syncing contacts in background...');
    // Здесь логика синхронизации контактов
}

// ===== ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ =====
self.addEventListener('periodicsync', (event) => {
    console.log('⏰ Periodic sync:', event.tag);
    
    if (event.tag === 'update-content') {
        event.waitUntil(updateContent());
    }
});

async function updateContent() {
    console.log('⏰ Updating content...');
    // Здесь логика периодического обновления
}

// ===== СООБЩЕНИЯ ОТ СТРАНИЦЫ =====
self.addEventListener('message', (event) => {
    console.log('💬 Message from page:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        console.log('🚀 Skip waiting, activating new SW...');
        self.skipWaiting();
    }
    
    if (event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('🗑️ Cache cleared');
            if (event.ports[0]) {
                event.ports[0].postMessage({ success: true });
            }
        });
    }
    
    if (event.data.type === 'GET_VERSION') {
        if (event.ports[0]) {
            event.ports[0].postMessage({ version: CACHE_VERSION });
        }
    }
});

// Уведомляем страницу о готовности
self.addEventListener('activate', (event) => {
    // После активации отправляем сообщение всем клиентам
    event.waitUntil(
        clients.matchAll().then((clients) => {
            clients.forEach((client) => {
                client.postMessage({
                    type: 'SW_ACTIVATED',
                    version: CACHE_VERSION
                });
            });
        })
    );
});

console.log(`📦 CardGift Service Worker ${CACHE_VERSION} loaded`);
