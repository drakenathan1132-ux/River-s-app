/* =========================================
   RIVERS TOCHITO CLUB - SERVICE WORKER
   Versión 3.1.0 - PWA con Auto-Sync
   ========================================= */

// --- CONFIGURACIÓN Y CONSTANTES ---
const CACHE_VERSION = 'rivers-v3.1.0';
const CACHES = {
    static: `${CACHE_VERSION}-static`,
    dynamic: `${CACHE_VERSION}-dynamic`,
    images: `${CACHE_VERSION}-images`
};

// Configuración de límites y archivos
const MAX_CACHE_SIZE = 50;
const OFFLINE_PAGE = '/offline.html';
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutos

// Lista de activos estáticos a cachear
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

// --- INDEXEDDB MEJORADO ---
const DB_NAME = 'RiversDB';
const DB_VERSION = 2;
const STORES = {
    failedRequests: 'failedRequests',
    attendance: 'attendance',
    players: 'players',
    syncQueue: 'syncQueue',
    cachedData: 'cachedData'
};

// Abrir/Crear IndexedDB con múltiples stores
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Store para requests fallidos (POST que no se enviaron)
            if (!db.objectStoreNames.contains(STORES.failedRequests)) {
                db.createObjectStore(STORES.failedRequests, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
            }
            
            // Store para registros de asistencia locales
            if (!db.objectStoreNames.contains(STORES.attendance)) {
                const attendanceStore = db.createObjectStore(STORES.attendance, { 
                    keyPath: 'id',
                    autoIncrement: true
                });
                attendanceStore.createIndex('playerId', 'playerId', { unique: false });
                attendanceStore.createIndex('date', 'date', { unique: false });
                attendanceStore.createIndex('synced', 'synced', { unique: false });
            }
            
            // Store para jugadores
            if (!db.objectStoreNames.contains(STORES.players)) {
                const playersStore = db.createObjectStore(STORES.players, { 
                    keyPath: 'id'
                });
                playersStore.createIndex('name', 'name', { unique: false });
            }
            
            // Store para cola de sincronización
            if (!db.objectStoreNames.contains(STORES.syncQueue)) {
                db.createObjectStore(STORES.syncQueue, { 
                    keyPath: 'id',
                    autoIncrement: true 
                });
            }
            
            // Store para datos cacheados de Google Sheets
            if (!db.objectStoreNames.contains(STORES.cachedData)) {
                const cachedStore = db.createObjectStore(STORES.cachedData, { 
                    keyPath: 'key'
                });
                cachedStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// --- FUNCIONES DE DATOS ---

// Guardar asistencia local
async function saveAttendanceLocal(attendanceData) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.attendance], 'readwrite');
            const store = tx.objectStore(STORES.attendance);
            
            const data = {
                ...attendanceData,
                synced: false,
                timestamp: Date.now()
            };
            
            const request = store.add(data);
            request.onsuccess = () => {
                console.log('[SW] Asistencia guardada localmente:', data);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('[SW] Error guardando asistencia local:', error);
        throw error;
    }
}

// Leer todos los registros de asistencia no sincronizados
async function getUnsyncedAttendance() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.attendance], 'readonly');
            const store = tx.objectStore(STORES.attendance);
            const index = store.index('synced');
            const request = index.getAll(false);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('[SW] Error leyendo asistencias no sincronizadas:', error);
        return [];
    }
}

// Marcar registro como sincronizado
async function markAsSynced(recordId) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.attendance], 'readwrite');
            const store = tx.objectStore(STORES.attendance);
            const getRequest = store.get(recordId);
            
            getRequest.onsuccess = () => {
                const data = getRequest.result;
                if (data) {
                    data.synced = true;
                    data.syncedAt = Date.now();
                    const updateRequest = store.put(data);
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    } catch (error) {
        console.error('[SW] Error marcando como sincronizado:', error);
    }
}

// Guardar datos cacheados de Google Sheets
async function saveCachedData(key, data) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.cachedData], 'readwrite');
            const store = tx.objectStore(STORES.cachedData);
            
            const cacheData = {
                key,
                data,
                timestamp: Date.now()
            };
            
            const request = store.put(cacheData);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('[SW] Error guardando datos en caché:', error);
    }
}

// Leer datos cacheados
async function getCachedData(key, maxAge = 30 * 60 * 1000) { // 30 min por defecto
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.cachedData], 'readonly');
            const store = tx.objectStore(STORES.cachedData);
            const request = store.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                if (result && (Date.now() - result.timestamp < maxAge)) {
                    resolve(result.data);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('[SW] Error leyendo datos cacheados:', error);
        return null;
    }
}

// --- SINCRONIZACIÓN AUTOMÁTICA ---

// Sincronizar asistencias pendientes con Google Sheets
async function syncAttendanceToSheets() {
    try {
        const unsyncedRecords = await getUnsyncedAttendance();
        
        if (unsyncedRecords.length === 0) {
            console.log('[SW] No hay registros pendientes de sincronizar');
            return { success: true, synced: 0 };
        }
        
        console.log(`[SW] Sincronizando ${unsyncedRecords.length} registros...`);
        let syncedCount = 0;
        
        for (const record of unsyncedRecords) {
            try {
                // Enviar a Google Sheets
                const response = await fetch(record.sheetsUrl || '/api/attendance', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        playerId: record.playerId,
                        playerName: record.playerName,
                        date: record.date,
                        time: record.time,
                        status: record.status || 'present'
                    })
                });
                
                if (response.ok) {
                    await markAsSynced(record.id);
                    syncedCount++;
                    console.log(`[SW] Registro ${record.id} sincronizado exitosamente`);
                }
            } catch (error) {
                console.error(`[SW] Error sincronizando registro ${record.id}:`, error);
            }
        }
        
        return { success: true, synced: syncedCount, total: unsyncedRecords.length };
    } catch (error) {
        console.error('[SW] Error en sincronización automática:', error);
        return { success: false, error: error.message };
    }
}

// Leer registros desde Google Sheets y cachear
async function fetchAndCacheAttendance(sheetsUrl) {
    try {
        const response = await fetch(sheetsUrl);
        
        if (response.ok) {
            const data = await response.json();
            await saveCachedData('attendance_records', data);
            console.log('[SW] Registros de asistencia descargados y cacheados');
            return data;
        }
    } catch (error) {
        console.error('[SW] Error descargando registros:', error);
        // Intentar devolver datos cacheados
        const cachedData = await getCachedData('attendance_records', 24 * 60 * 60 * 1000); // 24h
        if (cachedData) {
            console.log('[SW] Devolviendo registros cacheados (offline)');
            return cachedData;
        }
        throw error;
    }
}

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
        Promise.all([
            // Limpiar cachés antiguos
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (!cacheName.startsWith(CACHE_VERSION)) {
                            console.log('[SW] Eliminando caché antiguo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Claim clients
            self.clients.claim(),
            // Iniciar sincronización automática
            startAutoSync()
        ])
    );
});

// Sincronización automática periódica
let syncTimer = null;

async function startAutoSync() {
    console.log('[SW] Iniciando sincronización automática cada 5 minutos');
    
    // Sincronizar inmediatamente
    await syncAttendanceToSheets();
    
    // Programar sincronizaciones periódicas
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(async () => {
        console.log('[SW] Ejecutando sincronización periódica...');
        await syncAttendanceToSheets();
    }, SYNC_INTERVAL);
}

// --- EVENTO: FETCH (Manejador de Peticiones) ---
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Filtros de seguridad
    if (!request.url.startsWith('http')) return;
    if (url.protocol === 'chrome-extension:') return;

    // A. GOOGLE SHEETS API - Network First con caché de respaldo
    if (url.hostname.includes('googleapis.com') || url.pathname.includes('/api/attendance')) {
        event.respondWith(networkFirstWithCache(request));
        return;
    }

    // B. Imágenes - Cache First
    if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
        event.respondWith(cacheFirstStrategy(request, CACHES.images));
        return;
    }

    // C. Assets Estáticos - Cache First
    if (url.pathname.match(/\.(js|css|json|woff2|woff|ttf)$/i)) {
        event.respondWith(cacheFirstStrategy(request, CACHES.static));
        return;
    }

    // D. HTML - Network First con offline fallback
    if (request.destination === 'document' || 
        (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
        event.respondWith(networkFirstWithOfflineFallback(request));
        return;
    }

    // E. Default - Network First
    event.respondWith(networkFirstStrategy(request));
});

// --- ESTRATEGIAS DE CACHÉ MEJORADAS ---

// Network First con caché de respaldo mejorado
async function networkFirstWithCache(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            // Cachear la respuesta
            const cache = await caches.open(CACHES.dynamic);
            cache.put(request, networkResponse.clone());
            
            // Si es una lectura de registros (GET), también guardar en IndexedDB
            if (request.method === 'GET' && request.url.includes('attendance')) {
                const clonedResponse = networkResponse.clone();
                const data = await clonedResponse.json();
                await saveCachedData('attendance_records', data);
            }
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Red falló, intentando caché:', request.url);
        
        // Intentar caché HTTP
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        
        // Intentar IndexedDB para datos de asistencia
        if (request.url.includes('attendance')) {
            const cachedData = await getCachedData('attendance_records', 24 * 60 * 60 * 1000);
            if (cachedData) {
                return new Response(JSON.stringify(cachedData), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        
        // Si es un POST (nuevo registro), guardar localmente
        if (request.method === 'POST') {
            try {
                const requestClone = request.clone();
                const body = await requestClone.json();
                await saveAttendanceLocal(body);
                
                return new Response(JSON.stringify({ 
                    success: true, 
                    offline: true,
                    message: 'Registro guardado localmente. Se sincronizará automáticamente.'
                }), {
                    status: 202,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (dbError) {
                console.error('[SW] Error guardando registro offline:', dbError);
            }
        }
        
        throw error;
    }
}

// Cache First (sin cambios)
async function cacheFirstStrategy(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        fetch(request)
            .then(response => {
                if (response && response.status === 200) {
                    cache.put(request, response.clone());
                }
            })
            .catch(() => { });
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            limitCacheSize(cacheName, MAX_CACHE_SIZE);
        }
        return networkResponse;
    } catch (error) {
        const fallbackResponse = await caches.match(request);
        if (fallbackResponse) return fallbackResponse;
        throw error;
    }
}

// Network First (sin cambios significativos)
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
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        throw error;
    }
}

// Network First con Offline Fallback (sin cambios)
async function networkFirstWithOfflineFallback(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHES.dynamic);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        
        const offlinePage = await caches.match(OFFLINE_PAGE);
        if (offlinePage) return offlinePage;
        
        return new Response('<h1>Offline</h1><p>No hay conexión a internet.</p>', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/html' })
        });
    }
}

// --- UTILIDADES ---

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

// --- BACKGROUND SYNC ---

self.addEventListener('sync', (event) => {
    console.log('[SW] Sincronización en background activada:', event.tag);
    
    if (event.tag === 'sync-attendance') {
        event.waitUntil(syncAttendanceToSheets());
    }
});

// --- MENSAJES ---

self.addEventListener('message', async (event) => {
    console.log('[SW] Mensaje recibido:', event.data);
    if (!event.data) return;

    const { type, data } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(
                caches.keys().then((cacheNames) => {
                    return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
                })
            );
            break;
            
        case 'SYNC_NOW':
            event.waitUntil(syncAttendanceToSheets());
            break;
            
        case 'GET_UNSYNCED_COUNT':
            const unsynced = aw
