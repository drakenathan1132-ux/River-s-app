# 🏈 RIVERS Tochito Club - Sistema de Gestión PWA

Sistema integral de gestión de asistencias para club de flag football femenil. PWA offline-first con geolocalización GPS, QR dinámico y sincronización automática con Google Sheets.



![Version](https://img.shields.io/badge/version-2.1.0-orange)




![PWA](https://img.shields.io/badge/PWA-Ready-success)




![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-blue)




![Security](https://img.shields.io/badge/security-SRI%20Enabled-green)



---

## 🚀 Características Principales

### ✅ Sistema de Asistencias
- **Geofencing**: Check-in solo si estás en el campo (300m de tolerancia GPS)
- **QR Protegido**: Código generado por coaches, accesible solo con PIN
- **Validación Horaria**: 16:45 hrs + 15 min de tolerancia (configurable)
- **Device ID Único**: 1 registro por dispositivo por día (anti-fraude)

### 🔒 Reglas de Negocio
- ✅ **Asistencia**: Llegar dentro de 15 min de tolerancia
- ⚠️ **Retardo**: Llegar después de 15 min (3 retardos = 1 falta)
- ❌ **Falta**: No asistir (3 faltas = baja del club)

### 📱 Funcionalidades Clave
- **Offline-First**: Funciona sin internet, sincroniza automáticamente
- **PWA Instalable**: Se instala como app nativa (iOS/Android)
- **Panel de Coach**: Gestión con 4 PINs, exportación CSV, reset de temporada
- **Avisos del Club**: Muro de noticias en vista principal
- **Estadísticas**: Dashboard personal de asistencias/retardos/faltas

### 🎯 Stack Tecnológico
| Capa | Tecnología |
|------|-----------|
| **Frontend** | HTML5, Tailwind CSS, Vanilla JS |
| **PWA** | Service Worker (Network-First + Background Sync) |
| **Backend** | Google Sheets + SheetBest REST API |
| **Sensores** | HTML5-QRCode (Cámara) + Geolocation API (GPS) |
| **Seguridad** | SRI (Subresource Integrity) en CDN externos |

---

## 📦 Estructura del Proyecto
River-s-app/
├── index.html              # App principal (Inicio, Scan, Coach Panel)
├── app.js                  # Lógica de negocio y geolocalización
├── sw.js                   # Service Worker + Offline Queue
├── checkin.html            # Validador GPS/QR/Horario (destino del QR)
├── manifest.json           # Configuración PWA (iconos, shortcuts)
├── reglamento.pdf          # Reglamento oficial del club
├── offline.html            # Fallback sin conexión
├── vercel.json             # Headers de seguridad y rewrites SPA
└── assets/
├── logo.png            # Logo principal
├── android-.png       # Iconos Android (192x192, 512x512)
└── apple-.png         # Iconos iOS (180x180)
Código
---

## 🔧 Configuración

### 1️⃣ Google Sheets + SheetBest

**URL de API:**
https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55
Código
**Estructura de columnas:**
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `nombre` | string | Nombre completo de la jugadora |
| `tipo` | string | `asistencia` o `retardo` |
| `timestamp` | string | ISO 8601 (ej: 2026-04-28T16:50:00) |
| `session` | string | Fecha de sesión (YYYY-MM-DD) |
| `deviceId` | string | ID único del dispositivo |
| `diffMinutes` | number | Minutos de diferencia vs hora oficial |
| `latitud` | number | (Opcional) Coordenada GPS |
| `longitud` | number | (Opcional) Coordenada GPS |

### 2️⃣ Coordenadas del Campo

Editar en `app.js` (líneas 3-6):

``javascript
const CONFIG = {
    // ... otras configs
    TARGET_LAT: 19.0732,    // ← CAMBIAR A TU CAMPO
    TARGET_LON: -97.0461,   // ← CAMBIAR A TU CAMPO
    MAX_DISTANCE_KM: 0.3    // 300 metros tolerancia
};``

Cómo obtener coordenadas:
Google Maps → Click derecho en el campo → "¿Qué hay aquí?"
Copiar los números (19.0732, -97.0461)
3️⃣ PINs de Coach
4 coaches con acceso al panel (editable en app.js):

``Javascript
COACH_PINS: ['2501', '2502', '2503', '2504']``

4️⃣ Horarios de Sesiones
Configurable desde Coach Panel (no tocar código):
Días: Martes y Jueves (default)
Hora: 16:45 hrs
Tolerancia: 15 min
🚀 Despliegue en Vercel
Deploy Automático
Push al repo GitHub:

``Bash
git add .
git commit -m "Deploy RIVERS PWA"
git push origin main``

Vercel detecta y despliega automáticamente:
URL: https://riversapp.vercel.app
Deploy Manual

``Bash
npm install -g vercel``

vercel --prod
🔒 Seguridad Implementada
✅ Mitigaciones
Vulnerabilidad
Solución
URL Injection
Validación estricta con new URL() + whitelist de dominios
Script Tampering
SRI (Subresource Integrity) en todos los CDN
API Abuse
Rate limiting en Service Worker + whitelist de hosts
XSS
Headers X-Content-Type-Options, X-Frame-Options
Ejemplo de Validación Segura (app.js):
``javascript
function handleScan(qrData) {
    try {
        const url = new URL(qrData);
        const allowed = ['riversapp.vercel.app', 'localhost'];        
        if (allowed.includes(url.hostname) && url.pathname.includes('/checkin.html')) {
            window.location.href = qrData;
            return;
        }
        showScanResult('❌ QR no autorizado', 'error');
    } catch (error) {
        showScanResult('❌ QR inválido', 'error');
    }
}``

📊 Uso del Sistema
Para Jugadoras

Instalar PWA:

Android: Chrome → Menú → "Agregar a pantalla de inicio"

iOS: Safari → Compartir → "Agregar a pantalla de inicio"

Marcar Asistencia:

Ir al campo 
Tab "Escanear" → Escanear QR del coach
Redirige a /checkin.html → Seleccionar nombre → Confirmar
Primera Vez:
Botón "Soy nueva - Agregar mi nombre"
Ingresar nombre completo
Se guarda automáticamente en Google Sheets
Para Coaches
Acceder al Panel:
Tab "Coach Panel"
Ingresar PIN.

Funciones Disponibles:
🔒 Generar QR: Código para que jugadoras escaneen

📅 Editar Horarios: Cambiar días/hora sin tocar código

📥 Exportar CSV: Descargar todas las asistencias

📢 Publicar Avisos: Comunicados en muro principal

🔄 Reset Temporada: Limpiar datos de temporada anterior

🧪 Pruebas y Verificación

Test de Conexión Google Sheets
Método 1: Consola del Navegador (F12)

``Javascript
fetch('https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Conexión OK!');
    console.log('Total registros:', data.length);
    console.table(data);
  })
  .catch(err => console.error('❌ Error:', err));``
  
Método 2: Botón de Test en Coach Panel
Funcionalidad incluida en app.js (botón "🔌 Test Conexión")
Test de Geolocalización

``Javascript
// Pegar en consola del navegador
navigator.geolocation.getCurrentPosition(
    pos => console.log('GPS OK:', pos.coords.latitude, pos.coords.longitude),
    err => console.error('GPS Error:', err.message)
);``

🐛 Troubleshooting

❌ "QR no válido" al escanear
Causa: URL del QR no coincide con dominio permitido
Solución: Verificar que el QR apunte a https://riversapp.vercel.app/checkin.html

❌ "Fuera de rango" en check-in
Causa: Coordenadas GPS incorrectas en CONFIG
Solución: Actualizar TARGET_LAT y TARGET_LON con coordenadas reales del campo

❌ Service Worker no actualiza
Solución:
Chrome DevTools → Application → Service Workers
Click "Unregister"
Recargar página (Ctrl+Shift+R)

❌ Datos no llegan a Google Sheets
Verificar:

URL de SheetBest correcta en CONFIG.SHEETBEST_URL
Permisos de la Sheet (público o con enlace compartido)
Test de conexión desde consola (ver sección Pruebas)

📝 Roadmap

[ ] Notificaciones Push cuando se publican avisos

[ ] Modo oscuro/claro

[ ] Exportación PDF de estadísticas individuales

[ ] Integración con WhatsApp para recordatorios

[ ] Dashboard administrativo con gráficas

[ ] Sistema de multas automáticas

``📄 Licencia
Este proyecto es privado y de uso exclusivo para RIVERS Tochito Club.
👨‍💻 Autor
Jesús Bonilla - Coach y Desarrollador
RIVERS Tochito Club © 2025``

🔗 Enlaces Útiles
Documentación Service Workers
PWA Best Practices
SheetBest API Docs
Geolocation API
