// js/users.js - USER MANAGEMENT (WITH PASSWORD EDIT)

let usuariosCargados = [];

// --- INITIAL LOAD ---
async function cargarUsuarios() {
    const cuerpo = document.getElementById('tabla-cuerpo-users');
    if(!cuerpo) return;
    
    cuerpo.innerHTML = '<tr><td colspan="6" class="text-center">Cargando usuarios...</td></tr>';

    const btnAdd = document.querySelector('.add-button');
    if (btnAdd) btnAdd.style.display = esAdmin() ? 'block' : 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        if (!response.ok) throw new Error("Error al obtener usuarios");
        
        usuariosCargados = await response.json();
        renderizarTablaUsuarios(usuariosCargados);
        configurarBuscadorUsuarios();

    } catch (error) { 
        console.error(error);
        if(cuerpo) cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al cargar datos</td></tr>';
        mostrarPopup("Error", "No se pudieron cargar los usuarios.", "error"); 
    }
}

// --- RENDERING (VISUAL LOGIC) ---
function renderizarTablaUsuarios(lista) {
    const cuerpo = document.getElementById('tabla-cuerpo-users');
    if (!cuerpo) return;
    cuerpo.innerHTML = '';

    const miUsuario = obtenerUsuario();
    if (!miUsuario) return;

    const miId = miUsuario.userId || miUsuario.id;
    const soySuperAdmin = (miId === 1);
    const soyAdmin = (miUsuario.roleId === 1);

    if (!lista || lista.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay usuarios registrados</td></tr>';
        return;
    }

    lista.forEach(u => {
        let botones = '';
        
        const targetId = u.userId || u.id;
        const esObjetivoAdmin = (u.roleId === 1);
        const esObjetivoSuperAdmin = (targetId === 1);
        const esMiMismo = (targetId === miId);

        if (soyAdmin) {
            // --- EDIT BUTTON ---
            if (esObjetivoSuperAdmin && !soySuperAdmin) {
                botones += `<button class="btn btn-sm btn-secondary disabled" disabled style="cursor:not-allowed;"><i class="bi bi-lock-fill"></i></button>`;
            } 
            else if (!soySuperAdmin && esObjetivoAdmin && !esMiMismo) {
                botones += `<button class="btn btn-sm btn-secondary disabled" disabled style="cursor:not-allowed;"><i class="bi bi-lock-fill"></i></button>`;
            } 
            else {
                botones += `<button class="btn btn-sm btn-primary me-1" onclick="editarUsuario(${targetId})" title="Editar"><i class="bi bi-pencil"></i></button>`;
            }

            // --- DELETE BUTTON ---
            if (esMiMismo) {
                // No delete button for self
            } 
            else if (esObjetivoSuperAdmin) {
                botones += `<button class="btn btn-sm btn-secondary disabled" disabled style="cursor:not-allowed;"><i class="bi bi-lock-fill"></i></button>`;
            } 
            else if (esObjetivoAdmin) {
                if (soySuperAdmin) {
                    botones += `<button class="btn btn-sm btn-danger" onclick="borrarUsuario(${targetId})" title="Eliminar Admin"><i class="bi bi-trash"></i></button>`;
                } else {
                    botones += `<button class="btn btn-sm btn-secondary disabled" disabled style="cursor:not-allowed;"><i class="bi bi-lock-fill"></i></button>`;
                }
            } 
            else {
                botones += `<button class="btn btn-sm btn-danger" onclick="borrarUsuario(${targetId})" title="Eliminar Cliente"><i class="bi bi-trash"></i></button>`;
            }
        }

        const rolBadge = u.roleId === 1 
            ? '<span class="badge bg-danger">ADMIN</span>' 
            : '<span class="badge bg-success">CLIENTE</span>';

        const row = document.createElement('tr');
        if(esMiMismo) row.classList.add('table-active');

        row.innerHTML = `
            <td>${targetId}</td>
            <td class="fw-bold">
                ${u.fullName} 
                ${targetId === 1 ? '<i class="bi bi-shield-fill-check text-primary ms-1" title="Super Admin"></i>' : ''}
            </td>
            <td>${u.userEmail}</td>
            <td>${u.mobilePhone || '-'}</td>
            <td>${rolBadge}</td>
            <td>${botones}</td>
        `;
        cuerpo.appendChild(row);
    });
}

function configurarBuscadorUsuarios() {
    const input = document.querySelector('.search-input');
    if(!input) return;

    const nuevoInput = input.cloneNode(true);
    input.parentNode.replaceChild(nuevoInput, input);

    nuevoInput.addEventListener('keyup', () => {
        const texto = nuevoInput.value.toLowerCase();
        const filtrados = usuariosCargados.filter(u => 
            (u.fullName && u.fullName.toLowerCase().includes(texto)) || 
            (u.userEmail && u.userEmail.toLowerCase().includes(texto))
        );
        renderizarTablaUsuarios(filtrados);
    });
}

// --- CREATE USER ---
function crearUsuario() {
    if (!esAdmin()) return mostrarPopup("Acceso Denegado", "No tienes permisos.", "error");

    mostrarFormulario("Nuevo Usuario", [
        // AÑADIDO: maxLength: 50
        { label: "Nombre Completo", key: "fullName", maxLength: 50 },
        { label: "Email", key: "userEmail", type: "email" },
        // AÑADIDO: maxLength: 9 y soloNumeros: true
        { label: "Teléfono", key: "mobilePhone", maxLength: 9, soloNumeros: true },
        { label: "Contraseña", key: "userPassword", type: "password" },
        { label: "Rol", key: "roleId", type: "select", options: [
            {val:"2", text:"Cliente"}, 
            {val:"1", text:"Administrador"} 
        ]}
    ], async (datos) => {
        // ... (El resto de la función se queda igual que la tenías, con el fetch) ...
        datos.roleId = parseInt(datos.roleId);
        datos.isActive = true; 
        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(datos) 
            });
            if(res.ok) { mostrarPopup("Éxito", "Usuario creado.", "success"); cargarUsuarios(); }
            else { const txt = await res.text(); mostrarPopup("Error", txt, "error"); }
        } catch(e) { console.error(e); }
    });
}

// --- EDIT USER (WITH PASSWORD FIELD ADDED) ---
function editarUsuario(id) {
    const u = usuariosCargados.find(x => (x.userId || x.id) === id);
    if(!u) return;

    const miUsuario = obtenerUsuario();
    const miId = miUsuario.userId || miUsuario.id;
    const soySuperAdmin = (miId === 1);
    const targetId = u.userId || u.id;

    // Security Checks
    if (targetId === 1 && !soySuperAdmin) return mostrarPopup("Seguridad", "El Super Admin es intocable.", "error");
    if (!soySuperAdmin && u.roleId === 1 && (targetId !== miId)) return mostrarPopup("Prohibido", "No puedes modificar a otros administradores.", "error");
    if (miUsuario.roleId !== 1) return mostrarPopup("Acceso Denegado", "Los clientes no pueden editar usuarios.", "error");

    mostrarFormulario("Editar Usuario", [
        // AÑADIDO: maxLength: 50
        { label: "Nombre", key: "fullName", value: u.fullName, maxLength: 50 },
        { label: "Email", key: "userEmail", value: u.userEmail, readonly: true }, 
        // AÑADIDO: maxLength: 9 y soloNumeros: true
        { label: "Teléfono", key: "mobilePhone", value: u.mobilePhone, maxLength: 9, soloNumeros: true },
        { label: "Nueva Contraseña (Opcional)", key: "userPassword", type: "password", placeholder: "Dejar en blanco para no cambiar" },
        { label: "Rol", key: "roleId", type: "select", value: u.roleId, options: [
            {val:"2", text:"Cliente"}, 
            {val:"1", text:"Administrador"}
        ]}
    ], async (datos) => {
        datos.roleId = parseInt(datos.roleId);
        datos.isActive = u.isActive;
        
        // IMPORTANT: If password field is empty, send null/empty so Backend ignores it
        // (Assuming you fixed UserController.java as discussed previously)

        try {
            const res = await fetch(`${API_BASE_URL}/users/${id}`, { 
                method: 'PUT', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(datos) 
            });
            if(res.ok) { 
                mostrarPopup("Actualizado", "Usuario modificado.", "success"); 
                cargarUsuarios(); 
            } else {
                mostrarPopup("Error", "Fallo al actualizar.", "error");
            }
        } catch(e) { console.error(e); }
    });
}

// --- DELETE USER ---
function borrarUsuario(id) {
    const u = usuariosCargados.find(x => (x.userId || x.id) === id);
    if(!u) return;

    const miUsuario = obtenerUsuario();
    const miId = miUsuario.userId || miUsuario.id;
    const soySuperAdmin = (miId === 1);
    const targetId = u.userId || u.id;

    if (targetId === 1) return mostrarPopup("Seguridad", "El Super Admin no puede ser eliminado.", "error");
    if (targetId === miId) return mostrarPopup("Aviso", "No puedes eliminar tu propio usuario.", "warning");
    if (!soySuperAdmin && u.roleId === 1) return mostrarPopup("Acceso Denegado", "Solo el Super Admin puede eliminar a otros administradores.", "error");
    if (miUsuario.roleId !== 1) return mostrarPopup("Acceso Denegado", "Acción solo para administradores.", "error");

    mostrarConfirmacionSegura("¿Eliminar Usuario?", `Se borrará a <b>${u.fullName}</b>.`, u.userEmail, async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' });
            if(response.ok) { 
                mostrarPopup("Eliminado", "Usuario borrado.", "success"); 
                cargarUsuarios(); 
            } else {
                mostrarPopup("Error", "No se pudo borrar.", "error");
            }
        } catch(e) { console.error(e); }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tabla-cuerpo-users')) {
        cargarUsuarios();
    }
});