//
// URL de la API (Asegúrate que coincide con tu app.js)
// const API_BASE_URL = "http://localhost:8080/api"; // Ya suele estar en app.js

// --- LOGIN ---
async function procesarLogin() {
    const email = document.getElementById('usuario').value;
    const pass = document.getElementById('contraseña').value;

    if (!email || !pass) {
        mostrarPopup("Atención", "Por favor, rellena todos los campos.", "error");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail: email, userPassword: pass })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('usuario_csl', JSON.stringify(data));
            
            mostrarPopup("¡Bienvenido!", "Acceso concedido. Redirigiendo...", "success");
            setTimeout(() => { window.location.href = 'admin_dashboard.html'; }, 1500);
        } else {
            // Si el error es por cuenta inactiva (403), el backend mandará el mensaje
            const errorTxt = await response.text();
            mostrarPopup("Error de Acceso", errorTxt || "Usuario o contraseña incorrectos.", "error");
        }
    } catch (error) {
        console.error(error);
        mostrarError("Error de conexión con el servidor.");
    }
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