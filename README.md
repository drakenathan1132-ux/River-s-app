 # 🏈 RIVERS Tochito Club - Sistema de Gestión PWA

Sistema integral de gestión de asistencias para club de flag football femenil. PWA offline-first con geolocalización GPS, QR dinámico y sincronización automática con Google Sheets.


   ![Version](https://img.shields.io/badge/version-2.1.0-orange)




   ![PWA](https://img.shields.io/badge/PWA-Ready-success)




   ![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-blue)




   ![Security](https://img.shields.io/badge/security-SRI%20Enabled-green)
   

   **🔗 Producción:** 
   [https://riversapp.vercel.app](https://riversapp.vercel.app)  

   **📊 Google Sheets:**
   
---
## 🚀 Características Principales
### ✅ Sistema de Asistencias
   - **Geofencing GPS**: Check-in solo si estás en el campo (300m de tolerancia)
    - **QR Protegido**: Código generado únicamente en el panel de coach (accesible solo con PIN)
    - **Flujo de Check-in**: QR → checkin.html → registro → redirección a dashboard principal
    - **Sin Restricción Horaria**: Check-in disponible en cualquier momento del día
    - **Device ID Único**: 1 registro por dispositivo por día (anti-fraude)
### 🔒 Reglas de Negocio
   - ✅ **Asistencia**: Registro exitoso en cualquier momento del día
    - ❌ **Falta**: No registrar asistencia (configurable por coach)
### 📱 Funcionalidades Clave
   - **Offline-First**: Funciona sin internet, sincroniza automáticamente
    - **PWA Instalable**: Se instala como app nativa (iOS/Android)
    - **Panel de Coach**: Gestión con 4 PINs, exportación CSV, reset de temporada, generación de QR
    - **Dashboard Principal**: Avisos del club, estadísticas personales, acceso a check-in
    - **Check-in Seguro**: Solo accesible vía QR generado por coach, con validación GPS y horario

 ### 🎯 Stack Tecnológico
| Capa | Tecnología |
|------|-----------|
| **Frontend** | HTML5, Tailwind CSS, Vanilla JS |
| **PWA** | Service Worker (Network-First + Background Sync) |
| **Backend** | Google Sheets + SheetBest REST API |
| **Sensores** | HTML5-QRCode (Cámara) + Geolocation API (GPS) |
| **Seguridad** | SRI (Subresource Integrity) en CDN externos |
| **Hosting** | Vercel (Deploy automático desde GitHub) |

---

   ## 📦 Estructura del Proyecto
   River-s-app/

├── index.html              # App principal (Inicio, Coach Panel)

├── app.js                  # Lógica de negocio y geolocalización

├── sw.js                   # Service Worker + Offline Queue

├── checkin.html            # Validador GPS/QR/Horario (destino del QR)

├── manifest.json           # Configuración PWA (iconos, shortcuts)

├── reglamento.pdf          # Reglamento oficial del club

├── offline.html            # Fallback sin conexión

├── vercel.json             # Headers de seguridad y rewrites SPA

├── README.md               # Esta documentación

└── assets/

├── logo.png                # Logo principal

├── android-192x192-icon.png

├── android-512x512-icon.png

└── apple-180x180-icon.png

---
## 🔧 Configuración Inicial

   ### 1️⃣ Google Sheets + SheetBest
    **URL de API:**
    https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55  

**Estructura de columnas necesarias:**
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `nombre` | string | Nombre completo de la jugadora |
| `tipo` | string | `asistencia` o `retardo` |
| `timestamp` | string | ISO 8601 (ej: 2026-04-30T16:50:00Z) |
| `session` | string | Fecha de sesión (YYYY-MM-DD) |
| `deviceId` | string | ID único del dispositivo |
| `diffMinutes` | number | Minutos de diferencia vs hora oficial |
| `latitud` | number | Coordenada GPS (opcional) |
| `longitud` | number | Coordenada GPS (opcional) |

### 2️⃣ Coordenadas del Campo
Editar en `app.js` (líneas 3-8):
``javascript
const CONFIG = 

    {
    SHEETBEST_URL: 'https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55',
    COACH_PINS: ['2501', '2502', '2503', '2504'],
    CHECKIN_URL: window.location.origin + '/checkin.html',
    TARGET_LAT: 19.0732,    // ← CAMBIAR A TU CAMPO
    TARGET_LON: -97.0461,   // ← CAMBIAR A TU CAMPO
    MAX_DISTANCE_KM: 0.3    // 300 metros tolerancia
    };

Cómo obtener coordenadas:
Google Maps → Click derecho en el campo → "¿Qué hay aquí?"
Copiar los números que aparecen (ej: 19.0732, -97.0461)
Pegar en TARGET_LAT y TARGET_LON

3️⃣ PINs de Coach
4 coaches con acceso al panel (editable en app.js):
COACH_PINS: ['2501', '2502', '2503', '2504']
Cambiar PINs:
Editar array en app.js
Commit y push a GitHub
Vercel redespliega automáticamente

4️⃣ Configuración de Ubicación
Editar en `app.js` (líneas 3-8):
``javascript
const CONFIG = 

    {
    SHEETBEST_URL: 'https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55',
    COACH_PINS: ['2501', '2502', '2503', '2504'],
    CHECKIN_URL: window.location.origin + '/checkin.html',
    TARGET_LAT: 19.0732,    // ← CAMBIAR A TU CAMPO
    TARGET_LON: -97.0461,   // ← CAMBIAR A TU CAMPO
    MAX_DISTANCE_KM: 0.3    // 300 metros tolerancia
    };

Cómo obtener coordenadas:
Google Maps → Click derecho en el campo → "¿Qué hay aquí?"
Copiar los números que aparecen (ej: 19.0732, -97.0461)
Pegar en TARGET_LAT y TARGET_LON

   🚀 Despliegue en Vercel
Deploy Automático (Recomendado)
Push al repositorio GitHub:
git add .
git commit -m "Actualizar configuración"
git push origin main

   Vercel detecta cambios y despliega automáticamente:
      
  URL de producción: 
   
    https://riversapp.vercel.app

Preview URLs para cada commit
Deploy Manual (CLI)

   # Instalar Vercel CLI
    npm install -g vercel

   # Deploy a producción
    vercel --prod

   Configuración de Vercel
El archivo vercel.json incluye:
Headers de seguridad (X-Frame-Options, CSP, etc.)
Service Worker headers optimizados
Rewrites para SPA routing
🔒 Seguridad Implementada

   ✅ Mitigaciones de Vulnerabilidades
Vulnerabilidad
Solución Implementada
URL Injection (CWE-20)
Validación estricta con new URL() + whitelist de dominios permitidos

   Script Tampering
SRI (Subresource Integrity) en todos los CDN externos
API Abuse
Rate limiting en Service Worker + whitelist de hosts API
XSS
Headers X-Content-Type-Options: nosniff, X-Frame-Options: DENY

   Clickjacking
Headers X-Frame-Options: DENY en todas las respuestas
Ejemplo de Validación Segura (app.js)
function handleScan(qrData)

    {try
    { const url = new URL(qrData);
        const allowed = ['riversapp.vercel.app', 'localhost'];
        
        if (allowed.includes(url.hostname) && url.pathname.includes('/checkin.html')) {
            window.location.href = qrData;
            return;
        }
        showScanResult('❌ QR no autorizado', 'error');
    } catch (error) {
        showScanResult('❌ QR inválido', 'error');
    }}
    
Scripts CDN con SRI
<!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com?plugins=forms,typography" 
        crossorigin="anonymous"></script>
<!-- HTML5 QR Code Scanner -->
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js" 
        integrity="sha384-/t+9nqJOCNZzHfPnJCQQRGfmOaLoJ7RwA4vfvLfDRAZJFZqFr2Y3B3g1DIZvvbPJ" 
        crossorigin="anonymous"></script>
<!-- QR Code Generator -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" 
        integrity="sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSQX0FslNhTDadL4O5SAGapGt4FodqL8My0mA==" 
        crossorigin="anonymous" 
        referrerpolicy="no-referrer"></script>
  
   📊 Uso del Sistema Para Jugadoras
1️⃣ Instalar PWA
Android (Chrome/Edge):      
    Abrir 
     
      https://riversapp.vercel.app
      
Menú (⋮) → "Agregar a pantalla de inicio"
Confirmar instalación
iOS (Safari):
Abrir https:
     
    //riversapp.vercel.app
    
Botón compartir → "Agregar a pantalla de inicio"
Confirmar

 2️⃣ Marcar Asistencia
Primera vez:
Ir al campo físico
Tab "Escanear" → Escanear QR del coach
Click "Soy nueva - Agregar mi nombre"
Ingresar nombre completo
Se guarda automáticamente y marca asistencia
Siguientes veces:
Escanear QR del coach
Seleccionar nombre de la lista
Confirmar asistencia

  3️⃣ Ver Estadísticas
Tab "Inicio" → Card "Mis Estadísticas"
Muestra: Asistencias, Retardos, Faltas
Se actualiza en tiempo real desde Google Sheets
Para Coaches
   1️⃣ Acceder al Panel
Tab "Coach Panel"
Ingresar uno de los 4 PINs válidos
Panel se desbloquea
   2️⃣ Funciones Disponibles
Botón Función
   🔒 Generar QR
Código para que jugadoras escaneen en el campo
   📅 Editar Horarios
Cambiar días/hora/tolerancia sin tocar código
 📥 Exportar CSV
Descargar todas las asistencias históricas
   📢 Publicar Avisos
Comunicados en muro principal de jugadoras
   🔄 Reset Temporada
Limpiar datos locales (NO borra Google Sheet)
   3️⃣ Generar QR para el Campo
Coach Panel → "🔒 Generar QR"
Imprimir el código QR generado
Plastificar y pegar en entrada del campo
Jugadoras lo escanean para marcar asistencia
Recomendación: Imprimir en carta completa para mayor visibilidad.
   🧪 Pruebas y Verificación
✅ Test de Conexión Google Sheets
Método 1: Consola del Navegador (F12)
 // Pegar en consola de Chrome DevTools

    fetch('https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55')
    .then(r => r.json())
    .then(data => {
    console.log('✅ Conexión exitosa!');
    console.log('📊 Total registros:', data.length);
    console.table(data);
    })
    .catch(err => console.error('❌ Error:', err));
  
  Resultado esperado:
Mensaje "✅ Conexión exitosa!"
Tabla con todos los registros de asistencia
Método 2: Botón de Test en Coach Panel
Funcionalidad incluida en app.js (se puede agregar botón "🔌 Test Conexión").
Método 3: Prueba Manual Completa
Ir a 
    
    /checkin.html directamente
    
   Agregar nombre de prueba
   Marcar asistencia
Verificar que aparezca nueva fila asistenciSheet         
// Pegar en consola del navegador

    navigator.geolocation.getCurrentPosition(
    pos => {
        console.log('✅ GPS Funcional');
        console.log('📍 Latitud:', pos.coords.latitude);
        console.log('📍 Longitud:', pos.coords.longitude);
        console.log('🎯 Precisión:', pos.coords.accuracy, 'metros');
    },
    
    err => console.error('❌ Error GPS:', err.message));
    
Resultado esperado:
Coordenadas actuales del dispositivo
Precisión en metros          
   // Verificar que el SW esté activo:

    navigator.serviceWorker.getRegistration()
    .then(reg => {
        if (reg) {
            console.log('✅ Service Worker activo');
            console.log('📦 Scope:', reg.scope);
            console.log('🔄 Estado:', reg.active.state);
        } else {
            console.log('❌ Service Worker no registrado');
        }
         });
   🐛 Troubleshooting
❌ "QR no válido" al escanear
Causa: URL del QR no coincide con dominio permitido

   Solución:
Verificar que el QR apunte a  
 
    https://riversapp.vercel.app/checkin.html

Regenerar QR desde Coach Panel
Verificar whitelist en app.js:
const allowedHosts 
    
         [
         window.location.hostname,
        'riversapp.vercel.app',
        'localhost`
        ];

❌ "Fuera de rango" en check-in
Causa: Coordenadas GPS incorrectas en CONFIG
Solución:
Obtener coordenadas reales del campo (Google Maps)
Actualizar en app.js:
TARGET_LAT: 19.0732,  // ← TU LATITUD
TARGET_LON: -97.0461  // ← TU LONGITUD
Commit y push
Esperar redeploy de Vercel
❌ Service Worker no actualiza
Solución:
Chrome:
F12 → Application → Service Workers
Click "Unregister"
Ctrl+Shift+R (recarga forzada)
Safari (iOS):
Desinstalar PWA
Limpiar caché de Safari
Reinstalar PWA
❌ Datos no llegan a Google Sheets
Verificaciones:
URL correcta en CONFIG.SHEETBEST_URL
const CONFIG =

    {
    SHEETBEST_URL: 'https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55',
    // ...
    };

   Permisos de la Sheet:
Compartir → "Cualquiera con el enlace"
O agregar email de SheetBest
Test de conexión (consola):
              
    fetch('https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55')
    .then(r => r.json())
    .then(d => console.log('✅ OK:', d.length, 'registros'))
    .catch(e => console.error('❌ Fallo:', e));

❌ PWA no se instala
    Solución Verificar manifest.json:
    
    {
    "name": "RIVERS Tochito Club",
    "short_name": "RIVERS",
    "start_url": "/",
    "display": "standalone",
    "icons": [
    {
      "src": "/android-192x192-icon.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-512x512-icon.png",
      "sizes": "512x512",
      "type": "image/png"
    }
    ]
    }  
  
   Verificar HTTPS:
Vercel provee HTTPS automático
En localhost, usar 
    
    http://localhost:8080 (permitido para pruebas)

   📝 Roadmap
[ ] Notificaciones Push cuando se publican avisos

[ ] Modo oscuro/claro toggle

[ ] Exportación PDF de estadísticas individuales

[ ] Integración con WhatsApp para recordatorios automáticos

[ ] Dashboard administrativo con gráficas de asistencia

[ ] Sistema de multas automáticas por faltas

[ ] Historial de asistencias por jugadora (vista detallada)

[ ] Backup automático a Google Driver 
            
  📄 Licencia
    Este proyecto es privado y de uso exclusivo para RIVERS Tochito Club.
      Todos los derechos reservados © 2026.🇲🇽

  👨‍💻 Autor y Contacto:
   🇲🇽Jesús Bonilla Desarrollador y Auxiliar Tecnico.
    🇲🇽Tadeo Solis Coach Principal  

                             RIVERS Tochito Club®️

Soporte técnico:
GitHub Issues:
     
    River-s-app/issues

Email del club:

    drakenathan1132@gmail.com

🔗 Enlaces Útiles:

📱 App en Producción

📊 Google Sheets (Asistencias)

📁 Repositorio GitHub

📘 Documentación Service Workers

📗 PWA Best Practices

📙 SheetBest API Docs

📕 Geolocation API

✅ Sistema operativo y verificado - Listo para la temporada 2026-2027 🏈🇲🇽


