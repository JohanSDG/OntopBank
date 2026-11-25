/**
 * TopBank | OntopBank Legal Document & 2-Page PDF/Word Contract Generator
 * Replica exactamente el diseño visual del documento Word de Ontop:
 *  - Franja lateral izquierda vertical en gradiente coral-rosa (#FF9482 -> #FF1E62)
 *  - Logo oficial "^ ontop" en coral + Sello circular dentado "LEGAL ontop"
 *  - 2 Hojas tamaño Carta/A4 con Resumen del Cliente, Plan de Pagos *24 meses al 8% anual,
 *    Cláusula de Abono a Capital sin penalidad y Políticas de Privacidad de OntopBank.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OntopLegalContractGenerator = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMoney(num) {
    const val = Number(num) || 0;
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Calcula el plan financiero del préstamo con 8% de interés anual sobre el valor prestado a 24 meses
  function calculateLoanSchedule8Percent(principalAmount) {
    const principal = Number(principalAmount) || 0;
    const annualInterestRate = 0.08; // 8% anual fijo sobre el valor prestado
    const totalInterest24Months = principal * annualInterestRate * 2; // 8% anual en 24 meses (2 años)
    const totalPayable24Months = principal + totalInterest24Months; // Total * 24 meses

    const monthlyPrincipal = principal / 24;
    const monthlyInterest = totalInterest24Months / 24;
    const monthlyInstallment = totalPayable24Months / 24;

    const rows = [];
    let remainingPrincipal = principal;

    for (let m = 1; m <= 24; m++) {
      remainingPrincipal = Math.max(0, remainingPrincipal - monthlyPrincipal);
      rows.push({
        month: m,
        monthlyPrincipal,
        monthlyInterest,
        monthlyInstallment,
        remainingPrincipal: m === 24 ? 0 : remainingPrincipal
      });
    }

    return {
      principal,
      termMonths: 24,
      annualRatePercent: 8,
      totalInterest24Months,
      totalPayable24Months,
      // Alias de compatibilidad
      totalInterest12Months: totalInterest24Months,
      totalPayable12Months: totalPayable24Months,
      monthlyPrincipal,
      monthlyInterest,
      monthlyInstallment,
      rows
    };
  }

  // Sello SVG "LEGAL ontop" idéntico al sello rojo/coral del documento Word de referencia
  function getLegalOntopStampSvg() {
    return `
      <svg width="96" height="96" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(-14deg); filter: drop-shadow(0 2px 4px rgba(244,63,94,0.18));">
        <!-- Borde exterior dentado tipo sello legal -->
        <circle cx="70" cy="70" r="62" fill="none" stroke="#F44E63" stroke-width="4" stroke-dasharray="6 4" />
        <circle cx="70" cy="70" r="55" fill="rgba(244, 78, 99, 0.05)" stroke="#F44E63" stroke-width="2.5" />
        <circle cx="70" cy="70" r="50" fill="none" stroke="#F44E63" stroke-width="1" stroke-dasharray="3 2" />
        <!-- Isotipo Chevron Ontop superior -->
        <path d="M70 22 L54 47 L63 47 L70 35 L77 47 L86 47 Z" fill="#F44E63" />
        <!-- Texto central LEGAL -->
        <text x="70" y="76" text-anchor="middle" font-family="'Plus Jakarta Sans', 'Arial Black', sans-serif" font-weight="900" font-size="25" letter-spacing="1" fill="#F44E63">LEGAL</text>
        <!-- Texto inferior ontop -->
        <text x="70" y="99" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-weight="700" font-size="16" fill="#F44E63">ontop</text>
      </svg>
    `;
  }

  // Logo SVG "^ ontop" en color coral oficial del documento Word
  function getOntopHeaderLogoSvg(redLogoSrc) {
    const imgTag = redLogoSrc
      ? `<img src="${redLogoSrc}" alt="Ontop" style="width:32px; height:32px; object-fit:contain; margin-right:6px;" />`
      : `<svg width="32" height="30" viewBox="0 0 40 36" xmlns="http://www.w3.org/2000/svg" style="margin-right:6px;">
           <path d="M20 2 L2 34 L12 34 L20 19 L28 34 L38 34 Z" fill="#F85A6A"/>
         </svg>`;

    return `
      <div style="display:inline-flex; align-items:center;">
        ${imgTag}
        <span style="font-family:'Plus Jakarta Sans', 'Inter', Arial, sans-serif; font-weight:800; font-size:28px; letter-spacing:-0.03em; color:#F85A6A;">ontop</span>
        <span style="font-family:'Plus Jakarta Sans', Arial, sans-serif; font-weight:700; font-size:11px; color:#6D28D9; background:#F3E8FF; border:1px solid #D8B4FE; border-radius:999px; padding:2px 8px; margin-left:8px; text-transform:uppercase;">Bank Credit</span>
      </div>
    `;
  }

  // Genera el HTML completo de 2 páginas exactas listas para PDF y Word manteniendo el diseño original
  function buildTwoPageContractHtml(client, options = {}) {
    const c = client || {};
    const schedule = calculateLoanSchedule8Percent(c.montoSolicitado || 10000);
    const effectiveDate = c.fechaActualizacion || c.fechaCreacion || new Date().toISOString().slice(0, 10);
    const fullName = `${c.nombres || 'SOLICITANTE'} ${c.apellidos || ''}`.trim().toUpperCase();
    const idLabel = `${c.tipoId || 'ID'}: ${c.numeroId || 'N/A'}`;
    const residence = c.residencia || 'Estados Unidos / Internacional';
    const workplace = c.lugarTrabajo || 'Actividad Independiente / Corporativa';
    const jobFunctions = c.funcionesTrabajo || 'Profesional / Contratista';
    const incomeSource = c.fuenteIngresos || 'Cuenta bancaria EEUU';
    const score = c.scoreCredito || 650;
    const redLogoSrc = options.redLogoDataUrl || '/Contenido/red.jpg';

    const scheduleRowsHtml = schedule.rows
      .map(
        (r) => `
        <tr>
          <td style="padding:1.8px 8px; border-bottom:1px solid #E2E8F0; text-align:center; font-weight:700; color:#1E293B;">Mes ${r.month}</td>
          <td style="padding:1.8px 8px; border-bottom:1px solid #E2E8F0; text-align:right;">$${formatMoney(r.monthlyPrincipal)} USD</td>
          <td style="padding:1.8px 8px; border-bottom:1px solid #E2E8F0; text-align:right; color:#047857;">$${formatMoney(r.monthlyInterest)} USD</td>
          <td style="padding:1.8px 8px; border-bottom:1px solid #E2E8F0; text-align:right; font-weight:800; color:#0F172A;">$${formatMoney(r.monthlyInstallment)} USD</td>
          <td style="padding:1.8px 8px; border-bottom:1px solid #E2E8F0; text-align:right; color:#475569;">$${formatMoney(r.remainingPrincipal)} USD</td>
        </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Contrato Oficial de Préstamo OntopBank - ${esc(fullName)}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif;
      background: #E2E8F0;
      color: #1E293B;
      line-height: 1.36;
      font-size: 10.5px;
    }
    .legal-sheet {
      position: relative;
      width: 8.5in;
      height: 11in;
      background: #FFFFFF;
      margin: 0 auto 24px auto;
      padding: 0.38in 0.55in 0.38in 0.76in;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
    }
    .legal-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
      margin-bottom: 0;
    }
    /* Franja lateral izquierda vertical idéntica al modelo Word de Ontop */
    .ontop-left-ribbon {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 0.28in;
      background: linear-gradient(180deg, #FF9482 0%, #FF5E7E 52%, #FF1E62 100%);
    }
    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1.5px solid #F1F5F9;
      margin-bottom: 8px;
    }
    .doc-main-title {
      font-size: 13.5px;
      font-weight: 900;
      letter-spacing: 0.02em;
      color: #0F172A;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .approval-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ECFDF5;
      border: 1px solid #6EE7B7;
      border-left: 4px solid #10B981;
      border-radius: 6px;
      padding: 6px 12px;
      margin-bottom: 7px;
    }
    .approval-banner strong {
      color: #065F46;
      font-size: 11px;
    }
    .parties-paragraph {
      font-size: 9.8px;
      color: #334155;
      text-align: justify;
      margin-bottom: 7px;
    }
    .summary-grid-box {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 7px;
    }
    .summary-col h4 {
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6D28D9;
      margin-bottom: 4px;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 2px;
    }
    .summary-line {
      font-size: 9.4px;
      margin-bottom: 2px;
      color: #1E293B;
    }
    .amortization-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
      margin-bottom: 7px;
    }
    .amortization-table thead th {
      background: #0F172A;
      color: #FFFFFF;
      padding: 4px 8px;
      text-transform: uppercase;
      font-size: 8px;
      letter-spacing: 0.04em;
    }
    .amortization-table tfoot td {
      background: #F1F5F9;
      font-weight: 900;
      padding: 4px 8px;
      border-top: 2px solid #0F172A;
      color: #0F172A;
    }
    .prepayment-callout {
      background: #F5F3FF;
      border: 1px solid #C4B5FD;
      border-left: 4px solid #7C3AED;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 9.2px;
      color: #2E1065;
      text-align: justify;
    }
    .legal-clause-title {
      font-size: 11px;
      font-weight: 800;
      color: #0F172A;
      margin-top: 8px;
      margin-bottom: 3px;
      text-transform: uppercase;
    }
    .legal-clause-text {
      font-size: 9.9px;
      color: #334155;
      text-align: justify;
      margin-bottom: 6px;
      line-height: 1.44;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1.5px solid #CBD5E1;
    }
    .sig-box {
      font-size: 10px;
      color: #1E293B;
    }
    .sig-line {
      height: 44px;
      border-bottom: 1.5px solid #0F172A;
      margin-bottom: 6px;
      display: flex;
      align-items: flex-end;
      padding-bottom: 4px;
      font-family: 'Georgia', serif;
      font-style: italic;
      font-size: 15px;
      color: #4C1D95;
    }
    .sheet-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.8px;
      color: #64748B;
      border-top: 1px solid #E2E8F0;
      padding-top: 5px;
    }
    @media print {
      body {
        background: #FFFFFF;
      }
      .legal-sheet {
        margin: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>

  <!-- ======================================================================
       HOJA 1 DE 2: RESOLUCIÓN DE APROBACIÓN, RESUMEN DEL CLIENTE Y PLAN DE PAGOS *24 MESES (8% ANUAL)
       ====================================================================== -->
  <section class="legal-sheet">
    <div class="ontop-left-ribbon"></div>

    <div>
      <header class="sheet-header">
        ${getOntopHeaderLogoSvg(redLogoSrc)}
        <div style="text-align:center;">
          <div style="font-size:9px; font-weight:700; color:#64748B; letter-spacing:0.08em;">DOCUMENTO LEGAL VINCULANTE</div>
          <div style="font-size:11px; font-weight:800; color:#0F172A;">EXPEDIENTE N° ${esc(c.id || 'EXP-2026')}</div>
          <div style="font-size:9px; color:#475569;">Fecha Efectiva: ${esc(effectiveDate)}</div>
        </div>
        ${getLegalOntopStampSvg()}
      </header>

      <div class="doc-main-title">
        LOAN APPROVAL &amp; CREDIT FACILITY AGREEMENT (ACUERDO OFICIAL DE PRÉSTAMO)
      </div>

      <div class="approval-banner">
        <div>
          <strong>✔ DICTAMEN OFICIAL: SOLICITUD DE PRÉSTAMO ACEPTADA Y APROBADA</strong>
          <div style="font-size:9.5px; color:#047857;">
            Aprobado por el Comité de Crédito de OntopBank tras completar satisfactoriamente la validación financiera.
          </div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:9px; color:#065F46; display:block;">CAPITAL APROBADO</span>
          <strong style="font-size:14px; color:#047857;">$${formatMoney(schedule.principal)} USD</strong>
        </div>
      </div>

      <p class="parties-paragraph">
        <strong>ONTOPBANK IC OPERATIONS LLC.</strong>, sociedad de responsabilidad limitada constituida y existente bajo las leyes del Estado de Delaware, Estados Unidos de América (<strong>"OntopBank"</strong>), en alianza con la entidad financiera asignada <strong>${esc(c.entidadFinanciera || 'Ontop Global Credit Bridge')}</strong>; y por la otra parte, <strong>${esc(fullName)}</strong>, con residencia actual en <strong>${esc(residence)}</strong>, identificado(a) con <strong>${esc(idLabel)}</strong> y correo electrónico <strong>${esc(c.email || 'N/A')}</strong> (<strong>"El Solicitante / Prestatario"</strong>), celebran el presente Acuerdo Oficial de Préstamo Financiero sujeto a las siguientes condiciones económicas verificadas:
      </p>

      <!-- Resumen Corto de la Información del Cliente y Liquidación al 8% Anual -->
      <div class="summary-grid-box">
        <div class="summary-col">
          <h4>1. Resumen Verificado del Solicitante</h4>
          <div class="summary-line"><strong>Nombre del Solicitante:</strong> ${esc(fullName)}</div>
          <div class="summary-line"><strong>Identificación Oficial:</strong> ${esc(idLabel)} (${esc(c.perfilMigratorio || 'Verificado')})</div>
          <div class="summary-line"><strong>Lugar de Residencia:</strong> ${esc(residence)}</div>
          <div class="summary-line"><strong>Lugar de Trabajo / Empresa:</strong> ${esc(workplace)}</div>
          <div class="summary-line"><strong>Funciones / Cargo:</strong> ${esc(jobFunctions)}</div>
          <div class="summary-line"><strong>Fuente de Ingresos:</strong> ${esc(incomeSource)} ($${formatMoney(c.ingresosMensuales || 0)} USD/mes)</div>
          <div class="summary-line"><strong>Score Matemático Validado:</strong> ${esc(score)} / 750 pts</div>
        </div>

        <div class="summary-col">
          <h4>2. Estructura del Préstamo y Liquidación (8% Anual)</h4>
          <div class="summary-line"><strong>Monto Solicitado y Aprobado:</strong> <strong style="color:#0F172A;">$${formatMoney(schedule.principal)} USD</strong></div>
          <div class="summary-line"><strong>Propósito del Crédito:</strong> ${esc(c.propositoPrestamo || 'Libre Inversión / Calidad de Vida')}</div>
          <div class="summary-line"><strong>Tasa de Interés Fija:</strong> <strong>8.00% Anual (8% E.A.)</strong> sobre el valor prestado</div>
          <div class="summary-line"><strong>Interés Total (24 Meses):</strong> $${formatMoney(schedule.totalInterest24Months)} USD</div>
          <div class="summary-line"><strong>Cuota Fija Mensual a Pagar:</strong> <strong style="color:#047857;">$${formatMoney(schedule.monthlyInstallment)} USD / mes</strong></div>
          <div class="summary-line"><strong>Plazo de Amortización:</strong> 24 Meses Consecutivos</div>
          <div class="summary-line" style="margin-top:3px; padding-top:3px; border-top:1px dashed #CBD5E1;">
            <strong>TOTAL A PAGAR EN 24 MESES (*24 MESES):</strong>
            <strong style="color:#6D28D9; font-size:10.5px;">$${formatMoney(schedule.totalPayable24Months)} USD</strong>
          </div>
        </div>
      </div>

      <!-- Tabla de Pagos Mensuales (*24 Meses) con el 8% de Interés Anual -->
      <div style="font-size:9.5px; font-weight:800; color:#0F172A; margin-bottom:3px; text-transform:uppercase;">
        Cronograma Oficial de Pagos Mensuales (*24 Meses — Capital + 8.00% de Interés Anual sobre el Valor Prestado)
      </div>
      <table class="amortization-table">
        <thead>
          <tr>
            <th style="text-align:center;">Período</th>
            <th style="text-align:right;">Abono Mensual a Capital</th>
            <th style="text-align:right;">Interés Mensual (8% Anual)</th>
            <th style="text-align:right;">Monto a Pagar Mensualmente</th>
            <th style="text-align:right;">Saldo Capital Restante</th>
          </tr>
        </thead>
        <tbody>
          ${scheduleRowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td style="text-align:center;">TOTAL * 24 MESES</td>
            <td style="text-align:right;">$${formatMoney(schedule.principal)} USD</td>
            <td style="text-align:right; color:#047857;">$${formatMoney(schedule.totalInterest24Months)} USD (8% Anual)</td>
            <td style="text-align:right; color:#6D28D9; font-size:9.5px;">$${formatMoney(schedule.totalPayable24Months)} USD</td>
            <td style="text-align:right;">$0.00 USD</td>
          </tr>
        </tfoot>
      </table>

      <!-- Cláusula de Abono a Capital Anticipado -->
      <div class="prepayment-callout">
        <strong>CLÁUSULA DE ABONO A CAPITAL ANTICIPADO (SÍ ES POSIBLE ABONAR A CAPITAL SIN PENALIDAD):</strong>
        OntopBank certifica expresamente que <strong>EL SOLICITANTE SÍ PUEDE REALIZAR ABONOS EXTRAORDINARIOS A CAPITAL</strong> o pagar la totalidad del préstamo de forma anticipada en cualquier momento durante la vigencia de los veinticuatro (24) meses, <strong>sin ningún tipo de multa, comisión o penalidad por prepago</strong>. Todo abono adicional a la cuota mensual de <strong>$${formatMoney(schedule.monthlyInstallment)} USD</strong> se imputará directamente a reducir el saldo de capital principal, disminuyendo proporcionalmente el plazo o las cuotas restantes.
      </div>
    </div>

    <footer class="sheet-footer">
      <span>ONTOPBANK IC OPERATIONS LLC. · Delaware, United States of America · Legal Credit Division</span>
      <span>Hoja 1 de 2 · Expediente ${esc(c.id || 'EXP-2026')}</span>
    </footer>
  </section>

  <!-- ======================================================================
       HOJA 2 DE 2: CONDICIONES LEGALES, POLÍTICAS DE PRIVACIDAD DE ONTOPBANK Y FIRMAS
       ====================================================================== -->
  <section class="legal-sheet">
    <div class="ontop-left-ribbon"></div>

    <div>
      <header class="sheet-header">
        ${getOntopHeaderLogoSvg(redLogoSrc)}
        <div style="text-align:center;">
          <div style="font-size:9px; font-weight:700; color:#64748B; letter-spacing:0.08em;">TÉRMINOS LEGALES Y PRIVACIDAD</div>
          <div style="font-size:11px; font-weight:800; color:#0F172A;">TITULAR: ${esc(fullName)}</div>
          <div style="font-size:9px; color:#475569;">Residencia: ${esc(residence)}</div>
        </div>
        ${getLegalOntopStampSvg()}
      </header>

      <div class="legal-clause-title">1. Reconocimiento de las Partes, Desembolso y Modalidad de Pago (OntopBank Platform)</div>
      <p class="legal-clause-text">
        El Solicitante acepta de manera libre, voluntaria e informada las condiciones financieras aprobadas en la Hoja 1 del presente contrato por un monto principal de <strong>$${formatMoney(schedule.principal)} USD</strong>, con una tasa preferencial fija del <strong>8.00% anual</strong> sobre el valor prestado, pagadero en veinticuatro (24) cuotas mensuales iguales de <strong>$${formatMoney(schedule.monthlyInstallment)} USD</strong> para un total acumulado a los veinticuatro (24) meses de <strong>$${formatMoney(schedule.totalPayable24Months)} USD</strong>. Todos los desembolsos y recaudos mensuales se ejecutarán a través de los canales bancarios autorizados en la plataforma OntopBank conforme a los Términos de Servicio disponibles en <em>https://www.getontop.com/legal/terms-of-service</em>.
      </p>

      <div class="legal-clause-title">2. Políticas de Privacidad y Protección de Datos Personales de OntopBank (Personal Data Protection &amp; Privacy Policy)</div>
      <p class="legal-clause-text">
        En cumplimiento de las Leyes de Protección de Datos Financieros de los Estados Unidos (incluyendo la <em>Gramm-Leach-Bliley Act - GLBA</em>, <em>California Consumer Privacy Act - CCPA</em> y normativas del Estado de Delaware) y tratados internacionales de privacidad, <strong>ONTOPBANK IC OPERATIONS LLC.</strong> establece su Política Oficial de Privacidad aplicable al Solicitante:
      </p>
      <p class="legal-clause-text">
        <strong>(a) Definiciones Legales:</strong> <em>"Información Personal" (Personal Information)</em> significa cualquier dato financiero, migratorio, laboral, de identificación (SSN, ITIN, Pasaporte, Licencia) o bancario suministrado por <strong>${esc(fullName)}</strong> (el <em>"Titular de los Datos / Data Subject"</em>) en relación con su solicitud de préstamo. <em>"Tratamiento" (Processing)</em> comprende la recolección, validación algorítmica de Score, almacenamiento cifrado, custodia y verificación ante entidades financieras aliadas (Lenders).
      </p>
      <p class="legal-clause-text">
        <strong>(b) Compromiso de Confidencialidad y No Divulgación:</strong> OntopBank garantiza que la Información Personal del Solicitante será tratada bajo protocolos de cifrado de grado bancario (AES-256 / TLS 1.3) y <strong>jamás será vendida, alquilada ni comercializada a terceros</strong>. Únicamente se compartirá información estrictamente necesaria con la entidad fondeadora asignada (<strong>${esc(c.entidadFinanciera || 'Ontop Global Credit Bridge')}</strong>) bajo acuerdos escritos de confidencialidad y reserva bancaria igualmente estrictos.
      </p>
      <p class="legal-clause-text">
        <strong>(c) Derechos del Titular (Acceso, Rectificación y Eliminación):</strong> El Solicitante conserva en todo momento el derecho de solicitar acceso a su expediente crediticio, actualizar sus datos de residencia o empleo, y requerir la eliminación o bloqueo de sus archivos una vez extinguida la obligación crediticia, sin que su estatus migratorio o nacionalidad pueda ser utilizado para fines distintos a la evaluación técnica del presente crédito.
      </p>

      <div class="legal-clause-title">3. Confidencialidad de la Operación y Cumplimiento Normativo (FCPA, AML &amp; KYC)</div>
      <p class="legal-clause-text">
        Ambas Partes acuerdan mantener estricta reserva sobre los términos particulares de esta aprobación crediticia. El Solicitante declara bajo gravedad de juramento que los ingresos mensuales reportados (<strong>$${formatMoney(c.ingresosMensuales || 0)} USD/mes</strong> a través de <strong>${esc(incomeSource)}</strong> derivados de sus funciones como <strong>${esc(jobFunctions)}</strong> en <strong>${esc(workplace)}</strong>) provienen de actividades lícitas y que los fondos del préstamo se destinarán exclusivamente a <strong>${esc(c.propositoPrestamo || 'Calidad de Vida')}</strong>, en pleno cumplimiento de la Ley de Prácticas Corruptas en el Extranjero de EE. UU. (<em>U.S. Foreign Corrupt Practices Act - FCPA</em>) y normativas de prevención de lavado de activos (AML/KYC).
      </p>

      <div class="legal-clause-title">4. Derecho de Prepago, Abono a Capital e Integridad Contractual</div>
      <p class="legal-clause-text">
        De conformidad con la regulación federal de protección al consumidor financiero, ninguna disposición de este Acuerdo restringe el derecho del Solicitante a efectuar pagos anticipados. El Solicitante podrá abonar a capital cualquier suma adicional en cualquier fecha anterior al vencimiento de las 24 cuotas sin recargo alguno. Si alguna disposición del presente Acuerdo fuese declarada inválida, las disposiciones restantes continuarán en pleno vigor y efecto.
      </p>

      <div class="legal-clause-title">5. Firma Electrónica, Ley Aplicable y Jurisdicción (Electronic Signature &amp; Governing Law)</div>
      <p class="legal-clause-text">
        Las Partes acuerdan que el presente Contrato Oficial de Préstamo se ejecuta mediante tecnología de firma electrónica conforme a la ley federal <em>U.S. ESIGN Act</em> y leyes aplicables, teniendo la misma validez y fuerza vinculante que una firma manuscrita. Este Acuerdo se rige e interpreta de conformidad con las leyes del <strong>Estado de Delaware, Estados Unidos de América</strong>, sometiéndose cualquier controversia a la jurisdicción exclusiva de los tribunales ubicados en <strong>Miami-Dade County, Florida</strong>.
      </p>

      <p class="legal-clause-text" style="font-weight:700; color:#0F172A; margin-top:8px;">
        IN WITNESS WHEREOF / EN CONSTANCIA DE LO CUAL, las Partes suscriben y aceptan el presente Acuerdo Oficial de Aprobación de Préstamo en la Fecha Efectiva indicada.
      </p>

      <!-- Bloque Oficial de Firmas -->
      <div class="signatures-grid">
        <div class="sig-box">
          <div style="font-weight:800; color:#0F172A; margin-bottom:2px;">ONTOPBANK IC OPERATIONS LLC.:</div>
          <div class="sig-line">Elena Vance, Chief Credit Officer</div>
          <div><strong>Nombre:</strong> Dra. Elena Vance · Comité de Underwriting</div>
          <div><strong>Cargo:</strong> Directora de Originación y Crédito Global</div>
          <div><strong>Estado:</strong> <span style="color:#047857; font-weight:800;">APROBADO Y FIRMADO DIGITALMENTE</span></div>
        </div>

        <div class="sig-box">
          <div style="font-weight:800; color:#0F172A; margin-bottom:2px;">EL SOLICITANTE / PRESTATARIO:</div>
          <div class="sig-line">${esc(fullName)}</div>
          <div><strong>Nombre:</strong> ${esc(fullName)}</div>
          <div><strong>Identificación:</strong> ${esc(idLabel)}</div>
          <div><strong>Residencia:</strong> ${esc(residence)}</div>
        </div>
      </div>
    </div>

    <footer class="sheet-footer">
      <span>Política de Privacidad Oficial: https://www.getontop.com/legal/terms-of-service · Documento Protegido OntopBank</span>
      <span>Hoja 2 de 2 · Expediente ${esc(c.id || 'EXP-2026')}</span>
    </footer>
  </section>

</body>
</html>`;
  }

  // Convierte texto UTF-8 a escapado octal WinAnsi para PDF 1.4 (soporta tildes, ñ, $, etc.)
  function pdfEscapeWinAnsi(str) {
    const clean = String(str ?? '')
      .replace(/✔/g, '')
      .replace(/—/g, '-')
      .replace(/·/g, '-');
    let out = '';
    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      if (code === 40 || code === 41 || code === 92) {
        out += '\\' + clean[i];
      } else if (code >= 32 && code <= 126) {
        out += clean[i];
      } else if (code >= 160 && code <= 255) {
        out += '\\' + code.toString(8).padStart(3, '0');
      } else {
        out += ' ';
      }
    }
    return out;
  }

  // envuelve un párrafo largo en líneas de máximo maxChars caracteres
  function wrapTextLines(text, maxChars) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let current = '';
    for (const w of words) {
      if (!current) {
        current = w;
      } else if ((current + ' ' + w).length <= maxChars) {
        current += ' ' + w;
      } else {
        lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // Genera un archivo PDF 1.4 nativo de 2 páginas exactas (Tamaño Carta: 612 x 792 pt)
  // con el diseño original exacto (Franja lateral coral, logo ^ ontop, sello LEGAL ontop, una sola tabla *24 meses 8% y Políticas de Privacidad)
  function buildTwoPagePdfBinary(client) {
    const c = client || {};
    const schedule = calculateLoanSchedule8Percent(c.montoSolicitado || 10000);
    const effectiveDate = c.fechaActualizacion || c.fechaCreacion || new Date().toISOString().slice(0, 10);
    const fullName = `${c.nombres || 'SOLICITANTE'} ${c.apellidos || ''}`.trim().toUpperCase();
    const idLabel = `${c.tipoId || 'ID'}: ${c.numeroId || 'N/A'}`;
    const residence = c.residencia || 'Estados Unidos / Internacional';
    const workplace = c.lugarTrabajo || 'Actividad Independiente / Corporativa';
    const jobFunctions = c.funcionesTrabajo || 'Profesional / Contratista';
    const incomeSource = c.fuenteIngresos || 'Cuenta bancaria EEUU';
    const score = c.scoreCredito || 650;

    // Función auxiliar que dibuja la plantilla común de cada página (franja coral izquierda + logo ^ ontop + sello LEGAL ontop)
    function drawPageChrome(pageNum, subtitleRight) {
      const ops = [];
      // 1. Franja vertical izquierda coral-rosa (gradiente escalonado)
      ops.push('0.98 0.36 0.42 rg');
      ops.push('0 396 20 396 re f');
      ops.push('0.96 0.18 0.38 rg');
      ops.push('0 0 20 396 re f');

      // 2. Isotipo Chevron "^ ontop" en la esquina superior izquierda
      ops.push('0.96 0.32 0.40 rg');
      ops.push('42 736 m 54 760 l 66 736 l 60 736 l 54 748 l 48 736 l h f');
      ops.push('BT /F2 22 Tf 0.96 0.32 0.40 rg 72 739 Td (ontop) Tj ET');
      ops.push('BT /F2 8 Tf 0.43 0.16 0.85 rg 138 743 Td (BANK CREDIT) Tj ET');

      // 3. Metadatos centrales del encabezado
      ops.push('BT /F2 8 Tf 0.39 0.45 0.55 rg 245 752 Td (DOCUMENTO LEGAL VINCULANTE) Tj ET');
      ops.push(`BT /F2 10 Tf 0.06 0.09 0.16 rg 245 740 Td (EXPEDIENTE: ${pdfEscapeWinAnsi(c.id || 'EXP-2026')}) Tj ET`);
      ops.push(`BT /F1 8 Tf 0.28 0.33 0.41 rg 245 729 Td (${pdfEscapeWinAnsi(subtitleRight)}) Tj ET`);

      // 4. Sello circular rojo "LEGAL ontop" en la esquina superior derecha
      ops.push('0.95 0.28 0.38 RG 2 w');
      ops.push('510 718 58 38 re S');
      ops.push('0.99 0.95 0.96 rg 512 720 54 34 re f');
      ops.push('BT /F2 12 Tf 0.95 0.25 0.36 rg 519 739 Td (LEGAL) Tj ET');
      ops.push('BT /F2 9 Tf 0.95 0.25 0.36 rg 525 726 Td (ontop) Tj ET');

      // Línea divisoria del header
      ops.push('0.88 0.91 0.94 RG 1 w 42 712 m 572 712 l S');

      // Pie de página
      ops.push('0.88 0.91 0.94 RG 0.8 w 42 36 m 572 36 l S');
      ops.push('BT /F1 7.5 Tf 0.40 0.45 0.54 rg 42 24 Td (ONTOPBANK IC OPERATIONS LLC. - Delaware, United States of America - Politica de Privacidad Legal) Tj ET');
      ops.push(`BT /F2 8 Tf 0.06 0.09 0.16 rg 515 24 Td (Hoja ${pageNum} de 2) Tj ET`);

      return ops;
    }

    // ========================================================================
    // CONSTRUCCIÓN DE LA HOJA 1 DE 2
    // ========================================================================
    const p1 = drawPageChrome(1, `Fecha Efectiva: ${effectiveDate}`);

    // Título principal
    p1.push('BT /F2 11.5 Tf 0.06 0.09 0.16 rg 42 694 Td (LOAN APPROVAL & CREDIT FACILITY AGREEMENT - ACUERDO OFICIAL DE PRESTAMO) Tj ET');

    // Banner verde de Solicitud Aceptada
    p1.push('0.92 0.99 0.96 rg 42 654 530 32 re f');
    p1.push('0.06 0.72 0.50 RG 1.2 w 42 654 530 32 re S');
    p1.push('BT /F2 9.5 Tf 0.02 0.37 0.27 rg 50 672 Td (DICTAMEN OFICIAL: SOLICITUD DE PRESTAMO ACEPTADA Y APROBADA) Tj ET');
    p1.push('BT /F1 8 Tf 0.02 0.47 0.34 rg 50 660 Td (Aprobado por el Comite de Credito de OntopBank tras completar la validacion financiera.) Tj ET');
    p1.push(`BT /F2 11 Tf 0.02 0.37 0.27 rg 445 666 Td ($${pdfEscapeWinAnsi(formatMoney(schedule.principal))} USD) Tj ET`);

    // Párrafo de partes contratantes
    const introText = `ONTOPBANK IC OPERATIONS LLC., sociedad bajo las leyes de Delaware, EE. UU. ("OntopBank"), junto con ${c.entidadFinanciera || 'Ontop Global Credit Bridge'}; y ${fullName}, residente en ${residence}, identificado(a) con ${idLabel} ("El Solicitante"), suscriben el presente Contrato Oficial de Prestamo aprobado bajo las siguientes condiciones:`;
    let yCursor = 638;
    for (const line of wrapTextLines(introText, 98)) {
      p1.push(`BT /F1 8.5 Tf 0.20 0.25 0.33 rg 42 ${yCursor} Td (${pdfEscapeWinAnsi(line)}) Tj ET`);
      yCursor -= 11;
    }

    // Caja de Resumen en 2 Columnas
    const boxTop = yCursor - 4;
    const boxHeight = 98;
    const boxBottom = boxTop - boxHeight;
    p1.push('0.97 0.98 0.99 rg 42 ' + boxBottom + ' 530 ' + boxHeight + ' re f');
    p1.push('0.79 0.83 0.88 RG 0.8 w 42 ' + boxBottom + ' 530 ' + boxHeight + ' re S');
    p1.push('0.79 0.83 0.88 RG 0.8 w 305 ' + boxBottom + ' m 305 ' + boxTop + ' l S');

    // Columna 1 del Resumen
    let yLeft = boxTop - 13;
    p1.push(`BT /F2 8.2 Tf 0.43 0.16 0.85 rg 50 ${yLeft} Td (1. RESUMEN VERIFICADO DEL SOLICITANTE) Tj ET`);
    yLeft -= 12;
    const leftItems = [
      `Solicitante: ${fullName.slice(0, 34)}`,
      `Identificacion: ${idLabel}`,
      `Lugar de Residencia: ${residence.slice(0, 34)}`,
      `Lugar de Trabajo: ${workplace.slice(0, 34)}`,
      `Funciones: ${jobFunctions.slice(0, 36)}`,
      `Fuente Ingresos: ${incomeSource} ($${formatMoney(c.ingresosMensuales || 0)}/m)`,
      `Score Matematico Validado: ${score} / 750 pts`
    ];
    for (const item of leftItems) {
      p1.push(`BT /F1 7.8 Tf 0.12 0.16 0.23 rg 50 ${yLeft} Td (${pdfEscapeWinAnsi(item)}) Tj ET`);
      yLeft -= 11;
    }

    // Columna 2 del Resumen (Liquidación al 8% anual * 24 meses)
    let yRight = boxTop - 13;
    p1.push(`BT /F2 8.2 Tf 0.43 0.16 0.85 rg 313 ${yRight} Td (2. LIQUIDACION DEL PRESTAMO - 8% ANUAL) Tj ET`);
    yRight -= 12;
    const rightItems = [
      `Monto Solicitado Aprobado: $${formatMoney(schedule.principal)} USD`,
      `Proposito: ${(c.propositoPrestamo || 'Calidad de Vida').slice(0, 32)}`,
      `Tasa de Interes Fija: 8.00% Anual sobre valor prestado`,
      `Interes Total (24 Meses): $${formatMoney(schedule.totalInterest24Months)} USD`,
      `Monto a Pagar Mensualmente: $${formatMoney(schedule.monthlyInstallment)} USD / mes`,
      `Plazo de Amortizacion: 24 Meses Consecutivos`,
      `TOTAL A PAGAR *24 MESES: $${formatMoney(schedule.totalPayable24Months)} USD`
    ];
    for (let idx = 0; idx < rightItems.length; idx++) {
      const font = idx === rightItems.length - 1 || idx === 4 ? '/F2' : '/F1';
      p1.push(`BT ${font} 7.8 Tf 0.06 0.09 0.16 rg 313 ${yRight} Td (${pdfEscapeWinAnsi(rightItems[idx])}) Tj ET`);
      yRight -= 11;
    }

    // Tabla única de 24 Meses (* 24 Meses)
    let yTable = boxBottom - 14;
    p1.push(`BT /F2 8.2 Tf 0.06 0.09 0.16 rg 42 ${yTable} Td (CRONOGRAMA OFICIAL DE PAGOS MENSUALES (*24 MESES - CAPITAL + 8.00% DE INTERES ANUAL)) Tj ET`);
    yTable -= 13;

    // Cabecera de tabla
    p1.push('0.06 0.09 0.16 rg 42 ' + yTable + ' 530 12 re f');
    p1.push('BT /F2 7.2 Tf 1 1 1 rg 50 ' + (yTable + 3.5) + ' Td (PERIODO) Tj ET');
    p1.push('BT /F2 7.2 Tf 1 1 1 rg 130 ' + (yTable + 3.5) + ' Td (ABONO CAPITAL) Tj ET');
    p1.push('BT /F2 7.2 Tf 1 1 1 rg 245 ' + (yTable + 3.5) + ' Td (INTERES 8% ANUAL) Tj ET');
    p1.push('BT /F2 7.2 Tf 1 1 1 rg 360 ' + (yTable + 3.5) + ' Td (PAGO MENSUAL USD) Tj ET');
    p1.push('BT /F2 7.2 Tf 1 1 1 rg 475 ' + (yTable + 3.5) + ' Td (SALDO RESTANTE) Tj ET');

    for (const r of schedule.rows) {
      yTable -= 9.5;
      if (r.month % 2 === 0) {
        p1.push(`0.96 0.97 0.99 rg 42 ${yTable} 530 9.5 re f`);
      }
      p1.push(`0.88 0.91 0.94 RG 0.4 w 42 ${yTable} m 572 ${yTable} l S`);
      p1.push(`BT /F2 6.8 Tf 0.12 0.16 0.23 rg 50 ${yTable + 2.5} Td (Mes ${r.month}) Tj ET`);
      p1.push(`BT /F1 6.8 Tf 0.12 0.16 0.23 rg 130 ${yTable + 2.5} Td ($${pdfEscapeWinAnsi(formatMoney(r.monthlyPrincipal))} USD) Tj ET`);
      p1.push(`BT /F1 6.8 Tf 0.02 0.47 0.34 rg 245 ${yTable + 2.5} Td ($${pdfEscapeWinAnsi(formatMoney(r.monthlyInterest))} USD) Tj ET`);
      p1.push(`BT /F2 6.8 Tf 0.06 0.09 0.16 rg 360 ${yTable + 2.5} Td ($${pdfEscapeWinAnsi(formatMoney(r.monthlyInstallment))} USD) Tj ET`);
      p1.push(`BT /F1 6.8 Tf 0.28 0.33 0.41 rg 475 ${yTable + 2.5} Td ($${pdfEscapeWinAnsi(formatMoney(r.remainingPrincipal))} USD) Tj ET`);
    }

    // Fila Total * 24 Meses
    yTable -= 13;
    p1.push(`0.93 0.95 0.98 rg 42 ${yTable} 530 13 re f`);
    p1.push(`0.06 0.09 0.16 RG 1.2 w 42 ${yTable + 13} m 572 ${yTable + 13} l S`);
    p1.push(`BT /F2 7.5 Tf 0.06 0.09 0.16 rg 50 ${yTable + 3.5} Td (TOTAL * 24 MESES) Tj ET`);
    p1.push(`BT /F2 7.5 Tf 0.06 0.09 0.16 rg 130 ${yTable + 3.5} Td ($${pdfEscapeWinAnsi(formatMoney(schedule.principal))} USD) Tj ET`);
    p1.push(`BT /F2 7.5 Tf 0.02 0.47 0.34 rg 245 ${yTable + 3.5} Td ($${pdfEscapeWinAnsi(formatMoney(schedule.totalInterest24Months))} USD) Tj ET`);
    p1.push(`BT /F2 8 Tf 0.43 0.16 0.85 rg 360 ${yTable + 3.5} Td ($${pdfEscapeWinAnsi(formatMoney(schedule.totalPayable24Months))} USD) Tj ET`);
    p1.push(`BT /F2 7.5 Tf 0.06 0.09 0.16 rg 475 ${yTable + 3.5} Td ($0.00 USD) Tj ET`);

    // Cláusula de Abono a Capital Anticipado
    const yCallout = yTable - 46;
    p1.push(`0.96 0.95 1.0 rg 42 ${yCallout} 530 40 re f`);
    p1.push(`0.49 0.23 0.93 RG 1 w 42 ${yCallout} 530 40 re S`);
    p1.push(`BT /F2 7.8 Tf 0.29 0.11 0.58 rg 50 ${yCallout + 28} Td (CLAUSULA DE ABONO A CAPITAL ANTICIPADO - SI ES POSIBLE ABONAR A CAPITAL SIN PENALIDAD:) Tj ET`);
    const prepayLines = wrapTextLines(
      `OntopBank certifica expresamente que EL SOLICITANTE SI PUEDE REALIZAR ABONOS EXTRAORDINARIOS A CAPITAL o cancelar anticipadamente el saldo total del prestamo en cualquier momento dentro de los 24 meses, sin ningun tipo de penalidad o comision por prepago, reduciendo directamente el capital e intereses.`,
      98
    );
    let yPre = yCallout + 17;
    for (const pl of prepayLines) {
      p1.push(`BT /F1 7.5 Tf 0.18 0.06 0.40 rg 50 ${yPre} Td (${pdfEscapeWinAnsi(pl)}) Tj ET`);
      yPre -= 9.5;
    }

    // ========================================================================
    // CONSTRUCCIÓN DE LA HOJA 2 DE 2 (POLÍTICAS DE PRIVACIDAD DE ONTOPBANK Y FIRMAS)
    // ========================================================================
    const p2 = drawPageChrome(2, `Titular: ${fullName.slice(0, 26)}`);

    let y2 = 692;
    const clauses = [
      {
        title: '1. MODALIDAD DE DESEMBOLSO Y PAGOS EN PLATAFORMA ONTOPBANK',
        body: `El Solicitante acepta de manera libre, voluntaria e informada las condiciones financieras aprobadas en la Hoja 1 por un monto principal de $${formatMoney(schedule.principal)} USD, con una tasa fija del 8.00% anual sobre el valor prestado, pagadero en 24 cuotas mensuales de $${formatMoney(schedule.monthlyInstallment)} USD para un total acumulado a los 24 meses (*24 meses) de $${formatMoney(schedule.totalPayable24Months)} USD. Todos los pagos y abonos a capital se ejecutaran a traves de los canales autorizados de OntopBank conforme a los Terminos de Servicio en https://www.getontop.com/legal/terms-of-service.`
      },
      {
        title: '2. POLITICAS DE PRIVACIDAD Y PROTECCION DE DATOS PERSONALES DE ONTOPBANK (PRIVACY POLICY)',
        body: `En cumplimiento de las Leyes de Proteccion de Datos Financieros de los Estados Unidos (Gramm-Leach-Bliley Act - GLBA, CCPA y leyes del Estado de Delaware) y estandares internacionales, ONTOPBANK IC OPERATIONS LLC. garantiza la proteccion integral de la informacion del Solicitante:`
      },
      {
        title: '2.1 DEFINICIONES Y ALCANCE DE INFORMACION PERSONAL (PERSONAL DATA PROTECTION)',
        body: `"Informacion Personal" comprende todo dato identificativo (SSN, ITIN, Pasaporte, Licencia), migratorio, laboral (${workplace} - ${jobFunctions}), lugar de residencia (${residence}) y soporte financiero (${incomeSource}) suministrado por ${fullName} ("Titular de los Datos / Data Subject"). "Tratamiento" significa cualquier operacion de validacion, calculo matematico de Score, custodia cifrada y originacion crediticia.`
      },
      {
        title: '2.2 COMPROMISO DE CONFIDENCIALIDAD, CIFRADO BANCARIO Y NO COMERCIALIZACION',
        body: `OntopBank custodia los expedientes bajo cifrado bancario AES-256 y TLS 1.3. OntopBank garantiza que jamas vendera, alquilara ni divulgara la Informacion Personal del Solicitante a terceros no autorizados. Unicamente se compartira informacion estrictamente necesaria con la entidad financiera aliada (${c.entidadFinanciera || 'Ontop Global Credit Bridge'}) bajo acuerdos escritos de reserva bancaria igualmente restrictivos.`
      },
      {
        title: '2.3 DERECHOS DEL TITULAR DE LOS DATOS (ACCESO, RECTIFICACION Y SUPRESION)',
        body: `El Solicitante conserva en todo momento el derecho de acceder a su expediente, actualizar su lugar de residencia o informacion laboral, y solicitar la supresion o bloqueo de sus archivos una vez extinguida la obligacion crediticia, garantizando un trato equitativo y libre de discriminacion por estatus migratorio o nacionalidad.`
      },
      {
        title: '3. CONFIDENCIALIDAD, PREVENCION DE LAVADO DE ACTIVOS (AML/KYC) Y LEY ANTISOBORNO (FCPA)',
        body: `El Solicitante declara que sus ingresos mensuales demostrados ($${formatMoney(c.ingresosMensuales || 0)} USD/mes via ${incomeSource}) provienen de actividades licitas y que el capital aprobado se destinara a ${c.propositoPrestamo || 'Calidad de Vida'}, en cumplimiento de la U.S. Foreign Corrupt Practices Act (FCPA) y normativas AML/KYC.`
      },
      {
        title: '4. DERECHO IRRESTRICTO DE ABONO A CAPITAL Y PREPAGO TOTAL O PARCIAL',
        body: `Ninguna disposicion de este Contrato restringe el derecho del Solicitante a realizar abonos extraordinarios a capital antes de los 24 meses. Todo pago anticipado se aplicara directamente al principal sin penalidad, multa ni recargo alguno.`
      },
      {
        title: '5. FIRMA ELECTRONICA, LEY APLICABLE Y JURISDICCION (DELAWARE & FLORIDA, EE. UU.)',
        body: `Las Partes acuerdan que el presente Contrato Oficial se suscribe con plena validez juridica mediante firma electronica conforme a la ley federal U.S. ESIGN Act. Este Acuerdo se rige por las leyes del Estado de Delaware, EE. UU., sometiendose cualquier controversia a la jurisdiccion exclusiva de los tribunales de Miami-Dade County, Florida.`
      }
    ];

    for (const cl of clauses) {
      p2.push(`BT /F2 8.8 Tf 0.06 0.09 0.16 rg 42 ${y2} Td (${pdfEscapeWinAnsi(cl.title)}) Tj ET`);
      y2 -= 12;
      for (const line of wrapTextLines(cl.body, 98)) {
        p2.push(`BT /F1 8.1 Tf 0.20 0.25 0.33 rg 42 ${y2} Td (${pdfEscapeWinAnsi(line)}) Tj ET`);
        y2 -= 10.5;
      }
      y2 -= 6;
    }

    // Testimonio y Bloque de Firmas en Hoja 2
    y2 -= 4;
    p2.push(`BT /F2 8.4 Tf 0.06 0.09 0.16 rg 42 ${y2} Td (IN WITNESS WHEREOF / EN CONSTANCIA DE LO CUAL, las Partes suscriben el presente Acuerdo en la Fecha Efectiva.) Tj ET`);

    const sigTop = y2 - 18;
    p2.push(`0.79 0.83 0.88 RG 1 w 42 ${sigTop} m 572 ${sigTop} l S`);

    // Firma Izquierda: OntopBank
    p2.push(`BT /F2 8.5 Tf 0.06 0.09 0.16 rg 42 ${sigTop - 16} Td (ONTOPBANK IC OPERATIONS LLC.:) Tj ET`);
    p2.push(`BT /F2 12 Tf 0.30 0.11 0.58 rg 42 ${sigTop - 38} Td (Elena Vance - Chief Credit Officer) Tj ET`);
    p2.push(`0.06 0.09 0.16 RG 1 w 42 ${sigTop - 44} m 265 ${sigTop - 44} l S`);
    p2.push(`BT /F1 8 Tf 0.12 0.16 0.23 rg 42 ${sigTop - 56} Td (Nombre: Dra. Elena Vance - Comite de Underwriting) Tj ET`);
    p2.push(`BT /F2 8 Tf 0.02 0.47 0.34 rg 42 ${sigTop - 68} Td (Estado: SOLICITUD ACEPTADA Y FIRMADA DIGITALMENTE) Tj ET`);

    // Firma Derecha: El Solicitante
    p2.push(`BT /F2 8.5 Tf 0.06 0.09 0.16 rg 315 ${sigTop - 16} Td (EL SOLICITANTE / PRESTATARIO:) Tj ET`);
    p2.push(`BT /F2 11 Tf 0.30 0.11 0.58 rg 315 ${sigTop - 38} Td (${pdfEscapeWinAnsi(fullName.slice(0, 32))}) Tj ET`);
    p2.push(`0.06 0.09 0.16 RG 1 w 315 ${sigTop - 44} m 565 ${sigTop - 44} l S`);
    p2.push(`BT /F1 8 Tf 0.12 0.16 0.23 rg 315 ${sigTop - 56} Td (Nombre: ${pdfEscapeWinAnsi(fullName.slice(0, 38))}) Tj ET`);
    p2.push(`BT /F1 8 Tf 0.12 0.16 0.23 rg 315 ${sigTop - 68} Td (ID: ${pdfEscapeWinAnsi(idLabel)} | Residencia: ${pdfEscapeWinAnsi(residence.slice(0, 24))}) Tj ET`);

    const stream1 = p1.join('\n');
    const stream2 = p2.join('\n');

    // Ensamblar objetos del documento PDF 1.4
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 7 0 R >>\nendobj\n',
      '4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 8 0 R >>\nendobj\n',
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
      '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
      `7 0 obj\n<< /Length ${stream1.length} >>\nstream\n${stream1}\nendstream\nendobj\n`,
      `8 0 obj\n<< /Length ${stream2.length} >>\nstream\n${stream2}\nendstream\nendobj\n`
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj;
    }

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i++) {
      pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return pdf;
  }

  // ==========================================================================
  // GENERADOR DE ACTA OFICIAL DE DESPACHO DE TARJETA CON DEPÓSITO OCULTO POR
  // SEGURIDAD, TRANSPORTADORA DE VALORES Y KIT DE BIENVENIDA (HTML / WORD / PDF)
  // Origen: OntopBank Ontop Holdings Inc. 66 W Flagler St Ste 900, Miami, FL 33130, Estados Unidos
  // ==========================================================================
  const ONTOP_HQ_OFFICIAL_ADDRESS =
    'OntopBank · Ontop Holdings Inc., 66 W Flagler St Ste 900, Miami, FL 33130, Estados Unidos';

  function buildArmoredDispatchWelcomeHtml(client, options = {}) {
    const c = client || {};
    const schedule = calculateLoanSchedule8Percent(c.montoSolicitado || 10000);
    const effectiveDate = c.cardActivatedAt || c.fechaActualizacion || c.fechaCreacion || new Date().toISOString().slice(0, 16).replace('T', ' ');
    const fullName = `${c.nombres || 'TITULAR'} ${c.apellidos || ''}`.trim().toUpperCase();
    const idLabel = `${c.tipoId || 'ID'}: ${c.numeroId || 'N/A'}`;
    const residence = c.residencia || 'Dirección de Residencia Verificada del Titular en EE. UU.';
    const cardLast4 = c.cardLast4 || '4829';
    const cardExpiry = c.cardExpiry || '08/29';
    const paymentChannelUsed = c.paymentChannelUsed || 'Canal Oficial Autorizado OntopBank';
    const guideCode = `VAL-ONTOP-${String(c.id || 'EXP-2026').replace(/[^A-Z0-9]/gi, '')}-${cardLast4}`;
    const redLogoSrc = options.redLogoDataUrl || '/Contenido/red.jpg';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Acta Oficial de Despacho y Transportadora de Valores - ${esc(fullName)}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif;
      background: #E2E8F0;
      color: #0F172A;
      line-height: 1.42;
      font-size: 11px;
    }
    .legal-sheet {
      position: relative;
      width: 8.5in;
      height: 11in;
      margin: 10px auto;
      background: #FFFFFF;
      padding: 0.48in 0.55in 0.42in 0.78in;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .coral-left-bar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 7mm;
      background: linear-gradient(180deg, #FF7E70 0%, #F43F5E 50%, #BE123C 100%);
    }
    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .route-box {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .route-card {
      border: 1.5px solid #CBD5E1;
      border-radius: 10px;
      padding: 10px 12px;
      background: #F8FAFC;
    }
    .route-card.origin {
      border-left: 4px solid #6D28D9;
      background: #FAF5FF;
    }
    .route-card.destination {
      border-left: 4px solid #059669;
      background: #ECFDF5;
    }
    .route-kicker {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #475569;
      margin-bottom: 3px;
    }
    .route-title {
      font-size: 11.5px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 3px;
    }
    .security-vault-banner {
      background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%);
      color: #FFFFFF;
      border: 2px solid #F59E0B;
      border-radius: 12px;
      padding: 12px 15px;
      margin-bottom: 12px;
    }
    .masked-amount-box {
      display: inline-block;
      background: rgba(245, 158, 11, 0.2);
      border: 1.5px dashed #FBBF24;
      color: #FDE68A;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 13px;
      font-weight: 900;
      padding: 4px 12px;
      border-radius: 8px;
      letter-spacing: 0.08em;
    }
    .history-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 10px;
    }
    .history-table th {
      background: #1E293B;
      color: #FFFFFF;
      padding: 6px 8px;
      text-align: left;
      font-size: 9.2px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .history-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #CBD5E1;
      color: #1E293B;
    }
    .kit-checklist {
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 12px;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1.5px solid #CBD5E1;
    }
    .sig-line {
      font-family: 'Georgia', serif;
      font-style: italic;
      font-size: 15px;
      font-weight: 700;
      color: #4C1D95;
      border-bottom: 1.5px solid #0F172A;
      padding-bottom: 3px;
      margin: 10px 0 5px;
    }
    .sheet-footer {
      border-top: 1px solid #CBD5E1;
      padding-top: 6px;
      font-size: 8.8px;
      color: #64748B;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { background: #FFFFFF; }
      .legal-sheet { margin: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <section class="legal-sheet">
    <div class="coral-left-bar"></div>
    <div>
      <header class="sheet-header">
        <div>
          ${getOntopHeaderLogoSvg(redLogoSrc)}
          <div style="font-size:9.5px; color:#475569; font-weight:600; margin-top:2px;">
            ONTOP HOLDINGS INC. · ARMORED VALUE TRANSPORT &amp; WELCOME DISPATCH DIVISION
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px; font-weight:800; color:#BE123C; letter-spacing:0.06em;">CERTIFICADO OFICIAL DE DESPACHO DE VALORES</div>
          <div style="font-size:12px; font-weight:900; color:#0F172A;">GUÍA DE SEGURIDAD: ${esc(guideCode)}</div>
          <div style="font-size:9.5px; color:#334155;">Expediente: <strong>${esc(c.id || 'EXP-2026')}</strong> · Fecha: ${esc(effectiveDate)}</div>
        </div>
        <div>${getLegalOntopStampSvg()}</div>
      </header>

      <h1 style="font-size:13px; font-weight:900; color:#0F172A; text-transform:uppercase; margin-bottom:8px; letter-spacing:-0.01em;">
        ACTA OFICIAL DE DESPACHO DE TARJETA TITULAR CON DEPÓSITO PROTEGIDO, CONTRATO Y PAQUETE DE BIENVENIDA VIA TRANSPORTADORA DE VALORES
      </h1>

      <p style="font-size:10.3px; color:#334155; margin-bottom:10px; text-align:justify;">
        Por medio de la presente Acta Oficial de Custodia y Despacho, <strong>ONTOPBANK · ONTOP HOLDINGS INC.</strong> certifica que el expediente crediticio perteneciente a <strong>${esc(fullName)}</strong> (identificado/a con <strong>${esc(idLabel)}</strong>) ha completado satisfactoriamente la validación de cumplimiento y pago de habilitación, pasando al estado <strong>5. CRÉDITO ACTIVADO Y EN DESEMBOLSO</strong>. En consecuencia, se ha ordenado la salida física mediante <strong>Transportadora de Valores Blindada</strong> desde nuestra sede corporativa en Miami, Florida, hasta el domicilio registrado del titular:
      </p>

      <!-- RUTA OFICIAL: ORIGEN MIAMI -> DESTINO RESIDENCIA DEL CLIENTE -->
      <div class="route-box">
        <div class="route-card origin">
          <div class="route-kicker">🏢 DIRECCIÓN OFICIAL DE ORIGEN (SEDE CENTRAL ONTOPBANK)</div>
          <div class="route-title">OntopBank · Ontop Holdings Inc.</div>
          <div style="font-size:10.2px; color:#1E293B; font-weight:700;">
            66 W Flagler St Ste 900, Miami, FL 33130, Estados Unidos
          </div>
          <div style="font-size:9.2px; color:#475569; margin-top:3px;">
            Bóveda de Emisión y Custodia Bancaria · Jurisdicción Federal EE. UU.
          </div>
        </div>

        <div class="route-card destination">
          <div class="route-kicker">📍 DIRECCIÓN DE DESTINO Y ENTREGA PERSONALIZADA (RESIDENCIA TITULAR)</div>
          <div class="route-title">${esc(fullName)}</div>
          <div style="font-size:10.5px; color:#065F46; font-weight:800;">
            ${esc(residence)}
          </div>
          <div style="font-size:9.2px; color:#047857; margin-top:3px;">
            Contacto Verificado: ${esc(c.telefono || 'Registrado')} · ${esc(c.email || '')}
          </div>
        </div>
      </div>

      <!-- PROTOCOLO DE SEGURIDAD: DEPÓSITO OCULTO HASTA ENTREGA POR TRANSPORTADORA -->
      <div class="security-vault-banner">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:6px;">
          <div>
            <div style="font-size:9px; font-weight:800; color:#FBBF24; letter-spacing:0.08em; text-transform:uppercase;">
              🔒 PROTOCOLO DE SEGURIDAD BANCARIA · CUSTODIA EN TRÁNSITO BLINDADO
            </div>
            <div style="font-size:12px; font-weight:800; color:#FFFFFF;">
              Tarjeta Titular Ontop Visa Platinum (•••• •••• •••• ${esc(cardLast4)} · EXP ${esc(cardExpiry)}) con Depósito Cargado
            </div>
          </div>
          <div class="masked-amount-box">
            DEPÓSITO EN CUSTODIA: $ •••,•••.•• USD (OCULTO POR SEGURIDAD)
          </div>
        </div>
        <p style="font-size:9.8px; color:#E2E8F0; line-height:1.4;">
          <strong>AVISO DE PRIVACIDAD DE FONDOS EN TRÁNSITO:</strong> Por estricta normativa de seguridad de la <strong>Transportadora de Valores</strong> y protección patrimonial del titular, el monto exacto del depósito incorporado en la tarjeta física viaja bajo <strong>reserva criptográfica oculta ($ •••,•••.•• USD)</strong> en el manifiesto exterior. El saldo total aprobado quedará <strong>100% liberado y disponible para ser retirado o utilizado de inmediato</strong> tan pronto el titular reciba el sobre sellado de bienvenida y firme el acta de entrega de la transportadora en su dirección de residencia (<strong>${esc(residence)}</strong>).
        </p>
      </div>

      <!-- HISTORIAL CORRESPONDIENTE DEL CLIENTE -->
      <div style="font-size:10.5px; font-weight:800; color:#0F172A; text-transform:uppercase; margin-bottom:5px;">
        📋 HISTORIAL OFICIAL Y TRAZABILIDAD DEL EXPEDIENTE (${esc(c.id || 'EXP-2026')})
      </div>
      <table class="history-table">
        <thead>
          <tr>
            <th>Etapa / Hito del Proceso</th>
            <th>Estado Verificado</th>
            <th>Detalle de Operación y Cumplimiento</th>
            <th>Registro Temporal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1. Originación y Score KYC</strong></td>
            <td><strong style="color:#059669;">✔ COMPLETADO</strong></td>
            <td>Verificación de identidad (${esc(idLabel)}) y Score Matemático aprobado (${esc(c.scoreCredito || 650)}/750).</td>
            <td>${esc(c.fechaCreacion || effectiveDate)}</td>
          </tr>
          <tr>
            <td><strong>2. Emisión Contrato Legal 24m</strong></td>
            <td><strong style="color:#059669;">✔ FIRMADO</strong></td>
            <td>Contrato Oficial a 24 meses (8.00% EA · Cuota $${formatMoney(schedule.monthlyInstallment)}/mes) emitido.</td>
            <td>${esc(c.fechaCreacion || effectiveDate)}</td>
          </tr>
          <tr>
            <td><strong>3. Pago y Habilitación Riel</strong></td>
            <td><strong style="color:#059669;">✔ VERIFICADO</strong></td>
            <td>Confirmación de pago y activación de Tarjeta Ontop Visa Platinum (•••• ${esc(cardLast4)}) via ${esc(paymentChannelUsed)}.</td>
            <td>${esc(effectiveDate)}</td>
          </tr>
          <tr>
            <td><strong>4. Despacho Transportadora</strong></td>
            <td><strong style="color:#1D4ED8;">🚚 EN TRÁNSITO</strong></td>
            <td>Salida desde 66 W Flagler St Ste 900, Miami, FL 33130 hacia ${esc(residence)} con Depósito Oculto y Kit de Bienvenida.</td>
            <td>Guía ${esc(guideCode)}</td>
          </tr>
        </tbody>
      </table>

      <!-- CONTENIDO DEL PAQUETE DE BIENVENIDA Y PAPELEO CORRESPONDIENTE -->
      <div class="kit-checklist">
        <div style="font-size:10.2px; font-weight:800; color:#0F172A; text-transform:uppercase; margin-bottom:5px;">
          📦 DOCUMENTACIÓN Y ELEMENTOS INCLUIDOS EN LA ENTREGA DE BIENVENIDA:
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:9.8px; color:#1E293B;">
          <div>✔ <strong>1. Tarjeta Física Ontop Visa Platinum (•••• ${esc(cardLast4)}):</strong> Con chip EMV y depósito pre-cargado oculto por seguridad listo para retiro al recibir.</div>
          <div>✔ <strong>2. Contrato Oficial de Préstamo (2 Hojas):</strong> Copia física sellada del acuerdo al 8.00% anual estructurado a 24 meses.</div>
          <div>✔ <strong>3. Carta Oficial de Bienvenida OntopBank:</strong> Credenciales de activación en recepción y protocolo de retiro seguro sin restricciones.</div>
          <div>✔ <strong>4. Papeleo Legal y Certificado de Custodia:</strong> Póliza de seguro de transporte de valores desde Miami, FL hasta el domicilio del titular.</div>
        </div>
      </div>

      <!-- FIRMAS DE AUTORIZACIÓN Y RECEPCIÓN -->
      <div class="signatures-grid">
        <div>
          <div style="font-size:9.5px; font-weight:800; color:#0F172A;">DESPACHADO POR ONTOPBANK HOLDINGS INC.:</div>
          <div class="sig-line">Elena Vance — Armored Dispatch Director</div>
          <div style="font-size:9px; color:#334155;"><strong>Origen:</strong> 66 W Flagler St Ste 900, Miami, FL 33130, EE. UU.</div>
          <div style="font-size:9px; color:#059669; font-weight:700;">Estado: VALORES SELLADOS Y ENTREGADOS A TRANSPORTADORA</div>
        </div>
        <div>
          <div style="font-size:9.5px; font-weight:800; color:#0F172A;">RECEPCIÓN EN DOMICILIO DEL TITULAR (PARA RETIRO DE DEPÓSITO):</div>
          <div class="sig-line">${esc(fullName)}</div>
          <div style="font-size:9px; color:#334155;"><strong>Titular:</strong> ${esc(fullName)} (${esc(idLabel)})</div>
          <div style="font-size:9px; color:#334155;"><strong>Destino:</strong> ${esc(residence)}</div>
        </div>
      </div>
    </div>

    <footer class="sheet-footer">
      <span>OntopBank · Ontop Holdings Inc. · 66 W Flagler St Ste 900, Miami, FL 33130, Estados Unidos</span>
      <span>Acta Oficial de Despacho &amp; Bienvenida · Guía ${esc(guideCode)}</span>
    </footer>
  </section>
</body>
</html>`;
  }

  // Genera el PDF nativo 1.4 de 1 página con el Acta Oficial de Despacho de Valores, Depósito Oculto y Bienvenida
  function buildArmoredDispatchWelcomePdfBinary(client) {
    const c = client || {};
    const schedule = calculateLoanSchedule8Percent(c.montoSolicitado || 10000);
    const effectiveDate = c.cardActivatedAt || c.fechaActualizacion || c.fechaCreacion || new Date().toISOString().slice(0, 10);
    const fullName = `${c.nombres || 'TITULAR'} ${c.apellidos || ''}`.trim().toUpperCase();
    const idLabel = `${c.tipoId || 'ID'}: ${c.numeroId || 'N/A'}`;
    const residence = c.residencia || 'Residencia Verificada del Titular en EE. UU.';
    const cardLast4 = c.cardLast4 || '4829';
    const cardExpiry = c.cardExpiry || '08/29';
    const paymentChannelUsed = c.paymentChannelUsed || 'Canal Oficial Autorizado';
    const guideCode = `VAL-ONTOP-${String(c.id || 'EXP-2026').replace(/[^A-Z0-9]/gi, '')}-${cardLast4}`;

    const ops = [];
    // Franja vertical izquierda coral-rosa
    ops.push('0.98 0.36 0.42 rg 0 396 20 396 re f');
    ops.push('0.96 0.18 0.38 rg 0 0 20 396 re f');

    // Logo superior izquierdo ^ ontop
    ops.push('0.96 0.32 0.40 rg 42 736 m 54 760 l 66 736 l 60 736 l 54 748 l 48 736 l h f');
    ops.push('BT /F2 22 Tf 0.96 0.32 0.40 rg 72 739 Td (ontop) Tj ET');
    ops.push('BT /F2 8 Tf 0.43 0.16 0.85 rg 138 743 Td (ARMORED DISPATCH) Tj ET');

    // Encabezado central
    ops.push('BT /F2 8 Tf 0.75 0.07 0.24 rg 235 752 Td (ACTA OFICIAL DE TRANSPORTADORA DE VALORES) Tj ET');
    ops.push(`BT /F2 9.5 Tf 0.06 0.09 0.16 rg 235 740 Td (GUIA: ${pdfEscapeWinAnsi(guideCode)}) Tj ET`);
    ops.push(`BT /F1 8 Tf 0.28 0.33 0.41 rg 235 729 Td (Expediente: ${pdfEscapeWinAnsi(c.id || 'EXP-2026')} | Fecha: ${pdfEscapeWinAnsi(effectiveDate)}) Tj ET`);

    // Sello LEGAL ontop derecha
    ops.push('0.95 0.28 0.38 RG 2 w 510 718 58 38 re S');
    ops.push('0.99 0.95 0.96 rg 512 720 54 34 re f');
    ops.push('BT /F2 12 Tf 0.95 0.25 0.36 rg 519 739 Td (LEGAL) Tj ET');
    ops.push('BT /F2 9 Tf 0.95 0.25 0.36 rg 525 726 Td (ontop) Tj ET');

    ops.push('0.88 0.91 0.94 RG 1 w 42 712 m 572 712 l S');

    // Título
    ops.push('BT /F2 10.2 Tf 0.06 0.09 0.16 rg 42 694 Td (CERTIFICADO DE ENVIO DE TARJETA CON DEPOSITO OCULTO, CONTRATO Y BIENVENIDA) Tj ET');

    // Párrafo introductorio
    const intro = `ONTOPBANK - ONTOP HOLDINGS INC. certifica que el credito de ${fullName} (${idLabel}) se encuentra ACTIVADO Y EN DESEMBOLSO. Se ha despachado mediante Transportadora de Valores Blindada el paquete oficial de bienvenida con la tarjeta titular, el deposito cargado (oculto por seguridad), el contrato oficial y el papeleo legal correspondiente:`;
    let y = 676;
    for (const line of wrapTextLines(intro, 96)) {
      ops.push(`BT /F1 8.4 Tf 0.20 0.25 0.33 rg 42 ${y} Td (${pdfEscapeWinAnsi(line)}) Tj ET`);
      y -= 11;
    }

    // Caja de Ruta: Origen Miami -> Destino Residencia del Cliente
    const routeTop = y - 6;
    ops.push('0.97 0.96 1.00 rg 42 ' + (routeTop - 64) + ' 258 64 re f');
    ops.push('0.43 0.16 0.85 RG 1.2 w 42 ' + (routeTop - 64) + ' 258 64 re S');
    ops.push(`BT /F2 7.8 Tf 0.43 0.16 0.85 rg 50 ${routeTop - 14} Td (DIRECCION OFICIAL DE ORIGEN - SEDE ONTOPBANK:) Tj ET`);
    ops.push(`BT /F2 9 Tf 0.06 0.09 0.16 rg 50 ${routeTop - 27} Td (OntopBank - Ontop Holdings Inc.) Tj ET`);
    ops.push(`BT /F2 8.2 Tf 0.12 0.16 0.23 rg 50 ${routeTop - 39} Td (66 W Flagler St Ste 900, Miami, FL 33130,) Tj ET`);
    ops.push(`BT /F2 8.2 Tf 0.12 0.16 0.23 rg 50 ${routeTop - 50} Td (Estados Unidos) Tj ET`);

    ops.push('0.93 0.99 0.96 rg 312 ' + (routeTop - 64) + ' 260 64 re f');
    ops.push('0.02 0.59 0.41 RG 1.2 w 312 ' + (routeTop - 64) + ' 260 64 re S');
    ops.push(`BT /F2 7.8 Tf 0.02 0.47 0.34 rg 320 ${routeTop - 14} Td (DIRECCION DE DESTINO - RESIDENCIA DEL TITULAR:) Tj ET`);
    ops.push(`BT /F2 9 Tf 0.06 0.09 0.16 rg 320 ${routeTop - 27} Td (${pdfEscapeWinAnsi(fullName.slice(0, 34))}) Tj ET`);
    const resLines = wrapTextLines(residence, 42);
    ops.push(`BT /F2 8.2 Tf 0.02 0.37 0.27 rg 320 ${routeTop - 39} Td (${pdfEscapeWinAnsi(resLines[0] || residence)}) Tj ET`);
    if (resLines[1]) {
      ops.push(`BT /F2 8.2 Tf 0.02 0.37 0.27 rg 320 ${routeTop - 50} Td (${pdfEscapeWinAnsi(resLines[1])}) Tj ET`);
    } else {
      ops.push(`BT /F1 7.8 Tf 0.20 0.25 0.33 rg 320 ${routeTop - 50} Td (Tel: ${pdfEscapeWinAnsi(c.telefono || 'Verificado')}) Tj ET`);
    }

    // Banner Oscuro de Seguridad: Depósito Oculto por Seguridad
    const vaultTop = routeTop - 78;
    ops.push('0.08 0.10 0.22 rg 42 ' + (vaultTop - 82) + ' 530 82 re f');
    ops.push('0.96 0.62 0.04 RG 1.5 w 42 ' + (vaultTop - 82) + ' 530 82 re S');
    ops.push(`BT /F2 8.5 Tf 0.98 0.75 0.14 rg 52 ${vaultTop - 16} Td (PROTOCOLO DE SEGURIDAD: TARJETA CON DEPOSITO OCULTO EN CUSTODIA DE VALORES) Tj ET`);
    ops.push(`BT /F2 9.5 Tf 1 1 1 rg 52 ${vaultTop - 31} Td (Tarjeta Ontop Visa Platinum: **** **** **** ${pdfEscapeWinAnsi(cardLast4)}  |  EXP: ${pdfEscapeWinAnsi(cardExpiry)}) Tj ET`);
    ops.push(`BT /F2 9.5 Tf 0.99 0.88 0.45 rg 52 ${vaultTop - 45} Td (MONTO DEL DEPOSITO INCORPORADO:  $ ***,***.** USD  [OCULTO POR SEGURIDAD]) Tj ET`);

    const vaultNote = `Por seguridad bancaria durante el traslado en la Transportadora de Valores desde 66 W Flagler St Ste 900, Miami, FL 33130 hasta ${residence}, el valor del deposito viaja oculto en la guia externa y queda 100% habilitado para ser retirado por el titular una vez llegue a su residencia.`;
    let vy = vaultTop - 59;
    for (const line of wrapTextLines(vaultNote, 94)) {
      ops.push(`BT /F1 7.9 Tf 0.88 0.91 0.96 rg 52 ${vy} Td (${pdfEscapeWinAnsi(line)}) Tj ET`);
      vy -= 10;
    }

    // Historial del Cliente
    let hy = vaultTop - 102;
    ops.push(`BT /F2 9.2 Tf 0.06 0.09 0.16 rg 42 ${hy} Td (HISTORIAL CORRESPONDIENTE DEL CLIENTE Y TRAZABILIDAD DEL CREDITO (${pdfEscapeWinAnsi(c.id || 'EXP-2026')})) Tj ET`);
    hy -= 14;

    const historyItems = [
      `1. ORIGINACION Y SCORE KYC: Identificacion verificada (${idLabel}) - Score Matematico aprobado: ${c.scoreCredito || 650}/750.`,
      `2. CONTRATO LEGAL EMITIDO: Acuerdo oficial a 24 meses (8.00% EA - Cuota mensual $${formatMoney(schedule.monthlyInstallment)} USD) firmado.`,
      `3. PAGO Y ACTIVACION DE CUENTA: Habilitacion confirmada (${paymentChannelUsed}). Paso a Etapa 3: Credito Activado y en Desembolso.`,
      `4. DESPACHO TRANSPORTADORA DE VALORES: Envio fisico desde Ontop Holdings Inc. (66 W Flagler St Ste 900, Miami, FL 33130) hacia ${residence}.`
    ];

    for (const item of historyItems) {
      for (const line of wrapTextLines(item, 95)) {
        ops.push(`BT /F1 8.2 Tf 0.15 0.20 0.28 rg 48 ${hy} Td (${pdfEscapeWinAnsi(line)}) Tj ET`);
        hy -= 11;
      }
      hy -= 3;
    }

    // Papeleo y Kit de Bienvenida
    hy -= 6;
    ops.push('0.95 0.97 0.99 rg 42 ' + (hy - 78) + ' 530 88 re f');
    ops.push('0.79 0.83 0.88 RG 1 w 42 ' + (hy - 78) + ' 530 88 re S');
    ops.push(`BT /F2 8.8 Tf 0.06 0.09 0.16 rg 50 ${hy - 6} Td (CONTENIDO DEL PAQUETE DE BIENVENIDA, CONTRATO Y PAPELEO CORRESPONDIENTE:) Tj ET`);
    ops.push(`BT /F1 8.1 Tf 0.12 0.16 0.23 rg 50 ${hy - 21} Td (* Tarjeta Fisica Ontop Visa Platinum (**** ${pdfEscapeWinAnsi(cardLast4)}) con el deposito cargado y oculto por seguridad.) Tj ET`);
    ops.push(`BT /F1 8.1 Tf 0.12 0.16 0.23 rg 50 ${hy - 34} Td (* Contrato Oficial de Prestamo (2 Hojas) sellado por OntopBank IC Operations LLC. y cronograma a 24 meses.) Tj ET`);
    ops.push(`BT /F1 8.1 Tf 0.12 0.16 0.23 rg 50 ${hy - 47} Td (* Carta Oficial de Bienvenida e instrucciones para retiro inmediato del deposito a la llegada del blindado.) Tj ET`);
    ops.push(`BT /F1 8.1 Tf 0.12 0.16 0.23 rg 50 ${hy - 60} Td (* Acta de Custodia y Seguro de la Transportadora de Valores desde Miami, FL 33130 hasta el domicilio.) Tj ET`);

    // Firmas
    const sigTop = hy - 96;
    ops.push(`0.79 0.83 0.88 RG 1 w 42 ${sigTop} m 572 ${sigTop} l S`);
    ops.push(`BT /F2 8.3 Tf 0.06 0.09 0.16 rg 42 ${sigTop - 15} Td (ONTOPBANK - ONTOP HOLDINGS INC. (ORIGEN MIAMI):) Tj ET`);
    ops.push(`BT /F2 11 Tf 0.30 0.11 0.58 rg 42 ${sigTop - 34} Td (Elena Vance - Armored Dispatch Director) Tj ET`);
    ops.push(`0.06 0.09 0.16 RG 1 w 42 ${sigTop - 40} m 270 ${sigTop - 40} l S`);
    ops.push(`BT /F1 7.8 Tf 0.12 0.16 0.23 rg 42 ${sigTop - 52} Td (66 W Flagler St Ste 900, Miami, FL 33130, Estados Unidos) Tj ET`);

    ops.push(`BT /F2 8.3 Tf 0.06 0.09 0.16 rg 312 ${sigTop - 15} Td (TITULAR RECEPTOR EN RESIDENCIA (DESTINO):) Tj ET`);
    ops.push(`BT /F2 10.5 Tf 0.30 0.11 0.58 rg 312 ${sigTop - 34} Td (${pdfEscapeWinAnsi(fullName.slice(0, 32))}) Tj ET`);
    ops.push(`0.06 0.09 0.16 RG 1 w 312 ${sigTop - 40} m 565 ${sigTop - 40} l S`);
    ops.push(`BT /F1 7.8 Tf 0.12 0.16 0.23 rg 312 ${sigTop - 52} Td (Entrega en: ${pdfEscapeWinAnsi(residence.slice(0, 42))}) Tj ET`);

    // Pie de página
    ops.push('0.88 0.91 0.94 RG 0.8 w 42 36 m 572 36 l S');
    ops.push('BT /F1 7.5 Tf 0.40 0.45 0.54 rg 42 24 Td (OntopBank - Ontop Holdings Inc., 66 W Flagler St Ste 900, Miami, FL 33130, Estados Unidos) Tj ET');
    ops.push(`BT /F2 8 Tf 0.06 0.09 0.16 rg 495 24 Td (Hoja Unica - Guia) Tj ET`);

    const stream = ops.join('\n');
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
      `6 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj;
    }
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
      pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return pdf;
  }

  // ==========================================================================
  // LEY DE IMPUESTOS Y FIT (FEE) POR ENVÍO DE PRÉSTAMO A CUENTA BANCARIA (DEPÓSITO DIRECTO)
  // Calcula la retención/impuesto federal aplicable según el tramo del monto a recibir
  // ==========================================================================
  function calculateDirectDepositTaxAndFit(principalAmount) {
    const amount = Number(principalAmount) || 0;
    let bracketCode = 'TRAMO I · MICRO-LIQUIDITY';
    let taxLawName = 'U.S. Internal Revenue Code (IRC § 1441) & Federal Documentary Stamp Tax Act';
    let taxLawCitation = '26 U.S.C. § 1441 / Florida Documentary Stamp Tax Stat. § 201.08';
    let taxRatePercent = 4.5;
    let baseWireFitUsd = 45;

    if (amount > 35000) {
      bracketCode = 'TRAMO IV · HIGH-VALUE CAPITAL';
      taxLawName = 'Federal High-Value Liquidity Settlement & FATCA Compliance Tax Act (IRC § 1471)';
      taxLawCitation = '26 U.S.C. § 1471-1474 (FATCA) & Federal Reserve Fedwire Settlement Statute';
      taxRatePercent = 2.75;
      baseWireFitUsd = 85;
    } else if (amount > 15000) {
      bracketCode = 'TRAMO III · COMMERCIAL & PERSONAL TIER';
      taxLawName = 'FATCA Cross-Border & Domestic Credit Facility Withholding Act (IRC § 1442)';
      taxLawCitation = '26 U.S.C. § 1442 & FinCEN Bank Secrecy Act (BSA) 31 CFR § 1010.410';
      taxRatePercent = 3.25;
      baseWireFitUsd = 65;
    } else if (amount > 5000) {
      bracketCode = 'TRAMO II · STANDARD CREDIT TIER';
      taxLawName = 'Federal Credit Wire Excise & ACH Clearing Tax Act (IRC § 4371)';
      taxLawCitation = '26 U.S.C. § 4371 & Federal Electronic Fund Transfer Act (Regulation E - 12 CFR 1005)';
      taxRatePercent = 3.8;
      baseWireFitUsd = 55;
    }

    const calculatedTaxUsd = Math.max(90, Number(((amount * taxRatePercent) / 100).toFixed(2)));
    const totalFitAndTaxUsd = Number((calculatedTaxUsd + baseWireFitUsd).toFixed(2));

    return {
      principalAmount: amount,
      bracketCode,
      taxLawName,
      taxLawCitation,
      taxRatePercent,
      calculatedTaxUsd,
      baseWireFitUsd,
      totalFitAndTaxUsd,
      netDisbursementToAccount: amount
    };
  }

  function buildDirectDepositTaxClearanceHtml(client, options = {}) {
    const c = client || {};
    const taxInfo = calculateDirectDepositTaxAndFit(c.montoSolicitado || 10000);
    const schedule = calculateLoanSchedule8Percent(c.montoSolicitado || 10000);
    const effectiveDate = c.ddLinkedAt || c.fechaActualizacion || c.fechaCreacion || new Date().toISOString().slice(0, 16).replace('T', ' ');
    const fullName = `${c.nombres || 'TITULAR'} ${c.apellidos || ''}`.trim().toUpperCase();
    const accountHolder = (c.ddAccountHolder || fullName).toUpperCase();
    const bankName = c.ddBankName || 'Bank of America (Convenio Directo ACH/Wire)';
    const accountType = c.ddAccountType || 'Checking Account (Cuenta Corriente)';
    const routingNumber = c.ddRoutingNumber || 'PENDIENTE DE VINCULACIÓN';
    const accountNumber = c.ddAccountNumber || 'PENDIENTE DE VINCULACIÓN';
    const idLabel = `${c.tipoId || 'ID'}: ${c.numeroId || 'N/A'}`;
    const residence = c.residencia || 'Estados Unidos';
    const orderCode = `ACH-TAX-${String(c.id || 'EXP-2026').replace(/[^A-Z0-9]/gi, '')}`;
    const redLogoSrc = options.redLogoDataUrl || '/Contenido/red.jpg';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Orden Oficial de Depósito Directo y Liquidación de Impuestos - ${esc(fullName)}</title>
  <style>
    @page { size: letter portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif; background: #E2E8F0; color: #0F172A; line-height: 1.4; font-size: 10.8px; }
    .legal-sheet {
      position: relative; width: 8.5in; height: 11in; margin: 10px auto; background: #FFFFFF;
      padding: 0.48in 0.55in 0.42in 0.78in; box-shadow: 0 10px 30px rgba(0,0,0,0.22);
      display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
    }
    .coral-left-bar { position: absolute; top: 0; left: 0; bottom: 0; width: 7mm; background: linear-gradient(180deg, #F59E0B 0%, #E11D48 55%, #6D28D9 100%); }
    .sheet-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px; margin-bottom: 12px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .box-card { border: 1.5px solid #CBD5E1; border-radius: 10px; padding: 10px 12px; background: #F8FAFC; }
    .box-card.bank { border-left: 4px solid #059669; background: #ECFDF5; }
    .box-card.holder { border-left: 4px solid #6D28D9; background: #FAF5FF; }
    .kicker { font-size: 8.8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: #475569; margin-bottom: 3px; }
    .tax-banner { background: linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%); color: #FFFFFF; border: 2px solid #F59E0B; border-radius: 12px; padding: 13px 16px; margin-bottom: 12px; }
    .tax-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
    .tax-table th { background: #0F172A; color: #FFFFFF; padding: 6px 9px; text-align: left; font-size: 9px; text-transform: uppercase; }
    .tax-table td { padding: 7px 9px; border-bottom: 1px solid #CBD5E1; color: #1E293B; }
    .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 10px; padding-top: 10px; border-top: 1.5px solid #CBD5E1; }
    .sig-line { font-family: 'Georgia', serif; font-style: italic; font-size: 15px; font-weight: 700; color: #4C1D95; border-bottom: 1.5px solid #0F172A; padding-bottom: 3px; margin: 10px 0 5px; }
    .sheet-footer { border-top: 1px solid #CBD5E1; padding-top: 6px; font-size: 8.8px; color: #64748B; display: flex; justify-content: space-between; }
    @media print { body { background: #FFFFFF; } .legal-sheet { margin: 0; box-shadow: none; } }
  </style>
</head>
<body>
  <section class="legal-sheet">
    <div class="coral-left-bar"></div>
    <div>
      <header class="sheet-header">
        <div>
          ${getOntopHeaderLogoSvg(redLogoSrc)}
          <div style="font-size:9.2px; color:#475569; font-weight:700; margin-top:2px;">
            ONTOP HOLDINGS INC. · DIRECT DEPOSIT CLEARINGHOUSE &amp; IRS TAX COMPLIANCE DIVISION
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px; font-weight:800; color:#D97706; letter-spacing:0.06em;">CONVENIO BANCARIO &amp; LIQUIDACIÓN DE IMPUESTOS</div>
          <div style="font-size:12px; font-weight:900; color:#0F172A;">ORDEN: ${esc(orderCode)}</div>
          <div style="font-size:9.5px; color:#334155;">Expediente: <strong>${esc(c.id || 'EXP-2026')}</strong> · Fecha: ${esc(effectiveDate)}</div>
        </div>
        <div>${getLegalOntopStampSvg()}</div>
      </header>

      <h1 style="font-size:12.8px; font-weight:900; color:#0F172A; text-transform:uppercase; margin-bottom:8px;">
        CERTIFICADO OFICIAL DE VINCULACIÓN DE DEPÓSITO DIRECTO (ACH / FEDWIRE) Y LIQUIDACIÓN DEL FEE (FIT) E IMPUESTO FEDERAL POR ENVÍO DE PRÉSTAMO
      </h1>

      <p style="font-size:10.2px; color:#334155; margin-bottom:10px; text-align:justify;">
        <strong>ONTOPBANK · ONTOP HOLDINGS INC.</strong> (con sede oficial en <strong>66 W Flagler St Ste 900, Miami, FL 33130, Estados Unidos</strong>) certifica que el crédito aprobado de <strong>${esc(fullName)}</strong> por un monto principal de <strong>$${formatMoney(taxInfo.principalAmount)} USD</strong> se encuentra vinculado al sistema de <strong>Convenios Bancarios para Depósito Directo</strong> en la cuenta receptora detallada a continuación:
      </p>

      <div class="grid-2">
        <div class="box-card holder">
          <div class="kicker">👤 DATOS DEL TITULAR Y EXPEDIENTE ACTIVADO</div>
          <div style="font-size:11.5px; font-weight:800; color:#0F172A; margin-bottom:3px;">${esc(fullName)}</div>
          <div><strong>Identificación:</strong> ${esc(idLabel)}</div>
          <div><strong>Residencia:</strong> ${esc(residence)}</div>
          <div><strong>Tarjeta Ontop Vinculada:</strong> Visa Platinum •••• ${esc(c.cardLast4 || '4829')}</div>
          <div><strong>Monto Aprobado a Recibir:</strong> <strong style="color:#059669;">$${formatMoney(taxInfo.principalAmount)} USD</strong></div>
        </div>

        <div class="box-card bank">
          <div class="kicker">🏦 CONVENIO BANCARIO VINCULADO PARA DEPÓSITO DIRECTO</div>
          <div style="font-size:11.5px; font-weight:800; color:#065F46; margin-bottom:3px;">${esc(bankName)}</div>
          <div><strong>Nombre del Titular de la Cuenta:</strong> ${esc(accountHolder)}</div>
          <div><strong>Número de Ruta (ABA Routing):</strong> <code style="font-weight:900; color:#0F172A;">${esc(routingNumber)}</code></div>
          <div><strong>Número de Cuenta Bancaria:</strong> <code style="font-weight:900; color:#0F172A;">${esc(accountNumber)}</code></div>
          <div><strong>Modalidad:</strong> ${esc(accountType)}</div>
        </div>
      </div>

      <!-- LEY DE IMPUESTOS APLICABLE SEGÚN EL MONTO A RECIBIR -->
      <div class="tax-banner">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:6px;">
          <div>
            <div style="font-size:9px; font-weight:800; color:#FBBF24; letter-spacing:0.08em; text-transform:uppercase;">
              ⚖️ LEY FEDERAL DE IMPUESTOS APLICADA (${esc(taxInfo.bracketCode)})
            </div>
            <div style="font-size:11.8px; font-weight:800; color:#FFFFFF;">
              ${esc(taxInfo.taxLawName)}
            </div>
            <div style="font-size:9.3px; color:#CBD5E1;">
              Fundamento Legal: <strong>${esc(taxInfo.taxLawCitation)}</strong>
            </div>
          </div>
          <div style="background:rgba(245,158,11,0.22); border:1.5px solid #FBBF24; padding:6px 12px; border-radius:8px; text-align:right;">
            <div style="font-size:8.5px; color:#FDE68A; font-weight:800; text-transform:uppercase;">TOTAL FIT + IMPUESTO DE ENVÍO</div>
            <div style="font-size:14px; font-weight:900; color:#FFFFFF;">$${formatMoney(taxInfo.totalFitAndTaxUsd)} USD</div>
          </div>
        </div>
        <p style="font-size:9.7px; color:#E2E8F0; line-height:1.42;">
          <strong>REQUISITO OBLIGATORIO PARA GENERAR EL DEPÓSITO DIRECTO:</strong> De conformidad con la normativa tributaria federal vigente en los Estados Unidos (<strong>${esc(taxInfo.taxLawCitation)}</strong>), toda dispersión de capital crediticio hacia una entidad bancaria mediante Depósito Directo requiere la liquidación previa del <strong>Impuesto Federal de Transferencia (${taxInfo.taxRatePercent}% sobre $${formatMoney(taxInfo.principalAmount)} USD = $${formatMoney(taxInfo.calculatedTaxUsd)} USD)</strong> más el <strong>Fit Operativo de Enrutamiento Bancario ABA/Fedwire ($${formatMoney(taxInfo.baseWireFitUsd)} USD)</strong>, para un total de <strong>$${formatMoney(taxInfo.totalFitAndTaxUsd)} USD</strong>. Una vez cubierto dicho concepto tributario, el banco receptor libera el <strong>100% del préstamo ($${formatMoney(taxInfo.principalAmount)} USD)</strong> sin deducciones adicionales.
        </p>
      </div>

      <div style="font-size:10.3px; font-weight:800; color:#0F172A; text-transform:uppercase; margin-bottom:5px;">
        📊 DESGLOSE DE LIQUIDACIÓN TRIBUTARIA Y FIT DE ENVÍO BANCARIO SEGÚN MONTO APROBADO
      </div>
      <table class="tax-table">
        <thead>
          <tr>
            <th>Concepto Financiero y Tributario</th>
            <th>Base Legal / Referencia ABA</th>
            <th style="text-align:right;">Tasa / Tarifa</th>
            <th style="text-align:right;">Valor Liquidado (USD)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1. Capital Principal del Préstamo Aprobado</strong></td>
            <td>Expediente ${esc(c.id)} · Plan 24 Meses (8.00% EA · Cuota $${formatMoney(schedule.monthlyInstallment)}/m)</td>
            <td style="text-align:right;">100.00%</td>
            <td style="text-align:right; font-weight:800; color:#059669;">$${formatMoney(taxInfo.principalAmount)} USD</td>
          </tr>
          <tr>
            <td><strong>2. Impuesto Federal sobre Monto a Recibir</strong></td>
            <td>${esc(taxInfo.taxLawName)}</td>
            <td style="text-align:right; font-weight:700;">${taxInfo.taxRatePercent.toFixed(2)}%</td>
            <td style="text-align:right; font-weight:800; color:#B45309;">$${formatMoney(taxInfo.calculatedTaxUsd)} USD</td>
          </tr>
          <tr>
            <td><strong>3. Fit (Fee) por Envío Bancario Directo (ACH / Fedwire)</strong></td>
            <td>Convenio Interbancario ABA Routing #${esc(routingNumber)} → Cuenta #${esc(accountNumber)}</td>
            <td style="text-align:right;">Tarifa Fija Federal</td>
            <td style="text-align:right; font-weight:800; color:#B45309;">$${formatMoney(taxInfo.baseWireFitUsd)} USD</td>
          </tr>
          <tr style="background:#FEF3C7;">
            <td colspan="2"><strong>TOTAL FIT POR ENVÍO + IMPUESTO FEDERAL A PAGAR PARA GENERAR EL DEPÓSITO</strong></td>
            <td style="text-align:right; font-weight:800; color:#92400E;">${esc(taxInfo.bracketCode)}</td>
            <td style="text-align:right; font-size:11.5px; font-weight:900; color:#92400E;">$${formatMoney(taxInfo.totalFitAndTaxUsd)} USD</td>
          </tr>
          <tr style="background:#ECFDF5;">
            <td colspan="3"><strong>MONTO LÍQUIDO TOTAL A ACREDITAR EN LA CUENTA DE ${esc(accountHolder)} TRAS VALIDACIÓN</strong></td>
            <td style="text-align:right; font-size:12px; font-weight:900; color:#047857;">$${formatMoney(taxInfo.netDisbursementToAccount)} USD</td>
          </tr>
        </tbody>
      </table>

      <div class="signatures-grid">
        <div>
          <div style="font-size:9.3px; font-weight:800; color:#0F172A;">AUTORIZACIÓN DE CONVENIO BANCARIO ONTOPBANK:</div>
          <div class="sig-line">Elena Vance — Treasury &amp; Tax Compliance Officer</div>
          <div style="font-size:8.8px; color:#334155;">OntopBank · Ontop Holdings Inc. · 66 W Flagler St Ste 900, Miami, FL 33130</div>
          <div style="font-size:8.8px; color:#059669; font-weight:700;">Convenio de Depósito Directo Verificado</div>
        </div>
        <div>
          <div style="font-size:9.3px; font-weight:800; color:#0F172A;">TITULAR DE LA CUENTA RECEPTORA:</div>
          <div class="sig-line">${esc(accountHolder)}</div>
          <div style="font-size:8.8px; color:#334155;"><strong>Banco:</strong> ${esc(bankName)} · <strong>Ruta:</strong> ${esc(routingNumber)}</div>
          <div style="font-size:8.8px; color:#334155;"><strong>Cuenta:</strong> ${esc(accountNumber)} (${esc(idLabel)})</div>
        </div>
      </div>
    </div>

    <footer class="sheet-footer">
      <span>OntopBank · Ontop Holdings Inc., 66 W Flagler St Ste 900, Miami, FL 33130, EE. UU. · Cumplimiento IRS / FATCA</span>
      <span>Orden de Depósito Directo &amp; Liquidación Tributaria · ${esc(orderCode)}</span>
    </footer>
  </section>
</body>
</html>`;
  }

  function buildDirectDepositTaxClearancePdfBinary(client) {
    const c = client || {};
    const taxInfo = calculateDirectDepositTaxAndFit(c.montoSolicitado || 10000);
    const schedule = calculateLoanSchedule8Percent(c.montoSolicitado || 10000);
    const effectiveDate = c.ddLinkedAt || c.fechaActualizacion || c.fechaCreacion || new Date().toISOString().slice(0, 10);
    const fullName = `${c.nombres || 'TITULAR'} ${c.apellidos || ''}`.trim().toUpperCase();
    const accountHolder = (c.ddAccountHolder || fullName).toUpperCase();
    const bankName = c.ddBankName || 'Bank of America (Convenio Directo ACH/Wire)';
    const accountType = c.ddAccountType || 'Checking Account';
    const routingNumber = c.ddRoutingNumber || 'PENDIENTE';
    const accountNumber = c.ddAccountNumber || 'PENDIENTE';
    const idLabel = `${c.tipoId || 'ID'}: ${c.numeroId || 'N/A'}`;
    const orderCode = `ACH-TAX-${String(c.id || 'EXP-2026').replace(/[^A-Z0-9]/gi, '')}`;

    const ops = [];
    ops.push('0.96 0.62 0.04 rg 0 396 20 396 re f');
    ops.push('0.96 0.18 0.38 rg 0 0 20 396 re f');

    ops.push('0.96 0.32 0.40 rg 42 736 m 54 760 l 66 736 l 60 736 l 54 748 l 48 736 l h f');
    ops.push('BT /F2 22 Tf 0.96 0.32 0.40 rg 72 739 Td (ontop) Tj ET');
    ops.push('BT /F2 8 Tf 0.43 0.16 0.85 rg 138 743 Td (DIRECT DEPOSIT & TAX) Tj ET');

    ops.push('BT /F2 8 Tf 0.85 0.47 0.02 rg 245 752 Td (CONVENIO BANCARIO Y LEY DE IMPUESTOS) Tj ET');
    ops.push(`BT /F2 9.5 Tf 0.06 0.09 0.16 rg 245 740 Td (ORDEN: ${pdfEscapeWinAnsi(orderCode)}) Tj ET`);
    ops.push(`BT /F1 8 Tf 0.28 0.33 0.41 rg 245 729 Td (Expediente: ${pdfEscapeWinAnsi(c.id || 'EXP-2026')} | Fecha: ${pdfEscapeWinAnsi(effectiveDate)}) Tj ET`);

    ops.push('0.95 0.28 0.38 RG 2 w 510 718 58 38 re S');
    ops.push('0.99 0.95 0.96 rg 512 720 54 34 re f');
    ops.push('BT /F2 12 Tf 0.95 0.25 0.36 rg 519 739 Td (LEGAL) Tj ET');
    ops.push('BT /F2 9 Tf 0.95 0.25 0.36 rg 525 726 Td (ontop) Tj ET');
    ops.push('0.88 0.91 0.94 RG 1 w 42 712 m 572 712 l S');

    ops.push('BT /F2 10.2 Tf 0.06 0.09 0.16 rg 42 694 Td (CERTIFICADO DE DEPOSITO DIRECTO BANCARIO Y LIQUIDACION DE IMPUESTO FEDERAL) Tj ET');

    const intro = `ONTOPBANK - ONTOP HOLDINGS INC. (66 W Flagler St Ste 900, Miami, FL 33130, EE. UU.) certifica que el credito activado de ${fullName} (${idLabel}) por $${formatMoney(taxInfo.principalAmount)} USD ha vinculado cuenta bancaria para Deposito Directo sujeta a la siguiente liquidacion legal de impuestos y Fit de envio:`;
    let y = 676;
    for (const line of wrapTextLines(intro, 96)) {
      ops.push(`BT /F1 8.4 Tf 0.20 0.25 0.33 rg 42 ${y} Td (${pdfEscapeWinAnsi(line)}) Tj ET`);
      y -= 11;
    }

    const boxTop = y - 6;
    ops.push('0.97 0.96 1.00 rg 42 ' + (boxTop - 68) + ' 258 68 re f');
    ops.push('0.43 0.16 0.85 RG 1.2 w 42 ' + (boxTop - 68) + ' 258 68 re S');
    ops.push(`BT /F2 7.8 Tf 0.43 0.16 0.85 rg 50 ${boxTop - 14} Td (DATOS DEL TITULAR DEL CREDITO APROBADO:) Tj ET`);
    ops.push(`BT /F2 9 Tf 0.06 0.09 0.16 rg 50 ${boxTop - 27} Td (${pdfEscapeWinAnsi(fullName.slice(0, 34))}) Tj ET`);
    ops.push(`BT /F1 8.1 Tf 0.12 0.16 0.23 rg 50 ${boxTop - 39} Td (ID: ${pdfEscapeWinAnsi(idLabel)}) Tj ET`);
    ops.push(`BT /F2 8.4 Tf 0.02 0.47 0.34 rg 50 ${boxTop - 52} Td (Monto a Recibir: $${pdfEscapeWinAnsi(formatMoney(taxInfo.principalAmount))} USD) Tj ET`);

    ops.push('0.93 0.99 0.96 rg 312 ' + (boxTop - 68) + ' 260 68 re f');
    ops.push('0.02 0.59 0.41 RG 1.2 w 312 ' + (boxTop - 68) + ' 260 68 re S');
    ops.push(`BT /F2 7.8 Tf 0.02 0.47 0.34 rg 320 ${boxTop - 14} Td (CUENTA VINCULADA PARA DEPOSITO DIRECTO:) Tj ET`);
    ops.push(`BT /F2 8.8 Tf 0.06 0.09 0.16 rg 320 ${boxTop - 26} Td (Banco: ${pdfEscapeWinAnsi(bankName.slice(0, 32))}) Tj ET`);
    ops.push(`BT /F2 8.3 Tf 0.06 0.09 0.16 rg 320 ${boxTop - 38} Td (Titular: ${pdfEscapeWinAnsi(accountHolder.slice(0, 32))}) Tj ET`);
    ops.push(`BT /F2 8.3 Tf 0.02 0.37 0.27 rg 320 ${boxTop - 50} Td (Ruta ABA: ${pdfEscapeWinAnsi(routingNumber)} | Cta: ${pdfEscapeWinAnsi(accountNumber)}) Tj ET`);
    ops.push(`BT /F1 7.6 Tf 0.20 0.25 0.33 rg 320 ${boxTop - 61} Td (Tipo: ${pdfEscapeWinAnsi(accountType)}) Tj ET`);

    const taxTop = boxTop - 82;
    ops.push('0.08 0.10 0.22 rg 42 ' + (taxTop - 86) + ' 530 86 re f');
    ops.push('0.96 0.62 0.04 RG 1.5 w 42 ' + (taxTop - 86) + ' 530 86 re S');
    ops.push(`BT /F2 8.4 Tf 0.98 0.75 0.14 rg 52 ${taxTop - 16} Td (LEY DE IMPUESTOS APLICABLE (${pdfEscapeWinAnsi(taxInfo.bracketCode)}):) Tj ET`);
    ops.push(`BT /F2 9.2 Tf 1 1 1 rg 52 ${taxTop - 30} Td (${pdfEscapeWinAnsi(taxInfo.taxLawName)}) Tj ET`);
    ops.push(`BT /F1 8 Tf 0.80 0.84 0.90 rg 52 ${taxTop - 42} Td (Estatuto Federal: ${pdfEscapeWinAnsi(taxInfo.taxLawCitation)}) Tj ET`);

    const taxNote = `Para generar el deposito directo del prestamo ($${formatMoney(taxInfo.principalAmount)} USD) al lugar bancario indicado, el titular debe cubrir el Fit de envio bancario ($${formatMoney(taxInfo.baseWireFitUsd)} USD) y el Impuesto Federal correspondiente al monto (${taxInfo.taxRatePercent}% = $${formatMoney(taxInfo.calculatedTaxUsd)} USD), por un total de $${formatMoney(taxInfo.totalFitAndTaxUsd)} USD.`;
    let ty = taxTop - 56;
    for (const line of wrapTextLines(taxNote, 94)) {
      ops.push(`BT /F1 7.9 Tf 0.99 0.91 0.65 rg 52 ${ty} Td (${pdfEscapeWinAnsi(line)}) Tj ET`);
      ty -= 10;
    }

    let hy = taxTop - 106;
    ops.push(`BT /F2 9.2 Tf 0.06 0.09 0.16 rg 42 ${hy} Td (DESGLOSE FINANCIERO Y TRIBUTARIO DE LA ORDEN DE DEPOSITO DIRECTO) Tj ET`);
    hy -= 16;

    const rows = [
      `1. CAPITAL APROBADO DEL PRESTAMO (Plan 24m - Cuota $${formatMoney(schedule.monthlyInstallment)}/mes):   $${formatMoney(taxInfo.principalAmount)} USD`,
      `2. IMPUESTO FEDERAL APLICADO (${taxInfo.taxRatePercent.toFixed(2)}% segun ${taxInfo.bracketCode}):   $${formatMoney(taxInfo.calculatedTaxUsd)} USD`,
      `3. FIT (FEE) OPERATIVO POR ENVIO DEL PRESTAMO AL BANCO RECEPTOR (ACH / WIRE):   $${formatMoney(taxInfo.baseWireFitUsd)} USD`,
      `4. TOTAL FIT + IMPUESTOS REQUERIDOS PARA GENERAR EL DEPOSITO DIRECTO:   $${formatMoney(taxInfo.totalFitAndTaxUsd)} USD`,
      `5. MONTO NETO A DEPOSITAR EN CUENTA #${accountNumber} (RUTA ${routingNumber}):   $${formatMoney(taxInfo.netDisbursementToAccount)} USD`
    ];

    for (const r of rows) {
      ops.push(`BT /F2 8.4 Tf 0.12 0.16 0.23 rg 48 ${hy} Td (${pdfEscapeWinAnsi(r)}) Tj ET`);
      hy -= 16;
    }

    const sigTop = hy - 20;
    ops.push(`0.79 0.83 0.88 RG 1 w 42 ${sigTop} m 572 ${sigTop} l S`);
    ops.push(`BT /F2 8.3 Tf 0.06 0.09 0.16 rg 42 ${sigTop - 15} Td (ONTOPBANK - TREASURY & TAX COMPLIANCE:) Tj ET`);
    ops.push(`BT /F2 11 Tf 0.30 0.11 0.58 rg 42 ${sigTop - 34} Td (Elena Vance - Chief Tax & Treasury Officer) Tj ET`);
    ops.push(`0.06 0.09 0.16 RG 1 w 42 ${sigTop - 40} m 270 ${sigTop - 40} l S`);
    ops.push(`BT /F1 7.8 Tf 0.12 0.16 0.23 rg 42 ${sigTop - 52} Td (66 W Flagler St Ste 900, Miami, FL 33130, Estados Unidos) Tj ET`);

    ops.push(`BT /F2 8.3 Tf 0.06 0.09 0.16 rg 312 ${sigTop - 15} Td (TITULAR DE LA CUENTA BANCARIA RECEPTORA:) Tj ET`);
    ops.push(`BT /F2 10.5 Tf 0.30 0.11 0.58 rg 312 ${sigTop - 34} Td (${pdfEscapeWinAnsi(accountHolder.slice(0, 32))}) Tj ET`);
    ops.push(`0.06 0.09 0.16 RG 1 w 312 ${sigTop - 40} m 565 ${sigTop - 40} l S`);
    ops.push(`BT /F1 7.8 Tf 0.12 0.16 0.23 rg 312 ${sigTop - 52} Td (Ruta ABA: ${pdfEscapeWinAnsi(routingNumber)} | Cuenta: ${pdfEscapeWinAnsi(accountNumber)}) Tj ET`);

    ops.push('0.88 0.91 0.94 RG 0.8 w 42 36 m 572 36 l S');
    ops.push('BT /F1 7.5 Tf 0.40 0.45 0.54 rg 42 24 Td (OntopBank - Ontop Holdings Inc., 66 W Flagler St Ste 900, Miami, FL 33130, EE. UU. - IRS Tax Compliance) Tj ET');
    ops.push(`BT /F2 8 Tf 0.06 0.09 0.16 rg 495 24 Td (Orden ${pdfEscapeWinAnsi(orderCode)}) Tj ET`);

    const stream = ops.join('\n');
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
      `6 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj;
    }
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
      pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return pdf;
  }

  return {
    ONTOP_HQ_OFFICIAL_ADDRESS,
    calculateLoanSchedule8Percent,
    calculateDirectDepositTaxAndFit,
    buildTwoPageContractHtml,
    buildTwoPagePdfBinary,
    buildArmoredDispatchWelcomeHtml,
    buildArmoredDispatchWelcomePdfBinary,
    buildDirectDepositTaxClearanceHtml,
    buildDirectDepositTaxClearancePdfBinary
  };
});
