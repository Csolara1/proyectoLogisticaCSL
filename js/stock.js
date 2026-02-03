// js/stock.js - VERSIÓN CORREGIDA

let stockCargados = [];

async function cargarStock() {
    const tablaID = 'tabla-cuerpo-stock';
    // Eliminamos 'limpiarTabla(tablaID)' porque no existe y bloqueaba el script.
    // La limpieza ya la hace renderizarTabla al principio.

    const btnAdd = document.querySelector('.add-button');
    if (btnAdd) btnAdd.style.display = esAdmin() ? 'block' : 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/stock`);
        if (!response.ok) throw new Error("Error obteniendo datos de stock");
        
        stockCargados = await response.json();
        renderizarTabla(stockCargados);
        configurarBuscador();

    } catch (error) { 
        console.error(error);
        mostrarPopup("Error", "No se pudo cargar el stock. " + error.message, "error"); 
    }
}

function renderizarTabla(listaStock) {
    const cuerpo = document.getElementById('tabla-cuerpo-stock');
    if (!cuerpo) return;
    
    cuerpo.innerHTML = ''; // Limpiamos la tabla aquí

    if (!listaStock || listaStock.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay stock disponible</td></tr>';
        return;
    }

    listaStock.forEach(item => {
        let botonesAccion = '';
        if (esAdmin()) {
            botonesAccion = `<button class="btn btn-sm btn-danger" onclick="borrarStock(${item.id})"><i class="bi bi-trash-fill"></i></button>`;
        } else {
            botonesAccion = '<span class="text-muted"><i class="bi bi-lock-fill"></i></span>';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.productReference || '-'}</strong></td>
            <td><span class="badge bg-info text-dark">${item.warehouse || 'General'}</span></td>
            <td class="fw-bold">${item.quantity || 0}</td>
            <td>${item.unit || 'Unds'}</td>
            <td>${botonesAccion}</td>
        `;
        cuerpo.appendChild(row);
    });
}

function configurarBuscador() {
    const input = document.querySelector('.search-input');
    const btn = document.querySelector('.search-button');
    
    if(!input) return;

    const filtrar = () => {
        const texto = input.value.toLowerCase();
        const filtrados = stockCargados.filter(s => 
            (s.productReference && s.productReference.toLowerCase().includes(texto)) || 
            (s.warehouse && s.warehouse.toLowerCase().includes(texto))
        );
        renderizarTabla(filtrados);
    };

    if(btn) btn.onclick = filtrar;
    input.addEventListener('keyup', filtrar);
}

function crearStock() {
    if (!esAdmin()) return mostrarPopup("Acceso Denegado", "Solo administradores.", "error");

    const opcionesAlmacen = [
        { val: "MAD-01", text: "Madrid Central (MAD-01)" }, 
        { val: "MAD-02", text: "Madrid Norte (MAD-02)" },
        { val: "BCN-01", text: "Barcelona Puerto (BCN-01)" }, 
        { val: "VAL-01", text: "Valencia Logística (VAL-01)" }
    ];

    mostrarFormulario("Añadir Stock", [
        { label: "Ref. Producto", key: "productReference", placeholder: "Ej: PROD-001" },
        { label: "Almacén", key: "warehouse", type: "select", options: opcionesAlmacen },
        { label: "Ubicación", key: "location", placeholder: "Pasillo A-12" },
        { label: "Cantidad", key: "quantity", type: "number", value: "1" },
        { label: "Unidad", key: "unit", placeholder: "Cajas, Palets..." }
    ], async (datos) => {
        if (!datos.productReference) return mostrarPopup("Error", "La referencia es obligatoria", "error");
        
        // Convertir cantidad a número entero
        datos.quantity = parseInt(datos.quantity) || 0;
        
        try {
            const res = await fetch(`${API_BASE_URL}/stock`, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(datos) 
            });
            if(res.ok) { 
                mostrarPopup("Guardado", "Producto añadido al inventario.", "success"); 
                cargarStock(); 
            }
            else {
                mostrarPopup("Error", "No se pudo guardar. ¿Referencia duplicada?", "error");
            }
        } catch(e) { 
            mostrarPopup("Error", "Fallo de conexión", "error"); 
        }
    });
}

function borrarStock(id) {
    if (!esAdmin()) return mostrarPopup("Acceso Denegado", "No tienes permisos.", "error");
    
    const item = stockCargados.find(s => s.id === id);
    if(!item) return;

    mostrarConfirmacionSegura("¿Borrar Stock?", `Vas a eliminar <b>${item.productReference}</b> (${item.quantity} ${item.unit}).`, item.productReference, async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/stock/${id}`, { method: 'DELETE' });
            if(response.ok) { 
                mostrarPopup("Eliminado", "Item retirado del stock.", "success"); 
                cargarStock(); 
            }
            else {
                mostrarPopup("Error", "No se pudo borrar.", "error");
            }
        } catch(e) { 
            mostrarPopup("Error", "Fallo de conexión", "error");
        }
    });
}