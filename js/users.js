let usuariosCargados = [];

async function cargarUsuarios() {
    const tablaID = 'tabla-cuerpo-usuarios';
    limpiarTabla(tablaID);
    
    // OCULTAR BOTÓN DE AÑADIR SI NO ES ADMIN
    const btnAdd = document.querySelector('.add-button');
    if (btnAdd) btnAdd.style.display = esAdmin() ? 'block' : 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        if (!response.ok) throw new Error("Error conectando con el servidor");
        
        usuariosCargados = await response.json();
        const cuerpo = document.getElementById(tablaID);

        usuariosCargados.forEach(user => {
            // Lógica de permisos para los botones
            let botonesAccion = '<span class="text-muted" style="font-size:0.8em">🔒</span>';
            
            if (esAdmin()) {
                botonesAccion = `
                    <button class="btn btn-sm btn-warning" onclick="abrirModalEditar(${user.userId})">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="solicitarBorrado(${user.userId})">🗑️</button>
                `;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.userId}</td>
                <td>${user.fullName}</td>
                <td>${user.userEmail}</td>
                <td>${user.roleId === 1 ? '<span class="badge bg-primary">Admin</span>' : '<span class="badge bg-secondary">Usuario</span>'}</td>
                <td>${botonesAccion}</td>
            `;
            cuerpo.appendChild(row);
        });
    } catch (e) { mostrarError(e.message); }
}

function crearUsuario() {
    if (!esAdmin()) return mostrarError("⛔ Acceso Denegado: Se requieren permisos de Administrador.");

    mostrarFormulario("Nuevo Usuario", [
        { label: "Nombre Completo", key: "fullName" },
        { label: "Email", key: "userEmail", type: "email" },
        { label: "Contraseña", key: "userPassword", type: "password" },
        { label: "Rol ID (1=Admin, 2=User)", key: "roleId", type: "number" }
    ], async (datos) => {
        if(!datos.userEmail || !datos.userPassword) return mostrarError("Faltan datos.");
        datos.isActive = true;
        try {
            const res = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos)
            });
            if(res.ok) { mostrarPopup("Éxito", "Usuario creado", "success"); cargarUsuarios(); }
            else mostrarError("Error creando usuario.");
        } catch(e) { mostrarError(e.message); }
    });
}

function abrirModalEditar(id) {
    if (!esAdmin()) return mostrarError("⛔ Solo los administradores pueden editar usuarios.");

    const user = usuariosCargados.find(u => u.userId === id);
    if (!user) return mostrarError("Usuario no encontrado.");

    mostrarFormulario("Editar Usuario", [
        { label: "Nombre", key: "fullName", value: user.fullName },
        { label: "Email", key: "userEmail", value: user.userEmail },
        { label: "Nueva Contraseña (Opcional)", key: "userPassword", type: "password" },
        { label: "Rol ID", key: "roleId", value: user.roleId, type: "number" }
    ], async (datos) => {
        datos.userId = id;
        datos.isActive = true;
        try {
            const res = await fetch(`${API_BASE_URL}/users/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos)
            });
            if(res.ok) { mostrarPopup("Actualizado", "Usuario modificado", "success"); cargarUsuarios(); }
            else mostrarError("Error actualizando.");
        } catch(e) { mostrarError(e.message); }
    });
}

function solicitarBorrado(id) {
    if (!esAdmin()) return mostrarError("⛔ Solo los administradores pueden borrar usuarios.");

    const user = usuariosCargados.find(u => u.userId === id);
    if (!user) return;

    mostrarConfirmacionSegura(
        "¿Eliminar Usuario?", 
        `Estás a punto de eliminar a <b>${user.fullName}</b>.`, 
        user.userEmail, 
        async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' });
                if(response.ok) { mostrarPopup("Eliminado", "Usuario borrado.", "success"); cargarUsuarios(); }
                else mostrarError("No se pudo eliminar.");
            } catch(e) { mostrarError(e.message); }
        }
    );
}