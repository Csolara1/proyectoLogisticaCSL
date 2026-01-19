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

async function validarLogin2FA(userId) {
    const code = document.getElementById('login-2fa-code').value;
    try {
        const res = await fetch(`${API_BASE_URL}/auth/verify-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId.toString(), code: code })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('usuario_csl', JSON.stringify(data));
            mostrarPopup("¡Verificado!", "Código correcto.", "success");
            setTimeout(() => { window.location.href = 'admin_dashboard.html'; }, 1000);
        } else {
            mostrarPopup("Error", "Código incorrecto.", "error");
        }
    } catch (e) { mostrarError("Error validando 2FA"); }
}

// --- REGISTRO (CON CONFIRMACIÓN DE CORREO) ---
async function procesarRegistro() {
    const nombre = document.getElementById('regNombre').value;
    const email = document.getElementById('regEmail').value;
    const movil = document.getElementById('regMovil').value;
    const pass = document.getElementById('regPass').value;
    const passConfirm = document.getElementById('regPassConfirm').value;

    if (!nombre || !email || !pass) {
        mostrarPopup("Faltan datos", "Todos los campos son obligatorios.", "error");
        return;
    }

    if (pass !== passConfirm) {
        mostrarPopup("Error", "Las contraseñas no coinciden.", "error");
        return;
    }

    const nuevoUsuario = {
        fullName: nombre,
        userEmail: email,
        userPassword: pass,
        mobilePhone: movil,
        roleId: 2,
        isActive: false // Se crea inactivo esperando confirmación
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoUsuario)
        });

        if (response.ok) {
            // MENSAJE IMPORTANTE: Revisar correo
            mostrarPopup(
                "¡Registro Recibido!", 
                `<div class="text-center">
                    <i class="bi bi-envelope-paper-heart text-primary" style="font-size:3rem;"></i>
                    <p class="mt-2 lead">Hemos enviado un correo a <b>${email}</b>.</p>
                    <p>Por favor, haz clic en el enlace de ese correo para activar tu cuenta.</p>
                </div>`, 
                "success"
            );
            
            // Limpiar formulario
            document.getElementById('registerForm').reset();
            
        } else {
            const errorTxt = await response.text();
            mostrarPopup("Error", errorTxt, "error");
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