document.addEventListener("DOMContentLoaded", () => {
    // 1. Protección: Si no estás logueado, te manda fuera
    if (typeof verificarSesion === 'function') {
        verificarSesion();
    }

    // 2. Cargar los datos visuales
    cargarMetricas();
    cargarLogsReales();
});

// --- FUNCIÓN 1: CARGAR TARJETAS DE NÚMEROS ---
async function cargarMetricas() {
    try {
        // A) Usuarios Totales
        const resUsers = await fetch(`${API_BASE_URL}/users`);
        if (resUsers.ok) {
            const users = await resUsers.json();
            animarContador("metric-users", users.length);
        }

        // B) Pedidos Activos (No entregados)
        const resOrders = await fetch(`${API_BASE_URL}/orders`);
        if (resOrders.ok) {
            const orders = await resOrders.json();
            // Filtramos: Solo contamos los que NO están "ENTREGADO"
            const activos = orders.filter(o => o.status !== 'ENTREGADO').length;
            animarContador("metric-orders", activos);
        }

        // C) Stock Total (Suma de cantidades)
        const resStock = await fetch(`${API_BASE_URL}/stock`);
        if (resStock.ok) {
            const stockItems = await resStock.json();
            // Sumamos la propiedad 'quantity' de cada item
            const totalStock = stockItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
            animarContador("metric-stock", totalStock);
        }

    } catch (error) {
        console.error("Error cargando métricas del dashboard:", error);
    }
}

// --- FUNCIÓN 2: ANIMACIÓN DE NÚMEROS (Efecto visual) ---
function animarContador(idElemento, valorFinal) {
    const elemento = document.getElementById(idElemento);
    if (!elemento) return;

    // Si el valor es 0, lo ponemos directo y salimos
    if (valorFinal === 0) {
        elemento.innerText = "0";
        return;
    }

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

// --- FUNCIÓN 3: CARGAR LOGS DEL SISTEMA (CORREGIDA HORA) ---
async function cargarLogsReales() {
    try {
        const response = await fetch(`${API_BASE_URL}/logs`);
        
        if (response.ok) {
            const logs = await response.json();
            const logArea = document.querySelector('.log-area');
            
            if (logs.length === 0) {
                logArea.value = "Esperando eventos del sistema...";
                return;
            }

            // Formateamos los logs
            const textoLogs = logs.map(log => {
                // TRUCO TIMEZONE:
                // El servidor envía "2023-12-10T07:58:00" (Hora UTC/Docker)
                // Le añadimos 'Z' al final -> "2023-12-10T07:58:00Z"
                // El navegador lee la 'Z', sabe que es UTC y lo transforma a TU hora local (+1)
                const fechaRaw = log.eventTime.endsWith('Z') ? log.eventTime : log.eventTime + 'Z';
                const fecha = new Date(fechaRaw).toLocaleString();
                
                return `[${fecha}] ${log.logLevel || 'INFO'}: ${log.eventMessage}`;
            }).join('\n');

            logArea.value = textoLogs;
            
            // Auto-scroll al final
            logArea.scrollTop = logArea.scrollHeight;
        }
    } catch (e) {
        console.error("Error cargando logs", e);
    }
}