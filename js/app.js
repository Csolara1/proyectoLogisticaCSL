//
const API_BASE_URL = '/api';

function obtenerUsuario() {
    return JSON.parse(localStorage.getItem('usuario_csl'));
}

function esAdmin() {
    const user = obtenerUsuario();
    return user && user.roleId === 1;
}

function cerrarModalesYBackdrop() {
    const modales = document.querySelectorAll('.modal.show');
    modales.forEach(m => {
        const instance = bootstrap.Modal.getInstance(m);
        if (instance) instance.hide();
    });
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(b => b.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
}

function mostrarPopup(titulo, mensaje, tipo = 'info') {

    cerrarModalesYBackdrop();

    let modalId = 'modal-universal';
    let modalHtml = document.getElementById(modalId);

    if (!modalHtml) {
        modalHtml = document.createElement('div');
        modalHtml.id = modalId;
        modalHtml.className = 'modal fade';
        modalHtml.setAttribute('tabindex', '-1');
        modalHtml.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="modal-titulo"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body"><p id="modal-mensaje"></p></div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Aceptar</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modalHtml);
    }

    document.getElementById('modal-titulo').innerText = titulo;
    const bodyMsg = document.getElementById('modal-mensaje');
    bodyMsg.innerHTML = mensaje; 

    const header = modalHtml.querySelector('.modal-header');
    header.className = 'modal-header ' + (tipo === 'error' ? 'bg-danger text-white' : tipo === 'success' ? 'bg-success text-white' : 'bg-primary text-white');

    const bootstrapModal = new bootstrap.Modal(modalHtml);
    bootstrapModal.show();
}

function mostrarConfirmacion(titulo, mensaje, accionConfirmada) {
    let modalId = 'modal-confirmacion';
    let antiguo = document.getElementById(modalId);
    if(antiguo) antiguo.remove();

    let modalHtml = document.createElement('div');
    modalHtml.id = modalId;
    modalHtml.className = 'modal fade';
    modalHtml.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-warning text-dark">
                    <h5 class="modal-title">${titulo}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body"><p>${mensaje}</p></div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" id="btn-confirmar-accion" class="btn btn-danger">Sí, Confirmar</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modalHtml);

    const bootstrapModal = new bootstrap.Modal(modalHtml);
    bootstrapModal.show();

    document.getElementById('btn-confirmar-accion').onclick = () => {
        accionConfirmada();
        bootstrapModal.hide();
    };
}

// --- CORRECCIÓN REQUISITO: Desplegables vacíos al inicio ---
function mostrarFormulario(titulo, campos, onGuardar) {
    let modalId = 'modal-formulario';
    let antiguo = document.getElementById(modalId);
    if(antiguo) antiguo.remove();

    let inputsHTML = campos.map(c => {
        if (c.type === 'select') {
            // Generamos las opciones normales
            let opcionesHtml = c.options.map(opt => 
                `<option value="${opt.val}" ${opt.val === c.value ? 'selected' : ''}>${opt.text}</option>`
            ).join('');
            
            // Si NO estamos editando (no hay valor previo), forzamos la opción vacía por defecto
            // Cumple con el requisito: "no deben tener ninguna opción seleccionada" [cite: 73]
            if (!c.value) {
                opcionesHtml = `<option value="" selected disabled>-- Seleccione una opción --</option>` + opcionesHtml;
            }

            return `<div class="mb-3">
                        <label class="form-label fw-bold">${c.label}</label>
                        <select id="input-${c.key}" class="form-select">${opcionesHtml}</select>
                    </div>`;
        } else {
            const maxLenAttr = c.maxLength ? `maxlength="${c.maxLength}"` : '';
            const placeAttr = c.placeholder ? `placeholder="${c.placeholder}"` : '';
            return `
                <div class="mb-3">
                    <label class="form-label fw-bold">${c.label}</label>
                    <input id="input-${c.key}" type="${c.type || 'text'}" class="form-control" value="${c.value || ''}" ${maxLenAttr} ${placeAttr}>
                </div>`;
        }
    }).join('');

    let modalHtml = document.createElement('div');
    modalHtml.id = modalId;
    modalHtml.className = 'modal fade';
    modalHtml.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">${titulo}</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body"><form id="form-dinamico">${inputsHTML}</form></div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" id="btn-guardar-modal" class="btn btn-success">Guardar</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modalHtml);

    const bootstrapModal = new bootstrap.Modal(modalHtml);
    bootstrapModal.show();

    document.getElementById('btn-guardar-modal').onclick = () => {
        const datos = {};
        let errorValidacion = false;

        campos.forEach(c => { 
            const val = document.getElementById(`input-${c.key}`).value;
            
            // Validación de desplegables obligatoria [cite: 75]
            if (c.type === 'select' && val === "") {
                errorValidacion = true;
                // Marco visual de error
                document.getElementById(`input-${c.key}`).classList.add('is-invalid');
            } else {
                datos[c.key] = val;
            }
        });

        if (errorValidacion) {
            mostrarPopup("Datos Incompletos", "Por favor, seleccione una opción válida en todos los desplegables.", "error");
            return;
        }

        onGuardar(datos);
        bootstrapModal.hide();
    };
}

function mostrarConfirmacionSegura(titulo, mensaje, palabraClave, accionConfirmada) {
    let modalId = 'modal-confirmacion-segura';
    let antiguo = document.getElementById(modalId);
    if(antiguo) antiguo.remove();

    let modalHtml = document.createElement('div');
    modalHtml.id = modalId;
    modalHtml.className = 'modal fade';
    modalHtml.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-danger">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title"><i class="bi bi-exclamation-triangle-fill"></i> ${titulo}</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>${mensaje}</p>
                    <p class="mb-1">Para confirmar, escribe: <strong>${palabraClave}</strong></p>
                    <input type="text" id="input-verificacion" class="form-control" placeholder="Escribe aquí..." autocomplete="off">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" id="btn-borrado-final" class="btn btn-danger" disabled><i class="bi bi-trash-fill"></i> Eliminar</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modalHtml);

    const bootstrapModal = new bootstrap.Modal(modalHtml);
    bootstrapModal.show();

    const input = document.getElementById('input-verificacion');
    const btn = document.getElementById('btn-borrado-final');
    input.addEventListener('input', () => {
        btn.disabled = (input.value !== palabraClave);
    });
    btn.onclick = () => {
        accionConfirmada();
        bootstrapModal.hide();
    };
}

function mostrarError(mensaje) { mostrarPopup("Error", mensaje, 'error'); }
function limpiarTabla(idTabla) { const t = document.getElementById(idTabla); if(t) t.innerHTML = ''; }
function logout() { localStorage.removeItem('usuario_csl'); window.location.href = 'login.html'; }
function verificarSesion() {
    const usuarioGuardado = localStorage.getItem('usuario_csl');
    if (!usuarioGuardado) { window.location.href = 'login.html'; }
    else {
        const usuario = JSON.parse(usuarioGuardado);
        const nombreSpan = document.getElementById('session-username');
        if (nombreSpan) nombreSpan.innerText = (usuario.roleId === 1 ? "Admin: " : "Usuario: ") + usuario.fullName;
    }
}

function aplicarPermisosVisuales() {
    // Si NO es administrador
    if (!esAdmin()) {
        // 1. Ocultar columnas de ID en las cabeceras de tabla
        const cabecerasId = document.querySelectorAll('.col-id');
        cabecerasId.forEach(th => th.style.display = 'none');

        // 2. Ocultar celdas de ID en las filas (Esto se llama después de cargar la tabla)
        // Lo gestionaremos en cada archivo JS específico (users.js, orders.js...) 
        // porque las filas se crean dinámicamente.
    }
}

// =============================================================
// 1. LOGIN CON GOOGLE (Flujo Inteligente con tu API)
// =============================================================
function manejarLoginGoogle(response) {
    try {
        const datosGoogle = decodificarJwt(response.credential);
        const emailGoogle = datosGoogle.email;

        // 1. Buscamos en LocalStorage si ya lo tenemos guardado
        let usuariosRegistrados = JSON.parse(localStorage.getItem('usuarios_csl')) || [];
        let usuarioEncontrado = usuariosRegistrados.find(u => u.email === emailGoogle);

        // --- A: YA EXISTE (Entrar directo) ---
        if (usuarioEncontrado) {
            console.log("Usuario recurrente. Login directo.");
            usuarioEncontrado.picture = datosGoogle.picture;
            localStorage.setItem('usuarios_csl', JSON.stringify(usuariosRegistrados));
            iniciarSesionYRedirigir(usuarioEncontrado);
        } 
        
        // --- B: NUEVO (Usamos tu API para enviar correo) ---
        else {
            console.log("Usuario nuevo. Iniciando flujo con API...");

            // Paso 1: Creamos el usuario en tu Base de Datos Local (pero INACTIVO)
            const nuevoUsuario = {
                id: Date.now(),
                email: emailGoogle,
                nombre: datosGoogle.given_name,
                fullName: datosGoogle.name,
                roleId: 2, 
                picture: datosGoogle.picture,
                origen: 'google',
                // Importante: Lo guardamos sin contraseña aún
            };
            usuariosRegistrados.push(nuevoUsuario);
            localStorage.setItem('usuarios_csl', JSON.stringify(usuariosRegistrados));

            // Paso 2: Llamamos a tu endpoint de "Forgot Password"
            // Esto enviará un correo real a su Gmail con un enlace seguro.
            enviarCorreoActivacion(emailGoogle);
        }

    } catch (error) {
        console.error("Error Google:", error);
        mostrarError("Error al procesar la solicitud.");
    }
}

// =============================================================
// 2. FUNCIÓN QUE LLAMA A TU API JAVA REAL
// =============================================================
async function enviarCorreoActivacion(emailDestino) {
    
    mostrarPopup("Procesando...", "Contactando con el servidor...", "info");

    try {
        // Usamos tu endpoint '/forgot-password' que ya existe y funciona
        const response = await fetch('http://localhost:8080/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: emailDestino })
        });

        if (response.ok) {
            mostrarPopup(
                "📧 Verificación Enviada", 
                `Hemos enviado un correo a <b>${emailDestino}</b>.<br>
                 Por favor, revisa tu bandeja de entrada y haz clic en el enlace para <b>crear tu contraseña</b> y activar la cuenta.`, 
                "success"
            );
        } else {
            // Si la API dice 404 es que el usuario no existe en la BD de Java.
            // En ese caso, primero tenemos que registrarlo "en silencio" en Java.
            if(response.status === 404) {
                registrarEnJavaYEnviarCorreo(emailDestino);
            } else {
                mostrarError("Error al enviar el correo. Código: " + response.status);
            }
        }

    } catch (error) {
        console.error(error);
        mostrarError("No se pudo conectar con la API (Backend apagado).");
    }
}

// =============================================================
// 3. REGISTRO SILENCIOSO EN JAVA (Para que funcione el correo)
// =============================================================
async function registrarEnJavaYEnviarCorreo(email) {
    // Como tu API '/forgot-password' exige que el usuario exista,
    // primero lo creamos con una contraseña temporal aleatoria.
    try {
        const passTemporal = Math.random().toString(36).slice(-8);
        
        const registroResponse = await fetch('http://localhost:8080/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: "Usuario Google", // Nombre temporal
                userEmail: email,
                userPassword: passTemporal, // Contraseña basura que luego cambiará
                mobilePhone: "000000000"
            })
        });

        if (registroResponse.ok) {
            // Ahora que ya existe en Java, pedimos el correo de recuperación
            // Esperamos 1 segundo para asegurar que la BD guardó el dato
            setTimeout(() => enviarCorreoActivacion(email), 1000);
        } else {
            console.error("Fallo al pre-registrar en Java");
        }
    } catch (e) {
        console.error("Error conexión Java:", e);
    }
}

// Mantén tu función iniciarSesionYRedirigir igual que antes
function iniciarSesionYRedirigir(usuario) {
    localStorage.setItem('usuario_csl', JSON.stringify(usuario));
    window.location.href = 'admin_dashboard.html';
}

// Función auxiliar para leer el token de Google (JWT)
function decodificarJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}