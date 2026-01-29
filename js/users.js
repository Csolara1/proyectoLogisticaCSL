// Clave donde se guardan todos los usuarios (Google + Manuales)
const CLAVE_USUARIOS_DB = 'usuarios_csl';

// Variables globales
let usuariosCargados = [];

// --- CARGAR USUARIOS (Desde LocalStorage) ---
function cargarUsuarios() {
    const tablaID = 'tabla-cuerpo-usuarios';
    const cuerpo = document.getElementById(tablaID);
    if(cuerpo) cuerpo.innerHTML = ''; // Limpiar tabla
    
    // Mostrar botón de añadir solo si es admin
    const btnAdd = document.querySelector('.add-button');
    if (btnAdd && typeof esAdmin === 'function') {
        btnAdd.style.display = esAdmin() ? 'block' : 'none';
    }

    try {
        // 1. Leemos la lista de usuarios guardada
        const usuariosGuardados = localStorage.getItem(CLAVE_USUARIOS_DB);
        
        if (usuariosGuardados) {
            usuariosCargados = JSON.parse(usuariosGuardados);
        } else {
            // Si está vacía, creamos al Super Admin por defecto para que no te quedes fuera
            usuariosCargados = [{
                id: 1,
                email: 'admin@csl.com',
                fullName: 'Super Admin',
                password: 'admin',
                roleId: 1,
                mobilePhone: '600000000'
            }];
            localStorage.setItem(CLAVE_USUARIOS_DB, JSON.stringify(usuariosCargados));
        }

        renderizarTabla(usuariosCargados);
        configurarBuscador();

    } catch (e) { 
        console.error(e);
        mostrarError("Error al cargar usuarios locales."); 
    }
}

// --- RENDERIZAR TABLA ---
function renderizarTabla(listaUsuarios) {
    const cuerpo = document.getElementById('tabla-cuerpo-usuarios');
    cuerpo.innerHTML = '';

    if (!listaUsuarios || listaUsuarios.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No se encontraron resultados</td></tr>';
        return;
    }

    // Obtenemos el usuario conectado actualmente para saber quién soy
    const usuarioActual = JSON.parse(localStorage.getItem('usuario_csl')); 
    const soyAdminGlobal = typeof esAdmin === 'function' ? esAdmin() : false;

    listaUsuarios.forEach(user => {
        // NORMALIZACIÓN DE DATOS (Para que funcionen Google y Manuales a la vez)
        // Algunos tienen 'id' y otros 'userId'. Algunos 'email' y otros 'userEmail'.
        const id = user.id || user.userId;
        const email = user.email || user.userEmail;
        const nombre = user.fullName || 'Sin Nombre';
        const rol = user.roleId;

        let botonesAccion = '<span class="text-muted small"><i class="bi bi-lock-fill"></i></span>';
        
        if (soyAdminGlobal) {
            // Protección: No borrar al admin principal ni a uno mismo
            const esJefeSupremo = (email === 'admin@csl.com') || (email === 'rubiker83@gmail.com');
            const soyYo = usuarioActual && ( (usuarioActual.id || usuarioActual.userId) === id );

            if (esJefeSupremo || soyYo) {
                botonesAccion = `
                    <button class="btn btn-sm btn-warning" onclick="abrirModalEditar(${id})"><i class="bi bi-pencil-square"></i></button>
                    <span class="text-danger ms-1" title="Protegido"><i class="bi bi-shield-lock-fill"></i></span>
                `;
            } else {
                botonesAccion = `
                    <button class="btn btn-sm btn-warning" onclick="abrirModalEditar(${id})"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="solicitarBorrado(${id})"><i class="bi bi-trash-fill"></i></button>
                `;
            }
        }

        const movil = user.mobilePhone || '-';
        // Admin ve el ID, usuarios normales no
        const celdaID = soyAdminGlobal ? `<td>${id}</td>` : '';

        const row = document.createElement('tr');
        row.innerHTML = `
            ${celdaID}
            <td>
                ${user.picture ? `<img src="${user.picture}" class="rounded-circle me-2" width="25">` : ''}
                ${nombre}
            </td>
            <td>${email}</td>
            <td>${movil}</td>
            <td>${rol === 1 ? '<span class="badge bg-primary">Admin</span>' : '<span class="badge bg-secondary">Usuario</span>'}</td>
            <td>${botonesAccion}</td>
        `;
        cuerpo.appendChild(row);
    });
}

// --- BUSCADOR ---
function configurarBuscador() {
    const input = document.querySelector('.search-input');
    const btn = document.querySelector('.search-button');
    if (!input) return;

    const filtrar = () => {
        const texto = input.value.toLowerCase();
        const filtrados = usuariosCargados.filter(u => {
            const nombre = u.fullName || '';
            const email = u.email || u.userEmail || '';
            return nombre.toLowerCase().includes(texto) || email.toLowerCase().includes(texto);
        });
        renderizarTabla(filtrados);
    };

    if(btn) btn.onclick = filtrar;
    input.addEventListener('keyup', filtrar);
}

// --- CREAR USUARIO (Guarda en LocalStorage) ---
function crearUsuario() {
    if (typeof esAdmin === 'function' && !esAdmin()) return alert("⛔ Acceso Denegado.");

    // Usamos las claves estandarizadas (email, password, etc)
    mostrarFormulario("Nuevo Usuario", [
        { label: "Nombre Completo", key: "fullName" },
        { label: "Email", key: "email", type: "email" },
        { label: "Móvil", key: "mobilePhone", type: "tel" },
        { label: "Contraseña", key: "password", type: "password" },
        { label: "Rol (1=Admin, 2=User)", key: "roleId", type: "select", options: [{val:"2",text:"Usuario/Cliente"},{val:"1",text:"Administrador"}] }
    ], (datos) => {
        if(!datos.email || !datos.password) return alert("Faltan datos obligatorios.");
        
        const nuevoUsuario = {
            id: Date.now(), // ID único basado en tiempo
            ...datos,
            roleId: parseInt(datos.roleId) // Asegurar que es número
        };

        // Guardamos
        usuariosCargados.push(nuevoUsuario);
        localStorage.setItem(CLAVE_USUARIOS_DB, JSON.stringify(usuariosCargados));

        alert("Usuario creado correctamente");
        renderizarTabla(usuariosCargados);
    });
}

// --- EDITAR USUARIO ---
function abrirModalEditar(id) {
    // Buscamos soportando ambos nombres de ID
    const user = usuariosCargados.find(u => (u.id === id) || (u.userId === id));
    if (!user) return;

    const email = user.email || user.userEmail;
    // Protegemos edición de emails críticos
    const esIntocable = (email === 'admin@csl.com' || email === 'rubiker83@gmail.com');

    mostrarFormulario("Editar Usuario", [
        { label: "Nombre", key: "fullName", value: user.fullName },
        { label: "Email", key: "email", value: email, readOnly: esIntocable }, 
        { label: "Móvil", key: "mobilePhone", value: user.mobilePhone || '' },
        { label: "Nueva Contraseña (Dejar vacío para mantener)", key: "password", type: "password" },
        { label: "Rol", key: "roleId", value: user.roleId.toString(), type: "select", options: [{val:"2",text:"Usuario/Cliente"},{val:"1",text:"Administrador"}] }
    ], (datos) => {
        
        // Actualizamos los campos
        user.fullName = datos.fullName;
        user.mobilePhone = datos.mobilePhone;
        user.roleId = parseInt(datos.roleId);
        
        // Solo cambiamos contraseña si escribió algo
        if (datos.password && datos.password.trim() !== "") {
            user.password = datos.password;
        }

        // Guardamos cambios en LocalStorage
        localStorage.setItem(CLAVE_USUARIOS_DB, JSON.stringify(usuariosCargados));
        
        alert("Usuario actualizado");
        renderizarTabla(usuariosCargados);
    });
}

// --- BORRAR USUARIO (CON PROTECCIÓN DE ESCRITURA) ---
function solicitarBorrado(id) {
    // 1. Buscamos al usuario
    const user = usuariosCargados.find(u => (u.id === id) || (u.userId === id));
    if (!user) return;
    
    const email = user.email || user.userEmail;

    // 2. Comprobamos que la función de seguridad existe (está en app.js)
    if (typeof mostrarConfirmacionSegura !== 'function') {
        // Fallback por si acaso no cargó app.js
        if(confirm("¿Borrar usuario?")) ejecutarBorrado(id); 
        return;
    }

    // 3. Lanzamos el POP-UP DE SEGURIDAD
    mostrarConfirmacionSegura(
        "¿Eliminar Usuario?", 
        `Estás a punto de eliminar a <b>${user.fullName}</b>.<br>Esta acción no se puede deshacer.`, 
        email, // Esta es la palabra clave que el usuario debe escribir
        () => {
            // Esta función solo se ejecuta si el usuario escribe bien el correo
            ejecutarBorrado(id);
        }
    );
}

// Función auxiliar para borrar físicamente (se llama tras confirmar)
function ejecutarBorrado(id) {
    // Filtramos para quitar al usuario de la lista
    usuariosCargados = usuariosCargados.filter(u => (u.id !== id && u.userId !== id));
    
    // Guardamos en LocalStorage
    localStorage.setItem(CLAVE_USUARIOS_DB, JSON.stringify(usuariosCargados));
    
    // Refrescamos la tabla y avisamos
    renderizarTabla(usuariosCargados);
    mostrarPopup("Eliminado", "El usuario ha sido eliminado correctamente.", "success");
}