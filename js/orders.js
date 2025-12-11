let pedidosCargados = [];

async function cargarPedidos() {
    const tablaID = 'tabla-cuerpo-pedidos';
    limpiarTabla(tablaID);

    // Ocultar botón 'Añadir' si no es admin
    const btnAdd = document.querySelector('.add-button');
    if (btnAdd) btnAdd.style.display = esAdmin() ? 'block' : 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/orders`);
        if (!response.ok) throw new Error("Error API Pedidos");
        
        pedidosCargados = await response.json();
        const cuerpo = document.getElementById(tablaID);

        if(pedidosCargados.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="6" class="text-center">No hay pedidos</td></tr>';
            return;
        }

        pedidosCargados.forEach(order => {
            let botonesAccion = '';
            if (esAdmin()) {
                botonesAccion = `<button class="btn btn-sm btn-danger" onclick="borrarPedido(${order.id})">🗑️ Borrar</button>`;
            } else {
                botonesAccion = '<span class="text-muted fs-6">👁️ Ver</span>';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.clientName}</td>
                <td>${order.origin}</td>
                <td>${order.destination}</td>
                <td><span class="badge ${order.status === 'ENTREGADO' ? 'bg-success' : 'bg-warning text-dark'}">${order.status}</span></td>
                <td>${botonesAccion}</td>
            `;
            cuerpo.appendChild(row);
        });
    } catch (error) { mostrarError(error.message); }
}

function crearPedido() {
    if (!esAdmin()) return mostrarError("⛔ Acceso Denegado.");

    const ciudadesEspaña = ["Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona", "Burgos", "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ceuta", "Ciudad Real", "Córdoba", "Cuenca", "Girona", "Granada", "Guadalajara", "Guipúzcoa", "Huelva", "Huesca", "Illes Balears", "Jaén", "La Coruña", "La Rioja", "Las Palmas", "León", "Lleida", "Lugo", "Madrid", "Málaga", "Melilla", "Murcia", "Navarra", "Ourense", "Palencia", "Pontevedra", "Salamanca", "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid", "Vizcaya", "Zamora", "Zaragoza"];
    const opcionesCiudades = ciudadesEspaña.map(c => ({ val: c, text: c }));
    const opcionesEstado = [{val:"Pendiente",text:"Pendiente"},{val:"En Proceso",text:"En Proceso"},{val:"Enviado",text:"Enviado"},{val:"En Tránsito",text:"En Tránsito"},{val:"Entregado",text:"Entregado"},{val:"Cancelado",text:"Cancelado"}];

    mostrarFormulario("Nuevo Pedido", [
        { label: "Cliente", key: "clientName" },
        { label: "Origen", key: "origin", type: "select", options: opcionesCiudades },
        { label: "Destino", key: "destination", type: "select", options: opcionesCiudades },
        { label: "Estado", key: "status", type: "select", options: opcionesEstado },
        { label: "Transporte", key: "transportMode", type: "select", options: [{val:"MARITIMO",text:"Marítimo"},{val:"AEREO",text:"Aéreo"},{val:"TERRESTRE",text:"Terrestre"}] }
    ], async (datos) => {
        if (!datos.clientName) return mostrarError("Faltan datos.");
        try {
            const res = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos)
            });
            if(res.ok) { mostrarPopup("Creado", "Pedido registrado.", "success"); cargarPedidos(); }
            else mostrarError("Error al crear pedido.");
        } catch(e) { mostrarError(e.message); }
    });
}

function borrarPedido(id) {
    if (!esAdmin()) return mostrarError("⛔ Acceso Denegado.");

    const order = pedidosCargados.find(o => o.id === id);
    if (!order) return;

    mostrarConfirmacionSegura(
        "¿Borrar Pedido?",
        `Estás eliminando el pedido #${id} de <b>${order.clientName}</b>.`,
        order.clientName,
        async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/orders/${id}`, { method: 'DELETE' });
                if(response.ok) { mostrarPopup("Eliminado", "Pedido borrado.", "success"); cargarPedidos(); }
                else mostrarError("No se pudo borrar.");
            } catch(e) { mostrarError(e.message); }
        }
    );
}