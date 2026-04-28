const CONFIG = {
    SHEETBEST_URL: 'https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55',
    COACH_PINS: ['2501', '2502', '2503', '2504'],
    CHECKIN_URL: window.location.origin + '/checkin.html',
    // Coordenadas del Campo (AJUSTAR AQUÍ)
    TARGET_LAT: 19.0732, 
    TARGET_LON: -97.0461,
    MAX_DISTANCE_KM: 0.3 // 300 metros de tolerancia
};

const state = {
    currentTab: 'home',
    qrScanner: null,
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

    document.getElementById('unlockCoach').addEventListener('click', unlockCoachPanel);
    document.getElementById('exportCSV').addEventListener('click', exportData);
}

function generateQRCode() {
    const container = document.getElementById('qrContainer');
    if (!container) return;
    container.innerHTML = '';
    new QRCode(container, {
        text: CONFIG.CHECKIN_URL,
        width: 250,
        height: 250,
        colorDark: "#000000",
        colorLight: "#ffffff"
    });
}

// LÓGICA DE EXPORTACIÓN Y RESPALDO
async function exportData() {
    try {
        const response = await fetch(CONFIG.SHEETBEST_URL);
        const data = await response.json();
        
        let csv = 'Nombre,Tipo,Fecha_Hora,Sesion,Lat,Lon\n';
        data.forEach(row => {
            csv += `${row.nombre},${row.tipo},${row.timestamp},${row.session},${row.latitud || 0},${row.longitud || 0}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `RIVERS_Reporte_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    } catch (e) {
        const local = localStorage.getItem('rivers_log');
        if (local) {
            const blob = new Blob([local], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = "RESPALDO_EMERGENCIA_RIVERS.json";
            a.click();
            alert('Descargando respaldo local (Nube desconectada)');
        } else {
            alert('Error al conectar y no hay datos locales.');
        }
    }
}

function unlockCoachPanel() {
    const pin = document.getElementById('coachPIN').value;
    if (CONFIG.COACH_PINS.includes(pin)) {
        document.getElementById('coachLogin').classList.add('hidden');
        document.getElementById('coachPanel').classList.remove('hidden');
    } else {
        alert('PIN Incorrecto');
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    state.currentTab = tabName;
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function loadUserStats() {
    // Aquí podrías filtrar el JSON de SheetBest por el nombre de la jugadora
    console.log("Stats cargadas para:", state.userData.nombre);
}

function updateScheduleDisplay() {
    // Lógica visual del horario
}

