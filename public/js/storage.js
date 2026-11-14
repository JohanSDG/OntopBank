/**
 * TopBank v2.0 | Motor de Persistencia Dual + Sincronización con Carpeta Drive 1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39
 */

class TopBankStorageEngine {
  constructor() {
    this.STORAGE_KEY = 'TOPBANK_ONTOP_MASTER_DB_V2';
    this.CONFIG_KEY = 'TOPBANK_ONTOP_DRIVE_CONFIG_V2';
    this.IDB_NAME = 'TopBankFintechIDB_V2';
    this.IDB_STORE = 'directoryHandles';

    this.nodeBackendAvailable = false;
    this.directoryHandle = null;
    this.config = {
      syncFolderPath: './GoogleDrive_Local_Sync',
      driveFolderUrl: 'https://drive.google.com/drive/u/0/folders/1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39',
      driveFolderId: '1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39',
      appsScriptUrl: '',
      autoSyncCloud: true,
      lastSyncAt: null,
      browserFolderName: null
    };
  }

  async init(seedData) {
    try {
      const savedCfg = localStorage.getItem(this.CONFIG_KEY);
      if (savedCfg) {
        this.config = { ...this.config, ...JSON.parse(savedCfg) };
      }
    } catch (e) {
      console.warn('Error leyendo config local:', e);
    }

    try {
      const handle = await this.getStoredDirectoryHandle();
      if (handle) {
        this.directoryHandle = handle;
        this.config.browserFolderName = handle.name;
      }
    } catch (e) {
      // Ignorar si no existe
    }

    // 1. Probar conexión con el servidor local Node.js (/api/state)
    try {
      const res = await fetch('/api/state', { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        const payload = await res.json();
        this.nodeBackendAvailable = true;
        if (payload.config) {
          this.config = { ...this.config, ...payload.config };
          this.saveLocalConfig();
        }
        if (payload.exists && payload.state && Array.isArray(payload.state.clients) && payload.state.clients.length > 0) {
          this.saveToLocalStorage(payload.state);
          return payload.state;
        }
      }
    } catch (err) {
      this.nodeBackendAvailable = false;
    }

    // 2. Respaldo en LocalStorage
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.clients) && parsed.clients.length > 0) {
          if (this.nodeBackendAvailable) {
            await this.syncAll(parsed);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error leyendo LocalStorage:', e);
    }

    // 3. Sembrar datos iniciales v2
    const initialState = {
      clients: JSON.parse(JSON.stringify(seedData.clients || [])),
      appointments: JSON.parse(JSON.stringify(seedData.appointments || [])),
      lenders: JSON.parse(JSON.stringify(seedData.lenders || []))
    };

    await this.syncAll(initialState);
    return initialState;
  }

  saveLocalConfig() {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('No se pudo guardar config en LocalStorage:', e);
    }
  }

  saveToLocalStorage(state) {
    try {
      const compactClients = (state.clients || []).map((c) => ({
        ...c,
        adjuntos: (c.adjuntos || []).map((a) => ({
          name: a.name,
          size: a.size,
          type: a.type,
          category: a.category,
          dataUrl: a.dataUrl && a.dataUrl.length < 250000 ? a.dataUrl : undefined
        }))
      }));
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify({
          clients: compactClients,
          appointments: state.appointments || [],
          lenders: state.lenders || []
        })
      );
    } catch (e) {
      console.warn('Advertencia de cuota en LocalStorage:', e);
    }
  }

  async syncAll(state, latestSavedClient = null) {
    const nowIso = new Date().toISOString();
    this.config.lastSyncAt = nowIso;
    this.saveLocalConfig();
    this.saveToLocalStorage(state);

    const results = {
      localStorage: true,
      nodeDisk: false,
      fileSystemApi: false,
      cloudWebhook: false
    };

    // Capa 1A: Backend Local Node.js
    if (this.nodeBackendAvailable) {
      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state)
        });
        if (res.ok) {
          const data = await res.json();
          this.config.syncFolderPath = data.syncFolderPath || this.config.syncFolderPath;
          this.config.lastSyncAt = data.lastSyncAt || nowIso;
          this.saveLocalConfig();
          results.nodeDisk = true;
        }
      } catch (e) {
        console.warn('Error sincronizando con servidor Node local:', e);
      }
    }

    // Capa 1B: File System Access API (window.showDirectoryPicker)
    if (this.directoryHandle) {
      try {
        const okPerm = await this.verifyDirectoryPermission(this.directoryHandle, true);
        if (okPerm) {
          await this.writeStateToDirectoryHandle(this.directoryHandle, state);
          results.fileSystemApi = true;
        }
      } catch (e) {
        console.warn('No se pudo escribir mediante File System Access API:', e);
      }
    }

    // Capa 2: Conector Google Drive Cloud (Carpeta 1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39 vía Google Apps Script)
    if (this.config.appsScriptUrl && this.config.autoSyncCloud) {
      try {
        await this.postToAppsScriptWebhook(latestSavedClient, state);
        results.cloudWebhook = true;
      } catch (e) {
        console.warn('Error enviando webhook a Google Apps Script:', e);
      }
    }

    return results;
  }

  async pickDirectoryWithBrowserApi(currentState) {
    if (typeof window.showDirectoryPicker !== 'function') {
      throw new Error(
        'Tu navegador actual no soporta window.showDirectoryPicker(). Usa Chrome o Edge, o utiliza la ruta directa del servidor local Node.js.'
      );
    }

    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    this.directoryHandle = handle;
    this.config.browserFolderName = handle.name;
    this.saveLocalConfig();
    await this.storeDirectoryHandle(handle);

    if (currentState) {
      await this.writeStateToDirectoryHandle(handle, currentState);
    }
    return handle.name;
  }

  async verifyDirectoryPermission(fileHandle, withWrite = true) {
    const opts = { mode: withWrite ? 'readwrite' : 'read' };
    if ((await fileHandle.queryPermission(opts)) === 'granted') return true;
    if ((await fileHandle.requestPermission(opts)) === 'granted') return true;
    return false;
  }

  async writeStateToDirectoryHandle(dirHandle, state) {
    const payload = {
      meta: {
        platform: 'TopBank Global Loan Origination & Consulting v2.0',
        driveFolderId: this.config.driveFolderId,
        updatedAt: new Date().toISOString(),
        totalClients: (state.clients || []).length
      },
      clients: state.clients || [],
      appointments: state.appointments || [],
      lenders: state.lenders || []
    };

    const jsonHandle = await dirHandle.getFileHandle('database_prestamos.json', { create: true });
    const jsonWritable = await jsonHandle.createWritable();
    await jsonWritable.write(JSON.stringify(payload, null, 2));
    await jsonWritable.close();

    const csvContent = this.buildCsvString(state.clients || []);
    const csvHandle = await dirHandle.getFileHandle('clientes_prestamos.csv', { create: true });
    const csvWritable = await csvHandle.createWritable();
    await csvWritable.write(csvContent);
    await csvWritable.close();

    const excelXml = this.buildExcelXmlString(state);
    const xlsHandle = await dirHandle.getFileHandle('clientes_prestamos.xls', { create: true });
    const xlsWritable = await xlsHandle.createWritable();
    await xlsWritable.write(excelXml);
    await xlsWritable.close();

    const expRootHandle = await dirHandle.getDirectoryHandle('Expedientes_Clientes', { create: true });
    for (const client of state.clients || []) {
      const safeFolder = `${this.sanitizeName(client.id)}_${this.sanitizeName(client.nombres)}_${this.sanitizeName(client.apellidos)}`;
      const clientDirHandle = await expRootHandle.getDirectoryHandle(safeFolder, { create: true });

      const summaryHandle = await clientDirHandle.getFileHandle('ficha_expediente.json', { create: true });
      const summaryWritable = await summaryHandle.createWritable();
      await summaryWritable.write(JSON.stringify(client, null, 2));
      await summaryWritable.close();
    }
  }

  // Envía tanto los clientes como el XML del archivo .xls a la carpeta de Google Drive 1q7tTJCzDgQ6J4_SyCwbDAw5T1w5JN-39
  async postToAppsScriptWebhook(clientRecord, fullState) {
    if (!this.config.appsScriptUrl) {
      throw new Error('No se ha configurado una URL de Google Apps Script.');
    }

    const payload = {
      event: 'CLIENT_UPSERT_SYNC_V2',
      folderId: this.config.driveFolderId,
      syncedAt: new Date().toISOString(),
      client: clientRecord,
      allClients: (fullState.clients || []).map((c) => {
        const { adjuntos, ...rest } = c;
        return {
          ...rest,
          adjuntos: (adjuntos || []).map((a) => ({ name: a.name }))
        };
      }),
      excelXml: this.buildExcelXmlString(fullState)
    };

    await fetch(this.config.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    return true;
  }

  async updateDriveConfig(newSettings, currentState) {
    this.config = { ...this.config, ...newSettings };
    this.saveLocalConfig();

    if (this.nodeBackendAvailable) {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncFolderPath: this.config.syncFolderPath,
          appsScriptUrl: this.config.appsScriptUrl,
          autoSyncCloud: this.config.autoSyncCloud,
          state: currentState
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Error guardando configuración en el servidor local');
      }
      this.config = { ...this.config, ...data.config };
      this.saveLocalConfig();
    }
    return this.config;
  }

  async openLocalSyncFolder() {
    if (!this.nodeBackendAvailable) {
      throw new Error('La apertura directa en el Explorador requiere el servidor local Node.js activo.');
    }
    const res = await fetch('/api/open-folder', { method: 'POST' });
    return res.json();
  }

  downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  exportJsonFile(state) {
    const content = JSON.stringify(
      {
        meta: {
          exportedAt: new Date().toISOString(),
          driveFolderUrl: this.config.driveFolderUrl,
          platform: 'TopBank Ontop Dark Fintech v2.0'
        },
        ...state
      },
      null,
      2
    );
    this.downloadFile('database_prestamos.json', content, 'application/json;charset=utf-8');
  }

  exportCsvFile(state) {
    const csv = this.buildCsvString(state.clients || []);
    this.downloadFile('clientes_prestamos.csv', csv, 'text/csv;charset=utf-8');
  }

  exportExcelFile(state) {
    const xml = this.buildExcelXmlString(state);
    this.downloadFile('clientes_prestamos.xls', xml, 'application/vnd.ms-excel;charset=utf-8');
  }

  buildCsvString(clients = []) {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'ID Expediente',
      'Nombres',
      'Apellidos',
      'Email',
      'Telefono / WhatsApp',
      'Fecha Nacimiento',
      'Perfil Migratorio',
      'Tipo ID',
      'Numero ID',
      'Residencia Actual',
      'Lugar de Trabajo / Empresa',
      'Funciones / Cargo',
      'Ingresos Mensuales (USD)',
      'Fuente de Ingresos',
      'Score Matematico (350-750)',
      'Monto Solicitado (USD)',
      'Proposito del Prestamo',
      'Entidad Financiera (Lender)',
      'Estado del Proceso',
      'Total Adjuntos',
      'Archivos Adjuntos',
      'Notas del Consultor Senior',
      'Fecha Creacion / Actualizacion'
    ];

    const lines = [
      headers.map(esc).join(','),
      ...clients.map((c) =>
        [
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
          (c.adjuntos || []).length,
          (c.adjuntos || []).map((a) => a.name).join(' | '),
          c.notasConsultor,
          c.fechaActualizacion || c.fechaCreacion
        ]
          .map(esc)
          .join(',')
      )
    ];

    return '\uFEFF' + lines.join('\r\n');
  }

  buildExcelXmlString(state = {}) {
    const escXml = (s) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const rows = (state.clients || [])
      .map(
        (c) => `
      <Row>
        <Cell><Data ss:Type="String">${escXml(c.id)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.nombres)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.apellidos)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.email)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.telefono)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.fechaNacimiento)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.perfilMigratorio)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.tipoId)}: ${escXml(c.numeroId)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.residencia)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.lugarTrabajo || '')}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.funcionesTrabajo || '')}</Data></Cell>
        <Cell><Data ss:Type="Number">${Number(c.ingresosMensuales) || 0}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.fuenteIngresos)}</Data></Cell>
        <Cell><Data ss:Type="Number">${Number(c.scoreCredito) || 350}</Data></Cell>
        <Cell><Data ss:Type="Number">${Number(c.montoSolicitado) || 0}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.propositoPrestamo)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.entidadFinanciera)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.estadoProceso)}</Data></Cell>
        <Cell><Data ss:Type="Number">${(c.adjuntos || []).length}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.notasConsultor)}</Data></Cell>
        <Cell><Data ss:Type="String">${escXml(c.fechaActualizacion || c.fechaCreacion)}</Data></Cell>
      </Row>`
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
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
    <Cell><Data ss:Type="String">Perfil Migratorio</Data></Cell>
    <Cell><Data ss:Type="String">Identificacion</Data></Cell>
    <Cell><Data ss:Type="String">Residencia</Data></Cell>
    <Cell><Data ss:Type="String">Lugar de Trabajo / Empresa</Data></Cell>
    <Cell><Data ss:Type="String">Funciones / Cargo</Data></Cell>
    <Cell><Data ss:Type="String">Ingresos Mensuales USD</Data></Cell>
    <Cell><Data ss:Type="String">Fuente Ingresos</Data></Cell>
    <Cell><Data ss:Type="String">Score Matematico (350-750)</Data></Cell>
    <Cell><Data ss:Type="String">Monto Solicitado USD</Data></Cell>
    <Cell><Data ss:Type="String">Proposito</Data></Cell>
    <Cell><Data ss:Type="String">Entidad Financiera</Data></Cell>
    <Cell><Data ss:Type="String">Estado Proceso</Data></Cell>
    <Cell><Data ss:Type="String">Adjuntos</Data></Cell>
    <Cell><Data ss:Type="String">Notas Consultor</Data></Cell>
    <Cell><Data ss:Type="String">Fecha Creacion / Actualizacion</Data></Cell>
   </Row>
   ${rows}
  </Table>
 </Worksheet>
</Workbook>`;
  }

  sanitizeName(str) {
    return String(str || 'Cliente')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  sanitizeFileName(str) {
    return String(str || 'archivo.pdf').replace(/[<>:"/\\|?*]/g, '_');
  }

  openIdb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.IDB_STORE)) {
          db.createObjectStore(this.IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async storeDirectoryHandle(handle) {
    const db = await this.openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.IDB_STORE, 'readwrite');
      tx.objectStore(this.IDB_STORE).put(handle, 'googleDriveDir');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getStoredDirectoryHandle() {
    const db = await this.openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.IDB_STORE, 'readonly');
      const req = tx.objectStore(this.IDB_STORE).get('googleDriveDir');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
}

window.TopBankStorageEngine = TopBankStorageEngine;
