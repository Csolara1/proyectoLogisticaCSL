async function enviarPresupuesto() {
    // Recoger datos del formulario
    const transportMode = document.getElementById('transportMode').value;
    const weight = document.getElementById('weight').value;
    
    // Podrías añadir más campos al HTML si quieres (email, origen, etc.)
    // De momento usamos un objeto básico compatible con tu Quote.java
    const quoteData = {
        transportMode: transportMode,
        weightKg: parseFloat(weight),
        isProcessed: false, // Por defecto pendiente
        contactName: "Cliente Web", // Puedes añadir un input para esto en el HTML
        contactEmail: "pendiente@web.com" // Puedes añadir un input para esto
    };

    if (!weight || weight <= 0) {
        mostrarError("Por favor, introduce un peso válido.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/quotes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quoteData)
        });

        if (response.ok) {
            mostrarPopup("Solicitud Recibida", "Hemos recibido tu solicitud. Te contactaremos pronto.", "success");
            document.getElementById('quoteForm').reset();
        } else {
            mostrarError("Error al enviar la solicitud.");
        }
    } catch (error) {
        mostrarError("Error de conexión: " + error.message);
    }
}