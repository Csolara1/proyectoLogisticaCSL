// js/auth.js - VERSIÓN FINAL INTEGRADA

// URL de la API (Asegúrate que coincide con tu app.js)
// const API_BASE_URL = "http://localhost:8080/api"; 

// ==========================================
// 1. LOGIN MANUAL (Tu código original intacto)
// ==========================================
async function procesarLogin() {
    const btnLogin = document.querySelector('button[type="submit"]');
    if(btnLogin) btnLogin.disabled = true;

    const email = document.getElementById('usuario').value;
    const pass = document.getElementById('contraseña').value;

    if (!email || !pass) {
        if(btnLogin) btnLogin.disabled = false;
        return mostrarPopup("Error", "Faltan datos", "error");
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail: email, userPassword: pass })
        });

        if (response.ok) {
            const data = await response.json();

            // CASO 1: REQUIERE 2FA
            if (data.status === "2FA_REQUIRED") {
                pedirCodigo2FA(data.userId); 
                return; 
            }

            // CASO 2: LOGIN NORMAL
            localStorage.setItem('usuario_csl', JSON.stringify(data));
            mostrarPopup("¡Bienvenido!", "Acceso concedido.", "success");
            
            // --- CAMBIO: TODOS AL DASHBOARD ---
            setTimeout(() => { 
                window.location.href = 'admin_dashboard.html'; 
            }, 1500);

        } else {
            const txt = await response.text();
            mostrarPopup("Error", txt || "Credenciales incorrectas", "error");
        }
    } catch (error) {
        console.error("Fallo en login:", error);
        mostrarPopup("Error de conexión", "No se pudo contactar con el servidor. Verifica que el backend está encendido.", "error");
    } finally {
        if(btnLogin) btnLogin.disabled = false;
    }
}

// ==========================================
// 2. FUNCIONES 2FA (Tu código original intacto)
// ==========================================
function pedirCodigo2FA(userId) {
    cerrarModalesYBackdrop(); 

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
            errorDiv.innerText = mensajeError;
            errorDiv.classList.remove('d-none');
            codeInput.value = ""; 
            
            if (res.status === 423) {
                btn.disabled = true;
                codeInput.disabled = true;
                setTimeout(() => {
                    cerrarModalesYBackdrop();
                    window.location.reload(); 
                }, 3000);
            }
        }
    } catch (e) {
        mostrarPopup("Error", "Error de conexión en 2FA", "error");
    }
}

function cerrarModalesYBackdrop() {
    const modales = document.querySelectorAll('.modal.show');
    modales.forEach(m => {
        // Intentamos usar la instancia de Bootstrap si existe, sino ocultamos a mano
        try {
            const instance = bootstrap.Modal.getInstance(m);
            if (instance) instance.hide();
        } catch(e) {
            m.classList.remove('show');
            m.style.display = 'none';
        }
    });
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(b => b.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}

// ==========================================
// 3. REGISTRO (Tu código original intacto)
// ==========================================
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

    const regexMovilES = /^(\+34|0034|34)?[67]\d{8}$/;
    if (!regexMovilES.test(movil.replace(/\s/g, ''))) { 
        mostrarPopup("Formato Incorrecto", "El teléfono debe ser un móvil español válido.", "warning");
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
        isActive: false 
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoUsuario)
        });

        if (response.ok) {
            mostrarPopup(
                "¡Registro Recibido!", 
                `<div class="text-center">
                    <i class="bi bi-envelope-paper-heart text-primary" style="font-size:3rem;"></i>
                    <p class="mt-2 lead">Hemos enviado un correo a <b>${email}</b>.</p>
                    <p>Por favor, haz clic en el enlace de ese correo para activar tu cuenta.</p>
                </div>`, 
                "success"
            );
            document.getElementById('registerForm').reset();
        } else {
            const errorTxt = await response.text();
            mostrarPopup("Error en el registro", errorTxt, "error");
        }
    } catch (error) {
        console.error(error);
        mostrarPopup("Error", "Error de conexión al intentar registrarse.", "error");
    }
}

// ==========================================
// 4. RECUPERACIÓN (Tu código original intacto)
// ==========================================
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
        mostrarPopup("Error", "Error de conexión con el servidor.", "error");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// ==========================================
// 5. LOGIN CON GOOGLE (Aquí está el cambio clave)
// ==========================================
// Esta función captura el evento del botón de Google de tu HTML.
// No tocamos nada de arriba, solo añadimos esto al final.

// --- LOGIN CON GOOGLE ---
async function manejarLoginGoogle(response) {
    try {
        // Enviamos el token directamente al Backend
        const res = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });

        if (res.ok) {
            const data = await res.json();

            // 🛑 AQUÍ ESTÁ EL FIX: COMPROBAR EL TIPO DE RESPUESTA
            // Si el backend nos dice que es un usuario nuevo, NO logueamos.
            if (data.status === "NEW_USER_EMAIL_SENT") {
                mostrarPopup("¡Casi listo!", 
                    `<div class="text-center">
                        <i class="bi bi-envelope-paper text-primary" style="font-size:3rem;"></i>
                        <p class="mt-2">Es tu primera vez aquí.</p>
                        <p>Hemos enviado un correo a tu cuenta para que <b>completes tu perfil</b>.</p>
                    </div>`, 
                    "success"
                );
                return; // <--- IMPORTANTE: DETENER LA EJECUCIÓN AQUÍ
            }

            // Si llegamos aquí, es un Login Normal (data trae userId, fullName, etc.)
            localStorage.setItem('usuario_csl', JSON.stringify(data));
            
            mostrarPopup("¡Bienvenido!", `Hola de nuevo, ${data.fullName || 'Usuario'}`, "success");
            
            setTimeout(() => {
                window.location.href = 'admin_dashboard.html';
            }, 1500);

        } else {
            // Si el backend devuelve error (400, 401, etc.)
            const errorTxt = await res.text();
            
            if (errorTxt.includes("inactiva")) {
                mostrarPopup("Cuenta Inactiva", "Tu cuenta existe pero no has completado el registro. Revisa tu correo.", "warning");
            } else {
                mostrarPopup("Error de Acceso", "No se pudo iniciar sesión con Google.", "error");
            }
        }
    } catch (error) {
        console.error("Error Google:", error);
        mostrarPopup("Error", "Fallo de conexión con el servidor.", "error");
    }
}