# OntopBank (TopBank) — Plataforma Local de Originación y Gestión de Préstamos

Aplicación web 100% local (Node.js + Vanilla JS SPA) con diseño **Dark Mode Fintech (ADN Ontop)** para la originación por pasos, cálculo matemático de score crediticio, emisión de contratos legales en 2 hojas (PDF y Word) y gestión de créditos aprobados en 3 etapas con sincronización local y hacia Google Drive.

## Características Principales
- **Sistema de Diseño ADN Ontop Dark Fintech:** Fondos `#070412`, gradientes radiales `#1E0B4B` / `#2E1065`, tarjetas Glassmorphism y acentos en violeta `#8B5CF6` y verde esmeralda `#10B981`.
- **Asistente Guiado por Pasos (2 Pasos):**
  - **Paso 1:** Datos personales, estatus migratorio, identificación, lugar de trabajo y funciones.
  - **Paso 2:** Fuente de ingresos (`Cuenta bancaria EEUU`, `Cheque`, `Kash`, `Remesas`), cálculo matemático automático de Score (`350` a `750`, bloqueado) y fecha automática no editable.
- **Tablero Ejecutivo `💳 Créditos Aprobados` en 3 Etapas:**
  - **Etapa 1 (`⏳ Préstamos en Proceso`):** Temporizador regresivo en tiempo real de 6 minutos (`06:00` a `00:00`) con transición automática a Pre-Aprobado.
  - **Etapa 2 (`✨ Préstamos Pre-Aprobados`):** Emisión y descarga del Contrato Oficial de 2 hojas (PDF y Word al 8% anual por 12 meses) y generador de Tarjeta Virtual 3D Ontop Visa Platinum.
  - **Etapa 3 (`✅ Créditos Activados y en Desembolso`):** Visualización de tarjeta virtual activa y estado de riel bancario.
- **Persistencia Local y Espejo para Google Drive:** Guarda automáticamente en `GoogleDrive_Local_Sync/` (`clientes_prestamos.xls`, `clientes_prestamos.xlsx`, `clientes_prestamos.csv` y `database_prestamos.json`).

## Ejecución Local
1. Haz doble clic en `Iniciar_TopBank.bat` o ejecuta en terminal:
   ```bash
   node server.js
   ```
2. Abre en tu navegador: `http://localhost:3080`
