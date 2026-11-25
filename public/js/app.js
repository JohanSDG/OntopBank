/**
 * TopBank v2.5 | Controlador Principal SPA:
 *  - Asistente por Pasos (Paso 1 -> Paso 2)
 *  - Score Matemático (350 a 750) y Fecha Automática Bloqueados
 *  - Temporizador de 6 Minutos en Proceso de Préstamo con Auto-Aprobación
 *  - Generación de Contrato Oficial de Préstamo (2 Hojas Legales PDF y Word con 8% Anual * 12 Meses)
 */

(function () {
  const STAGES = [
    '1. Captura Inicial',
    '2. Recolección Documental',
    '3. En Estudio por Entidad (Underwriting)',
    '4. Pre-Aprobado',
    '5. Aprobado y Desembolsado',
    '6. Rechazado / En Corrección'
  ];

  const SIX_MINUTES_MS = 6 * 60 * 1000; // 6 minutos exactos (360,000 ms)
  const storage = new window.TopBankStorageEngine();

  let appState = {
    clients: [],
    appointments: [],
    lenders: []
  };

  let editingClientId = null;
  let currentModalAttachments = [];
  let timerIntervalId = null;

  const usdFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });

  function formatUSD(amount) {
    return usdFormatter.format(Number(amount) || 0);
  }

  function getFormattedTimestamp() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }

  function formatCountdown(msRemaining) {
    const totalSec = Math.max(0, Math.ceil(msRemaining / 1000));
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getStageClass(stage) {
    const s = String(stage || '');
    if (s.startsWith('1.')) return 'status-stage-1';
    if (s.startsWith('2.')) return 'status-stage-2';
    if (s.startsWith('3.')) return 'status-stage-3';
    if (s.startsWith('4.')) return 'status-stage-4';
    if (s.startsWith('5.')) return 'status-stage-5';
    if (s.startsWith('6.')) return 'status-stage-6';
    return 'status-stage-1';
  }

  function showToast(message, icon = '✅') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const item = document.createElement('div');
    item.className = 'toast-item';
    item.innerHTML = `<span>${icon}</span><div>${escapeHtml(message)}</div>`;
    container.appendChild(item);
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(8px)';
      item.style.transition = 'all 0.25s ease';
      setTimeout(() => item.remove(), 260);
    }, 4500);
  }

  async function bootstrap() {
    appState = await storage.init(window.TOPBANK_SEED_DATA);

    // Asegurar que los clientes en proceso (Etapa 1: 1., 2. o 3.) tengan su temporizador de 6 minutos activo y metadatos de tarjeta
    const now = Date.now();
    (appState.clients || []).forEach((c) => {
      const st = String(c.estadoProceso || '');
      if (
        (st.startsWith('1.') || st.startsWith('2.') || st.startsWith('3.')) &&
        (!c.timerEndsAt || c.timerEndsAt <= now)
      ) {
        c.timerStartedAt = now;
        c.timerEndsAt = now + SIX_MINUTES_MS;
      }
      if (!c.cardLast4) {
        const numericSeed = parseInt(String(c.id).replace(/\D/g, ''), 10) || 101;
        c.cardLast4 = String(4100 + ((numericSeed * 73) % 5800)).slice(-4);
      }
      if (!c.cardExpiry) {
        c.cardExpiry = '08/29';
      }
    });

    bindEvents();
    renderAll();
    updateSyncStatusUI();
    startSixMinuteTimerEngine();
  }

  // ==========================================================================
  // MOTOR DE TEMPORIZADOR DE 6 MINUTOS EN PROCESO DE PRÉSTAMO
  // ==========================================================================
  function startSixMinuteTimerEngine() {
    if (timerIntervalId) clearInterval(timerIntervalId);
    timerIntervalId = setInterval(() => {
      const now = Date.now();
      let anyExpired = false;

      (appState.clients || []).forEach((c) => {
        const st = String(c.estadoProceso || '');
        const inStage1 = st.startsWith('1.') || st.startsWith('2.') || st.startsWith('3.');
        if (c.timerEndsAt && inStage1) {
          const remaining = c.timerEndsAt - now;
          if (remaining <= 0) {
            anyExpired = true;
            completeLoanTimerAndApprove(c.id, true);
          } else {
            // Actualizar dígitos y barra de progreso en el DOM en tiempo real (06:00 a 00:00)
            const totalDuration = (c.timerEndsAt - (c.timerStartedAt || c.timerEndsAt - SIX_MINUTES_MS)) || SIX_MINUTES_MS;
            const elapsedPct = Math.max(5, Math.min(99, ((totalDuration - remaining) / totalDuration) * 100));
            const clockStr = formatCountdown(remaining);

            document.querySelectorAll(`[data-timer-clock="${c.id}"]`).forEach((el) => {
              el.textContent = `⏱️ ${clockStr}`;
            });
            document.querySelectorAll(`[data-timer-bar="${c.id}"]`).forEach((el) => {
              el.style.width = `${elapsedPct}%`;
            });
          }
        }
      });

      if (anyExpired) {
        renderAll();
      }
    }, 1000);
  }

  // Finaliza el temporizador de 6 minutos, mueve el cliente a Etapa 2 (4. Pre-Aprobado) y habilita el Contrato Legal de 2 Hojas
  async function completeLoanTimerAndApprove(clientId, autoTriggered = false) {
    const client = (appState.clients || []).find((c) => c.id === clientId);
    if (!client) return;

    const autoNow = getFormattedTimestamp();
    client.estadoProceso = '4. Pre-Aprobado';
    client.timerStartedAt = null;
    client.timerEndsAt = null;
    client.fechaActualizacion = autoNow;
    client.contratoAprobado = true;

    renderAll();
    await storage.syncAll(appState, client);
    updateSyncStatusUI();

    // Generar en el servidor local el PDF de 2 hojas + Word y subirlo a la carpeta Drive del usuario
    if (storage.nodeBackendAvailable) {
      try {
        await fetch('/api/generate-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client, uploadToDrive: true })
        });
      } catch (e) {
        console.warn('Error generando PDF en servidor:', e);
      }
    }

    const msgPrefix = autoTriggered
      ? `⏰ ¡Finalizó el temporizador de 6:00 min para ${client.nombres} ${client.apellidos}!`
      : `⚡ ¡Validación completada para ${client.nombres} ${client.apellidos}!`;

    showToast(
      `${msgPrefix} Movido a Etapa 2 (Préstamos Pre-Aprobados) con Contrato Legal de 2 Hojas habilitado.`,
      '✨'
    );

    // Abrir el documento legal de 2 hojas listo para descargar en PDF y enviar al cliente
    openLegalContractModal(client);
  }

  // ==========================================================================
  // MODAL SPLIT-VIEW: GENERADOR DE TARJETA VIRTUAL Y ACTIVACIÓN DE CUENTA
  // ==========================================================================
  function ensureClientCardMetadata(client) {
    if (!client.cardLast4) {
      client.cardLast4 = String(Math.floor(1000 + Math.random() * 9000));
    }
    if (!client.cardExpiry) {
      client.cardExpiry = '08/29';
    }
  }

  function openVirtualCardModal(client) {
    if (!client) return;
    ensureClientCardMetadata(client);

    const modal = document.getElementById('virtualCardModalBackdrop');
    if (!modal) return;

    const isAlreadyActive = String(client.estadoProceso || '').startsWith('5.');
    const fullNameUpper = `${client.nombres || ''} ${client.apellidos || ''}`.trim().toUpperCase();

    document.getElementById('vcardModalTitle').textContent = `💳 Tarjeta Virtual y Activación de Cuenta · ${client.nombres} ${client.apellidos}`;
    document.getElementById('vcardHolderName').textContent = fullNameUpper || 'TITULAR VERIFICADO';
    document.getElementById('vcardMaskedNumber').innerHTML = `•••• &nbsp;•••• &nbsp;•••• &nbsp;${escapeHtml(client.cardLast4)}`;
    document.getElementById('vcardExpiryDate').textContent = client.cardExpiry;

    const statusBadge = document.getElementById('vcardStatusBadge');
    if (statusBadge) {
      if (isAlreadyActive) {
        statusBadge.textContent = 'RIEL BANCARIO ACTIVO · EN DESEMBOLSO';
        statusBadge.classList.add('active-card');
      } else {
        statusBadge.textContent = 'LISTA PARA ACTIVACIÓN SIN COSTO';
        statusBadge.classList.remove('active-card');
      }
    }

    document.getElementById('vcardSummaryPrincipal').textContent = `${formatUSD(client.montoSolicitado)} USD`;
    const actCostEl = document.getElementById('vcardSummaryActivationCost');
    if (actCostEl) {
      actCostEl.textContent = '$99.00 USD';
    }
    document.getElementById('vcardSummaryTotal').textContent = `${formatUSD(client.montoSolicitado)} USD`;
    document.getElementById('vcardSummaryAddress').textContent = client.residencia || 'EE. UU. / Internacional';

    const confirmBtn = document.getElementById('btnConfirmActivateVcard');
    if (confirmBtn) {
      if (isAlreadyActive) {
        confirmBtn.innerHTML = `<span>✅</span> Cuenta y Tarjeta Virtual Ya Activadas (En Etapa 3 de Desembolso)`;
      } else {
        confirmBtn.innerHTML = `<span>💳</span> Confirmar Tarjeta Virtual y Activar Cuenta para Desembolso`;
      }
      confirmBtn.onclick = async () => {
        await confirmVirtualCardActivation(client.id);
      };
    }

    const downloadBoxBtn = document.getElementById('btnDownloadVcardBox');
    if (downloadBoxBtn) {
      downloadBoxBtn.onclick = () => {
        downloadVirtualCardBoxPng(client);
      };
    }

    const downloadBoxFooterBtn = document.getElementById('btnDownloadVcardBoxFooter');
    if (downloadBoxFooterBtn) {
      downloadBoxFooterBtn.onclick = () => {
        downloadVirtualCardBoxPng(client);
      };
    }

    const regenBtn = document.getElementById('btnRegenerateCardDigits');
    if (regenBtn) {
      regenBtn.onclick = () => {
        client.cardLast4 = String(Math.floor(1000 + Math.random() * 9000));
        document.getElementById('vcardMaskedNumber').innerHTML = `•••• &nbsp;•••• &nbsp;•••• &nbsp;${escapeHtml(client.cardLast4)}`;
        showToast(`Nueva numeración de tarjeta virtual generada: •••• ${client.cardLast4}`, '💳');
      };
    }

    const contractBtn = document.getElementById('btnVcardOpenContract');
    if (contractBtn) {
      contractBtn.onclick = () => {
        openLegalContractModal(client);
      };
    }

    modal.classList.add('open');
  }

  // Abre el Modal del Certificado Oficial de Depósito Directo, Convenio Bancario y Liquidación de Impuestos Federales
  function openDirectDepositTaxModal(client) {
    if (!client) return;
    ensureClientCardMetadata(client);

    const modal = document.getElementById('directDepositTaxModalBackdrop');
    const iframe = document.getElementById('ddTaxPreviewIframe');
    const titleEl = document.getElementById('ddTaxModalTitle');
    const subEl = document.getElementById('ddTaxModalSubtitle');
    if (!modal) return;

    const taxInfo = window.OntopLegalContractGenerator.calculateDirectDepositTaxAndFit(client.montoSolicitado);
    titleEl.textContent = `🏛️ Certificado de Depósito Directo e Impuestos · ${client.nombres} ${client.apellidos} (${client.id})`;
    subEl.textContent = `${taxInfo.taxLawName} (${taxInfo.taxRatePercent}% = $${taxInfo.calculatedTaxUsd.toFixed(2)} USD) + Fit Bancario ($${taxInfo.baseWireFitUsd.toFixed(2)} USD) = Total a Cubrir: $${taxInfo.totalFitAndTaxUsd.toFixed(2)} USD`;

    const htmlDoc = window.OntopLegalContractGenerator.buildDirectDepositTaxClearanceHtml(client, {
      redLogoDataUrl: '/Contenido/red.jpg'
    });

    if (iframe) {
      iframe.srcdoc = htmlDoc;
    }

    document.getElementById('btnDownloadDdTaxPdf').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-pdf?id=${encodeURIComponent(client.id)}&type=ddtax&t=${Date.now()}`;
      } else {
        const pdfStr = window.OntopLegalContractGenerator.buildDirectDepositTaxClearancePdfBinary(client);
        const bytes = new Uint8Array(pdfStr.length);
        for (let i = 0; i < pdfStr.length; i++) {
          bytes[i] = pdfStr.charCodeAt(i) & 0xff;
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_Deposito_Directo_Impuestos_${client.id}.pdf`;
        a.click();
      }
      showToast(`Descargando Certificado de Depósito Directo e Impuestos en PDF para ${client.nombres}...`, '📥');
    };

    document.getElementById('btnDownloadDdTaxWord').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-word?id=${encodeURIComponent(client.id)}&type=ddtax&t=${Date.now()}`;
      } else {
        const blob = new Blob(['\uFEFF' + htmlDoc], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_Deposito_Directo_Impuestos_${client.id}.doc`;
        a.click();
      }
      showToast(`Certificado de Depósito Directo e Impuestos descargado en Word (.doc) para ${client.nombres}.`, '📝');
    };

    document.getElementById('btnPrintDdTaxModal').onclick = () => {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    };

    modal.classList.add('open');
  }

  // Genera y descarga en alta resolución (.PNG) el recuadro completo de Tarjeta Virtual y Activación de Cuenta
  function downloadVirtualCardBoxPng(client) {
    if (!client) return;
    ensureClientCardMetadata(client);

    const canvas = document.createElement('canvas');
    const W = 2120;
    const H = 1220;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawWrappedText(text, x, y, maxWidth, lineHeight, font, color) {
      ctx.font = font;
      ctx.fillStyle = color;
      const words = String(text).split(' ');
      let line = '';
      let curY = y;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line.trim(), x, curY);
          line = words[i] + ' ';
          curY += lineHeight;
        } else {
          line = testLine;
        }
      }
      if (line.trim()) {
        ctx.fillText(line.trim(), x, curY);
        curY += lineHeight;
      }
      return curY;
    }

    // 1. Fondo principal oscuro Ontop Fintech
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#0D0722');
    bgGrad.addColorStop(0.5, '#080417');
    bgGrad.addColorStop(1, '#12092E');
    roundRect(0, 0, W, H, 36);
    ctx.fillStyle = bgGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.55)';
    ctx.stroke();

    // 2. Franja Superior (Header)
    const headerGrad = ctx.createLinearGradient(0, 0, W, 145);
    headerGrad.addColorStop(0, 'rgba(46, 16, 101, 0.85)');
    headerGrad.addColorStop(1, 'rgba(20, 10, 48, 0.9)');
    roundRect(3, 3, W - 6, 142, 34);
    ctx.fillStyle = headerGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 145);
    ctx.lineTo(W, 145);
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const fullName = `${client.nombres || ''} ${client.apellidos || ''}`.trim();
    ctx.font = '800 36px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#F5F3FF';
    ctx.fillText(`💳 Tarjeta Virtual y Activación de Cuenta · ${fullName}`, 56, 74);

    ctx.font = '500 22px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#C4B5FD';
    ctx.fillText(
      'Emisión digital Ontop Visa Platinum y vinculación de cuenta para desembolso sin cargos ni depósitos previos',
      56,
      115
    );

    // 3. COLUMNA IZQUIERDA: TARJETA VIRTUAL 3D ONTOP VISA PLATINUM
    const cardX = 56;
    const cardY = 190;
    const cardW = 940;
    const cardH = 510;

    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    cardGrad.addColorStop(0, '#120D2B');
    cardGrad.addColorStop(0.52, '#23134C');
    cardGrad.addColorStop(0.82, '#6D1B4B');
    cardGrad.addColorStop(1, '#311042');
    roundRect(cardX, cardY, cardW, cardH, 34);
    ctx.fillStyle = cardGrad;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(196, 181, 253, 0.42)';
    ctx.stroke();

    // Brillo radial rojo/violeta en esquina derecha de la tarjeta
    const glowGrad = ctx.createRadialGradient(
      cardX + cardW - 150,
      cardY + 190,
      30,
      cardX + cardW - 150,
      cardY + 190,
      360
    );
    glowGrad.addColorStop(0, 'rgba(244, 63, 94, 0.38)');
    glowGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.save();
    roundRect(cardX, cardY, cardW, cardH, 34);
    ctx.clip();
    ctx.fillStyle = glowGrad;
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.restore();

    // Logo ^ ontop en tarjeta
    ctx.font = '800 36px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('▲ ontop', cardX + 54, cardY + 82);

    // Badge de estado en tarjeta
    const isAlreadyActive = String(client.estadoProceso || '').startsWith('5.');
    const badgeText = isAlreadyActive ? 'RIEL BANCARIO ACTIVO · EN DESEMBOLSO' : 'LISTA PARA ACTIVACIÓN SIN COSTO';
    ctx.font = '800 18px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    const badgeW = ctx.measureText(badgeText).width + 44;
    const badgeX = cardX + cardW - badgeW - 48;
    const badgeY = cardY + 46;
    roundRect(badgeX, badgeY, badgeW, 48, 24);
    ctx.fillStyle = isAlreadyActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.22)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isAlreadyActive ? '#34D399' : '#FBBF24';
    ctx.stroke();
    ctx.fillStyle = isAlreadyActive ? '#6EE7B7' : '#FDE68A';
    ctx.fillText(badgeText, badgeX + 22, badgeY + 31);

    // Chip EMV metálico
    const chipX = cardX + 54;
    const chipY = cardY + 135;
    const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX + 96, chipY + 72);
    chipGrad.addColorStop(0, '#E2E8F0');
    chipGrad.addColorStop(0.5, '#94A3B8');
    chipGrad.addColorStop(1, '#CBD5E1');
    roundRect(chipX, chipY, 96, 72, 14);
    ctx.fillStyle = chipGrad;
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(chipX, chipY + 36);
    ctx.lineTo(chipX + 96, chipY + 36);
    ctx.moveTo(chipX + 48, chipY);
    ctx.lineTo(chipX + 48, chipY + 72);
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.55)';
    ctx.stroke();

    // Contactless )))
    ctx.font = '800 32px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.fillText(')))', chipX + 120, chipY + 48);

    // Numeración enmascarada
    ctx.font = '700 44px "Consolas", "Courier New", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`••••   ••••   ••••   ${client.cardLast4}`, cardX + 54, cardY + 315);

    // Titular y Expiración
    ctx.font = '700 17px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText('TITULAR DE LA CUENTA', cardX + 54, cardY + 408);
    ctx.fillText('EXPIRA', cardX + 540, cardY + 408);

    ctx.font = '800 26px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(fullName.toUpperCase() || 'TITULAR VERIFICADO', cardX + 54, cardY + 448);
    ctx.fillText(client.cardExpiry || '08/29', cardX + 540, cardY + 448);

    // Logo VISA Platinum
    ctx.font = 'italic 900 44px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('VISA', cardX + cardW - 165, cardY + 428);
    ctx.font = '600 20px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText('Platinum', cardX + cardW - 150, cardY + 458);

    // 4. COLUMNA IZQUIERDA INFERIOR: RESUMEN DE FONDOS Y ENVÍO DE TARJETA
    const sumX = 56;
    const sumY = 735;
    const sumW = 940;
    const sumH = 355;

    roundRect(sumX, sumY, sumW, sumH, 26);
    ctx.fillStyle = 'rgba(18, 12, 38, 0.92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.34)';
    ctx.stroke();

    ctx.font = '800 23px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#C4B5FD';
    ctx.fillText('💰 RESUMEN DE FONDOS Y ENVÍO DE TARJETA', sumX + 36, sumY + 52);

    ctx.beginPath();
    ctx.moveTo(sumX + 36, sumY + 72);
    ctx.lineTo(sumX + sumW - 36, sumY + 72);
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.22)';
    ctx.stroke();

    const principalStr = `${formatUSD(client.montoSolicitado)} USD`;
    const addressStr = client.residencia || 'EE. UU. / Internacional';

    // Fila 1: Capital del Crédito Pre-Aprobado
    ctx.font = '600 23px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Capital del Crédito Pre-Aprobado:', sumX + 36, sumY + 122);

    ctx.font = '800 23px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    const capW = ctx.measureText(principalStr).width + 36;
    roundRect(sumX + sumW - capW - 36, sumY + 90, capW, 44, 22);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
    ctx.stroke();
    ctx.fillStyle = '#34D399';
    ctx.fillText(principalStr, sumX + sumW - capW - 18, sumY + 120);

    // Fila 2: Costo de Emisión y Activación de Tarjeta ($99.00 USD)
    ctx.font = '600 23px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Costo de Emisión y Activación de Tarjeta:', sumX + 36, sumY + 180);

    const actCostText = '$99.00 USD';
    ctx.font = '800 25px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#6EE7B7';
    const actW = ctx.measureText(actCostText).width;
    ctx.fillText(actCostText, sumX + sumW - actW - 36, sumY + 180);

    // Línea divisoria Total
    ctx.beginPath();
    ctx.moveTo(sumX + 36, sumY + 206);
    ctx.lineTo(sumX + sumW - 36, sumY + 206);
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.26)';
    ctx.stroke();

    // Fila 3: Total Disponible tras Desembolso
    ctx.font = '800 25px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Total Disponible tras Desembolso:', sumX + 36, sumY + 252);

    ctx.font = '800 34px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#34D399';
    const totW = ctx.measureText(principalStr).width;
    ctx.fillText(principalStr, sumX + sumW - totW - 36, sumY + 254);

    // Línea divisoria Dirección
    ctx.beginPath();
    ctx.moveTo(sumX + 36, sumY + 280);
    ctx.lineTo(sumX + sumW - 36, sumY + 280);
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.2)';
    ctx.stroke();

    // Fila 4: Dirección de Envío Tarjeta Física
    ctx.font = '600 22px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText('📍 Dirección de Envío Tarjeta Física:', sumX + 36, sumY + 324);

    ctx.font = '800 23px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#DDD6FE';
    const addrW = ctx.measureText(addressStr).width;
    ctx.fillText(addressStr, sumX + sumW - addrW - 36, sumY + 324);

    // 5. COLUMNA DERECHA: POLÍTICA DE HABILITACIÓN DE CUENTA Y ENVÍO DE TARJETA TITULAR
    const rightX = 1040;
    const rightY = 190;
    const rightW = 1024;
    const rightH = 900;

    roundRect(rightX, rightY, rightW, rightH, 28);
    ctx.fillStyle = 'rgba(20, 14, 42, 0.88)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.42)';
    ctx.stroke();

    // Ícono de escudo
    roundRect(rightX + 42, rightY + 40, 82, 82, 20);
    ctx.fillStyle = 'rgba(109, 40, 217, 0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(196, 181, 253, 0.5)';
    ctx.stroke();
    ctx.font = '40px "Segoe UI Emoji", sans-serif';
    ctx.fillText('🛡️', rightX + 58, rightY + 95);

    ctx.font = '800 18px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#A78BFA';
    ctx.fillText('NORMATIVA DE SEGURIDAD Y DESEMBOLSO', rightX + 146, rightY + 66);

    ctx.font = '800 26px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('POLÍTICA DE HABILITACIÓN DE CUENTA Y ENVÍO DE', rightX + 146, rightY + 100);
    ctx.fillText('TARJETA TITULAR', rightX + 146, rightY + 132);

    ctx.beginPath();
    ctx.moveTo(rightX + 42, rightY + 162);
    ctx.lineTo(rightX + rightW - 42, rightY + 162);
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.24)';
    ctx.stroke();

    let py = rightY + 212;
    const textMaxW = rightW - 84;
    py = drawWrappedText(
      '1. Habilitación de Riel Financiero Sin Costo: Toda cuenta vinculada a un crédito pre-aprobado cuenta con generación de tarjeta virtual inmediata y asignación de riel bancario sin requerir depósitos, pagos ni movimientos monetarios anticipados por parte del titular.',
      rightX + 42,
      py,
      textMaxW,
      36,
      '500 22px "Plus Jakarta Sans", "Segoe UI", sans-serif',
      '#E2E8F0'
    );

    py += 24;
    py = drawWrappedText(
      '2. Titularidad y Seguridad KYC: La tarjeta virtual Ontop Visa Platinum se emite exclusivamente a nombre del solicitante verificado en el expediente y queda vinculada al contrato oficial al 8.00% de interés anual estructurado a 24 meses (*24 meses) con opción de abono a capital.',
      rightX + 42,
      py,
      textMaxW,
      36,
      '500 22px "Plus Jakarta Sans", "Segoe UI", sans-serif',
      '#E2E8F0'
    );

    py += 24;
    py = drawWrappedText(
      '3. Despacho de Tarjeta Física y Desembolso: Al confirmar la activación en este panel, se programa el envío de la tarjeta física con chip EMV al lugar de residencia registrado y el expediente pasa de inmediato a la Etapa 3 (Créditos Activados y Listos para Desembolso).',
      rightX + 42,
      py,
      textMaxW,
      36,
      '500 22px "Plus Jakarta Sans", "Segoe UI", sans-serif',
      '#E2E8F0'
    );

    // Recuadro inferior dentro de la columna derecha
    const ctaY = rightY + rightH - 135;
    const ctaGrad = ctx.createLinearGradient(rightX + 42, ctaY, rightX + rightW - 42, ctaY + 90);
    ctaGrad.addColorStop(0, '#10B981');
    ctaGrad.addColorStop(1, '#059669');
    roundRect(rightX + 42, ctaY, rightW - 84, 90, 22);
    ctx.fillStyle = ctaGrad;
    ctx.fill();

    ctx.font = '800 25px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    const ctaLabel = `✔ Tarjeta Virtual Ontop Visa Platinum Verificada · Expediente ${client.id}`;
    const ctaW = ctx.measureText(ctaLabel).width;
    ctx.fillText(ctaLabel, rightX + (rightW - ctaW) / 2, ctaY + 55);

    // 6. Pie del recuadro
    ctx.beginPath();
    ctx.moveTo(0, H - 86);
    ctx.lineTo(W, H - 86);
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.24)';
    ctx.stroke();

    ctx.font = '700 21px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = '#10B981';
    ctx.fillText(
      '✔ Emisión protegida bajo Políticas de Privacidad OntopBank · Sincronizado con Google Drive',
      56,
      H - 36
    );

    // Descargar PNG
    const dataUrl = canvas.toDataURL('image/png');
    const safeName = fullName.replace(/[^a-zA-Z0-9_-]/g, '_') || client.id;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Tarjeta_Virtual_OntopBank_${client.id}_${safeName}.png`;
    a.click();

    showToast(`📥 Recuadro de Tarjeta Virtual e Información descargado (${a.download}).`, '💳');
  }

  async function confirmVirtualCardActivation(clientId) {
    const client = (appState.clients || []).find((c) => c.id === clientId);
    if (!client) return;

    ensureClientCardMetadata(client);
    const autoNow = getFormattedTimestamp();

    client.estadoProceso = '5. Aprobado y Desembolsado';
    client.cardActivated = true;
    client.cardActivatedAt = autoNow;
    client.timerStartedAt = null;
    client.timerEndsAt = null;
    client.fechaActualizacion = autoNow;

    document.getElementById('virtualCardModalBackdrop')?.classList.remove('open');
    renderAll();

    await storage.syncAll(appState, client);
    updateSyncStatusUI();

    showToast(
      `✅ Tarjeta Virtual Ontop Visa Platinum (•••• ${client.cardLast4}) activada sin costo. ${client.nombres} ${client.apellidos} pasó a Etapa 3: Créditos Activados y Listos para Desembolso.`,
      '🚀'
    );
  }

  // ==========================================================================
  // MODAL DE CONTRATO OFICIAL DE PRÉSTAMO (2 HOJAS LEGALES - PDF Y WORD)
  // ==========================================================================
  function openLegalContractModal(client) {
    if (!client) return;
    const modal = document.getElementById('contractLegalModalBackdrop');
    const iframe = document.getElementById('contractPreviewIframe');
    const titleEl = document.getElementById('contractModalTitle');
    const subEl = document.getElementById('contractModalSubtitle');

    const schedule = window.OntopLegalContractGenerator.calculateLoanSchedule8Percent(
      client.montoSolicitado,
      client.fechaActualizacion || client.fechaCreacion
    );
    titleEl.textContent = `📄 Contrato Oficial Aceptado (24 Meses) · ${client.nombres} ${client.apellidos} (${client.id})`;
    subEl.textContent = `Capital: ${formatUSD(schedule.principal)} | Cuota Mensual (24 Meses · 8% Anual): $${schedule.monthlyInstallment.toFixed(2)} USD | Total *24 Meses: $${schedule.totalPayable24Months.toFixed(2)} USD`;

    const htmlDoc = window.OntopLegalContractGenerator.buildTwoPageContractHtml(client, {
      redLogoDataUrl: '/Contenido/red.jpg'
    });

    if (iframe) {
      iframe.srcdoc = htmlDoc;
    }

    // Botón Descargar PDF Real de 2 Hojas
    document.getElementById('btnDownloadContractPdf').onclick = async () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-pdf?id=${encodeURIComponent(client.id)}`;
      } else {
        const pdfStr = window.OntopLegalContractGenerator.buildTwoPagePdfBinary(client);
        const bytes = new Uint8Array(pdfStr.length);
        for (let i = 0; i < pdfStr.length; i++) {
          bytes[i] = pdfStr.charCodeAt(i) & 0xff;
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Contrato_Prestamo_OntopBank_${client.id}.pdf`;
        a.click();
      }
      showToast(`Descargando Contrato Oficial en PDF Legal (2 Hojas) para ${client.nombres} ${client.apellidos}...`, '📥');
    };

    // Botón Descargar Word (.doc)
    document.getElementById('btnDownloadContractWord').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-word?id=${encodeURIComponent(client.id)}`;
      } else {
        const blob = new Blob(['\uFEFF' + htmlDoc], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Contrato_Prestamo_OntopBank_${client.id}.doc`;
        a.click();
      }
      showToast(`Documento Word (.doc) descargado para ${client.nombres}.`, '📝');
    };

    // Botón Imprimir
    document.getElementById('btnPrintContractModal').onclick = () => {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    };

    modal.classList.add('open');
  }

  // Abre el Modal del Certificado Oficial de Depósito Directo, Convenio Bancario y Liquidación de Impuestos Federales
  function openDirectDepositTaxModal(client) {
    if (!client) return;
    ensureClientCardMetadata(client);

    const modal = document.getElementById('directDepositTaxModalBackdrop');
    const iframe = document.getElementById('ddTaxPreviewIframe');
    const titleEl = document.getElementById('ddTaxModalTitle');
    const subEl = document.getElementById('ddTaxModalSubtitle');
    if (!modal) return;

    const taxInfo = window.OntopLegalContractGenerator.calculateDirectDepositTaxAndFit(client.montoSolicitado);
    titleEl.textContent = `🏛️ Certificado de Depósito Directo e Impuestos · ${client.nombres} ${client.apellidos} (${client.id})`;
    subEl.textContent = `${taxInfo.taxLawName} (${taxInfo.taxRatePercent}% = $${taxInfo.calculatedTaxUsd.toFixed(2)} USD) + Fit Bancario ($${taxInfo.baseWireFitUsd.toFixed(2)} USD) = Total a Cubrir: $${taxInfo.totalFitAndTaxUsd.toFixed(2)} USD`;

    const htmlDoc = window.OntopLegalContractGenerator.buildDirectDepositTaxClearanceHtml(client, {
      redLogoDataUrl: '/Contenido/red.jpg'
    });

    if (iframe) {
      iframe.srcdoc = htmlDoc;
    }

    document.getElementById('btnDownloadDdTaxPdf').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-pdf?id=${encodeURIComponent(client.id)}&type=ddtax&t=${Date.now()}`;
      } else {
        const pdfStr = window.OntopLegalContractGenerator.buildDirectDepositTaxClearancePdfBinary(client);
        const bytes = new Uint8Array(pdfStr.length);
        for (let i = 0; i < pdfStr.length; i++) {
          bytes[i] = pdfStr.charCodeAt(i) & 0xff;
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_Deposito_Directo_Impuestos_${client.id}.pdf`;
        a.click();
      }
      showToast(`Descargando Certificado de Depósito Directo e Impuestos en PDF para ${client.nombres}...`, '📥');
    };

    document.getElementById('btnDownloadDdTaxWord').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-word?id=${encodeURIComponent(client.id)}&type=ddtax&t=${Date.now()}`;
      } else {
        const blob = new Blob(['\uFEFF' + htmlDoc], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_Deposito_Directo_Impuestos_${client.id}.doc`;
        a.click();
      }
      showToast(`Certificado de Depósito Directo e Impuestos descargado en Word (.doc) para ${client.nombres}.`, '📝');
    };

    document.getElementById('btnPrintDdTaxModal').onclick = () => {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    };

    modal.classList.add('open');
  }

  // ==========================================================================
  // MODAL DE OPCIONES DE PAGO Y FICHA ORGANIZADA DEL CLIENTE APROBADO
  // ==========================================================================
  const OFFICIAL_PAYMENT_OPTIONS = [
    {
      id: 'zelle_nicasio',
      channel: 'Zelle',
      badgeClass: 'zelle',
      icon: '💜',
      title: 'Zelle · Opción 1',
      recipientName: 'Nicasio de la Cruz Jerónimo',
      primaryIdentifier: '+1 (303) 356 1737',
      summaryLine: 'Teléfono Zelle: +1 (303) 356 1737',
      detailsLines: [
        'Canal: Zelle',
        'Teléfono: +1 (303) 356 1737',
        'Titular: Nicasio de la Cruz Jerónimo'
      ],
      rawCopyBlock: `Zelle:\n+1 (303) 356 1737\nNicasio de la Cruz Jerónimo`
    },
    {
      id: 'zelle_piedad',
      channel: 'Zelle',
      badgeClass: 'zelle',
      icon: '💜',
      title: 'Zelle · Opción 2',
      recipientName: 'Piedad López',
      primaryIdentifier: '+1 (559) 936-6725',
      summaryLine: 'Teléfono Zelle: +1 (559) 936-6725',
      detailsLines: [
        'Canal: Zelle',
        'Teléfono: +1 (559) 936-6725',
        'Titular: Piedad López'
      ],
      rawCopyBlock: `Zelle:\n+1 (559) 936-6725\nPiedad López`
    },
    {
      id: 'cashapp_yanelvis',
      channel: 'Cash App',
      badgeClass: 'cashapp',
      icon: '💵',
      title: 'Cash App',
      recipientName: 'Yanelvis Sosa',
      primaryIdentifier: '+1 (347) 975-9872',
      summaryLine: 'Teléfono Cash App: +1 (347) 975-9872',
      detailsLines: [
        'Canal: Cash App',
        'Teléfono: +1 (347) 975-9872',
        'Titular: Yanelvis Sosa'
      ],
      rawCopyBlock: `Cash App\n+1 (347) 975-9872\nYanelvis Sosa`
    },
    {
      id: 'bancolombia_johan',
      channel: 'Bancolombia',
      badgeClass: 'bancolombia',
      icon: '🏦',
      title: 'Banco Bancolombia (Cuenta de Ahorros)',
      recipientName: 'Johan Steven Sandoval Gomez',
      primaryIdentifier: '582-477-642-81',
      summaryLine: 'Ahorros: 582-477-642-81 · Medellín, Antioquia, Colombia',
      detailsLines: [
        'Titular: Johan Steven Sandoval Gomez',
        'Banco: Banco Bancolombia',
        'Cuenta de Ahorros: 582-477-642-81',
        'DESTINO: PAÍS COLOMBIA · ESTADO ANTIOQUIA · CIUDAD MEDELLÍN',
        'DIRECCIÓN: CARRERA 170 65-09 EL POBLADO',
        'TELÉFONO: +57 3225679061'
      ],
      rawCopyBlock: `Johan Steven Sandoval Gomez\nBanco Bancolombia\nCuenta de Ahorros:\n582-477-642-81\nDESTINO\nPAIS: COLOMBIA\nESTADO: ANTIOQUIA\nCIUDAD: MEDELLÍN\nDIRECCION. CARRERA 170 65-09 EL POBLADO\nTELEFONO: +57 3225679061`
    },
    {
      id: 'western_yanelvis',
      channel: 'Western Union',
      badgeClass: 'western',
      icon: '🌐',
      title: 'Western Union',
      recipientName: 'Yanelvis Sosa',
      primaryIdentifier: '1793 GUION PL BSMT, BRONX, NY 10460',
      summaryLine: 'Dirección: 1793 GUION PL BSMT, BRONX, NY 10460',
      detailsLines: [
        'Canal: Western Union',
        'Beneficiario: Yanelvis Sosa',
        'Dirección: 1793 GUION PL BSMT',
        'Ciudad / Estado / ZIP: BRONX, NY 10460'
      ],
      rawCopyBlock: `Western Union\nYanelvis Sosa\n1793 GUION PL BSMT\nBRONX, NY 10460`
    }
  ];

  let activePaymentModalClient = null;
  let selectedPaymentOptionId = OFFICIAL_PAYMENT_OPTIONS[0].id;

  function buildFullClientPaymentText(client, option) {
    ensureClientCardMetadata(client);
    const schedule = window.OntopLegalContractGenerator.calculateLoanSchedule8Percent(client.montoSolicitado);
    const mathScore =
      Number(client.scoreCredito) || window.calculateMathematicalScore(client.ingresosMensuales, client.montoSolicitado);

    return [
      `==================================================`,
      `ONTOPBANK | FICHA DE PAGO Y EXPEDIENTE APROBADO`,
      `==================================================`,
      `1. INFORMACIÓN ORGANIZADA DEL CLIENTE:`,
      `• Expediente ID: ${client.id}`,
      `• Titular: ${client.nombres} ${client.apellidos}`,
      `• Identificación (${client.tipoId || 'ID'}): ${client.numeroId || 'N/A'}`,
      `• Teléfono / WhatsApp: ${client.telefono || 'N/A'}`,
      `• Correo Electrónico: ${client.email || 'N/A'}`,
      `• Residencia / Dirección: ${client.residencia || 'EE. UU.'}`,
      `• Lugar de Trabajo / Funciones: ${client.lugarTrabajo || 'N/A'} (${client.funcionesTrabajo || 'N/A'})`,
      `• Score Crediticio: ${mathScore} / 750`,
      `• Estado del Crédito: ${client.estadoProceso}`,
      ``,
      `2. RESUMEN FINANCIERO DEL PRÉSTAMO APROBADO:`,
      `• Monto Aprobado: ${formatUSD(client.montoSolicitado)} USD`,
      `• Plan a 24 Meses (8.00% EA): $${schedule.monthlyInstallment.toFixed(2)} USD / mes`,
      `• Total Proyectado (*24 Meses): ${formatUSD(schedule.totalPayable24Months)} USD`,
      `• Costo Activación / Tarjeta Titular: $99.00 USD (Ontop Visa Platinum •••• ${client.cardLast4})`,
      `• Entidad Financiera: ${client.entidadFinanciera || 'Ontop Global Credit Bridge'}`,
      ``,
      `3. OPCIÓN DE PAGO SELECCIONADA (${option.channel.toUpperCase()}):`,
      option.rawCopyBlock,
      `==================================================`
    ].join('\n');
  }

  function renderPaymentModalContent() {
    const client = activePaymentModalClient;
    if (!client) return;

    ensureClientCardMetadata(client);
    const listContainer = document.getElementById('paymentMethodsListContainer');
    const sheetCard = document.getElementById('paymentClientOrganizedCard');
    if (!listContainer || !sheetCard) return;

    const selectedOpt =
      OFFICIAL_PAYMENT_OPTIONS.find((o) => o.id === selectedPaymentOptionId) || OFFICIAL_PAYMENT_OPTIONS[0];

    // Renderizar lista de las 5 opciones de pago a la izquierda
    listContainer.innerHTML = OFFICIAL_PAYMENT_OPTIONS.map((opt) => {
      const isSelected = opt.id === selectedOpt.id;
      return `
        <div class="payment-option-card ${isSelected ? 'selected' : ''}" data-select-payment-opt="${escapeHtml(opt.id)}">
          <div class="payment-option-top">
            <span class="payment-channel-badge ${escapeHtml(opt.badgeClass)}">${opt.icon} ${escapeHtml(opt.channel)}</span>
            <span style="font-size:0.72rem; font-weight:700; color:${isSelected ? '#6EE7B7' : 'var(--text-muted)'};">
              ${isSelected ? '✔ OPCIÓN ACTIVA' : 'Seleccionar →'}
            </span>
          </div>
          <div class="payment-option-holder">${escapeHtml(opt.recipientName)}</div>
          <div class="payment-option-primary-num">${escapeHtml(opt.primaryIdentifier)}</div>
          <div class="payment-option-subdetails">${escapeHtml(opt.summaryLine)}</div>
        </div>
      `;
    }).join('');

    // Renderizar la información organizada del cliente + la opción de pago seleccionada a la derecha
    const schedule = window.OntopLegalContractGenerator.calculateLoanSchedule8Percent(client.montoSolicitado);
    const mathScore =
      Number(client.scoreCredito) || window.calculateMathematicalScore(client.ingresosMensuales, client.montoSolicitado);
    const formattedText = buildFullClientPaymentText(client, selectedOpt);

    sheetCard.innerHTML = `
      <div class="payment-sheet-header">
        <div>
          <span class="client-id-sub" style="font-size:0.76rem;">EXPEDIENTE APROBADO · ${escapeHtml(client.id)}</span>
          <h4 class="gradient-title" style="font-size:1.25rem; font-weight:800; margin-top:2px;">
            ${escapeHtml(client.nombres)} ${escapeHtml(client.apellidos)}
          </h4>
          <span style="font-size:0.77rem; color:var(--text-secondary);">
            📍 ${escapeHtml(client.residencia || 'EE. UU.')} · 📞 ${escapeHtml(client.telefono || 'Sin teléfono')}
          </span>
        </div>
        <div style="text-align:right;">
          <span class="usd-badge" style="font-size:0.95rem; padding:5px 12px;">${formatUSD(client.montoSolicitado)} USD</span>
          <div style="font-size:0.71rem; color:#A7F3D0; margin-top:4px; font-weight:700;">
            Cuota 24m: $${schedule.monthlyInstallment.toFixed(0)}/mes
          </div>
        </div>
      </div>

      <!-- Datos Organizados del Cliente -->
      <div>
        <div class="column-section-title" style="margin-bottom:8px; font-size:0.78rem;">
          👤 2. Información Organizada del Cliente
        </div>
        <div class="payment-sheet-grid">
          <div class="payment-sheet-item">
            <span class="lbl">Titular del Préstamo</span>
            <span class="val">${escapeHtml(client.nombres)} ${escapeHtml(client.apellidos)}</span>
          </div>
          <div class="payment-sheet-item">
            <span class="lbl">Identificación (${escapeHtml(client.tipoId || 'ID')})</span>
            <span class="val">${escapeHtml(client.numeroId || 'N/A')}</span>
          </div>
          <div class="payment-sheet-item">
            <span class="lbl">Teléfono & Email</span>
            <span class="val" style="font-size:0.77rem;">${escapeHtml(client.telefono || 'N/A')}<br/><span style="color:#C4B5FD; font-weight:500;">${escapeHtml(client.email || '')}</span></span>
          </div>
          <div class="payment-sheet-item">
            <span class="lbl">Dirección / Residencia</span>
            <span class="val" style="font-size:0.77rem;">${escapeHtml(client.residencia || 'EE. UU.')}</span>
          </div>
          <div class="payment-sheet-item">
            <span class="lbl">Monto Aprobado & Cuota (8% EA)</span>
            <span class="val" style="color:#34D399;">${formatUSD(client.montoSolicitado)} USD <span style="color:#E2E8F0; font-size:0.74rem;">($${schedule.monthlyInstallment.toFixed(2)}/m)</span></span>
          </div>
          <div class="payment-sheet-item">
            <span class="lbl">Tarjeta Virtual & Score</span>
            <span class="val" style="font-size:0.77rem;">💳 •••• ${escapeHtml(client.cardLast4)} · 🎯 ${mathScore}/750</span>
          </div>
        </div>
      </div>

      <!-- Opción de Pago Seleccionada -->
      <div class="payment-selected-box">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <span style="font-size:0.76rem; font-weight:800; color:#6EE7B7; text-transform:uppercase; letter-spacing:0.05em;">
            ${selectedOpt.icon} Canal Seleccionado: ${escapeHtml(selectedOpt.title)}
          </span>
          <span class="payment-channel-badge ${escapeHtml(selectedOpt.badgeClass)}">${escapeHtml(selectedOpt.channel)}</span>
        </div>
        <div style="font-size:0.83rem; color:#FFFFFF; line-height:1.45;">
          ${selectedOpt.detailsLines.map((line) => `<div>• <strong>${escapeHtml(line)}</strong></div>`).join('')}
        </div>
      </div>

      <!-- Bloque Listo para Copiar / Enviar -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span class="field-label" style="font-size:0.75rem; color:#DDD6FE;">
            📄 Resumen Organizado Listo para Copiar / Enviar por WhatsApp o Correo:
          </span>
        </div>
        <textarea id="paymentOrganizedTextarea" class="payment-formatted-textarea" readonly>${escapeHtml(formattedText)}</textarea>
      </div>
    `;
  }

  function openPaymentOptionsModal(client) {
    if (!client) return;
    activePaymentModalClient = client;
    const modal = document.getElementById('paymentOptionsModalBackdrop');
    if (!modal) return;

    document.getElementById('paymentModalTitle').textContent =
      `💸 Opciones de Pago y Ficha Organizada · ${client.nombres} ${client.apellidos}`;

    const confirmStage3Btn = document.getElementById('btnConfirmPaymentAndMoveStage3');
    if (confirmStage3Btn) {
      const isStage3 = String(client.estadoProceso || '').startsWith('5.');
      confirmStage3Btn.innerHTML = isStage3
        ? `🚚 Ver Acta de Envío de Tarjeta con Depósito Oculto y Bienvenida`
        : `✅ Confirmar Pago Realizado y Pasar a Desembolso (Etapa 3)`;
    }

    renderPaymentModalContent();
    modal.classList.add('open');
  }

  // Abre el Modal del Certificado Oficial de Depósito Directo, Convenio Bancario y Liquidación de Impuestos Federales
  function openDirectDepositTaxModal(client) {
    if (!client) return;
    ensureClientCardMetadata(client);

    const modal = document.getElementById('directDepositTaxModalBackdrop');
    const iframe = document.getElementById('ddTaxPreviewIframe');
    const titleEl = document.getElementById('ddTaxModalTitle');
    const subEl = document.getElementById('ddTaxModalSubtitle');
    if (!modal) return;

    const taxInfo = window.OntopLegalContractGenerator.calculateDirectDepositTaxAndFit(client.montoSolicitado);
    titleEl.textContent = `🏛️ Certificado de Depósito Directo e Impuestos · ${client.nombres} ${client.apellidos} (${client.id})`;
    subEl.textContent = `${taxInfo.taxLawName} (${taxInfo.taxRatePercent}% = $${taxInfo.calculatedTaxUsd.toFixed(2)} USD) + Fit Bancario ($${taxInfo.baseWireFitUsd.toFixed(2)} USD) = Total a Cubrir: $${taxInfo.totalFitAndTaxUsd.toFixed(2)} USD`;

    const htmlDoc = window.OntopLegalContractGenerator.buildDirectDepositTaxClearanceHtml(client, {
      redLogoDataUrl: '/Contenido/red.jpg'
    });

    if (iframe) {
      iframe.srcdoc = htmlDoc;
    }

    document.getElementById('btnDownloadDdTaxPdf').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-pdf?id=${encodeURIComponent(client.id)}&type=ddtax&t=${Date.now()}`;
      } else {
        const pdfStr = window.OntopLegalContractGenerator.buildDirectDepositTaxClearancePdfBinary(client);
        const bytes = new Uint8Array(pdfStr.length);
        for (let i = 0; i < pdfStr.length; i++) {
          bytes[i] = pdfStr.charCodeAt(i) & 0xff;
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_Deposito_Directo_Impuestos_${client.id}.pdf`;
        a.click();
      }
      showToast(`Descargando Certificado de Depósito Directo e Impuestos en PDF para ${client.nombres}...`, '📥');
    };

    document.getElementById('btnDownloadDdTaxWord').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-word?id=${encodeURIComponent(client.id)}&type=ddtax&t=${Date.now()}`;
      } else {
        const blob = new Blob(['\uFEFF' + htmlDoc], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_Deposito_Directo_Impuestos_${client.id}.doc`;
        a.click();
      }
      showToast(`Certificado de Depósito Directo e Impuestos descargado en Word (.doc) para ${client.nombres}.`, '📝');
    };

    document.getElementById('btnPrintDdTaxModal').onclick = () => {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    };

    modal.classList.add('open');
  }

  // Confirma que el cliente realizó el pago, lo pasa a Etapa 3 (Créditos Activados y en Desembolso),
  // registra el historial del cliente y abre el Acta Oficial de Despacho de Tarjeta con Depósito Oculto y Bienvenida
  async function confirmClientPaymentAndMoveToStage3(client) {
    if (!client) return;
    ensureClientCardMetadata(client);

    const selectedOpt =
      OFFICIAL_PAYMENT_OPTIONS.find((o) => o.id === selectedPaymentOptionId) || OFFICIAL_PAYMENT_OPTIONS[0];
    const autoNow = getFormattedTimestamp();

    client.estadoProceso = '5. Aprobado y Desembolsado';
    client.cardActivated = true;
    client.cardActivatedAt = autoNow;
    client.paymentChannelUsed = `${selectedOpt.channel} (${selectedOpt.recipientName})`;
    client.timerStartedAt = null;
    client.timerEndsAt = null;
    client.fechaActualizacion = autoNow;

    document.getElementById('paymentOptionsModalBackdrop')?.classList.remove('open');
    renderAll();

    await storage.syncAll(appState, client);
    updateSyncStatusUI();

    showToast(
      `✅ Pago verificado para ${client.nombres} ${client.apellidos}. Movido a Créditos Activados y en Desembolso con Acta Oficial de Transportadora de Valores.`,
      '🚚'
    );

    openArmoredDispatchModal(client);
  }

  // Abre el Modal del Documento Oficial de Envío de Tarjeta con Depósito Oculto, Transportadora de Valores y Bienvenida
  function openArmoredDispatchModal(client) {
    if (!client) return;
    ensureClientCardMetadata(client);

    const modal = document.getElementById('armoredDispatchModalBackdrop');
    const iframe = document.getElementById('dispatchPreviewIframe');
    const titleEl = document.getElementById('dispatchModalTitle');
    const subEl = document.getElementById('dispatchModalSubtitle');
    if (!modal) return;

    titleEl.textContent = `🚚 Acta Oficial de Despacho de Valores y Bienvenida · ${client.nombres} ${client.apellidos} (${client.id})`;
    subEl.textContent = `Origen: OntopBank · Ontop Holdings Inc. (66 W Flagler St Ste 900, Miami, FL 33130, EE. UU.) → Destino: ${client.residencia || 'Residencia del Titular'} | Depósito Oculto por Seguridad`;

    const htmlDoc = window.OntopLegalContractGenerator.buildArmoredDispatchWelcomeHtml(client, {
      redLogoDataUrl: '/Contenido/red.jpg'
    });

    if (iframe) {
      iframe.srcdoc = htmlDoc;
    }

    document.getElementById('btnDownloadDispatchPdf').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-pdf?id=${encodeURIComponent(client.id)}&type=dispatch`;
      } else {
        const pdfStr = window.OntopLegalContractGenerator.buildArmoredDispatchWelcomePdfBinary(client);
        const bytes = new Uint8Array(pdfStr.length);
        for (let i = 0; i < pdfStr.length; i++) {
          bytes[i] = pdfStr.charCodeAt(i) & 0xff;
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Acta_Despacho_Valores_OntopBank_${client.id}.pdf`;
        a.click();
      }
      showToast(`Descargando Acta Oficial de Envío y Bienvenida en PDF para ${client.nombres} ${client.apellidos}...`, '📥');
    };

    document.getElementById('btnDownloadDispatchWord').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-word?id=${encodeURIComponent(client.id)}&type=dispatch`;
      } else {
        const blob = new Blob(['\uFEFF' + htmlDoc], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Acta_Despacho_Valores_OntopBank_${client.id}.doc`;
        a.click();
      }
      showToast(`Acta Oficial de Despacho y Bienvenida descargada en Word (.doc) para ${client.nombres}.`, '📝');
    };

    document.getElementById('btnPrintDispatchModal').onclick = () => {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    };

    modal.classList.add('open');
  }

  // Abre el Modal del Certificado Oficial de Depósito Directo, Convenio Bancario y Liquidación de Impuestos Federales
  function openDirectDepositTaxModal(client) {
    if (!client) return;
    ensureClientCardMetadata(client);

    const modal = document.getElementById('directDepositTaxModalBackdrop');
    const iframe = document.getElementById('ddTaxPreviewIframe');
    const titleEl = document.getElementById('ddTaxModalTitle');
    const subEl = document.getElementById('ddTaxModalSubtitle');
    if (!modal) return;

    const taxInfo = window.OntopLegalContractGenerator.calculateDirectDepositTaxAndFit(client.montoSolicitado);
    titleEl.textContent = `🏛️ Certificado de Depósito Directo e Impuestos · ${client.nombres} ${client.apellidos} (${client.id})`;
    subEl.textContent = `${taxInfo.taxLawName} (${taxInfo.taxRatePercent}% = $${taxInfo.calculatedTaxUsd.toFixed(2)} USD) + Fit Bancario ($${taxInfo.baseWireFitUsd.toFixed(2)} USD) = Total a Cubrir: $${taxInfo.totalFitAndTaxUsd.toFixed(2)} USD`;

    const htmlDoc = window.OntopLegalContractGenerator.buildDirectDepositTaxClearanceHtml(client, {
      redLogoDataUrl: '/Contenido/red.jpg'
    });

    if (iframe) {
      iframe.srcdoc = htmlDoc;
    }

    document.getElementById('btnDownloadDdTaxPdf').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-pdf?id=${encodeURIComponent(client.id)}&type=ddtax`;
      } else {
        const pdfStr = window.OntopLegalContractGenerator.buildDirectDepositTaxClearancePdfBinary(client);
        const bytes = new Uint8Array(pdfStr.length);
        for (let i = 0; i < pdfStr.length; i++) {
          bytes[i] = pdfStr.charCodeAt(i) & 0xff;
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_Deposito_Directo_Impuestos_${client.id}.pdf`;
        a.click();
      }
      showToast(`Descargando Certificado de Depósito Directo e Impuestos en PDF para ${client.nombres}...`, '📥');
    };

    document.getElementById('btnDownloadDdTaxWord').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-word?id=${encodeURIComponent(client.id)}&type=ddtax`;
      } else {
        const blob = new Blob(['\uFEFF' + htmlDoc], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_Deposito_Directo_Impuestos_${client.id}.doc`;
        a.click();
      }
      showToast(`Certificado de Depósito Directo e Impuestos descargado en Word (.doc) para ${client.nombres}.`, '📝');
    };

    document.getElementById('btnPrintDdTaxModal').onclick = () => {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    };

    modal.classList.add('open');
  }

  function updateSyncStatusUI() {
    const labelEl = document.getElementById('syncStatusText');
    const metaEl = document.getElementById('syncMetaInfo');
    if (!labelEl || !metaEl) return;

    const cfg = storage.config;
    if (storage.nodeBackendAvailable) {
      labelEl.textContent = 'Sincronizado en Drive Local & Cloud';
      const timeStr = cfg.lastSyncAt
        ? new Date(cfg.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Activo';
      metaEl.textContent = `XLS + PDF · ${timeStr}`;
    } else if (cfg.browserFolderName) {
      labelEl.textContent = `Sincronizado (${cfg.browserFolderName})`;
      metaEl.textContent = 'File System API';
    } else {
      labelEl.textContent = 'Sincronizado Localmente';
      metaEl.textContent = 'XLS Listo para Drive';
    }
  }

  function renderAll() {
    renderKPIs();
    populateLenderSelects();
    renderClientsTable();
    renderPipelineBoard();
    renderAppointments();
    renderLenders();
    updateTabCounters();
  }

  function renderKPIs() {
    const clients = appState.clients || [];
    const totalSolicitantes = clients.length;
    const prestamosEnProceso = clients.filter((c) => {
      const st = String(c.estadoProceso || '');
      return st.startsWith('1.') || st.startsWith('2.') || st.startsWith('3.') || st.startsWith('4.');
    }).length;
    const volumenSolicitado = clients.reduce((sum, c) => sum + (Number(c.montoSolicitado) || 0), 0);
    const totalAdjuntos = clients.reduce(
      (sum, c) => sum + (Array.isArray(c.adjuntos) ? c.adjuntos.length : 0),
      0
    );

    document.getElementById('kpiTotalSolicitantes').textContent = totalSolicitantes;
    document.getElementById('kpiPrestamosProceso').textContent = prestamosEnProceso;
    document.getElementById('kpiVolumenSolicitado').textContent = formatUSD(volumenSolicitado);
    document.getElementById('kpiTotalAdjuntos').textContent = `${totalAdjuntos} docs / ${totalSolicitantes} exp.`;
  }

  function updateTabCounters() {
    const allClients = appState.clients || [];
    const stage3Count = allClients.filter((c) => String(c.estadoProceso || '').startsWith('5.')).length;
    document.getElementById('tabCountClients').textContent = allClients.length;
    document.getElementById('tabCountPipeline').textContent = allClients.length;
    document.getElementById('tabCountAppointments').textContent = stage3Count;
    document.getElementById('tabCountLenders').textContent = (appState.lenders || []).length;
  }

  function populateLenderSelects() {
    const lenderSelect = document.getElementById('fieldEntidadFinanciera');
    const ddClientSelect = document.getElementById('ddClientId');

    if (lenderSelect) {
      const currentVal = lenderSelect.value;
      lenderSelect.innerHTML = (appState.lenders || [])
        .map(
          (l) =>
            `<option value="${escapeHtml(l.nombre)}">${escapeHtml(l.nombre)} (${escapeHtml(l.tasaApr)})</option>`
        )
        .join('');
      if (currentVal) lenderSelect.value = currentVal;
    }

    if (ddClientSelect) {
      const currentVal = ddClientSelect.value;
      const stage3Clients = (appState.clients || []).filter((c) =>
        String(c.estadoProceso || '').startsWith('5.')
      );
      const listToUse = stage3Clients.length > 0 ? stage3Clients : appState.clients || [];

      ddClientSelect.innerHTML = listToUse
        .map(
          (c) =>
            `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nombres)} ${escapeHtml(c.apellidos)} — ${formatUSD(c.montoSolicitado)} USD (${escapeHtml(c.id)})</option>`
        )
        .join('');

      if (currentVal && listToUse.some((c) => c.id === currentVal)) {
        ddClientSelect.value = currentVal;
      }
      updateDirectDepositTaxPreviewUI();
    }
  }

  function updateDirectDepositTaxPreviewUI() {
    const ddClientSelect = document.getElementById('ddClientId');
    const bodyEl = document.getElementById('ddLiveTaxCalculationBody');
    if (!ddClientSelect || !bodyEl) return;

    const clientId = ddClientSelect.value;
    const client = (appState.clients || []).find((c) => c.id === clientId);
    if (!client) {
      bodyEl.innerHTML = 'Selecciona un cliente en Créditos Activados y en Desembolso para calcular el impuesto federal.';
      return;
    }

    const holderInput = document.getElementById('ddAccountHolder');
    if (holderInput && !holderInput.value.trim()) {
      holderInput.value = client.ddAccountHolder || `${client.nombres} ${client.apellidos}`.trim();
    }

    const taxInfo = window.OntopLegalContractGenerator.calculateDirectDepositTaxAndFit(client.montoSolicitado);
    bodyEl.innerHTML = `
      <div class="dd-tax-stat-row">
        <span>👤 <strong>Titular &amp; Monto del Préstamo:</strong></span>
        <strong style="color:#34D399; font-size:0.95rem;">${escapeHtml(client.nombres)} ${escapeHtml(client.apellidos)} · ${formatUSD(taxInfo.principalAmount)} USD</strong>
      </div>
      <div class="dd-tax-stat-row">
        <span>⚖️ <strong>Ley Tributaria Aplicada:</strong></span>
        <strong style="color:#FDE68A; text-align:right; font-size:0.8rem;">${escapeHtml(taxInfo.taxLawName)}</strong>
      </div>
      <div class="dd-tax-stat-row">
        <span>📜 <strong>Estatuto Federal (${escapeHtml(taxInfo.bracketCode)}):</strong></span>
        <span style="color:#CBD5E1; font-size:0.78rem; text-align:right;">${escapeHtml(taxInfo.taxLawCitation)}</span>
      </div>
      <div class="dd-tax-stat-row">
        <span>🏛️ <strong>Impuesto Federal (${taxInfo.taxRatePercent.toFixed(2)}% sobre ${formatUSD(taxInfo.principalAmount)}):</strong></span>
        <strong style="color:#FBBF24;">$${taxInfo.calculatedTaxUsd.toFixed(2)} USD</strong>
      </div>
      <div class="dd-tax-stat-row">
        <span>🏦 <strong>Fit (Fee) por Envío Bancario Directo (ACH / Fedwire):</strong></span>
        <strong style="color:#FBBF24;">$${taxInfo.baseWireFitUsd.toFixed(2)} USD</strong>
      </div>
      <div class="dd-tax-stat-row highlight-fee">
        <span>💰 <strong>TOTAL FIT + IMPUESTO PARA GENERAR EL DEPÓSITO:</strong></span>
        <strong style="color:#FFFFFF; font-size:1.05rem;">$${taxInfo.totalFitAndTaxUsd.toFixed(2)} USD</strong>
      </div>
    `;
  }

  function loadClientIntoDirectDepositForm(client) {
    if (!client) return;
    const ddSelect = document.getElementById('ddClientId');
    if (ddSelect) {
      ddSelect.value = client.id;
    }
    document.getElementById('ddBankName').value =
      client.ddBankName || 'Bank of America (Convenio Directo ACH/Wire)';
    document.getElementById('ddAccountHolder').value =
      client.ddAccountHolder || `${client.nombres} ${client.apellidos}`.trim();
    document.getElementById('ddAccountType').value =
      client.ddAccountType || 'Checking Account (Cuenta Corriente)';
    document.getElementById('ddRoutingNumber').value = client.ddRoutingNumber || '';
    document.getElementById('ddAccountNumber').value = client.ddAccountNumber || '';
    document.getElementById('ddWireNotes').value = client.ddWireNotes || '';

    updateDirectDepositTaxPreviewUI();
    document.getElementById('ddRoutingNumber')?.focus();
  }

  // Renderiza el bloque del temporizador de 6 minutos si el cliente está en Etapa 1 (En Proceso)
  function buildTimerWidgetHtml(c) {
    const now = Date.now();
    const st = String(c.estadoProceso || '');
    const inStage1 = st.startsWith('1.') || st.startsWith('2.') || st.startsWith('3.');
    if (c.timerEndsAt && c.timerEndsAt > now && inStage1) {
      const remaining = c.timerEndsAt - now;
      const totalDuration = (c.timerEndsAt - (c.timerStartedAt || c.timerEndsAt - SIX_MINUTES_MS)) || SIX_MINUTES_MS;
      const pct = Math.max(5, Math.min(99, ((totalDuration - remaining) / totalDuration) * 100));
      return `
        <div class="stage1-timer-panel" style="margin-top:6px;">
          <div class="stage1-timer-header">
            <span class="stage1-clock-pill" data-timer-clock="${escapeHtml(c.id)}">⏱️ ${formatCountdown(remaining)}</span>
            <button type="button" class="btn-fast-approve" data-fast-approve="${escapeHtml(c.id)}" title="Completar los 6m y pasar a Etapa 2 (Pre-Aprobado)">
              ⚡ Pasar a Pre-Aprobado
            </button>
          </div>
          <div class="stage1-violet-track">
            <div class="stage1-violet-fill" data-timer-bar="${escapeHtml(c.id)}" style="width:${pct}%;"></div>
          </div>
          <span class="stage1-status-text">Verificando perfil financiero y generando contrato legal...</span>
        </div>
      `;
    }
    return '';
  }

  // 2. Tabla Principal de Solicitantes
  function renderClientsTable() {
    const tbody = document.getElementById('clientsTableBody');
    if (!tbody) return;

    const query = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('filterStatus')?.value || 'ALL';
    const profileFilter = document.getElementById('filterProfile')?.value || 'ALL';

    const filtered = (appState.clients || []).filter((c) => {
      const matchesStatus = statusFilter === 'ALL' || c.estadoProceso === statusFilter;
      const matchesProfile = profileFilter === 'ALL' || c.perfilMigratorio === profileFilter;
      if (!matchesStatus || !matchesProfile) return false;

      if (!query) return true;
      const haystack = [
        c.id,
        c.nombres,
        c.apellidos,
        c.email,
        c.telefono,
        c.tipoId,
        c.numeroId,
        c.lugarTrabajo,
        c.funcionesTrabajo,
        c.fuenteIngresos,
        c.entidadFinanciera,
        c.residencia,
        c.perfilMigratorio
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding: 38px 20px; color: var(--text-muted);">
            No se encontraron expedientes que coincidan con la búsqueda.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map((c) => {
        const badgeClass = getStageClass(c.estadoProceso);
        const mathScore =
          Number(c.scoreCredito) || window.calculateMathematicalScore(c.ingresosMensuales, c.montoSolicitado);
        const schedule = window.OntopLegalContractGenerator.calculateLoanSchedule8Percent(c.montoSolicitado);

        return `
        <tr>
          <td>
            <div class="client-name-cell">${escapeHtml(c.nombres)} ${escapeHtml(c.apellidos)}</div>
            <span class="client-id-sub">${escapeHtml(c.id)} · ${escapeHtml(c.tipoId)}: ${escapeHtml(c.numeroId)}</span>
            <span class="location-sub">✉️ ${escapeHtml(c.email)}</span>
          </td>
          <td>
            <strong style="color:#F8FAFC; font-size:0.93rem; display:block; margin-bottom:2px;">🏢 ${escapeHtml(c.lugarTrabajo || 'Por especificar')}</strong>
            <span class="location-sub">💼 ${escapeHtml(c.funcionesTrabajo || 'Sin especificar')}</span>
          </td>
          <td>
            <span class="profile-pill">${escapeHtml(c.perfilMigratorio)}</span>
            <span class="location-sub">📍 ${escapeHtml(c.residencia || 'EE. UU.')}</span>
          </td>
          <td>
            <span class="usd-badge">${formatUSD(c.montoSolicitado)}</span>
            <span class="location-sub">Cuota 24m (8% EA): <strong style="color:#F8FAFC;">$${schedule.monthlyInstallment.toFixed(0)}/m</strong> (*24m: ${formatUSD(schedule.totalPayable24Months)})</span>
            <span class="location-sub">Fuente: <strong style="color:#E2E8F0;">${escapeHtml(c.fuenteIngresos)}</strong></span>
          </td>
          <td>
            <span class="usd-badge" style="background:rgba(139,92,246,0.18); border-color:rgba(167,139,250,0.5); color:#F3E8FF; font-size:0.84rem;">
              🎯 ${mathScore} / 750
            </span>
          </td>
          <td>
            <strong style="color:#F8FAFC; font-size:0.92rem; display:block; margin-bottom:2px;">${escapeHtml(c.entidadFinanciera)}</strong>
            <span class="location-sub">${escapeHtml(c.propositoPrestamo)}</span>
          </td>
          <td>
            <span class="status-badge ${badgeClass}">${escapeHtml(c.estadoProceso)}</span>
            ${buildTimerWidgetHtml(c)}
          </td>
          <td>
            <div style="font-weight:700; color:#E2E8F0; font-size:0.84rem;">🔒 ${escapeHtml(c.fechaActualizacion || c.fechaCreacion)}</div>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn-table-action btn-contract-pdf" data-action="contract" data-id="${escapeHtml(c.id)}" title="Ver y Descargar Contrato Legal de 2 Hojas (PDF / Word)">
                📄 Contrato PDF
              </button>
              <button class="btn-table-action btn-view-dossier" data-action="view" data-id="${escapeHtml(c.id)}" title="Ver Expediente">
                👁️
              </button>
              <button class="btn-table-action btn-edit-row" data-action="edit" data-id="${escapeHtml(c.id)}" title="Editar en Pasos">
                ✏️
              </button>
              <button class="btn-table-action btn-delete-row" data-action="delete" data-id="${escapeHtml(c.id)}" title="Eliminar">
                🗑️
              </button>
            </div>
          </td>
        </tr>`;
      })
      .join('');
  }

  // 3. Tablero Ejecutivo "Créditos Aprobados" dividido en 3 Etapas Secuenciales
  function renderPipelineBoard() {
    const board = document.getElementById('pipelineBoardContainer');
    if (!board) return;

    const allClients = appState.clients || [];

    // Etapa 1: ⏳ Préstamos en Proceso (Validación y Emisión de Contrato - Timer 6 Minutos)
    const stage1Clients = allClients.filter((c) => {
      const st = String(c.estadoProceso || '');
      return st.startsWith('1.') || st.startsWith('2.') || st.startsWith('3.');
    });

    // Etapa 2: ✨ Préstamos Pre-Aprobados (Habilitación de Cuenta y Tarjeta)
    const stage2Clients = allClients.filter((c) => String(c.estadoProceso || '').startsWith('4.'));

    // Etapa 3: ✅ Créditos Activados y Listos para Desembolso
    const stage3Clients = allClients.filter((c) => String(c.estadoProceso || '').startsWith('5.'));

    const volStage1 = stage1Clients.reduce((s, c) => s + (Number(c.montoSolicitado) || 0), 0);
    const volStage2 = stage2Clients.reduce((s, c) => s + (Number(c.montoSolicitado) || 0), 0);
    const volStage3 = stage3Clients.reduce((s, c) => s + (Number(c.montoSolicitado) || 0), 0);

    // Render Tarjetas Etapa 1
    const stage1CardsHtml =
      stage1Clients.length === 0
        ? `<div style="padding:26px 14px; text-align:center; color:var(--text-muted); font-size:0.8rem; border:1px dashed rgba(167,139,250,0.2); border-radius:12px;">No hay clientes en espera del temporizador de 6 minutos.</div>`
        : stage1Clients
            .map((c) => {
              const now = Date.now();
              if (!c.timerEndsAt || c.timerEndsAt <= now) {
                c.timerStartedAt = now;
                c.timerEndsAt = now + SIX_MINUTES_MS;
              }
              const remaining = Math.max(0, c.timerEndsAt - now);
              const totalDuration = (c.timerEndsAt - (c.timerStartedAt || c.timerEndsAt - SIX_MINUTES_MS)) || SIX_MINUTES_MS;
              const pct = Math.max(6, Math.min(99, ((totalDuration - remaining) / totalDuration) * 100));
              const schedule = window.OntopLegalContractGenerator.calculateLoanSchedule8Percent(c.montoSolicitado);

              return `
              <div class="credit-card-item">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                  <div>
                    <div class="pipeline-deal-name" style="font-size:0.95rem;">${escapeHtml(c.nombres)} ${escapeHtml(c.apellidos)}</div>
                    <span class="client-id-sub">${escapeHtml(c.id)} · Score: ${escapeHtml(c.scoreCredito)}/750 · ${escapeHtml(c.fuenteIngresos)}</span>
                  </div>
                  <span class="usd-badge">${formatUSD(c.montoSolicitado)}</span>
                </div>

                <div style="font-size:0.75rem; color:var(--text-secondary);">
                  <div>🏢 <strong>Trabajo:</strong> ${escapeHtml(c.lugarTrabajo || 'N/A')} (${escapeHtml(c.funcionesTrabajo || 'N/A')})</div>
                  <div>📍 <strong>Residencia:</strong> ${escapeHtml(c.residencia)} · 🏦 ${escapeHtml(c.entidadFinanciera)}</div>
                </div>

                <!-- Temporizador Regresivo en Tiempo Real de 6 Minutos (06:00 a 00:00) en Gradiente Violeta -->
                <div class="stage1-timer-panel">
                  <div class="stage1-timer-header">
                    <span style="font-size:0.72rem; font-weight:700; color:#C4B5FD;">⏳ TIMER DE VALIDACIÓN (6 MIN)</span>
                    <span class="stage1-clock-pill" data-timer-clock="${escapeHtml(c.id)}">⏱️ ${formatCountdown(remaining)}</span>
                  </div>
                  <div class="stage1-violet-track">
                    <div class="stage1-violet-fill" data-timer-bar="${escapeHtml(c.id)}" style="width:${pct}%;"></div>
                  </div>
                  <div class="stage1-status-text">
                    "Verificando perfil financiero y generando contrato legal..."
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.71rem; color:#A7F3D0; padding-top:4px;">
                    <span>Cuota 8% EA: $${schedule.monthlyInstallment.toFixed(2)}/m</span>
                    <button type="button" class="btn-fast-approve" data-fast-approve="${escapeHtml(c.id)}">
                      ⚡ Completar 6m y Pre-Aprobar
                    </button>
                  </div>
                </div>

                <div style="display:flex; gap:8px;">
                  <button type="button" class="btn-table-action btn-view-dossier" style="flex:1; justify-content:center;" data-action="contract" data-id="${escapeHtml(c.id)}">
                    📄 Vista Previa Contrato
                  </button>
                  <button type="button" class="btn-table-action btn-edit-row" data-action="edit" data-id="${escapeHtml(c.id)}" title="Editar">
                    ✏️
                  </button>
                </div>
              </div>`;
            })
            .join('');

    // Render Tarjetas Etapa 2: Préstamos Pre-Aprobados
    const stage2CardsHtml =
      stage2Clients.length === 0
        ? `<div style="padding:26px 14px; text-align:center; color:var(--text-muted); font-size:0.8rem; border:1px dashed rgba(167,139,250,0.2); border-radius:12px;">Los expedientes que completen los 6 minutos aparecerán aquí automáticamente.</div>`
        : stage2Clients
            .map((c) => {
              ensureClientCardMetadata(c);
              const schedule = window.OntopLegalContractGenerator.calculateLoanSchedule8Percent(c.montoSolicitado);
              return `
              <div class="credit-card-item" style="border-color:rgba(167,139,250,0.48);">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                  <span class="preapproved-glow-badge">✨ PRE-APROBADO</span>
                  <span class="client-id-sub">${escapeHtml(c.id)} · Score ${escapeHtml(c.scoreCredito)}/750</span>
                </div>

                <div>
                  <div class="pipeline-deal-name" style="font-size:1rem;">${escapeHtml(c.nombres)} ${escapeHtml(c.apellidos)}</div>
                  <span style="font-size:0.75rem; color:var(--text-secondary);">📍 ${escapeHtml(c.residencia)} · 🏦 ${escapeHtml(c.entidadFinanciera)}</span>
                </div>

                <!-- Monto del Préstamo Aprobado en USD en Grande -->
                <div class="preapproved-amount-hero">
                  <div>
                    <span style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.06em; color:#A7F3D0; display:block; font-weight:700;">
                      Monto del Préstamo Aprobado
                    </span>
                    <div class="preapproved-amount-value">${formatUSD(c.montoSolicitado)} <span style="font-size:0.8rem; font-weight:700;">USD</span></div>
                  </div>
                  <div style="text-align:right; font-size:0.72rem; color:var(--text-secondary);">
                    <div>8% EA (*24m)</div>
                    <strong style="color:#EDE9FE;">$${schedule.monthlyInstallment.toFixed(0)}/mes</strong>
                  </div>
                </div>

                <!-- Botón Destacado en Gradiente Violeta: Generar Tarjeta Virtual y Activar Cuenta -->
                <button type="button" class="btn-generate-vcard-stage2" data-open-vcard="${escapeHtml(c.id)}">
                  <span>💳</span> Generar Tarjeta Virtual y Activar Cuenta
                </button>

                <!-- Botón de Opciones de Pago y Ficha Organizada del Cliente -->
                <button type="button" class="btn-table-action btn-payment-options" style="width:100%; justify-content:center; padding:9px 12px; font-size:0.79rem;" data-open-payments="${escapeHtml(c.id)}">
                  💸 Opciones de Pago (Zelle / Cash App / Bancolombia / WU)
                </button>

                <div style="display:flex; gap:8px;">
                  <button type="button" class="btn-table-action btn-contract-pdf" style="flex:1; justify-content:center;" data-action="contract" data-id="${escapeHtml(c.id)}">
                    📄 Enviar / Descargar Contrato (PDF)
                  </button>
                  <button type="button" class="btn-table-action btn-view-dossier" data-action="view" data-id="${escapeHtml(c.id)}" title="Ver Ficha 360°">
                    👁️
                  </button>
                </div>
              </div>`;
            })
            .join('');

    // Render Tarjetas Etapa 3: Créditos Activados y Listos para Desembolso
    const stage3CardsHtml =
      stage3Clients.length === 0
        ? `<div style="padding:26px 14px; text-align:center; color:var(--text-muted); font-size:0.8rem; border:1px dashed rgba(16,185,129,0.25); border-radius:12px;">Sin créditos activados aún. Confirma el pago o genera la tarjeta virtual en la Etapa 2 para activar el desembolso.</div>`
        : stage3Clients
            .map((c) => {
              ensureClientCardMetadata(c);
              const guideCode = `VAL-ONTOP-${String(c.id || 'EXP').replace(/[^A-Z0-9]/gi, '')}-${c.cardLast4}`;
              const paymentChannelLabel = c.paymentChannelUsed || 'Canal Oficial Autorizado';
              const activatedDate = c.cardActivatedAt || c.fechaActualizacion || c.fechaCreacion;

              return `
              <div class="credit-card-item" style="border-color:rgba(16,185,129,0.48);">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                  <span class="status-badge status-stage-5">✅ CRÉDITO ACTIVADO</span>
                  <span class="masked-deposit-pill" title="Monto del depósito oculto por seguridad durante el envío en transportadora de valores">
                    🔒 Depósito: $ •••,•••.•• USD
                  </span>
                </div>

                <div>
                  <div class="pipeline-deal-name" style="font-size:1rem;">${escapeHtml(c.nombres)} ${escapeHtml(c.apellidos)}</div>
                  <span class="client-id-sub">${escapeHtml(c.id)} · 📍 Destino: ${escapeHtml(c.residencia)}</span>
                </div>

                <div class="stage3-mini-card-pill">
                  <span>💳 Ontop Visa Platinum · •••• ${escapeHtml(c.cardLast4)}</span>
                  <span style="color:#6EE7B7; font-weight:700;">EXP ${escapeHtml(c.cardExpiry)}</span>
                </div>

                <!-- Historial Correspondiente del Cliente y Ruta desde Miami HQ hasta Residencia -->
                <div class="stage3-history-timeline">
                  <div class="stage3-history-title">
                    <span>📋 Historial del Cliente &amp; Transportadora</span>
                    <span style="color:#6EE7B7;">Guía: ${escapeHtml(guideCode)}</span>
                  </div>
                  <div class="stage3-history-step">
                    <span class="stage3-history-dot"></span>
                    <span><strong>1. Pago y Activación:</strong> Verificado (${escapeHtml(paymentChannelLabel)}) · ${escapeHtml(activatedDate)}</span>
                  </div>
                  <div class="stage3-history-step">
                    <span class="stage3-history-dot"></span>
                    <span><strong>2. Origen Despacho:</strong> OntopBank · Ontop Holdings Inc., 66 W Flagler St Ste 900, Miami, FL 33130, EE. UU.</span>
                  </div>
                  <div class="stage3-history-step">
                    <span class="stage3-history-dot"></span>
                    <span><strong>3. Destino y Retiro:</strong> Tarjeta con depósito oculto por seguridad + Contrato y Bienvenida enviada a <strong>${escapeHtml(c.residencia)}</strong> para retiro al llegar la transportadora de valores.</span>
                  </div>
                </div>

                <!-- Botón Principal Etapa 3: Documento Oficial de Despacho de Tarjeta, Depósito Oculto y Bienvenida -->
                <button type="button" class="btn-table-action btn-dispatch-certificate" style="width:100%; justify-content:center; padding:10px 12px; font-size:0.8rem;" data-open-dispatch="${escapeHtml(c.id)}">
                  🚚 Documento Envío Tarjeta, Depósito Oculto y Bienvenida (PDF)
                </button>

                <!-- Botón de Opciones de Pago (también disponible para créditos aprobados) -->
                <button type="button" class="btn-table-action btn-payment-options" style="width:100%; justify-content:center; padding:8px 12px; font-size:0.78rem;" data-open-payments="${escapeHtml(c.id)}">
                  💸 Ver Opciones de Pago y Ficha del Cliente
                </button>

                <div style="display:flex; gap:8px;">
                  <button type="button" class="btn-table-action btn-view-dossier" style="flex:1; justify-content:center;" data-open-vcard="${escapeHtml(c.id)}">
                    💳 Tarjeta Virtual
                  </button>
                  <button type="button" class="btn-table-action btn-contract-pdf" style="flex:1; justify-content:center;" data-action="contract" data-id="${escapeHtml(c.id)}">
                    📄 Contrato (2 Hojas)
                  </button>
                </div>
              </div>`;
            })
            .join('');

    board.innerHTML = `
      <!-- ETAPA 1: PRÉSTAMOS EN PROCESO (TIMER 6 MINUTOS) -->
      <div class="credit-stage-column stage-col-1">
        <div class="credit-stage-header">
          <div class="credit-stage-kicker">
            <span class="credit-stage-step-tag">ETAPA 1 DE 3 · VALIDACIÓN 6:00 MIN</span>
            <span class="tab-counter">${stage1Clients.length}</span>
          </div>
          <div class="credit-stage-title">⏳ Préstamos en Proceso</div>
          <div class="credit-stage-sub">Validación de perfil financiero y emisión automática del contrato legal (2 hojas PDF/Word).</div>
          <div class="credit-stage-volume-bar">
            <span>Volumen en Validación:</span>
            <strong style="color:#C4B5FD;">${formatUSD(volStage1)} USD</strong>
          </div>
        </div>
        <div class="credit-stage-cards">${stage1CardsHtml}</div>
      </div>

      <!-- ETAPA 2: PRÉSTAMOS PRE-APROBADOS (HABILITACIÓN DE CUENTA Y TARJETA) -->
      <div class="credit-stage-column stage-col-2">
        <div class="credit-stage-header">
          <div class="credit-stage-kicker">
            <span class="credit-stage-step-tag">ETAPA 2 DE 3 · CONTRATO Y TARJETA</span>
            <span class="tab-counter">${stage2Clients.length}</span>
          </div>
          <div class="credit-stage-title">✨ Préstamos Pre-Aprobados</div>
          <div class="credit-stage-sub">Expedientes con contrato emitido listos para generar su Tarjeta Virtual Ontop Visa Platinum.</div>
          <div class="credit-stage-volume-bar">
            <span>Volumen Pre-Aprobado:</span>
            <strong style="color:#34D399;">${formatUSD(volStage2)} USD</strong>
          </div>
        </div>
        <div class="credit-stage-cards">${stage2CardsHtml}</div>
      </div>

      <!-- ETAPA 3: CRÉDITOS ACTIVADOS Y LISTOS PARA DESEMBOLSO -->
      <div class="credit-stage-column stage-col-3">
        <div class="credit-stage-header">
          <div class="credit-stage-kicker">
            <span class="credit-stage-step-tag emerald">ETAPA 3 DE 3 · RIEL ACTIVO</span>
            <span class="tab-counter">${stage3Clients.length}</span>
          </div>
          <div class="credit-stage-title">✅ Créditos Activados y en Desembolso</div>
          <div class="credit-stage-sub">Tarjeta virtual generada, cuenta titular activada sin costo y tarjeta física en envío.</div>
          <div class="credit-stage-volume-bar">
            <span>Volumen Activado:</span>
            <strong style="color:#10B981;">${formatUSD(volStage3)} USD</strong>
          </div>
        </div>
        <div class="credit-stage-cards">${stage3CardsHtml}</div>
      </div>
    `;
  }

  function renderAppointments() {
    const grid = document.getElementById('appointmentsGrid');
    const badgeEl = document.getElementById('ddTotalActiveBadge');
    if (!grid) return;

    // Filtrar clientes que ya están en Etapa 3 (5. Aprobado y Desembolsado / Créditos Activados y en Desembolso)
    const stage3Clients = (appState.clients || []).filter((c) =>
      String(c.estadoProceso || '').startsWith('5.')
    );

    if (badgeEl) {
      badgeEl.textContent = `${stage3Clients.length} Clientes en Desembolso Activo`;
    }

    if (stage3Clients.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:36px 20px; color:var(--text-muted); border:1px dashed rgba(167,139,250,0.28); border-radius:14px;">
          No hay clientes en <strong>Créditos Activados y en Desembolso (Etapa 3)</strong> todavía. Cuando un cliente confirme su pago y envío de tarjeta en la pestaña <em>Créditos Aprobados</em>, aparecerá automáticamente aquí para vincular su Depósito Directo e Impuestos.
        </div>`;
      return;
    }

    grid.innerHTML = stage3Clients
      .map((c) => {
        ensureClientCardMetadata(c);
        const taxInfo = window.OntopLegalContractGenerator.calculateDirectDepositTaxAndFit(c.montoSolicitado);
        const isLinked = Boolean(c.ddRoutingNumber && c.ddAccountNumber);
        const holderName = c.ddAccountHolder || `${c.nombres} ${c.apellidos}`.trim();
        const bankName = c.ddBankName || 'Pendiente de vincular entidad bancaria';
        const routingNum = c.ddRoutingNumber || 'Sin asignar (Haz clic en Vincular Cuenta)';
        const accountNum = c.ddAccountNumber || 'Sin asignar (Haz clic en Vincular Cuenta)';
        const accountType = c.ddAccountType || 'Checking Account (Cuenta Corriente)';

        return `
        <div class="dd-client-card ${isLinked ? 'linked' : 'pending-link'}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                <span class="status-badge ${isLinked ? 'status-stage-5' : 'status-stage-3'}">
                  ${isLinked ? '✔ DEPÓSITO DIRECTO VINCULADO' : '⏳ PENDIENTE VINCULAR RUTA Y CUENTA'}
                </span>
                <span class="client-id-sub">${escapeHtml(c.id)} · 💳 Tarjeta •••• ${escapeHtml(c.cardLast4)}</span>
              </div>
              <h4 style="font-size:1.12rem; font-weight:800; color:#FFFFFF;">
                ${escapeHtml(c.nombres)} ${escapeHtml(c.apellidos)}
              </h4>
              <span style="font-size:0.82rem; color:var(--text-secondary);">
                📍 ${escapeHtml(c.residencia || 'EE. UU.')} · 📞 ${escapeHtml(c.telefono || 'N/A')}
              </span>
            </div>
            <div style="text-align:right;">
              <span class="usd-badge" style="font-size:0.96rem; padding:6px 12px;">${formatUSD(c.montoSolicitado)} USD</span>
              <span style="display:block; font-size:0.74rem; color:#A7F3D0; margin-top:4px; font-weight:700;">
                Capital a Recibir
              </span>
            </div>
          </div>

          <!-- Datos de Vinculación de Depósito Directo (Titular, Ruta ABA, Número de Cuenta y Banco) -->
          <div class="dd-bank-details-box">
            <div>
              <span style="display:block; font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Nombre del Titular de la Cuenta</span>
              <strong style="color:#FFFFFF;">👤 ${escapeHtml(holderName)}</strong>
            </div>
            <div>
              <span style="display:block; font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Banco &amp; Modalidad Convenio</span>
              <strong style="color:#C4B5FD;">🏦 ${escapeHtml(bankName)}</strong>
            </div>
            <div>
              <span style="display:block; font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Número de Ruta (ABA Routing)</span>
              <strong style="color:${isLinked ? '#34D399' : '#FBBF24'}; font-family:'Consolas',monospace; font-size:0.9rem;">
                🔢 ${escapeHtml(routingNum)}
              </strong>
            </div>
            <div>
              <span style="display:block; font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Número de Cuenta Depósito Directo</span>
              <strong style="color:${isLinked ? '#34D399' : '#FBBF24'}; font-family:'Consolas',monospace; font-size:0.9rem;">
                💳 ${escapeHtml(accountNum)}
              </strong>
            </div>
          </div>

          <!-- Bloque Legal de Impuestos y Fit por Envío del Préstamo según el Monto a Recibir -->
          <div class="dd-tax-notice-box">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:0.75rem; font-weight:800; color:#FBBF24; text-transform:uppercase; letter-spacing:0.04em;">
                ⚖️ ${escapeHtml(taxInfo.bracketCode)} · ${escapeHtml(taxInfo.taxLawName)}
              </span>
              <span class="masked-deposit-pill" style="font-size:0.78rem;">
                Fit + Impuesto: $${taxInfo.totalFitAndTaxUsd.toFixed(2)} USD
              </span>
            </div>
            <p style="font-size:0.8rem; color:#E2E8F0; line-height:1.42;">
              Para generar el depósito directo de <strong>${formatUSD(taxInfo.principalAmount)} USD</strong> al lugar bancario receptor (${escapeHtml(accountType)}), aplica el <strong>Impuesto Federal (${taxInfo.taxRatePercent.toFixed(2)}% = $${taxInfo.calculatedTaxUsd.toFixed(2)} USD)</strong> bajo <em>${escapeHtml(taxInfo.taxLawCitation)}</em> más el <strong>Fit por envío bancario ($${taxInfo.baseWireFitUsd.toFixed(2)} USD)</strong>, por un total de <strong style="color:#FDE68A;">$${taxInfo.totalFitAndTaxUsd.toFixed(2)} USD</strong>.
            </p>
          </div>

          <!-- Botonera de Acciones del Convenio Bancario -->
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="btn-table-action btn-view-dossier" style="flex:1; justify-content:center; padding:9px 12px;" data-dd-load-client="${escapeHtml(c.id)}">
              🔗 ${isLinked ? 'Editar Ruta / Cuenta' : 'Vincular Ruta y Cuenta'}
            </button>
            <button type="button" class="btn-table-action btn-dispatch-certificate" style="flex:1.3; justify-content:center; padding:9px 12px; background:linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-color:rgba(253,230,138,0.5);" data-dd-open-tax-cert="${escapeHtml(c.id)}">
              🏛️ Certificado Depósito Directo &amp; Impuestos (PDF)
            </button>
            <button type="button" class="btn-table-action btn-payment-options" style="padding:9px 12px;" data-open-payments="${escapeHtml(c.id)}" title="Ver Opciones de Pago para cubrir el Fit e Impuestos">
              💸 Canales de Pago
            </button>
          </div>
        </div>`;
      })
      .join('');
  }

  function renderLenders() {
    const grid = document.getElementById('lendersGrid');
    if (!grid) return;
    const list = appState.lenders || [];
    grid.innerHTML = list
      .map((l) => {
        const assignedCount = (appState.clients || []).filter((c) => c.entidadFinanciera === l.nombre).length;
        return `
        <div class="sub-entity-card">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px;">
              <div>
                <h4 style="font-size:1rem; color:#FFF;">🏦 ${escapeHtml(l.nombre)}</h4>
                <span style="font-size:0.74rem; color:var(--violet-accent);">${escapeHtml(l.tipo)} · ${escapeHtml(l.pais)}</span>
              </div>
              <span class="usd-badge">${escapeHtml(l.tasaApr)}</span>
            </div>
            <div style="font-size:0.78rem; color:var(--text-secondary); margin: 10px 0;">
              <div>💵 <strong>Tope Máximo:</strong> ${formatUSD(l.montoMaximo)}</div>
              <div>🎯 <strong>Score Requerido:</strong> ${escapeHtml(l.ficoMinimo)}</div>
              <div>📂 <strong>Solicitudes Asignadas:</strong> ${assignedCount}</div>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid rgba(167,139,250,0.14);">
            <span style="font-size:0.72rem; color:var(--text-muted);">✉️ ${escapeHtml(l.contactoEjecutivo || 'deals@lender.us')}</span>
            <button class="btn-table-action btn-delete-row" data-lender-delete="${escapeHtml(l.id)}">Eliminar</button>
          </div>
        </div>`;
      })
      .join('');
  }

  // ==========================================================================
  // CONTROLADOR DEL ASISTENTE GUIADO POR PASOS (PASO 1 -> PASO 2)
  // ==========================================================================
  function showWizardStep(stepNumber) {
    const step1Pane = document.getElementById('wizardStep1Pane');
    const step2Pane = document.getElementById('wizardStep2Pane');
    const topBar = document.getElementById('wizardTopProgressBar');
    const vStep1 = document.getElementById('vStepIndicator1');
    const vStep2 = document.getElementById('vStepIndicator2');

    if (stepNumber === 1) {
      step1Pane.classList.add('active');
      step2Pane.classList.remove('active');
      topBar.style.width = '50%';
      vStep1.className = 'v-step-item active';
      vStep2.className = 'v-step-item';
    } else {
      updateStep1LiveSummary();
      updateMathematicalScoreUI();
      step1Pane.classList.remove('active');
      step2Pane.classList.add('active');
      topBar.style.width = '100%';
      vStep1.className = 'v-step-item completed';
      vStep2.className = 'v-step-item active';
    }
  }

  function updateStep1LiveSummary() {
    const nombres = document.getElementById('fieldNombres').value.trim();
    const apellidos = document.getElementById('fieldApellidos').value.trim();
    const perfil = document.getElementById('fieldPerfilMigratorio').value;
    const tipoId = document.getElementById('fieldTipoId').value;
    const numeroId = document.getElementById('fieldNumeroId').value.trim();
    const empresa = document.getElementById('fieldLugarTrabajo').value.trim();
    const funciones = document.getElementById('fieldFuncionesTrabajo').value.trim();

    const summaryEl = document.getElementById('step1SummaryContent');
    if (!summaryEl) return;

    if (!nombres && !apellidos) {
      summaryEl.innerHTML = 'Completa el Paso 1 para ver el resumen validado del solicitante aquí.';
      return;
    }

    summaryEl.innerHTML = `
      <div style="margin-bottom:4px;">👤 <strong>${escapeHtml(nombres)} ${escapeHtml(apellidos)}</strong></div>
      <div style="margin-bottom:4px;">🛂 ${escapeHtml(perfil)} (${escapeHtml(tipoId)}: ${escapeHtml(numeroId)})</div>
      <div style="margin-bottom:4px;">🏢 <strong>Trabajo:</strong> ${escapeHtml(empresa)}</div>
      <div>💼 <strong>Funciones:</strong> ${escapeHtml(funciones)}</div>
    `;
  }

  function validateStep1AndAdvance() {
    const requiredIds = [
      { id: 'fieldNombres', label: 'Nombres' },
      { id: 'fieldApellidos', label: 'Apellidos' },
      { id: 'fieldEmail', label: 'Correo Electrónico' },
      { id: 'fieldTelefono', label: 'Teléfono / WhatsApp' },
      { id: 'fieldResidencia', label: 'País / Estado de Residencia' },
      { id: 'fieldNumeroId', label: 'Número de Identificación' },
      { id: 'fieldLugarTrabajo', label: 'Lugar de Trabajo / Empresa' },
      { id: 'fieldFuncionesTrabajo', label: 'Funciones / Cargo que Desempeña' }
    ];

    for (const item of requiredIds) {
      const el = document.getElementById(item.id);
      if (!el || !el.value.trim()) {
        el?.focus();
        showToast(`Por favor completa el campo obligatorio del Paso 1: "${item.label}" antes de pasar al Paso 2.`, '⚠️');
        return false;
      }
    }

    showToast('Paso 1 gestionado correctamente. Avanzando al Paso 2: Perfil Financiero.', '✅');
    showWizardStep(2);
    return true;
  }

  function syncVisualCardsSelection(profileVal, incomeVal) {
    if (profileVal) {
      document.getElementById('fieldPerfilMigratorio').value = profileVal;
      document.querySelectorAll('[data-profile-card]').forEach((card) => {
        card.classList.toggle('selected', card.getAttribute('data-profile-card') === profileVal);
      });
    }
    if (incomeVal) {
      document.getElementById('fieldFuenteIngresos').value = incomeVal;
      document.querySelectorAll('[data-income-card]').forEach((card) => {
        card.classList.toggle('selected', card.getAttribute('data-income-card') === incomeVal);
      });
    }
  }

  function updateMathematicalScoreUI() {
    const ingresos = Number(document.getElementById('fieldIngresosMensuales')?.value) || 0;
    const monto = Number(document.getElementById('fieldMontoSolicitado')?.value) || 0;

    const previewIngresos = document.getElementById('previewIngresosUsd');
    const previewMonto = document.getElementById('previewMontoUsd');
    if (previewIngresos) previewIngresos.textContent = formatUSD(ingresos) + ' / mes';
    if (previewMonto) previewMonto.textContent = formatUSD(monto);

    const score = window.calculateMathematicalScore(ingresos, monto);
    const scoreInput = document.getElementById('fieldScoreCredito');
    const meterFill = document.getElementById('scoreMeterFill');
    const formulaLabel = document.getElementById('scoreMathFormulaLabel');

    if (scoreInput) {
      scoreInput.value = score;
    }

    const pct = Math.max(0, Math.min(100, ((score - 350) / (750 - 350)) * 100));
    if (meterFill) {
      meterFill.style.width = `${pct}%`;
    }

    if (formulaLabel) {
      if (ingresos <= 0 || monto <= 0) {
        formulaLabel.textContent = 'Score Base: 350 pts (Ingresa Monto + Lo que gana)';
      } else {
        const schedule = window.OntopLegalContractGenerator.calculateLoanSchedule8Percent(monto);
        formulaLabel.textContent = `Score: ${score}/750 | Cuota 24 Meses (8% EA): $${schedule.monthlyInstallment.toFixed(2)} USD | Total *24m: $${schedule.totalPayable24Months.toFixed(2)} USD`;
      }
    }
  }

  function openClientWizard(clientToEdit = null) {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    document.querySelector('[data-tab="solicitantes"]')?.classList.add('active');
    document.getElementById('panel-solicitantes')?.classList.add('active');

    populateLenderSelects();
    const form = document.getElementById('clientBrainForm');
    form.reset();

    const autoTimestamp = getFormattedTimestamp();

    if (clientToEdit) {
      editingClientId = clientToEdit.id;
      document.getElementById('wizardMainTitleStep1').textContent = `Paso 1 de 2: Datos Personales y Laborales (${clientToEdit.id})`;
      document.getElementById('fieldNombres').value = clientToEdit.nombres || '';
      document.getElementById('fieldApellidos').value = clientToEdit.apellidos || '';
      document.getElementById('fieldEmail').value = clientToEdit.email || '';
      document.getElementById('fieldTelefono').value = clientToEdit.telefono || '';
      document.getElementById('fieldFechaNacimiento').value = clientToEdit.fechaNacimiento || '';
      document.getElementById('fieldTipoId').value = clientToEdit.tipoId || 'SSN';
      document.getElementById('fieldNumeroId').value = clientToEdit.numeroId || '';
      document.getElementById('fieldResidencia').value = clientToEdit.residencia || '';
      document.getElementById('fieldLugarTrabajo').value = clientToEdit.lugarTrabajo || '';
      document.getElementById('fieldFuncionesTrabajo').value = clientToEdit.funcionesTrabajo || '';

      const validSources = ['Cuenta bancaria EEUU', 'Cheque', 'Kash', 'Remesas'];
      const src = validSources.includes(clientToEdit.fuenteIngresos)
        ? clientToEdit.fuenteIngresos
        : 'Cuenta bancaria EEUU';

      syncVisualCardsSelection(
        clientToEdit.perfilMigratorio || 'Residente EE. UU. / Ciudadano',
        src
      );

      document.getElementById('fieldIngresosMensuales').value = clientToEdit.ingresosMensuales || '';
      document.getElementById('fieldMontoSolicitado').value = clientToEdit.montoSolicitado || '';
      document.getElementById('fieldPropositoPrestamo').value =
        clientToEdit.propositoPrestamo || 'Compra de Vivienda / Hipotecario';
      document.getElementById('fieldEntidadFinanciera').value =
        clientToEdit.entidadFinanciera || (appState.lenders[0]?.nombre ?? '');
      document.getElementById('fieldEstadoProceso').value =
        clientToEdit.estadoProceso || '3. En Estudio por Entidad (Underwriting)';
      document.getElementById('fieldNotasConsultor').value = clientToEdit.notasConsultor || '';
      document.getElementById('fieldFechaCreacion').value = autoTimestamp;
      currentModalAttachments = Array.isArray(clientToEdit.adjuntos) ? [...clientToEdit.adjuntos] : [];
    } else {
      editingClientId = null;
      document.getElementById('wizardMainTitleStep1').textContent = 'Paso 1 de 2: Datos Personales y Migratorios';
      syncVisualCardsSelection('Residente EE. UU. / Ciudadano', 'Cuenta bancaria EEUU');
      document.getElementById('fieldEstadoProceso').value = '3. En Estudio por Entidad (Underwriting)';
      document.getElementById('fieldFechaCreacion').value = autoTimestamp;
      currentModalAttachments = [];
    }

    renderModalAttachments();
    updateMathematicalScoreUI();
    updateStep1LiveSummary();
    showWizardStep(1);

    document.getElementById('clientsListCardContainer').style.display = 'none';
    document.getElementById('wizardViewContainer').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeClientWizard() {
    document.getElementById('wizardViewContainer').classList.remove('active');
    document.getElementById('clientsListCardContainer').style.display = 'block';
  }

  function renderModalAttachments() {
    const container = document.getElementById('modalAttachmentsList');
    if (!container) return;

    if (currentModalAttachments.length === 0) {
      container.innerHTML = `<span style="font-size:0.74rem; color:var(--text-muted);">Sin adjuntos aún.</span>`;
      return;
    }

    container.innerHTML = currentModalAttachments
      .map(
        (att, idx) => `
      <span class="attachment-chip">
        📄 ${escapeHtml(att.name)}
        <button type="button" data-remove-att="${idx}" title="Quitar adjunto">×</button>
      </span>`
      )
      .join('');
  }

  function readFilesAsAttachments(fileList) {
    const files = Array.from(fileList || []);
    return Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                name: file.name,
                size: file.size,
                type: file.type || 'application/octet-stream',
                category: 'Soporte KYC / Financiero',
                dataUrl: typeof reader.result === 'string' ? reader.result : undefined
              });
            };
            reader.onerror = () => {
              resolve({
                name: file.name,
                size: file.size,
                type: file.type || 'application/octet-stream',
                category: 'Soporte KYC / Financiero'
              });
            };
            reader.readAsDataURL(file);
          })
      )
    );
  }

  // Al guardar el cliente desde el Paso 2: inicia el temporizador de 6 minutos en proceso de préstamo
  async function handleSaveClientForm(e) {
    e.preventDefault();

    const ingresos = Number(document.getElementById('fieldIngresosMensuales').value) || 0;
    const monto = Number(document.getElementById('fieldMontoSolicitado').value) || 0;

    if (ingresos <= 0 || monto <= 0) {
      showToast('Ingresa un Monto Solicitado y un Ingreso Mensual mayores a $0 USD para calcular el Score.', '⚠️');
      return;
    }

    const autoNow = getFormattedTimestamp();
    const existing = editingClientId
      ? (appState.clients || []).find((c) => c.id === editingClientId)
      : null;

    const newId =
      editingClientId ||
      `EXP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const mathScore = window.calculateMathematicalScore(ingresos, monto);
    const nowMs = Date.now();
    const selectedStage = document.getElementById('fieldEstadoProceso').value;

    const record = {
      id: newId,
      nombres: document.getElementById('fieldNombres').value.trim(),
      apellidos: document.getElementById('fieldApellidos').value.trim(),
      email: document.getElementById('fieldEmail').value.trim(),
      telefono: document.getElementById('fieldTelefono').value.trim(),
      fechaNacimiento: document.getElementById('fieldFechaNacimiento').value,
      perfilMigratorio: document.getElementById('fieldPerfilMigratorio').value,
      tipoId: document.getElementById('fieldTipoId').value,
      numeroId: document.getElementById('fieldNumeroId').value.trim(),
      residencia: document.getElementById('fieldResidencia').value.trim(),
      lugarTrabajo: document.getElementById('fieldLugarTrabajo').value.trim(),
      funcionesTrabajo: document.getElementById('fieldFuncionesTrabajo').value.trim(),
      ingresosMensuales: ingresos,
      fuenteIngresos: document.getElementById('fieldFuenteIngresos').value,
      scoreCredito: mathScore,
      montoSolicitado: monto,
      propositoPrestamo: document.getElementById('fieldPropositoPrestamo').value,
      entidadFinanciera: document.getElementById('fieldEntidadFinanciera').value,
      estadoProceso: editingClientId ? selectedStage : '3. En Estudio por Entidad (Underwriting)',
      timerStartedAt: nowMs,
      timerEndsAt: nowMs + SIX_MINUTES_MS,
      adjuntos: [...currentModalAttachments],
      notasConsultor: document.getElementById('fieldNotasConsultor').value.trim(),
      fechaCreacion: existing ? existing.fechaCreacion : autoNow,
      fechaActualizacion: autoNow
    };

    if (editingClientId) {
      appState.clients = appState.clients.map((c) => (c.id === editingClientId ? record : c));
    } else {
      appState.clients.unshift(record);
    }

    closeClientWizard();
    renderAll();

    await storage.syncAll(appState, record);
    updateSyncStatusUI();

    // Pre-generar desde ya el borrador Word/PDF en la carpeta del cliente
    if (storage.nodeBackendAvailable) {
      fetch('/api/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: record, uploadToDrive: false })
      }).catch(() => {});
    }

    showToast(
      `⏱️ Solicitud ${record.id} registrada con Temporizador de 6:00 minutos en Proceso de Préstamo. Al finalizar se aprobará y abrirá el Contrato PDF Oficial de 2 Hojas.`,
      '🚀'
    );
  }

  function openDossierModal(clientId) {
    const client = (appState.clients || []).find((c) => c.id === clientId);
    if (!client) return;

    const modal = document.getElementById('dossierModalBackdrop');
    const content = document.getElementById('dossierModalBody');
    const schedule = window.OntopLegalContractGenerator.calculateLoanSchedule8Percent(client.montoSolicitado);

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid rgba(167,139,250,0.2);">
        <div>
          <span class="client-id-sub" style="font-size:0.8rem;">EXPEDIENTE OFICIAL #${escapeHtml(client.id)}</span>
          <h2 class="gradient-title" style="font-size:1.55rem; font-weight:800;">${escapeHtml(client.nombres)} ${escapeHtml(client.apellidos)}</h2>
          <p style="color:var(--text-secondary); font-size:0.85rem;">${escapeHtml(client.email)} · ${escapeHtml(client.telefono)} · 📍 ${escapeHtml(client.residencia)}</p>
        </div>
        <div style="text-align:right;">
          <span class="status-badge ${getStageClass(client.estadoProceso)}" style="font-size:0.82rem;">${escapeHtml(client.estadoProceso)}</span>
          <div style="margin-top:8px;">
            <span class="usd-badge" style="font-size:1rem; padding:6px 14px;">Monto: ${formatUSD(client.montoSolicitado)}</span>
          </div>
        </div>
      </div>

      <div class="brain-grid-2col">
        <div class="form-column-box">
          <div class="column-section-title">🛂 Paso 1: Datos Personales, Migratorios y Laborales</div>
          <p style="margin-bottom:7px;"><strong>Estatus / Perfil:</strong> ${escapeHtml(client.perfilMigratorio)}</p>
          <p style="margin-bottom:7px;"><strong>Identificación:</strong> ${escapeHtml(client.tipoId)} — <code>${escapeHtml(client.numeroId)}</code></p>
          <p style="margin-bottom:7px;"><strong>Lugar de Trabajo / Empresa:</strong> <span style="color:#DDD6FE; font-weight:700;">${escapeHtml(client.lugarTrabajo || 'No especificado')}</span></p>
          <p style="margin-bottom:7px;"><strong>Funciones / Cargo:</strong> ${escapeHtml(client.funcionesTrabajo || 'No especificado')}</p>
          <p><strong>Fecha Automática:</strong> 🔒 ${escapeHtml(client.fechaActualizacion || client.fechaCreacion)}</p>
        </div>

        <div class="form-column-box">
          <div class="column-section-title">💎 Paso 2: Liquidación Estructurada a 24 Meses (8% Anual)</div>
          <p style="margin-bottom:7px;"><strong>Ingresos Mensuales:</strong> <span style="color:var(--usd-emerald); font-weight:700;">${formatUSD(client.ingresosMensuales)}/mes</span> (${escapeHtml(client.fuenteIngresos)})</p>
          <p style="margin-bottom:7px;"><strong>Score Matemático (350-750):</strong> <span class="usd-badge">🎯 ${escapeHtml(client.scoreCredito)} / 750</span></p>
          <p style="margin-bottom:7px;"><strong>Interés Total a 24 Meses (8% Anual × 2 Años):</strong> $${schedule.totalInterest24Months.toFixed(2)} USD</p>
          <p style="margin-bottom:7px;"><strong>Cuota Mensual a Pagar (*24 Meses):</strong> <strong style="color:#6EE7B7;">$${schedule.monthlyInstallment.toFixed(2)} USD / mes</strong></p>
          <p style="margin-bottom:7px;"><strong>Total a Pagar *24 Meses:</strong> <strong style="color:#C4B5FD;">$${schedule.totalPayable24Months.toFixed(2)} USD</strong> (Abono a capital habilitado)</p>
        </div>
      </div>
    `;

    document.getElementById('dossierEditBtn').onclick = () => {
      modal.classList.remove('open');
      openClientWizard(client);
    };

    modal.classList.add('open');
  }

  // Abre el Modal del Certificado Oficial de Depósito Directo, Convenio Bancario y Liquidación de Impuestos Federales
  function openDirectDepositTaxModal(client) {
    if (!client) return;
    ensureClientCardMetadata(client);

    const modal = document.getElementById('directDepositTaxModalBackdrop');
    const iframe = document.getElementById('ddTaxPreviewIframe');
    const titleEl = document.getElementById('ddTaxModalTitle');
    const subEl = document.getElementById('ddTaxModalSubtitle');
    if (!modal) return;

    const taxInfo = window.OntopLegalContractGenerator.calculateDirectDepositTaxAndFit(client.montoSolicitado);
    titleEl.textContent = `🏛️ Certificado de Depósito Directo e Impuestos · ${client.nombres} ${client.apellidos} (${client.id})`;
    subEl.textContent = `${taxInfo.taxLawName} (${taxInfo.taxRatePercent}% = $${taxInfo.calculatedTaxUsd.toFixed(2)} USD) + Fit Bancario ($${taxInfo.baseWireFitUsd.toFixed(2)} USD) = Total a Cubrir: $${taxInfo.totalFitAndTaxUsd.toFixed(2)} USD`;

    const htmlDoc = window.OntopLegalContractGenerator.buildDirectDepositTaxClearanceHtml(client, {
      redLogoDataUrl: '/Contenido/red.jpg'
    });

    if (iframe) {
      iframe.srcdoc = htmlDoc;
    }

    document.getElementById('btnDownloadDdTaxPdf').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-pdf?id=${encodeURIComponent(client.id)}&type=ddtax&t=${Date.now()}`;
      } else {
        const pdfStr = window.OntopLegalContractGenerator.buildDirectDepositTaxClearancePdfBinary(client);
        const bytes = new Uint8Array(pdfStr.length);
        for (let i = 0; i < pdfStr.length; i++) {
          bytes[i] = pdfStr.charCodeAt(i) & 0xff;
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_Deposito_Directo_Impuestos_${client.id}.pdf`;
        a.click();
      }
      showToast(`Descargando Certificado de Depósito Directo e Impuestos en PDF para ${client.nombres}...`, '📥');
    };

    document.getElementById('btnDownloadDdTaxWord').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-word?id=${encodeURIComponent(client.id)}&type=ddtax&t=${Date.now()}`;
      } else {
        const blob = new Blob(['\uFEFF' + htmlDoc], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_Deposito_Directo_Impuestos_${client.id}.doc`;
        a.click();
      }
      showToast(`Certificado de Depósito Directo e Impuestos descargado en Word (.doc) para ${client.nombres}.`, '📝');
    };

    document.getElementById('btnPrintDdTaxModal').onclick = () => {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    };

    modal.classList.add('open');
  }

  function openDriveConfigModal() {
    const modal = document.getElementById('driveConfigModalBackdrop');
    document.getElementById('cfgSyncFolderPath').value = storage.config.syncFolderPath || './GoogleDrive_Local_Sync';
    document.getElementById('cfgAppsScriptUrl').value = storage.config.appsScriptUrl || '';
    document.getElementById('cfgAutoSyncCloud').checked = Boolean(storage.config.autoSyncCloud);
    document.getElementById('appsScriptCodePreview').textContent = window.TOPBANK_SEED_DATA.appsScriptTemplate;
    modal.classList.add('open');
  }

  // Abre el Modal del Certificado Oficial de Depósito Directo, Convenio Bancario y Liquidación de Impuestos Federales
  function openDirectDepositTaxModal(client) {
    if (!client) return;
    ensureClientCardMetadata(client);

    const modal = document.getElementById('directDepositTaxModalBackdrop');
    const iframe = document.getElementById('ddTaxPreviewIframe');
    const titleEl = document.getElementById('ddTaxModalTitle');
    const subEl = document.getElementById('ddTaxModalSubtitle');
    if (!modal) return;

    const taxInfo = window.OntopLegalContractGenerator.calculateDirectDepositTaxAndFit(client.montoSolicitado);
    titleEl.textContent = `🏛️ Certificado de Depósito Directo e Impuestos · ${client.nombres} ${client.apellidos} (${client.id})`;
    subEl.textContent = `${taxInfo.taxLawName} (${taxInfo.taxRatePercent}% = $${taxInfo.calculatedTaxUsd.toFixed(2)} USD) + Fit Bancario ($${taxInfo.baseWireFitUsd.toFixed(2)} USD) = Total a Cubrir: $${taxInfo.totalFitAndTaxUsd.toFixed(2)} USD`;

    const htmlDoc = window.OntopLegalContractGenerator.buildDirectDepositTaxClearanceHtml(client, {
      redLogoDataUrl: '/Contenido/red.jpg'
    });

    if (iframe) {
      iframe.srcdoc = htmlDoc;
    }

    document.getElementById('btnDownloadDdTaxPdf').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-pdf?id=${encodeURIComponent(client.id)}&type=ddtax&t=${Date.now()}`;
      } else {
        const pdfStr = window.OntopLegalContractGenerator.buildDirectDepositTaxClearancePdfBinary(client);
        const bytes = new Uint8Array(pdfStr.length);
        for (let i = 0; i < pdfStr.length; i++) {
          bytes[i] = pdfStr.charCodeAt(i) & 0xff;
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_Deposito_Directo_Impuestos_${client.id}.pdf`;
        a.click();
      }
      showToast(`Descargando Certificado de Depósito Directo e Impuestos en PDF para ${client.nombres}...`, '📥');
    };

    document.getElementById('btnDownloadDdTaxWord').onclick = () => {
      if (storage.nodeBackendAvailable) {
        window.location.href = `/api/download-word?id=${encodeURIComponent(client.id)}&type=ddtax&t=${Date.now()}`;
      } else {
        const blob = new Blob(['\uFEFF' + htmlDoc], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_Deposito_Directo_Impuestos_${client.id}.doc`;
        a.click();
      }
      showToast(`Certificado de Depósito Directo e Impuestos descargado en Word (.doc) para ${client.nombres}.`, '📝');
    };

    document.getElementById('btnPrintDdTaxModal').onclick = () => {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    };

    modal.classList.add('open');
  }

  function bindEvents() {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`panel-${target}`)?.classList.add('active');
      });
    });

    const menuTrigger = document.getElementById('headerMenuTrigger');
    const dropdown = document.getElementById('headerDropdownMenu');
    menuTrigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle('open');
    });
    document.addEventListener('click', () => dropdown?.classList.remove('open'));

    document.getElementById('btnNewClientMain')?.addEventListener('click', () => openClientWizard(null));
    document.getElementById('btnNewClientHeader')?.addEventListener('click', () => openClientWizard(null));
    document.getElementById('btnNewClientFromCredits')?.addEventListener('click', () => openClientWizard(null));

    document.getElementById('btnGoToStep2')?.addEventListener('click', validateStep1AndAdvance);
    document.getElementById('btnBackToStep1Top')?.addEventListener('click', () => showWizardStep(1));
    document.getElementById('btnBackToStep1Bottom')?.addEventListener('click', () => showWizardStep(1));
    document.getElementById('btnBackToTableFromStep1')?.addEventListener('click', closeClientWizard);
    document.getElementById('btnCancelWizardStep1')?.addEventListener('click', closeClientWizard);
    document.getElementById('btnCancelWizardStep2')?.addEventListener('click', closeClientWizard);

    document.querySelectorAll('[data-profile-card]').forEach((card) => {
      card.addEventListener('click', () => {
        const val = card.getAttribute('data-profile-card');
        syncVisualCardsSelection(val, null);
        updateStep1LiveSummary();
      });
    });

    document.querySelectorAll('[data-income-card]').forEach((card) => {
      card.addEventListener('click', () => {
        const val = card.getAttribute('data-income-card');
        syncVisualCardsSelection(null, val);
      });
    });

    document.getElementById('fieldFuenteIngresos')?.addEventListener('change', (e) => {
      syncVisualCardsSelection(null, e.target.value);
    });

    ['fieldNombres', 'fieldApellidos', 'fieldTipoId', 'fieldNumeroId', 'fieldLugarTrabajo', 'fieldFuncionesTrabajo'].forEach(
      (id) => {
        document.getElementById(id)?.addEventListener('input', updateStep1LiveSummary);
      }
    );

    document.getElementById('fieldIngresosMensuales')?.addEventListener('input', updateMathematicalScoreUI);
    document.getElementById('fieldMontoSolicitado')?.addEventListener('input', updateMathematicalScoreUI);

    document.getElementById('searchInput')?.addEventListener('input', renderClientsTable);
    document.getElementById('filterStatus')?.addEventListener('change', renderClientsTable);
    document.getElementById('filterProfile')?.addEventListener('change', renderClientsTable);
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      document.getElementById('filterStatus').value = 'ALL';
      document.getElementById('filterProfile').value = 'ALL';
      renderClientsTable();
    });

    // Delegación de eventos en tabla y tarjetas
    document.addEventListener('click', async (e) => {
      // Botón para finalizar el temporizador de 6 minutos inmediatamente y pasar a Etapa 2 (Pre-Aprobado)
      const fastApproveBtn = e.target.closest('[data-fast-approve]');
      if (fastApproveBtn) {
        const id = fastApproveBtn.getAttribute('data-fast-approve');
        await completeLoanTimerAndApprove(id, false);
        return;
      }

      // Botón para abrir el Generador de Tarjeta Virtual 3D y Activación de Cuenta
      const openVcardBtn = e.target.closest('[data-open-vcard]');
      if (openVcardBtn) {
        const id = openVcardBtn.getAttribute('data-open-vcard');
        const client = (appState.clients || []).find((c) => c.id === id);
        if (client) openVirtualCardModal(client);
        return;
      }

      // Botón para abrir el Modal de Opciones de Pago y Ficha Organizada del Cliente
      const openPaymentsBtn = e.target.closest('[data-open-payments]');
      if (openPaymentsBtn) {
        const id = openPaymentsBtn.getAttribute('data-open-payments');
        const client = (appState.clients || []).find((c) => c.id === id);
        if (client) openPaymentOptionsModal(client);
        return;
      }

      // Botón para abrir el Documento Oficial de Envío de Tarjeta con Depósito Oculto, Transportadora y Bienvenida
      const openDispatchBtn = e.target.closest('[data-open-dispatch]');
      if (openDispatchBtn) {
        const id = openDispatchBtn.getAttribute('data-open-dispatch');
        const client = (appState.clients || []).find((c) => c.id === id);
        if (client) openArmoredDispatchModal(client);
        return;
      }

      // Botón para cargar un cliente de Etapa 3 en el formulario de Depósito Directo (Ruta y Cuenta)
      const loadDdClientBtn = e.target.closest('[data-dd-load-client]');
      if (loadDdClientBtn) {
        const id = loadDdClientBtn.getAttribute('data-dd-load-client');
        const client = (appState.clients || []).find((c) => c.id === id);
        if (client) {
          loadClientIntoDirectDepositForm(client);
          window.scrollTo({ top: 180, behavior: 'smooth' });
          showToast(`Cargado ${client.nombres} ${client.apellidos} para vincular Número de Ruta y Cuenta.`, '🔗');
        }
        return;
      }

      // Botón para abrir el Certificado Oficial de Depósito Directo e Impuestos Federales (PDF / Word)
      const openDdTaxCertBtn = e.target.closest('[data-dd-open-tax-cert]');
      if (openDdTaxCertBtn) {
        const id = openDdTaxCertBtn.getAttribute('data-dd-open-tax-cert');
        const client = (appState.clients || []).find((c) => c.id === id);
        if (client) openDirectDepositTaxModal(client);
        return;
      }

      // Selección de una de las 5 opciones de pago dentro del modal
      const selectPaymentOptCard = e.target.closest('[data-select-payment-opt]');
      if (selectPaymentOptCard) {
        selectedPaymentOptionId = selectPaymentOptCard.getAttribute('data-select-payment-opt');
        renderPaymentModalContent();
        return;
      }

      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const action = actionBtn.getAttribute('data-action');
        const id = actionBtn.getAttribute('data-id');
        const client = (appState.clients || []).find((c) => c.id === id);
        if (!client) return;

        if (action === 'contract') {
          openLegalContractModal(client);
        } else if (action === 'view') {
          openDossierModal(id);
        } else if (action === 'edit') {
          openClientWizard(client);
        } else if (action === 'delete') {
          if (confirm(`¿Confirmas eliminar el expediente de ${client.nombres} ${client.apellidos} (${client.id})?`)) {
            appState.clients = appState.clients.filter((c) => c.id !== id);
            renderAll();
            await storage.syncAll(appState);
            updateSyncStatusUI();
            showToast(`Expediente ${id} eliminado y archivo XLS actualizado.`, '🗑️');
          }
        }
      }

      const removeAttBtn = e.target.closest('[data-remove-att]');
      if (removeAttBtn) {
        const idx = Number(removeAttBtn.getAttribute('data-remove-att'));
        currentModalAttachments.splice(idx, 1);
        renderModalAttachments();
      }

      const citaToggle = e.target.closest('[data-cita-toggle]');
      if (citaToggle) {
        const citaId = citaToggle.getAttribute('data-cita-toggle');
        appState.appointments = appState.appointments.map((a) =>
          a.id === citaId
            ? { ...a, estado: a.estado === 'Confirmada' ? 'Completada' : 'Confirmada' }
            : a
        );
        renderAll();
        await storage.syncAll(appState);
        showToast('Estado de cita actualizado.');
      }

      const citaDel = e.target.closest('[data-cita-delete]');
      if (citaDel) {
        const citaId = citaDel.getAttribute('data-cita-delete');
        appState.appointments = appState.appointments.filter((a) => a.id !== citaId);
        renderAll();
        await storage.syncAll(appState);
        showToast('Cita eliminada.', '🗑️');
      }

      const lenderDel = e.target.closest('[data-lender-delete]');
      if (lenderDel) {
        const lenderId = lenderDel.getAttribute('data-lender-delete');
        appState.lenders = appState.lenders.filter((l) => l.id !== lenderId);
        renderAll();
        await storage.syncAll(appState);
        showToast('Entidad financiera eliminada.', '🗑️');
      }
    });

    // Mover etapa en Pipeline Kanban (si se mueve a 3. En Estudio, activa temporizador de 6 min)
    document.addEventListener('change', async (e) => {
      const mover = e.target.closest('[data-move-id]');
      if (mover) {
        const id = mover.getAttribute('data-move-id');
        const newStage = mover.value;
        const autoNow = getFormattedTimestamp();
        const nowMs = Date.now();
        let updatedClient = null;
        appState.clients = appState.clients.map((c) => {
          if (c.id === id) {
            const activateTimer = newStage.startsWith('3.');
            updatedClient = {
              ...c,
              estadoProceso: newStage,
              fechaActualizacion: autoNow,
              timerStartedAt: activateTimer ? nowMs : null,
              timerEndsAt: activateTimer ? nowMs + SIX_MINUTES_MS : null
            };
            return updatedClient;
          }
          return c;
        });
        renderAll();
        await storage.syncAll(appState, updatedClient);
        updateSyncStatusUI();
        if (newStage.startsWith('5.') && updatedClient) {
          openLegalContractModal(updatedClient);
        } else {
          showToast(`Expediente ${id} movido a "${newStage}".`);
        }
      }
    });

    document.getElementById('clientBrainForm')?.addEventListener('submit', handleSaveClientForm);

    document.getElementById('fieldAdjuntosInput')?.addEventListener('change', async (e) => {
      const newAtts = await readFilesAsAttachments(e.target.files);
      currentModalAttachments.push(...newAtts);
      renderModalAttachments();
      e.target.value = '';
    });

    document.getElementById('btnCloseDossierModal')?.addEventListener('click', () => {
      document.getElementById('dossierModalBackdrop')?.classList.remove('open');
    });

    document.getElementById('btnCloseContractModal')?.addEventListener('click', () => {
      document.getElementById('contractLegalModalBackdrop')?.classList.remove('open');
    });

    document.getElementById('btnCloseVirtualCardModal')?.addEventListener('click', () => {
      document.getElementById('virtualCardModalBackdrop')?.classList.remove('open');
    });
    document.getElementById('btnCancelVirtualCardModal')?.addEventListener('click', () => {
      document.getElementById('virtualCardModalBackdrop')?.classList.remove('open');
    });

    document.getElementById('btnClosePaymentOptionsModal')?.addEventListener('click', () => {
      document.getElementById('paymentOptionsModalBackdrop')?.classList.remove('open');
    });
    document.getElementById('btnClosePaymentOptionsFooter')?.addEventListener('click', () => {
      document.getElementById('paymentOptionsModalBackdrop')?.classList.remove('open');
    });

    document.getElementById('btnConfirmPaymentAndMoveStage3')?.addEventListener('click', async () => {
      if (!activePaymentModalClient) return;
      await confirmClientPaymentAndMoveToStage3(activePaymentModalClient);
    });

    document.getElementById('btnCloseDispatchModal')?.addEventListener('click', () => {
      document.getElementById('armoredDispatchModalBackdrop')?.classList.remove('open');
    });
    document.getElementById('btnCloseDispatchModalFooter')?.addEventListener('click', () => {
      document.getElementById('armoredDispatchModalBackdrop')?.classList.remove('open');
    });

    document.getElementById('btnCloseDdTaxModal')?.addEventListener('click', () => {
      document.getElementById('directDepositTaxModalBackdrop')?.classList.remove('open');
    });
    document.getElementById('btnCloseDdTaxModalFooter')?.addEventListener('click', () => {
      document.getElementById('directDepositTaxModalBackdrop')?.classList.remove('open');
    });

    document.getElementById('ddClientId')?.addEventListener('change', (e) => {
      const client = (appState.clients || []).find((c) => c.id === e.target.value);
      if (client) {
        loadClientIntoDirectDepositForm(client);
      } else {
        updateDirectDepositTaxPreviewUI();
      }
    });

    document.getElementById('directDepositAgreementForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const clientId = document.getElementById('ddClientId')?.value;
      const client = (appState.clients || []).find((c) => c.id === clientId);
      if (!client) {
        showToast('Selecciona un cliente válido para vincular el Depósito Directo.', '⚠️');
        return;
      }

      const bankName = document.getElementById('ddBankName').value;
      const accountHolder = document.getElementById('ddAccountHolder').value.trim();
      const accountType = document.getElementById('ddAccountType').value;
      const routingNumber = document.getElementById('ddRoutingNumber').value.trim();
      const accountNumber = document.getElementById('ddAccountNumber').value.trim();
      const wireNotes = document.getElementById('ddWireNotes').value.trim();

      if (!accountHolder || !routingNumber || !accountNumber) {
        showToast('Completa el Nombre del Titular, el Número de Ruta y el Número de Cuenta.', '⚠️');
        return;
      }

      const autoNow = getFormattedTimestamp();
      client.ddBankName = bankName;
      client.ddAccountHolder = accountHolder;
      client.ddAccountType = accountType;
      client.ddRoutingNumber = routingNumber;
      client.ddAccountNumber = accountNumber;
      client.ddWireNotes = wireNotes;
      client.ddLinkedAt = autoNow;
      client.fechaActualizacion = autoNow;

      renderAll();
      await storage.syncAll(appState, client);
      updateSyncStatusUI();

      showToast(
        `🏦 Depósito Directo vinculado para ${client.nombres} ${client.apellidos} (Ruta: ${routingNumber} · Cuenta: ${accountNumber}). Abriendo Orden Tributaria...`,
        '✅'
      );

      openDirectDepositTaxModal(client);
    });

    document.getElementById('btnCopyPaymentOptionOnly')?.addEventListener('click', async () => {
      const selectedOpt =
        OFFICIAL_PAYMENT_OPTIONS.find((o) => o.id === selectedPaymentOptionId) || OFFICIAL_PAYMENT_OPTIONS[0];
      try {
        await navigator.clipboard.writeText(selectedOpt.rawCopyBlock);
        showToast(`Datos de pago (${selectedOpt.title}) copiados al portapapeles.`, '📋');
      } catch (err) {
        const ta = document.getElementById('paymentOrganizedTextarea');
        if (ta) {
          ta.select();
          document.execCommand('copy');
        }
        showToast(`Datos de pago (${selectedOpt.title}) copiados.`, '📋');
      }
    });

    document.getElementById('btnCopyFullClientPaymentSheet')?.addEventListener('click', async () => {
      if (!activePaymentModalClient) return;
      const selectedOpt =
        OFFICIAL_PAYMENT_OPTIONS.find((o) => o.id === selectedPaymentOptionId) || OFFICIAL_PAYMENT_OPTIONS[0];
      const fullText = buildFullClientPaymentText(activePaymentModalClient, selectedOpt);
      try {
        await navigator.clipboard.writeText(fullText);
        showToast(
          `Ficha completa de ${activePaymentModalClient.nombres} + ${selectedOpt.title} copiada al portapapeles.`,
          '✅'
        );
      } catch (err) {
        const ta = document.getElementById('paymentOrganizedTextarea');
        if (ta) {
          ta.select();
          document.execCommand('copy');
        }
        showToast('Ficha completa copiada al portapapeles.', '✅');
      }
    });

    document.getElementById('newAppointmentForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const clientId = document.getElementById('citaClienteId').value;
      const clientObj = (appState.clients || []).find((c) => c.id === clientId);
      const newCita = {
        id: `CIT-${Math.floor(100 + Math.random() * 900)}`,
        clienteId: clientId,
        clienteNombre: clientObj ? `${clientObj.nombres} ${clientObj.apellidos}` : 'Cliente General',
        fecha: document.getElementById('citaFecha').value,
        hora: document.getElementById('citaHora').value,
        canal: document.getElementById('citaCanal').value,
        consultor: document.getElementById('citaConsultor').value.trim(),
        tema: document.getElementById('citaTema').value.trim(),
        estado: 'Confirmada',
        notas: document.getElementById('citaNotas').value.trim()
      };
      appState.appointments.unshift(newCita);
      e.target.reset();
      renderAll();
      await storage.syncAll(appState);
      showToast(`Cita agendada para ${newCita.clienteNombre}.`);
    });

    document.getElementById('newLenderForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const perfilesRaw = document.getElementById('lenderPerfiles').value;
      const newLender = {
        id: `LND-${Math.floor(10 + Math.random() * 89)}`,
        nombre: document.getElementById('lenderNombre').value.trim(),
        tipo: document.getElementById('lenderTipo').value.trim(),
        pais: document.getElementById('lenderPais').value.trim(),
        tasaApr: document.getElementById('lenderTasa').value.trim(),
        montoMaximo: Number(document.getElementById('lenderMontoMax').value) || 100000,
        ficoMinimo: document.getElementById('lenderFico').value,
        perfilesAceptados: perfilesRaw.split(',').map((s) => s.trim()).filter(Boolean),
        contactoEjecutivo: document.getElementById('lenderContacto').value.trim()
      };
      appState.lenders.push(newLender);
      e.target.reset();
      renderAll();
      await storage.syncAll(appState);
      showToast(`Entidad Financiera "${newLender.nombre}" registrada.`);
    });

    document.getElementById('btnQuickDriveXls')?.addEventListener('click', () => {
      storage.exportExcelFile(appState);
      showToast('Descargando clientes_prestamos.xls actualizado y abriendo tu carpeta de Google Drive...', '📂');
    });

    document.getElementById('btnDownloadAndOpenDrive')?.addEventListener('click', () => {
      storage.exportExcelFile(appState);
      window.open(window.USER_DRIVE_FOLDER_URL, '_blank');
      showToast('Archivo clientes_prestamos.xls descargado y carpeta Drive abierta.', '📊');
    });

    document.getElementById('driveSyncStatusPill')?.addEventListener('click', openDriveConfigModal);
    document.getElementById('menuOpenDriveConfig')?.addEventListener('click', openDriveConfigModal);
    document.getElementById('btnCloseDriveConfig')?.addEventListener('click', () => {
      document.getElementById('driveConfigModalBackdrop')?.classList.remove('open');
    });

    document.getElementById('btnPickBrowserDirectory')?.addEventListener('click', async () => {
      try {
        const folderName = await storage.pickDirectoryWithBrowserApi(appState);
        updateSyncStatusUI();
        showToast(`Carpeta "${folderName}" vinculada y archivo clientes_prestamos.xls sincronizado.`);
      } catch (err) {
        if (err.name !== 'AbortError') showToast(err.message, '⚠️');
      }
    });

    document.getElementById('btnOpenExplorerFolder')?.addEventListener('click', async () => {
      try {
        const res = await storage.openLocalSyncFolder();
        showToast(`Carpeta local abierta: ${res.openedPath}`, '📁');
      } catch (err) {
        showToast(err.message, '⚠️');
      }
    });

    document.getElementById('driveConfigForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await storage.updateDriveConfig(
          {
            syncFolderPath: document.getElementById('cfgSyncFolderPath').value.trim(),
            appsScriptUrl: document.getElementById('cfgAppsScriptUrl').value.trim(),
            autoSyncCloud: document.getElementById('cfgAutoSyncCloud').checked
          },
          appState
        );
        updateSyncStatusUI();
        document.getElementById('driveConfigModalBackdrop')?.classList.remove('open');
        showToast('Configuración de Google Drive guardada.');
      } catch (err) {
        showToast(err.message, '⚠️');
      }
    });

    document.getElementById('btnTestCloudWebhook')?.addEventListener('click', async () => {
      const url = document.getElementById('cfgAppsScriptUrl').value.trim();
      if (!url) {
        showToast('Pega primero la URL de tu Google Apps Script Web App.', '⚠️');
        return;
      }
      storage.config.appsScriptUrl = url;
      try {
        await storage.postToAppsScriptWebhook(appState.clients[0], appState);
        showToast('Archivo clientes_prestamos.xls y registros enviados a tu carpeta Drive (1q7tTJCz...).', '☁️');
      } catch (err) {
        showToast(`Error al contactar Webhook: ${err.message}`, '⚠️');
      }
    });

    document.getElementById('btnCopyAppsScript')?.addEventListener('click', () => {
      navigator.clipboard.writeText(window.TOPBANK_SEED_DATA.appsScriptTemplate);
      showToast('Código Apps Script copiado al portapapeles.', '📋');
    });

    document.getElementById('menuExportJson')?.addEventListener('click', () => {
      storage.exportJsonFile(appState);
      showToast('Archivo database_prestamos.json descargado.');
    });
    document.getElementById('menuExportCsv')?.addEventListener('click', () => {
      storage.exportCsvFile(appState);
      showToast('Archivo clientes_prestamos.csv descargado.');
    });
    document.getElementById('menuExportExcel')?.addEventListener('click', () => {
      storage.exportExcelFile(appState);
      showToast('Archivo clientes_prestamos.xls descargado.');
    });
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
