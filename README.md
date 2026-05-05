# 🏈 RIVERS Tochito Club - Sistema de Gestión PWA

Sistema integral de gestión de asistencias para el club de flag football femenil. Aplicación progresiva (PWA) offline-first con geolocalización GPS, QR dinámico y sincronización automática con Google Sheets.

![Version](https://img.shields.io/badge/version-2.1.0-orange)
![PWA](https://img.shields.io/badge/PWA-Ready-success)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-blue)
![Security](https://img.shields.io/badge/security-SRI%20Enabled-green)

**🔗 Producción:** [https://riversapp.vercel.app](https://riversapp.vercel.app)

---

## 🚀 Descripción

Esta app permite:

- Controlar asistencias mediante QR de acceso seguro.
- Validar check-ins con geolocalización del campo.
- Registrar un único dispositivo por día para evitar fraudes.
- Funcionar sin conexión y sincronizar cuando vuelve internet.
- Administrar el acceso de coaches con PIN.

---

## ✅ Características principales

- **Check-in con QR protegido**: El código solo se genera desde el panel de coach.
- **Validación de ubicación**: Solo se permite el registro dentro del radio de 300 metros del campo.
- **Offline-first**: La aplicación funciona sin internet y sincroniza automáticamente.
- **PWA instalable**: Se puede agregar como aplicación en Android e iOS.
- **Dashboard de jugadoras**: Muestra avisos, estadísticas y acceso rápido al check-in.
- **Control de dispositivos**: Cada dispositivo puede registrar solo una asistencia por día.
- **Exportación y gestión**: Panel de coach con exportación CSV, reinicio de temporada y generación de QR.

---

## 🎯 Stack tecnológico

- **Frontend**: HTML5, Tailwind CSS, JavaScript puro
- **PWA**: Service Worker, manifest.json, offline cache
- **Backend**: Google Sheets + SheetBest REST API
- **Sensores**: HTML5-QRCode para cámara y Geolocation API para GPS
- **Seguridad**: SRI para recursos CDN externos
- **Hosting**: Vercel

---

## 📁 Estructura del proyecto

```text
River-s-app/
├── index.html            # App principal (inicio, panel de coach)
├── app.js                # Lógica de negocio, GPS y sincronización
├── sw.js                 # Service Worker y cola offline
├── checkin.html          # Validación de QR, ubicación y horario
├── manifest.json         # Configuración PWA
├── reglamento.pdf        # Reglamento del club
├── offline.html          # Página de fallback sin conexión
├── vercel.json           # Configuración de headers y rewrites
├── README.md             # Documentación del proyecto
└── assets/               # Recursos gráficos e iconos
    ├── logo.png
    ├── android-192x192-icon.png
    ├── android-512x512-icon.png
    └── apple-180x180-icon.png
```

---

## 🔧 Configuración inicial

### 1️⃣ Google Sheets + SheetBest

- **URL de API**: `https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55`

#### Columnas requeridas

| Columna      | Tipo   | Descripción                                      |
|-------------|--------|--------------------------------------------------|
| `nombre`     | string | Nombre completo de la jugadora                   |
| `tipo`       | string | `asistencia` o `retardo`                         |
| `timestamp`  | string | Fecha y hora ISO 8601                            |
| `session`    | string | Fecha de la sesión (YYYY-MM-DD)                  |
| `deviceId`   | string | ID único del dispositivo                          |
| `diffMinutes`| number | Minutos de diferencia respecto a la hora oficial  |
| `latitud`    | number | Coordenada GPS (opcional)                        |
| `longitud`   | number | Coordenada GPS (opcional)                        |

### 2️⃣ Configurar coordenadas del campo

En `app.js`, ajusta el bloque `CONFIG` con las coordenadas de tu campo:

```javascript
const CONFIG = {
  SHEETBEST_URL: 'https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55',
  COACH_PINS: ['2501', '2502', '2503', '2504'],
  CHECKIN_URL: window.location.origin + '/checkin.html',
  TARGET_LAT: 19.0732,    // ← CAMBIAR A TU CAMPO
  TARGET_LON: -97.0461,   // ← CAMBIAR A TU CAMPO
  MAX_DISTANCE_KM: 0.3    // 300 metros de tolerancia
};
```

Cómo obtener coordenadas:
1. Abre Google Maps.
2. Haz clic derecho sobre el campo.
3. Selecciona "¿Qué hay aquí?"
4. Copia las coordenadas y reemplaza `TARGET_LAT` y `TARGET_LON`.

### 3️⃣ Configurar PINs de coach

En `app.js`, actualiza el array `COACH_PINS` con los códigos de acceso de cada coach.

Ejemplo:

```javascript
COACH_PINS: ['2501', '2502', '2503', '2504'],
```

---

## 🚀 Despliegue en Vercel

### Opción recomendada: despliegue automático

1. Haz commit de los cambios:

```bash
git add .
git commit -m "Actualizar configuración"
git push origin main
```

2. Vercel detecta el push y despliega automáticamente.
3. La aplicación quedará disponible en `https://riversapp.vercel.app`.

### Opción manual (CLI)

```bash
npm install -g vercel
vercel --prod
```

---

## 🔒 Seguridad

- Uso de SRI para scripts y estilos cargados desde CDNs.
- Headers de seguridad configurados en `vercel.json`.
- Validación estricta de URLs y whitelist de dominios.
- Protección contra clickjacking con `X-Frame-Options: DENY`.
- Filtro de contenido con `X-Content-Type-Options: nosniff`.

---

## 📌 Notas adicionales

- `offline.html` es la página de respaldo cuando no hay conexión.
- `checkin.html` es la página final a la que dirige el QR.
- `index.html` incluye el panel principal y el acceso de coaches.

Si deseas, puedo también ayudarte a traducir o mejorar el resto de la documentación técnica del proyecto.
