const API_BASE_URL = "http://localhost:8080/api";

// --- 1. POP-UP INFORMATIVO (Sustituye a alert) ---
function mostrarPopup(titulo, mensaje, tipo = 'info') {
    let modalId = 'modal-universal';
    let modalHtml = document.getElementById(modalId);

    // Si no existe, lo creamos
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

    // Configurar contenido
    document.getElementById('modal-titulo').innerText = titulo;
    document.getElementById('modal-mensaje').innerText = mensaje;

    // Color del encabezado
    const header = modalHtml.querySelector('.modal-header');
    header.className = 'modal-header ' + (tipo === 'error' ? 'bg-danger text-white' : tipo === 'success' ? 'bg-success text-white' : 'bg-primary text-white');

    const bootstrapModal = new bootstrap.Modal(modalHtml);
    bootstrapModal.show();
}

// --- 2. POP-UP DE CONFIRMACIÓN (Sustituye a confirm) ---
function mostrarConfirmacion(titulo, mensaje, accionConfirmada) {
    let modalId = 'modal-confirmacion';
    // Eliminamos el anterior si existe para evitar conflictos de eventos
    let antiguo = document.getElementById(modalId);
    if(antiguo) antiguo.remove();

    let modalHtml = document.createElement('div');
    modalHtml.id = modalId;
    modalHtml.className = 'modal fade';
    modalHtml.setAttribute('tabindex', '-1');
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

    // Configurar el botón "Sí"
    document.getElementById('btn-confirmar-accion').onclick = () => {
        accionConfirmada();
        bootstrapModal.hide();
    };
}

// --- 3. FORMULARIO MODAL (Para Crear/Editar) ---
function mostrarFormulario(titulo, campos, onGuardar) {
    let modalId = 'modal-formulario';
    let antiguo = document.getElementById(modalId);
    if(antiguo) antiguo.remove();

    let inputsHTML = campos.map(c => `
        <div class="mb-3">
            <label class="form-label fw-bold">${c.label}</label>
            <input id="input-${c.key}" type="${c.type || 'text'}" class="form-control" value="${c.value || ''}">
        </div>
    `).join('');

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
                <div class="modal-body">
                    <form id="form-dinamico">${inputsHTML}</form>
                </div>
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
        campos.forEach(c => {
            datos[c.key] = document.getElementById(`input-${c.key}`).value;
        });
        onGuardar(datos);
        bootstrapModal.hide();
    };
}

function mostrarError(mensaje) {
    mostrarPopup("Error", mensaje, 'error');
}

function limpiarTabla(idTabla) {
    const tabla = document.getElementById(idTabla);
    if(tabla) tabla.innerHTML = '';
}

function logout() {
    localStorage.removeItem('usuario_csl');
    window.location.href = 'login.html';
}

function verificarSesion() {
    const usuarioGuardado = localStorage.getItem('usuario_csl');
    
    if (!usuarioGuardado) {
        // Si no hay usuario, patada al login
        window.location.href = 'login.html';
    } else {
        // Si hay usuario, ponemos su nombre en la barra superior
        const usuario = JSON.parse(usuarioGuardado);
        const nombreSpan = document.getElementById('session-username');
        if (nombreSpan) {
            nombreSpan.innerText = "Hola, " + usuario.fullName;
        }
    }
}