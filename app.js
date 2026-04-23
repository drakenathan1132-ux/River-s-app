// ========================================
// RIVERS TOCHITO CLUB - APP LOGIC
// ========================================

const CONFIG = {
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbw_4wK-gG4yhXQUNUWYV8r2OjMcxETNWNnWXsI-m7nPBOCZPZkKg14F9OMcNrt-_vTjtA/exec',
    COACH_PINS: ['2501', '2502', '2503', '2504'], // 4 coaches diferentes
    CHECKIN_URL: window.location.origin + '/checkin.html'
};

// Configuración editable (se guarda en localStorage)
const getScheduleConfig = () => {
    const saved = localStorage.getItem('scheduleConfig');
    if (saved) return JSON.parse(saved);
    
    return {
        dias: [2, 4], // 0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado
        hora: '16:45',
        tolerancia: 15,
        location: 'Cancha Principal'
    };
};

let scheduleConfig = getScheduleConfig();

// State Management
const state = {
    currentTab: 'home',
    qrScanner: null,
    currentQR: null,
    userData: {
        nombre: localStorage.getItem('userName') || '',
        asistencias: 0,
        retardos: 0,
        faltas: 0
    }
};

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    generateQRCode();
    loadUserStats();
    loadFeed();
    updateScheduleDisplay();
});

function initApp() {
    if (!state.userData.nombre) {
        const nombre = prompt('¿Cuál es tu nombre completo?');
        if (nombre) {
            state.userData.nombre = nombre;
            localStorage.setItem('userName', nombre);
        }
    }
    
    updateNextSessionInfo();
}

function updateNextSessionInfo() {
    const now = new Date();
    const nextSession = getNextSessionDate();
    
    if (nextSession) {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const isToday = nextSession.toDateString() === now.toDateString();
        
        document.getElementById('sessionDate').textContent = isToday ? 'Hoy' : nextSession.toLocaleDateString('es-MX', options);
        document.getElementById('sessionTime').textContent = scheduleConfig.hora + ' hrs';
        document.getElementById('sessionLocation').textContent = scheduleConfig.location;
    }
}

function getNextSessionDate() {
    const now = new Date();
    const currentDay = now.getDay();
    
    // Find next training day
    for (let i = 0; i <= 7; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + i);
        const checkDay = checkDate.getDay();
        
        if (scheduleConfig.dias.includes(checkDay)) {
            // If it's today, check if we haven't passed the time
            if (i === 0) {
                const [hours, minutes] = scheduleConfig.hora.split(':');
                const sessionTime = new Date(now);
                sessionTime.setHours(parseInt(hours), parseInt(minutes), 0);
                
                if (now < sessionTime) {
                    return checkDate;
                }
            } else {
                return checkDate;
            }
        }
    }
    
    return null;
}

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // Sidebar
    document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', toggleSidebar);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            switchTab(item.dataset.tab);
            toggleSidebar();
        });
    });
    
    // QR Actions
    document.getElementById('refreshQR').addEventListener('click', generateQRCode);
    
    // Coach Panel
    document.getElementById('unlockCoach').addEventListener('click', unlockCoachPanel);
    document.getElementById('editSchedule').addEventListener('click', editSchedule);
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    document.getElementById('sendNotice').addEventListener('click', publishNotice);
    document.getElementById('resetSeason').addEventListener('click', resetSeason);
    
    // Scanner
    document.getElementById('stopScan').addEventListener('click', stopScanner);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

// ========================================
// TAB NAVIGATION
// ========================================
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        }
    });
    
    state.currentTab = tabName;
    
    if (tabName === 'scan') {
        startScanner();
    } else if (state.qrScanner) {
        stopScanner();
    }
    
    if (tabName === 'feed') {
        loadFeed();
    }
}

// ========================================
// QR CODE GENERATION (Para mostrar a las jugadoras)
// ========================================
function generateQRCode() {
    const canvas = document.getElementById('qrCanvas');
    const ctx = canvas.getContext('2d');
    
    // El QR contiene la URL de check-in
    const qrData = CONFIG.CHECKIN_URL;
    state.currentQR = qrData;
    
    canvas.width = 256;
    canvas.height = 256;
    
    // Usar librería QR real
    if (typeof QRCode !== 'undefined') {
        new QRCode(canvas, {
            text: qrData,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff"
        });
    } else {
        drawQRPlaceholder(ctx, qrData);
    }
    
    console.log('QR Generated:', qrData);
}

function drawQRPlaceholder(ctx, code) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);
    
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
            if (Math.random() > 0.5) {
                ctx.fillRect(i * 12 + 8, j * 12 + 8, 10, 10);
            }
        }
    }
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RIVERS CHECK-IN', 128, 240);
}

// ========================================
// QR SCANNER (Para jugadoras que escanean el QR del coach)
// ========================================
function startScanner() {
    const html5QrCode = new Html5Qrcode("reader");
    state.qrScanner = html5QrCode;
    
    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
            handleScan(decodedText);
            stopScanner();
        },
        (errorMessage) => {
            // Ignore
        }
    ).catch((err) => {
        console.error('Scanner error:', err);
        showScanResult('❌ Error al iniciar cámara. Verifica permisos.', 'error');
    });
    
    document.getElementById('stopScan').classList.remove('hidden');
}

function stopScanner() {
    if (state.qrScanner) {
        state.qrScanner.stop().then(() => {
            state.qrScanner = null;
            document.getElementById('stopScan').classList.add('hidden');
        }).catch((err) => {
            console.error('Stop scanner error:', err);
        });
    }
}

function handleScan(qrData) {
    console.log('QR Scanned:', qrData);
    
    // Si el QR contiene la URL de check-in, redirigir
    if (qrData.includes('/checkin.html')) {
        window.location.href = qrData;
        return;
    }
    
    showScanResult('❌ QR no válido', 'error');
}

function showScanResult(message, type) {
    const resultDiv = document.getElementById('scanResult');
    resultDiv.textContent = message;
    resultDiv.className = `mt-4 p-4 rounded-lg text-center ${
        type === 'success' ? 'bg-green-600' :
        type === 'error' ? 'bg-red-600' :
        'bg-yellow-600'
    }`;
    resultDiv.classList.remove('hidden');
    
    setTimeout(() => {
        resultDiv.classList.add('hidden');
    }, 3000);
}

// ========================================
// STATS MANAGEMENT
// ========================================
function loadUserStats() {
    const stats = JSON.parse(localStorage.getItem('userStats') || '{}');
    state.userData.asistencias = stats.asistencias || 0;
    state.userData.retardos = stats.retardos || 0;
    state.userData.faltas = stats.faltas || 0;
    
    document.getElementById('asistencias').textContent = state.userData.asistencias;
    document.getElementById('retardos').textContent = state.userData.retardos;
    document.getElementById('faltas').textContent = state.userData.faltas;
}

// ========================================
// FEED
// ========================================
async function loadFeed() {
    const container = document.getElementById('feedContainer');
    
    const feed = [
        {
            id: 1,
            title: 'Bienvenida a RIVERS',
            message: 'Entrenamientos: Martes y Jueves 4:45 PM. ¡No faltes!',
            date: new Date().toISOString(),
            type: 'info'
        }
    ];
    
    container.innerHTML = feed.map(item => `
        <div class="feed-item card mb-4 pl-4">
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold">${item.title}</h3>
                <span class="text-xs text-gray-500">${formatDate(item.date)}</span>
            </div>
            <p class="text-sm text-gray-300">${item.message}</p>
        </div>
    `).join('');
}

function formatDate(isoDate) {
    const date = new Date(isoDate);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) return 'Hoy';
    if (diff < 172800000) return 'Ayer';
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

// ========================================
// COACH PANEL
// ========================================
function unlockCoachPanel() {
    const pin = document.getElementById('coachPIN').value;
    
    if (CONFIG.COACH_PINS.includes(pin)) {
        document.getElementById('coachLogin').classList.add('hidden');
        document.getElementById('coachPanel').classList.remove('hidden');
        loadCoachStats();
    } else {
        alert('❌ PIN incorrecto');
    }
}

function loadCoachStats() {
    // TODO: Fetch real data from Google Sheets
    document.getElementById('coachStats').innerHTML = `
        <p>Total Jugadoras: <span class="float-right font-bold">24</span></p>
        <p>Asistencia Promedio: <span class="float-right font-bold">87%</span></p>
        <p>Retardos Hoy: <span class="float-right font-bold">3</span></p>
    `;
}

function editSchedule() {
    const newTime = prompt('Hora de entrenamiento (HH:MM):', scheduleConfig.hora);
    if (newTime && /^\d{2}:\d{2}$/.test(newTime)) {
        scheduleConfig.hora = newTime;
    }
    
    const newTolerance = prompt('Minutos de tolerancia:', scheduleConfig.tolerancia);
    if (newTolerance && !isNaN(newTolerance)) {
        scheduleConfig.tolerancia = parseInt(newTolerance);
    }
    
    const newLocation = prompt('Ubicación:', scheduleConfig.location);
    if (newLocation) {
        scheduleConfig.location = newLocation;
    }
    
    localStorage.setItem('scheduleConfig', JSON.stringify(scheduleConfig));
    updateScheduleDisplay();
    updateNextSessionInfo();
    
    alert('✅ Configuración actualizada');
}

function updateScheduleDisplay() {
    const dias = scheduleConfig.dias.map(d => {
        const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return names[d];
    }).join(', ');
    
    document.getElementById('configDays').textContent = dias;
    document.getElementById('configTime').textContent = scheduleConfig.hora;
    document.getElementById('configTolerance').textContent = scheduleConfig.tolerancia + ' min';
}

function exportToCSV() {
    const csv = `Nombre,Asistencias,Retardos,Faltas\n${state.userData.nombre},${state.userData.asistencias},${state.userData.retardos},${state.userData.faltas}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RIVERS_Reporte_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

function publishNotice() {
    const message = prompt('Escribe el aviso a publicar:');
    if (message) {
        alert('✅ Aviso publicado');
        loadFeed();
    }
}

function resetSeason() {
    if (confirm('⚠️ ¿Seguro que quieres resetear la temporada?')) {
        localStorage.clear();
        alert('✅ Temporada reseteada');
        location.reload();
    }
}