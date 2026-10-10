document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

let selectedEmpleadoId = null;

function initApp() {
    bindSidebarNavigation();
    bindHeaderSearch();
    bindFilters();
    renderAll();
    loadSelects();
    setupModalCloseEvents();
    setCurrentDateDefaults();
}

function bindSidebarNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const menu = event.currentTarget.dataset.menu;
            showMenu(menu);
        });
    });

    document.getElementById('toggleSidebar').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('collapsed');
    });
}

function bindHeaderSearch() {
    const input = document.getElementById('headerSearch');
    input.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query) {
            renderEmpleados();
            return;
        }

        const empleados = getData('empleados');
        const filtered = empleados.filter(empleado => {
            const fullName = `${empleado.nombre} ${empleado.apellido}`.toLowerCase();
            return fullName.includes(query) || empleado.documento.includes(query) || empleado.codigo.toLowerCase().includes(query);
        });

        renderEmpleados(filtered);
    });
}

function bindFilters() {
    document.getElementById('filtroNombre').addEventListener('input', renderEmpleados);
    document.getElementById('filtroSector').addEventListener('change', renderEmpleados);
    document.getElementById('filtroGrupo').addEventListener('change', renderEmpleados);
    document.getElementById('filtroSectorGrupos').addEventListener('change', renderGrupos);
    document.getElementById('filtroCodigoBarras').addEventListener('input', renderCodigos);
    document.getElementById('filtroEmpleadoCodigo').addEventListener('change', renderCodigos);
    document.getElementById('busquedaSector').addEventListener('change', () => {
        cargarGruposEnSelect('busquedaGrupo', document.getElementById('busquedaSector').value);
    });
    document.getElementById('busquedaSector').addEventListener('change', realizarBusqueda);
}

function setCurrentDateDefaults() {
    const input = document.getElementById('empleadoFechaIngreso');
    if (input) {
        input.value = new Date().toISOString().split('T')[0];
    }
}

function showMenu(menuName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.toggle('active', section.id === menuName);
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        const link = item.querySelector('.nav-link');
        item.classList.toggle('active', link.dataset.menu === menuName);
    });

    const pageTitleMap = {
        dashboard: 'Dashboard',
        empleados: 'Gestión de Personal',
        sectores: 'Sectores',
        grupos: 'Grupos',
        codigos: 'Códigos de Barras',
        reportes: 'Reportes',
        busqueda: 'Búsqueda',
        configuracion: 'Configuración'
    };

    const titleElement = document.querySelector('.page-title');
    if (titleElement) titleElement.textContent = pageTitleMap[menuName] || 'Dashboard';

    if (menuName === 'empleados') renderEmpleados();
    if (menuName === 'sectores') renderSectores();
    if (menuName === 'grupos') renderGrupos();
    if (menuName === 'codigos') renderCodigos();
    if (menuName === 'reportes') renderReportes();
    if (menuName === 'busqueda') renderBusqueda();
}

function getData(key) {
    return window.db.getData(key);
}

function saveData(key, value) {
    window.db.saveData(key, value);
}

function getSectorById(id) {
    return getData('sectores').find(item => Number(item.id) === Number(id));
}

function getGrupoById(id) {
    return getData('grupos').find(item => Number(item.id) === Number(id));
}

function getEmpleadoById(id) {
    return getData('empleados').find(item => Number(item.id) === Number(id));
}

function getAllEmpleadosWithRelations() {
    const empleados = getData('empleados');
    const sectores = getData('sectores');
    const grupos = getData('grupos');

    return empleados.map(empleado => {
        const sector = sectores.find(s => Number(s.id) === Number(empleado.sectorId));
        const grupo = grupos.find(g => Number(g.id) === Number(empleado.grupoId));
        return { ...empleado, sectorNombre: sector ? sector.nombre : 'Sin sector', grupoNombre: grupo ? grupo.nombre : 'Sin grupo' };
    });
}

function renderAll() {
    renderDashboard();
    renderEmpleados();
    renderSectores();
    renderGrupos();
    renderCodigos();
    renderReportes();
    renderBusqueda();
    loadSelects();
}

function renderDashboard() {
    const empleados = getData('empleados');
    const sectores = getData('sectores');
    const grupos = getData('grupos');
    const codigos = getData('codigos');

    document.getElementById('totalEmpleados').textContent = empleados.length;
    document.getElementById('totalSectores').textContent = sectores.length;
    document.getElementById('totalGrupos').textContent = grupos.length;
    document.getElementById('totalCodigos').textContent = codigos.length;

    const ultimos = [...empleados].slice(-4).reverse();
    const contenedor = document.getElementById('ultimosEmpleados');
    if (!ultimos.length) {
        contenedor.innerHTML = '<p class="empty-state">No hay empleados registrados</p>';
        return;
    }

    contenedor.innerHTML = ultimos.map(emp => {
        const sector = getSectorById(emp.sectorId);
        return `
            <div class="list-item">
                <div>
                    <strong>${emp.nombre} ${emp.apellido}</strong>
                    <div class="list-meta">${sector ? sector.nombre : 'Sin sector'} · ${emp.cargo}</div>
                </div>
                <span class="status-badge ${emp.estado}">${emp.estado}</span>
            </div>
        `;
    }).join('');

    const porSector = sectores.map(sector => {
        const count = empleados.filter(emp => Number(emp.sectorId) === Number(sector.id)).length;
        return { nombre: sector.nombre, count };
    });

    const sectorContainer = document.getElementById('personalPorSector');
    sectorContainer.innerHTML = porSector.map(item => `
        <div class="list-item">
            <div>
                <strong>${item.nombre}</strong>
                <div class="list-meta">Integrantes</div>
            </div>
            <span class="status-badge activo">${item.count}</span>
        </div>
    `).join('');
}

function renderEmpleados(list = null) {
    const empleados = list || getAllEmpleadosWithRelations();
    const filtroNombre = document.getElementById('filtroNombre')?.value.toLowerCase() || '';
    const filtroSector = document.getElementById('filtroSector')?.value || '';
    const filtroGrupo = document.getElementById('filtroGrupo')?.value || '';

    const filtered = empleados.filter(emp => {
        const nombreCompleto = `${emp.nombre} ${emp.apellido}`.toLowerCase();
        const matchesNombre = !filtroNombre || nombreCompleto.includes(filtroNombre);
        const matchesSector = !filtroSector || String(emp.sectorId) === String(filtroSector);
        const matchesGrupo = !filtroGrupo || String(emp.grupoId) === String(filtroGrupo);
        return matchesNombre && matchesSector && matchesGrupo;
    });

    const tbody = document.getElementById('tbodyEmpleados');
    if (!tbody) return;

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay empleados registrados</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(emp => `
        <tr>
            <td>${emp.codigo || 'SIN-CÓDIGO'}</td>
            <td>${emp.nombre} ${emp.apellido}</td>
            <td>${emp.documento}</td>
            <td>${emp.sectorNombre}</td>
            <td>${emp.grupoNombre}</td>
            <td>${emp.cargo}</td>
            <td><span class="status-badge ${emp.estado}">${emp.estado}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="icon-action view" title="Ver" onclick="verPerfil(${emp.id})"><i class="fas fa-eye"></i></button>
                    <button class="icon-action edit" title="Editar" onclick="editarEmpleado(${emp.id})"><i class="fas fa-pencil-alt"></i></button>
                    <button class="icon-action delete" title="Eliminar" onclick="eliminarEmpleado(${emp.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderSectores() {
    const sectores = getData('sectores');
    const empleados = getData('empleados');
    const container = document.getElementById('sectoresGrid');
    if (!container) return;

    if (!sectores.length) {
        container.innerHTML = '<p class="empty-state">No hay sectores registrados</p>';
        return;
    }

    container.innerHTML = sectores.map(sector => {
        const count = empleados.filter(emp => Number(emp.sectorId) === Number(sector.id)).length;
        return `
            <div class="sector-card">
                <h3>${sector.nombre}</h3>
                <div class="sector-meta">Jefe: ${sector.jefe || 'No definido'}</div>
                <div class="sector-meta">Integrantes: ${count}</div>
                <p>${sector.descripcion || 'Sin descripción'}</p>
                <div class="sector-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editarSector(${sector.id})">Editar</button>
                    <button class="btn btn-sm btn-primary" onclick="verSector(${sector.id})">Ver</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderGrupos() {
    const grupos = getData('grupos');
    const sectores = getData('sectores');
    const empleados = getData('empleados');
    const filtroSector = document.getElementById('filtroSectorGrupos')?.value || '';

    const filtered = grupos.filter(grupo => !filtroSector || String(grupo.sectorId) === String(filtroSector));
    const tbody = document.getElementById('tbodyGrupos');
    if (!tbody) return;

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay grupos registrados</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(grupo => {
        const sector = sectores.find(s => Number(s.id) === Number(grupo.sectorId));
        const count = empleados.filter(emp => Number(emp.grupoId) === Number(grupo.id)).length;
        return `
            <tr>
                <td>${grupo.nombre}</td>
                <td>${sector ? sector.nombre : 'Sin sector'}</td>
                <td>${count}</td>
                <td>${grupo.responsable || 'No asignado'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-action view" title="Ver" onclick="verGrupo(${grupo.id})"><i class="fas fa-eye"></i></button>
                        <button class="icon-action edit" title="Editar" onclick="editarGrupo(${grupo.id})"><i class="fas fa-pencil-alt"></i></button>
                        <button class="icon-action delete" title="Eliminar" onclick="eliminarGrupo(${grupo.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderCodigos() {
    const codigos = getData('codigos');
    const empleados = getData('empleados');
    const filtroCodigo = document.getElementById('filtroCodigoBarras')?.value.toLowerCase() || '';
    const filtroEmpleado = document.getElementById('filtroEmpleadoCodigo')?.value || '';
    const container = document.getElementById('codigosGrid');
    if (!container) return;

    const filtered = codigos.filter(item => {
        const employee = empleados.find(e => Number(e.id) === Number(item.empleadoId));
        const matchesCodigo = !filtroCodigo || item.codigo.toLowerCase().includes(filtroCodigo);
        const matchesEmpleado = !filtroEmpleado || String(item.empleadoId) === String(filtroEmpleado);
        return matchesCodigo && matchesEmpleado;
    });

    if (!filtered.length) {
        container.innerHTML = '<p class="empty-state">No hay códigos de barras generados</p>';
        return;
    }

    container.innerHTML = filtered.map(item => {
        const empleado = empleados.find(e => Number(e.id) === Number(item.empleadoId));
        const codigo = item.codigo;
        return `
            <div class="codigo-card">
                <h3>${empleado ? `${empleado.nombre} ${empleado.apellido}` : 'Empleado no encontrado'}</h3>
                <div class="codigo-meta">Código: ${codigo}</div>
                <div class="codigo-meta">Tipo: ${item.tipo}</div>
                <div class="codigo-meta">Fecha: ${item.fecha}</div>
                <div class="codigo-actions">
                    <button class="btn btn-sm btn-primary" onclick="imprimirCodigo(${item.id})">Imprimir</button>
                    <button class="btn btn-sm btn-secondary" onclick="mostrarCodigo(${item.id})">Ver</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderReportes() {
    const empleados = getData('empleados');
    const activos = empleados.filter(e => e.estado === 'activo').length;
    const inactivos = empleados.filter(e => e.estado === 'inactivo').length;

    document.getElementById('reporteActivos').textContent = activos;
    document.getElementById('reporteInactivos').textContent = inactivos;
    document.getElementById('reportePorSector').textContent = `${Math.max(1, Math.round(activos / Math.max(1, getData('sectores').length)))}`;
    document.getElementById('reportePorGrupo').textContent = `${Math.max(1, Math.round(activos / Math.max(1, getData('grupos').length)))}`;
    document.getElementById('reporteIngresos').textContent = `${empleados.length * 2}`;

    const container = document.getElementById('estadisticasDiv');
    if (!container) return;

    const sectores = getData('sectores');
    const grupos = getData('grupos');
    const stats = [
        { label: 'Sectores', value: sectores.length },
        { label: 'Grupos', value: grupos.length },
        { label: 'Códigos', value: getData('codigos').length },
        { label: 'Empleados', value: empleados.length }
    ];

    container.innerHTML = stats.map(item => `
        <div class="estadistica-box">
            <h4>${item.label}</h4>
            <p>${item.value}</p>
        </div>
    `).join('');
}

function renderBusqueda() {
    const busquedaSector = document.getElementById('busquedaSector');
    const busquedaGrupo = document.getElementById('busquedaGrupo');

    if (busquedaSector) {
        const sectores = getData('sectores');
        const options = ['<option value="">-- Todos los Sectores --</option>'];
        sectores.forEach(sec => {
            options.push(`<option value="${sec.id}">${sec.nombre}</option>`);
        });
        busquedaSector.innerHTML = options.join('');
    }

    if (busquedaGrupo) {
        cargarGruposEnSelect('busquedaGrupo', busquedaSector?.value || '');
    }

    mostrarResultadosBusqueda();
}

function mostrarResultadosBusqueda(data = null) {
    const tbody = document.getElementById('tbodyBusqueda');
    if (!tbody) return;
    const resultados = data || getAllEmpleadosWithRelations();

    if (!resultados.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron resultados</td></tr>';
        return;
    }

    tbody.innerHTML = resultados.map(emp => `
        <tr>
            <td>${emp.codigo || 'SIN-CÓDIGO'}</td>
            <td>${emp.nombre} ${emp.apellido}</td>
            <td>${emp.documento}</td>
            <td>${emp.sectorNombre}</td>
            <td>${emp.grupoNombre}</td>
            <td>${emp.cargo}</td>
            <td><span class="status-badge ${emp.estado}">${emp.estado}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="icon-action view" title="Ver" onclick="verPerfil(${emp.id})"><i class="fas fa-eye"></i></button>
                    <button class="icon-action edit" title="Editar" onclick="editarEmpleado(${emp.id})"><i class="fas fa-pencil-alt"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function loadSelects() {
    cargarSectoresEnSelect('empleadoSector');
    cargarSectoresEnSelect('grupoSector');
    cargarSectoresEnSelect('filtroSector');
    cargarSectoresEnSelect('filtroSectorGrupos');
    cargarSectoresEnSelect('busquedaSector');
    cargarGruposEnSelect('empleadoGrupo', '');
    cargarGruposEnSelect('filtroGrupo', '');
    cargarGruposEnSelect('busquedaGrupo', '');
    cargarEmpleadosEnSelect('codigoEmpleado');
    cargarEmpleadosEnSelect('filtroEmpleadoCodigo');
}

function cargarSectoresEnSelect(id) {
    const select = document.getElementById(id);
    if (!select) return;

    const sectores = getData('sectores');
    const options = id.includes('filtro') || id.includes('busqueda') || id === 'empleadoSector' || id === 'grupoSector'
        ? ['<option value="">Seleccionar...</option>']
        : ['<option value="">-- Todos los Sectores --</option>'];

    sectores.forEach(sector => {
        options.push(`<option value="${sector.id}">${sector.nombre}</option>`);
    });
    select.innerHTML = options.join('');
}

function cargarGruposEnSelect(id, sectorId = '') {
    const select = document.getElementById(id);
    if (!select) return;

    const grupos = getData('grupos').filter(grupo => !sectorId || String(grupo.sectorId) === String(sectorId));
    const options = ['<option value="">Seleccionar...</option>'];
    grupos.forEach(grupo => {
        options.push(`<option value="${grupo.id}">${grupo.nombre}</option>`);
    });
    select.innerHTML = options.join('');
}

function cargarEmpleadosEnSelect(id) {
    const select = document.getElementById(id);
    if (!select) return;

    const empleados = getData('empleados');
    const options = ['<option value="">Seleccionar...</option>'];
    empleados.forEach(empleado => {
        options.push(`<option value="${empleado.id}">${empleado.nombre} ${empleado.apellido} (${empleado.codigo})</option>`);
    });
    select.innerHTML = options.join('');
}

function cargarGruposPorSector() {
    const sectorId = document.getElementById('empleadoSector').value;
    cargarGruposEnSelect('empleadoGrupo', sectorId);
}

function showFormEmpleado() {
    const modal = document.getElementById('modalEmpleado');
    modal.classList.add('show');
    document.getElementById('formEmpleado').reset();
    document.getElementById('empleadoEstado').value = 'activo';
    document.getElementById('empleadoFechaIngreso').value = new Date().toISOString().split('T')[0];
    cargarSectoresEnSelect('empleadoSector');
    cargarGruposEnSelect('empleadoGrupo', '');
}

function showFormSector() {
    const modal = document.getElementById('modalSector');
    modal.classList.add('show');
    document.getElementById('formSector').reset();
}

function showFormGrupo() {
    const modal = document.getElementById('modalGrupo');
    modal.classList.add('show');
    document.getElementById('formGrupo').reset();
    cargarSectoresEnSelect('grupoSector');
}

function showFormGenerarCodigo() {
    const modal = document.getElementById('modalCodigo');
    modal.classList.add('show');
    document.getElementById('formCodigo').reset();
    cargarEmpleadosEnSelect('codigoEmpleado');
    document.getElementById('previsualizacionCodigo').style.display = 'none';
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}

function setupModalCloseEvents() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
    });
}

function guardarEmpleado(event) {
    event.preventDefault();
    const empleados = getData('empleados');
    const id = document.getElementById('empleadoId')?.value;

    const nuevoEmpleado = {
        id: id ? Number(id) : window.db.nextId(empleados),
        nombre: document.getElementById('empleadoNombre').value.trim(),
        apellido: document.getElementById('empleadoApellido').value.trim(),
        documento: document.getElementById('empleadoDocumento').value.trim(),
        tipoDocumento: document.getElementById('empleadoTipoDoc').value,
        sectorId: document.getElementById('empleadoSector').value,
        grupoId: document.getElementById('empleadoGrupo').value,
        cargo: document.getElementById('empleadoCargo').value.trim(),
        fechaIngreso: document.getElementById('empleadoFechaIngreso').value,
        turno: document.getElementById('empleadoTurno').value,
        email: document.getElementById('empleadoEmail').value.trim(),
        telefono: document.getElementById('empleadoTelefono').value.trim(),
        estado: document.getElementById('empleadoEstado').value,
        observaciones: document.getElementById('empleadoObservaciones').value.trim(),
        codigo: id ? getEmpleadoById(Number(id)).codigo : window.db.generateEmployeeCode()
    };

    if (!nuevoEmpleado.nombre || !nuevoEmpleado.apellido || !nuevoEmpleado.documento || !nuevoEmpleado.sectorId || !nuevoEmpleado.grupoId || !nuevoEmpleado.cargo) {
        alert('Debe completar todos los campos obligatorios');
        return;
    }

    if (id) {
        const index = empleados.findIndex(emp => Number(emp.id) === Number(id));
        empleados[index] = nuevoEmpleado;
    } else {
        empleados.push(nuevoEmpleado);
        const codigos = getData('codigos');
        codigos.push({
            id: window.db.nextId(codigos),
            empleadoId: nuevoEmpleado.id,
            codigo: nuevoEmpleado.codigo,
            tipo: 'code128',
            fecha: new Date().toISOString().split('T')[0]
        });
        saveData('codigos', codigos);
    }

    saveData('empleados', empleados);
    renderAll();
    cerrarModal('modalEmpleado');
    document.getElementById('formEmpleado').reset();
    alert('Empleado guardado correctamente');
}

function guardarSector(event) {
    event.preventDefault();
    const sectores = getData('sectores');
    const nuevoSector = {
        id: window.db.nextId(sectores),
        nombre: document.getElementById('sectorNombre').value.trim(),
        descripcion: document.getElementById('sectorDescripcion').value.trim(),
        jefe: document.getElementById('sectorJefe').value.trim()
    };

    if (!nuevoSector.nombre) {
        alert('El nombre del sector es obligatorio');
        return;
    }

    sectores.push(nuevoSector);
    saveData('sectores', sectores);
    renderAll();
    cerrarModal('modalSector');
    document.getElementById('formSector').reset();
    alert('Sector registrado correctamente');
}

function guardarGrupo(event) {
    event.preventDefault();
    const grupos = getData('grupos');
    const nuevoGrupo = {
        id: window.db.nextId(grupos),
        nombre: document.getElementById('grupoNombre').value.trim(),
        sectorId: document.getElementById('grupoSector').value,
        responsable: document.getElementById('grupoResponsable').value.trim(),
        descripcion: document.getElementById('grupoDescripcion').value.trim()
    };

    if (!nuevoGrupo.nombre || !nuevoGrupo.sectorId) {
        alert('Debe completar nombre y sector');
        return;
    }

    grupos.push(nuevoGrupo);
    saveData('grupos', grupos);
    renderAll();
    cerrarModal('modalGrupo');
    document.getElementById('formGrupo').reset();
    alert('Grupo registrado correctamente');
}

function generarCodigoBarras(event) {
    event.preventDefault();
    const empleadoId = document.getElementById('codigoEmpleado').value;
    const tipo = document.getElementById('codigoTipo').value;

    if (!empleadoId) {
        alert('Debe seleccionar un empleado');
        return;
    }

    const empleado = getEmpleadoById(Number(empleadoId));
    const codigos = getData('codigos');
    const codigo = empleado.codigo;
    const existe = codigos.some(item => Number(item.empleadoId) === Number(empleadoId));

    if (!existe) {
        codigos.push({
            id: window.db.nextId(codigos),
            empleadoId: Number(empleadoId),
            codigo,
            tipo,
            fecha: new Date().toISOString().split('T')[0]
        });
        saveData('codigos', codigos);
    }

    const svg = document.getElementById('barcode');
    const previsualizacion = document.getElementById('previsualizacionCodigo');
    previsualizacion.style.display = 'block';

    try {
        JsBarcode(svg, codigo, {
            format: tipo === 'qr' ? 'CODE128' : 'CODE128',
            width: 2,
            height: 60,
            displayValue: true,
            margin: 10
        });
    } catch (error) {
        console.error(error);
        svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle">Código no disponible</text>';
    }

    renderAll();
    alert(`Código generado para ${empleado.nombre} ${empleado.apellido}`);
}

function verPerfil(id) {
    const empleado = getEmpleadoById(id);
    if (!empleado) return;

    const sector = getSectorById(empleado.sectorId);
    const grupo = getGrupoById(empleado.grupoId);
    const perfilContent = document.getElementById('perfilContent');

    perfilContent.innerHTML = `
        <div class="perfil-header">
            <div class="perfil-avatar">${empleado.nombre.charAt(0)}${empleado.apellido.charAt(0)}</div>
            <div>
                <h3>${empleado.nombre} ${empleado.apellido}</h3>
                <p class="nota-baja">${empleado.cargo}</p>
            </div>
        </div>
        <div class="profile-stats">
            <div class="profile-stat"><label>Código</label><strong>${empleado.codigo}</strong></div>
            <div class="profile-stat"><label>Documento</label><strong>${empleado.documento}</strong></div>
            <div class="profile-stat"><label>Sector</label><strong>${sector ? sector.nombre : 'Sin sector'}</strong></div>
            <div class="profile-stat"><label>Grupo</label><strong>${grupo ? grupo.nombre : 'Sin grupo'}</strong></div>
            <div class="profile-stat"><label>Turno</label><strong>${empleado.turno || 'No definido'}</strong></div>
            <div class="profile-stat"><label>Estado</label><strong>${empleado.estado}</strong></div>
            <div class="profile-stat"><label>Correo</label><strong>${empleado.email || 'No registrado'}</strong></div>
            <div class="profile-stat"><label>Teléfono</label><strong>${empleado.telefono || 'No registrado'}</strong></div>
            <div class="profile-stat"><label>Fecha Ingreso</label><strong>${empleado.fechaIngreso || 'No registrada'}</strong></div>
            <div class="profile-stat"><label>Observaciones</label><strong>${empleado.observaciones || 'Sin observaciones'}</strong></div>
        </div>
    `;

    document.getElementById('modalPerfil').classList.add('show');
}

function editarEmpleado(id) {
    const empleado = getEmpleadoById(id);
    if (!empleado) return;

    showFormEmpleado();
    document.getElementById('empleadoNombre').value = empleado.nombre;
    document.getElementById('empleadoApellido').value = empleado.apellido;
    document.getElementById('empleadoDocumento').value = empleado.documento;
    document.getElementById('empleadoTipoDoc').value = empleado.tipoDocumento || 'Cédula';
    document.getElementById('empleadoSector').value = empleado.sectorId;
    cargarGruposPorSector();
    setTimeout(() => {
        document.getElementById('empleadoGrupo').value = empleado.grupoId;
    }, 100);
    document.getElementById('empleadoCargo').value = empleado.cargo;
    document.getElementById('empleadoFechaIngreso').value = empleado.fechaIngreso;
    document.getElementById('empleadoTurno').value = empleado.turno;
    document.getElementById('empleadoEmail').value = empleado.email || '';
    document.getElementById('empleadoTelefono').value = empleado.telefono || '';
    document.getElementById('empleadoEstado').value = empleado.estado || 'activo';
    document.getElementById('empleadoObservaciones').value = empleado.observaciones || '';

    const hiddenId = document.getElementById('empleadoId');
    if (!hiddenId) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.id = 'empleadoId';
        document.getElementById('formEmpleado').appendChild(input);
    }
    document.getElementById('empleadoId').value = empleado.id;
}

function editarSector(id) {
    const sector = getData('sectores').find(item => Number(item.id) === Number(id));
    if (!sector) return;

    showFormSector();
    document.getElementById('sectorNombre').value = sector.nombre;
    document.getElementById('sectorDescripcion').value = sector.descripcion || '';
    document.getElementById('sectorJefe').value = sector.jefe || '';
    document.getElementById('formSector').dataset.editarId = sector.id;
}

function editarGrupo(id) {
    const grupo = getData('grupos').find(item => Number(item.id) === Number(id));
    if (!grupo) return;

    showFormGrupo();
    document.getElementById('grupoNombre').value = grupo.nombre;
    document.getElementById('grupoResponsable').value = grupo.responsable || '';
    document.getElementById('grupoDescripcion').value = grupo.descripcion || '';
    document.getElementById('grupoSector').value = grupo.sectorId;
    document.getElementById('formGrupo').dataset.editarId = grupo.id;
}

function eliminarEmpleado(id) {
    if (!confirm('¿Desea eliminar este empleado?')) return;
    const empleados = getData('empleados').filter(item => Number(item.id) !== Number(id));
    saveData('empleados', empleados);
    const codigos = getData('codigos').filter(item => Number(item.empleadoId) !== Number(id));
    saveData('codigos', codigos);
    renderAll();
}

function eliminarGrupo(id) {
    const grupos = getData('grupos').filter(item => Number(item.id) !== Number(id));
    saveData('grupos', grupos);
    renderAll();
}

function verSector(id) {
    const sector = getData('sectores').find(item => Number(item.id) === Number(id));
    const empleados = getData('empleados').filter(item => Number(item.sectorId) === Number(id));
    if (!sector) return;
    alert(`Sector: ${sector.nombre}\nIntegrantes: ${empleados.length}\nJefe: ${sector.jefe || 'No asignado'}`);
}

function verGrupo(id) {
    const grupo = getData('grupos').find(item => Number(item.id) === Number(id));
    const empleados = getData('empleados').filter(item => Number(item.grupoId) === Number(id));
    if (!grupo) return;
    alert(`Grupo: ${grupo.nombre}\nIntegrantes: ${empleados.length}\nResponsable: ${grupo.responsable || 'No asignado'}`);
}

function limpiarFiltros() {
    document.getElementById('filtroNombre').value = '';
    document.getElementById('filtroSector').value = '';
    document.getElementById('filtroGrupo').value = '';
    renderEmpleados();
}

function limpiarFiltrosCodigos() {
    document.getElementById('filtroCodigoBarras').value = '';
    document.getElementById('filtroEmpleadoCodigo').value = '';
    renderCodigos();
}

function realizarBusqueda() {
    const nombre = document.getElementById('busquedaNombre').value.trim().toLowerCase();
    const documento = document.getElementById('busquedaDocumento').value.trim().toLowerCase();
    const codigo = document.getElementById('busquedaCodigo').value.trim().toLowerCase();
    const sector = document.getElementById('busquedaSector').value;
    const grupo = document.getElementById('busquedaGrupo').value;
    const estado = document.getElementById('busquedaEstado').value;

    let filtered = getAllEmpleadosWithRelations();

    if (nombre) {
        filtered = filtered.filter(emp => `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(nombre));
    }
    if (documento) {
        filtered = filtered.filter(emp => emp.documento.toLowerCase().includes(documento));
    }
    if (codigo) {
        filtered = filtered.filter(emp => (emp.codigo || '').toLowerCase().includes(codigo));
    }
    if (sector) {
        filtered = filtered.filter(emp => String(emp.sectorId) === String(sector));
    }
    if (grupo) {
        filtered = filtered.filter(emp => String(emp.grupoId) === String(grupo));
    }
    if (estado) {
        filtered = filtered.filter(emp => emp.estado === estado);
    }

    mostrarResultadosBusqueda(filtered);
}

function limpiarBusqueda() {
    document.getElementById('busquedaNombre').value = '';
    document.getElementById('busquedaDocumento').value = '';
    document.getElementById('busquedaCodigo').value = '';
    document.getElementById('busquedaSector').value = '';
    document.getElementById('busquedaGrupo').value = '';
    document.getElementById('busquedaEstado').value = '';
    mostrarResultadosBusqueda(getAllEmpleadosWithRelations());
}

function imprimirCodigo(id) {
    const codigo = getData('codigos').find(item => Number(item.id) === Number(id));
    if (!codigo) return;

    const empleado = getEmpleadoById(codigo.empleadoId);
    const contenedor = document.getElementById('contenidoImprimir');
    contenedor.innerHTML = `
        <div class="codigo-imprimir">
            <h3>${empleado ? `${empleado.nombre} ${empleado.apellido}` : 'Empleado'}</h3>
            <svg id="barcode-print"></svg>
            <p><strong>Código:</strong> ${codigo.codigo}</p>
            <p><strong>Sector:</strong> ${getSectorById(empleado.sectorId)?.nombre || 'Sin sector'}</p>
        </div>
    `;

    const svg = document.getElementById('barcode-print');
    JsBarcode(svg, codigo.codigo, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true,
        margin: 10
    });

    document.getElementById('modalImprimir').classList.add('show');
}

function mostrarCodigo(id) {
    const codigo = getData('codigos').find(item => Number(item.id) === Number(id));
    if (!codigo) return;

    const empleado = getEmpleadoById(codigo.empleadoId);
    const contenedor = document.getElementById('contenidoImprimir');
    contenedor.innerHTML = `
        <div class="codigo-imprimir">
            <h3>${empleado ? `${empleado.nombre} ${empleado.apellido}` : 'Empleado'}</h3>
            <svg id="barcode-view"></svg>
            <p><strong>Código:</strong> ${codigo.codigo}</p>
        </div>
    `;

    const svg = document.getElementById('barcode-view');
    JsBarcode(svg, codigo.codigo, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true,
        margin: 10
    });

    document.getElementById('modalImprimir').classList.add('show');
}

function generarReporte(tipo) {
    const empleados = getData('empleados');
    const data = empleados.map(emp => [emp.codigo, emp.nombre, emp.apellido, emp.cargo, emp.estado]).join('\n');
    const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_${tipo}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    alert(`Reporte ${tipo} generado correctamente`);
}

function logout() {
    alert('Sesión cerrada correctamente.');
}

function mostrarGestionUsuarios() {
    alert('Gestión de usuarios disponible en la versión avanzada del sistema.');
}

function realizarBackup() {
    const data = {
        sectores: getData('sectores'),
        grupos: getData('grupos'),
        empleados: getData('empleados'),
        codigos: getData('codigos')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'backup_rrhh.json';
    link.click();
    URL.revokeObjectURL(url);
    alert('Copia de seguridad descargada correctamente');
}

window.showMenu = showMenu;
window.showFormEmpleado = showFormEmpleado;
window.showFormSector = showFormSector;
window.showFormGrupo = showFormGrupo;
window.showFormGenerarCodigo = showFormGenerarCodigo;
window.cerrarModal = cerrarModal;
window.guardarEmpleado = guardarEmpleado;
window.guardarSector = guardarSector;
window.guardarGrupo = guardarGrupo;
window.generarCodigoBarras = generarCodigoBarras;
window.verPerfil = verPerfil;
window.editarEmpleado = editarEmpleado;
window.editarSector = editarSector;
window.editarGrupo = editarGrupo;
window.eliminarEmpleado = eliminarEmpleado;
window.eliminarGrupo = eliminarGrupo;
window.verSector = verSector;
window.verGrupo = verGrupo;
window.limpiarFiltros = limpiarFiltros;
window.limpiarFiltrosCodigos = limpiarFiltrosCodigos;
window.realizarBusqueda = realizarBusqueda;
window.limpiarBusqueda = limpiarBusqueda;
window.generarReporte = generarReporte;
window.logout = logout;
window.realizarBackup = realizarBackup;
window.mostrarGestionUsuarios = mostrarGestionUsuarios;
window.imprimirCodigo = imprimirCodigo;
window.mostrarCodigo = mostrarCodigo;
window.cargarGruposPorSector = cargarGruposPorSector;
