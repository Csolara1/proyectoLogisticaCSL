//

// Cargar datos del usuario logueado
async function cargarDatosPerfil() {
    const usuarioLocal = obtenerUsuario(); // Recuperamos del localStorage
    
    if (!usuarioLocal) {
        console.error("No hay usuario en localStorage");
        return;
    }

    // Buscamos el ID (Soporta 'userId' o 'id')
    const idUsuario = usuarioLocal.userId || usuarioLocal.id;

    if (!idUsuario) {
        mostrarError("Error: ID de usuario no encontrado. Cierra sesión e intenta entrar de nuevo.");
        return;
    }

    try {
        let user = null;

        // INTENTO 1: Pedir usuario específico (Lo ideal)
        let response = await fetch(`${API_BASE_URL}/users/${idUsuario}`);
        
        if (response.ok) {
            user = await response.json();
        } else {
            // INTENTO 2 (PLAN B): Si falla el anterior, pedimos TODOS y filtramos
            console.warn("Fallo al pedir usuario individual. Intentando buscar en la lista completa...");
            response = await fetch(`${API_BASE_URL}/users`);
            
            if (response.ok) {
                const todosLosUsuarios = await response.json();
                // Buscamos nuestro usuario en la lista
                user = todosLosUsuarios.find(u => (u.userId === idUsuario) || (u.id === idUsuario));
            }
        }

        // SI HEMOS ENCONTRADO AL USUARIO (Ya sea por método 1 o 2)
        if (user) {
            console.log("Datos cargados correctamente:", user);

            const inputName = document.getElementById('profileName');
            const inputEmail = document.getElementById('profileEmail');
            const inputPhone = document.getElementById('profilePhone');

            if (inputName) inputName.value = user.fullName || '';
            if (inputEmail) inputEmail.value = user.userEmail || '';
            if (inputPhone) inputPhone.value = user.mobilePhone || ''; 

        } else {
            throw new Error("No se encontró tu usuario en la base de datos.");
        }

    } catch (error) {
        console.error(error);
        mostrarError("No se pudieron cargar tus datos. Detalle: " + error.message);
    }
}

// Guardar cambios
async function actualizarPerfil() {
    const usuarioLocal = obtenerUsuario();
    const idUsuario = usuarioLocal.userId || usuarioLocal.id;

    const nombre = document.getElementById('profileName').value;
    const movil = document.getElementById('profilePhone').value;
    const pass = document.getElementById('profilePass').value;
    const passConfirm = document.getElementById('profilePassConfirm').value;

    if (pass && pass !== passConfirm) {
        mostrarPopup("Error", "Las contraseñas no coinciden.", "error");
        return;
    }

    const datosActualizar = {
        userId: idUsuario,
        fullName: nombre,
        mobilePhone: movil,
        userEmail: document.getElementById('profileEmail').value,
        roleId: usuarioLocal.roleId
    };

    if (pass) {
        datosActualizar.userPassword = pass;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/${idUsuario}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosActualizar)
        });

        if (response.ok) {
            mostrarPopup("Perfil Actualizado", "Tus datos se han guardado correctamente.", "success");
            
            // Actualizamos la memoria local con los datos nuevos
            // (Si la API devuelve el objeto nuevo, lo usamos. Si no, usamos lo que enviamos)
            let nuevoUsuario = null;
            try {
                nuevoUsuario = await response.json();
            } catch(e) {
                nuevoUsuario = datosActualizar; // Fallback si la API no devuelve JSON al editar
            }

            localStorage.setItem('usuario_csl', JSON.stringify(nuevoUsuario));
            
            // Actualizar nombre visualmente
            const nombreMostrar = nuevoUsuario.fullName || nombre;
            const rolTexto = nuevoUsuario.roleId === 1 ? "Admin: " : "Usuario: ";
            const headerName = document.getElementById('session-username');
            if(headerName) headerName.innerText = rolTexto + nombreMostrar;
            
            document.getElementById('profilePass').value = '';
            document.getElementById('profilePassConfirm').value = '';
        } else {
            mostrarError("Error al guardar. Código: " + response.status);
        }
    } catch (e) {
        mostrarError("Error de red: " + e.message);
    }
}