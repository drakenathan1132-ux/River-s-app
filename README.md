# 🏈 RIVERS Tochito Club - Sistema de Gestión PWA

Sistema integral de gestión de asistencias para el club de flag football RIVERS. Construido con tecnología PWA (Progressive Web App), geolocalización, generador de QR dinámico, muro de avisos y sincronización offline.

![Version](https://img-shields.io/badge/version-2.1.0-orange)
![PWA](https://img-shields.io/badge/PWA-Ready-success)
![Platform](https://img-shields.io/badge/platform-Android%20%7C%20iOS-blue)

---

## 🚀 Características

### ✅ Core Features
- **Geofencing y QR Dinámico**: Check-in solo permitido si la jugadora está en el campo (tolerancia de 300m) escaneando el código del coach.
- **Offline-First (Modo Campo)**: Si no hay señal, las asistencias se guardan localmente mediante IndexedDB y se envían solas al recuperar internet.
- **Integración Directa con Sheets**: Base de datos en tiempo real usando Google Sheets + SheetBest API.
- **Feed de Avisos**: Muro de noticias y comunicados oficiales del club.
- **Panel de Coach Protegido**: Gestión de PIN, exportación CSV de asistencias y reset de temporada.
- **PWA Instalable**: Se instala como app nativa en Android/iOS sin pasar por tiendas.

### 🔒 Reglas de Negocio
- ✅ 15 minutos de tolerancia para marcar asistencia.
- ⚠️ 3 retardos = 1 falta.
- ❌ 3 faltas = Baja del club (alerta administrativa).

### 🎯 Tecnologías
- **Frontend**: HTML5, Tailwind CSS, Vanilla JS.
- **PWA**: Service Worker híbrido (Network-First + Stale-While-Revalidate).
- **Backend/DB**: SheetBest REST API + Google Sheets.
- **Sensores**: HTML5-QRCode (Cámara) + Geolocation API (GPS).

---

## 📦 Estructura del Proyecto

```text
River-s-app/
├── index.html              # Aplicación principal y UI
├── app.js                  # Lógica de negocio y geolocalización
├── sw.js                   # Service Worker y Offline Queue
├── checkin.html            # Procesador de validación GPS/QR
├── manifest.json           # Configuración PWA
├── reglamento.pdf          # Reglamento del club
├── generate-icons.py       # Script generador de iconos
└── Assets/                 # Logos y favicons (PNGs)

