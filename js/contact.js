async function enviarMensaje() {
    const nombre = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const asunto = document.getElementById('contactSubject').value;
    const mensaje = document.getElementById('contactMessage').value;
    const btn = document.getElementById('btn-send-contact');

    if (nombre.length < 2) {
        mostrarPopup("Error", "El nombre es demasiado corto.", "error");
        return;
    }
    if (!email.includes('@') || !email.includes('.')) {
        mostrarPopup("Error", "El email no parece válido.", "error");
        return;
    }

    const textoOriginal = btn.innerHTML;
    // ICONO DE CARGA
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Enviando...';
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;

        // ICONO EN EL POPUP
        mostrarPopup(
            "¡Mensaje Enviado!", 
            `<i class="bi bi-envelope-check-fill text-success" style="font-size: 2em;"></i><br><br>
            Gracias <b>${nombre}</b>. Hemos recibido tu consulta sobre "<b>${asunto}</b>".<br>Te contactaremos a ${email} lo antes posible.`, 
            "success"
        );

        document.getElementById('contactForm').reset();
    }, 1500);
}