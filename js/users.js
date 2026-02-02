// js/users.js - GESTIÓN DE USUARIOS

document.addEventListener('DOMContentLoaded', () => {
    const usuario = obtenerUsuario();
    if (!usuario) { window.location.href = 'login.html'; return; }
    cargarUsuarios();
    
    // Buscador
    const input = document.querySelector('.search-input');
    if(input) input.addEventListener('keyup', () => buscarUsuarios(input.value));
});

async function cargarUsuarios() {
    const cuerpo = document.getElementById('tabla-cuerpo-usuarios');
    if (!cuerpo) return;
    cuerpo.innerHTML = '<tr><td colspan="6" class="text-center">Cargando...</td></tr>';

    try {
        // Ahora usa la URL correcta http://localhost:8080/api
        const res = await fetch(`${API_BASE_URL}/users`);
        if (!res.ok) throw new Error("Error API");
        
        const usuarios = await res.json();
        window.usuariosCache = usuarios;
        renderizarTabla(usuarios);
    } catch (e) {
        cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error de conexión</td></tr>';
    }
}

function renderizarTabla(lista) {
    const cuerpo = document.getElementById('tabla-cuerpo-usuarios');
    cuerpo.innerHTML = '';
    const miUsuario = obtenerUsuario();

    lista.forEach(u => {
        const id = u.userId || u.id;
        const email = u.userEmail || u.email;
        let botones = '';

        if (email === 'admin@csl.com') {
            botones = `<span class="badge bg-warning text-dark"><i class="bi bi-shield-lock-fill"></i> Protegido</span>`;
        } else if (id === miUsuario.userId || id === miUsuario.id) {
            botones = `<button class="btn btn-sm btn-primary" onclick="editarUsuario(${id})"><i class="bi bi-pencil"></i></button>`;
        } else {
            botones = `
                <button class="btn btn-sm btn-primary me-1" onclick="editarUsuario(${id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-danger" onclick="borrarUsuario(${id}, '${email}')"><i class="bi bi-trash"></i></button>
            `;
        }

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${id}</td>
            <td><div class="d-flex align-items-center"><div class="avatar-initials me-2 bg-primary text-white rounded-circle d-flex justify-content-center align-items-center" style="width:32px;height:32px;">${(u.fullName||'U').charAt(0).toUpperCase()}</div>${u.fullName}</div></td>
            <td>${email}</td>
            <td>${u.mobilePhone||'-'}</td>
            <td>${u.roleId===1?'<span class="badge bg-primary">Admin</span>':'<span class="badge bg-secondary">Cliente</span>'}</td>
            <td>${botones}</td>
        `;
        cuerpo.appendChild(fila);
    });
}

// CREAR
function crearUsuario() {
    mostrarFormulario("Nuevo Usuario", [
        {label:"Nombre", key:"fullName"}, {label:"Email", key:"userEmail", type:"email"}, 
        {label:"Contraseña", key:"userPassword", type:"password"}, {label:"Móvil", key:"mobilePhone"},
        {label:"Rol", key:"roleId", type:"select", options:[{val:"2",text:"Cliente"},{val:"1",text:"Admin"}]}
    ], async (datos) => {
        try {
            datos.roleId = parseInt(datos.roleId);
            datos.isActive = true;
            const res = await fetch(`${API_BASE_URL}/users`, {
                method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(datos)
            });
            if(res.ok) { mostrarPopup("Creado", "Usuario registrado.", "success"); cargarUsuarios(); }
            else mostrarPopup("Error", "No se pudo crear (¿Email duplicado?)", "error");
        } catch(e) { mostrarPopup("Error", "Fallo de conexión", "error"); }
    });
}

// EDITAR
function editarUsuario(id) {
    const u = window.usuariosCache.find(x => (x.userId||x.id) === id);
    if(!u) return;
    mostrarFormulario("Editar", [
        {label:"Nombre", key:"fullName", value:u.fullName}, {label:"Email", key:"userEmail", value:u.userEmail||u.email},
        {label:"Móvil", key:"mobilePhone", value:u.mobilePhone},
        {label:"Rol", key:"roleId", type:"select", value:u.roleId, options:[{val:"2",text:"Cliente"},{val:"1",text:"Admin"}]},
        {label:"Nueva Clave (Opcional)", key:"userPassword", type:"password", placeholder:"Dejar en blanco para no cambiar"}
    ], async (datos) => {
        if(!datos.userPassword) delete datos.userPassword;
        datos.roleId = parseInt(datos.roleId);
        datos.isActive = true;
        
        try {
            const res = await fetch(`${API_BASE_URL}/users/${id}`, {
                method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(datos)
            });
            if(res.ok) { mostrarPopup("Actualizado", "Datos guardados.", "success"); cargarUsuarios(); }
            else mostrarPopup("Error", "No se pudo guardar.", "error");
        } catch(e) { mostrarPopup("Error", "Fallo de conexión", "error"); }
    });
}

// BORRAR (Confirmación Segura)
function borrarUsuario(id, email) {
    mostrarConfirmacionSegura("Eliminar Usuario", `Estás eliminando a <b>${email}</b>. Se borrarán sus datos y pedidos.`, email, async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/users/${id}`, { method:'DELETE' });
            if(res.ok) { mostrarPopup("Eliminado", "Usuario borrado.", "success"); cargarUsuarios(); }
            else mostrarPopup("Error", "No se pudo borrar.", "error");
        } catch(e) { mostrarPopup("Error", "Fallo de conexión", "error"); }
    });
}

function buscarUsuarios(txt) {
    if(!window.usuariosCache) return;
    const f = txt.toLowerCase();
    const res = window.usuariosCache.filter(u => (u.fullName||'').toLowerCase().includes(f) || (u.userEmail||'').toLowerCase().includes(f));
    renderizarTabla(res);
}