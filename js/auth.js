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
            // Guardamos al usuario en el navegador
            localStorage.setItem('usuario_csl', JSON.stringify(data));
            
            mostrarPopup("¡Bienvenido!", "Acceso concedido. Redirigiendo...", "success");
            
            // Esperar 1.5 segundos y redirigir
            setTimeout(() => {
                window.location.href = 'admin_dashboard.html';
            }, 1500);
        } else {
            mostrarPopup("Error de Acceso", "Usuario o contraseña incorrectos.", "error");
        }
    } catch (error) {
        console.error(error);
        mostrarError("Error de conexión con el servidor.");
    }
}

// --- REGISTRO ---
async function procesarRegistro() {
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    const phone = document.getElementById('reg-phone').value;

    if (!nombre || !email || !pass) {
        mostrarPopup("Faltan datos", "Nombre, Email y Contraseña son obligatorios.", "error");
        return;
    }

    const nuevoUsuario = {
        fullName: nombre,
        userEmail: email,
        userPassword: pass,
        mobilePhone: phone
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoUsuario)
        });

        if (response.ok) {
            mostrarPopup("¡Éxito!", "Usuario registrado correctamente. Ahora puedes iniciar sesión.", "success");
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            const errorTxt = await response.text();
            mostrarPopup("Error", errorTxt, "error");
        }
    } catch (error) {
        mostrarError("No se pudo completar el registro.");
    }
}