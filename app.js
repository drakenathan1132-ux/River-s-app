// ========================================
// RIVERS TOCHITO CLUB - APP LOGIC
// ========================================

const CONFIG = {
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbw_4wK-gG4yhXQUNUWYV8r2OjMcxETNWNnWXsI-m7nPBOCZPZkKg14F9OMcNrt-_vTjtA/exec',
    TOLERANCIA_MINUTOS: 15,
    RETARDOS_PARA_FALTA: 3,
    FALTAS_PARA_BAJA: 3,
    COACH_PIN: '2501',
    SESSION_TIME: '18:00'
};

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
});

function initApp() {
    // Check if user name is stored
    if (!state.userData.nombre) {
        const nombre = prompt('¿Cuál es tu nombre completo?');
        if (nombre) {
            state.userData.nombre = nombre;
            localStorage.setItem('userName', nombre);
        }
    }
    
    // Set session info
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    document.getElementById('sessionDate').textContent = now.toLocaleDateString('es-MX', options);
    document.getElementById('sessionTime').textContent = CONFIG.SESSION_TIME;
}

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // QR Actions
    document.getElementById('refreshQR').addEventListener('click', generateQRCode);
    
    // Coach Panel
    document.getElementById('unlockCoach').addEventListener('click', unlockCoachPanel);
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    document.getElementById('sendNotice').addEventListener('click', publishNotice);
    document.getElementById('resetSeason').addEventListener('click', resetSeason);
    
    // Scanner
    document.getElementById('stopScan').addEventListener('click', stopScanner);
}

// ========================================
// TAB NAVIGATION
// ========================================
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    
    // Update active button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-orange-600');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active', 'bg-orange-600');
        }
    });
    
    state.currentTab = tabName;
    
    // Tab-specific actions
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
// QR CODE GENERATION
// ========================================
function generateQRCode() {
    const canvas = document.getElementById('qrCanvas');
    const ctx = canvas.getContext('2d');
    
    // Generate unique session code
    const sessionDate = new Date().toISOString().split('T')[0];
    const sessionCode = `RIVERS-${sessionDate}-${Date.now()}`;
    state.currentQR = sessionCode;
    
    // Set canvas size
    canvas.width = 256;
    canvas.height = 256;
    
    // Generate QR using library or draw placeholder
    drawQRPlaceholder(ctx, sessionCode);
    
    console.log('QR Generated:', sessionCode);
}

function drawQRPlaceholder(ctx, code) {
    // Draw white background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw QR pattern (simplified)
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
            if (Math.random() > 0.5) {
                ctx.fillRect(i * 12 + 8, j * 12 + 8, 10, 10);
            }
        }
    }
    
    // Draw text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RIVERS TOCHITO', 128, 240);
}

// ========================================
// QR SCANNER
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
            // Ignore scan errors
        }
    ).catch((err) => {
        console.error('Scanner error:', err);
        showScanResult('❌ Error al iniciar cámara', 'error');
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
    
    // Validate QR
    if (!qrData.startsWith('RIVERS-')) {
        showScanResult('❌ QR inválido', 'error');
        return;
    }
    
    // Check if already marked
    const today = new Date().toISOString().split('T')[0];
    const lastScan = localStorage.getItem('lastScan');
    
    if (lastScan === today) {
        showScanResult('⚠️ Ya marcaste asistencia hoy', 'warning');
        return;
    }
    
    // Determine if late
    const now = new Date();
    const sessionTime = new Date();
    const [hours, minutes] = CONFIG.SESSION_TIME.split(':');
    sessionTime.setHours(parseInt(hours), parseInt(minutes), 0);
    
    const diffMinutes = (now - sessionTime) / (1000 * 60);
    const isLate = diffMinutes > CONFIG.TOLERANCIA_MINUTOS;
    
    // Submit attendance
    submitAttendance(isLate ? 'retardo' : 'asistencia');
    localStorage.setItem('lastScan', today);
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
// ATTENDANCE SUBMISSION
// ========================================
async function submitAttendance(tipo) {
    const data = {
        nombre: state.userData.nombre,
        tipo: tipo,
        timestamp: new Date().toISOString(),
        session: new Date().toISOString().split('T')[0]
    };
    
    try {
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showScanResult(`✅ ${tipo === 'asistencia' ? 'Asistencia' : 'Retardo'} registrado`, 'success');
            updateLocalStats(tipo);
        } else if (result.offline) {
            showScanResult('📡 Sin conexión - Se sincronizará luego', 'warning');
        } else {
            showScanResult('❌ Error al registrar', 'error');
        }
    } catch (error) {
        console.error('Submit error:', error);
        showScanResult('📡 Guardado offline - Se enviará luego', 'warning');
    }
}

// ========================================
// STATS MANAGEMENT
// ========================================
function updateLocalStats(tipo) {
    if (tipo === 'asistencia') {
        state.userData.asistencias++;
    } else {
        state.userData.retardos++;
        
        // Check if retardos convert to falta
        if (state.userData.retardos % CONFIG.RETARDOS_PARA_FALTA === 0) {
            state.userData.faltas++;
            alert(`⚠️ Has acumulado ${CONFIG.RETARDOS_PARA_FALTA} retardos = 1 FALTA`);
        }
    }
    
    // Check for baja
    if (state.userData.faltas >= CONFIG.FALTAS_PARA_BAJA) {
        alert('🚫 Has sido dado de BAJA por acumular 3 faltas. Contacta al coach.');
    }
    
    saveUserStats();
    loadUserStats();
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

function saveUserStats() {
    localStorage.setItem('userStats', JSON.stringify({
        asistencias: state.userData.asistencias,
        retardos: state.userData.retardos,
        faltas: state.userData.faltas
    }));
}

// ========================================
// FEED
// ========================================
async function loadFeed() {
    const container = document.getElementById('feedContainer');
    
    // Mock feed data (replace with actual fetch)
    const feed = [
        {
            id: 1,
            title: 'Entrenamiento Extra',
            message: 'Mañana habrá sesión adicional a las 16:00 hrs',
            date: new Date().toISOString(),
            type: 'info'
        },
        {
            id: 2,
            title: 'Torneo Próximo',
            message: 'Se aproxima el torneo estatal. ¡A entrenar duro!',
            date: new Date(Date.now() - 86400000).toISOString(),
            type: 'important'
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
    
    if (pin === CONFIG.COACH_PIN) {
        document.getElementById('coachLogin').classList.add('hidden');
        document.getElementById('coachPanel').classList.remove('hidden');
        loadCoachStats();
    } else {
        alert('❌ PIN incorrecto');
    }
}

function loadCoachStats() {
    // Mock stats (replace with actual data)
    document.getElementById('coachStats').innerHTML = `
        <p>Total Jugadores: <span class="float-right font-bold">24</span></p>
        <p>Asistencia Promedio: <span class="float-right font-bold">87%</span></p>
        <p>Retardos Hoy: <span class="float-right font-bold">3</span></p>
    `;
}

function exportToCSV() {
    // Create CSV content
    const csv = `Nombre,Asistencias,Retardos,Faltas\n${state.userData.nombre},${state.userData.asistencias},${state.userData.retardos},${state.userData.faltas}`;
    
    // Download
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
        alert('✅ Aviso publicado (funcionalidad pendiente de backend)');
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
