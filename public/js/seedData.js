/**
 * TopBank | Ontop Dark Fintech - Datos Iniciales y Fórmula Matemática de Score (350 - 750)
 * Configurado para la carpeta de Google Drive: 1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39
 */

// Función matemática determinista: calcula el Score entre 350 y 750 según Monto Solicitado + Ingresos Mensuales
window.calculateMathematicalScore = function (ingresosMensuales, montoSolicitado) {
  const ingresos = Number(ingresosMensuales) || 0;
  const monto = Number(montoSolicitado) || 0;

  if (ingresos <= 0 || monto <= 0) {
    return 350;
  }

  const ingresoAnual = ingresos * 12;
  // Relación de cobertura anual frente al monto solicitado
  const ratioCobertura = ingresoAnual / monto;

  // Componente 1 (hasta 260 pts): Capacidad de pago según relación Ingreso Anual / Monto Solicitado
  const puntosCapacidad = 260 * (ratioCobertura / (ratioCobertura + 1));

  // Componente 2 (hasta 140 pts): Solidez de flujo mensual (escala hasta $10,000 USD/mes)
  const puntosFlujo = 140 * Math.min(1, ingresos / 10000);

  const rawScore = Math.round(350 + puntosCapacidad + puntosFlujo);
  return Math.max(350, Math.min(750, rawScore));
};

window.USER_DRIVE_FOLDER_ID = '1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39';
window.USER_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/u/0/folders/1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39';

window.TOPBANK_SEED_DATA = {
  lenders: [
    {
      id: 'LND-01',
      nombre: 'Ontop Global Credit Bridge',
      tipo: 'Fintech B2B/B2C & Contratistas Globales',
      pais: 'EE. UU. / Global (Delaware LLC)',
      perfilesAceptados: [
        'Contratista Internacional / No Residente',
        'Residente EE. UU. / Ciudadano',
        'Migrante en EE. UU. (Con ITIN)'
      ],
      tasaApr: '8.90% - 14.50% APR',
      montoMinimo: 5000,
      montoMaximo: 150000,
      ficoMinimo: '550+ (Score Matemático TopBank)',
      productos: ['Capital de Trabajo / Negocio', 'Vehículo / Auto', 'Educación / Salud / Libre Inversión'],
      contactoEjecutivo: 'partners@ontopcredit.io'
    },
    {
      id: 'LND-02',
      nombre: 'Quontic Bank (CDFI ITIN Mortgage)',
      tipo: 'Banco Federal CDFI EE. UU.',
      pais: 'Estados Unidos (NY / FL / TX / CA)',
      perfilesAceptados: [
        'Residente EE. UU. / Ciudadano',
        'Migrante en EE. UU. (Con ITIN)',
        'Contratista Internacional / No Residente'
      ],
      tasaApr: '6.75% - 8.40% APR',
      montoMinimo: 100000,
      montoMaximo: 1250000,
      ficoMinimo: '600+ (Score Matemático TopBank)',
      productos: ['Compra de Vivienda / Hipotecario', 'Capital de Trabajo / Negocio'],
      contactoEjecutivo: 'underwriting@quonticloans.us'
    },
    {
      id: 'LND-03',
      nombre: 'Stilt & Nova Credit Migrant FinTech',
      tipo: 'Lender Especializado en Migrantes y Visas',
      pais: 'Estados Unidos (42 Estados)',
      perfilesAceptados: [
        'Migrante en EE. UU. (Con ITIN)',
        'Migrante en EE. UU. (En trámite)',
        'Residente EE. UU. / Ciudadano'
      ],
      tasaApr: '10.25% - 16.90% APR',
      montoMinimo: 3000,
      montoMaximo: 65000,
      ficoMinimo: '420+ (Score Matemático TopBank)',
      productos: ['Vehículo / Auto', 'Consolidación de Deuda', 'Educación / Salud / Libre Inversión'],
      contactoEjecutivo: 'originations@stiltcredit.com'
    },
    {
      id: 'LND-04',
      nombre: 'SoFi & LendingClub US Prime',
      tipo: 'Banca Digital & Préstamos Personales Prime',
      pais: 'Estados Unidos (Nacional)',
      perfilesAceptados: ['Residente EE. UU. / Ciudadano'],
      tasaApr: '7.49% - 13.20% APR',
      montoMinimo: 10000,
      montoMaximo: 100000,
      ficoMinimo: '650+ (Score Matemático TopBank)',
      productos: ['Consolidación de Deuda', 'Compra de Vivienda / Hipotecario', 'Vehículo / Auto'],
      contactoEjecutivo: 'prime@sofilending.com'
    },
    {
      id: 'LND-05',
      nombre: 'CrossBorder Capital Miami LLC',
      tipo: 'Fondo Privado Inmobiliario & Comercial',
      pais: 'EE. UU. (Florida / Texas) & LATAM',
      perfilesAceptados: [
        'Contratista Internacional / No Residente',
        'Migrante en EE. UU. (Con ITIN)',
        'Residente EE. UU. / Ciudadano'
      ],
      tasaApr: '7.90% - 11.50% APR',
      montoMinimo: 50000,
      montoMaximo: 850000,
      ficoMinimo: '540+ (Score Matemático TopBank)',
      productos: ['Compra de Vivienda / Hipotecario', 'Capital de Trabajo / Negocio'],
      contactoEjecutivo: 'deals@crossbordermiami.com'
    }
  ],

  clients: [
    {
      id: 'EXP-2026-101',
      nombres: 'Mateo Alejandro',
      apellidos: 'Vargas Restrepo',
      email: 'mateo.vargas@techglobal.io',
      telefono: '+1 (305) 842-9910',
      fechaNacimiento: '1991-04-18',
      perfilMigratorio: 'Contratista Internacional / No Residente',
      tipoId: 'Pasaporte',
      numeroId: 'PE8849201',
      residencia: 'Miami, FL (Brickell)',
      lugarTrabajo: 'TechGlobal Cloud Solutions LLC',
      funcionesTrabajo: 'Arquitecto de Software Cloud y Líder Técnico de Infraestructura',
      ingresosMensuales: 11800,
      fuenteIngresos: 'Cuenta bancaria EEUU',
      scoreCredito: window.calculateMathematicalScore(11800, 85000),
      montoSolicitado: 85000,
      propositoPrestamo: 'Capital de Trabajo / Negocio',
      entidadFinanciera: 'Ontop Global Credit Bridge',
      estadoProceso: '4. Pre-Aprobado',
      adjuntos: [
        { name: 'KYC_Pasaporte_MateoVargas.pdf', size: 428100, type: 'application/pdf', category: 'KYC' },
        { name: 'Extractos_Cuenta_EEUU_6Meses.pdf', size: 912400, type: 'application/pdf', category: 'Extractos' }
      ],
      notasConsultor: 'Ingresos recurrentes en Cuenta bancaria EEUU por $11,800 USD/mes. Score matemático validado automáticamente.',
      fechaCreacion: '2026-11-02 09:30',
      fechaActualizacion: '2026-11-14 00:45'
    },
    {
      id: 'EXP-2026-102',
      nombres: 'Valeria Sofía',
      apellidos: 'Mendoza Castellanos',
      email: 'valeria.mendoza@uslogistics.com',
      telefono: '+1 (786) 519-3304',
      fechaNacimiento: '1988-09-12',
      perfilMigratorio: 'Migrante en EE. UU. (Con ITIN)',
      tipoId: 'ITIN',
      numeroId: '942-88-1904',
      residencia: 'Orlando, Florida, EE. UU.',
      lugarTrabajo: 'US Sunbelt Logistics Corp',
      funcionesTrabajo: 'Coordinadora de Operaciones de Transporte y Despacho Internacional',
      ingresosMensuales: 9400,
      fuenteIngresos: 'Cuenta bancaria EEUU',
      scoreCredito: window.calculateMathematicalScore(9400, 310000),
      montoSolicitado: 310000,
      propositoPrestamo: 'Compra de Vivienda / Hipotecario',
      entidadFinanciera: 'Quontic Bank (CDFI ITIN Mortgage)',
      estadoProceso: '3. En Estudio por Entidad (Underwriting)',
      adjuntos: [
        { name: 'Carta_Asignacion_ITIN_IRS.pdf', size: 320000, type: 'application/pdf', category: 'KYC' },
        { name: 'Bank_of_America_12M_Statements.pdf', size: 1580000, type: 'application/pdf', category: 'Extractos Banco' }
      ],
      notasConsultor: 'Expediente hipotecario ITIN con Down Payment del 20% disponible en cuenta bancaria EE. UU.',
      fechaCreacion: '2026-11-04 11:15',
      fechaActualizacion: '2026-11-14 00:45'
    },
    {
      id: 'EXP-2026-103',
      nombres: 'Sebastián Andrés',
      apellidos: 'Herrera Duarte',
      email: 'sherrera@fintechstudio.co',
      telefono: '+1 (512) 904-7721',
      fechaNacimiento: '1994-12-03',
      perfilMigratorio: 'Residente EE. UU. / Ciudadano',
      tipoId: 'SSN',
      numeroId: '459-71-8820',
      residencia: 'Austin, Texas, EE. UU.',
      lugarTrabajo: 'Austin FinTech Studio Inc.',
      funcionesTrabajo: 'Director de Producto Financiero y Estrategia B2B',
      ingresosMensuales: 14500,
      fuenteIngresos: 'Cuenta bancaria EEUU',
      scoreCredito: window.calculateMathematicalScore(14500, 62000),
      montoSolicitado: 62000,
      propositoPrestamo: 'Consolidación de Deuda',
      entidadFinanciera: 'SoFi & LendingClub US Prime',
      estadoProceso: '5. Aprobado y Desembolsado',
      adjuntos: [
        { name: 'Driver_License_Texas_SH.pdf', size: 280000, type: 'application/pdf', category: 'KYC' },
        { name: 'Pagare_Desembolso_Firmado.pdf', size: 490000, type: 'application/pdf', category: 'Contrato' }
      ],
      notasConsultor: 'Desembolso ACH completado exitosamente tras validación de ingresos y score matemático.',
      fechaCreacion: '2026-10-28 14:20',
      fechaActualizacion: '2026-11-14 00:45'
    },
    {
      id: 'EXP-2026-104',
      nombres: 'Camila Fernanda',
      apellidos: 'Rojas Pineda',
      email: 'camila.rojas@designremote.net',
      telefono: '+1 (646) 338-1129',
      fechaNacimiento: '1996-06-25',
      perfilMigratorio: 'Migrante en EE. UU. (En trámite)',
      tipoId: 'Licencia EE. UU.',
      numeroId: 'NY-774829104',
      residencia: 'Queens, New York, EE. UU.',
      lugarTrabajo: 'Manhattan Hospitality & Catering Group',
      funcionesTrabajo: 'Supervisora de Eventos Corporativos y Atención al Cliente',
      ingresosMensuales: 6200,
      fuenteIngresos: 'Kash',
      scoreCredito: window.calculateMathematicalScore(6200, 28500),
      montoSolicitado: 28500,
      propositoPrestamo: 'Vehículo / Auto',
      entidadFinanciera: 'Stilt & Nova Credit Migrant FinTech',
      estadoProceso: '2. Recolección Documental',
      adjuntos: [
        { name: 'EAD_Permiso_Trabajo_USCIS.pdf', size: 390000, type: 'application/pdf', category: 'KYC' }
      ],
      notasConsultor: 'Recibe pagos verificables vía Kash. En recolección de cotización del vehículo.',
      fechaCreacion: '2026-11-08 16:00',
      fechaActualizacion: '2026-11-14 00:45'
    },
    {
      id: 'EXP-2026-105',
      nombres: 'Diego Fernando',
      apellidos: 'Salazar Monroy',
      email: 'diego.salazar@cloudarchitects.dev',
      telefono: '+1 (786) 402-1933',
      fechaNacimiento: '1989-02-14',
      perfilMigratorio: 'Contratista Internacional / No Residente',
      tipoId: 'Pasaporte',
      numeroId: 'MX99381726',
      residencia: 'Doral, Florida / CDMX',
      lugarTrabajo: 'Salazar Remodeling & Construction LLC',
      funcionesTrabajo: 'Contratista General de Obra Civil y Remodelación Residencial',
      ingresosMensuales: 9800,
      fuenteIngresos: 'Cheque',
      scoreCredito: window.calculateMathematicalScore(9800, 145000),
      montoSolicitado: 145000,
      propositoPrestamo: 'Compra de Vivienda / Hipotecario',
      entidadFinanciera: 'CrossBorder Capital Miami LLC',
      estadoProceso: '1. Captura Inicial',
      adjuntos: [
        { name: 'Pasaporte_Vigente_DiegoSalazar.pdf', size: 350000, type: 'application/pdf', category: 'KYC' }
      ],
      notasConsultor: 'Pagos recibidos mediante Cheque empresarial en Florida. Cita inicial agendada.',
      fechaCreacion: '2026-11-11 10:10',
      fechaActualizacion: '2026-11-14 00:45'
    },
    {
      id: 'EXP-2026-106',
      nombres: 'Javier Eduardo',
      apellidos: 'Paredes Silva',
      email: 'jparedes.builds@gmail.com',
      telefono: '+1 (832) 771-4092',
      fechaNacimiento: '1985-11-29',
      perfilMigratorio: 'Migrante en EE. UU. (Con ITIN)',
      tipoId: 'ITIN',
      numeroId: '918-45-3029',
      residencia: 'Houston, Texas, EE. UU.',
      lugarTrabajo: 'Texas Gulf Roofing & Services',
      funcionesTrabajo: 'Maestro de Obra e Instalación de Techos Industriales',
      ingresosMensuales: 5100,
      fuenteIngresos: 'Remesas',
      scoreCredito: window.calculateMathematicalScore(5100, 45000),
      montoSolicitado: 45000,
      propositoPrestamo: 'Capital de Trabajo / Negocio',
      entidadFinanciera: 'Stilt & Nova Credit Migrant FinTech',
      estadoProceso: '6. Rechazado / En Corrección',
      adjuntos: [
        { name: 'ITIN_Letter_JavierParedes.pdf', size: 295000, type: 'application/pdf', category: 'KYC' }
      ],
      notasConsultor: 'Flujos respaldados en comprobantes de Remesas. En plan de bancarización de 60 días.',
      fechaCreacion: '2026-11-01 08:45',
      fechaActualizacion: '2026-11-14 00:45'
    }
  ],

  appointments: [
    {
      id: 'CIT-301',
      clienteId: 'EXP-2026-101',
      clienteNombre: 'Mateo Alejandro Vargas Restrepo',
      fecha: '2026-11-15',
      hora: '10:30',
      canal: 'Google Meet / Ontop Concierge',
      consultor: 'Dra. Elena Vance (Senior Underwriter)',
      tema: 'Firma de Condiciones de Pre-Aprobación ($85,000 USD)',
      estado: 'Confirmada',
      notas: 'Revisar cronograma de pagos y cuenta bancaria EE. UU.'
    },
    {
      id: 'CIT-302',
      clienteId: 'EXP-2026-102',
      clienteNombre: 'Valeria Sofía Mendoza Castellanos',
      fecha: '2026-11-16',
      hora: '14:00',
      canal: 'Zoom Ejecutivo',
      consultor: 'Carlos Andrés Rueda (Director Hipotecario)',
      tema: 'Revisión de Appraisal & Cierre Hipotecario ITIN Quontic',
      estado: 'Confirmada',
      notas: 'Validar seguro de propiedad en Orlando y fondos de cierre.'
    }
  ],

  appsScriptTemplate: `/**
 * GOOGLE APPS SCRIPT (Code.gs) - CONECTOR AUTOMÁTICO A TU CARPETA DE GOOGLE DRIVE
 * Carpeta Drive vinculada: https://drive.google.com/drive/u/0/folders/1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39
 * ID de Carpeta: 1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39
 *
 * INSTRUCCIONES (1 MINUTO):
 * 1. Abre https://script.google.com y haz clic en "Nuevo proyecto".
 * 2. Pega todo este código reemplazando el contenido actual.
 * 3. Haz clic en "Implementar" > "Nueva implementación" > Tipo: "Aplicación web".
 * 4. En "Ejecutar como": selecciona "Yo" | En "Quién tiene acceso": selecciona "Cualquier persona".
 * 5. Copia la URL de la Aplicación Web y pégala en el modal "Configuración Drive" de TopBank.
 */
var DRIVE_FOLDER_ID = "1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39";
var XLS_FILE_NAME = "clientes_prestamos.xls";

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

    // 1. Si viene el archivo XLS completo generado por TopBank, crearlo o actualizarlo en la carpeta Drive
    if (payload.excelXml) {
      var existingFiles = folder.getFilesByName(XLS_FILE_NAME);
      if (existingFiles.hasNext()) {
        var file = existingFiles.next();
        file.setContent(payload.excelXml);
      } else {
        folder.createFile(XLS_FILE_NAME, payload.excelXml, "application/vnd.ms-excel");
      }
    }

    // 2. También registrar en una Hoja de Cálculo nativa dentro de la misma carpeta Drive
    var sheetFiles = folder.getFilesByName("Base_Maestra_TopBank_Drive");
    var ss;
    if (sheetFiles.hasNext()) {
      ss = SpreadsheetApp.open(sheetFiles.next());
    } else {
      ss = SpreadsheetApp.create("Base_Maestra_TopBank_Drive");
      var ssFile = DriveApp.getFileById(ss.getId());
      folder.addFile(ssFile);
      DriveApp.getRootFolder().removeFile(ssFile);
    }

    var sheet = ss.getSheetByName("Solicitantes") || ss.getSheets()[0];
    sheet.setName("Solicitantes");
    sheet.clearContents();

    sheet.appendRow([
      "ID Expediente", "Nombres", "Apellidos", "Email", "Telefono / WhatsApp",
      "Fecha Nacimiento", "Estatus / Perfil", "Tipo ID", "Numero ID", "Residencia Actual",
      "Lugar de Trabajo", "Funciones / Cargo", "Ingresos Mensuales (USD)",
      "Fuente de Ingresos", "Score Matematico (350-750)", "Monto Solicitado (USD)",
      "Proposito del Prestamo", "Entidad Financiera (Lender)", "Estado del Proceso",
      "Total Adjuntos", "Notas Consultor", "Fecha Creacion / Actualizacion"
    ]);

    var clients = payload.allClients || (payload.client ? [payload.client] : []);
    for (var i = 0; i < clients.length; i++) {
      var c = clients[i];
      sheet.appendRow([
        c.id, c.nombres, c.apellidos, c.email, c.telefono,
        c.fechaNacimiento, c.perfilMigratorio, c.tipoId, c.numeroId, c.residencia,
        c.lugarTrabajo || "", c.funcionesTrabajo || "", c.ingresosMensuales,
        c.fuenteIngresos, c.scoreCredito, c.montoSolicitado,
        c.propositoPrestamo, c.entidadFinanciera, c.estadoProceso,
        (c.adjuntos || []).length, c.notasConsultor, c.fechaActualizacion || c.fechaCreacion
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, folderId: DRIVE_FOLDER_ID, updatedAt: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`
};
