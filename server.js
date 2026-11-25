/**
 * TopBank | Ontop Dark Fintech - Servidor Local de Persistencia y Sincronización Drive
 * Vinculado con Estructura de Datos para Carpeta Drive: 1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, execFile } = require('child_process');
const contractGen = require('./public/js/contractGenerator.js');

const PORT = process.env.PORT || 3080;
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const CONTENIDO_DIR = path.join(ROOT_DIR, 'Contenido');
const CONFIG_FILE = path.join(ROOT_DIR, 'local_config.json');
const DEFAULT_SYNC_DIR = path.join(ROOT_DIR, 'GoogleDrive_Local_Sync');
const USER_DRIVE_URL = 'https://drive.google.com/drive/u/0/folders/1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39';
const DRIVE_FOLDER_ID = '1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39';
const DRIVE_FILE_IDS = {
  xls: '14UBfJEm3-J59Tup-hfO2BfcckgRasjIe',
  csv: '1Kvzp5cE2WyV8aFDCTKzeI7fg0U7-_Dyb',
  json: '1SptPc1i5sAa7FcsoT6Bbkjqz3eI2-q2f'
};

// Cargar logo coral red.jpg en Base64 para incrustarlo en los PDFs y Word sin dependencias externas
let RED_LOGO_DATA_URL = '';
try {
  const redPath = path.join(CONTENIDO_DIR, 'red.jpg');
  if (fs.existsSync(redPath)) {
    RED_LOGO_DATA_URL = 'data:image/jpeg;base64,' + fs.readFileSync(redPath).toString('base64');
  }
} catch (e) {
  console.warn('[Red Logo Load Warning]:', e.message);
}

// Localizar Chrome o Edge instalado en Windows para renderizar el HTML exacto a PDF de alta fidelidad
const CHROMIUM_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

function findChromiumExecutable() {
  for (const candidate of CHROMIUM_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// Renderiza cualquier archivo HTML a un PDF idéntico píxel por píxel usando Chromium Headless
function renderExactHtmlToPdfWithChromium(htmlPath, pdfPath, fallbackBinaryFn) {
  return new Promise((resolve) => {
    const browserBin = findChromiumExecutable();
    if (!browserBin) {
      if (fallbackBinaryFn) {
        fs.writeFileSync(pdfPath, Buffer.from(fallbackBinaryFn(), 'binary'));
      }
      return resolve({ ok: true, mode: 'fallback' });
    }

    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    const args = [
      '--headless',
      '--disable-gpu',
      '--no-pdf-header-footer',
      '--print-to-pdf-no-header',
      `--print-to-pdf=${pdfPath}`,
      fileUrl
    ];

    execFile(browserBin, args, { timeout: 15000 }, (err) => {
      if (!err && fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 500) {
        return resolve({ ok: true, mode: 'chromium-exact' });
      }
      if (fallbackBinaryFn) {
        try {
          fs.writeFileSync(pdfPath, Buffer.from(fallbackBinaryFn(), 'binary'));
        } catch (e) {}
      }
      resolve({ ok: true, mode: 'fallback' });
    });
  });
}

// Genera el documento solicitado ('contract', 'dispatch' o 'ddtax') con el mismo diseño visual exacto en HTML, Word (.doc) y PDF (.pdf)
function generateClientDocumentFiles(client, syncDir, docType = 'contract') {
  return new Promise(async (resolve) => {
    try {
      const expedientesDir = path.join(syncDir || DEFAULT_SYNC_DIR, 'Expedientes_Clientes');
      ensureDir(expedientesDir);

      const folderName = `${sanitizeFolderName(client.id)}_${sanitizeFolderName(client.nombres)}_${sanitizeFolderName(client.apellidos)}`;
      const clientDir = path.join(expedientesDir, folderName);
      ensureDir(clientDir);

      let htmlContent = '';
      let baseFileName = '';
      let fallbackBinaryFn = null;

      if (docType === 'dispatch') {
        htmlContent = contractGen.buildArmoredDispatchWelcomeHtml(client, {
          redLogoDataUrl: RED_LOGO_DATA_URL
        });
        baseFileName = `Acta_Despacho_Valores_OntopBank_${sanitizeFolderName(client.id)}`;
        fallbackBinaryFn = () => contractGen.buildArmoredDispatchWelcomePdfBinary(client);
      } else if (docType === 'ddtax') {
        htmlContent = contractGen.buildDirectDepositTaxClearanceHtml(client, {
          redLogoDataUrl: RED_LOGO_DATA_URL
        });
        baseFileName = `Certificado_Deposito_Directo_Impuestos_${sanitizeFolderName(client.id)}`;
        fallbackBinaryFn = () => contractGen.buildDirectDepositTaxClearancePdfBinary(client);
      } else {
        htmlContent = contractGen.buildTwoPageContractHtml(client, {
          redLogoDataUrl: RED_LOGO_DATA_URL
        });
        baseFileName = `Contrato_Prestamo_OntopBank_${sanitizeFolderName(client.id)}`;
        fallbackBinaryFn = () => contractGen.buildTwoPagePdfBinary(client);
      }

      const htmlPath = path.join(clientDir, `${baseFileName}.html`);
      const docPath = path.join(clientDir, `${baseFileName}.doc`);
      const pdfPath = path.join(clientDir, `${baseFileName}.pdf`);

      // Guardar versión HTML y versión Word (.doc) con imágenes en Base64
      fs.writeFileSync(htmlPath, htmlContent, 'utf8');
      fs.writeFileSync(docPath, '\uFEFF' + htmlContent, 'utf8');

      // Renderizar PDF exacto a la vista previa usando Chromium/Edge Headless
      await renderExactHtmlToPdfWithChromium(htmlPath, pdfPath, fallbackBinaryFn);

      resolve({
        ok: true,
        htmlPath,
        docPath,
        pdfPath,
        baseFileName
      });
    } catch (e) {
      console.error('[Document Generation Error]:', e.message);
      resolve({ ok: false, error: e.message });
    }
  });
}

function generateClientContractFiles(client, syncDir) {
  return generateClientDocumentFiles(client, syncDir, 'contract');
}

function syncToGoogleDriveCloudViaCLI(xlsPath, csvPath, dbJsonPath) {
  const gdriveBin = 'C:\\Users\\johan\\.gemini\\antigravity\\bin\\gdrive.cmd';
  if (!fs.existsSync(gdriveBin)) return;

  exec(`"${gdriveBin}" mutate update ${DRIVE_FILE_IDS.xls} "${xlsPath}"`, (err) => {
    if (err) console.warn('[Drive Cloud Sync XLS Notice]:', err.message);
  });
  exec(`"${gdriveBin}" mutate update ${DRIVE_FILE_IDS.csv} "${csvPath}"`, (err) => {
    if (err) console.warn('[Drive Cloud Sync CSV Notice]:', err.message);
  });
  exec(`"${gdriveBin}" mutate update ${DRIVE_FILE_IDS.json} "${dbJsonPath}"`, (err) => {
    if (err) console.warn('[Drive Cloud Sync JSON Notice]:', err.message);
  });
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        syncFolderPath: parsed.syncFolderPath || DEFAULT_SYNC_DIR,
        driveFolderUrl: parsed.driveFolderUrl || USER_DRIVE_URL,
        appsScriptUrl: parsed.appsScriptUrl || '',
        autoSyncCloud: parsed.autoSyncCloud !== undefined ? Boolean(parsed.autoSyncCloud) : true,
        lastSyncAt: parsed.lastSyncAt || null
      };
    }
  } catch (err) {
    console.error('[Config Error]:', err.message);
  }
  return {
    syncFolderPath: DEFAULT_SYNC_DIR,
    driveFolderUrl: USER_DRIVE_URL,
    appsScriptUrl: '',
    autoSyncCloud: true,
    lastSyncAt: null
  };
}

function saveConfig(newConfig) {
  const merged = { ...loadConfig(), ...newConfig };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizeFolderName(str) {
  return String(str || 'Cliente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function escapeCsvField(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function escapeXml(unsafe) {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Genera archivo CSV compatible con Excel (UTF-8 con BOM) incluyendo Lugar de Trabajo, Funciones y Score Matemático (350-750)
function generateCSV(clients = []) {
  const headers = [
    'ID Expediente',
    'Nombres',
    'Apellidos',
    'Email',
    'Telefono / WhatsApp',
    'Fecha Nacimiento',
    'Perfil Migratorio / Estatus',
    'Tipo ID',
    'Numero ID',
    'Pais / Estado Residencia',
    'Lugar de Trabajo / Empresa',
    'Funciones / Cargo',
    'Ingresos Mensuales (USD)',
    'Fuente de Ingresos',
    'Score Credito Matematico (350-750)',
    'Monto Solicitado (USD)',
    'Proposito del Prestamo',
    'Entidad Financiera (Lender)',
    'Estado del Proceso',
    'Total Adjuntos',
    'Lista Adjuntos',
    'Notas del Consultor Senior',
    'Fecha Creacion / Actualizacion Automatica'
  ];

  const rows = clients.map((c) => [
    c.id,
    c.nombres,
    c.apellidos,
    c.email,
    c.telefono,
    c.fechaNacimiento,
    c.perfilMigratorio,
    c.tipoId,
    c.numeroId,
    c.residencia,
    c.lugarTrabajo || '',
    c.funcionesTrabajo || '',
    c.ingresosMensuales,
    c.fuenteIngresos,
    c.scoreCredito,
    c.montoSolicitado,
    c.propositoPrestamo,
    c.entidadFinanciera,
    c.estadoProceso,
    Array.isArray(c.adjuntos) ? c.adjuntos.length : 0,
    Array.isArray(c.adjuntos) ? c.adjuntos.map((a) => a.name).join(' | ') : '',
    c.notasConsultor,
    c.fechaActualizacion || c.fechaCreacion
  ]);

  const csvLines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((r) => r.map(escapeCsvField).join(','))
  ];

  return '\uFEFF' + csvLines.join('\r\n');
}

// Genera libro Excel nativo XML Spreadsheet 2003 (.xls / .xlsx compatible) con todos los nuevos campos
function generateExcelXml(state = {}) {
  const clients = state.clients || [];
  const appointments = state.appointments || [];
  const lenders = state.lenders || [];

  const clientRowsXml = clients
    .map(
      (c) => `
      <Row>
        <Cell><Data ss:Type="String">${escapeXml(c.id)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.nombres)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.apellidos)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.email)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.telefono)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.fechaNacimiento)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.perfilMigratorio)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.tipoId)}: ${escapeXml(c.numeroId)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.residencia)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.lugarTrabajo || '')}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.funcionesTrabajo || '')}</Data></Cell>
        <Cell><Data ss:Type="Number">${Number(c.ingresosMensuales) || 0}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.fuenteIngresos)}</Data></Cell>
        <Cell><Data ss:Type="Number">${Number(c.scoreCredito) || 350}</Data></Cell>
        <Cell><Data ss:Type="Number">${Number(c.montoSolicitado) || 0}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.propositoPrestamo)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.entidadFinanciera)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.estadoProceso)}</Data></Cell>
        <Cell><Data ss:Type="Number">${Array.isArray(c.adjuntos) ? c.adjuntos.length : 0}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.notasConsultor)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(c.fechaActualizacion || c.fechaCreacion)}</Data></Cell>
      </Row>`
    )
    .join('');

  const appointmentRowsXml = appointments
    .map(
      (a) => `
      <Row>
        <Cell><Data ss:Type="String">${escapeXml(a.id)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(a.clienteNombre)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(a.fecha)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(a.hora)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(a.canal)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(a.consultor)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(a.tema)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(a.estado)}</Data></Cell>
      </Row>`
    )
    .join('');

  const lenderRowsXml = lenders
    .map(
      (l) => `
      <Row>
        <Cell><Data ss:Type="String">${escapeXml(l.nombre)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(l.tipo)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(l.pais)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml((l.perfilesAceptados || []).join(', '))}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(l.tasaApr)}</Data></Cell>
        <Cell><Data ss:Type="Number">${Number(l.montoMaximo) || 0}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(l.ficoMinimo)}</Data></Cell>
      </Row>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4C1D95" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Solicitantes_Prestamos">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">ID Expediente</Data></Cell>
    <Cell><Data ss:Type="String">Nombres</Data></Cell>
    <Cell><Data ss:Type="String">Apellidos</Data></Cell>
    <Cell><Data ss:Type="String">Email</Data></Cell>
    <Cell><Data ss:Type="String">Telefono / WhatsApp</Data></Cell>
    <Cell><Data ss:Type="String">Fecha Nacimiento</Data></Cell>
    <Cell><Data ss:Type="String">Estatus / Perfil Migratorio</Data></Cell>
    <Cell><Data ss:Type="String">Identificacion</Data></Cell>
    <Cell><Data ss:Type="String">Residencia Actual</Data></Cell>
    <Cell><Data ss:Type="String">Lugar de Trabajo / Empresa</Data></Cell>
    <Cell><Data ss:Type="String">Funciones / Cargo</Data></Cell>
    <Cell><Data ss:Type="String">Ingresos Mensuales (USD)</Data></Cell>
    <Cell><Data ss:Type="String">Fuente de Ingresos</Data></Cell>
    <Cell><Data ss:Type="String">Score Matematico (350-750)</Data></Cell>
    <Cell><Data ss:Type="String">Monto Solicitado (USD)</Data></Cell>
    <Cell><Data ss:Type="String">Proposito del Prestamo</Data></Cell>
    <Cell><Data ss:Type="String">Entidad Financiera (Lender)</Data></Cell>
    <Cell><Data ss:Type="String">Estado del Proceso</Data></Cell>
    <Cell><Data ss:Type="String">Num Adjuntos</Data></Cell>
    <Cell><Data ss:Type="String">Notas Consultor Senior</Data></Cell>
    <Cell><Data ss:Type="String">Fecha Creacion / Actualizacion</Data></Cell>
   </Row>
   ${clientRowsXml}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Citas_Consultoria">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">ID Cita</Data></Cell>
    <Cell><Data ss:Type="String">Cliente</Data></Cell>
    <Cell><Data ss:Type="String">Fecha</Data></Cell>
    <Cell><Data ss:Type="String">Hora</Data></Cell>
    <Cell><Data ss:Type="String">Canal</Data></Cell>
    <Cell><Data ss:Type="String">Consultor Senior</Data></Cell>
    <Cell><Data ss:Type="String">Objetivo / Tema</Data></Cell>
    <Cell><Data ss:Type="String">Estado</Data></Cell>
   </Row>
   ${appointmentRowsXml}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Entidades_Lenders">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Entidad Financiera</Data></Cell>
    <Cell><Data ss:Type="String">Categoria</Data></Cell>
    <Cell><Data ss:Type="String">Jurisdiccion</Data></Cell>
    <Cell><Data ss:Type="String">Perfiles Aceptados</Data></Cell>
    <Cell><Data ss:Type="String">Tasa Estimada APR</Data></Cell>
    <Cell><Data ss:Type="String">Monto Maximo (USD)</Data></Cell>
    <Cell><Data ss:Type="String">Score Minimo</Data></Cell>
   </Row>
   ${lenderRowsXml}
  </Table>
 </Worksheet>
</Workbook>`;
}

function persistDatabaseToDisk(state) {
  const config = loadConfig();
  const syncDir = config.syncFolderPath || DEFAULT_SYNC_DIR;
  ensureDir(syncDir);

  const expedientesDir = path.join(syncDir, 'Expedientes_Clientes');
  ensureDir(expedientesDir);

  const nowIso = new Date().toISOString();
  const payloadToWrite = {
    meta: {
      platform: 'TopBank Global Loan Origination & Consulting (Ontop Dark Edition)',
      version: '2.0.0',
      driveFolderId: '1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39',
      driveFolderUrl: USER_DRIVE_URL,
      updatedAt: nowIso,
      syncFolderPath: syncDir,
      totalClients: (state.clients || []).length
    },
    clients: state.clients || [],
    appointments: state.appointments || [],
    lenders: state.lenders || []
  };

  // 1. Archivo estructurado maestro JSON
  const dbJsonPath = path.join(syncDir, 'database_prestamos.json');
  fs.writeFileSync(dbJsonPath, JSON.stringify(payloadToWrite, null, 2), 'utf8');

  // 2. Exportación espejo automática CSV
  const csvPath = path.join(syncDir, 'clientes_prestamos.csv');
  fs.writeFileSync(csvPath, generateCSV(state.clients || []), 'utf8');

  // 3. Exportación espejo automática Excel (.xls y .xlsx)
  const excelXmlContent = generateExcelXml(payloadToWrite);
  const xlsPath = path.join(syncDir, 'clientes_prestamos.xls');
  const xlsxMirrorPath = path.join(syncDir, 'clientes_prestamos.xlsx');
  fs.writeFileSync(xlsPath, excelXmlContent, 'utf8');
  fs.writeFileSync(xlsxMirrorPath, excelXmlContent, 'utf8');

  // 4. Crear subcarpeta individual por cada cliente
  (state.clients || []).forEach((client) => {
    const folderName = `${sanitizeFolderName(client.id)}_${sanitizeFolderName(client.nombres)}_${sanitizeFolderName(client.apellidos)}`;
    const clientDir = path.join(expedientesDir, folderName);
    ensureDir(clientDir);

    const clientSummaryPath = path.join(clientDir, 'ficha_expediente.json');
    const cleanClientCopy = { ...client };
    if (Array.isArray(cleanClientCopy.adjuntos)) {
      cleanClientCopy.adjuntos = cleanClientCopy.adjuntos.map((att) => {
        const { dataUrl, ...rest } = att;
        return rest;
      });
    }
    fs.writeFileSync(clientSummaryPath, JSON.stringify(cleanClientCopy, null, 2), 'utf8');

    if (Array.isArray(client.adjuntos)) {
      client.adjuntos.forEach((att) => {
        if (att && att.dataUrl && typeof att.dataUrl === 'string' && att.dataUrl.includes('base64,')) {
          try {
            const base64Data = att.dataUrl.split('base64,')[1];
            const safeFileName = path.basename(att.name || 'documento.bin').replace(/[<>:"/\\|?*]/g, '_');
            const fileDest = path.join(clientDir, safeFileName);
            fs.writeFileSync(fileDest, Buffer.from(base64Data, 'base64'));
          } catch (fileErr) {
            console.error('[Error guardando adjunto físico]:', fileErr.message);
          }
        }
      });
    }
  });

  const updatedCfg = saveConfig({ lastSyncAt: nowIso });

  // 5. Sincronizar en segundo plano los archivos directamente hacia la carpeta de Google Drive (1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39)
  syncToGoogleDriveCloudViaCLI(xlsPath, csvPath, dbJsonPath);

  return {
    ok: true,
    syncFolderPath: syncDir,
    driveFolderUrl: USER_DRIVE_URL,
    lastSyncAt: updatedCfg.lastSyncAt
  };
}

function readDatabaseFromDisk() {
  const config = loadConfig();
  const syncDir = config.syncFolderPath || DEFAULT_SYNC_DIR;
  const dbJsonPath = path.join(syncDir, 'database_prestamos.json');

  if (fs.existsSync(dbJsonPath)) {
    try {
      const raw = fs.readFileSync(dbJsonPath, 'utf8');
      const data = JSON.parse(raw);
      return {
        exists: true,
        version: data.meta?.version || '1.0.0',
        config,
        state: {
          clients: data.clients || [],
          appointments: data.appointments || [],
          lenders: data.lenders || []
        }
      };
    } catch (err) {
      console.error('[Read DB Error]:', err.message);
    }
  }
  return { exists: false, version: null, config, state: null };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function collectRequestBody(req, maxBytes = 50 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Payload demasiado grande (máx 50MB)'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(new Error('JSON inválido en la petición'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/api/state' && req.method === 'GET') {
    const result = readDatabaseFromDisk();
    return sendJson(res, 200, {
      ok: true,
      mode: 'node-local-fs',
      exists: result.exists,
      config: result.config,
      state: result.state
    });
  }

  // API: Generar Contrato Oficial en PDF y Word (al finalizar temporizador de 6 min o bajo demanda)
  if (pathname === '/api/generate-contract' && req.method === 'POST') {
    try {
      const body = await collectRequestBody(req);
      const client = body.client;
      if (!client || !client.id) {
        return sendJson(res, 400, { ok: false, error: 'Datos de cliente requeridos' });
      }
      const cfg = loadConfig();
      const genResult = await generateClientContractFiles(client, cfg.syncFolderPath);

      // Si se generó el PDF y tenemos gdrive CLI, subirlo también a la carpeta Drive del usuario
      if (genResult.pdfPath && body.uploadToDrive) {
        const gdriveBin = 'C:\\Users\\johan\\.gemini\\antigravity\\bin\\gdrive.cmd';
        if (fs.existsSync(gdriveBin)) {
          exec(`"${gdriveBin}" mutate upload "${genResult.pdfPath}" --parent ${DRIVE_FOLDER_ID}`, (err) => {
            if (err) console.warn('[Drive Upload Contract PDF Notice]:', err.message);
          });
        }
      }

      return sendJson(res, 200, {
        ok: true,
        pdfReady: Boolean(genResult.pdfPath),
        docReady: Boolean(genResult.docPath),
        pdfDownloadUrl: `/api/download-pdf?id=${encodeURIComponent(client.id)}`,
        wordDownloadUrl: `/api/download-word?id=${encodeURIComponent(client.id)}`
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // API: Descargar el PDF real con el diseño visual exacto (type = contract | dispatch | ddtax)
  if (pathname === '/api/download-pdf' && req.method === 'GET') {
    try {
      const clientId = parsedUrl.searchParams.get('id');
      const docType = parsedUrl.searchParams.get('type') || 'contract';
      const db = readDatabaseFromDisk();
      const client = (db.state?.clients || []).find((c) => c.id === clientId);
      if (!client) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Cliente no encontrado');
      }

      const cfg = loadConfig();
      const genResult = await generateClientDocumentFiles(client, cfg.syncFolderPath, docType);
      if (genResult.pdfPath && fs.existsSync(genResult.pdfPath)) {
        const safeName = `${genResult.baseFileName}_${sanitizeFolderName(client.nombres)}.pdf`;
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeName}"`
        });
        return fs.createReadStream(genResult.pdfPath).pipe(res);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('No se pudo generar el PDF');
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(err.message);
    }
  }

  // API: Descargar el documento Word (.doc) con el diseño visual exacto (type = contract | dispatch | ddtax)
  if (pathname === '/api/download-word' && req.method === 'GET') {
    try {
      const clientId = parsedUrl.searchParams.get('id');
      const docType = parsedUrl.searchParams.get('type') || 'contract';
      const db = readDatabaseFromDisk();
      const client = (db.state?.clients || []).find((c) => c.id === clientId);
      if (!client) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Cliente no encontrado');
      }

      const cfg = loadConfig();
      const genResult = await generateClientDocumentFiles(client, cfg.syncFolderPath, docType);
      if (genResult.docPath && fs.existsSync(genResult.docPath)) {
        const safeName = `${genResult.baseFileName}_${sanitizeFolderName(client.nombres)}.doc`;
        res.writeHead(200, {
          'Content-Type': 'application/msword; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeName}"`
        });
        return fs.createReadStream(genResult.docPath).pipe(res);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('No se pudo generar el archivo Word');
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(err.message);
    }
  }

  if (pathname === '/api/save' && req.method === 'POST') {
    try {
      const body = await collectRequestBody(req);
      const syncResult = persistDatabaseToDisk(body);
      return sendJson(res, 200, syncResult);
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/config' && req.method === 'POST') {
    try {
      const body = await collectRequestBody(req);
      const targetPath = body.syncFolderPath ? path.resolve(body.syncFolderPath) : DEFAULT_SYNC_DIR;
      ensureDir(targetPath);

      saveConfig({
        syncFolderPath: targetPath,
        appsScriptUrl: body.appsScriptUrl !== undefined ? body.appsScriptUrl : undefined,
        autoSyncCloud: body.autoSyncCloud !== undefined ? Boolean(body.autoSyncCloud) : undefined
      });

      if (body.state) {
        persistDatabaseToDisk(body.state);
      }

      return sendJson(res, 200, {
        ok: true,
        config: loadConfig()
      });
    } catch (err) {
      return sendJson(res, 400, {
        ok: false,
        error: `No se pudo acceder o crear la carpeta indicada: ${err.message}`
      });
    }
  }

  if (pathname === '/api/open-folder' && req.method === 'POST') {
    try {
      const config = loadConfig();
      const folderToOpen = config.syncFolderPath || DEFAULT_SYNC_DIR;
      ensureDir(folderToOpen);

      const platform = process.platform;
      const cmd =
        platform === 'win32'
          ? `explorer "${folderToOpen}"`
          : platform === 'darwin'
          ? `open "${folderToOpen}"`
          : `xdg-open "${folderToOpen}"`;

      exec(cmd);
      return sendJson(res, 200, { ok: true, openedPath: folderToOpen });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (pathname.startsWith('/Contenido/')) {
    const relFile = pathname.replace('/Contenido/', '');
    const safePath = path.normalize(path.join(CONTENIDO_DIR, relFile));
    if (safePath.startsWith(CONTENIDO_DIR) && fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      const ext = path.extname(safePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      return fs.createReadStream(safePath).pipe(res);
    }
  }

  let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
  filePath = path.normalize(filePath);

  if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    return fs.createReadStream(filePath).pipe(res);
  }

  const indexHtml = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(indexHtml).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 - Recurso no encontrado');
});

async function ensureInitialSeedOnDisk() {
  const cfg = loadConfig();
  const syncDir = cfg.syncFolderPath || DEFAULT_SYNC_DIR;
  ensureDir(syncDir);

  let currentData = readDatabaseFromDisk();
  if (!currentData.exists || currentData.version !== '2.0.0') {
    try {
      const seedScriptPath = path.join(PUBLIC_DIR, 'js', 'seedData.js');
      if (fs.existsSync(seedScriptPath)) {
        const sandboxWindow = {};
        const scriptCode = fs.readFileSync(seedScriptPath, 'utf8');
        const fn = new Function('window', scriptCode);
        fn(sandboxWindow);
        if (sandboxWindow.TOPBANK_SEED_DATA) {
          persistDatabaseToDisk(sandboxWindow.TOPBANK_SEED_DATA);
          currentData = readDatabaseFromDisk();
        }
      }
    } catch (seedErr) {
      console.error('[Seed Init Warning]:', seedErr.message);
    }
  }

  // Pre-generar los archivos Word (.doc) y PDF (.pdf) de 2 hojas para cada cliente
  const clients = currentData.state?.clients || [];
  for (const client of clients) {
    await generateClientContractFiles(client, syncDir);
  }
}

if (process.argv.includes('--verify-sync')) {
  ensureInitialSeedOnDisk().then(() => {
    const cfg = loadConfig();
    console.log('Sync v2.5 y Contratos PDF/Word verificados en:', cfg.syncFolderPath);
    process.exit(0);
  });
} else {
  ensureInitialSeedOnDisk();
  server.listen(PORT, () => {
    const cfg = loadConfig();
    console.log('======================================================================');
    console.log(' 🚀 TOPBANK v2.5 | TEMPORIZADOR 6M + CONTRATOS LEGALES PDF/WORD');
    console.log(` 🌐 Aplicación Web Local activa en: http://localhost:${PORT}`);
    console.log(` 📁 Carpeta Google Drive Local:     ${cfg.syncFolderPath}`);
    console.log(` ☁️ Carpeta Google Drive Cloud:     ${USER_DRIVE_URL}`);
    console.log('======================================================================');
  });
}
