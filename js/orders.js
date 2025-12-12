//
let pedidosCargados = [];

async function cargarPedidos() {
    const tablaID = 'tabla-cuerpo-pedidos';
    limpiarTabla(tablaID);

    const btnAdd = document.querySelector('.add-button');
    if (btnAdd) btnAdd.style.display = esAdmin() ? 'block' : 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/orders`);
        if (!response.ok) throw new Error("Error API Pedidos");
        
        pedidosCargados = await response.json();
        renderizarTabla(pedidosCargados);
        configurarBuscador();

    } catch (error) { mostrarError(error.message); }
}

function renderizarTabla(listaPedidos) {
    const cuerpo = document.getElementById('tabla-cuerpo-pedidos');
    cuerpo.innerHTML = '';

    if (listaPedidos.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay coincidencias</td></tr>';
        return;
    }

    const soyAdmin = esAdmin();

    listaPedidos.forEach(order => {
        let botonesAccion = '';
        
        // Botón de IMPRIMIR ETIQUETA (Visible para todos, es útil para operarios también)
        const btnImprimir = `
            <button class="btn btn-sm btn-outline-secondary me-1" onclick="imprimirEtiqueta(${order.id})" title="Imprimir Etiqueta">
                <i class="bi bi-printer-fill"></i>
            </button>
        `;

        if (soyAdmin) {
            botonesAccion = `
                ${btnImprimir}
                <button class="btn btn-sm btn-danger" onclick="borrarPedido(${order.id})" title="Borrar">
                    <i class="bi bi-trash-fill"></i>
                </button>
            `;
        } else {
            botonesAccion = `
                ${btnImprimir}
                <span class="text-muted small ms-1"><i class="bi bi-eye-fill"></i> Ver</span>
            `;
        }

        // Ocultar ID si no es admin
        const celdaID = soyAdmin ? `<td>${order.id}</td>` : '';

        const row = document.createElement('tr');
        row.innerHTML = `
            ${celdaID}
            <td>${order.clientName}</td>
            <td>${order.origin}</td>
            <td>${order.destination}</td>
            <td><span class="badge ${order.status === 'ENTREGADO' ? 'bg-success' : 'bg-warning text-dark'}">${order.status}</span></td>
            <td>${botonesAccion}</td>
        `;
        cuerpo.appendChild(row);
    });

    if (typeof aplicarPermisosVisuales === 'function') aplicarPermisosVisuales();
}

function configurarBuscador() {
    const input = document.querySelector('.search-input');
    const btn = document.querySelector('.search-button');

    const filtrar = () => {
        const texto = input.value.toLowerCase();
        const filtrados = pedidosCargados.filter(o => 
            (o.clientName && o.clientName.toLowerCase().includes(texto)) || 
            (o.origin && o.origin.toLowerCase().includes(texto)) || 
            (o.destination && o.destination.toLowerCase().includes(texto))
        );
        renderizarTabla(filtrados);
    };

    btn.onclick = filtrar;
    input.addEventListener('keyup', filtrar);
}

// --- NUEVA FUNCIÓN: GENERAR ETIQUETA PDF ---
async function imprimirEtiqueta(id) {
    const order = pedidosCargados.find(o => o.id === id);
    if (!order) return;

    try {
        const { jsPDF } = window.jspdf;
        // Creamos un PDF tamaño A6 (Típico de etiquetas de envío: 105mm x 148mm)
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a6'
        });

        // 1. Cabecera CSL
        doc.setFillColor(94, 53, 177); // Morado
        doc.rect(0, 0, 105, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("CSL LOGISTICS", 52.5, 13, { align: "center" });

        // 2. ID Gigante
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text("ORDER ID:", 10, 35);
        doc.setFontSize(30);
        doc.text(`#${order.id}`, 10, 48);

        // 3. Ruta
        doc.setLineWidth(0.5);
        doc.line(10, 55, 95, 55); // Línea separadora

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("ORIGEN (FROM):", 10, 65);
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(order.origin.toUpperCase(), 10, 72);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("DESTINO (TO):", 10, 85);
        doc.setFontSize(18); // Destino más grande
        doc.setTextColor(0, 0, 0);
        doc.text(order.destination.toUpperCase(), 10, 93);

        // 4. Cliente
        doc.line(10, 100, 95, 100);
        doc.setFontSize(10);
        doc.text(`CLIENTE: ${order.clientName}`, 10, 110);
        doc.text(`TRANSPORTE: ${order.transportMode || 'ESTÁNDAR'}`, 10, 116);

        // 5. Simulación Código de Barras (Visual)
        doc.setFillColor(0, 0, 0);
        // Dibujamos barritas aleatorias para simular
        let x = 10;
        while(x < 95) {
            const w = Math.random() * 2 + 0.5;
            doc.rect(x, 125, w, 15, 'F');
            x += w + (Math.random() * 2);
        }
        doc.setFontSize(8);
        doc.text(`*CSL-${order.id}-EXP*`, 52.5, 144, { align: "center" });

        // Guardar
        doc.save(`Etiqueta_Pedido_${order.id}.pdf`);

    } catch (e) {
        console.error(e);
        mostrarError("Error al generar la etiqueta PDF.");
    }
}

function crearPedido() {
    if (!esAdmin()) return mostrarError("⛔ Acceso Denegado.");

    const ciudadesEspaña = ["Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona", "Burgos", "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ceuta", "Ciudad Real", "Córdoba", "Cuenca", "Girona", "Granada", "Guadalajara", "Guipúzcoa", "Huelva", "Huesca", "Illes Balears", "Jaén", "La Coruña", "La Rioja", "Las Palmas", "León", "Lleida", "Lugo", "Madrid", "Málaga", "Melilla", "Murcia", "Navarra", "Ourense", "Palencia", "Pontevedra", "Salamanca", "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid", "Vizcaya", "Zamora", "Zaragoza"];
    const opcionesCiudades = ciudadesEspaña.map(c => ({ val: c, text: c }));
    const opcionesEstado = [{val:"PENDIENTE",text:"Pendiente"},{val:"EN_PROCESO",text:"En Proceso"},{val:"ENVIADO",text:"Enviado"},{val:"EN_TRANSITO",text:"En Tránsito"},{val:"ENTREGADO",text:"Entregado"},{val:"CANCELADO",text:"Cancelado"}];

    mostrarFormulario("Nuevo Pedido", [
        { label: "Cliente", key: "clientName" },
        { label: "Origen", key: "origin", type: "select", options: opcionesCiudades },
        { label: "Destino", key: "destination", type: "select", options: opcionesCiudades },
        { label: "Estado", key: "status", type: "select", options: opcionesEstado },
        { label: "Transporte", key: "transportMode", type: "select", options: [{val:"MARITIMO",text:"Marítimo"},{val:"AEREO",text:"Aéreo"},{val:"TERRESTRE",text:"Terrestre"}] }
    ], async (datos) => {
        if (!datos.clientName) return mostrarError("Faltan datos.");
        try {
            const res = await fetch(`${API_BASE_URL}/orders`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos) });
            if(res.ok) { mostrarPopup("Creado", "Pedido registrado.", "success"); cargarPedidos(); }
            else mostrarError("Error al crear pedido.");
        } catch(e) { mostrarError(e.message); }
    });
}

function borrarPedido(id) {
    if (!esAdmin()) return mostrarError("⛔ Acceso Denegado.");
    const order = pedidosCargados.find(o => o.id === id);
    if (!order) return;

    mostrarConfirmacionSegura("¿Borrar Pedido?", `Estás eliminando el pedido #${id} de <b>${order.clientName}</b>.`, order.clientName, async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/orders/${id}`, { method: 'DELETE' });
            if(response.ok) { mostrarPopup("Eliminado", "Pedido borrado.", "success"); cargarPedidos(); }
            else mostrarError("No se pudo borrar.");
        } catch(e) { mostrarError(e.message); }
    });
}