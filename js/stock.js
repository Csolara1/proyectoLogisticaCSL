async function cargarStock() {
    const tablaID = 'tabla-cuerpo-stock';
    limpiarTabla(tablaID);

    try {
        const response = await fetch(`${API_BASE_URL}/stock`);
        if (!response.ok) throw new Error("Error conectando con API Stock");
        
        const items = await response.json();
        const cuerpo = document.getElementById(tablaID);

        if(items.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="5" class="text-center">Almacén vacío</td></tr>';
            return;
        }

        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.productReference}</strong></td>
                <td>${item.warehouse}</td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
                <td>
                   <button class="btn btn-sm btn-danger" onclick="borrarStock(${item.id})">🗑️ Borrar</button>
                </td>
            `;
            cuerpo.appendChild(row);
        });
    } catch (error) {
        console.warn(error);
        mostrarError("Error cargando stock: " + error.message);
    }
}

function crearStock() {
    mostrarFormulario("Añadir Stock", [
        { label: "Ref. Producto", key: "productReference" },
        { label: "Almacén (Ej: MAD-01)", key: "warehouse" },
        { label: "Cantidad", key: "quantity", type: "number" },
        { label: "Unidad (Cajas/Pallets)", key: "unit" }
    ], async (datos) => {
        
        if (!datos.productReference || !datos.quantity) {
            mostrarError("Referencia y Cantidad son obligatorios.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/stock`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(datos)
            });

            if(response.ok) {
                mostrarPopup("Stock Actualizado", "Producto añadido al almacén.", "success");
                cargarStock();
            } else {
                mostrarError("No se pudo guardar el stock.");
            }
        } catch(e) { mostrarError(e.message); }
    });
}

function borrarStock(id) {
    mostrarConfirmacion(
        "¿Borrar Producto?",
        `Se eliminará el item del inventario (ID: ${id}).`,
        async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/stock/${id}`, { method: 'DELETE' });
                if(response.ok) {
                    mostrarPopup("Eliminado", "Producto retirado del stock.", "success");
                    cargarStock();
                } else {
                    mostrarError("No se pudo borrar el item.");
                }
            } catch(e) { mostrarError(e.message); }
        }
    );
}