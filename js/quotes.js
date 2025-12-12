//

// --- TARIFAS CONFIGURABLES ---
const TARIFAS = {
    'MARITIMO': { base: 50, costeKg: 0.50, nombre: 'Marítimo' },
    'TERRESTRE': { base: 30, costeKg: 1.20, nombre: 'Terrestre' },
    'AEREO': { base: 100, costeKg: 8.50, nombre: 'Aéreo' }
};

// --- 1. FUNCIÓN DE CÁLCULO EN VIVO ---
function calcularPrecio() {
    const mode = document.getElementById('transportMode').value;
    const weight = parseFloat(document.getElementById('weight').value);
    const box = document.getElementById('price-box');
    const priceText = document.getElementById('final-price');
    const detailsText = document.getElementById('price-details');

    // Si no hay peso válido, ocultamos la caja
    if (!weight || weight <= 0) {
        box.style.display = 'none';
        return;
    }

    // Mostramos la caja
    box.style.display = 'block';

    // Cálculo matemático
    const tarifa = TARIFAS[mode];
    const costeTotal = tarifa.base + (weight * tarifa.costeKg);

    // Actualizamos el HTML (con 2 decimales)
    priceText.innerText = `${costeTotal.toFixed(2)} €`;
    detailsText.innerText = `Tarifa ${tarifa.nombre}: Base ${tarifa.base}€ + ${weight}kg x ${tarifa.costeKg}€/kg`;
}

// --- 2. FUNCIÓN DE ENVÍO A LA API ---
async function enviarPresupuesto() {
    // Recoger datos
    const transportMode = document.getElementById('transportMode').value;
    const weight = document.getElementById('weight').value;
    const email = document.getElementById('clientEmail').value;
    
    // Validaciones
    if (!weight || weight <= 0) {
        mostrarPopup("Faltan datos", "Por favor, introduce un peso válido.", "error");
        return;
    }
    if (!email || !email.includes('@')) {
        mostrarPopup("Faltan datos", "Necesitamos tu email para enviarte la oferta.", "error");
        return;
    }

    // Objeto para enviar al Backend (Java)
    const quoteData = {
        transportMode: transportMode,
        weightKg: parseFloat(weight),
        contactEmail: email, // <--- Nuevo campo importante
        isProcessed: false
    };

    try {
        const response = await fetch(`${API_BASE_URL}/quotes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quoteData)
        });

        if (response.ok) {
            // Éxito
            mostrarPopup("Solicitud Enviada", "¡Hemos recibido tu petición! Un agente revisará el precio estimado y te contactará a " + email, "success");
            
            // Limpiar formulario
            document.getElementById('quoteForm').reset();
            document.getElementById('price-box').style.display = 'none';
        } else {
            mostrarPopup("Error", "Hubo un problema al enviar la solicitud.", "error");
        }
    } catch (error) {
        mostrarPopup("Error de conexión", error.message, "error");
    }
}