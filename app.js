ñconst CONFIG = {
  SHEETBEST_URL: 'https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55',
  CHECKIN_URL: 'https://riversapp.vercel.app/checkin.html',
  CHECKIN_START: '16:00',
  CHECKIN_END: '17:30',
  SESSION_TIME: '16:45',
  TOLERANCE: 15,
  TARGET_LAT: 20.0,
  TARGET_LON: -100.0,
  MAX_DISTANCE_KM: 0.5,
  COACH_PINS: ['1234', '0000']
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
  generateMainQRCode();
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

function setupEventListeners() {
  const menuBtn = document.getElementById('menuBtn');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      switchTab(tab);
      toggleSidebar();
      if (tab === 'scan') {
        startQRScanner();
      } else {
        stopQRScanner();
      }
    });
  });

  document.getElementById('unlockCoach')?.addEventListener('click', unlockCoachPanel);
  document.getElementById('coachPIN')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') unlockCoachPanel();
  });
  document.getElementById('exportCSV')?.addEventListener('click', exportToCSV);
  document.getElementById('editSchedule')?.addEventListener('click', editScheduleConfig);
  document.getElementById('sendNotice')?.addEventListener('click', sendNotice);
  document.getElementById('resetSeason')?.addEventListener('click', resetSeason);
  document.getElementById('stopScan')?.addEventListener('click', stopQRScanner);
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('active');
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  const target = document.getElementById(`${tabName}Tab`) || document.getElementById('homeTab');
  target.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });
  state.currentTab = tabName;
}

function generateQRCode() {
  const container = document.getElementById('qrContainer');
  if (!container || typeof QRCode === 'undefined') return;
  container.innerHTML = '';
  new QRCode(container, {
    text: CONFIG.CHECKIN_URL,
    width: 250,
    height: 250,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
}

function generateMainQRCode() {
  const container = document.getElementById('mainQRContainer');
  if (!container || typeof QRCode === 'undefined') return;
  container.innerHTML = '';
  new QRCode(container, {
    text: CONFIG.CHECKIN_URL,
    width: 200,
    height: 200,
    colorDark: '#00D9FF',
    colorLight: '#0A0A0A',
    correctLevel: QRCode.CorrectLevel.H
  });
}

function startQRScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    showScanResult('La biblioteca de QR no está cargada', 'error');
    return;
  }
  if (state.qrScanner) {
    state.qrScanner.clear();
  }
  const html5QrCode = new Html5Qrcode('reader');
  html5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      handleScan(decodedText);
      html5QrCode.stop();
    },
    () => {}
  ).then(() => {
    state.qrScanner = html5QrCode;
    document.getElementById('stopScan')?.classList.remove('hidden');
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
    }).catch((err) => {
      console.error('Error al detener scanner:', err);
    });
  }
}

function handleScan(qrData) {
  const resultDiv = document.getElementById('scanResult');
  if (!resultDiv) return;
  if (!navigator.geolocation) {
    showScanResult('Tu navegador no soporta geolocalización', 'error');
    return;
  }
  navigator.geolocation.getCurrentPosition((position) => {
    const { latitude, longitude } = position.coords;
    const R = 6371;
    const dLat = (latitude - CONFIG.TARGET_LAT) * Math.PI / 180;
    const dLon = (longitude - CONFIG.TARGET_LON) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(CONFIG.TARGET_LAT * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    if (distance > CONFIG.MAX_DISTANCE_KM) {
      showScanResult(`❌ Fuera de rango (${distance.toFixed(2)} km). Acércate al campo.`, 'error');
      return;
    }
    try {
      const scannedUrl = new URL(qrData, window.location.href);
      const allowedHosts = [window.location.hostname, 'riversapp.vercel.app', 'localhost'];
      if (allowedHosts.includes(scannedUrl.hostname) && scannedUrl.pathname.includes('/checkin.html')) {
        window.location.href = `${scannedUrl.href}?lat=${latitude}&lon=${longitude}`;
        return;
      }
      showScanResult('❌ QR no autorizado', 'error');
    } catch (error) {
      showScanResult('❌ QR inválido', 'error');
    }
  }, () => {
    showScanResult('❌ Activa el GPS y vuelve a intentar', 'error');
  }, { enableHighAccuracy: true });
}

function showScanResult(message, type) {
  const resultDiv = document.getElementById('scanResult');
  if (!resultDiv) return;
  resultDiv.textContent = message;
  resultDiv.className = `mt-4 p-4 rounded-lg text-center ${type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`;
  resultDiv.classList.remove('hidden');
  setTimeout(() => resultDiv.classList.add('hidden'), 4000);
}

function unlockCoachPanel() {
  const pin = document.getElementById('coachPIN')?.value.trim();
  if (!pin) return;
  if (CONFIG.COACH_PINS.includes(pin)) {
    document.getElementById('coachLogin')?.classList.add('hidden');
    document.getElementById('coachPanel')?.classList.remove('hidden');
    loadCoachStats();
    loadScheduleConfig();
  } else {
    alert('❌ PIN incorrecto');
    document.getElementById('coachPIN').value = '';
  }
}

function getTodaySession() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

async function loadCoachStats() {
  const target = document.getElementById('coachStats');
  if (!target) return;
  try {
    const response = await fetch(CONFIG.SHEETBEST_URL);
    const data = await response.json();
    const totalPlayers = new Set(data.map(r => r.nombre)).size;
    const totalRecords = data.length;
    const avgAttendance = totalPlayers > 0 ? Math.round((totalRecords / totalPlayers) * 100) : 0;
    const todayLate = data.filter(r => r.tipo === 'retardo' && r.session === getTodaySession()).length;
    target.innerHTML = `
      <p>Total Jugadoras: <strong>${totalPlayers}</strong></p>
      <p>Asistencia Promedio: <strong>${avgAttendance}%</strong></p>
      <p>Retardos Hoy: <strong>${todayLate}</strong></p>
    `;
  } catch (error) {
    console.error('Error cargando stats:', error);
    target.innerHTML = '<p class="text-red-500">No se pudieron cargar las estadísticas.</p>';
  }
}

async function exportToCSV() {
  try {
    const response = await fetch(CONFIG.SHEETBEST_URL);
    const data = await response.json();
    let csv = 'Nombre,Tipo,Fecha_Hora,Sesion,Dispositivo,Diff_Minutos\n';
    data.forEach(row => {
      csv += `${row.nombre || ''},${row.tipo || ''},${row.timestamp || ''},${row.session || ''},${row.deviceId || 'N/A'},${row.diffMinutes || 0}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `RIVERS_Asistencias_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    alert('✅ CSV exportado correctamente');
  } catch (error) {
    console.error('Error exportando CSV:', error);
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
  const newDays = prompt(`Días de sesión (0=Dom,1=Lun,2=Mar,3=Mié,4=Jue,5=Vie,6=Sáb)\nActual: ${currentConfig.dias.join(', ')}`, currentConfig.dias.join(','));
  const newTime = prompt(`Hora de inicio (HH:MM):\nActual: ${currentConfig.hora}`, currentConfig.hora);
  const newTolerance = prompt(`Tolerancia en minutos:\nActual: ${currentConfig.tolerancia}`, currentConfig.tolerancia);
  const newLocation = prompt(`Ubicación:\nActual: ${currentConfig.location}`, currentConfig.location);
  if (newDays && newTime && newTolerance && newLocation) {
    const updatedConfig = {
      dias: newDays.split(',').map(d => parseInt(d.trim())).filter(Number.isFinite),
      hora: newTime.trim(),
      tolerancia: parseInt(newTolerance, 10) || 15,
      location: newLocation.trim()
    };
    localStorage.setItem('scheduleConfig', JSON.stringify(updatedConfig));
    loadScheduleConfig();
    updateScheduleDisplay();
    alert('✅ Configuración actualizada');
  }
}

function loadScheduleConfig() {
  const config = JSON.parse(localStorage.getItem('scheduleConfig')) || {
    dias: [2, 4],
    hora: '17:00',
    tolerancia: 15,
    location: 'La Laguna es el que quiero que van'
  };
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dayLabels = config.dias.map(d => dayNames[d] || '-').join(', ');
  const configDaysEl = document.getElementById('configDays');
  const configTimeEl = document.getElementById('configTime');
  const configToleranceEl = document.getElementById('configTolerance');
  
  if (configDaysEl) configDaysEl.textContent = dayLabels;
  if (configTimeEl) configTimeEl.textContent = config.hora;
  if (configToleranceEl) configToleranceEl.textContent = `${config.tolerancia} min`;
}

function sendNotice() {
  const notice = prompt('Escribe el aviso para publicar:');
  if (notice) {
    const notices = JSON.parse(localStorage.getItem('clubNotices')) || [];
    notices.unshift({ id: Date.now(), text: notice, timestamp: new Date().toISOString(), author: 'Coach' });
    localStorage.setItem('clubNotices', JSON.stringify(notices));
    loadFeed();
    alert('✅ Aviso publicado');
  }
}

function resetSeason() {
  if (confirm('⚠️ ¿Seguro que quieres resetear la temporada? Esto NO borrará la Sheet, solo limpiará datos locales.')) {
    localStorage.removeItem('rivers_backup');
    localStorage.removeItem('clubNotices');
    localStorage.removeItem('scheduleConfig');
    alert('✅ Temporada reseteada (datos locales)');
    loadFeed();
    loadScheduleConfig();
  }
}

function loadUserStats() {
  const userStats = state.userData;
  const asistenciasEl = document.getElementById('asistencias');
  const retardosEl = document.getElementById('retardos');
  const faltasEl = document.getElementById('faltas');
  
  if(asistenciasEl) asistenciasEl.textContent = userStats.asistencias || 0;
  if(retardosEl) retardosEl.textContent = userStats.retardos || 0;
  if(faltasEl) faltasEl.textContent = userStats.faltas || 0;
}

function updateScheduleDisplay() {
  const config = JSON.parse(localStorage.getItem('scheduleConfig')) || { location: 'Campos de la Laguna' };
  const sessionLocationEl = document.getElementById('sessionLocation');
  const sessionDateEl = document.getElementById('sessionDate');
  
  if (sessionLocationEl) sessionLocationEl.textContent = config.location;
  if (sessionDateEl) sessionDateEl.textContent = 'Próximo Entrenamiento';
}

function loadFeed() {
  const container = document.getElementById('feedContainer');
  if (!container) return;
  const notices = JSON.parse(localStorage.getItem('clubNotices')) || [
    { id: 1, text: 'Bienvenidas RIVER's 🏈', timestamp: new Date().toISOString(), author: 'Dirección' }
  ];
  if (notices.length === 0) {
    container.innerHTML = '<p class="text-gray-400 text-center py-4">No hay avisos publicados</p>';
    return;
  }
  container.innerHTML = notices.map(notice => `
    <div class="feed-item p-4 mb-3 rounded-lg bg-gray-800 border border-gray-700">
      <p class="text-sm mb-2 text-white">${notice.text}</p>
      <div class="flex justify-between text-xs text-gray-400">
        <span>${new Date(notice.timestamp).toLocaleDateString()}</span>
        <span>${notice.author}</span>
      </div>
    </div>
  `).join('');
}
