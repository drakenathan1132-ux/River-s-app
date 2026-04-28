const CONFIG = {
    SHEETBEST_URL: 'https://api.sheetbest.com/sheets/1c152e4a-32f0-4216-aafa-086c7c972c55',
    COACH_PINS: ['2501', '2502', '2503', '2504'],
    CHECKIN_URL: window.location.origin + '/checkin.html'
};

let scheduleConfig = JSON.parse(localStorage.getItem('scheduleConfig')) || { dias: [2, 4], hora: '16:45', tolerancia: 15, location: 'La Laguna' };

document.addEventListener('DOMContentLoaded', () => {
    generateQRCode();
    loadUserStats();
    setupEvents();
});

function setupEvents() {
    document.getElementById('unlockCoach').onclick = () => {
        const pin = document.getElementById('coachPIN').value;
        if (CONFIG.COACH_PINS.includes(pin)) {
            document.getElementById('coachLogin').classList.add('hidden');
            document.getElementById('coachPanel').classList.remove('hidden');
            loadCoachStats();
        }
    };
    
    // Botón para descargar respaldo local si la nube falla
    const exportBtn = document.getElementById('exportCSV');
    exportBtn.onclick = exportToCSV;
}

async function loadCoachStats() {
    try {
        const res = await fetch(CONFIG.SHEETBEST_URL);
        const data = await res.json();
        const total = new Set(data.map(r => r.nombre)).size;
        document.getElementById('coachStats').innerHTML = `<p>Jugadoras registradas: ${total}</p>`;
    } catch (e) {
        document.getElementById('coachStats').innerHTML = "Modo Offline - Datos no disponibles";
    }
}

function generateQRCode() {
    const container = document.getElementById('qrContainer');
    if(container) {
        container.innerHTML = '';
        new QRCode(container, { text: CONFIG.CHECKIN_URL, width: 250, height: 250 });
    }
}

async function exportToCSV() {
    const res = await fetch(CONFIG.SHEETBEST_URL);
    const data = await res.json();
    let csv = "Nombre,Tipo,Fecha\n" + data.map(r => `${r.nombre},${r.tipo},${r.timestamp}`).join("\n");
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asistencias_rivers.csv';
    a.click();
}

function loadUserStats() {
    const name = localStorage.getItem('userName');
    if(name) document.getElementById('userNameDisp').innerText = name;
}
