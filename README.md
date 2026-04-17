# 🏈 RIVERS TOCHITO CLUB - PWA

Sistema de Gestión de Asistencias para el club de flag football RIVERS. Aplicación Progressive Web App (PWA) con funcionalidad offline completa, scanner QR y sincronización en la nube.

## 📋 Características

### Funcionalidades Principales

- **Navegación Bottom Tab Bar**: 4 secciones principales (Reglamento, Check-In, Dashboard, Admin)
- **Reglamento Digital**: Texto completo del reglamento oficial con opción de descarga en PDF
- **Check-In con QR**: Escaneo de códigos QR para registro de asistencias con validación automática de retardos
- **Dashboard Público**: Vista en tiempo real de las asistencias del día
- **Panel Admin**: Gestión completa de jugadoras (CRUD) con control de faltas y retardos
- **Sincronización en la Nube**: Exportación de datos a Google Apps Script

### Características Técnicas

- **100% Offline**: Service Worker con caché completo de recursos
- **Mobile-First**: Diseño optimizado para dispositivos móviles
- **LocalStorage**: Persistencia de datos sin backend necesario
- **Glassmorphism**: Interfaz moderna con efectos de cristal esmerilado
- **PWA Instalable**: Se puede instalar como app nativa en cualquier dispositivo

## 🚀 Instalación Rápida

### Requisitos

- Servidor web (Apache, Nginx, GitHub Pages, Netlify, Vercel, etc.)
- Navegador moderno con soporte para PWA (Chrome, Firefox, Safari, Edge)

### Paso 1: Preparar Archivos

Asegúrate de tener todos los archivos en tu directorio:

```
rivers-app/
├── index.html
├── app.js
├── sw.js
├── manifest.json
├── logo.png          (tu logo del club)
└── reglamento.pdf    (PDF del reglamento oficial)
```

### Paso 2: Agregar Logo

Reemplaza `logo.png` con el logo oficial de tu club. Requisitos:
- Formato: PNG con fondo transparente
- Tamaño recomendado: 512x512 px
- Debe ser circular o cuadrado (se mostrará como círculo en la app)

### Paso 3: Agregar PDF del Reglamento

Coloca el archivo `reglamento.pdf` en la raíz del proyecto. Este es el archivo que se descargará cuando las jugadoras presionen el botón "Descargar PDF Oficial".

### Paso 4: Subir a tu Servidor

**Opción A: GitHub Pages (Gratis)**

1. Crea un repositorio en GitHub
2. Sube todos los archivos
3. Ve a Settings → Pages
4. Selecciona la rama `main` como fuente
5. Tu app estará disponible en `https://tu-usuario.github.io/nombre-repo`

**Opción B: Netlify (Gratis)**

1. Arrastra la carpeta completa a https://app.netlify.com/drop
2. Tu app estará disponible inmediatamente

**Opción C: Vercel (Gratis)**

1. Instala Vercel CLI: `npm i -g vercel`
2. En la carpeta del proyecto: `vercel`
3. Sigue las instrucciones

### Paso 5: Instalar PWA en Dispositivos

Una vez desplegada:

**En Android (Chrome):**
1. Abre la app en Chrome
2. Toca el menú (⋮) → "Instalar app" o "Agregar a pantalla de inicio"
3. Confirma la instalación

**En iOS (Safari):**
1. Abre la app en Safari
2. Toca el botón Compartir (↗)
3. Selecciona "Agregar a pantalla de inicio"
4. Confirma

**En Desktop (Chrome/Edge):**
1. Abre la app en Chrome/Edge
2. Verás un ícono de instalación (+) en la barra de direcciones
3. Haz clic en "Instalar"

## ⚙️ Configuración

### Configurar Sincronización con Google Apps Script

Para habilitar la sincronización de datos a Google Sheets:

1. **Crear Google Apps Script:**
   - Ve a https://script.google.com
   - Crea un nuevo proyecto
   - Pega este código:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Guardar jugadoras
    const playersSheet = ss.getSheetByName('Jugadoras') || ss.insertSheet('Jugadoras');
    playersSheet.clear();
    playersSheet.appendRow(['ID', 'Nombre', 'Edad', 'Retardos', 'Faltas']);
    data.players.forEach(player => {
      playersSheet.appendRow([
        player.id,
        player.name,
        player.age,
        player.retardos || 0,
        player.faltas || 0
      ]);
    });
    
    // Guardar asistencias
    const attendanceSheet = ss.getSheetByName('Asistencias') || ss.insertSheet('Asistencias');
    attendanceSheet.clear();
    attendanceSheet.appendRow(['Fecha', 'ID Jugadora', 'Nombre', 'Hora Check-In', 'Estado']);
    data.attendance.forEach(record => {
      attendanceSheet.appendRow([
        record.timestamp,
        record.playerId,
        record.playerName,
        record.checkInTime,
        record.status
      ]);
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Datos sincronizados'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

2. **Desplegar como Web App:**
   - Haz clic en "Implementar" → "Nueva implementación"
   - Tipo: "Aplicación web"
   - Ejecutar como: "Yo"
   - Quién tiene acceso: "Cualquier persona"
   - Copia la URL de implementación

3. **Configurar en app.js:**
   - Abre `app.js`
   - Busca la línea: `const SYNC_ENDPOINT = 'https://script.google.com/...'`
   - Reemplaza con tu URL de implementación

### Configurar Hora de Inicio Predeterminada

En `app.js`, línea 532:
```javascript
const defaultTime = '18:00'; // Cambia esto a tu hora de entrenamiento
```

### Cambiar PIN del Panel Admin

En `app.js`, línea 9:
```javascript
const ADMIN_PIN = '2000'; // Cambia este PIN
```

### Personalizar Tolerancia de Retardo

En `app.js`, línea 10:
```javascript
const TOLERANCE_MINUTES = 15; // Minutos de tolerancia
```

## 📱 Uso de la Aplicación

### Para Jugadoras (Modo Público)

1. **Ver Reglamento**: Consultar las reglas del club
2. **Dashboard**: Ver quién ha llegado hoy

### Para Staff Técnico

#### Check-In de Asistencias

1. Ir a la sección "Check-In"
2. Configurar la "Hora de Inicio del Entrenamiento"
3. Presionar "Iniciar Escaneo"
4. Escanear el código QR de cada jugadora
5. El sistema automáticamente:
   - Registra "Asistencia" si llega dentro de los 15 minutos de tolerancia
   - Registra "Retardo" si llega después de 15 minutos
   - Actualiza el contador de retardos (3 retardos = 1 falta automática)

#### Panel Admin

1. Ir a la sección "Admin"
2. Ingresar el PIN (por defecto: 2000)
3. Gestionar jugadoras:
   - **Agregar**: Nombre, ID, Edad
   - **Editar**: Modificar datos de jugadoras existentes
   - **Eliminar**: Dar de baja jugadoras
   - **Ver estadísticas**: Faltas y retardos acumulados

4. Sincronizar datos:
   - Presionar "Sincronizar Datos con Nube"
   - Los datos se enviarán a Google Sheets

## 🎨 Personalización de Diseño

### Colores

Los colores principales están definidos en el código:

- **Fondo**: `#0A0A0A` (Negro profundo)
- **Acento Cian**: `#00FFFF` (Azul cian)
- **Acento Rosa**: `#FFB6C1` (Rosa pastel)

Para cambiar los colores, busca estas clases en `index.html`:

```css
.btn-primary {
    background: linear-gradient(135deg, #00FFFF 0%, #00CCCC 100%);
}

.btn-secondary {
    background: linear-gradient(135deg, #FFB6C1 0%, #FF99AA 100%);
}
```

### Paleta de Colores Personalizada

Si quieres usar los colores de tu club, modifica el apartado de `<style>` en `index.html`.

## 🔧 Solución de Problemas

### La cámara no funciona

- Verifica que la app se sirva por HTTPS (requerido para acceso a cámara)
- GitHub Pages, Netlify y Vercel automáticamente proveen HTTPS
- Otorga permisos de cámara al navegador

### El Service Worker no se registra

- Verifica la consola del navegador (F12)
- Asegúrate de que todos los archivos estén en la raíz del servidor
- Borra la caché del navegador y recarga

### Los datos no se guardan

- Verifica que LocalStorage esté habilitado en el navegador
- No uses modo incógnito (los datos se borran al cerrar)
- Comprueba que haya espacio disponible en LocalStorage

### La sincronización falla

- Verifica que el endpoint de Google Apps Script sea correcto
- Asegúrate de que el script esté desplegado como "Aplicación web"
- Verifica que el acceso sea "Cualquier persona"

## 📊 Lógica de Faltas y Retardos

El sistema implementa automáticamente las reglas del reglamento:

1. **Tolerancia**: 15 minutos después de la hora de inicio
2. **Retardos**: Llegar después de 15 minutos = 1 retardo
3. **Conversión**: 3 retardos = 1 falta automática (los retardos se resetean a 0)
4. **Baja**: Al alcanzar 3 faltas, se sugiere dar de baja a la jugadora

## 🔐 Seguridad

- **PIN Admin**: Protege el panel de administración
- **Sin Backend**: Los datos solo existen en LocalStorage del dispositivo
- **Sincronización Opcional**: Los datos solo se envían a la nube cuando presionas el botón
- **HTTPS Requerido**: Para funcionalidad de cámara y seguridad

## 📦 Estructura de Datos

### LocalStorage - Jugadoras
```json
{
  "id": "RIV001",
  "name": "María González",
  "age": 22,
  "retardos": 2,
  "faltas": 0,
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

### LocalStorage - Asistencias
```json
{
  "playerId": "RIV001",
  "playerName": "María González",
  "status": "asistencia",
  "startTime": "18:00",
  "checkInTime": "18:05",
  "timestamp": "2025-01-15T18:05:00.000Z"
}
```

## 🚀 Próximas Mejoras Sugeridas

- [ ] Generador de códigos QR para jugadoras
- [ ] Exportación de reportes en PDF/Excel
- [ ] Notificaciones push para recordatorios
- [ ] Integración con calendario de entrenamientos
- [ ] Estadísticas avanzadas y gráficas
- [ ] Sistema de multas y penalizaciones
- [ ] Chat integrado para el equipo

## 📄 Licencia

Este proyecto fue desarrollado específicamente para RIVERS Tochito Club.

## 🤝 Soporte

Para reportar bugs o solicitar nuevas funcionalidades, contacta al desarrollador del club.

---

**Desarrollado con ❤️ para RIVERS Tochito Club** 🏈
