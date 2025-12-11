async function cargarPedidos() {
    const tablaID = 'tabla-cuerpo-pedidos';
    limpiarTabla(tablaID);

    try {
        const response = await fetch(`${API_BASE_URL}/orders`);
        if (!response.ok) throw new Error("Error conectando con API Pedidos");
        
        const pedidos = await response.json();
        const cuerpo = document.getElementById(tablaID);

        if(pedidos.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="6" class="text-center">No hay pedidos registrados</td></tr>';
            return;
        }

        pedidos.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.clientName}</td>
                <td>${order.origin}</td>
                <td>${order.destination}</td>
                <td><span class="badge ${order.status === 'ENTREGADO' ? 'bg-success' : 'bg-warning text-dark'}">${order.status}</span></td>
                <td>
                   <button class="btn btn-sm btn-danger" onclick="borrarPedido(${order.id})">🗑️ Borrar</button>
                </td>
            `;
            cuerpo.appendChild(row);
        });
    } catch (error) {
        console.warn(error);
        mostrarError("Error cargando pedidos: " + error.message);
    }
}

function crearPedido() {
    mostrarFormulario("Nuevo Pedido", [
        { label: "Cliente", key: "clientName" },
        { label: "Origen", key: "origin" },
        { label: "Destino", key: "destination" },
        { label: "Estado (PENDIENTE/EN RUTA/ENTREGADO)", key: "status" },
        { label: "Transporte (MARITIMO/AEREO/TERRESTRE)", key: "transportMode" }
    ], async (datos) => {
        // Validación simple
        if (!datos.clientName || !datos.origin || !datos.destination) {
            mostrarError("Por favor, rellena los campos obligatorios.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(datos)
            });

            if(response.ok) {
                mostrarPopup("¡Pedido Creado!", "El pedido se ha registrado correctamente.", "success");
                cargarPedidos();
            } else {
                mostrarError("No se pudo crear el pedido.");
            }
        } catch(e) { mostrarError(e.message); }
    });
}

function borrarPedido(id) {
    mostrarConfirmacion(
        "¿Eliminar Pedido?",
        `Vas a borrar el pedido #${id}. ¿Estás seguro?`,
        async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/orders/${id}`, { method: 'DELETE' });
                if(response.ok) {
                    mostrarPopup("Eliminado", "Pedido eliminado correctamente.", "success");
                    cargarPedidos();
                } else {
                    mostrarError("No se pudo borrar el pedido.");
                }
            } catch(e) { mostrarError(e.message); }
        }
    );
}