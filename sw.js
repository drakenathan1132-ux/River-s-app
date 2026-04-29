// ============================================================================
// RIVERS TOCHITO CLUB - SERVICE WORKER
// Versión 3.0 - PWA Offline-First con Background Sync
// ============================================================================

const CACHE_VERSION = 'rivers-v3.0.0';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;
const CACHE_IMAGES = `${CACHE_VERSION}-images`;

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/checkin.html',
    '/app.js',
    '/manifest.json',
    '/offline.html',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

const OFFLINE_PAGE = '/offline.html';
const MAX_CACHE_SIZE = 50;

// ============================================================================
// INSTALL - Cachear archivos estáticos
// ============================================================================

self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...', CACHE_VERSION);
    
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {
                    cache: 'reload'
                })));
            })
            .then(() => self.skipWaiting())
            .catch((error) => {
                console.error('[SW] Error caching static assets:', error);
            })
    );
});

// ============================================================================
// ACTIVATE - Limpiar cachés viejos
// ============================================================================

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...', CACHE_VERSION);
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (!cacheName.startsWith(CACHE_VERSION)) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// ============================================================================
// FETCH - Estrategia híbrida
// ============================================================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar requests no-HTTP
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Ignorar requests de Chrome Extensions
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // ===== GOOGLE SHEETS API - Network First =====
    if (url.hostname === 'sheets.googleapis.com' || 
        url.hostname === 'www.googleapis.com' ||
        url.hostname === 'sheetbest.com' ||
        url.hostname.endsWith('.sheetbest.com')) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }
    
    // ===== APIs externas - Network First =====
    if (url.pathname.includes('/api/') || request.method === 'POST') {
        event.respondWith(networkFirstStrategy(request));
        return;
    }
    
    // ===== Imágenes - Cache First =====
    if (request.destination === 'image') {
        event.respondWith(cacheFirstStrategy(request, CACHE_IMAGES));
        return;
    }
    
    // ===== Assets estáticos - Cache First =====
    if (url.pathname.endsWith('.js') || 
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.json') ||
        url.pathname.endsWith('.woff2') ||
        url.pathname.endsWith('.woff')) {
        event.respondWith(cacheFirstStrategy(request, CACHE_STATIC));
        return;
    }
    
    // ===== HTML - Network First con fallback offline =====
    if (request.destination === 'document' || 
        request.headers.get('accept').includes('text/html')) {
        event.respondWith(networkFirstWithOfflineFallback(request));
        return;
    }
    
    // ===== Default - Network First =====
    event.respondWith(networkFirstStrategy(request));
});

// ============================================================================
// ESTRATEGIAS DE CACHÉ
// ============================================================================

// Cache First - Para assets estáticos e imágenes
async function cacheFirstStrategy(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Actualizar en background
            fetch(request)
                .then(response => {
                    if (response && response.status === 200) {
                        cache.put(request, response.clone());
                    }
                })
                .catch(() => {
                    // Silent fail
                });
            
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            limitCacheSize(cacheName, MAX_CACHE_SIZE);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache First Error:', error);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        throw error;
    }
}

// Network First - Para APIs y contenido dinámico
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_DYNAMIC);
            cache.put(request, networkResponse.clone());
            limitCacheSize(CACHE_DYNAMIC, MAX_CACHE_SIZE);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Si es POST y falló, guardar en IndexedDB para retry
        if (request.method === 'POST') {
            await saveFailedRequest(request);
        }
        
        throw error;
    }
}

// Network First con Offline Fallback - Para páginas HTML
async function networkFirstWithOfflineFallback(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_DYNAMIC);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache or offline page');
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const offlinePage = await caches.match(OFFLINE_PAGE);
        if (offlinePage) {
            return offlinePage;
        }
        
        return new Response('Offline - No hay conexión', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/html'
            })
        });
    }
}

// ============================================================================
// UTILIDADES
// ============================================================================

// Limitar tamaño del caché
async function limitCacheSize(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxItems) {
        const deleteCount = keys.length - maxItems;
        for (let i = 0; i < deleteCount; i++) {
            await cache.delete(keys[i]);
        }
    }
}

// Guardar requests fallidos para retry
async function saveFailedRequest(request) {
    try {
        const db = await openDB();
        const tx = db.transaction(['failedRequests'], 'readwrite');
        const store = tx.objectStore('failedRequests');
        
        const requestData = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: await request.clone().text(),
            timestamp: Date.now()
        };
        
        await store.add(requestData);
        console.log('[SW] Saved failed request for retry');
    } catch (error) {
        console.error('[SW] Error saving failed request:', error);
    }
}

// Abrir IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('RiversDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('failedRequests')) {
                db.createObjectStore('failedRequests', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
            }
        };
    });
}

// ============================================================================
// BACKGROUND SYNC - Retry requests fallidos
// ============================================================================

self.addEventListener('sync', (event) => {
    console.log('[SW] Background Sync triggered:', event.tag);
    
    if (event.tag === 'sync-attendance') {
        event.waitUntil(retryFailedRequests());
    }
});

async function retryFailedRequests() {
    try {
        const db = await openDB();
        const tx = db.transaction(['failedRequests'], 'readonly');
        const store = tx.objectStore('failedRequests');
        const requests = await store.getAll();
        
        console.log(`[SW] Retrying ${requests.length} failed requests`);
        
        for (const requestData of requests) {
            try {
                const response = await fetch(requestData.url, {
                    method: requestData.method,
                    headers: requestData.headers,
                    body: requestData.body
                });
                
                if (response.ok) {
                    const deleteTx = db.transaction(['failedRequests'], 'readwrite');
                    const deleteStore = deleteTx.objectStore('failedRequests');
                    await deleteStore.delete(requestData.id);
                    console.log('[SW] Successfully retried request:', requestData.url);
                }
            } catch (error) {
                console.error('[SW] Retry failed:', error);
            }
        }
    } catch (error) {
        console.error('[SW] Error retrying failed requests:', error);
    }
}

// ============================================================================
// MENSAJES - Comunicación con la app
// ============================================================================

self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
    
    if (event.data && event.data.type === 'SYNC_NOW') {
        event.waitUntil(retryFailedRequests());
    }
});

// ============================================================================
// PUSH NOTIFICATIONS (preparado para futuro)
// ============================================================================

self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'RIVERS Tochito Club';
    const options = {
        body: data.body || 'Nueva notificación',
        icon: '/android-192x192-icon.png',
        badge: '/favicon-32x32.png',
        data: data,
        vibrate: [200, 100, 200],
        tag: 'rivers-notification'
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});

console.log('[SW] Service Worker loaded successfully');