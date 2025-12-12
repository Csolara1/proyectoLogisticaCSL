let vehiculosCargados = [];

async function cargarVehiculos() {
    const tablaID = 'tabla-cuerpo-vehiculos';
    limpiarTabla(tablaID);
    
    const btnAdd = document.querySelector('.add-button');
    if (btnAdd) btnAdd.style.display = esAdmin() ? 'block' : 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/vehicles`);
        if (!response.ok) throw new Error("Error API Vehículos");

        vehiculosCargados = await response.json();
        const cuerpo = document.getElementById(tablaID);

        if(vehiculosCargados.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="6" class="text-center">No hay vehículos</td></tr>';
            return;
        }

        vehiculosCargados.forEach(v => {
            let botonesAccion = '';
            if (esAdmin()) botonesAccion = `<button class="btn btn-sm btn-danger" onclick="borrarVehiculo(${v.id})"><i class="bi bi-trash-fill"></i> Borrar</button>`;
            else botonesAccion = '<span class="text-muted"><i class="bi bi-lock-fill"></i></span>';

            let nombreConductor = v.driverName;
            let tipoVehiculo = 'OTRO';
            if (nombreConductor && nombreConductor.includes('||')) {
                const partes = nombreConductor.split('||');
                nombreConductor = partes[0];
                tipoVehiculo = partes[1];
            }

            let iconoTipo = '<i class="bi bi-truck"></i>'; 
            if(tipoVehiculo === 'BARCO') iconoTipo = '<i class="bi bi-tsunami"></i>';
            if(tipoVehiculo === 'AVION') iconoTipo = '<i class="bi bi-airplane-fill"></i>';
            if(tipoVehiculo === 'FURGONETA') iconoTipo = '<i class="bi bi-car-front-fill"></i>';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="badge bg-dark">${v.licensePlate}</span></td>
                <td>${iconoTipo} ${tipoVehiculo}</td>
                <td>${nombreConductor}</td>
                <td>${v.status}</td>
                <td>${v.capacityTn} Tn</td>
                <td>${botonesAccion}</td>
            `;
            cuerpo.appendChild(row);
        });
    } catch (error) { mostrarError(error.message); }
}

function crearVehiculo() {
    if (!esAdmin()) return mostrarError("⛔ Acceso Denegado.");

    mostrarFormulario("Nuevo Vehículo", [
        { label: "Matrícula (0000AAA)", key: "licensePlate", maxLength: 7, placeholder: "1234ABC" },
        { label: "Tipo de Vehículo", key: "vehicleType", type: "select", options: [
            { val: "CAMION", text: "Camión" }, { val: "FURGONETA", text: "Furgoneta" },
            { val: "BARCO", text: "Barco / Buque" }, { val: "AVION", text: "Avión de Carga" }
        ]},
        { label: "Conductor", key: "driverName" },
        { label: "Capacidad (Tn)", key: "capacityTn", type: "number" },
        { label: "Estado", key: "status", type: "select", options: [
            {val:"DISPONIBLE", text:"Disponible"}, {val:"EN_RUTA", text:"En Ruta"}, {val:"TALLER", text:"En Taller"}
        ]}
    ], async (datos) => {
        if (!datos.licensePlate) return mostrarError("Matrícula obligatoria.");
        datos.licensePlate = datos.licensePlate.toUpperCase().trim();
        const patronMatricula = /^\d{4}[A-Z]{3}$/;
        if (!patronMatricula.test(datos.licensePlate)) {
            mostrarError("Formato inválido. Deben ser 4 números y 3 letras (Ej: 1234ABC).");
            return;
        }
        if(datos.driverName && datos.vehicleType) {
            datos.driverName = `${datos.driverName}||${datos.vehicleType}`;
        }
        delete datos.vehicleType;

        try {
            const res = await fetch(`${API_BASE_URL}/vehicles`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos) });
            if(res.ok) { mostrarPopup("Añadido", "Vehículo registrado correctamente.", "success"); cargarVehiculos(); }
            else mostrarError("Error registrando vehículo.");
        } catch(e) { mostrarError(e.message); }
    });
}

function borrarVehiculo(id) {
    if (!esAdmin()) return mostrarError("⛔ Acceso Denegado.");
    const vehiculo = vehiculosCargados.find(v => v.id === id);
    if (!vehiculo) return;

    mostrarConfirmacionSegura(
        "¿Dar de baja vehículo?",
        `Vas a eliminar el vehículo con matrícula <b>${vehiculo.licensePlate}</b>.`,
        vehiculo.licensePlate,
        async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/vehicles/${id}`, { method: 'DELETE' });
                if(response.ok) { mostrarPopup("Baja confirmada", "Vehículo eliminado.", "success"); cargarVehiculos(); }
                else mostrarError("Error al eliminar.");
            } catch(e) { mostrarError(e.message); }
        }
    );
}