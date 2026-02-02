// js/orders.js - GESTIÓN DE PEDIDOS

let pedidosCache = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarPedidos();
    
    // Ocultar botón "Nuevo Pedido" si es cliente
    if (!esAdmin()) {
        const btnAdd = document.querySelector('.add-button'); // O '.btn-add-order'
        if (btnAdd) btnAdd.style.display = 'none';
    }
});

async function cargarPedidos() {
    const tablaCuerpo = document.getElementById('tabla-cuerpo-pedidos');
    tablaCuerpo.innerHTML = '<tr><td colspan="7" class="text-center">Cargando...</td></tr>';

    const usuario = obtenerUsuario();
    try {
        let url = `${API_BASE_URL}/orders`;
        
        // FILTRADO DE SEGURIDAD: Si es cliente, pedimos solo los suyos
        if (!esAdmin()) {
            const id = usuario.userId || usuario.id;
            url += `?userId=${id}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error("Error cargando pedidos");
        
        pedidosCache = await response.json();
        renderizarTabla(pedidosCache);
        configurarBuscador();

    } catch (error) {
        console.error(error);
        tablaCuerpo.innerHTML = '<tr><td colspan="7" class="text-center text-danger">No se pudieron cargar los pedidos</td></tr>';
    }
}

function renderizarTabla(lista) {
    const cuerpo = document.getElementById('tabla-cuerpo-pedidos');
    cuerpo.innerHTML = '';

    if (lista.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay pedidos registrados</td></tr>';
        return;
    }

    const soyAdmin = esAdmin();

    lista.forEach(order => {
        let botones = '';
        
        // Botón Ticket (Para todos)
        const btnTicket = `
            <button class="btn btn-sm btn-outline-secondary me-1" onclick="descargarTicket(${order.id})" title="Descargar Ticket">
                <i class="bi bi-file-earmark-pdf"></i>
            </button>`;

        if (soyAdmin) {
            // Admin: Ticket + Editar + Borrar
            botones = `
                ${btnTicket}
                <button class="btn btn-sm btn-primary me-1" onclick="editarPedido(${order.id})" title="Editar">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="borrarPedido(${order.id})" title="Eliminar">
                    <i class="bi bi-trash-fill"></i>
                </button>
            `;
        } else {
            // Cliente: Solo Ticket
            botones = btnTicket;
        }

        // Ocultar ID visualmente para clientes (opcional, pero queda mejor)
        const celdaId = soyAdmin ? `<td>${order.id}</td>` : ''; 

        const row = document.createElement('tr');
        row.innerHTML = `
            ${celdaId}
            <td>${order.clientName}</td>
            <td>${order.origin}</td>
            <td>${order.destination}</td>
            <td><span class="badge ${getStatusColor(order.status)}">${order.status}</span></td>
            <td>${order.creationDate || '-'}</td>
            <td>${botones}</td>
        `;
        cuerpo.appendChild(row);
    });
}

function getStatusColor(status) {
    if (!status) return 'bg-secondary';
    const s = status.toUpperCase();
    if (s.includes('ENTREGADO')) return 'bg-success';
    if (s.includes('PENDIENTE')) return 'bg-warning text-dark';
    if (s.includes('CANCELADO')) return 'bg-danger';
    return 'bg-primary'; // En tránsito, proceso, etc.
}

// --- ACCIONES ---

function crearPedido() {
    // Solo Admin puede crear
    if (!esAdmin()) return mostrarError("No tienes permisos para crear pedidos.");

    // Opciones para desplegables
    const estados = [
        {val:"PENDIENTE",text:"Pendiente"}, 
        {val:"EN_PROCESO",text:"En Proceso"},
        {val:"EN_TRANSITO",text:"En Tránsito"}, 
        {val:"ENTREGADO",text:"Entregado"}
    ];
    const transportes = [
        {val:"TERRESTRE",text:"Terrestre"}, 
        {val:"MARITIMO",text:"Marítimo"}, 
        {val:"AEREO",text:"Aéreo"}
    ];

    mostrarFormulario("Nuevo Pedido", [
        { label: "Cliente", key: "clientName", placeholder: "Nombre del cliente" },
        { label: "ID Usuario (Opcional)", key: "userId", placeholder: "ID numérico del usuario dueño" },
        { label: "Origen", key: "origin" },
        { label: "Destino", key: "destination" },
        { label: "Transporte", key: "transportMode", type: "select", options: transportes },
        { label: "Estado", key: "status", type: "select", options: estados }
    ], async (datos) => {
        try {
            // Limpiamos userId si está vacío
            if (!datos.userId) delete datos.userId;
            
            const res = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(datos)
            });
            if (res.ok) {
                mostrarPopup("Creado", "Pedido registrado con éxito.", "success");
                cargarPedidos();
            } else {
                mostrarError("Error al crear el pedido.");
            }
        } catch(e) { mostrarError("Fallo de conexión."); }
    });
}

function editarPedido(id) {
    const order = pedidosCache.find(o => o.id === id);
    if (!order) return;

    const estados = [{val:"PENDIENTE",text:"Pendiente"}, {val:"EN_TRANSITO",text:"En Tránsito"}, {val:"ENTREGADO",text:"Entregado"}];
    const transportes = [{val:"TERRESTRE",text:"Terrestre"}, {val:"MARITIMO",text:"Marítimo"}, {val:"AEREO",text:"Aéreo"}];

    mostrarFormulario("Editar Pedido", [
        { label: "Cliente", key: "clientName", value: order.clientName },
        { label: "Origen", key: "origin", value: order.origin },
        { label: "Destino", key: "destination", value: order.destination },
        { label: "Estado", key: "status", type: "select", value: order.status, options: estados },
        { label: "Transporte", key: "transportMode", type: "select", value: order.transportMode, options: transportes }
    ], async (datos) => {
        try {
            // Mantenemos el ID del dueño original
            datos.userId = order.userId;

            const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(datos)
            });
            if (res.ok) {
                mostrarPopup("Actualizado", "Pedido modificado.", "success");
                cargarPedidos();
            } else {
                mostrarError("No se pudo actualizar.");
            }
        } catch(e) { mostrarError("Fallo de conexión."); }
    });
}

function borrarPedido(id) {
    const order = pedidosCache.find(o => o.id === id);
    if (!order) return;

    // Usamos el modal seguro, pero como los pedidos son menos críticos,
    // podemos pedir confirmar el código del pedido o simplemente el nombre del cliente.
    // Para simplificar, usaremos confirmación simple aquí, o segura si prefieres.
    // Usemos confirmación simple para pedidos (más rápido).
    mostrarConfirmacion("Eliminar Pedido", `¿Seguro que quieres borrar el pedido de <b>${order.clientName}</b>?`, async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/orders/${id}`, { method: 'DELETE' });
            if (res.ok) {
                mostrarPopup("Eliminado", "Pedido borrado.", "success");
                cargarPedidos();
            } else {
                mostrarError("Error al borrar.");
            }
        } catch(e) { mostrarError("Fallo de conexión."); }
    });
}

function descargarTicket(id) {
    mostrarPopup("Ticket Generado", `Simulando descarga del ticket #${id}...<br>(Aquí iría la lógica PDF)`, "success");
}

function configurarBuscador() {
    const input = document.querySelector('.search-input');
    if (!input) return;
    
    input.addEventListener('keyup', () => {
        const texto = input.value.toLowerCase();
        const filtrados = pedidosCache.filter(o => 
            o.clientName.toLowerCase().includes(texto) ||
            o.origin.toLowerCase().includes(texto) ||
            o.destination.toLowerCase().includes(texto)
        );
        renderizarTabla(filtrados);
    });
}