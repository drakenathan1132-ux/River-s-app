# 🏈 RIVERS Tochito Club - Sistema de Gestión PWA

![Version](https://img.shields.io/badge/version-3.0.0-orange)
![PWA](https://img.shields.io/badge/PWA-Ready-success)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-blue)
![Offline](https://img.shields.io/badge/Offline-Supported-green)

Sistema de gestión de asistencias para club de flag football con tecnología PWA, generador de QR dinámico, sistema offline robusto y sincronización con Google Sheets.

---

## 🚀 Características

### ✅ Core Features
- **QR Dinámico**: Genera códigos QR únicos por sesión de entrenamiento
- **Sistema de Asistencia**: Check-in automático con escaneo de QR
- **Offline-First**: Funciona sin conexión, sincroniza cuando vuelve online
- **Google Sheets Integration**: Almacenamiento en la nube con sincronización automática
- **Sistema de Palomitas**: Marcado visual (Verde/Amarilla/Roja) para asistencias
- **Feed de Avisos**: Muro de noticias y comunicados del club
- **Exportación CSV**: Dashboard para coaches con descarga de datos
- **PWA Instalable**: Se instala como app nativa en Android/iOS
- **IndexedDB Storage**: Base de datos local para modo offline

### 🔒 Reglas de Negocio
- ✅ 15 minutos de tolerancia para marcar asistencia
- ⚠️ 3 retardos = 1 falta
- ❌ 3 faltas = Baja del club

### 🎯 Tecnologías
- **Frontend**: HTML5, Tailwind CSS, Vanilla JS
- **PWA**: Service Worker con caché híbrido + Offline Queue
- **Storage**: IndexedDB para datos offline + Google Sheets API
- **QR**: HTML5-QRCode library + QRCode.js
- **Backend**: Google Sheets API v4

---

## 📦 Estructura del Proyecto

```
River-s-app/
├── index.html              # Aplicación principal
├── checkin.html            # Página de check-in
├── app.js                  # Lógica de negocio principal
├── sw.js                   # Service Worker (Offline + Sync)
├── manifest.json           # Configuración PWA
├── offline.html            # Página fallback sin conexión
├── README.md               # Documentación
├── reglamento.pdf          # Reglamento del club
├── logo.png                # Logo principal
├── apple-180x180-icon.png  # Ícono iOS
├── android-192x192-icon.png # Ícono Android (launcher)
├── android-512x512-icon.png # Ícono Android (splash)
├── favicon-32x32.png       # Favicon 32px
└── favicon-16x16.png       # Favicon 16px
```

---

## 🛠️ Instalación y Configuración

### 1️⃣ Clonar Repositorio
```bash
git clone https://github.com/drakenathan1132-ux/River-s-app.git
cd River-s-app
```

### 2️⃣ Configurar Google Sheets API

#### A. Crear Proyecto en Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto: "RIVERS Tochito Club"
3. Habilita **Google Sheets API**:
   - Menú → APIs & Services → Enable APIs
   - Busca "Google Sheets API" → Enable

#### B. Crear API Key
1. APIs & Services → Credentials
2. Create Credentials → API Key
3. Copia el API Key generado
4. (Opcional) Restringir el API Key:
   - Application restrictions: HTTP referrers
   - Agregar tu dominio: `https://tu-dominio.com/*`
   - API restrictions: Google Sheets API

#### C. Crear Google Sheet
1. Crea una nueva hoja de cálculo en Google Sheets
2. Nómbrala: "RIVERS Asistencias"
3. Crea una hoja llamada: **"Asistencias"**
4. Agrega los siguientes headers en la fila 1:

| Timestamp | Nombre | Tipo | Sesión | Device ID | Diff Minutos | Status |
|-----------|--------|------|--------|-----------|--------------|--------|

5. Comparte el Sheet con permisos de "Viewer" a "Anyone with the link"
6. Copia el ID del Sheet desde la URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID_AQUÍ]/edit
   ```

#### D. Configurar Credenciales en el Código

**En `app.js` (líneas 10-13):**
```javascript
const CONFIG = {
    GOOGLE_SHEETS_ID: 'TU_SHEET_ID_AQUÍ',
    GOOGLE_API_KEY: 'TU_API_KEY_AQUÍ',
    SHEET_NAME: 'Asistencias',
    // ...
};
```

**En `checkin.html` (líneas 105-108):**
```javascript
const CONFIG = {
    GOOGLE_SHEETS_ID: 'TU_SHEET_ID_AQUÍ',
    GOOGLE_API_KEY: 'TU_API_KEY_AQUÍ',
    SHEET_NAME: 'Asistencias',
    // ...
};
```

### 3️⃣ Desplegar la Aplicación

#### Opción A: GitHub Pages (Recomendado)
```bash
# Asegúrate de que todo esté commiteado
git add .
git commit -m "Configure Google Sheets API"
git push origin main

# Ir a Settings → Pages → Source: main branch
# Tu app estará en: https://tu-usuario.github.io/River-s-app/
```

#### Opción B: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### Opción C: Vercel
```bash
npm install -g vercel
vercel --prod
```

#### Opción D: Servidor Local (Desarrollo)
```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server -p 8000

# Abre: http://localhost:8000
```

---

## 📱 Instalación en Dispositivos

### Android (Chrome/Edge)
1. Abre la app en el navegador
2. Toca el menú ⋮ → **Instalar aplicación**
3. O usa el banner "Agregar a pantalla de inicio"
4. **IMPORTANTE**: Dar permisos de cámara para QR scanner

### iOS (Safari)
1. Abre la app en Safari
2. Toca el botón **Compartir** 
3. Selecciona **"Agregar a pantalla de inicio"**
4. **IMPORTANTE**: La app solo funciona en Safari en iOS

### HyperOS (Xiaomi)
1. Abre en Chrome/Mi Browser
2. Menú → **Agregar a escritorio**
3. Dar permisos de cámara

---

## 🎨 Personalización

### Colores y Temas
Edita las variables CSS en `index.html` y `checkin.html`:
```css
:root {
  --primary-cyan: #00D9FF;
  --primary-pink: #FF006E;
  --bg-dark: #0A0A0A;
  --bg-card: #1a1a1a;
}
```

### Logo y Iconos
Reemplaza los archivos de iconos con tus diseños:
- `logo.png` (principal)
- `android-192x192-icon.png`
- `android-512x512-icon.png`
- `apple-180x180-icon.png`
- `favicon-32x32.png`
- `favicon-16x16.png`

### Reglas de Asistencia
Edita en `app.js` y `checkin.html`:
```javascript
const CONFIG = {
    CHECKIN_START: '16:00',  // Hora inicio check-in
    CHECKIN_END: '17:30',    // Hora cierre check-in
    SESSION_TIME: '16:45',   // Hora de sesión
    TOLERANCE: 15,           // Minutos de tolerancia
};
```

### PINs de Coach
Edita en `app.js`:
```javascript
COACH_PINS: ['2501', '2502', '2503', '2504'],
```

---

## 🔧 Funcionalidades Principales

### Sistema de Check-In
1. **Jugadora**: Escanea QR generado por el coach
2. **Sistema**: Calcula diferencia de tiempo vs hora de sesión
3. **Resultado**:
   - ≤ 15 min = ✅ **Asistencia** (palomita verde)
   - \> 15 min = ⚠️ **Retardo** (palomita amarilla)
   - Sin registro = ❌ **Falta** (palomita roja)
4. **Guardado**: 
   - Online → Google Sheets directo
   - Offline → IndexedDB local → Sync automático al volver online

### Panel de Coach
- **QR Generator**: Genera códigos QR únicos por sesión
- **Tabla de Asistencias**: Vista en tiempo real con sistema de palomitas
- **Estadísticas**: Total jugadoras, asistencia promedio, retardos del día
- **Exportar CSV**: Descarga de datos para análisis
- **Configuración**: Editar horarios, tolerancia, ubicación

### Modo Offline
- ✅ Check-in funciona sin conexión
- 💾 Datos guardados en IndexedDB
- 🔄 Sincronización automática al recuperar conexión
- 📱 Indicador visual de estado de red
- ⏳ Cola de sincronización para requests fallidos

---

## 🐛 Troubleshooting

### ❌ "Service Worker no se registra"
**Solución:**
- Verifica que uses **HTTPS** (o localhost)
- Revisa la consola del navegador (F12)
- Asegúrate que `sw.js` esté en la raíz del proyecto
- Verifica que no haya errores de sintaxis en `sw.js`

### ❌ "QR Scanner no funciona"
**Solución:**
- Otorga permisos de cámara al navegador
- Solo funciona en **HTTPS** (no HTTP)
- En Android: Settings → Apps → Chrome → Permissions → Camera
- En iOS: Settings → Safari → Camera → Allow

### ❌ "No se sincroniza con Google Sheets"
**Solución:**
1. Verifica que el `GOOGLE_SHEETS_ID` sea correcto
2. Verifica que el `GOOGLE_API_KEY` sea válido
3. Verifica que el Sheet esté compartido públicamente
4. Revisa en DevTools → Network si hay errores 403/401
5. Verifica que Google Sheets API esté habilitada en Google Cloud Console

### ❌ "Error 403: Permission denied"
**Solución:**
- El Sheet debe estar compartido con "Anyone with the link" (Viewer)
- Settings del Sheet → Share → Change to anyone with link

### ❌ "Offline Queue no funciona"
**Solución:**
- IndexedDB requiere contexto seguro (HTTPS)
- Verifica en DevTools → Application → IndexedDB
- Revisa en Application → Service Workers que esté activo

### ❌ "PWA no se instala"
**Solución:**
- Verifica que `manifest.json` sea válido
- HTTPS es requerido
- Todos los iconos deben existir
- Usa Lighthouse en Chrome DevTools para diagnosticar

---

## 📊 Estructura de Datos en Google Sheets

### Hoja "Asistencias"

| Timestamp | Nombre | Tipo | Sesión | Device ID | Diff Minutos | Status |
|-----------|--------|------|--------|-----------|--------------|--------|
| 2025-04-22T18:00:00.000Z | María López | asistencia | 2025-04-22 | DEV-1234 | 5 | confirmado |
| 2025-04-22T18:12:00.000Z | Ana García | retardo | 2025-04-22 | DEV-5678 | 17 | confirmado |

**Campos:**
- `Timestamp`: Fecha y hora exacta del check-in (ISO 8601)
- `Nombre`: Nombre completo de la jugadora
- `Tipo`: `asistencia` | `retardo` | `falta`
- `Sesión`: Fecha de la sesión (YYYY-MM-DD)
- `Device ID`: Identificador único del dispositivo
- `Diff Minutos`: Diferencia en minutos vs hora de sesión
- `Status`: `confirmado` | `pendiente`

---

## 🔐 Seguridad

### Content Security Policy (CSP)
Ambos archivos HTML incluyen CSP headers:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' https://cdn.tailwindcss.com 'unsafe-inline'; 
               connect-src 'self' https://sheets.googleapis.com;">
```

### Sanitización de Datos
Todas las entradas de usuario son sanitizadas:
```javascript
const sanitizeHTML = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};
```

### Validación de Nombres
```javascript
const validateName = (name) => {
    const cleaned = name.trim();
    return cleaned.length >= 5 && 
           cleaned.length <= 50 && 
           /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(cleaned);
};
```

---

## 📈 Roadmap

- [x] Sistema básico de asistencia
- [x] QR dinámico por sesión
- [x] Offline-first architecture
- [x] Google Sheets Integration
- [x] Sistema de palomitas (Verde/Amarilla/Roja)
- [x] IndexedDB Storage
- [x] Background Sync
- [ ] Push Notifications
- [ ] Estadísticas por jugador
- [ ] Gráficas de progreso
- [ ] Sistema de rankings
- [ ] Integración con Telegram Bot
- [ ] Modo multi-equipos

---

## 👨‍💻 Autor

**Jesús Bonilla** - Head Coach RIVERS Tochito Club  
GitHub: [@drakenathan1132-ux](https://github.com/drakenathan1132-ux)

---

## 📄 Licencia

MIT License - Siéntete libre de usar y modificar este código.

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas!

1. Fork el proyecto
2. Crea tu branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## ⭐ Agradecimientos

- HTML5-QRCode library
- QRCode.js
- Tailwind CSS
- Google Sheets API
- Anthropic Claude (asistencia en desarrollo)

---

## 📞 Soporte

¿Encontraste un bug o tienes una sugerencia?

1. **Issues**: Abre un issue en GitHub
2. **Email**: contacto@riverstochito.com
3. **Documentación**: Revisa este README

---

**¿Encontraste útil este proyecto? Dale una ⭐ en GitHub!**

---

## 🔄 Changelog

### v3.0.0 (2025-04-28)
- ✅ Integración completa con Google Sheets API
- ✅ Sistema de palomitas (Verde/Amarilla/Roja)
- ✅ IndexedDB para almacenamiento offline
- ✅ Background Sync automático
- ✅ Mejoras de seguridad (CSP, sanitización)
- ✅ Service Worker optimizado
- ✅ Página offline mejorada
- ✅ Documentación completa

### v2.1.0 (2025-01-15)
- ✅ QR dinámico
- ✅ Feed de avisos
- ✅ Exportación CSV

### v2.0.0 (2025-01-01)
- ✅ PWA básica
- ✅ Sistema de asistencia
- ✅ Coach panel