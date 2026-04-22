// ========================================
// RIVERS TOCHITO CLUB - SERVICE WORKER PRO
// Network-First + Offline Queue + Easter Eggs
// ========================================

const CACHE_VERSION = 'v2.1.0';
const CACHE_NAME = `rivers-tochito-${CACHE_VERSION}`;
const CACHE_RUNTIME = `runtime-${CACHE_VERSION}`;
const OFFLINE_QUEUE = 'offline-queue';

// Apps Script endpoint
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw_4wK-gG4yhXQUNUWYV8r2OjMcxETNWNnWXsI-m7nPBOCZPZkKg14F9OMcNrt-_vTjtA/exec';

// Assets críticos para caché estático
const STATIC_ASSETS = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    './logo.png',
    './apple-180x180-icon.png',
    './android-192x192-icon.png',
    './android-512x512-icon.png',
    './reglamento.pdf',
    './offline.html'
];

// CDN resources
const CDN_RESOURCES = [
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

// ========================================
// INSTALL
// ========================================
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing ${CACHE_VERSION}...`);
    
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then((cache) => {
                return cache.addAll(STATIC_ASSETS).catch((err) => {
                    console.warn('[SW] Some assets failed to cache:', err);
                    return Promise.resolve();
                });
            }),
            caches.open(CACHE_RUNTIME).then((cache) => {
                return Promise.all(
                    CDN_RESOURCES.map((url) => {
                        return fetch(url, { mode: 'cors' })
                            .then((response) => cache.put(url, response))
                            .catch((err) => console.warn(`[SW] CDN cache failed for ${url}:`, err));
                    })
                );
            }),
            initOfflineQueue()
        ])
    );
    
    self.skipWaiting();
});

// ========================================
// ACTIVATE
// ========================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('rivers-tochito-') && name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            }),
            limitCacheSize(CACHE_RUNTIME, 50)
        ])
    );
    
    self.clients.claim();
});

// ========================================
// FETCH
// ========================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    if (url.href.includes('script.google.com')) {
        event.respondWith(handleAppsScriptRequest(request));
        return;
    }
    
    if (CDN_RESOURCES.some((cdn) => request.url.includes(cdn))) {
        event.respondWith(staleWhileRevalidate(request, CACHE_RUNTIME));
        return;
    }
    
    if (STATIC_ASSETS.some((asset) => request.url.endsWith(asset))) {
        event.respondWith(cacheFirst(request, CACHE_NAME));
        return;
    }
    
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, CACHE_NAME));
        return;
    }
    
    event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// ========================================
// ESTRATEGIA: Apps Script
// ========================================
async function handleAppsScriptRequest(request) {
    try {
        const response = await fetch(request, {
            mode: 'cors',
            credentials: 'omit',
            redirect: 'follow'
        });
        
        if (response.ok) {
            if (request.method === 'GET') {
                const cache = await caches.open(CACHE_RUNTIME);
                cache.put(request, response.clone());
            }
            return response;
        }
        
        throw new Error(`Apps Script error: ${response.status}`);
        
    } catch (error) {
        console.error('[SW] Apps Script request failed:', error);
        
        if (request.method === 'POST') {
            await addToOfflineQueue(request);
            
            return new Response(
                JSON.stringify({
                    success: false,
                    offline: true,
                    message: 'Sin conexión. Tu asistencia se guardó localmente y se enviará cuando vuelvas online.'
                }),
                {
                    status: 202,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return new Response(
            JSON.stringify({
                success: false,
                offline: true,
                message: 'Sin conexión y no hay datos en caché.'
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// ========================================
// ESTRATEGIA: Cache-First
// ========================================
async function cacheFirst(request, cacheName) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        fetch(request).then((response) => {
            if (response.ok) {
                caches.open(cacheName).then((cache) => cache.put(request, response));
            }
        }).catch(() => {});
        
        return cachedResponse;
    }
    
    const response = await fetch(request);
    if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
    }
    return response;
}

// ========================================
// ESTRATEGIA: Network-First
// ========================================
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return caches.match('./offline.html') || new Response('Offline', { status: 503 });
    }
}

// ========================================
// ESTRATEGIA: Stale-While-Revalidate
// ========================================
async function staleWhileRevalidate(request, cacheName) {
    const cachedResponse = await caches.match(request);
    
    const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
            caches.open(cacheName).then((cache) => {
                cache.put(request, response.clone());
            });
        }
        return response;
    }).catch(() => cachedResponse);
    
    return cachedResponse || fetchPromise;
}

// ========================================
// BACKGROUND SYNC
// ========================================
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-offline-queue') {
        event.waitUntil(processOfflineQueue());
    }
});

async function processOfflineQueue() {
    const db = await openDB();
    const tx = db.transaction(OFFLINE_QUEUE, 'readonly');
    const store = tx.objectStore(OFFLINE_QUEUE);
    const requests = await store.getAll();
    
    console.log(`[SW] Processing ${requests.length} queued requests...`);
    
    for (const item of requests) {
        try {
            const response = await fetch(item.url, {
                method: item.method,
                headers: item.headers,
                body: item.body
            });
            
            if (response.ok) {
                const deleteTx = db.transaction(OFFLINE_QUEUE, 'readwrite');
                await deleteTx.objectStore(OFFLINE_QUEUE).delete(item.id);
                console.log(`[SW] Synced request ${item.id}`);
            }
        } catch (error) {
            console.error(`[SW] Failed to sync request ${item.id}:`, error);
        }
    }
}

async function addToOfflineQueue(request) {
    const db = await openDB();
    const tx = db.transaction(OFFLINE_QUEUE, 'readwrite');
    const store = tx.objectStore(OFFLINE_QUEUE);
    
    const body = request.method === 'POST' ? await request.clone().text() : null;
    
    await store.add({
        id: Date.now(),
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: body,
        timestamp: Date.now()
    });
    
    console.log('[SW] Request added to offline queue');
    
    if ('sync' in self.registration) {
        await self.registration.sync.register('sync-offline-queue');
    }
}

// ========================================
// IndexedDB
// ========================================
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('RiversTochitoDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(OFFLINE_QUEUE)) {
                db.createObjectStore(OFFLINE_QUEUE, { keyPath: 'id' });
            }
        };
    });
}

async function initOfflineQueue() {
    try {
        await openDB();
        console.log('[SW] IndexedDB initialized');
    } catch (error) {
        console.error('[SW] IndexedDB init failed:', error);
    }
}

// ========================================
// UTILITY
// ========================================
async function limitCacheSize(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxItems) {
        const keysToDelete = keys.slice(0, keys.length - maxItems);
        await Promise.all(keysToDelete.map((key) => cache.delete(key)));
        console.log(`[SW] Trimmed ${keysToDelete.length} items from ${cacheName}`);
    }
}

// ========================================
// MESSAGE HANDLER
// ========================================
self.addEventListener('message', (event) => {
    const { type, data } = event.data || {};
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_URLS':
            event.waitUntil(
                caches.open(CACHE_NAME).then((cache) => cache.addAll(data.urls))
            );
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(
                caches.keys().then((names) => {
                    return Promise.all(names.map((name) => caches.delete(name)));
                })
            );
            break;
            
        case 'GET_QUEUE_SIZE':
            event.waitUntil(
                openDB().then((db) => {
                    const tx = db.transaction(OFFLINE_QUEUE, 'readonly');
                    return tx.objectStore(OFFLINE_QUEUE).count();
                }).then((count) => {
                    event.ports[0].postMessage({ queueSize: count });
                })
            );
            break;
            
        case 'UNLOCK_COACH_MODE':
            if (data.pin === '2501') {
                event.ports[0].postMessage({
                    unlocked: true,
                    features: ['export_csv', 'bulk_delete', 'reset_season']
                });
            }
            break;
    }
});

// ========================================
// PUSH NOTIFICATIONS
// ========================================
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'RIVERS Tochito Club';
    const options = {
        body: data.body || 'Nueva notificación',
        icon: './android-512x512-icon.png',
        badge: './logo.png',
        data: data.url || './',
        vibrate: [200, 100, 200]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data)
    );
});