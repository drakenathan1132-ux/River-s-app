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

async function syncAttendanceToSheets() {
  try {
    const unsyncedRecords = await getUnsyncedAttendance();
    if (!unsyncedRecords.length) return { success: true, synced: 0 };

    let syncedCount = 0;
    for (const record of unsyncedRecords) {
      try {
        const response = await fetch(CONFIG.SHEETBEST_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });

        if (response.ok) {
          await markAsSynced(record.id);
          syncedCount++;
        }
      } catch (error) {
        console.error(`[SW] Falló sincronización:`, error);
      }
    }
    return { success: true, synced: syncedCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function cacheStaticAssets(cache) {
  return cache.addAll(STATIC_ASSETS.map((url) => new Request(url, { cache: 'reload' })));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHES.static)
      .then(cacheStaticAssets)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
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

  if (url.pathname.match(/\.(js|css|json|html)$/i) || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request, CACHES.static));
    return;
  }

  event.respondWith(networkFirstStrategy(request));
});

async function handlePostRequest(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (error) {
    const body = await request.clone().json();
    await saveAttendanceLocal(body);
    return new Response(JSON.stringify({ offline: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  return cachedResponse || fetch(request).then(response => {
    return caches.open(cacheName).then(cache => {
      cache.put(request, response.clone());
      return response;
    });
  }).catch(() => caches.match(OFFLINE_PAGE));
}

async function networkFirstStrategy(request) {
  return fetch(request).then(response => {
    return caches.open(CACHES.dynamic).then(cache => {
      cache.put(request, response.clone());
      return response;
    });
  }).catch(() => caches.match(request));
}

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncAttendanceToSheets());
  }
});
