//
let usuariosCargados = [];

async function cargarUsuarios() {
    const tablaID = 'tabla-cuerpo-usuarios';
    limpiarTabla(tablaID);
    
    const btnAdd = document.querySelector('.add-button');
    if (btnAdd) btnAdd.style.display = esAdmin() ? 'block' : 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        if (!response.ok) throw new Error("Error conectando con el servidor");
        
        usuariosCargados = await response.json();
        renderizarTabla(usuariosCargados);
        configurarBuscador();

    } catch (e) { mostrarError(e.message); }
}

function renderizarTabla(listaUsuarios) {
    const cuerpo = document.getElementById('tabla-cuerpo-usuarios');
    cuerpo.innerHTML = '';

    if (listaUsuarios.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No se encontraron resultados</td></tr>';
        return;
    }

    const usuarioActual = obtenerUsuario(); 

    listaUsuarios.forEach(user => {
        let botonesAccion = '<span class="text-muted small"><i class="bi bi-lock-fill"></i></span>';
        
        if (esAdmin()) {
            // --- PROTECCIÓN BLINDADA PARA SUPER ADMIN ---
            // 1. Protegemos por EMAIL (el más seguro, ya que usas admin@csl.com para entrar)
            // 2. Protegemos por NOMBRE "Super Admin"
            // 3. Protegemos al usuario que está conectado (tú mismo)
            const esJefeSupremo = (user.userEmail === 'admin@csl.com') || (user.fullName === 'Super Admin');
            const soyYo = usuarioActual && (user.userId === usuarioActual.userId);

            if (esJefeSupremo || soyYo) {
                // Si es intocable, mostramos un escudo en vez de la papelera
                botonesAccion = `
                    <button class="btn btn-sm btn-warning" onclick="abrirModalEditar(${user.userId})"><i class="bi bi-pencil-square"></i></button>
                    <span class="text-danger ms-1" style="cursor:help;" title="Este usuario no se puede borrar (Protegido)">
                        <i class="bi bi-shield-lock-fill"></i>
                    </span>
                `;
            } else {
                // Usuario normal -> Se puede borrar
                botonesAccion = `
                    <button class="btn btn-sm btn-warning" onclick="abrirModalEditar(${user.userId})"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="solicitarBorrado(${user.userId})"><i class="bi bi-trash-fill"></i></button>
                `;
            }
        }

        const movil = user.mobilePhone || '-';
        const celdaID = esAdmin() ? `<td>${user.userId}</td>` : '';

        const row = document.createElement('tr');
        row.innerHTML = `
            ${celdaID}
            <td>${user.fullName}</td>
            <td>${user.userEmail}</td>
            <td>${movil}</td>
            <td>${user.roleId === 1 ? '<span class="badge bg-primary">Admin</span>' : '<span class="badge bg-secondary">Usuario</span>'}</td>
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
        const filtrados = usuariosCargados.filter(u => 
            (u.fullName && u.fullName.toLowerCase().includes(texto)) || 
            (u.userEmail && u.userEmail.toLowerCase().includes(texto))
        );
        renderizarTabla(filtrados);
    };

    btn.onclick = filtrar;
    input.addEventListener('keyup', filtrar);
}

// FUNCIONES DE ACCIÓN (Crear, Editar, Borrar)
function crearUsuario() {
    if (!esAdmin()) return mostrarError("⛔ Acceso Denegado.");

    mostrarFormulario("Nuevo Usuario", [
        { label: "Nombre Completo", key: "fullName" },
        { label: "Email", key: "userEmail", type: "email" },
        { label: "Móvil", key: "mobilePhone", type: "tel" },
        { label: "Contraseña", key: "userPassword", type: "password" },
        { label: "Rol (1=Admin, 2=User)", key: "roleId", type: "select", options: [{val:"2",text:"Usuario/Cliente"},{val:"1",text:"Administrador"}] }
    ], async (datos) => {
        if(!datos.userEmail || !datos.userPassword) return mostrarError("Faltan datos.");
        datos.isActive = true;
        try {
            const res = await fetch(`${API_BASE_URL}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
            if(res.ok) { mostrarPopup("Éxito", "Usuario creado", "success"); cargarUsuarios(); }
            else mostrarError("Error creando usuario.");
        } catch(e) { mostrarError(e.message); }
    });
}

function abrirModalEditar(id) {
    if (!esAdmin()) return mostrarError("⛔ Solo admin.");
    const user = usuariosCargados.find(u => u.userId === id);
    if (!user) return;

    // Bloqueamos edición de email del Super Admin por seguridad (opcional)
    const esSuper = (user.userEmail === 'admin@csl.com');

    mostrarFormulario("Editar Usuario", [
        { label: "Nombre", key: "fullName", value: user.fullName },
        { label: "Email", key: "userEmail", value: user.userEmail, readOnly: esSuper }, 
        { label: "Móvil", key: "mobilePhone", value: user.mobilePhone || '' },
        { label: "Nueva Contraseña (Opcional)", key: "userPassword", type: "password" },
        { label: "Rol", key: "roleId", value: user.roleId.toString(), type: "select", options: [{val:"2",text:"Usuario/Cliente"},{val:"1",text:"Administrador"}] }
    ], async (datos) => {
        datos.userId = id;
        datos.isActive = true;
        try {
            const res = await fetch(`${API_BASE_URL}/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
            if(res.ok) { mostrarPopup("Actualizado", "Usuario modificado", "success"); cargarUsuarios(); }
            else mostrarError("Error actualizando.");
        } catch(e) { mostrarError(e.message); }
    });
}

function solicitarBorrado(id) {
    if (!esAdmin()) return mostrarError("⛔ Solo admin.");
    const user = usuariosCargados.find(u => u.userId === id);
    
    // Doble chequeo de seguridad (aunque el botón esté oculto)
    if (user.userEmail === 'admin@csl.com' || user.fullName === 'Super Admin') {
        mostrarPopup("Acción Prohibida", "No puedes eliminar al Super Administrador principal.", "error");
        return;
    }

    mostrarConfirmacionSegura("¿Eliminar Usuario?", `Vas a eliminar a <b>${user.fullName}</b>.`, user.userEmail, async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' });
            if(response.ok) { mostrarPopup("Eliminado", "Usuario borrado.", "success"); cargarUsuarios(); }
            else mostrarError("No se pudo eliminar.");
        } catch(e) { mostrarError(e.message); }
    });
}