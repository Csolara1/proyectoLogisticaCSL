//

async function buscarTracking() {
    const inputId = document.getElementById('tracking-input');
    const idPedido = inputId.value.trim();

    if (!idPedido) {
        mostrarPopup("Falta información", "Por favor, introduce tu número de seguimiento.", "error");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${idPedido}`);

        if (response.ok) {
            const pedido = await response.json();
            generarPopupCentrado(pedido); 
        } else {
            mostrarPopup("No encontrado", `No existe ningún pedido con el número: <strong>${idPedido}</strong>`, "error");
        }

    } catch (error) {
        mostrarPopup("Error", "Hubo un problema de conexión. Inténtalo más tarde.", "error");
        console.error(error);
    }
}

function generarPopupCentrado(pedido) {
    // 1. Limpieza de datos (Normalización)
    // Convertimos el estado a mayúsculas para evitar errores de minúsculas/mayúsculas
    let estadoRaw = (pedido.status || '').toUpperCase().trim();
    let modoTransporte = (pedido.transportMode || '').toUpperCase();

    // 2. Icono dinámico del vehículo
    let iconoTransporte = '🚚'; 
    if (modoTransporte.includes('MARITIMO') || modoTransporte.includes('BARCO')) iconoTransporte = '🚢';
    if (modoTransporte.includes('AEREO') || modoTransporte.includes('AVION')) iconoTransporte = '✈️';

    // 3. Definición de los pasos visuales
    const pasos = [
        { label: 'Registrado', icon: '📝' },    // Paso 0
        { label: 'Preparación', icon: '🏭' },   // Paso 1
        { label: 'Enviado', icon: iconoTransporte }, // Paso 2
        { label: 'Entregado', icon: '🏠' }      // Paso 3
    ];

    // 4. LÓGICA INTELIGENTE DE ESTADO (Fuzzy Matching)
    // Detectamos en qué paso estamos buscando palabras clave
    let pasoActual = 0; // Por defecto: Registrado

    if (estadoRaw.includes('PROCESO') || estadoRaw.includes('PREPARACION')) {
        pasoActual = 1;
    } 
    else if (estadoRaw.includes('ENVIADO') || estadoRaw.includes('TRANSITO') || estadoRaw.includes('RUTA') || estadoRaw.includes('CAMINO')) {
        pasoActual = 2;
    } 
    else if (estadoRaw.includes('ENTREGADO') || estadoRaw.includes('FINALIZADO')) {
        pasoActual = 3;
    }
    else if (estadoRaw.includes('CANCELADO')) {
        pasoActual = -1;
    }

    // 5. Generar HTML de la barra
    let timelineHTML = '';
    
    if (pasoActual === -1) {
        timelineHTML = `<div class="alert alert-danger text-center">❌ Este pedido ha sido <strong>CANCELADO</strong>.</div>`;
    } else {
        const pasosHTML = pasos.map((paso, index) => {
            // Si el índice es menor o igual al paso actual, se marca como activo (verde)
            const activeClass = index <= pasoActual ? 'active' : '';
            return `
                <div class="step-item ${activeClass}">
                    <div class="step-circle">${paso.icon}</div>
                    <div class="step-label">${paso.label}</div>
                </div>
            `;
        }).join('');

        // Calculamos el ancho de la barra verde (0%, 33%, 66%, 100%)
        const porcentaje = Math.min(pasoActual * 33, 100); 
        
        timelineHTML = `
            <div class="tracking-timeline-container">
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${porcentaje}%"></div>
                </div>
                <div class="steps-wrapper">
                    ${pasosHTML}
                </div>
            </div>
        `;
    }

    // 6. Contenido Final
    const contenidoHTML = `
        <div class="tracking-result-card">
            <h4 class="text-primary mb-4" style="font-weight:bold;">Estado del Envío</h4>
            
            ${timelineHTML}

            <div class="tracking-route-box mt-4">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="text-start">
                        <small class="text-muted d-block" style="font-size:0.8rem;">ORIGEN</small>
                        <strong class="text-dark fs-5">${pedido.origin}</strong>
                    </div>
                    <div class="fs-2 text-muted">➝</div>
                    <div class="text-end">
                        <small class="text-muted d-block" style="font-size:0.8rem;">DESTINO</small>
                        <strong class="text-dark fs-5">${pedido.destination}</strong>
                    </div>
                </div>
                <div class="text-center mt-2">
                    <span class="badge bg-light text-dark border">
                        ${iconoTransporte} Transporte ${modoTransporte || 'ESTÁNDAR'}
                    </span>
                </div>
            </div>

            <p class="text-muted mt-3 small text-center">
                ID Pedido: <strong>#${pedido.id}</strong> • Cliente: ${pedido.clientName}
            </p>
        </div>
    `;

    mostrarPopup(`Rastreo: #${pedido.id}`, "html", "info");
    
    const cuerpoModal = document.getElementById('modal-mensaje');
    if(cuerpoModal) {
        cuerpoModal.innerHTML = contenidoHTML;
        document.querySelector('.modal-dialog').classList.add('modal-lg');
    }
}