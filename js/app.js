//
const API_BASE_URL = "http://localhost:8080/api";

// --- UTILIDADES DE USUARIO Y ROL ---
function obtenerUsuario() {
    return JSON.parse(localStorage.getItem('usuario_csl'));
}

function esAdmin() {
    const user = obtenerUsuario();
    // Asumimos que roleId 1 es Administrador
    return user && user.roleId === 1;
}

// --- 1. POP-UP INFORMATIVO ---
function mostrarPopup(titulo, mensaje, tipo = 'info') {
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
    document.getElementById('modal-mensaje').innerText = mensaje;
    const header = modalHtml.querySelector('.modal-header');
    header.className = 'modal-header ' + (tipo === 'error' ? 'bg-danger text-white' : tipo === 'success' ? 'bg-success text-white' : 'bg-primary text-white');

    const bootstrapModal = new bootstrap.Modal(modalHtml);
    bootstrapModal.show();
}

// --- 2. POP-UP DE CONFIRMACIÓN SIMPLE ---
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

// --- 3. FORMULARIO MODAL (MEJORADO: Soporta maxLength y placeholder) ---
function mostrarFormulario(titulo, campos, onGuardar) {
    let modalId = 'modal-formulario';
    let antiguo = document.getElementById(modalId);
    if(antiguo) antiguo.remove();

    let inputsHTML = campos.map(c => {
        if (c.type === 'select') {
            let opcionesHtml = c.options.map(opt => 
                `<option value="${opt.val}" ${opt.val === c.value ? 'selected' : ''}>${opt.text}</option>`
            ).join('');
            return `<div class="mb-3"><label class="form-label fw-bold">${c.label}</label><select id="input-${c.key}" class="form-select">${opcionesHtml}</select></div>`;
        } else {
            // AQUI ESTA LA MEJORA: Leemos maxLength y placeholder
            const maxLenAttr = c.maxLength ? `maxlength="${c.maxLength}"` : '';
            const placeAttr = c.placeholder ? `placeholder="${c.placeholder}"` : '';
            
            return `
                <div class="mb-3">
                    <label class="form-label fw-bold">${c.label}</label>
                    <input id="input-${c.key}" 
                           type="${c.type || 'text'}" 
                           class="form-control" 
                           value="${c.value || ''}" 
                           ${maxLenAttr} 
                           ${placeAttr}>
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
        campos.forEach(c => { datos[c.key] = document.getElementById(`input-${c.key}`).value; });
        onGuardar(datos);
        bootstrapModal.hide();
    };
}

// --- 4. CONFIRMACIÓN SEGURA ---
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
                    <h5 class="modal-title">⚠️ ${titulo}</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>${mensaje}</p>
                    <p class="mb-1">Para confirmar, escribe: <strong>${palabraClave}</strong></p>
                    <input type="text" id="input-verificacion" class="form-control" placeholder="Escribe aquí..." autocomplete="off">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" id="btn-borrado-final" class="btn btn-danger" disabled>🗑️ Eliminar</button>
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

// --- HELPERS ---
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