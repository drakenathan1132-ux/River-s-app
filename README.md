
# 🏈 RIVERS Tochito Club - Sistema de Gestión PWA

Sistema de gestión de asistencias para club de flag football con tecnología PWA, generador de QR dinámico, muro de avisos y exportación CSV.



![Version](https://img.shields.io/badge/version-2.1.0-orange)




![PWA](https://img.shields.io/badge/PWA-Ready-success)




![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-blue)



---

## 🚀 Características

### ✅ Core Features
- **QR Dinámico**: Genera códigos QR únicos por sesión de entrenamiento
- **Sistema de Asistencia**: Check-in automático con escaneo de QR
- **Offline-First**: Funciona sin conexión, sincroniza cuando vuelve online
- **Feed de Avisos**: Muro de noticias y comunicados del club
- **Exportación CSV**: Dashboard para coaches con descarga de datos
- **PWA Instalable**: Se instala como app nativa en Android/iOS

### 🔒 Reglas de Negocio
- ✅ 15 minutos de tolerancia para marcar asistencia
- ⚠️ 3 retardos = 1 falta
- ❌ 3 faltas = Baja del club

### 🎯 Tecnologías
- **Frontend**: HTML5, Tailwind CSS, Vanilla JS
- **PWA**: Service Worker con caché híbrido + Offline Queue
- **Backend**: Google Apps Script (Google Sheets como DB)
- **QR**: HTML5-QRCode library
- **Storage**: IndexedDB para datos offline

---

## 📦 Estructura del Proyecto

River-s-app/
├── index.html              # Aplicación principal
├── app.js                  # Lógica de negocio
├── sw.js                   # Service Worker (Network-First + Queue)
├── manifest.json           # Configuración PWA
├── offline.html            # Página fallback sin conexión
├── reglamento.pdf          # Reglamento del club
├── logo.png                # Logo principal
├── apple-180x180-icon.png  # Ícono iOS
├── android-192x192-icon.png # Ícono Android (launcher)
├── android-512x512-icon.png # Ícono Android (splash)
├── favicon-32x32.png       # Favicon 32px
├── favicon-16x16.png       # Favicon 16px
└── generate-icons.py       # Script generador de iconos
---

## 🛠️ Instalación

### 1️⃣ Clonar Repositorio
```bash
git clone https://github.com/drakenathan1132-ux/River-s-app.git
cd River-s-app

2️⃣ Configurar Google Apps Script
Ve a Google Apps Script
Crea un nuevo proyecto
Pega el código del backend (ver sección Backend Setup)
Despliega como Web App
Copia la URL de ejecución
Pega la URL en sw.js línea 7:

const APPS_SCRIPT_URL = 'TU_URL_AQUI';

3️⃣ Generar Iconos (Opcional)
Si quieres regenerar los iconos:
pip install pillow
python generate-icons.py

4️⃣ Desplegar
Opción A - GitHub Pages:
Settings → Pages → Source: main branch
Tu app estará en https://tu-usuario.github.io/River-s-app/
Opción B - Netlify/Vercel:
# Netlify
npm install -g netlify-cli
netlify deploy --prod

# Vercel
npm install -g vercel
vercel --prod

Opción C - Servidor Local:

python -m http.server 8000
# Abre http://localhost:8000

🔧 Configuración
Apps Script Backend (doPost)
function doPost(e) {
  const sheet = SpreadsheetApp.openById('TU_SHEET_ID').getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  
  const timestamp = new Date();
  const nombre = data.nombre;
  const tipo = data.tipo; // 'asistencia' | 'retardo'
  
  sheet.appendRow([timestamp, nombre, tipo]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Asistencia registrada'
  })).setMimeType(ContentService.MimeType.JSON);
}

Google Sheet Estructura
Timestamp
Nombre
Tipo
Sesión
2025-04-22 18:00
Juan Pérez
asistencia
2025-04-22
2025-04-22 18:12
María López
retardo
2025-04-22
📱 Instalación en Dispositivos
Android (Chrome/Edge)
Abre la app en el navegador
Toca el menú ⋮ → Instalar aplicación
O usa el banner "Agregar a pantalla de inicio"
iOS (Safari)
Abre la app en Safari
Toca el botón Compartir
Selecciona "Agregar a pantalla de inicio"
HyperOS (Xiaomi)
Abre en Chrome/Mi Browser
Menú → Agregar a escritorio
IMPORTANTE: Dar permisos de cámara para QR scanner
🎨 Personalización
Colores
Edita las variables en index.html:
:root {
  --primary: #ff6600;
  --bg-dark: #0A0A0A;
  --text-light: #ffffff;
}

Logo
Reemplaza logo-source.png y ejecuta generate-icons.py
Reglas de Asistencia
Edita en app.js:

const TOLERANCIA_MINUTOS = 15;
const RETARDOS_PARA_FALTA = 3;
const FALTAS_PARA_BAJA = 3;

🐛 Troubleshooting
❌ "Service Worker no se registra"
Verifica que uses HTTPS (o localhost)
Revisa la consola del navegador (F12)
Asegúrate que sw.js esté en la raíz
❌ "QR Scanner no funciona"
Otorga permisos de cámara
Solo funciona en HTTPS (no HTTP)
En Android: Settings → Apps → Chrome → Permissions → Camera
❌ "No se sincroniza con Google Sheets"
Verifica la URL de Apps Script en sw.js
El Apps Script debe estar desplegado como "Anyone with link"
Revisa los CORS en Apps Script
❌ "Offline Queue no funciona"
IndexedDB requiere contexto seguro (HTTPS)
Verifica en DevTools → Application → IndexedDB
🔐 Easter Eggs
Coach Mode (PIN: 2501)
navigator.serviceWorker.controller.postMessage({
  type: 'UNLOCK_COACH_MODE',
  data: { pin: '2501' }
});


Exportación CSV avanzada
Borrado masivo de registros
Reset de temporada
📊 Roadmap
[x] Sistema básico de asistencia
[x] QR dinámico por sesión
[x] Offline-first architecture
[x] Feed de avisos
[ ] Push Notifications
[ ] Estadísticas por jugador
[ ] Gráficas de progreso
[ ] Sistema de rankings
[ ] Integración con Telegram Bot
👨‍💻 Autor
Jesús Bonilla - Head Coach RIVERS Tochito Club
Email: [tu-email@example.com]
GitHub: @drakenathan1132-ux
📄 Licencia
MIT License - Siéntete libre de usar y modificar este código.
🤝 Contribuciones
¡Las contribuciones son bienvenidas!
Fork el proyecto
Crea tu branch (git checkout -b feature/nueva-funcionalidad)
Commit cambios (git commit -m 'Add: nueva funcionalidad')
Push al branch (git push origin feature/nueva-funcionalidad)
Abre un Pull Request
⭐ Agradecimientos
HTML5-QRCode library
Tailwind CSS
Google Apps Script
Anthropic Claude (asistencia en desarrollo)
¿Encontraste útil este proyecto? Dale una ⭐ en GitHub!




