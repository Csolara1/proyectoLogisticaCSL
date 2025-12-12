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
            mostrarPopup("No encontrado", `No existe pedido con ID: <strong>${idPedido}</strong>`, "error");
        }
    } catch (error) {
        mostrarPopup("Error", "Error de conexión. Inténtalo más tarde.", "error");
        console.error(error);
    }
}

function generarPopupCentrado(pedido) {
    let estadoRaw = (pedido.status || '').toUpperCase().trim();
    let modoTransporte = (pedido.transportMode || '').toUpperCase();

    // 1. ICONOS DE SILUETA
    let iconClass = 'bi-truck'; // Por defecto camión
    if (modoTransporte.includes('MARITIMO') || modoTransporte.includes('BARCO')) iconClass = 'bi-tsunami';
    if (modoTransporte.includes('AEREO') || modoTransporte.includes('AVION')) iconClass = 'bi-airplane-fill';

    const iconoHTML = `<i class="bi ${iconClass}"></i>`;

    // 2. Definición de Pasos con Iconos
    const pasos = [
        { label: 'Registrado', icon: '<i class="bi bi-file-earmark-text"></i>' },
        { label: 'Preparación', icon: '<i class="bi bi-box-seam"></i>' },
        { label: 'Enviado', icon: iconoHTML },
        { label: 'Entregado', icon: '<i class="bi bi-house-check-fill"></i>' }
    ];

    // 3. Calcular Estado
    let pasoActual = 0;
    if (estadoRaw.includes('PROCESO') || estadoRaw.includes('PREPARACION')) pasoActual = 1;
    else if (estadoRaw.includes('ENVIADO') || estadoRaw.includes('TRANSITO') || estadoRaw.includes('RUTA')) pasoActual = 2;
    else if (estadoRaw.includes('ENTREGADO') || estadoRaw.includes('FINALIZADO')) pasoActual = 3;
    else if (estadoRaw.includes('CANCELADO')) pasoActual = -1;

    // 4. HTML Barra
    let timelineHTML = '';
    if (pasoActual === -1) {
        timelineHTML = `<div class="alert alert-danger text-center"><i class="bi bi-x-circle-fill"></i> Pedido <strong>CANCELADO</strong>.</div>`;
    } else {
        const pasosHTML = pasos.map((paso, index) => {
            const activeClass = index <= pasoActual ? 'active' : '';
            return `
                <div class="step-item ${activeClass}">
                    <div class="step-circle">${paso.icon}</div>
                    <div class="step-label">${paso.label}</div>
                </div>`;
        }).join('');

        const porcentaje = Math.min(pasoActual * 33, 100); 
        timelineHTML = `
            <div class="tracking-timeline-container">
                <div class="progress-track"><div class="progress-fill" style="width: ${porcentaje}%"></div></div>
                <div class="steps-wrapper">${pasosHTML}</div>
            </div>`;
    }

    // 5. Contenido Final
    const contenidoHTML = `
        <div class="tracking-result-card">
            <h4 class="text-primary mb-4 fw-bold">Estado del Envío</h4>
            ${timelineHTML}
            <div class="tracking-route-box mt-4">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="text-start">
                        <small class="text-muted d-block small">ORIGEN</small>
                        <strong class="text-dark fs-5">${pedido.origin}</strong>
                    </div>
                    <div class="fs-4 text-muted"><i class="bi bi-arrow-right"></i></div>
                    <div class="text-end">
                        <small class="text-muted d-block small">DESTINO</small>
                        <strong class="text-dark fs-5">${pedido.destination}</strong>
                    </div>
                </div>
                <div class="text-center mt-2">
                    <span class="badge bg-light text-dark border">
                        ${iconoHTML} Transporte ${modoTransporte || 'ESTÁNDAR'}
                    </span>
                </div>
            </div>
            <p class="text-muted mt-3 small text-center">
                ID: <strong>#${pedido.id}</strong> • Cliente: ${pedido.clientName}
            </p>
        </div>`;

    mostrarPopup(`Rastreo: #${pedido.id}`, "html", "info");
    const cuerpoModal = document.getElementById('modal-mensaje');
    if(cuerpoModal) {
        cuerpoModal.innerHTML = contenidoHTML;
        document.querySelector('.modal-dialog').classList.add('modal-lg');
    }
}