const CONFIG = {
    SHEETBEST_URL: 'https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55',
    COACH_PINS: ['2501', '2502', '2503', '2504'],
    CHECKIN_URL: window.location.origin + '/checkin.html'
};

const getScheduleConfig = () => {
    const saved = localStorage.getItem('scheduleConfig');
    if (saved) return JSON.parse(saved);
    
    return {
        dias: [2, 4],
        hora: '16:45',
        tolerancia: 15,
        location: 'Cancha Principal'
    };
};

let scheduleConfig = getScheduleConfig();

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
    
    for (let i = 0; i <= 7; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + i);
        const checkDay = checkDate.getDay();
        
        if (scheduleConfig.dias.includes(checkDay)) {
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

function setupEventListeners() {
    document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', toggleSidebar);
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            switchTab(item.dataset.tab);
            toggleSidebar();
        });
    });
    
    document.getElementById('refreshQR').addEventListener('click', generateQRCode);
    
    document.getElementById('unlockCoach').addEventListener('click', unlockCoachPanel);
    document.getElementById('editSchedule').addEventListener('click', editSchedule);
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    document.getElementById('sendNotice').addEventListener('click', publishNotice);
    document.getElementById('resetSeason').addEventListener('click', resetSeason);
    
    document.getElementById('stopScan').addEventListener('click', stopScanner);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

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

function generateQRCode() {
    const container = document.getElementById('qrContainer');
    container.innerHTML = '';
    
    const qrDiv = document.createElement('div');
    container.appendChild(qrDiv);
    
    new QRCode(qrDiv, {
        text: CONFIG.CHECKIN_URL,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    state.currentQR = CONFIG.CHECKIN_URL;
    console.log('QR Real Generated:', CONFIG.CHECKIN_URL);
}

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
        (errorMessage) => {}
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

function loadUserStats() {
    const stats = JSON.parse(localStorage.getItem('userStats') || '{}');
    state.userData.asistencias = stats.asistencias || 0;
    state.userData.retardos = stats.retardos || 0;
    state.userData.faltas = stats.faltas || 0;
    
    document.getElementById('asistencias').textContent = state.userData.asistencias;
    document.getElementById('retardos').textContent = state.userData.retardos;
    document.getElementById('faltas').textContent = state.userData.faltas;
}

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

async function loadCoachStats() {
    try {
        const response = await fetch(CONFIG.SHEETBEST_URL);
        const data = await response.json();
        
        const totalJugadoras = new Set(data.map(row => row.nombre)).size;
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = data.filter(row => row.session === today);
        const retardosHoy = todayRecords.filter(row => row.tipo === 'retardo').length;
        
        const asistenciaPromedio = totalJugadoras > 0 
            ? Math.round((todayRecords.filter(r => r.tipo === 'asistencia').length / totalJugadoras) * 100) 
            : 0;
        
        document.getElementById('coachStats').innerHTML = `
            <p>Total Jugadoras: <span class="float-right font-bold">${totalJugadoras}</span></p>
            <p>Asistencia Promedio: <span class="float-right font-bold">${asistenciaPromedio}%</span></p>
            <p>Retardos Hoy: <span class="float-right font-bold">${retardosHoy}</span></p>
        `;
    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('coachStats').innerHTML = `
            <p>Total Jugadoras: <span class="float-right font-bold">0</span></p>
            <p>Asistencia Promedio: <span class="float-right font-bold">0%</span></p>
            <p>Retardos Hoy: <span class="float-right font-bold">0</span></p>
        `;
    }
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

async function exportToCSV() {
    try {
        const response = await fetch(CONFIG.SHEETBEST_URL);
        const data = await response.json();
        
        let csv = 'Nombre,Tipo,Fecha,Hora,Sesión\n';
        data.forEach(row => {
            csv += `${row.nombre},${row.tipo},${row.timestamp},${row.diffMinutes || 0},${row.session}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RIVERS_Asistencias_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        alert('✅ CSV descargado');
    } catch (error) {
        console.error('Error exporting CSV:', error);
        alert('❌ Error al exportar. Verifica tu conexión.');
    }
}

function publishNotice() {
    const message = prompt('Escribe el aviso a publicar:');
    if (message) {
        alert('✅ Aviso publicado');
        loadFeed();
    }
}

function resetSeason() {
    if (confirm('⚠️ ¿Seguro que quieres resetear la temporada? Esto borrará todos los datos.')) {
        localStorage.clear();
        alert('✅ Temporada reseteada');
        location.reload();
    }
                               }
                                                                 
