async function cargarVehiculos() {
    const tablaID = 'tabla-cuerpo-vehiculos';
    limpiarTabla(tablaID);
    
    try {
        const response = await fetch(`${API_BASE_URL}/vehicles`);
        if (!response.ok) throw new Error("Error conectando con API Vehículos");

        const vehiculos = await response.json();
        const cuerpo = document.getElementById(tablaID);

        if(vehiculos.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="5" class="text-center">No hay vehículos en la flota</td></tr>';
            return;
        }

        vehiculos.forEach(v => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="badge bg-dark">${v.licensePlate}</span></td>
                <td>${v.driverName}</td>
                <td>${v.status}</td>
                <td>${v.capacityTn} Tn</td>
                <td>
                   <button class="btn btn-sm btn-danger" onclick="borrarVehiculo(${v.id})">🗑️ Borrar</button>
                </td>
            `;
            cuerpo.appendChild(row);
        });
    } catch (error) {
        console.warn(error);
        mostrarError("Error cargando flota: " + error.message);
    }
}

function crearVehiculo() {
    mostrarFormulario("Nuevo Vehículo", [
        { label: "Matrícula", key: "licensePlate" },
        { label: "Nombre Conductor", key: "driverName" },
        { label: "Capacidad (Tn)", key: "capacityTn", type: "number" },
        { label: "Estado (DISPONIBLE/EN RUTA/TALLER)", key: "status" }
    ], async (datos) => {
        
        if (!datos.licensePlate) {
            mostrarError("La matrícula es obligatoria.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/vehicles`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(datos)
            });

            if(response.ok) {
                mostrarPopup("Vehículo Añadido", "La flota ha crecido correctamente.", "success");
                cargarVehiculos();
            } else {
                mostrarError("No se pudo registrar el vehículo.");
            }
        } catch(e) { mostrarError(e.message); }
    });
}

function borrarVehiculo(id) {
    mostrarConfirmacion(
        "¿Dar de baja vehículo?",
        `Vas a eliminar este vehículo de la flota (ID: ${id}).`,
        async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/vehicles/${id}`, { method: 'DELETE' });
                if(response.ok) {
                    mostrarPopup("Baja confirmada", "Vehículo eliminado correctamente.", "success");
                    cargarVehiculos();
                } else {
                    mostrarError("No se pudo eliminar el vehículo.");
                }
            } catch(e) { mostrarError(e.message); }
        }
    );
}