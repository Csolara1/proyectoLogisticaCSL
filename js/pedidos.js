// js/pedidos.js - GESTIÓN DE PEDIDOS (FILTRADO ESTRICTO PARA CLIENTES)

let pedidosCargados = [];

// --- 1. CARGA Y FILTRADO DE SEGURIDAD ---
async function cargarPedidos() {
    const cuerpo = document.getElementById('tabla-cuerpo-pedidos');
    if(!cuerpo) return; 

    cuerpo.innerHTML = '<tr><td colspan="7" class="text-center">Cargando tus pedidos...</td></tr>';

    const miUsuario = obtenerUsuario();
    if (!miUsuario) return;

    // Normalizamos el ID y el ROL del usuario logueado
    const miId = parseInt(miUsuario.userId || miUsuario.id);
    const miRol = parseInt(miUsuario.roleId);
    const soyAdmin = (miRol === 1);

    // A. Ocultar botón de "Crear" si es cliente
    const btnAdd = document.querySelector('.add-button');
    if (btnAdd) {
        btnAdd.style.display = soyAdmin ? 'block' : 'none';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/orders`); 
        if (!response.ok) throw new Error("Error al obtener pedidos");
        
        let listaTotal = await response.json();

        // --- B. EL SUPER FILTRO ---
        if (!soyAdmin) { 
            // SI SOY CLIENTE: Filtro agresivo. Solo pasa lo que sea mío.
            pedidosCargados = listaTotal.filter(p => {
                
                // Buscamos el ID del dueño del pedido en todas las posibles estructuras que pueda mandar Java
                const idDuenoPedido = 
                    p.userId ||              // Caso 1: pedido.userId
                    (p.user && p.user.id) || // Caso 2: pedido.user.id (Objeto anidado)
                    (p.user && p.user.userId) || // Caso 3: pedido.user.userId
                    p.customerId ||          // Caso 4: pedido.customerId
                    null;

                // Comparación estricta
                return idDuenoPedido === miId;
            });
        } else {
            // SI SOY ADMIN: Lo veo todo
            pedidosCargados = listaTotal;
        }

        renderizarTablaPedidos(pedidosCargados);
        configurarBuscadorPedidos();

    } catch (error) { 
        console.error(error);
        if(cuerpo) cuerpo.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error al cargar datos</td></tr>';
    }
}

// --- 2. RENDERIZADO VISUAL ---
function renderizarTablaPedidos(lista) {
    const cuerpo = document.getElementById('tabla-cuerpo-pedidos');
    if (!cuerpo) return;
    cuerpo.innerHTML = '';

    const miUsuario = obtenerUsuario();
    const soyAdmin = (parseInt(miUsuario.roleId) === 1);

    if (!lista || lista.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay pedidos asociados a tu cuenta.</td></tr>';
        return;
    }

    lista.forEach(p => {
        let botones = '';

        // C. SOLO EL ADMIN VE BOTONES DE ACCIÓN
        if (soyAdmin) {
            botones = `
                <button class="btn btn-sm btn-primary me-1" onclick="editarPedido(${p.id || p.orderId})" title="Editar"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-danger" onclick="borrarPedido(${p.id || p.orderId})" title="Eliminar"><i class="bi bi-trash"></i></button>
            `;
        } else {
            // Cliente: Solo ve "Ver"
            botones = `<span class="badge bg-light text-dark border"><i class="bi bi-eye"></i> Ver</span>`;
        }

        // D. DATOS INTELIGENTES (Evita "undefined")
        // Intentamos sacar el nombre del cliente de varios sitios
        let nombreCliente = "Cliente";
        if (p.customerName) nombreCliente = p.customerName;
        else if (p.user && p.user.fullName) nombreCliente = p.user.fullName;
        
        // Estado con colores
        let estadoClass = 'bg-secondary';
        let estadoTexto = p.status || 'PENDIENTE';
        if(['ENTREGADO', 'COMPLETADO'].includes(estadoTexto)) estadoClass = 'bg-success';
        if(['EN_CAMINO', 'ENVIADO', 'EN PROCESO'].includes(estadoTexto)) estadoClass = 'bg-info text-dark';
        if(['CANCELADO', 'RECHAZADO'].includes(estadoTexto)) estadoClass = 'bg-danger';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${p.id || p.orderId}</td>
            <td class="fw-bold">${nombreCliente}</td>
            <td>${p.deliveryAddress || '<span class="text-muted fst-italic">Dirección no disponible</span>'}</td>
            <td>${formatearFecha(p.date || p.orderDate)}</td>
            <td>${p.totalAmount || 0} €</td>
            <td><span class="badge ${estadoClass}">${estadoTexto}</span></td>
            <td class="text-center">${botones}</td>
        `;
        cuerpo.appendChild(row);
    });
}

function formatearFecha(fechaString) {
    if(!fechaString) return '-';
    try {
        const fecha = new Date(fechaString);
        return fecha.toLocaleDateString();
    } catch(e) { return fechaString; }
}

function configurarBuscadorPedidos() {
    const input = document.querySelector('.search-input');
    if(!input) return;

    const nuevoInput = input.cloneNode(true);
    input.parentNode.replaceChild(nuevoInput, input);

    nuevoInput.addEventListener('keyup', () => {
        const texto = nuevoInput.value.toLowerCase();
        // Filtramos sobre la lista YA RECORTADA por usuario
        const filtrados = pedidosCargados.filter(p => 
            (p.customerName && p.customerName.toLowerCase().includes(texto)) || 
            (p.status && p.status.toLowerCase().includes(texto)) ||
            (p.id && p.id.toString().includes(texto))
        );
        renderizarTablaPedidos(filtrados);
    });
}

// --- FUNCIONES ADMIN ---
function borrarPedido(id) {
    if (!esAdmin()) return; 
    mostrarConfirmacionSegura("¿Borrar Pedido?", "Esta acción es irreversible", null, async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/orders/${id}`, { method: 'DELETE' });
            if(res.ok) {
                mostrarPopup("Eliminado", "Pedido eliminado correctamente", "success");
                cargarPedidos();
            } else {
                mostrarPopup("Error", "No se pudo eliminar el pedido", "error");
            }
        } catch(e) { console.error(e); }
    });
}

function editarPedido(id) {
    if (!esAdmin()) return;
    mostrarPopup("Información", "Funcionalidad de editar pedido en construcción", "info");
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tabla-cuerpo-pedidos')) {
        cargarPedidos();
    }
});