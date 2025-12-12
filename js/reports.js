//

async function generarInforme() {
    const tipo = document.getElementById('tipo-informe').value;
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;

    if (!tipo) {
        mostrarPopup("Atención", "Por favor, selecciona un tipo de informe.", "warning");
        return;
    }

    try {
        let datos = [];
        let titulo = "";
        let cabeceras = [];

        if (tipo === 'PEDIDOS') {
            titulo = "Informe de Pedidos";
            cabeceras = [['ID', 'Cliente', 'Origen', 'Destino', 'Estado']];
            
            const response = await fetch(`${API_BASE_URL}/orders`);
            let orders = await response.json();

            if (fechaInicio || fechaFin) {
                // Lógica de filtrado (simplificada pues no tenemos fecha real en el objeto)
                // Aquí deberías filtrar por orders.createdAt si existiera
            }

            datos = orders.map(o => [o.id, o.clientName, o.origin, o.destination, o.status]);

        } else if (tipo === 'STOCK') {
            titulo = "Inventario de Almacén";
            cabeceras = [['Ref', 'Almacén', 'Cantidad', 'Unidad']];
            
            const response = await fetch(`${API_BASE_URL}/stock`);
            const stock = await response.json();
            datos = stock.map(s => [s.productReference, s.warehouse, s.quantity, s.unit]);

        } else if (tipo === 'USUARIOS') {
            titulo = "Listado de Usuarios";
            cabeceras = [['ID', 'Nombre', 'Email', 'Rol']];
            
            const response = await fetch(`${API_BASE_URL}/users`);
            const users = await response.json();
            datos = users.map(u => [u.userId, u.fullName, u.userEmail, u.roleId === 1 ? 'ADMIN' : 'USER']);
        }

        if (datos.length === 0) {
            mostrarPopup("Informe Vacío", "No hay datos para mostrar.", "warning");
            return;
        }

        // --- GENERAR PDF (Requisito) ---
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Título
        doc.setFontSize(18);
        doc.text(titulo, 14, 22);
        doc.setFontSize(11);
        doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, 30);

        // Tabla
        doc.autoTable({
            head: cabeceras,
            body: datos,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [94, 53, 177] } // Tu color morado corporativo
        });

        doc.save(`${titulo.replace(/\s+/g, '_')}.pdf`);
        mostrarPopup("¡Éxito!", "El informe PDF se ha descargado.", "success");

    } catch (error) {
        console.error(error);
        mostrarPopup("Error", "Error generando el informe.", "error");
    }
}