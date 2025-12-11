// Variable global para guardar los usuarios cargados
let usuariosCargados = [];

async function cargarUsuarios() {
    const tablaID = 'tabla-cuerpo-usuarios';
    limpiarTabla(tablaID);

    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        if (!response.ok) throw new Error("Error conectando con el servidor");
        
        // Guardamos los datos en la variable global para usarlos al editar
        usuariosCargados = await response.json();
        
        const cuerpo = document.getElementById(tablaID);

        usuariosCargados.forEach(user => {
            const id = user.userId; // Asegúrate de que tu Java devuelve 'userId' o 'id'
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${id}</td>
                <td>${user.fullName}</td>
                <td>${user.userEmail}</td>
                <td>${user.roleId === 1 ? '<span class="badge bg-primary">Admin</span>' : '<span class="badge bg-secondary">Usuario</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="abrirModalEditar(${id})">✏️ Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="solicitarBorrado(${id})">🗑️ Borrar</button>
                </td>
            `;
            cuerpo.appendChild(row);
        });
    } catch (e) { 
        mostrarError("No se pudieron cargar los usuarios: " + e.message);
    }
}

// --- CREAR USUARIO ---
function crearUsuario() {
    mostrarFormulario("Nuevo Usuario", [
        { label: "Nombre Completo", key: "fullName" },
        { label: "Email", key: "userEmail", type: "email" },
        { label: "Contraseña", key: "userPassword", type: "password" },
        { label: "Rol ID (1=Admin, 2=User)", key: "roleId", type: "number" }
    ], async (datos) => {
        // Validación básica
        if(!datos.userEmail || !datos.userPassword) {
            mostrarError("Email y contraseña son obligatorios");
            return;
        }
        
        datos.isActive = true; // Por defecto activo

        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            if(response.ok) {
                mostrarPopup("Éxito", "Usuario creado correctamente", "success");
                cargarUsuarios();
            } else {
                mostrarError("No se pudo crear el usuario.");
            }
        } catch(e) { mostrarError(e.message); }
    });
}

// --- EDITAR USUARIO (NUEVA LÓGICA) ---
function abrirModalEditar(id) {
    // Buscamos el usuario en la memoria (array global)
    const user = usuariosCargados.find(u => u.userId === id);

    if (!user) {
        mostrarError("Usuario no encontrado.");
        return;
    }

    mostrarFormulario("Editar Usuario", [
        { label: "Nombre", key: "fullName", value: user.fullName },
        { label: "Email", key: "userEmail", value: user.userEmail },
        { label: "Nueva Contraseña (Opcional)", key: "userPassword", type: "password" },
        { label: "Rol ID", key: "roleId", value: user.roleId, type: "number" }
    ], async (datos) => {
        
        datos.userId = id;
        datos.isActive = true;

        try {
            const response = await fetch(`${API_BASE_URL}/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            if(response.ok) {
                mostrarPopup("Actualizado", "Usuario modificado con éxito", "success");
                cargarUsuarios();
            } else {
                mostrarError("Error al actualizar el usuario.");
            }
        } catch(e) { mostrarError(e.message); }
    });
}

// --- BORRAR USUARIO (CON CONFIRMACIÓN) ---
function solicitarBorrado(id) {
    mostrarConfirmacion(
        "¿Eliminar Usuario?", 
        `Estás a punto de borrar al usuario con ID ${id}. Esta acción no se puede deshacer.`, 
        async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' });
                if(response.ok) {
                    mostrarPopup("Eliminado", "El usuario ha sido borrado.", "success");
                    cargarUsuarios();
                } else {
                    mostrarError("No se pudo eliminar (quizás tiene pedidos asignados).");
                }
            } catch(e) { mostrarError(e.message); }
        }
    );
}