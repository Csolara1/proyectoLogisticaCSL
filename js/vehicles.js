// js/vehicles.js - VERSIÓN CORREGIDA

let vehiculosCargados = [];

async function cargarVehiculos() {
    const tablaID = 'tabla-cuerpo-vehiculos';
    // Eliminamos 'limpiarTabla' porque no existe
    const cuerpo = document.getElementById(tablaID);
    if(cuerpo) cuerpo.innerHTML = '<tr><td colspan="6" class="text-center">Cargando flota...</td></tr>';

    const btnAdd = document.querySelector('.add-button');
    if (btnAdd) btnAdd.style.display = esAdmin() ? 'block' : 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/vehicles`);
        
        if (!response.ok) throw new Error("Error al obtener vehículos");
        
        vehiculosCargados = await response.json();
        renderizarTabla(vehiculosCargados);
        configurarBuscador();

    } catch (error) { 
        console.error(error);
        if(cuerpo) cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error de conexión</td></tr>';
        mostrarPopup("Error", "No se pudo cargar la flota. " + error.message, "error"); 
    }
}

function renderizarTabla(lista) {
    const cuerpo = document.getElementById('tabla-cuerpo-vehiculos');
    if (!cuerpo) return;
    
    cuerpo.innerHTML = '';

    if (!lista || lista.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay vehículos registrados</td></tr>';
        return;
    }

    lista.forEach(v => {
        let botonesAccion = '';
        if (esAdmin()) {
            botonesAccion = `
                <button class="btn btn-sm btn-primary me-1" onclick="editarVehiculo(${v.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-danger" onclick="borrarVehiculo(${v.id})"><i class="bi bi-trash"></i></button>
            `;
        } else {
            botonesAccion = '<span class="text-muted"><i class="bi bi-lock-fill"></i></span>';
        }

        // Color del estado
        let badgeClass = 'bg-secondary';
        const st = (v.status || '').toLowerCase();
        if(st.includes('ruta') || st.includes('transito')) badgeClass = 'bg-success';
        if(st.includes('taller') || st.includes('averia')) badgeClass = 'bg-danger';
        if(st.includes('disponible') || st.includes('parado')) badgeClass = 'bg-primary';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${v.id}</td>
            <td><strong>${v.licensePlate}</strong> <br> <small class="text-muted">${v.model}</small></td>
            <td>${v.driverName || 'Sin asignar'}</td>
            <td><span class="badge ${badgeClass}">${v.status || 'Desconocido'}</span></td>
            <td>${v.capacityTn || 0} Tn</td>
            <td>${botonesAccion}</td>
        `;
        cuerpo.appendChild(row);
    });
}

function configurarBuscador() {
    const input = document.querySelector('.search-input');
    const btn = document.querySelector('.search-button');
    if(!input) return;

    const filtrar = () => {
        const texto = input.value.toLowerCase();
        const filtrados = vehiculosCargados.filter(v => 
            (v.licensePlate && v.licensePlate.toLowerCase().includes(texto)) || 
            (v.driverName && v.driverName.toLowerCase().includes(texto))
        );
        renderizarTabla(filtrados);
    };

    if(btn) btn.onclick = filtrar;
    input.addEventListener('keyup', filtrar);
}

function crearVehiculo() {
    if (!esAdmin()) return mostrarPopup("Acceso Denegado", "Solo administradores.", "error");

    mostrarFormulario("Nuevo Vehículo", [
        { label: "Matrícula", key: "licensePlate", placeholder: "Ej: 1234-BBB" },
        { label: "Modelo", key: "model", placeholder: "Ej: Volvo FH" },
        { label: "Conductor", key: "driverName", placeholder: "Nombre del conductor" },
        { label: "Capacidad (Tn)", key: "capacityTn", type: "number" },
        { label: "Estado", key: "status", type: "select", options: [
            {val:"Disponible", text:"Disponible"}, 
            {val:"En Ruta", text:"En Ruta"}, 
            {val:"En Taller", text:"En Taller"}
        ]}
    ], async (datos) => {
        if (!datos.licensePlate) return mostrarPopup("Error", "La matrícula es obligatoria", "error");
        
        datos.capacityTn = parseFloat(datos.capacityTn) || 0;

        try {
            const res = await fetch(`${API_BASE_URL}/vehicles`, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(datos) 
            });
            if(res.ok) { 
                mostrarPopup("Guardado", "Vehículo añadido a la flota.", "success"); 
                cargarVehiculos(); 
            } else {
                mostrarPopup("Error", "No se pudo guardar.", "error");
            }
        } catch(e) { 
            mostrarPopup("Error", "Fallo de conexión", "error"); 
        }
    });
}

function borrarVehiculo(id) {
    if (!esAdmin()) return mostrarPopup("Acceso Denegado", "No tienes permisos.", "error");
    
    const v = vehiculosCargados.find(x => x.id === id);
    if(!v) return;

    mostrarConfirmacionSegura("¿Borrar Vehículo?", `Vas a eliminar el vehículo <b>${v.licensePlate}</b>.`, v.licensePlate, async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/vehicles/${id}`, { method: 'DELETE' });
            if(response.ok) { 
                mostrarPopup("Eliminado", "Vehículo eliminado correctamente.", "success"); 
                cargarVehiculos(); 
            } else {
                mostrarPopup("Error", "No se pudo borrar.", "error");
            }
        } catch(e) { 
            mostrarPopup("Error", "Fallo de conexión", "error");
        }
    });
}

function editarVehiculo(id) {
    if (!esAdmin()) return;
    const v = vehiculosCargados.find(x => x.id === id);
    if(!v) return;

    mostrarFormulario("Editar Vehículo", [
        { label: "Matrícula", key: "licensePlate", value: v.licensePlate },
        { label: "Modelo", key: "model", value: v.model },
        { label: "Conductor", key: "driverName", value: v.driverName },
        { label: "Capacidad (Tn)", key: "capacityTn", type: "number", value: v.capacityTn },
        { label: "Estado", key: "status", type: "select", value: v.status, options: [
            {val:"Disponible", text:"Disponible"}, 
            {val:"En Ruta", text:"En Ruta"}, 
            {val:"En Taller", text:"En Taller"}
        ]}
    ], async (datos) => {
        datos.capacityTn = parseFloat(datos.capacityTn) || 0;
        try {
            const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, { 
                method: 'PUT', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(datos) 
            });
            if(res.ok) { 
                mostrarPopup("Actualizado", "Datos del vehículo guardados.", "success"); 
                cargarVehiculos(); 
            } else {
                mostrarPopup("Error", "No se pudo actualizar.", "error");
            }
        } catch(e) { 
            mostrarPopup("Error", "Fallo de conexión", "error"); 
        }
    });
}