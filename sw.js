const CACHE_VERSION = 'rivers-v3.1.0';
const CACHES = {
  static: `${CACHE_VERSION}-static`,
  dynamic: `${CACHE_VERSION}-dynamic`,
  images: `${CACHE_VERSION}-images`
};

const MAX_CACHE_SIZE = 50;
const OFFLINE_PAGE = '/offline.html';
const SYNC_TAG = 'sync-attendance';
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

const DB_NAME = 'RiversDB';
const DB_VERSION = 2;
const STORES = {
  failedRequests: 'failedRequests',
  attendance: 'attendance',
  players: 'players',
  syncQueue: 'syncQueue',
  cachedData: 'cachedData'
};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.failedRequests)) {
        db.createObjectStore(STORES.failedRequests, {
          keyPath: 'id',
          autoIncrement: true
        });
      }

      if (!db.objectStoreNames.contains(STORES.attendance)) {
        const attendanceStore = db.createObjectStore(STORES.attendance, {
          keyPath: 'id',
          autoIncrement: true
        });
        attendanceStore.createIndex('synced', 'synced', { unique: false });
        attendanceStore.createIndex('date', 'date', { unique: false });
        attendanceStore.createIndex('playerId', 'playerId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.players)) {
        const playersStore = db.createObjectStore(STORES.players, {
          keyPath: 'id'
        });
        playersStore.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        db.createObjectStore(STORES.syncQueue, {
          keyPath: 'id',
          autoIncrement: true
        });
      }

      if (!db.objectStoreNames.contains(STORES.cachedData)) {
        const cachedStore = db.createObjectStore(STORES.cachedData, {
          keyPath: 'key'
        });
        cachedStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

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
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Error guardando asistencia local:', error);
    throw error;
  }
}

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

async function getCachedData(key, maxAge = 30 * 60 * 1000) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.cachedData], 'readonly');
      const store = tx.objectStore(STORES.cachedData);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result && Date.now() - result.timestamp < maxAge) {
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

async function syncAttendanceToSheets() {
  try {
    const unsyncedRecords = await getUnsyncedAttendance();
    if (!unsyncedRecords.length) {
      console.log('[SW] No hay registros pendientes de sincronizar');
      return { success: true, synced: 0 };
    }

    console.log(`[SW] Sincronizando ${unsyncedRecords.length} registros...`);
    let syncedCount = 0;
    for (const record of unsyncedRecords) {
      try {
        const url = record.sheetsUrl || '/api/attendance';
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(record)
        });

        if (response && response.ok) {
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

async function cacheStaticAssets(cache) {
  return cache.addAll(STATIC_ASSETS.map((url) => new Request(url, { cache: 'reload' })));
}

self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHES.static)
      .then(cacheStaticAssets)
      .then(() => self.skipWaiting())
      .catch((error) => console.error('[SW] Error en precacheo:', error))
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => !cacheName.startsWith(CACHE_VERSION))
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === 'POST' && (url.pathname.includes('/api/attendance') || url.hostname.includes('sheetbest.com'))) {
    event.respondWith(handlePostRequest(request));
    return;
  }

  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
    event.respondWith(cacheFirstStrategy(request, CACHES.images));
    return;
  }

  if (url.pathname.match(/\.(js|css|json|woff2|woff|ttf)$/i) || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request, CACHES.static));
    return;
  }

  if (request.destination === 'document' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  event.respondWith(networkFirstStrategy(request));
});

async function handlePostRequest(request) {
  try {
    const requestClone = request.clone();
    const body = await requestClone.json();
    const networkResponse = await fetch(request.clone());
    if (networkResponse) {
      return networkResponse;
    }
  } catch (error) {
    try {
      const fallbackRequest = request.clone();
      const body = await fallbackRequest.json();
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
      return new Response(JSON.stringify({
        success: false,
        message: 'No se pudo procesar la solicitud.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}

async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    fetch(request).then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
    }).catch(() => {});
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
    const fallbackResponse = await cache.match(request);
    if (fallbackResponse) return fallbackResponse;
    throw error;
  }
}

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

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncAttendanceToSheets());
  }
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  const { type } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
      );
      break;
    case 'SYNC_NOW':
      event.waitUntil(syncAttendanceToSheets());
      break;
    case 'GET_UNSYNCED_COUNT':
      event.waitUntil(
        getUnsyncedAttendance().then((records) => {
          event.source?.postMessage({ type: 'UNSYNCED_COUNT', count: records.length });
        })
      );
      break;
    default:
      break;
  }
});
