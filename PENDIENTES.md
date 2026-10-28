# Pendientes técnicos de Limit-Switch

> English version: [PENDING.md](PENDING.md)

Registro de los puntos abiertos del proyecto, ordenados de mayor a menor criticidad. Cada punto indica estado, severidad, archivos afectados y una propuesta concreta. Los IDs son estables y no se renumeran; los puntos resueltos pasan a la sección [Corregidos](#corregidos) con su fecha y el motivo del cambio.

| # | Punto | Severidad | Por qué está acá |
| --- | --- | --- | --- |
| 16 | Crear el release v1.0.0 | Baja | No hay tags ni notas de versión; corresponde al mergear el rebrand |
| 7 | Publicar el add-on en el Google Workspace Marketplace | Baja | Hoy solo existe en el proyecto de Apps Script: no hay forma de que otra persona lo instale (costo confirmado: $0 USD) |

---


## 16. Release v1.0.0

**Estado:** abierto  
**Severidad:** baja

No existen tags ni releases. Al mergear las correcciones pendientes corresponde crear `v1.0.0` con notas de versión (rebrand, almacenamiento por formulario, correcciones de concurrencia, documentación).

## 7. Publicar el add-on en el Google Workspace Marketplace

**Estado:** abierto  
**Severidad:** baja  
**Archivos:** proyecto de Apps Script (fuera del repositorio), `src/appsscript.json`

### Qué falta

El add-on es funcional y el código está versionado, pero no existe listado público: cualquier instalación requiere acceso directo al proyecto de Apps Script.

### Costos de publicación y mantenimiento ($0 USD)

Confirmado el desglose de costos:
- **Tarifa de desarrollador:** $0 USD (Google Workspace Marketplace no cobra cuotas de alta ni anualidades, a diferencia de Apple o Google Play).
- **Hosting / Servidor / Backend:** $0 USD (la lógica corre 100% sobre Google Apps Script bajo las cuotas gratuitas del usuario).
- **Google Cloud Platform (GCP):** $0 USD (el proyecto GCP solo se utiliza para la configuración del OAuth Consent Screen y la ficha de Marketplace SDK, sin servicios facturables).
- **Auditoría de seguridad externa (CASA):** $0 USD (Limit-Switch solo solicita `forms.currentonly`, clasificado como scope sensible pero **no restringido**; la revisión la realiza el equipo interno de Google sin costo).
- **Hosting de soporte/políticas:** $0 USD (mediante Cloudflare Pages en su capa gratuita).
- **Costo total:** **$0 USD**.

### Propuesta

1. Crear o vincular un proyecto estándar de Google Cloud y configurar la pantalla de consentimiento de OAuth (tipo externo, en modo prueba).
2. Publicar un listado **no listado (unlisted)** mediante el Workspace Marketplace SDK: permite la instalación por enlace para el autor y los primeros usuarios, sin revisión de Google (hasta 100 usuarios de prueba).
3. Solicitar la publicación pública una vez validado lo anterior (requiere verificación de la app: video demostrativo, justificación de scopes y las URLs y requisitos legales del punto 5).

---

## Corregidos

### Landing page, Política de Privacidad y Términos integrados en portafolio — corregido 2026-10-28

`limit-switch/index.html`, `limit-switch/privacy.html`, `limit-switch/terms.html` (antiguo ítem 5): Se crearon las 3 páginas públicas bajo la carpeta `limit-switch/` del repositorio de portafolio en Cloudflare Pages, heredando el estilo visual (`style.css`), tipografía y soporte de modo oscuro/claro del sitio web. Se cumplieron todos los requisitos estrictos de Google Trust & Safety:
1. **Cláusula obligatoria de "Limited Use":** incorporada textualmente con enlace oficial a la política de datos de usuario de Google APIs.
2. **Retención y borrado de datos:** sección explícita que detalla la eliminación automática de propiedades y triggers al desinstalar o borrar el formulario.
3. **Consistencia de identidad:** nombre de la aplicación `Limit-Switch` y correo de soporte `schkurkonicolas@gmail.com`.
4. **Landing page:** descripción completa con accesos visibles hacia Privacidad y Términos en el pie de página.

### Estrategia de pruebas manuales E2E definida — resuelto 2026-10-27

`TESTING_CHECKLIST.md`, `.gitignore` (antiguo ítem 15): Se creó una guía integral de pruebas End-to-End con 7 escenarios clave (flujo normal, mensajes cerrados, reapertura automática, cierre inmediato por desborde, eliminación limpia de triggers, botón de sincronización y validaciones de teclado) en `TESTING_CHECKLIST.md`, agregado al `.gitignore` para uso interno de control de calidad antes de cada release.

### Assets gráficos de identidad para Marketplace configurados — corregido 2026-10-27

`misc/`, `src/appsscript.json` (antiguo ítem 12): Se incorporaron los assets gráficos requeridos por la consola del Google Workspace Marketplace:
- `misc/LimiterIcon.jpg`: ícono principal de la aplicación (128×128 px).
- `misc/toolbar-icon.jpg`: ícono de barra de herramientas (32×32 px), vinculado en el manifest `src/appsscript.json` (`logoUrl`).
- `misc/card-banner.jpg`: banner de portada para búsquedas y fichas de la tienda (220×140 px).
Las capturas de pantalla promocionales se generarán con el add-on en funcionamiento dentro del formulario.

### Alcance de internacionalización definido (Inglés global v1.0.0) — resuelto 2026-10-27

`README.md` (antiguo ítem 14): Se definió que la versión v1.0.0 de Limit-Switch utilizará el idioma inglés como estándar global para garantizar máxima compatibilidad con todos los usuarios del Google Workspace Marketplace sin requerir mantenimiento complejo de múltiples catálogos de traducción. Se documentó esta decisión en las notas técnicas del `README.md`, dejando la localización a otros idiomas (como español) planificada para versiones posteriores.

### Mejoras de UX/UI en el diálogo de configuración — corregido 2026-10-27

`src/index.html`, `src/main.js`, `src/actions.js` (antiguo ítem 13): Se renovó el diálogo de configuración con cinco mejoras clave:
1. **Badge visual de estado:** Se añadió un indicador dinámico (`● Open` en verde / `● Closed` en rojo) que refleja el estado real del formulario (`isAcceptingResponses`) y se actualiza reactivamente tras cada guardado o sincronización.
2. **Logo incrustado en Base64:** Se reemplazó la URL remota de GitHub por el archivo de imagen en base64 en línea, garantizando carga offline y cumpliendo con las políticas CSP de Google Workspace.
3. **Soporte de teclado (Enter):** Al presionar `Enter` en cualquiera de los tres campos de entrada (`limit`, `confirmationMessage`, `closedMessage`) se ejecuta la acción correspondiente.
4. **Validación en el cliente:** Se agregaron validaciones antes del envío por red (verificación de números positivos y no vacíos para mensajes), mostrando advertencias inmediatas sin consumir llamadas al servidor.
5. **Respuestas estructuradas del servidor:** Las funciones de backend devuelven objetos `{ message, isAccepting }` para una actualización fluida de la interfaz.

### Gestión automática del ciclo de vida del formulario al ajustar límites — corregido 2026-10-27

`src/actions.js`, `README.md` (antiguo ítem 11): Se automatizó la apertura y cierre del formulario en `setMaxResponses()`. Si se sube el límite por encima del conteo actual en un formulario cerrado, este se reabre automáticamente (`form.setAcceptingResponses(true)`). Si se reduce el límite a un valor menor o igual a las respuestas ya recibidas, el formulario se cierra de inmediato (`form.setAcceptingResponses(false)`), evitando que nuevos encuestados completen el formulario para luego sufrir el descarte de su envío. El comportamiento quedó documentado en las notas técnicas del `README.md`.

### Eliminación de llamadas globales a servicios y unificación de locks — corregido 2026-10-27

`src/main.js`, `src/actions.js`, `src/triggers.js` (antiguo ítem 10): Se eliminaron las llamadas globales `var formProperties = PropertiesService.getDocumentProperties()` en la raíz de los archivos, reemplazándolas por acceso perezoso mediante `getProperties()`. Esto previene colisiones en el motor V8 y evita fallos en contextos con permisos restringidos (como triggers simples `onOpen`). Adicionalmente, se unificó la adquisición de locks y el control de errores multicuenta (`PERMISSION_DENIED`) en una función de orden superior reutilizable `withScriptLock(actionFn, timeoutMs)`, reduciendo código duplicado en todas las acciones públicas de `src/actions.js`.

### Desactivación y borrado de límite con limpieza de triggers — corregido 2026-10-27

`src/actions.js`, `src/triggers.js`, `src/index.html` (antiguo ítem 9): Se incorporó la posibilidad de remover el límite de respuestas sin desinstalar el add-on. `setMaxResponses` ahora admite valores vacíos o `0` para desactivar el límite, y se añadió la acción `removeLimit()` y un botón dedicado "Remove Limit" en la interfaz. Al desactivar el límite, se elimina la propiedad `maxResponses` y se eliminan todos los triggers instalables `checkResponseLimit` asociados al formulario en `ScriptApp.getProjectTriggers()`, liberando cuota del proyecto.

### Optimización de lectura masiva (estrategia de Zona Crítica con margen de seguridad) — corregido 2026-10-27

`src/triggers.js`, `src/actions.js`, `src/main.js` (antiguo ítem 8): Implementado un camino rápido (fast-path) con contador estimado en `DocumentProperties`. Cuando el número de respuestas está a más de 10 unidades de distancia del límite (`SAFETY_MARGIN = 10`), el trigger solo incrementa el contador estimado y retorna en ~30 ms sin descargar todas las respuestas en memoria. Al ingresar a la "Zona Crítica" (a 10 o menos del cupo), se descarga la lista real en vivo (`form.getResponses()`) para recalibrar el contador y aplicar el algoritmo de orden cronológico sin riesgo de cierres erróneos.

### Uso de `createAddonMenu()` para Marketplace — corregido 2026-10-27

`src/main.js` (antiguo ítem 4): Se reemplazó `FormApp.getUi().createMenu('Limit-Switch')` por `FormApp.getUi().createAddonMenu()`. Esto garantiza la integración estándar en el menú de complementos de Google Forms (ícono de pieza de rompecabezas) y cumple con el requisito estricto de Google Workspace Marketplace para Editor Add-ons.

### Desincronización de respuestas con Google Sheets documentada — corregido 2026-10-27

`README.md` (antiguo ítem 3): Documentada la limitación de plataforma de Google Forms / Sheets en las notas técnicas del `README.md`. Se explica que `deleteResponse()` en Apps Script solo actúa sobre el almacén interno del formulario y no borra la fila en la hoja de cálculo vinculada, indicando que el usuario puede eliminar manualmente dicha fila sobrante sin afectar el funcionamiento del add-on.

### Reapertura accidental del formulario en `setClosedMessage` — corregido 2026-10-27

`src/actions.js` (antiguo ítem 2): La restauración `form.setAcceptingResponses(false)` pasó del bloque principal al `finally` de un `try` interno que envuelve únicamente a `form.setCustomClosedFormMessage(message)`. Esto garantiza que el formulario se cierre siempre, incluso si la API de Google Forms lanza una excepción al actualizar el mensaje.

### Condición de carrera en `checkResponseLimit` (doble eliminación) — corregido 2026-10-27

`src/triggers.js` (antiguo ítem 1): Reemplazada la comprobación basada en el conteo total instantáneo y `!form.isAcceptingResponses()` por una búsqueda posicional cronológica de `e.response.getId()` dentro de `form.getResponses()`. Las respuestas con índice `< maxResponses` se preservan siempre; únicamente se eliminan aquellas cuyo índice es `>= maxResponses`.

### Almacenamiento compartido entre formularios — corregido 2026-10-15

`src/main.js`, `src/actions.js`, `src/triggers.js`: `PropertiesService.getScriptProperties()` (alcance del proyecto de script, compartido entre todos los usuarios y formularios) reemplazado por `getDocumentProperties()` (alcance del formulario). Al no existir publicación previa, no se requiere migración de datos.

### Typos — corregido 2026-10-15

`messageIsEmtpy` → `messageIsEmpty`. Archivo `misc/LimterUiLogo.png` → `misc/LimiterUiLogo.png`, con la referencia actualizada en `src/index.html`.

### Manifest duplicado — corregido 2026-10-15

Eliminado el `appsscript.json` de la raíz, que había quedado desactualizado (sin el bloque `addOns`) tras la reorganización del repositorio. El manifest válido es `src/appsscript.json`.

### Rebrand a Limit-Switch — 2026-10-15

Nombre del producto actualizado en manifest, menú, interfaz, documentación y políticas. URLs de los assets actualizadas al repositorio renombrado (`limit-switch`).

---

*Última actualización: 2026-10-27*
