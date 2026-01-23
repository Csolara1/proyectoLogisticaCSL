// js/dashboard.js COMPLETO Y CORREGIDO

document.addEventListener("DOMContentLoaded", () => {
    // 1. Verificamos quién está entrando
    if (typeof verificarSesion === 'function') verificarSesion();
    const usuario = obtenerUsuario();

    // 2. Ajustamos la pantalla según el rol
    if (esAdmin()) {
        // --- VISTA DE ADMINISTRADOR (Todo visible) ---
        cargarMetricasAdmin();
        cargarLogsReales();
        inicializarGraficosAdmin();
    } else {
        // --- VISTA DE USUARIO NORMAL (Privada) ---
        adaptarDashboardUsuario(usuario);
        cargarMetricasUsuario(usuario);
        inicializarGraficosUsuario(usuario);
    }
});

// ==========================================
// LÓGICA DE ADMINISTRADOR (LO VEO TODO)
// ==========================================

async function cargarMetricasAdmin() {
    try {
        // Usuarios Totales
        const resUsers = await fetch(`${API_BASE_URL}/users`);
        if (resUsers.ok) {
            const users = await resUsers.json();
            animarContador("metric-users", users.length);
        }

        // Pedidos Activos (Globales)
        const resOrders = await fetch(`${API_BASE_URL}/orders`);
        if (resOrders.ok) {
            const orders = await resOrders.json();
            const activos = orders.filter(o => o.status !== 'ENTREGADO' && o.status !== 'CANCELADO').length;
            animarContador("metric-orders", activos);
        }

        // Stock Total
        const resStock = await fetch(`${API_BASE_URL}/stock`);
        if (resStock.ok) {
            const stockItems = await resStock.json();
            const totalStock = stockItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
            animarContador("metric-stock", totalStock);
        }
    } catch (error) { console.error("Error métricas admin:", error); }
}

async function cargarLogsReales() {
    // Solo el admin ve los logs
    try {
        const response = await fetch(`${API_BASE_URL}/logs`);
        if (response.ok) {
            const logs = await response.json();
            const logArea = document.querySelector('.log-area');
            
            // Filtro de memoria local (si borraste logs)
            const ultimaLimpieza = localStorage.getItem('csl_logs_cleared_at');
            let logsFiltrados = logs;

            if (ultimaLimpieza) {
                const fechaCorte = new Date(ultimaLimpieza);
                logsFiltrados = logs.filter(log => {
                    const fechaLog = new Date(log.eventTime.endsWith('Z') ? log.eventTime : log.eventTime + 'Z');
                    return fechaLog > fechaCorte;
                });
            }

            if (!logsFiltrados.length) {
                logArea.value = "Registro de eventos vacío.";
                return;
            }

            const textoLogs = logsFiltrados.map(log => {
                const fechaRaw = log.eventTime.endsWith('Z') ? log.eventTime : log.eventTime + 'Z';
                const fecha = new Date(fechaRaw).toLocaleString();
                return `[${fecha}] ${log.logLevel || 'INFO'}: ${log.eventMessage}`;
            }).join('\n');

            logArea.value = textoLogs;
            logArea.scrollTop = logArea.scrollHeight;
        }
    } catch (e) { console.error("Error logs", e); }
}

async function inicializarGraficosAdmin() {
    // Carga los gráficos globales (Donut y Barras)
    try {
        const resOrders = await fetch(`${API_BASE_URL}/orders`);
        if (resOrders.ok) {
            const orders = await resOrders.json();
            pintarDonutPedidos(orders, 'chartPedidos');
        }
        const resStock = await fetch(`${API_BASE_URL}/stock`);
        if (resStock.ok) {
            const stockItems = await resStock.json();
            pintarBarrasStock(stockItems, 'chartStock');
        }
    } catch(e) { console.error(e); }
}


// ==========================================
// LÓGICA DE USUARIO (SOLO LO MÍO)
// ==========================================

function adaptarDashboardUsuario(usuario) {
    // 1. Ocultar tarjetas que no le importan (Usuarios y Stock)
    const cardUsers = document.getElementById('metric-users').closest('.metric-card');
    const cardStock = document.getElementById('metric-stock').closest('.metric-card');
    
    if(cardUsers) cardUsers.style.display = 'none';
    if(cardStock) cardStock.style.display = 'none';

    // 2. Cambiar título de la tarjeta de Pedidos
    const cardOrders = document.getElementById('metric-orders').closest('.metric-card');
    if(cardOrders) {
        cardOrders.querySelector('h3').innerText = "Mis Pedidos Activos";
        cardOrders.style.width = "100%"; 
        cardOrders.style.maxWidth = "400px";
    }

    // 3. Ocultar sección de Logs
    const sectionLogs = document.querySelector('.dashboard-activity');
    if(sectionLogs) sectionLogs.style.display = 'none';

    // 4. Ocultar Gráfico de Stock
    const chartStockCanvas = document.getElementById('chartStock');
    if(chartStockCanvas) {
        const cardChartStock = chartStockCanvas.closest('.card');
        if(cardChartStock) cardChartStock.parentElement.style.display = 'none'; 
    }
    
    // 5. Ajustar el título principal
    document.querySelector('h1').innerText = `Bienvenido, ${usuario.fullName}`;
    document.querySelector('.section-description').innerText = "Aquí tienes el estado de tus envíos personales.";
}

async function cargarMetricasUsuario(usuario) {
    try {
        const resOrders = await fetch(`${API_BASE_URL}/orders`);
        if (resOrders.ok) {
            const todosLosPedidos = await responseToArray(resOrders);
            // FILTRO CLAVE: Solo mis pedidos
            const misPedidos = todosLosPedidos.filter(o => o.clientName.toLowerCase() === usuario.fullName.toLowerCase());
            
            const misActivos = misPedidos.filter(o => o.status !== 'ENTREGADO' && o.status !== 'CANCELADO').length;
            animarContador("metric-orders", misActivos);
        }
    } catch (error) { console.error(error); }
}

async function inicializarGraficosUsuario(usuario) {
    try {
        const resOrders = await fetch(`${API_BASE_URL}/orders`);
        if (resOrders.ok) {
            const todos = await responseToArray(resOrders);
            const misPedidos = todos.filter(o => o.clientName.toLowerCase() === usuario.fullName.toLowerCase());
            
            // Pintamos el donut solo con SUS datos
            pintarDonutPedidos(misPedidos, 'chartPedidos');
        }
    } catch(e) { console.error(e); }
}


// ==========================================
// UTILIDADES GRÁFICAS (COMPARTIDAS)
// ==========================================

async function responseToArray(response) {
    return await response.json();
}

function pintarDonutPedidos(orders, canvasId) {
    // --- [NUEVO] PROTECCIÓN ANTI-ERROR SI NO HAY COOKIES ---
    // Si Chart no está definido (porque rechazamos cookies), salimos sin hacer nada.
    if (typeof Chart === 'undefined') return;

    let pendientes = 0, enProceso = 0, enviados = 0, entregados = 0;
    orders.forEach(o => {
        const st = (o.status || '').toUpperCase();
        if (st.includes('PENDIENTE')) pendientes++;
        else if (st.includes('PROCESO') || st.includes('PREPARACION')) enProceso++;
        else if (st.includes('ENVIADO') || st.includes('TRANSITO') || st.includes('RUTA')) enviados++;
        else if (st.includes('ENTREGADO')) entregados++;
    });

    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
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

function pintarBarrasStock(stockItems, canvasId) {
    // --- [NUEVO] PROTECCIÓN ANTI-ERROR SI NO HAY COOKIES ---
    if (typeof Chart === 'undefined') return;

    const conteoAlmacen = {}; 
    ['MAD-01', 'MAD-02', 'MAD-03', 'MAD-04', 'MAD-05'].forEach(almacen => { conteoAlmacen[almacen] = 0; });

    stockItems.forEach(item => {
        const wh = item.warehouse || 'OTROS';
        conteoAlmacen[wh] = (conteoAlmacen[wh] || 0) + item.quantity;
    });

    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
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
            scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
        }
    });
}

// ==========================================
// UTILIDADES (Logs y Animación)
// ==========================================
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

function borrarLogs() {
    // Esta función solo la llamará el HTML si el botón existe (y el admin es el único que lo ve)
    const ahora = new Date().toISOString();
    localStorage.setItem('csl_logs_cleared_at', ahora);
    document.querySelector('.log-area').value = "Registro de eventos vacío.";
    mostrarPopup("Registro Limpio", "Historial limpiado.", "success");
}