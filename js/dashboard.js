// js/dashboard.js - VERSIÓN FINAL COMPLETA

document.addEventListener("DOMContentLoaded", () => {
    // 1. Verificación de seguridad al cargar
    if (typeof verificarSesion === 'function') {
        verificarSesion();
    }
    
    const usuario = obtenerUsuario();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Inicialización según el rol
    if (esAdmin()) {
        // --- MODO ADMINISTRADOR ---
        console.log("Iniciando Dashboard: MODO ADMIN");
        cargarMetricasAdmin();
        cargarLogsReales();
        inicializarGraficosAdmin();
    } else {
        // --- MODO CLIENTE ---
        console.log("Iniciando Dashboard: MODO CLIENTE");
        adaptarDashboardUsuario(usuario);
        cargarMetricasUsuario(usuario);
        inicializarGraficosUsuario(usuario);
    }
});

// ==========================================
// LÓGICA DE ADMINISTRADOR (Ve todo)
// ==========================================

async function cargarMetricasAdmin() {
    try {
        // 1. Usuarios Totales
        const resUsers = await fetch(`${API_BASE_URL}/users`);
        if (resUsers.ok) {
            const users = await resUsers.json();
            animarContador("metric-users", users.length);
        }

        // 2. Pedidos Activos (Globales)
        const resOrders = await fetch(`${API_BASE_URL}/orders`);
        if (resOrders.ok) {
            const orders = await resOrders.json();
            // Contamos como activos los que no están Entregados ni Cancelados
            const activos = orders.filter(o => 
                o.status !== 'ENTREGADO' && o.status !== 'CANCELADO'
            ).length;
            animarContador("metric-orders", activos);
        }

        // 3. Stock Total
        const resStock = await fetch(`${API_BASE_URL}/stock`);
        if (resStock.ok) {
            const stockItems = await resStock.json();
            const totalStock = stockItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
            animarContador("metric-stock", totalStock);
        }
    } catch (error) { 
        console.error("Error cargando métricas de admin:", error); 
    }
}

async function cargarLogsReales() {
    try {
        const response = await fetch(`${API_BASE_URL}/logs`);
        if (response.ok) {
            const logs = await response.json();
            const logArea = document.querySelector('.log-area');
            
            if (!logArea) return;

            // Filtro local: si el admin pulsó "limpiar logs" en su navegador
            const ultimaLimpieza = localStorage.getItem('csl_logs_cleared_at');
            let logsFiltrados = logs;

            if (ultimaLimpieza) {
                const fechaCorte = new Date(ultimaLimpieza);
                logsFiltrados = logs.filter(log => {
                    // Normalizamos fecha por si viene con/sin Z
                    const fechaLog = new Date(log.eventTime.endsWith('Z') ? log.eventTime : log.eventTime + 'Z');
                    return fechaLog > fechaCorte;
                });
            }

            if (logsFiltrados.length === 0) {
                logArea.value = "Registro de eventos vacío o limpio.";
                return;
            }

            // Formateamos el log para que sea legible
            const textoLogs = logsFiltrados.map(log => {
                const fechaRaw = log.eventTime.endsWith('Z') ? log.eventTime : log.eventTime + 'Z';
                const fecha = new Date(fechaRaw).toLocaleString();
                return `[${fecha}] ${log.logLevel || 'INFO'}: ${log.eventMessage}`;
            }).join('\n');

            logArea.value = textoLogs;
            logArea.scrollTop = logArea.scrollHeight; // Auto-scroll al final
        }
    } catch (e) { 
        console.error("Error cargando logs:", e); 
    }
}

async function inicializarGraficosAdmin() {
    // Si Chart.js no cargó (por error de red o script), evitamos el fallo
    if (typeof Chart === 'undefined') return;

    try {
        // Gráfico 1: Pedidos Globales
        const resOrders = await fetch(`${API_BASE_URL}/orders`);
        if (resOrders.ok) {
            const orders = await resOrders.json();
            pintarDonutPedidos(orders, 'chartPedidos');
        }

        // Gráfico 2: Stock por Almacén
        const resStock = await fetch(`${API_BASE_URL}/stock`);
        if (resStock.ok) {
            const stockItems = await resStock.json();
            pintarBarrasStock(stockItems, 'chartStock');
        }
    } catch(e) { 
        console.error("Error iniciando gráficos admin:", e); 
    }
}


// ==========================================
// LÓGICA DE USUARIO (Solo sus datos)
// ==========================================

function adaptarDashboardUsuario(usuario) {
    // 1. Ocultar tarjetas que no le importan (Usuarios y Stock)
    const cardUsers = document.getElementById('metric-users');
    if (cardUsers) cardUsers.closest('.metric-card').style.display = 'none';

    const cardStock = document.getElementById('metric-stock');
    if (cardStock) cardStock.closest('.metric-card').style.display = 'none';

    // 2. Adaptar la tarjeta de "Pedidos" para que sea la principal
    const cardOrders = document.getElementById('metric-orders');
    if (cardOrders) {
        const contenedor = cardOrders.closest('.metric-card');
        contenedor.querySelector('h3').innerText = "Mis Pedidos en Curso";
        // Hacemos que ocupe más espacio o se centre si prefieres
        contenedor.style.width = "100%"; 
        contenedor.style.maxWidth = "400px";
    }

    // 3. Ocultar sección de Logs (Privado del sistema)
    const sectionLogs = document.querySelector('.dashboard-activity');
    if (sectionLogs) sectionLogs.style.display = 'none';

    // 4. Ocultar Gráfico de Stock (Info interna)
    const chartStockCanvas = document.getElementById('chartStock');
    if (chartStockCanvas) {
        // Subimos hasta encontrar el contenedor padre de la tarjeta del gráfico
        const cardChartStock = chartStockCanvas.closest('.card');
        if (cardChartStock) cardChartStock.parentElement.style.display = 'none'; 
    }
    
    // 5. Personalizar el título de bienvenida
    const tituloPrincipal = document.querySelector('h1');
    if (tituloPrincipal) tituloPrincipal.innerText = `Hola, ${usuario.fullName}`;
    
    const desc = document.querySelector('.section-description');
    if (desc) desc.innerText = "Bienvenido a tu panel de cliente. Aquí puedes ver el estado de tus envíos.";
}

async function cargarMetricasUsuario(usuario) {
    try {
        // USAMOS EL FILTRO DEL BACKEND: ?userId=...
        // Esto es mucho más seguro y eficiente que traer todos y filtrar aquí.
        const id = usuario.userId || usuario.id;
        const resOrders = await fetch(`${API_BASE_URL}/orders?userId=${id}`);
        
        if (resOrders.ok) {
            const misPedidos = await resOrders.json();
            
            // Contamos solo los activos
            const misActivos = misPedidos.filter(o => 
                o.status !== 'ENTREGADO' && o.status !== 'CANCELADO'
            ).length;
            
            animarContador("metric-orders", misActivos);
        }
    } catch (error) { 
        console.error("Error métricas usuario:", error); 
    }
}

async function inicializarGraficosUsuario(usuario) {
    if (typeof Chart === 'undefined') return;

    try {
        const id = usuario.userId || usuario.id;
        const resOrders = await fetch(`${API_BASE_URL}/orders?userId=${id}`);
        
        if (resOrders.ok) {
            const misPedidos = await resOrders.json();
            // Pintamos el donut solo con SUS datos
            pintarDonutPedidos(misPedidos, 'chartPedidos');
        }
    } catch(e) { 
        console.error("Error gráficos usuario:", e); 
    }
}


// ==========================================
// UTILIDADES GRÁFICAS (COMPARTIDAS)
// ==========================================

function pintarDonutPedidos(orders, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Contadores
    let pendientes = 0, enProceso = 0, enviados = 0, entregados = 0;

    orders.forEach(o => {
        const st = (o.status || '').toUpperCase();
        if (st.includes('PENDIENTE')) pendientes++;
        else if (st.includes('PROCESO') || st.includes('PREPARACION')) enProceso++;
        else if (st.includes('ENVIADO') || st.includes('TRANSITO') || st.includes('RUTA')) enviados++;
        else if (st.includes('ENTREGADO')) entregados++;
    });

    // Destruir gráfico anterior si existe para evitar superposiciones
    if (window.miDonutChart) window.miDonutChart.destroy();

    const ctx = canvas.getContext('2d');
    window.miDonutChart = new Chart(ctx, {
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
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function pintarBarrasStock(stockItems, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Agrupamos stock por almacén
    const conteoAlmacen = {}; 
    // Inicializamos algunos almacenes base para que el gráfico no quede vacío si no hay datos
    ['MAD-01', 'MAD-02', 'BCN-01', 'VAL-01'].forEach(a => conteoAlmacen[a] = 0);

    stockItems.forEach(item => {
        const wh = item.warehouse || 'OTROS';
        conteoAlmacen[wh] = (conteoAlmacen[wh] || 0) + (item.quantity || 0);
    });

    if (window.miBarChart) window.miBarChart.destroy();

    const ctx = canvas.getContext('2d');
    window.miBarChart = new Chart(ctx, {
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
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                y: { beginAtZero: true }, 
                x: { grid: { display: false } } 
            }
        }
    });
}

// ==========================================
// UTILIDADES (Logs y Animación)
// ==========================================

function animarContador(idElemento, valorFinal) {
    const elemento = document.getElementById(idElemento);
    if (!elemento) return;
    
    // Si el valor es 0, lo ponemos directo
    if (!valorFinal || valorFinal === 0) { 
        elemento.innerText = "0"; 
        return; 
    }

    let valorActual = 0;
    // Calculamos un incremento para que la animación dure aprox lo mismo siempre
    const incremento = Math.ceil(valorFinal / 30) || 1; 
    
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
    // Esta función se puede vincular a un botón "Limpiar Logs" en el HTML del admin
    const ahora = new Date().toISOString();
    localStorage.setItem('csl_logs_cleared_at', ahora);
    
    const logArea = document.querySelector('.log-area');
    if (logArea) logArea.value = "Registro de eventos vacío.";
    
    // Si usas el sistema de popups de app.js:
    if (typeof mostrarPopup === 'function') {
        mostrarPopup("Historial", "Logs limpiados de la vista local.", "success");
    } else {
        alert("Logs limpiados.");
    }
}