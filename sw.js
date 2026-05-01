RIVERS TOCHITO CLUB - SERVICE WORKER
   Versión 3.0.1 - PWA Offline-First
   
  //CONFIGURACIÓN Y CONSTANTES 
const CACHE_VERSION = 'rivers-v3.0.1';
const CACHES = {
    static: `${CACHE_VERSION}-static`,
    dynamic: `${CACHE_VERSION}-dynamic`,
    images: `${CACHE_VERSION}-images`
};

   // Configuración de límites y archivos
const MAX_CACHE_SIZE = 50;
const OFFLINE_PAGE = '/offline.html';

   // Lista de activos estáticos a cachear
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/checkin.html',
    '/app.js',
    '/manifest.json',
    '/offline.html',
    // Assets externos fijos
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

// --- EVENTO: INSTALL ---
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHES.static)
            .then((cache) => {
                console.log('[SW] Precachando assets estáticos');
                return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {
                    cache: 'reload'
                })));
            })
            .then(() => self.skipWaiting())
            .catch((error) => {
                console.error('[SW] Error en precacheo:', error);
            })
    );
});

// --- EVENTO: ACTIVATE ---
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando Service Worker...', CACHE_VERSION);
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Eliminar cachés antiguos que no coincidan con la versión actual
                        if (!cacheName.startsWith(CACHE_VERSION)) {
                            console.log('[SW] Eliminando caché antiguo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// --- EVENTO: FETCH (Manejador de Peticiones) ---
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 1. Filtros de seguridad e ignorados
    if (!request.url.startsWith('http')) return;
    if (url.protocol === 'chrome-extension:') return;

    // 2. Enrutamiento de estrategias de caché

    // A. GOOGLE SHEETS API & APIS Externas (POST o /api/) - Network First
    if (url.hostname === 'sheets.googleapis.com' || 
        url.hostname === 'www.googleapis.com' ||
        url.pathname.includes('/api/') || 
        request.method === 'POST') {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // B. Imágenes - Cache First (con actualización en background)
    if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp)$ /i)) {
        event.respondWith(cacheFirstStrategy(request, CACHES.images));
        return;
    }

    // C. Assets Estáticos (.js, .css, .json, fonts) - Cache First
    if (url.pathname.match(/\.(js|css|json|woff2|woff|ttf)$ /i)) {
        event.respondWith(cacheFirstStrategy(request, CACHES.static));
        return;
    }

    // D. HTML Documentos - Network First con fallback offline
    if (request.destination === 'document' || 
        (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
        event.respondWith(networkFirstWithOfflineFallback(request));
        return;
    }

    // E. Default - Network First
    event.respondWith(networkFirstStrategy(request));
});

// --- ESTRATEGIAS DE CACHÉ ---

// 1. Cache First (Para assets estáticos e imágenes)
async function cacheFirstStrategy(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    // Si está en caché, devolverlo y actualizar en background
    if (cachedResponse) {
        fetch(request)
            .then(response => {
                if (response && response.status === 200) {
                    cache.put(request, response.clone());
                }
            })
            .catch(() => { /* Silent fail if background fetch fails */ });
        return cachedResponse;
    }
    
    // Si no está en caché, ir a la red
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            limitCacheSize(cacheName, MAX_CACHE_SIZE);
        }
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache First Error:', error);
        // Fallback final: intentar buscar en cualquier caché si la red falla
        const fallbackResponse = await caches.match(request);
        if (fallbackResponse) return fallbackResponse;
        throw error;
    }
}

// 2. Network First (Para APIs y contenido dinámico)
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHES.dynamic);
            cache.put(request, networkResponse.clone());
            limitCacheSize(CACHES.dynamic, MAX_CACHE_SIZE);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Red falló, intentando caché:', request.url);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        
        // Si es un registro (POST) y falló la red, guardar en IndexedDB para Background Sync
        if (request.method === 'POST') {
            // Intentamos guardar la petición. Esto es asíncrono pero no bloqueamos la respuesta de error
            saveFailedRequest(request).catch(dbError => console.error('[SW] Error guardando POST en IDB:', dbError));
        }
        
        throw error;
    }
}

// 3. Network First con Offline Fallback (Para páginas HTML)
async function networkFirstWithOfflineFallback(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHES.dynamic);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Red HTML falló, intentando caché o página offline');
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        
        // Si no hay caché, mostrar la página offline precachada
        const offlinePage = await caches.match(OFFLINE_PAGE);
        if (offlinePage) return offlinePage;
        
        // Fallback genérico si ni offline.html está disponible
        return new Response('<h1>Offline</h1><p>No hay conexión a internet y no se pudo cargar la página.</p>', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/html' })
        });
    }
}

// --- UTILIDADES ---

// Limitar tamaño del caché (LRU - Least Recently Used)
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

// --- INDEXEDDB & BACKGROUND SYNC ---

const DB_NAME = 'RiversDB';
const DB_VERSION = 1;
const OBJ_STORE_FAILED = 'failedRequests';

// Abrir/Crear IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(OBJ_STORE_FAILED)) {
                db.createObjectStore(OBJ_STORE_FAILED, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
            }
        };
    });
}

// Guardar requests fallidos (POST) para retry
async function saveFailedRequest(request) {
    try {
        // Clonamos la petición antes de leer el cuerpo, ya que solo se puede leer una vez
        const requestClone = request.clone();
        const bodyText = await requestClone.text();
        const db = await openDB();
        
        return new Promise((resolve, reject) => {
            const tx = db.transaction([OBJ_STORE_FAILED], 'readwrite');
            const store = tx.objectStore(OBJ_STORE_FAILED);
            
            const requestData = {
                url: request.url,
                method: request.method,
                headers: Object.fromEntries(request.headers.entries()),
                body: bodyText,
                timestamp: Date.now()
            };
            
            const addRequest = store.add(requestData);
            addRequest.onsuccess = () => {
                console.log('[SW] Registro guardado en IndexedDB para sincronización diferida');
                resolve();
            };
            addRequest.onerror = () => reject(addRequest.error);
        });
    } catch (error) {
        console.error('[SW] Error crítico guardando petición fallida:', error);
    }
}

// Reintentar requests fallidos
async function retryFailedRequests() {
    try {
        const db = await openDB();
        
        // Leer todas las peticiones
        const requests = await new Promise((resolve, reject) => {
            const tx = db.transaction([OBJ_STORE_FAILED], 'readonly');
            const store = tx.objectStore(OBJ_STORE_FAILED);
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        });
        
        if (requests.length === 0) return;
        
        console.log(`[SW] Sincronización: Reintentando ${requests.length} registros fallidos`);
        
        for (const requestData of requests) {
            try {
                // Reconstruir y enviar la petición POST
                const response = await fetch(requestData.url, {
                    method: requestData.method,
                    headers: requestData.headers,
                    body: requestData.body
                });
                
                if (response.ok) {
                    // Si el envío fue exitoso, eliminar de IndexedDB
                    const deleteDb = await openDB();
                    await new Promise((resolve, reject) => {
                        const deleteTx = deleteDb.transaction([OBJ_STORE_FAILED], 'readwrite');
                        const deleteStore = deleteTx.objectStore(OBJ_STORE_FAILED);
                        const deleteRequest = deleteStore.delete(requestData.id);
                        deleteRequest.onsuccess = () => resolve();
                        deleteRequest.onerror = () => reject(deleteRequest.error);
                    });
                    console.log('[SW] Registro sincronizado con éxito:', requestData.url);
                }
            } catch (error) {
                console.error('[SW] Error reintentando registro (seguirá en IDB):', error);
            }
        }
    } catch (error) {
        console.error('[SW] Error crítico durante la sincronización:', error);
    }
}

// EVENTO: SYNC (Background Sync triggered)
self.addEventListener('sync', (event) => {
    console.log('[SW] Sincronización en background activada:', event.tag);
    if (event.tag === 'sync-attendance') {
        event.waitUntil(retryFailedRequests());
    }
});

// --- MENSAJES --- Comunicación con la app
self.addEventListener('message', (event) => {
    console.log('[SW] Mensaje recibido:', event.data);
    if (!event.data) return;

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
            })
        );
    }
    
    if (event.data.type === 'SYNC_NOW') {
        event.waitUntil(retryFailedRequests());
    }
});

PUSH NOTIFICATIONS

self.addEventListener('push', (event) => {
    console.log('[SW] Notificación push recibida');

    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: 'RIVERS Tochito Club', body: event.data ? event.data.text() : 'Nueva notificación' };
    }

    const title = data.title || 'RIVERS Tochito Club';
    const options = {
        body: data.body || 'Nuevo aviso de la liga',
        icon: '/android-192x192-icon.png',
        badge: '/favicon-32x32.png',
        data: data,
        vibrate: [200, 100, 200],
        tag: 'rivers-notification',
        actions: [
            { action: 'open', title: 'Ver app' }
        ]
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notificación clickeada');
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // Si la app está abierta, enfocarla
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no está abierta, abrir una nueva ventana
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

console.log('[SW] Service Worker cargado correctamente');
