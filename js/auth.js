//
// URL de la API (Asegúrate que coincide con tu app.js)
// const API_BASE_URL = "http://localhost:8080/api"; // Ya suele estar en app.js

// --- LOGIN ---
async function procesarLogin() {
    const email = document.getElementById('usuario').value;
    const pass = document.getElementById('contraseña').value;

    if (!email || !pass) return mostrarPopup("Error", "Faltan datos", "error");

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail: email, userPassword: pass })
        });

        if (response.ok) {
            const data = await response.json();

            // --- CASO 1: REQUIERE 2FA ---
            if (data.status === "2FA_REQUIRED") {
                pedirCodigo2FA(data.userId); // <--- NUEVA FUNCIÓN
                return; 
            }

            // --- CASO 2: LOGIN NORMAL ---
            localStorage.setItem('usuario_csl', JSON.stringify(data));
            mostrarPopup("¡Bienvenido!", "Acceso concedido.", "success");
            setTimeout(() => { window.location.href = 'admin_dashboard.html'; }, 1500);

        } else {
            const txt = await response.text();
            mostrarPopup("Error", txt, "error");
        }
    } catch (error) { mostrarError("Error de conexión"); }
}

// --- NUEVAS FUNCIONES AUXILIARES PARA EL LOGIN ---
function pedirCodigo2FA(userId) {
    // Cerramos el modal anterior si hubiera
    const modalPrevio = document.getElementById('modal-universal');
    if (modalPrevio) {
        const bsModal = bootstrap.Modal.getInstance(modalPrevio);
        if(bsModal) bsModal.hide();
    }

    mostrarPopup(
        "Verificación de Seguridad",
        `<div class="text-center">
            <i class="bi bi-shield-lock text-primary" style="font-size:3rem;"></i>
            <p class="mt-2">Introduce el código de tu Google Authenticator</p>
            <input type="text" id="login-2fa-code" class="form-control text-center fs-4 mb-3" placeholder="000000" maxlength="6">
            <button class="btn btn-primary w-100" onclick="validarLogin2FA(${userId})">Verificar</button>
        </div>`,
        "primary"
    );
}

function pedirCodigo2FA(userId) {
    cerrarModalesYBackdrop(); // Limpiar residuos

    mostrarPopup(
        "Verificación de Seguridad",
        `<div class="text-center">
            <i class="bi bi-shield-lock text-primary" style="font-size:3rem;"></i>
            <p class="mt-2">Introduce el código de tu Google Authenticator</p>
            <div id="error-2fa" class="alert alert-danger d-none" style="font-size: 0.9rem;"></div>
            
            <input type="text" id="login-2fa-code" class="form-control text-center fs-4 mb-3" placeholder="000000" maxlength="6">
            <button id="btn-verificar-2fa" class="btn btn-primary w-100" onclick="validarLogin2FA(${userId})">Verificar</button>
        </div>`,
        "primary"
    );
}

async function validarLogin2FA(userId) {
    const codeInput = document.getElementById('login-2fa-code');
    const errorDiv = document.getElementById('error-2fa');
    const btn = document.getElementById('btn-verificar-2fa');
    const code = codeInput.value;

    if (!code) return;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/verify-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId.toString(), code: code })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('usuario_csl', JSON.stringify(data));
            cerrarModalesYBackdrop();
            mostrarPopup("¡Bienvenido!", "Acceso concedido.", "success");
            setTimeout(() => { window.location.href = 'admin_dashboard.html'; }, 1500);
        } else {
            const mensajeError = await res.text();
            
            // Si el servidor responde con error (401 o 423)
            errorDiv.innerText = mensajeError;
            errorDiv.classList.remove('d-none'); // Mostramos el error en el modal
            codeInput.value = ""; // Limpiamos el código para reintentar
            
            // Si el estado es 423 (Bloqueado), desactivamos el botón y obligamos a recargar
            if (res.status === 423) {
                btn.disabled = true;
                codeInput.disabled = true;
                setTimeout(() => {
                    cerrarModalesYBackdrop();
                    window.location.reload(); // Recarga para volver al login de email/pass
                }, 3000);
            }
        }
    } catch (e) {
        mostrarError("Error de conexión");
    }
}

// Función auxiliar para limpiar los residuos de los modales de Bootstrap
function cerrarModalesYBackdrop() {
    // Buscar todos los modales abiertos y ocultarlos
    const modales = document.querySelectorAll('.modal.show');
    modales.forEach(m => {
        const instance = bootstrap.Modal.getInstance(m);
        if (instance) instance.hide();
    });

    // Eliminar manualmente el fondo oscuro (backdrop) que causa el efecto "apagado"
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(b => b.remove());
    
    // Devolver el scroll al cuerpo de la página
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}

// --- REGISTRO (CON CONFIRMACIÓN DE CORREO) ---
// --- REGISTRO (CON CONFIRMACIÓN DE CORREO Y VALIDACIÓN MÓVIL) ---
async function procesarRegistro() {
    const nombre = document.getElementById('regNombre').value;
    const email = document.getElementById('regEmail').value;
    const movil = document.getElementById('regMovil').value;
    const pass = document.getElementById('regPass').value;
    const passConfirm = document.getElementById('regPassConfirm').value;

    // 1. Validación básica de campos vacíos
    if (!nombre || !email || !pass) {
        mostrarPopup("Faltan datos", "Todos los campos son obligatorios.", "error");
        return;
    }

    // 2. CORRECCIÓN FINAL: VALIDACIÓN DE MÓVIL ESPAÑOL (Requisito Obligatorio)
    // Acepta formatos como: 600123456, +34 600..., 0034 700...
    const regexMovilES = /^(\+34|0034|34)?[67]\d{8}$/;
    
    // Eliminamos espacios en blanco para comprobar el número limpio
    if (!regexMovilES.test(movil.replace(/\s/g, ''))) { 
        mostrarPopup("Formato Incorrecto", "El teléfono debe ser un móvil español válido (empieza por 6 o 7).", "warning");
        return;
    }

    // 3. Validación de contraseñas coincidentes
    if (pass !== passConfirm) {
        mostrarPopup("Error", "Las contraseñas no coinciden.", "error");
        return;
    }

    // Objeto a enviar al backend
    const nuevoUsuario = {
        fullName: nombre,
        userEmail: email,
        userPassword: pass,
        mobilePhone: movil,
        roleId: 2, // Por defecto creamos clientes (Rol 2)
        isActive: false // Se crea inactivo esperando confirmación por email
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoUsuario)
        });

        if (response.ok) {
            // Éxito: Avisamos de que revise el correo
            mostrarPopup(
                "¡Registro Recibido!", 
                `<div class="text-center">
                    <i class="bi bi-envelope-paper-heart text-primary" style="font-size:3rem;"></i>
                    <p class="mt-2 lead">Hemos enviado un correo a <b>${email}</b>.</p>
                    <p>Por favor, haz clic en el enlace de ese correo para activar tu cuenta.</p>
                </div>`, 
                "success"
            );
            
            // Limpiamos el formulario para que quede bonito
            document.getElementById('registerForm').reset();
            
        } else {
            // Error del servidor (ej: "El email ya existe")
            const errorTxt = await response.text();
            mostrarPopup("Error en el registro", errorTxt, "error");
        }
    } catch (error) {
        console.error(error);
        mostrarError("Error de conexión al intentar registrarse.");
    }
}

// --- RECUPERAR CONTRASEÑA ---
async function solicitarRecuperacion() {
    const email = document.getElementById('recoveryEmail').value;
    const btn = document.getElementById('btn-recovery');

    if (!email || !email.includes('@')) {
        mostrarPopup("Error", "Por favor, introduce un email válido.", "error");
        return;
    }

    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Conectando...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        if (response.ok) {
            mostrarPopup(
                "¡Correo Enviado!", 
                `<div class="text-center">
                    <i class="bi bi-envelope-check-fill text-success" style="font-size:3rem;"></i>
                    <p class="mt-2 lead">Instrucciones enviadas a <b>${email}</b>.</p>
                </div>`, 
                "success"
            );
            document.getElementById('recoveryEmail').value = ''; 
        } else {
            const errorTxt = await response.text();
            mostrarPopup("Error", errorTxt, "error");
        }

    } catch (error) {
        console.error(error);
        mostrarError("Error de conexión con el servidor.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}