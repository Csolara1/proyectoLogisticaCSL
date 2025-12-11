//
let vehiculosCargados = [];

async function cargarVehiculos() {
    const tablaID = 'tabla-cuerpo-vehiculos';
    limpiarTabla(tablaID);
    
    // Ocultar botón añadir si no es admin
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
            if (esAdmin()) {
                botonesAccion = `<button class="btn btn-sm btn-danger" onclick="borrarVehiculo(${v.id})">🗑️ Borrar</button>`;
            } else {
                botonesAccion = '<span class="text-muted">🔒</span>';
            }

            // --- TRUCO: RECUPERAR TIPO ---
            // Separamos el nombre del tipo (están unidos por "||")
            let nombreConductor = v.driverName;
            let tipoVehiculo = 'OTRO'; // Por defecto

            if (nombreConductor && nombreConductor.includes('||')) {
                const partes = nombreConductor.split('||');
                nombreConductor = partes[0]; // La parte izquierda es el nombre
                tipoVehiculo = partes[1];    // La parte derecha es el tipo
            }

            // Iconos estéticos
            let iconoTipo = '🚚'; 
            if(tipoVehiculo === 'BARCO') iconoTipo = '🚢';
            if(tipoVehiculo === 'AVION') iconoTipo = '✈️';
            if(tipoVehiculo === 'FURGONETA') iconoTipo = '🚐';

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
        // 1. Matrícula (Max 7 caracteres)
        { 
            label: "Matrícula (0000AAA)", 
            key: "licensePlate", 
            maxLength: 7, 
            placeholder: "1234ABC" 
        },
        // 2. Tipo de Vehículo
        {
            label: "Tipo de Vehículo",
            key: "vehicleType",
            type: "select",
            options: [
                { val: "CAMION", text: "Camión" },
                { val: "FURGONETA", text: "Furgoneta" },
                { val: "BARCO", text: "Barco / Buque" },
                { val: "AVION", text: "Avión de Carga" }
            ]
        },
        // 3. Resto de campos
        { label: "Conductor", key: "driverName" },
        { label: "Capacidad (Tn)", key: "capacityTn", type: "number" },
        { 
            label: "Estado", 
            key: "status", 
            type: "select", 
            options: [
                {val:"DISPONIBLE", text:"Disponible"},
                {val:"EN_RUTA", text:"En Ruta"},
                {val:"TALLER", text:"En Taller"}
            ] 
        }
    ], async (datos) => {
        if (!datos.licensePlate) return mostrarError("Matrícula obligatoria.");
        
        datos.licensePlate = datos.licensePlate.toUpperCase().trim();

        // Validación Lógica
        const patronMatricula = /^\d{4}[A-Z]{3}$/;
        if (!patronMatricula.test(datos.licensePlate)) {
            mostrarError("Formato inválido. Deben ser 4 números y 3 letras (Ej: 1234ABC).");
            return;
        }

        // --- TRUCO: GUARDAR TIPO ---
        // Pegamos el tipo al nombre del conductor para que la API lo guarde
        if(datos.driverName && datos.vehicleType) {
            datos.driverName = `${datos.driverName}||${datos.vehicleType}`;
        }
        // Borramos el campo extra para no confundir a la API
        delete datos.vehicleType;

        try {
            const res = await fetch(`${API_BASE_URL}/vehicles`, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos)
            });
            if(res.ok) { 
                mostrarPopup("Añadido", "Vehículo registrado correctamente.", "success"); 
                cargarVehiculos(); 
            }
            else {
                mostrarError("Error registrando vehículo.");
            }
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