//

document.addEventListener("DOMContentLoaded", () => {
    // 1. Cargar datos
    cargarMetricas();
    cargarLogsReales();
    
    // 2. Inicializar gráficos
    inicializarGraficos();

    // 3. Ocultar botón borrar si no es admin
    const btnLogs = document.getElementById('btn-vaciar-logs');
    if (btnLogs) {
        if (typeof esAdmin === 'function' && !esAdmin()) {
            btnLogs.style.display = 'none';
        }
    }
});

// --- FUNCIÓN 1: MÉTRICAS ---
async function cargarMetricas() {
    try {
        const resUsers = await fetch(`${API_BASE_URL}/users`);
        if (resUsers.ok) {
            const users = await resUsers.json();
            animarContador("metric-users", users.length);
        }

        const resOrders = await fetch(`${API_BASE_URL}/orders`);
        if (resOrders.ok) {
            const orders = await resOrders.json();
            const activos = orders.filter(o => {
                const s = (o.status || '').toUpperCase();
                return s !== 'ENTREGADO' && s !== 'CANCELADO';
            }).length;
            animarContador("metric-orders", activos);
        }

        const resStock = await fetch(`${API_BASE_URL}/stock`);
        if (resStock.ok) {
            const stockItems = await resStock.json();
            const totalStock = stockItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
            animarContador("metric-stock", totalStock);
        }
    } catch (error) { console.error("Error métricas:", error); }
}

function animarContador(idElemento, valorFinal) {
    const elemento = document.getElementById(idElemento);
    if (!elemento) return;
    if (valorFinal === 0) { elemento.innerText = "0"; return; }

    let valorActual = 0;
    const incremento = Math.ceil(valorFinal / 30); 
    const intervalo = setInterval(() => {
        valorActual += incremento;
        if (valorActual >= valorFinal) {
            valorActual = valorFinal;
            clearInterval(intervalo);
        }
        elemento.innerText = valorActual;
    }, 30); 
}

// --- FUNCIÓN 2: LOGS (CON MEMORIA PERSISTENTE) ---
async function cargarLogsReales() {
    try {
        const response = await fetch(`${API_BASE_URL}/logs`);
        if (response.ok) {
            let logs = await response.json();
            const logArea = document.querySelector('.log-area');
            
            // --- TRUCO DE MEMORIA ---
            // Leemos cuándo fue la última vez que el usuario "borró" los logs
            const ultimaLimpieza = localStorage.getItem('csl_logs_cleared_at');

            if (ultimaLimpieza) {
                // Filtramos: Solo mostramos los logs que sean MÁS NUEVOS que la fecha de limpieza
                const fechaCorte = new Date(ultimaLimpieza);
                
                logs = logs.filter(log => {
                    const fechaLog = new Date(log.eventTime.endsWith('Z') ? log.eventTime : log.eventTime + 'Z');
                    return fechaLog > fechaCorte;
                });
            }

            if (!logs.length) {
                logArea.value = "Registro de eventos vacío.";
                return;
            }

            const textoLogs = logs.map(log => {
                const fechaRaw = log.eventTime.endsWith('Z') ? log.eventTime : log.eventTime + 'Z';
                const fecha = new Date(fechaRaw).toLocaleString();
                return `[${fecha}] ${log.logLevel || 'INFO'}: ${log.eventMessage}`;
            }).join('\n');

            logArea.value = textoLogs;
            logArea.scrollTop = logArea.scrollHeight;
        }
    } catch (e) { console.error("Error logs", e); }
}

function borrarLogs() {
    if (typeof esAdmin === 'function' && !esAdmin()) {
        mostrarPopup("Acceso Denegado", "Solo el administrador puede vaciar los logs.", "error");
        return;
    }

    mostrarConfirmacion(
        "¿Vaciar Registro?",
        "Se ocultarán todos los eventos actuales de la pantalla de forma permanente.",
        () => {
            // --- TRUCO DE MEMORIA ---
            // 1. Guardamos la hora actual como "punto de corte"
            const ahora = new Date().toISOString();
            localStorage.setItem('csl_logs_cleared_at', ahora);

            // 2. Limpiamos visualmente
            document.querySelector('.log-area').value = "Registro de eventos vacío.";
            mostrarPopup("Registro Limpio", "El historial ha sido limpiado.", "success");
        }
    );
}

// --- FUNCIÓN 3: GRÁFICOS ---
async function inicializarGraficos() {
    try {
        // DONUT
        const resOrders = await fetch(`${API_BASE_URL}/orders`);
        if (resOrders.ok) {
            const orders = await resOrders.json();
            let pendientes = 0, enProceso = 0, enviados = 0, entregados = 0;

            orders.forEach(o => {
                const st = (o.status || '').toUpperCase();
                if (st.includes('PENDIENTE')) pendientes++;
                else if (st.includes('PROCESO') || st.includes('PREPARACION')) enProceso++;
                else if (st.includes('ENVIADO') || st.includes('TRANSITO') || st.includes('RUTA')) enviados++;
                else if (st.includes('ENTREGADO')) entregados++;
            });

            const ctx1 = document.getElementById('chartPedidos').getContext('2d');
            new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: ['Pendiente', 'En Proceso', 'Enviado', 'Entregado'],
                    datasets: [{
                        data: [pendientes, enProceso, enviados, entregados],
                        backgroundColor: ['#ffc107', '#17a2b8', '#0d6efd', '#198754'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
            });
        }

        // BARRAS
        const resStock = await fetch(`${API_BASE_URL}/stock`);
        if (resStock.ok) {
            const stockItems = await resStock.json();
            const conteoAlmacen = {}; 
            ['MAD-01', 'MAD-02', 'MAD-03', 'MAD-04', 'MAD-05'].forEach(almacen => { conteoAlmacen[almacen] = 0; });

            stockItems.forEach(item => {
                const wh = item.warehouse || 'OTROS';
                conteoAlmacen[wh] = (conteoAlmacen[wh] || 0) + item.quantity;
            });

            const ctx2 = document.getElementById('chartStock').getContext('2d');
            new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: Object.keys(conteoAlmacen),
                    datasets: [{
                        label: 'Unidades Disponibles',
                        data: Object.values(conteoAlmacen),
                        backgroundColor: '#5e35b1',
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } }
                }
            });
        }
    } catch (error) { console.error("Error gráficos:", error); }
}