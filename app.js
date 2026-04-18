// ========================================
// RIVERS TOCHITO CLUB - APP.JS
// Sistema de Gestión de Asistencias
// ========================================

// ========================================
// 1. CONSTANTS & CONFIGURATION
// ========================================

const ADMIN_PIN = '2000';
const TOLERANCE_MINUTES = 15;
const RETARDOS_PER_FALTA = 3;
// Google Apps Script endpoint (configurar con tu URL de deployment)
const SYNC_ENDPOINT = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
const RIVERS_SCHEDULE = {
    DIAS_PERMITIDOS: [2, 4], // Martes = 2, Jueves = 4
    APERTURA: "16:30",
    INICIO_ENTRENO: "17:00",
    CIERRE: "17:15" // Después de esto ya no pueden registrarse ni con retardo
};
// ========================================
// 2. DATA MANAGEMENT (LocalStorage)
// ========================================

class DataManager {
    constructor() {    getDeviceID() {
        let id = localStorage.getItem('rivers_device_id');
        if (!id) {
            id = 'RIVERS-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('rivers_device_id', id);
        }
        return id;
    }

    checkHorario() {
        const ahora = new Date();
        const diaSemana = ahora.getDay();
        const horaActual = ahora.getHours().toString().padStart(2, '0') + ":" + ahora.getMinutes().toString().padStart(2, '0');

        if (!RIVERS_SCHEDULE.DIAS_PERMITIDOS.includes(diaSemana)) {
            return { habilitado: false, msg: "Hoy no hay entrenamiento programado." };
        }
        if (horaActual < RIVERS_SCHEDULE.APERTURA) {
            return { habilitado: false, msg: `El registro abre a las 4:30 PM. (Hora actual: ${horaActual})` };
        }
        if (horaActual > RIVERS_SCHEDULE.CIERRE) {
            return { habilitado: false, msg: "El registro ya cerró. Reportate con el Coach." };
        }
        
        const esRetardo = horaActual > RIVERS_SCHEDULE.INICIO_ENTRENO;
        return { habilitado: true, estatus: esRetardo ? "⚠️ RETARDO" : "✅ ASISTENCIA" };
    }

        this.PLAYERS_KEY = 'rivers_players';
        this.ATTENDANCE_KEY = 'rivers_attendance';
    }
    
    // Players CRUD
    getPlayers() {
        const data = localStorage.getItem(this.PLAYERS_KEY);
        return data ? JSON.parse(data) : [];
    }
    
    savePlayers(players) {
        localStorage.setItem(this.PLAYERS_KEY, JSON.stringify(players));
    }
    
    addPlayer(player) {
        const players = this.getPlayers();
        const newPlayer = {
            ...player,
            retardos: 0,
            faltas: 0,
            createdAt: new Date().toISOString()
        };
        players.push(newPlayer);
        this.savePlayers(players);
        return newPlayer;
    }
    
    updatePlayer(playerId, updates) {
        const players = this.getPlayers();
        const index = players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            players[index] = { ...players[index], ...updates };
            this.savePlayers(players);
            return players[index];
        }
        return null;
    }
    
    deletePlayer(playerId) {
        let players = this.getPlayers();
        players = players.filter(p => p.id !== playerId);
        this.savePlayers(players);
    }
    
    getPlayerById(playerId) {
        const players = this.getPlayers();
        return players.find(p => p.id === playerId);
    }
    
    // Attendance Management
    getAttendance() {
        const data = localStorage.getItem(this.ATTENDANCE_KEY);
        return data ? JSON.parse(data) : [];
    }
    
    saveAttendance(attendance) {
        localStorage.setItem(this.ATTENDANCE_KEY, JSON.stringify(attendance));
    }
    
    addAttendanceRecord(record) {
        const attendance = this.getAttendance();
        attendance.push({
            ...record,
            timestamp: new Date().toISOString()
        });
        this.saveAttendance(attendance);
        
        // Update player stats
        const player = this.getPlayerById(record.playerId);
        if (player) {
            if (record.status === 'retardo') {
                player.retardos = (player.retardos || 0) + 1;
                
                // Auto-convert 3 retardos to 1 falta
                if (player.retardos >= RETARDOS_PER_FALTA) {
                    player.faltas = (player.faltas || 0) + 1;
                    player.retardos = 0;
                }
            }
            this.updatePlayer(player.id, player);
        }
    }
    
    getTodayAttendance() {
        const attendance = this.getAttendance();
        const today = new Date().toISOString().split('T')[0];
        return attendance.filter(a => a.timestamp.startsWith(today));
    }
    
    // Export all data for sync
    exportAllData() {
        return {
            players: this.getPlayers(),
            attendance: this.getAttendance(),
            exportedAt: new Date().toISOString()
        };
    }
}

const dataManager = new DataManager();

// ========================================
// 3. NAVIGATION SYSTEM
// ========================================

class NavigationManager {
    constructor() {
        this.currentSection = 'reglamento';
        this.init();
    }
    
    init() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.navigateTo(section);
            });
        });
    }
    
    navigateTo(section) {
        // Hide all sections
        document.querySelectorAll('.section-content').forEach(s => {
            s.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(`section-${section}`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            item.classList.add('text-gray-400');
            if (item.dataset.section === section) {
                item.classList.add('active');
                item.classList.remove('text-gray-400');
            }
        });
        
        this.currentSection = section;
        
        // Refresh content if needed
        if (section === 'dashboard') {
            dashboardManager.refresh();
        } else if (section === 'admin' && adminManager.isUnlocked) {
            adminManager.renderPlayers();
        }
    }
}

const navigationManager = new NavigationManager();

// ========================================
// 4. QR SCANNER & CHECK-IN
// ========================================

class CheckInManager {
    constructor() {
        this.scanner = null;
        this.isScanning = false;
        this.init();
    }
    
    init() {
        document.getElementById('startScanBtn').addEventListener('click', () => this.startScanning());
        document.getElementById('stopScanBtn').addEventListener('click', () => this.stopScanning());
    }
    
    startScanning() {
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        this.scanner = new Html5Qrcode("reader");
        
        this.scanner.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                this.handleScan(decodedText);
            },
            (errorMessage) => {
                // Ignore continuous scan errors
            }
        ).then(() => {
            this.isScanning = true;
            document.getElementById('startScanBtn').classList.add('hidden');
            document.getElementById('stopScanBtn').classList.remove('hidden');
        }).catch(err => {
            this.showResult('Error al iniciar cámara: ' + err, 'error');
        });
    }
    
    stopScanning() {
        if (this.scanner && this.isScanning) {
            this.scanner.stop().then(() => {
                this.scanner.clear();
                this.isScanning = false;
                document.getElementById('startScanBtn').classList.remove('hidden');
                document.getElementById('stopScanBtn').classList.add('hidden');
            });
        }
    }
    
    handleScan(playerId) {
        // Stop scanning temporarily
        this.stopScanning();
        
        // Get player data
        const player = dataManager.getPlayerById(playerId);
        
        if (!player) {
            this.showResult(`❌ ID "${playerId}" no encontrado`, 'error');
            setTimeout(() => this.startScanning(), 3000);
            return;
        }
        
        // Check if already checked in today
        const todayAttendance = dataManager.getTodayAttendance();
        const alreadyCheckedIn = todayAttendance.find(a => a.playerId === playerId);
        
        if (alreadyCheckedIn) {
            this.showResult(`⚠️ ${player.name} ya registró asistencia hoy`, 'error');
            setTimeout(() => this.startScanning(), 3000);
            return;
        }
        
        // Get start time and current time
        const startTime = document.getElementById('startTime').value;
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const status = this.calculateStatus(startTime, currentTime);
        
        // Record attendance
        dataManager.addAttendanceRecord({
            playerId: player.id,
            playerName: player.name,
            status: status,
            startTime: startTime,
            checkInTime: currentTime
        });
        
        // Show result
        const statusText = status === 'asistencia' ? '✅ ASISTENCIA' : '⏰ RETARDO';
        const statusClass = status === 'asistencia' ? 'success' : 'error';
        this.showResult(`${statusText}<br>${player.name}<br>Hora: ${currentTime}`, statusClass);
        
        // Restart scanning after delay
        setTimeout(() => this.startScanning(), 3000);
    }
    
    calculateStatus(startTime, currentTime) {
        const [startH, startM] = startTime.split(':').map(Number);
        const [currentH, currentM] = currentTime.split(':').map(Number);
        
        const startMinutes = startH * 60 + startM;
        const currentMinutes = currentH * 60 + currentM;
        
        const diff = currentMinutes - startMinutes;
        
        return diff <= TOLERANCE_MINUTES ? 'asistencia' : 'retardo';
    }
    
    showResult(message, type) {
        const resultDiv = document.getElementById('scanResult');
        const resultText = document.getElementById('scanResultText');
        
        resultDiv.classList.remove('hidden', 'success-flash', 'error-flash');
        resultDiv.classList.add(type === 'success' ? 'success-flash' : 'error-flash');
        resultText.innerHTML = message;
        
        setTimeout(() => {
            resultDiv.classList.add('hidden');
        }, 3000);
    }
}

const checkInManager = new CheckInManager();

// ========================================
// 5. DASHBOARD (Public View)
// ========================================

class DashboardManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.refresh();
    }
    
    refresh() {
        const today = new Date().toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        document.getElementById('todayDate').textContent = today;
        
        const attendance = dataManager.getTodayAttendance();
        const tbody = document.getElementById('dashboardTableBody');
        const emptyState = document.getElementById('emptyDashboard');
        
        if (attendance.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        tbody.innerHTML = attendance.map(record => {
            const statusBadge = record.status === 'asistencia' 
                ? '<span class="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs">✓ Asistencia</span>'
                : '<span class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-xs">⏰ Retardo</span>';
            
            return `
                <tr class="border-b border-gray-800">
                    <td class="py-3 px-2">${record.playerName}</td>
                    <td class="py-3 px-2">${record.checkInTime}</td>
                    <td class="py-3 px-2">${statusBadge}</td>
                </tr>
            `;
        }).join('');
    }
}

const dashboardManager = new DashboardManager();

// ========================================
// 6. ADMIN PANEL
// ========================================

class AdminManager {
    constructor() {
        this.isUnlocked = false;
        this.init();
    }
    
    init() {
        // Unlock button
        document.getElementById('unlockAdminBtn').addEventListener('click', () => {
            this.showPinModal();
        });
        
        // PIN modal
        document.getElementById('submitPinBtn').addEventListener('click', () => {
            this.validatePin();
        });
        
        document.getElementById('cancelPinBtn').addEventListener('click', () => {
            this.closePinModal();
        });
        
        // Add player
        document.getElementById('addPlayerBtn').addEventListener('click', () => {
            this.addPlayer();
        });
        
        // Sync button
        document.getElementById('syncDataBtn').addEventListener('click', () => {
            this.syncData();
        });
        
        // Edit modal
        document.getElementById('saveEditBtn').addEventListener('click', () => {
            this.saveEdit();
        });
        
        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            this.closeEditModal();
        });
    }
    
    showPinModal() {
        document.getElementById('pinModal').classList.add('active');
        document.getElementById('pinInput').value = '';
        document.getElementById('pinInput').focus();
    }
    
    closePinModal() {
        document.getElementById('pinModal').classList.remove('active');
    }
    
    validatePin() {
        const pin = document.getElementById('pinInput').value;
        
        if (pin === ADMIN_PIN) {
            this.isUnlocked = true;
            this.closePinModal();
            this.unlockAdmin();
        } else {
            alert('❌ PIN incorrecto');
            document.getElementById('pinInput').value = '';
        }
    }
    
    unlockAdmin() {
        document.getElementById('unlockAdminBtn').classList.add('hidden');
        document.getElementById('adminContent').classList.remove('hidden');
        this.renderPlayers();
    }
    
    addPlayer() {
        const name = document.getElementById('newPlayerName').value.trim();
        const id = document.getElementById('newPlayerId').value.trim().toUpperCase();
        const age = parseInt(document.getElementById('newPlayerAge').value);
        
        if (!name || !id || !age) {
            alert('⚠️ Completa todos los campos');
            return;
        }
        
        // Check if ID already exists
        const existing = dataManager.getPlayerById(id);
        if (existing) {
            alert('⚠️ El ID ya está registrado');
            return;
        }
        
        dataManager.addPlayer({ name, id, age });
        
        // Clear form
        document.getElementById('newPlayerName').value = '';
        document.getElementById('newPlayerId').value = '';
        document.getElementById('newPlayerAge').value = '';
        
        this.renderPlayers();
    }
    
    renderPlayers() {
        const players = dataManager.getPlayers();
        const container = document.getElementById('playersList');
        const emptyState = document.getElementById('emptyRoster');
        
        if (players.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        container.innerHTML = players.map(player => {
            const totalFaltas = (player.faltas || 0) + Math.floor((player.retardos || 0) / RETARDOS_PER_FALTA);
            const statusColor = totalFaltas >= 2 ? 'text-red-400' : totalFaltas >= 1 ? 'text-yellow-400' : 'text-green-400';
            
            return `
                <div class="bg-gray-800/50 rounded-xl p-4">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="text-white font-bold">${player.name}</h4>
                            <p class="text-gray-400 text-sm">ID: ${player.id} • ${player.age} años</p>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="adminManager.editPlayer('${player.id}')" class="text-cyan-400 text-sm">✏️</button>
                            <button onclick="adminManager.deletePlayer('${player.id}')" class="text-red-400 text-sm">🗑️</button>
                        </div>
                    </div>
                    <div class="flex gap-4 text-sm mt-2">
                        <span class="${statusColor}">
                            Faltas: ${player.faltas || 0}
                        </span>
                        <span class="text-yellow-400">
                            Retardos: ${player.retardos || 0}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    editPlayer(playerId) {
        const player = dataManager.getPlayerById(playerId);
        if (!player) return;
        
        document.getElementById('editPlayerId').value = player.id;
        document.getElementById('editPlayerName').value = player.name;
        document.getElementById('editPlayerAge').value = player.age;
        
        document.getElementById('editPlayerModal').classList.add('active');
    }
    
    saveEdit() {
        const playerId = document.getElementById('editPlayerId').value;
        const name = document.getElementById('editPlayerName').value.trim();
        const age = parseInt(document.getElementById('editPlayerAge').value);
        
        if (!name || !age) {
            alert('⚠️ Completa todos los campos');
            return;
        }
        
        dataManager.updatePlayer(playerId, { name, age });
        this.closeEditModal();
        this.renderPlayers();
    }
    
    closeEditModal() {
        document.getElementById('editPlayerModal').classList.remove('active');
    }
    
    deletePlayer(playerId) {
        const player = dataManager.getPlayerById(playerId);
        if (!player) return;
        
        if (confirm(`¿Eliminar a ${player.name}?`)) {
            dataManager.deletePlayer(playerId);
            this.renderPlayers();
        }
    }
    
    async syncData() {
        const btn = document.getElementById('syncDataBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Sincronizando...';
        
        try {
            const data = dataManager.exportAllData();
            
            const response = await fetch(SYNC_ENDPOINT, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            // With no-cors mode, we can't read the response, but we assume success if no error is thrown
            alert('✅ Datos sincronizados correctamente');
            
        } catch (error) {
            console.error('Sync error:', error);
            alert('⚠️ Error al sincronizar. Verifica tu conexión.');
        } finally {
            btn.disabled = false;
            btn.textContent = '☁️ Sincronizar Datos con Nube';
        }
    }
}
// CONFIGURACIÓN TÁCTICA
const UBICACION_CAMPO = { lat: 19.1234, lng: -97.1234 }; // Coordenadas del campo (ajustar después)
const RADIO_MAXIMO = 200; // Metros permitidos a la redonda

async function validarYRegistrar() {
    // 1. OBTENER ID DEL DISPOSITIVO
    let deviceID = localStorage.getItem('rivers_device_id');
    if (!deviceID) {
        deviceID = 'DEV-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('rivers_device_id', deviceID);
    }

    // 2. PEDIR UBICACIÓN
    if (!navigator.geolocation) {
        alert("Tu celular no soporta GPS. No puedes registrarte.");
        return;
    }

    navigator.geolocation.getCurrentPosition((pos) => {
        const d = calcularDistancia(pos.coords.latitude, pos.coords.longitude, UBICACION_CAMPO.lat, UBICACION_CAMPO.lng);
        
        if (d > RADIO_MAXIMO) {
            alert(`Estás muy lejos del campo (${Math.round(d)}m). Acércate para registrarte.`);
            return;
        }

        // 3. SELECCIÓN DE NOMBRE (Temporal hasta tener la lista)
        const nombre = prompt("Escribe tu nombre completo para confirmar:");
        if (!nombre) return;

        procesarAsistencia(nombre, deviceID);
    });
}

// Fórmula matemática para calcular distancia entre coordenadas
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const deltaPhi = (lat2-lat1) * Math.PI/180;
    const deltaLambda = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const adminManager = new AdminManager();

// ========================================
// 7. INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🏈 RIVERS Tochito Club App Initialized');
    
    // Set default start time
    const now = new Date();
    const defaultTime = '18:00';
    document.getElementById('startTime').value = defaultTime;
});
