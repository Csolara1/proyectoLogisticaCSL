// js/dashboard.js - VERSIÓN CORREGIDA (SIN CRASH)

document.addEventListener("DOMContentLoaded", () => {
    const usuario = obtenerUsuario();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    if (esAdmin()) {
        // --- ADMIN ---
        console.log("Dashboard: ADMIN");
        cargarMetricasAdmin();
        cargarLogsReales();
        inicializarGraficosAdmin();
    } else {
        // --- CLIENTE ---
        console.log("Dashboard: CLIENTE");
        // 1. Primero adaptamos la vista (ocultar cosas)
        adaptarDashboardUsuario(usuario);
        // 2. Luego cargamos los datos
        cargarMetricasUsuario(usuario);
        // 3. Finalmente los gráficos
        inicializarGraficosUsuario(usuario);
    }
});

// ==========================================
// FUNCIÓN QUE DABA ERROR (CORREGIDA)
// ==========================================
function adaptarDashboardUsuario(u) {
    // 1. Personalizar Saludo
    const titulo = document.querySelector('h1');
    if(titulo) titulo.innerText = `Hola, ${u.fullName}`;

    // 2. Ocultar tarjetas de métricas (Usuarios y Stock)
    // CORRECCIÓN: Usamos getElementById que es seguro con tu HTML actual
    
    // Ocultar tarjeta Usuarios
    const metricUsers = document.getElementById('metric-users');
    if (metricUsers) {
        const card = metricUsers.closest('.metric-card');
        if (card) card.style.display = 'none';
    }

    // Ocultar tarjeta Stock
    const metricStock = document.getElementById('metric-stock');
    if (metricStock) {
        const card = metricStock.closest('.metric-card');
        if (card) card.style.display = 'none';
    }

    // 3. Ajustar tarjeta Pedidos
    const metricOrders = document.getElementById('metric-orders');
    if (metricOrders) {
        const card = metricOrders.closest('.metric-card');
        if (card) {
            // Cambiamos el texto del H3 (Título)
            const tituloCard = card.querySelector('h3');
            if (tituloCard) tituloCard.innerText = "Mis Pedidos Activos";
            card.style.minWidth = "300px"; 
        }
    }

    // 4. Ocultar Gráfico Stock y Centrar Pedidos
    const colStock = document.getElementById('col-chart-stock');
    const colPedidos = document.getElementById('col-chart-pedidos');

    if (colStock) colStock.style.display = 'none';

    if (colPedidos) {
        colPedidos.classList.remove('col-md-6');
        colPedidos.classList.add('col-md-8', 'offset-md-2');
    }

    // 5. Ocultar Logs
    const logsSection = document.querySelector('.dashboard-activity');
    if(logsSection) logsSection.style.display = 'none';
}

// ==========================================
// LÓGICA DE DATOS (CLIENTE)
// ==========================================
async function cargarMetricasUsuario(u) {
    try {
        const id = u.userId || u.id;
        const res = await fetch(`${API_BASE_URL}/orders?userId=${id}`);
        if(res.ok) {
            const pedidos = await res.json();
            const activos = pedidos.filter(o => !['ENTREGADO', 'CANCELADO'].includes(o.status)).length;
            animarContador("metric-orders", activos);
        }
    } catch(e) { console.error(e); }
}

async function inicializarGraficosUsuario(u) {
    if (typeof Chart === 'undefined') return;

    try {
        const id = u.userId || u.id;
        console.log("Cargando gráfico para usuario ID:", id);

        const res = await fetch(`${API_BASE_URL}/orders?userId=${id}`);
        
        if(res.ok) {
            const misPedidos = await res.json();
            console.log("Pedidos encontrados:", misPedidos);
            pintarDonutPedidos(misPedidos, 'chartPedidos');
        } else {
            console.error("Error API:", res.status);
        }
    } catch(e) { console.error("Error gráfico:", e); }
}

// ==========================================
// LÓGICA DE DATOS (ADMIN)
// ==========================================
async function cargarMetricasAdmin() {
    try {
        const [resUsers, resOrders, resStock] = await Promise.all([
            fetch(`${API_BASE_URL}/users`),
            fetch(`${API_BASE_URL}/orders`),
            fetch(`${API_BASE_URL}/stock`)
        ]);

        if (resUsers.ok) animarContador("metric-users", (await resUsers.json()).length);
        if (resOrders.ok) {
            const orders = await resOrders.json();
            const activos = orders.filter(o => !['ENTREGADO', 'CANCELADO'].includes(o.status)).length;
            animarContador("metric-orders", activos);
        }
        if (resStock.ok) {
            const items = await resStock.json();
            const total = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
            animarContador("metric-stock", total);
        }
    } catch (e) { console.error(e); }
}

async function cargarLogsReales() {
    try {
        const res = await fetch(`${API_BASE_URL}/logs`);
        if(res.ok) {
            const logs = await res.json();
            const area = document.querySelector('.log-area');
            if(area && logs.length > 0) {
                const ultimos = logs.slice(-50).reverse();
                area.value = ultimos.map(l => `[${new Date(l.eventTime).toLocaleString()}] ${l.logLevel}: ${l.eventMessage}`).join('\n');
            }
        }
    } catch(e) { console.error(e); }
}

async function inicializarGraficosAdmin() {
    if (typeof Chart === 'undefined') return;
    try {
        const resOrders = await fetch(`${API_BASE_URL}/orders`);
        if (resOrders.ok) pintarDonutPedidos(await resOrders.json(), 'chartPedidos');

        const resStock = await fetch(`${API_BASE_URL}/stock`);
        if (resStock.ok) pintarBarrasStock(await resStock.json(), 'chartStock');
    } catch (e) { console.error(e); }
}

// ==========================================
// UTILIDADES GRÁFICAS
// ==========================================
function pintarDonutPedidos(orders, idCanvas) {
    const canvas = document.getElementById(idCanvas);
    if (!canvas) return;

    let pendientes = 0, proceso = 0, enviados = 0, entregados = 0, cancelados = 0;
    
    orders.forEach(o => {
        const st = (o.status || '').toUpperCase();
        if(st.includes('PENDIENTE')) pendientes++;
        else if(st.includes('PROCESO')) proceso++;
        else if(st.includes('ENVIADO') || st.includes('TRANSITO')) enviados++;
        else if(st.includes('ENTREGADO')) entregados++;
        else if(st.includes('CANCELADO')) cancelados++;
    });

    const chartInstance = Chart.getChart(idCanvas);
    if (chartInstance) chartInstance.destroy();

    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Pendiente', 'En Proceso', 'Enviado', 'Entregado', 'Cancelado'],
            datasets: [{
                data: [pendientes, proceso, enviados, entregados, cancelados],
                backgroundColor: ['#ffc107', '#0dcaf0', '#0d6efd', '#198754', '#dc3545'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function pintarBarrasStock(items, idCanvas) {
    const canvas = document.getElementById(idCanvas);
    if (!canvas) return;

    const almacen = {};
    items.forEach(i => {
        const wh = i.warehouse || 'General';
        almacen[wh] = (almacen[wh] || 0) + (i.quantity || 0);
    });

    const chartInstance = Chart.getChart(idCanvas);
    if (chartInstance) chartInstance.destroy();

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: Object.keys(almacen),
            datasets: [{
                label: 'Stock Total',
                data: Object.values(almacen),
                backgroundColor: '#6610f2'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function animarContador(id, final) {
    const el = document.getElementById(id);
    if(!el) return;
    let actual = 0;
    const step = Math.ceil(final / 20) || 1;
    const t = setInterval(() => {
        actual += step;
        if(actual >= final) { actual = final; clearInterval(t); }
        el.innerText = actual;
    }, 30);
}