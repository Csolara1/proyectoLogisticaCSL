let stockCargados = [];

async function cargarStock() {
    const tablaID = 'tabla-cuerpo-stock';
    limpiarTabla(tablaID);

    const btnAdd = document.querySelector('.add-button');
    if (btnAdd) btnAdd.style.display = esAdmin() ? 'block' : 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/stock`);
        if (!response.ok) throw new Error("Error API Stock");
        
        stockCargados = await response.json();
        renderizarTabla(stockCargados);
        configurarBuscador();

    } catch (error) { mostrarError(error.message); }
}

function renderizarTabla(listaStock) {
    const cuerpo = document.getElementById('tabla-cuerpo-stock');
    cuerpo.innerHTML = '';

    if (listaStock.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay stock que coincida</td></tr>';
        return;
    }

    listaStock.forEach(item => {
        let botonesAccion = '';
        if (esAdmin()) {
            botonesAccion = `<button class="btn btn-sm btn-danger" onclick="borrarStock(${item.id})"><i class="bi bi-trash-fill"></i> Borrar</button>`;
        } else {
            botonesAccion = '<span class="text-muted"><i class="bi bi-lock-fill"></i></span>';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.productReference}</strong></td>
            <td>${item.warehouse}</td>
            <td>${item.quantity}</td>
            <td>${item.unit}</td>
            <td>${botonesAccion}</td>
        `;
        cuerpo.appendChild(row);
    });
}

function configurarBuscador() {
    const input = document.querySelector('.search-input');
    const btn = document.querySelector('.search-button');

    const filtrar = () => {
        const texto = input.value.toLowerCase();
        const filtrados = stockCargados.filter(s => 
            (s.productReference && s.productReference.toLowerCase().includes(texto)) || 
            (s.warehouse && s.warehouse.toLowerCase().includes(texto))
        );
        renderizarTabla(filtrados);
    };

    btn.onclick = filtrar;
    input.addEventListener('keyup', filtrar);
}

function crearStock() {
    if (!esAdmin()) return mostrarError("⛔ Acceso Denegado.");

    const opcionesAlmacen = [
        { val: "MAD-01", text: "MAD-01" }, { val: "MAD-02", text: "MAD-02" },
        { val: "MAD-03", text: "MAD-03" }, { val: "MAD-04", text: "MAD-04" }, { val: "MAD-05", text: "MAD-05" }
    ];

    mostrarFormulario("Añadir Stock", [
        { label: "Ref. Producto", key: "productReference" },
        { label: "Almacén", key: "warehouse", type: "select", options: opcionesAlmacen },
        { label: "Cantidad", key: "quantity", type: "number" },
        { label: "Unidad", key: "unit" }
    ], async (datos) => {
        if (!datos.productReference) return mostrarError("Faltan datos.");
        try {
            const res = await fetch(`${API_BASE_URL}/stock`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos) });
            if(res.ok) { mostrarPopup("Guardado", "Stock añadido.", "success"); cargarStock(); }
            else mostrarError("Error guardando stock.");
        } catch(e) { mostrarError(e.message); }
    });
}

function borrarStock(id) {
    if (!esAdmin()) return mostrarError("⛔ Acceso Denegado.");
    const item = stockCargados.find(s => s.id === id);
    if(!item) return;

    mostrarConfirmacionSegura("¿Borrar del Stock?", `Vas a eliminar el producto <b>${item.productReference}</b>.`, item.productReference, async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/stock/${id}`, { method: 'DELETE' });
            if(response.ok) { mostrarPopup("Eliminado", "Item retirado.", "success"); cargarStock(); }
            else mostrarError("No se pudo borrar.");
        } catch(e) { mostrarError(e.message); }
    });
}