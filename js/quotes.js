//

// Asegúrate de que API_BASE_URL está definida (suele venir de app.js)
// Si no, descomenta la siguiente línea:
// const API_BASE_URL = "http://localhost:8080/api";

function calcularPrecio() {
    const modo = document.getElementById('transportMode').value;
    const peso = parseFloat(document.getElementById('weight').value);
    const box = document.getElementById('price-box');
    const priceText = document.getElementById('final-price');
    const details = document.getElementById('price-details');

    if (!peso || peso <= 0) {
        box.style.display = 'none';
        return;
    }

    let tarifaBase = 0;
    let multiplicador = 0;

    switch(modo) {
        case 'MARITIMO': tarifaBase = 50; multiplicador = 0.5; break; // Barato
        case 'TERRESTRE': tarifaBase = 20; multiplicador = 1.2; break; // Medio
        case 'AEREO': tarifaBase = 100; multiplicador = 5.0; break; // Caro
    }

    const precioFinal = tarifaBase + (peso * multiplicador);
    
    // Mostramos resultado
    box.style.display = 'block';
    priceText.innerText = precioFinal.toFixed(2) + " €";
    details.innerText = `${modo}: ${peso}kg x tarifa`;
}

async function enviarPresupuesto() {
    const email = document.getElementById('clientEmail').value;
    const modo = document.getElementById('transportMode').value;
    const peso = document.getElementById('weight').value;
    const precio = document.getElementById('final-price').innerText;
    const btn = document.querySelector('.cta-button');

    if (!email || !email.includes('@')) {
        mostrarPopup("Falta Email", "Por favor, introduce un correo válido para enviarte el presupuesto.", "warning");
        return;
    }
    if (!peso || peso <= 0) {
        mostrarPopup("Error", "Calcula el precio primero.", "error");
        return;
    }

    // Efecto de carga
    const txtOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/quotes/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                transporte: modo,
                peso: peso,
                precio: precio
            })
        });

        if (response.ok) {
            mostrarPopup(
                "¡Presupuesto Enviado!", 
                `<div class="text-center">
                    <i class="bi bi-send-check-fill text-success" style="font-size:3rem;"></i>
                    <p class="mt-2">Hemos enviado los detalles a <b>${email}</b>.</p>
                </div>`, 
                "success"
            );
            // Limpiar
            document.getElementById('clientEmail').value = '';
        } else {
            mostrarPopup("Error", "No se pudo enviar el correo.", "error");
        }

    } catch (e) {
        console.error(e);
        mostrarError("Error de conexión con el servidor.");
    } finally {
        btn.innerHTML = txtOriginal;
        btn.disabled = false;
    }
}