# Pendientes técnicos de Limit-Switch

> English version: [PENDING.md](PENDING.md)

Registro de los puntos abiertos del proyecto, ordenados de más urgente a menos urgente. Cada punto indica estado, severidad, archivos afectados y una propuesta concreta. Los IDs son estables y no se renumeran; los puntos resueltos pasan a la sección [Corregidos](#corregidos) con su fecha y el motivo del cambio.

| # | Punto | Por qué está acá |
| --- | --- | --- |
| 1 | Publicar el add-on en el Google Workspace Marketplace | Hoy solo existe en el proyecto de Apps Script: no hay forma de que otra persona lo instale |
| 2 | Publicar las URLs requeridas por Google (homepage, privacidad, términos) | El listado y la verificación de OAuth exigen URLs públicas; los documentos viven únicamente dentro del repositorio |
| 3 | Verificar en un entorno real el almacenamiento por formulario | El fix del 2026-10-15 todavía no fue probado con dos cuentas y dos formularios simultáneos |
| 4 | Definir el comportamiento al modificar el límite con el formulario cerrado | Subir el límite no reabre el formulario; bajarlo por debajo del conteo actual no lo cierra hasta el próximo envío |
| 5 | Definir la identidad definitiva para el listado | Los assets actuales provienen de la etapa "Limiter"; el Marketplace requiere ícono, banner y capturas |
| 6 | Evaluar la internacionalización de la interfaz | La UI está únicamente en inglés; `useLocaleFromApp` está declarado pero no hay traducciones |
| 7 | Definir la estrategia de pruebas del código | No existen pruebas automatizadas; solo el checklist manual del README |
| 8 | Crear el release v1.0.0 | No hay tags ni notas de versión; corresponde al mergear el rebrand |

---

## 1. Publicar el add-on en el Google Workspace Marketplace

**Estado:** abierto
**Severidad:** alta
**Archivos:** proyecto de Apps Script (fuera del repositorio), `src/appsscript.json`

### Qué falta

El add-on es funcional y el código está versionado, pero no existe listado público: cualquier instalación requiere acceso directo al proyecto de Apps Script.

### Propuesta

1. Crear o vincular un proyecto estándar de Google Cloud y configurar la pantalla de consentimiento de OAuth (tipo externo, en modo prueba).
2. Publicar un listado **no listado (unlisted)** mediante el Workspace Marketplace SDK: permite la instalación por enlace para el autor y los primeros usuarios, sin revisión de Google (hasta 100 usuarios de prueba).
3. Solicitar la publicación pública una vez validado lo anterior (requiere verificación de la app: video demostrativo, justificación de scopes y las URLs del punto 2).

## 2. URLs públicas requeridas por Google

**Estado:** abierto
**Severidad:** alta
**Archivos:** `docs/Privacy_policy.md`, `docs/Terms_of_service.md`

### Qué falta

El listado y la verificación exigen homepage, política de privacidad y términos accesibles por URL pública. Hoy esos documentos solo se leen dentro del repositorio.

### Propuesta

Publicarlos con GitHub Pages desde `docs/`: agregar una página de inicio y versiones HTML de ambos documentos. Es suficiente para Google; no se requiere dominio propio.

## 3. Verificación del almacenamiento por formulario

**Estado:** abierto
**Severidad:** alta
**Archivos:** `src/main.js`, `src/actions.js`, `src/triggers.js`

### Qué falta

El fix (`getDocumentProperties()`) está en el código pero no fue desplegado ni probado en condiciones reales.

### Propuesta

Con dos cuentas de Google y dos formularios distintos, configurar límites diferentes y verificar que cada formulario conserve su propia configuración y cierre de forma independiente. Registrar el resultado antes de solicitar la publicación.

## 4. Comportamiento al modificar el límite con el formulario cerrado

**Estado:** abierto (decisión de diseño pendiente)
**Severidad:** media

- Subir el límite con el formulario cerrado por el add-on no lo reabre: queda cerrado hasta que se habilite manualmente.
- Bajar el límite por debajo de la cantidad de respuestas actuales no cierra el formulario hasta el próximo envío.

### Propuesta

Decidir explícitamente entre documentar ambos comportamientos o automatizarlos (por ejemplo, reabrir el formulario al detectar un límite mayor al conteo actual). En cualquiera de los dos casos, dejarlo asentado en el README.

## 5. Identidad de marca para el listado

**Estado:** abierto
**Severidad:** media

Los assets existentes en `misc/` provienen de la etapa anterior del proyecto y no contienen texto visible, por lo que siguen siendo utilizables. Para el listado público conviene definir el conjunto definitivo (ícono de 128×128, banner y capturas de pantalla) siguiendo la estética del ícono actual.

## 6. Internacionalización de la interfaz

**Estado:** abierto
**Severidad:** baja

La interfaz está en inglés, con `useLocaleFromApp` declarado pero sin traducciones. Si el alcance inicial es hispanohablante, evaluar una localización mínima (es-AR); si no, dejar documentado que el alcance es únicamente en inglés.

## 7. Estrategia de pruebas

**Estado:** abierto
**Severidad:** baja

No hay pruebas automatizadas (Apps Script no incluye un runner nativo). Alternativas: mantener el checklist manual del README (situación actual) o automatizar verificaciones básicas con `clasp` y ejecución remota de funciones (`clasp run`) como paso previo a cada release.

## 8. Release v1.0.0

**Estado:** abierto
**Severidad:** baja

No existen tags ni releases. Al mergear la rama del rebrand corresponde crear `v1.0.0` con notas de versión (rebrand, almacenamiento por formulario, documentación).

---

## Corregidos

### Almacenamiento compartido entre formularios — corregido 2026-10-15

`src/main.js`, `src/actions.js`, `src/triggers.js`: `PropertiesService.getScriptProperties()` (alcance del proyecto de script, compartido entre todos los usuarios y formularios) reemplazado por `getDocumentProperties()` (alcance del formulario). Al no existir publicación previa, no se requiere migración de datos. Queda pendiente la verificación del punto 3.

### Typos — corregido 2026-10-15

`messageIsEmtpy` → `messageIsEmpty`. Archivo `misc/LimterUiLogo.png` → `misc/LimiterUiLogo.png`, con la referencia actualizada en `src/index.html`.

### Manifest duplicado — corregido 2026-10-15

Eliminado el `appsscript.json` de la raíz, que había quedado desactualizado (sin el bloque `addOns`) tras la reorganización del repositorio. El manifest válido es `src/appsscript.json`.

### Rebrand a Limit-Switch — 2026-10-15

Nombre del producto actualizado en manifest, menú, interfaz, documentación y políticas. URLs de los assets actualizadas al repositorio renombrado (`limit-switch`).

---

*Última actualización: 2026-10-15*
