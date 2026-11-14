@echo off
title TopBank - Ontop Dark Fintech (Ejecucion 100%% Local)
color 0D
echo ======================================================================
echo   TOPBANK - PLATAFORMA DE PRESTAMOS FINANCIEROS EE. UU. / GLOBAL
echo   ADN Visual: Ontop Dark Fintech Premium
echo ======================================================================
echo.
echo Iniciando servidor local y abriendo navegador en http://localhost:3080 ...
start "" "http://localhost:3080"
node "%~dp0server.js"
pause
