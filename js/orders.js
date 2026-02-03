// js/orders.js - GESTIÓN DE PEDIDOS CON FILTRO SEGURO

let pedidosCargados = [];

// --- CARGA INICIAL ---
async function cargarPedidos() {
    const cuerpo = document.getElementById('tabla-cuerpo-pedidos');
    if(cuerpo) cuerpo.innerHTML = '<tr><td colspan="8" class="text-center">Cargando pedidos...</td></tr>';

    const btnAdd = document.querySelector('.add-button');
    // Aseguramos que el botón se muestre si es admin
    if (btnAdd) btnAdd.style.display = esAdmin() ? 'block' : 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/orders`);
        if (!response.ok) throw new Error("Error al obtener pedidos");
        
        const todosLosPedidos = await response.json();

        // --- FILTRO DE SEGURIDAD ---
        if (esAdmin()) {
            // SI SOY ADMIN: Lo veo todo
            pedidosCargados = todosLosPedidos;
        } else {
            // SI SOY CLIENTE: Filtro solo los míos
            const miUsuario = obtenerUsuario();
            const miId = miUsuario ? (parseInt(miUsuario.userId) || parseInt(miUsuario.id)) : null;

            pedidosCargados = todosLosPedidos.filter(p => {
                // Buscamos el ID del dueño (gestionando posibles formatos del backend)
                const idDueno = p.userId || 
                                (p.user && p.user.id) || 
                                (p.user && p.user.userId) || 
                                p.customerId;
                
                // Comparamos usando == para que no importen tipos (texto vs numero)
                return idDueno == miId;
            });
        }

        renderizarTabla(pedidosCargados);
        configurarBuscador();

    } catch (error) { 
        console.error(error);
        if(cuerpo) cuerpo.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar datos</td></tr>';
        mostrarPopup("Error", "No se pudieron cargar los pedidos.", "error"); 
    }
}

// --- RENDERIZADO DE TABLA ---
function renderizarTabla(lista) {
    const cuerpo = document.getElementById('tabla-cuerpo-pedidos');
    if (!cuerpo) return;
    cuerpo.innerHTML = '';

    if (!lista || lista.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No se encontraron pedidos.</td></tr>';
        return;
    }

    const soyAdministrador = esAdmin(); // Guardamos el valor para usarlo en el bucle

    lista.forEach(p => {
        let botonesAccion = '';
        const btnPDF = `<button class="btn btn-sm btn-outline-danger me-1" onclick="descargarPdfPedido(${p.id || p.orderId})" title="Descargar Albarán"><i class="bi bi-file-earmark-pdf-fill"></i></button>`;
        
        if (soyAdministrador) {
            botonesAccion = `
                ${btnPDF}
                <button class="btn btn-sm btn-primary me-1" onclick="editarPedido(${p.id || p.orderId})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-danger" onclick="borrarPedido(${p.id || p.orderId})"><i class="bi bi-trash"></i></button>
            `;
        } else {
            // El cliente solo ve el PDF
            botonesAccion = btnPDF;
        }

        // --- COLORES ---
        let badgeClass = 'bg-secondary';
        const st = (p.status || '').toUpperCase();
        
        if (st.includes('ENTREGADO') || st.includes('COMPLETADO')) badgeClass = 'bg-success'; 
        else if (st.includes('CANCELADO')) badgeClass = 'bg-danger'; 
        else if (st.includes('PENDIENTE')) badgeClass = 'bg-warning text-dark'; 
        else if (st.includes('PROCESO') || st.includes('PREPARACION') || st.includes('CAMINO')) badgeClass = 'bg-info text-dark'; 
        else if (st.includes('ENVIADO') || st.includes('RUTA')) badgeClass = 'bg-primary'; 

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.id || p.orderId}</td>
            <td class="fw-bold">${p.orderCode || '<span class="text-danger">Sin Código</span>'}</td>
            <td>${p.clientName || (p.user ? p.user.fullName : 'Cliente')}</td>
            <td>${p.origin || '-'}</td>
            <td>${p.destination || '-'}</td>
            <td>${p.transportMode || '-'}</td>
            <td><span class="badge ${badgeClass}">${p.status || 'Desconocido'}</span></td>
            <td>${botonesAccion}</td>
        `;
        cuerpo.appendChild(row);
    });
}

function configurarBuscador() {
    const input = document.querySelector('.search-input');
    const btn = document.querySelector('.search-button');
    if(!input) return;

    const nuevoInput = input.cloneNode(true);
    input.parentNode.replaceChild(nuevoInput, input);
    
    let nuevoBtn = btn;
    if(btn) {
        nuevoBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(nuevoBtn, btn);
    }

    const filtrar = () => {
        const texto = nuevoInput.value.toLowerCase();
        const filtrados = pedidosCargados.filter(p => 
            (p.orderCode && p.orderCode.toLowerCase().includes(texto)) || 
            (p.clientName && p.clientName.toLowerCase().includes(texto))
        );
        renderizarTabla(filtrados);
    };

    if(nuevoBtn) nuevoBtn.onclick = filtrar;
    nuevoInput.addEventListener('keyup', filtrar);
}

// --- HELPER: CLIENTES ---
async function obtenerOpcionesClientes() {
    try {
        const res = await fetch(`${API_BASE_URL}/users`);
        if(res.ok) {
            const users = await res.json();
            return users
                .filter(u => u.roleId === 2)
                .map(u => ({ val: u.id || u.userId, text: `${u.fullName} (${u.userEmail})` }));
        }
    } catch(e) { console.error("Error cargando clientes", e); }
    return [];
}

// --- CREAR PEDIDO ---
async function crearPedido() {
    if (!esAdmin()) return mostrarPopup("Acceso Denegado", "Solo administradores.", "error");

    const listaClientes = await obtenerOpcionesClientes();

    mostrarFormulario("Nuevo Pedido", [
        { label: "Código Pedido", key: "orderCode", placeholder: "Ej: ORD-001" },
        { label: "Asignar a Usuario", key: "userId", type: "select", options: listaClientes },
        { label: "Nombre Cliente (Visible)", key: "clientName", placeholder: "Nombre empresa..." },
        { label: "Origen", key: "origin" },
        { label: "Destino", key: "destination" },
        { label: "Transporte", key: "transportMode", type: "select", options: [
            {val:"Carretera", text:"Carretera"}, {val:"Marítimo", text:"Marítimo"}, 
            {val:"Aéreo", text:"Aéreo"}, {val:"Ferroviario", text:"Ferroviario"}
        ]},
        { label: "Estado", key: "status", type: "select", options: [
            {val:"Pendiente", text:"Pendiente"}, 
            {val:"En Proceso", text:"En Proceso"},
            {val:"Enviado", text:"Enviado"},
            {val:"Entregado", text:"Entregado"}, 
            {val:"Cancelado", text:"Cancelado"}
        ]}
    ], async (datos) => {
        if (!datos.orderCode) return mostrarPopup("Error", "El código es obligatorio", "error");
        
        if (datos.userId) datos.userId = parseInt(datos.userId);
        
        if (!datos.userId) {
            const usuario = obtenerUsuario();
            if(usuario) datos.userId = usuario.userId || usuario.id;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/orders`, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(datos) 
            });
            if(res.ok) { 
                mostrarPopup("Éxito", "Pedido creado.", "success"); 
                cargarPedidos(); 
            } else {
                mostrarPopup("Error", "Error al crear.", "error");
            }
        } catch(e) { 
            mostrarPopup("Error", "Fallo de conexión", "error"); 
        }
    });
}

// --- EDITAR PEDIDO ---
async function editarPedido(id) {
    if (!esAdmin()) return;
    const p = pedidosCargados.find(x => (x.id === id || x.orderId === id));
    if(!p) return;

    const listaClientes = await obtenerOpcionesClientes();

    mostrarFormulario("Editar Pedido", [
        { label: "Código", key: "orderCode", value: p.orderCode || "" }, 
        { label: "Asignar a Usuario", key: "userId", type: "select", value: p.userId, options: listaClientes },
        { label: "Nombre Cliente", key: "clientName", value: p.clientName },
        { label: "Origen", key: "origin", value: p.origin },
        { label: "Destino", key: "destination", value: p.destination },
        { label: "Transporte", key: "transportMode", type: "select", value: p.transportMode, options: [
            {val:"Carretera", text:"Carretera"}, {val:"Marítimo", text:"Marítimo"}, 
            {val:"Aéreo", text:"Aéreo"}, {val:"Ferroviario", text:"Ferroviario"}
        ]},
        { label: "Estado", key: "status", type: "select", value: p.status, options: [
            {val:"Pendiente", text:"Pendiente"}, 
            {val:"En Proceso", text:"En Proceso"},
            {val:"Enviado", text:"Enviado"},
            {val:"Entregado", text:"Entregado"}, 
            {val:"Cancelado", text:"Cancelado"}
        ]}
    ], async (datos) => {
        if (datos.userId) datos.userId = parseInt(datos.userId);

        try {
            const res = await fetch(`${API_BASE_URL}/orders/${id}`, { 
                method: 'PUT', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(datos) 
            });
            if(res.ok) { 
                mostrarPopup("Actualizado", "Pedido modificado.", "success"); 
                cargarPedidos(); 
            } else {
                mostrarPopup("Error", "No se pudo guardar.", "error");
            }
        } catch(e) { 
            mostrarPopup("Error", "Fallo de conexión", "error"); 
        }
    });
}

// --- BORRAR PEDIDO ---
function borrarPedido(id) {
    if (!esAdmin()) return mostrarPopup("Acceso Denegado", "No tienes permisos.", "error");
    const p = pedidosCargados.find(x => (x.id === id || x.orderId === id));
    
    mostrarConfirmacionSegura("¿Eliminar?", `Borrar pedido <b>${p ? p.orderCode : ''}</b>?`, null, async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/orders/${id}`, { method: 'DELETE' });
            if(response.ok) { 
                mostrarPopup("Eliminado", "Pedido borrado.", "success"); 
                cargarPedidos(); 
            } else {
                mostrarPopup("Error", "No se pudo borrar.", "error");
            }
        } catch(e) { 
            mostrarPopup("Error", "Error de red.", "error");
        }
    });
}

// --- GENERAR PDF ---
async function descargarPdfPedido(id) {
    const p = pedidosCargados.find(x => (x.id === id || x.orderId === id));
    if (!p) return mostrarPopup("Error", "Datos no encontrados.", "error");

    if (!window.jspdf) return mostrarPopup("Error", "Librería PDF no cargada.", "error");

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFillColor(13, 110, 253);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("CSL - Control System Logistics", 10, 13);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(22);
        doc.text("ALBARÁN DE PEDIDO", 105, 40, { align: "center" });
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        
        doc.text(`Código: ${p.orderCode || 'Pendiente'}`, 20, 60);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 140, 60);
        doc.line(20, 65, 190, 65);

        const cuerpoTabla = [
            ["Cliente", p.clientName || "-"],
            ["Origen", p.origin || "-"],
            ["Destino", p.destination || "-"],
            ["Modo Transporte", p.transportMode || "-"],
            ["Estado Actual", p.status || "-"]
        ];

        doc.autoTable({
            startY: 75,
            head: [['Concepto', 'Detalle']],
            body: cuerpoTabla,
            theme: 'striped',
            headStyles: { fillColor: [44, 62, 80] },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
        });

        doc.save(`Albaran_${p.orderCode || 'sin_codigo'}.pdf`);
        mostrarPopup("PDF", "Descargando documento...", "success");

    } catch (e) {
        console.error(e);
        mostrarPopup("Error PDF", "Falló la generación.", "error");
    }
}

// --- FUNCIÓN DE UTILIDAD CRÍTICA ---
function esAdmin() {
    const u = obtenerUsuario();
    // Usamos parseInt para evitar errores si el rol viene como string "1"
    return u && parseInt(u.roleId) === 1;
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tabla-cuerpo-pedidos')) {
        cargarPedidos();
    }
});