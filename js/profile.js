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

            // --- NUEVO: Actualizamos también el estado del 2FA al cargar datos ---
            if (user.isTwoFactorEnabled !== undefined) {
                actualizarBadge2FA(user.isTwoFactorEnabled);
                // Actualizamos también el localStorage para tener el dato fresco
                usuarioLocal.is2fa = user.isTwoFactorEnabled;
                localStorage.setItem('usuario_csl', JSON.stringify(usuarioLocal));
            }

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
            let nuevoUsuario = null;
            try {
                nuevoUsuario = await response.json();
            } catch(e) {
                nuevoUsuario = datosActualizar; // Fallback
            }
            
            // Mantenemos el estado del 2FA que ya teníamos
            nuevoUsuario.is2fa = usuarioLocal.is2fa;

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

// --- LÓGICA 2FA (Autenticación en 2 Pasos) ---

function actualizarBadge2FA(activo) {
    const badge = document.getElementById('badge-2fa');
    const btn = document.getElementById('btn-toggle-2fa');
    
    // Si no existen los elementos (ej: estamos en otra página), no hacemos nada
    if (!badge || !btn) return;

    if (activo) {
        badge.className = 'badge bg-success';
        badge.innerText = 'ACTIVADO';
        
        btn.className = 'btn btn-outline-danger';
        btn.innerText = 'Desactivar 2FA';
        btn.onclick = desactivar2FA; // Asignamos la función de desactivar
    } else {
        badge.className = 'badge bg-secondary';
        badge.innerText = 'Desactivado';
        
        btn.className = 'btn btn-outline-primary';
        btn.innerText = 'Activar 2FA';
        btn.onclick = iniciarSetup2FA; // Asignamos la función de activar
    }
}

async function iniciarSetup2FA() {
    const user = obtenerUsuario();
    try {
        // 1. Pedir secreto y URL del QR al backend
        const res = await fetch(`${API_BASE_URL}/auth/setup-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.userId })
        });
        const data = await res.json();

        // 2. Mostrar QR
        const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.qrUrl)}`;

        mostrarPopup(
            "Configurar Google Authenticator",
            `<div class="text-center">
                <p>1. Escanea este código con tu app:</p>
                <img src="${qrImage}" class="img-thumbnail mb-3">
                <p>2. Introduce el código de 6 dígitos que aparece:</p>
                <input type="text" id="input-code-2fa" class="form-control text-center fs-4 letter-spacing-2" placeholder="000 000" maxlength="6">
                <button class="btn btn-success w-100 mt-3" onclick="confirmarActivacion2FA('${data.secret}')">Verificar y Activar</button>
            </div>`,
            "info"
        );
    } catch (e) { mostrarError("Error iniciando 2FA: " + e.message); }
}

async function confirmarActivacion2FA(secret) {
    const user = obtenerUsuario();
    const code = document.getElementById('input-code-2fa').value;
    
    try {
        const res = await fetch(`${API_BASE_URL}/auth/confirm-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.userId, secret: secret, code: code })
        });

        if (res.ok) {
            mostrarPopup("¡Éxito!", "Autenticación en 2 Pasos activada.", "success");
            // Actualizamos localstorage
            user.is2fa = true;
            localStorage.setItem('usuario_csl', JSON.stringify(user));
            actualizarBadge2FA(true);
        } else {
            mostrarPopup("Error", "Código incorrecto. Inténtalo de nuevo.", "error");
        }
    } catch (e) { mostrarError("Error de conexión"); }
}

async function desactivar2FA() {
    const user = obtenerUsuario();
    mostrarConfirmacion("¿Desactivar 2FA?", "Tu cuenta será menos segura.", async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/disable-2fa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.userId })
            });
            if (res.ok) {
                user.is2fa = false;
                localStorage.setItem('usuario_csl', JSON.stringify(user));
                actualizarBadge2FA(false);
                mostrarPopup("Desactivado", "Se ha quitado el 2FA.", "success");
            }
        } catch(e) { mostrarError("Error al desactivar."); }
    });
}

// --- INICIALIZACIÓN ---
// Esto es lo que faltaba: Ejecutar al cargar la página para pintar el estado del botón
document.addEventListener("DOMContentLoaded", () => {
    const user = obtenerUsuario();
    if (user) {
        // Usamos la propiedad 'is2fa' o 'isTwoFactorEnabled' según como la hayamos guardado
        const estado2FA = user.is2fa || user.isTwoFactorEnabled || false;
        actualizarBadge2FA(estado2FA);
    }
});