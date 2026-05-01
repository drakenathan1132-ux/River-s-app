```javascript
// ========================================
// RIVERS TOCHITO CLUB - APP LOGIC
// ========================================

const CONFIG = {
    // Reemplaza con tu URL de conexión de Sheetbest
    SHEETBEST_URL: 'https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55', 
    CHECKIN_START: '16:00',
    CHECKIN_END: '17:30',
    SESSION_TIME: '16:45',
    TOLERANCE: 15,
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

// ========================================
// INIT
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    generateQRCode();
    loadUserStats();
    updateScheduleDisplay();
    loadFeed();
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

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    // Menú y navegación
    document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', toggleSidebar);
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchTab(tab);
            toggleSidebar();
            
            // Iniciar scanner si vamos al tab de scan
            if (tab === 'scan') {
                startQRScanner();
            } else {
                stopQRScanner();
            }
        });
    });

    // Coach Panel
    document.getElementById('unlockCoach').addEventListener('click', unlockCoachPanel);
    document.getElementById('coachPIN').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') unlockCoachPanel();
    });
    
    // Coach Actions
    document.getElementById('refreshQR')?.addEventListener('click', generateQRCode);
    document.getElementById('exportCSV')?.addEventListener('click', exportToCSV);
    document.getElementById('editSchedule')?.addEventListener('click', editScheduleConfig);
    document.getElementById('sendNotice')?.addEventListener('click', sendNotice);
    document.getElementById('resetSeason')?.addEventListener('click', resetSeason);
    
    // Stop Scanner
    document.getElementById('stopScan')?.addEventListener('click', stopQRScanner);
}

// ========================================
// NAVIGATION
// ========================================

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function switchTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    
    // Mostrar tab seleccionado
    document.getElementById(`${tabName}Tab`)?.classList.remove('hidden');
    
    // Actualizar estado activo en sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });
    
    state.currentTab = tabName;
}

// ========================================
// QR CODE GENERATION
// ========================================

function generateQRCode() {
    const container = document.getElementById('qrContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    new QRCode(container, {
        text: CONFIG.CHECKIN_URL,
        width: 250,
        height: 250,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    console.log('✅ QR generado:', CONFIG.CHECKIN_URL);
}

// ========================================
// QR SCANNER
// ========================================

function startQRScanner() {
    if (state.qrScanner) {
        state.qrScanner.clear();
    }
    
    const html5QrCode = new Html5Qrcode("reader");
    
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            handleScan(decodedText);
            html5QrCode.stop();
        },
        (errorMessage) => {
            // Silenciar errores de escaneo continuo
        }
    ).then(() => {
        state.qrScanner = html5QrCode;
        document.getElementById('stopScan')?.classList.remove('hidden');
        console.log('📷 Scanner iniciado');
    }).catch((err) => {
        console.error('Error al iniciar scanner:', err);
        showScanResult('❌ Error al acceder a la cámara', 'error');
    });
}

function stopQRScanner() {
    if (state.qrScanner) {
        state.qrScanner.stop().then(() => {
            state.qrScanner.clear();
            state.qrScanner = null;
            document.getElementById('stopScan')?.classList.add('hidden');
            console.log('📷 Scanner detenido');
        }).catch((err) => {
            console.error('Error al detener scanner:', err);
        });
    }
}

function handleScan(qrData) {
    console.log('Iniciando validación de ubicación y QR...');

    navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        
        // Cálculo de distancia (Fórmula de Haversine)
        const R = 6371; 
        const dLat = (latitude - CONFIG.TARGET_LAT) * Math.PI / 180;
        const dLon = (longitude - CONFIG.TARGET_LON) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(CONFIG.TARGET_LAT * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        // 1. Validar Distancia (300 metros según tu CONFIG)
        if (distance > CONFIG.MAX_DISTANCE_KM) {
            showScanResult(`❌ Fuera de rango (${(distance).toFixed(2)}km). Acércate al campo.`, 'error');
            return;
        }

        // 2. Validar URL del QR
        try {
            const scannedUrl = new URL(qrData);
            const allowedHosts = [window.location.hostname, 'riversapp.vercel.app', 'localhost'];
            
            if (allowedHosts.includes(scannedUrl.hostname) && scannedUrl.pathname.includes('/checkin.html')) {
                // Hack: Pasamos lat/lon a la siguiente página para el registro final
                window.location.href = `${qrData}?lat=${latitude}&lon=${longitude}`;
                return;
            }
            showScanResult('❌ QR no autorizado', 'error');
        } catch (error) {
            showScanResult('❌ QR inválido', 'error');
        }
    }, (err) => {
        showScanResult('❌ Error: Activa el GPS para marcar asistencia', 'error');
    }, { enableHighAccuracy: true });
}
        
        // Verificar que el hostname sea permitido Y tenga /checkin.html
        if (allowedHosts.includes(scannedUrl.hostname) && scannedUrl.pathname.includes('/checkin.html')) {
            window.location.href = qrData;
            return;
        }
        
        showScanResult('❌ QR no autorizado', 'error');
    } catch (error) {
        showScanResult('❌ QR inválido', 'error');
    }
}

function showScanResult(message, type) {
    const resultDiv = document.getElementById('scanResult');
    if (!resultDiv) return;
    
    resultDiv.textContent = message;
    resultDiv.className = `mt-4 p-4 rounded-lg text-center ${
        type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
    }`;
    resultDiv.classList.remove('hidden');
    
    setTimeout(() => {
        resultDiv.classList.add('hidden');
    }, 3000);
}

// ========================================
// COACH PANEL
// ========================================

function unlockCoachPanel() {
    const pin = document.getElementById('coachPIN').value.trim();
    
    if (CONFIG.COACH_PINS.includes(pin)) {
        document.getElementById('coachLogin').classList.add('hidden');
        document.getElementById('coachPanel').classList.remove('hidden');
        loadCoachStats();
        loadScheduleConfig();
        console.log('✅ Coach Panel desbloqueado');
    } else {
        alert('❌ PIN Incorrecto');
        document.getElementById('coachPIN').value = '';
    }
}

async function loadCoachStats() {
    try {
        const response = await fetch(CONFIG.SHEETBEST_URL);
        const data = await response.json();
        
        const totalPlayers = new Set(data.map(r => r.nombre)).size;
        const totalRecords = data.length;
        const avgAttendance = totalRecords > 0 ? Math.round((totalRecords / totalPlayers) * 100) : 0;
        const todayLate = data.filter(r => r.tipo === 'retardo' && r.session === getTodaySession()).length;
        
        document.getElementById('coachStats').innerHTML = `
            <p>Total Jugadoras: <span class="float-right font-bold">${totalPlayers}</span></p>
            <p>Asistencia Promedio: <span class="float-right font-bold">${avgAttendance}%</span></p>
            <p>Retardos Hoy: <span class="float-right font-bold">${todayLate}</span></p>
        `;
    } catch (error) {
        console.error('Error cargando stats:', error);
    }
}

async function exportToCSV() {
    try {
        const response = await fetch(CONFIG.SHEETBEST_URL);
        const data = await response.json();
        
        let csv = 'Nombre,Tipo,Fecha_Hora,Sesion,Dispositivo,Diff_Minutos\n';
        data.forEach(row => {
            csv += `${row.nombre},${row.tipo},${row.timestamp},${row.session},${row.deviceId || 'N/A'},${row.diffMinutes || 0}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `RIVERS_Asistencias_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        alert('✅ CSV exportado correctamente');
    } catch (error) {
        console.error('Error exportando CSV:', error);
        
        // Fallback: Exportar datos locales si falla la conexión
        const localData = localStorage.getItem('rivers_backup');
        if (localData) {
            const blob = new Blob([localData], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `RIVERS_Backup_Local_${Date.now()}.json`;
            link.click();
            alert('⚠️ Exportando respaldo local (sin conexión)');
        } else {
            alert('❌ Error al exportar y no hay datos locales');
        }
    }
}

function editScheduleConfig() {
    const currentConfig = JSON.parse(localStorage.getItem('scheduleConfig')) || {
        dias: [2, 4],
        hora: '16:45',
        tolerancia: 15,
        location: 'Cancha Principal'
    };
    
    const newDays = prompt(`Días de sesión (0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb)\nActual: ${currentConfig.dias.join(', ')}`, currentConfig.dias.join(','));
    const newTime = prompt(`Hora de inicio (HH:MM):\nActual: ${currentConfig.hora}`, currentConfig.hora);
    const newTolerance = prompt(`Tolerancia en minutos:\nActual: ${currentConfig.tolerancia}`, currentConfig.tolerancia);
    const newLocation = prompt(`Ubicación:\nActual: ${currentConfig.location}`, currentConfig.location);
    
    if (newDays && newTime && newTolerance && newLocation) {
        const updatedConfig = {
            dias: newDays.split(',').map(d => parseInt(d.trim())),
            hora: newTime.trim(),
            tolerancia: parseInt(newTolerance),
            location: newLocation.trim()
        };
        
        localStorage.setItem('scheduleConfig', JSON.stringify(updatedConfig));
        loadScheduleConfig();
        alert('✅ Configuración actualizada');
    }
}

function loadScheduleConfig() {
    const config = JSON.parse(localStorage.getItem('scheduleConfig')) || {
        dias: [2, 4],
        hora: '16:45',
        tolerancia: 15,
        location: 'Cancha Principal'
    };
    
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dayLabels = config.dias.map(d => dayNames[d]).join(', ');
    
    document.getElementById('configDays').textContent = dayLabels;
    document.getElementById('configTime').textContent = config.hora;
    document.getElementById('configTolerance').textContent = `${config.tolerancia} min`;
}

function sendNotice() {
    const notice = prompt('Escribe el aviso para publicar:');
    if (notice) {
        const notices = JSON.parse(localStorage.getItem('clubNotices')) || [];
        notices.unshift({
            id: Date.now(),
            text: notice,
            timestamp: new Date().toISOString(),
            author: 'Coach'
        });
        localStorage.setItem('clubNotices', JSON.stringify(notices));
        loadFeed();
        alert('✅ Aviso publicado');
    }
}

function resetSeason() {
    if (confirm('⚠️ ¿Seguro que quieres resetear la temporada?\n\nEsto NO borrará la Sheet, solo limpiará datos locales.')) {
        localStorage.removeItem('rivers_backup');
        localStorage.removeItem('clubNotices');
        alert('✅ Temporada reseteada (datos locales)');
    }
}

// ========================================
// FEED DE AVISOS
// ========================================

function loadFeed() {
    const container = document.getElementById('feedContainer');
    if (!container) return;
    
    const notices = JSON.parse(localStorage.getItem('clubNotices')) || [
        { id: 1, text: 'Bienvenidas a la temporada 2025 de RIVERS Tochito Club 🏈', timestamp: new Date().toISOString(), author: 'Dirección' }
    ];
    
    if (notices.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">No hay avisos publicados</p>';
        return;
    }
    
    container.innerHTML = notices.map(notice => `
        <div class="feed-item p-4 mb-3 rounded-lg bg-gray-800">
            <p class="text-sm mb-2">${notice.text}</p>
            <div class="flex justify-between items-center text-xs text-gray-400">
                <span>${notice.author}</span>
                <span>${new Date(notice.timestamp).toLocaleDateString('es-MX')}</span>
            </div>
        </div>
    `).join('');
}

// ========================================
// USER STATS
// ========================================

async function loadUserStats() {
    try {
        const response = await fetch(CONFIG.SHEETBEST_URL);
        const data = await response.json();
        
        const userRecords = data.filter(r => r.nombre === state.userData.nombre);
        
        const asistencias = userRecords.filter(r => r.tipo === 'asistencia').length;
        const retardos = userRecords.filter(r => r.tipo === 'retardo').length;
        const faltas = Math.floor(retardos / 3);
        
        document.getElementById('asistencias').textContent = asistencias;
        document.getElementById('retardos').textContent = retardos;
        document.getElementById('faltas').textContent = faltas;
        
        state.userData.asistencias = asistencias;
        state.userData.retardos = retardos;
        state.userData.faltas = faltas;
        
    } catch (error) {
        console.error('Error cargando stats de usuario:', error);
    }
}

// ========================================
// SCHEDULE DISPLAY
// ========================================

function updateScheduleDisplay() {
    const config = JSON.parse(localStorage.getItem('scheduleConfig')) || {
        dias: [2, 4],
        hora: '16:45',
        location: 'Cancha Principal'
    };
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // Encontrar próximo día de sesión
    let nextSessionDay = config.dias.find(d => d > dayOfWeek);
    if (!nextSessionDay) nextSessionDay = config.dias[0];
    
    const daysUntil = nextSessionDay > dayOfWeek ? nextSessionDay - dayOfWeek : 7 - dayOfWeek + nextSessionDay;
    const nextSession = new Date(now);
    nextSession.setDate(now.getDate() + daysUntil);
    
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
