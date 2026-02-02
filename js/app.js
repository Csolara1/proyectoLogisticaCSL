// js/app.js - VERSIÓN LOCALHOST CORREGIDA

// ⚠️ IMPORTANTE: Para local usamos la URL completa
const API_BASE_URL = 'http://localhost:8080/api'; 

document.addEventListener('DOMContentLoaded', () => {
    configurarMenuPorRol();
    verificarSesionEnPagina();
});

// --- GESTIÓN DE USUARIOS Y ROLES ---

function obtenerUsuario() {
    const userStr = localStorage.getItem('usuario_csl');
    return userStr ? JSON.parse(userStr) : null;
}

function esAdmin() {
    const user = obtenerUsuario();
    return user && user.roleId === 1;
}

function verificarSesionEnPagina() {
    const path = window.location.pathname;
    // Páginas públicas que no requieren login
    if (path.includes('login') || path.includes('register') || path.includes('forgot') || path.includes('index') || path.includes('contacto')) return;

    const usuario = obtenerUsuario();
    if (!usuario) {
        window.location.href = 'login.html';
    } else {
        const nombreSpan = document.getElementById('session-username');
        if (nombreSpan) {
            nombreSpan.innerText = (usuario.roleId === 1 ? "Admin: " : "Cliente: ") + usuario.fullName;
        }
    }
}

function configurarMenuPorRol() {
    const usuario = obtenerUsuario();
    if (!usuario) return;

    // Si es Cliente (Rol 2), ocultamos menús de gestión
    if (usuario.roleId !== 1) {
        const itemsProhibidos = [
            'nav-users', 'nav-stock', 'nav-rutas', 'nav-logs', 'nav-informes', 'btn-add-order'
        ];
        itemsProhibidos.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
}

function logout() {
    localStorage.removeItem('usuario_csl');
    window.location.href = 'login.html';
}

// --- POPUPS Y MODALES ---

function cerrarModalesYBackdrop() {
    document.querySelectorAll('.modal.show').forEach(m => {
        const instance = bootstrap.Modal.getInstance(m);
        if (instance) instance.hide();
    });
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
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
        modalHtml.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header text-white">
                        <h5 class="modal-title" id="modal-titulo"></h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body"><p id="modal-mensaje" class="mb-0"></p></div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Aceptar</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modalHtml);
    }

    document.getElementById('modal-titulo').innerText = titulo;
    document.getElementById('modal-mensaje').innerHTML = mensaje;
    
    const header = modalHtml.querySelector('.modal-header');
    header.className = 'modal-header text-white ' + 
        (tipo === 'error' ? 'bg-danger' : tipo === 'success' ? 'bg-success' : 'bg-primary');

    new bootstrap.Modal(modalHtml).show();
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
                    <p class="mb-1">Escribe: <strong>${palabraClave}</strong></p>
                    <input type="text" id="input-verificacion" class="form-control" autocomplete="off">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" id="btn-borrado-final" class="btn btn-danger" disabled>Confirmar</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modalHtml);
    const modal = new bootstrap.Modal(modalHtml);
    modal.show();

    const input = document.getElementById('input-verificacion');
    const btn = document.getElementById('btn-borrado-final');
    input.addEventListener('input', () => btn.disabled = (input.value !== palabraClave));
    btn.onclick = () => { accionConfirmada(); modal.hide(); };
}

function mostrarFormulario(titulo, campos, onGuardar) {
    let modalId = 'modal-formulario';
    let antiguo = document.getElementById(modalId);
    if(antiguo) antiguo.remove();

    let inputsHTML = campos.map(c => {
        if (c.type === 'select') {
            let opts = c.options.map(o => `<option value="${o.val}" ${o.val == c.value ? 'selected' : ''}>${o.text}</option>`).join('');
            if(!c.value) opts = `<option value="" selected disabled>-- Seleccione --</option>` + opts;
            return `<div class="mb-3"><label class="form-label fw-bold">${c.label}</label><select id="input-${c.key}" class="form-select">${opts}</select></div>`;
        }
        return `<div class="mb-3"><label class="form-label fw-bold">${c.label}</label><input id="input-${c.key}" type="${c.type||'text'}" class="form-control" value="${c.value||''}" placeholder="${c.placeholder||''}"></div>`;
    }).join('');

    let modalHtml = document.createElement('div');
    modalHtml.id = modalId;
    modalHtml.className = 'modal fade';
    modalHtml.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white"><h5 class="modal-title">${titulo}</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div>
                <div class="modal-body"><form>${inputsHTML}</form></div>
                <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button type="button" id="btn-guardar-modal" class="btn btn-success">Guardar</button></div>
            </div>
        </div>`;
    document.body.appendChild(modalHtml);
    const modal = new bootstrap.Modal(modalHtml);
    modal.show();

    document.getElementById('btn-guardar-modal').onclick = () => {
        const datos = {};
        let error = false;
        campos.forEach(c => {
            const el = document.getElementById(`input-${c.key}`);
            if(c.type === 'select' && el.value === "") { error=true; el.classList.add('is-invalid'); }
            datos[c.key] = el.value;
        });
        if(error) return mostrarPopup("Error", "Complete los campos obligatorios.", "error");
        onGuardar(datos);
        modal.hide();
    };
}

// --- LOGIN GOOGLE (CONECTADO AL BACKEND) ---

async function manejarLoginGoogle(response) {
    try {
        const datosGoogle = decodificarJwt(response.credential);
        const email = datosGoogle.email;

        // 1. Preguntar al Backend si existe
        const res = await fetch(`${API_BASE_URL}/users`);
        let existe = false;
        
        if (res.ok) {
            const usuarios = await res.json();
            const usuarioEncontrado = usuarios.find(u => u.userEmail === email || u.email === email);
            
            if (usuarioEncontrado) {
                // YA EXISTE -> Login directo
                localStorage.setItem('usuario_csl', JSON.stringify(usuarioEncontrado));
                window.location.href = 'admin_dashboard.html';
                existe = true;
            }
        }

        // 2. Si NO existe -> Registro automático
        if (!existe) {
            registrarEnJavaYEnviarCorreo(email, datosGoogle.name);
        }

    } catch (error) {
        console.error("Error Google:", error);
        mostrarPopup("Error", "Fallo de conexión con el servidor.", "error");
    }
}

async function registrarEnJavaYEnviarCorreo(email, nombre) {
    mostrarPopup("Procesando", "Creando cuenta...", "info");
    try {
        // Registro en API
        const passTemp = Math.random().toString(36).slice(-8) + "Aa1!";
        const nuevoUser = { fullName: nombre, userEmail: email, userPassword: passTemp, mobilePhone: "000000000", roleId: 2, isActive: true };
        
        const resReg = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(nuevoUser)
        });

        if (resReg.ok) {
            // Pedir correo de activación
            const resMail = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: email })
            });
            
            if (resMail.ok) {
                mostrarPopup("¡Bienvenido!", `Cuenta creada. Revisa tu correo <b>${email}</b> para poner tu contraseña.`, "success");
            } else {
                mostrarPopup("Aviso", "Cuenta creada, pero falló el envío del correo.", "warning");
            }
        } else {
            mostrarPopup("Error", "No se pudo registrar el usuario.", "error");
        }
    } catch(e) { console.error(e); }
}

function decodificarJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}