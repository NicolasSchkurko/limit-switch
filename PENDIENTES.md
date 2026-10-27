# Pendientes técnicos de Limit-Switch

> English version: [PENDING.md](PENDING.md)

Registro de los puntos abiertos del proyecto, ordenados de mayor a menor criticidad. Cada punto indica estado, severidad, archivos afectados y una propuesta concreta. Los IDs son estables y no se renumeran; los puntos resueltos pasan a la sección [Corregidos](#corregidos) con su fecha y el motivo del cambio.

| # | Punto | Severidad | Por qué está acá |
| --- | --- | --- | --- |
| 4 | Reemplazar `createMenu` por `createAddonMenu` y proteger `onOpen` | Alta | Requisito estricto de Marketplace para Editor Add-ons; previene errores en `AuthMode.NONE` |
| 8 | Optimizar la lectura masiva de `form.getResponses().length` | Media | Carga todas las respuestas en memoria en cada envío, arriesgando timeouts y superación de cuotas |
| 9 | Permitir remover o deshabilitar el límite y limpiar triggers | Media | Hoy no es posible borrar el límite ni desactivar la verificación sin desinstalar el add-on |
| 10 | Eliminar llamadas a servicios en el ámbito global del script | Media | Declarar `PropertiesService` en la raíz de múltiples archivos genera colisiones y fallos en contextos no autenticados |
| 11 | Definir el comportamiento al modificar el límite con el formulario cerrado | Media | Subir el límite no reabre el formulario; bajarlo por debajo del conteo actual no lo cierra hasta el próximo envío |
| 12 | Definir la identidad definitiva para el listado | Media | Los assets actuales provienen de la etapa "Limiter"; el Marketplace requiere ícono, banner y capturas |
| 13 | Mejorar UX/UI del diálogo de configuración | Baja | Falta indicador de estado (abierto/cerrado), guardado unificado, validación local, soporte de Enter y logo offline |
| 14 | Evaluar la internacionalización de la interfaz | Baja | La UI está únicamente en inglés; `useLocaleFromApp` está declarado pero no hay traducciones |
| 15 | Definir la estrategia de pruebas del código | Baja | No existen pruebas automatizadas; solo el checklist manual del README |
| 16 | Crear el release v1.0.0 | Baja | No hay tags ni notas de versión; corresponde al mergear el rebrand |
| 5 | Publicar URLs y cumplimiento legal en dominio propio (Cloudflare) | Baja | Exigido por Google para verificar OAuth: dominio verificado en Search Console, cláusula Limited Use y borrado de datos |
| 7 | Publicar el add-on en el Google Workspace Marketplace | Baja | Hoy solo existe en el proyecto de Apps Script: no hay forma de que otra persona lo instale (costo confirmado: $0 USD) |

---

## 4. Reemplazar `createMenu` por `createAddonMenu` y proteger `onOpen` para Marketplace

**Estado:** abierto  
**Severidad:** alta  
**Archivos:** `src/main.js`

### Qué pasa

1. En `onOpen(e)`, se usa `FormApp.getUi().createMenu('Limit-Switch')`. Google exige para Editor Add-ons publicados en Google Workspace Marketplace el uso obligatorio de `FormApp.getUi().createAddonMenu()`. Los menús creados con `createMenu()` quedan huérfanos o no se agrupan bajo el menú de complementos de Forms.
2. No se evalúa `e.authMode`. Al abrirse un formulario por primera vez en modo no autenticado (`ScriptApp.AuthMode.NONE`), cualquier interacción no protegida con servicios de Google puede provocar que el menú no aparezca.

### Propuesta

Actualizar `onOpen(e)` para utilizar `createAddonMenu()` y acondicionar la apertura respetando los modos de autorización:
```javascript
function onOpen(e) {
  var menu = FormApp.getUi().createAddonMenu();
  menu.addItem('⚙️ Configure Limiter', 'showLimitDialog');
  menu.addToUi();
}
```

## 8. Optimización de lectura masiva con `form.getResponses().length`

**Estado:** abierto  
**Severidad:** media  
**Archivos:** `src/triggers.js`, `src/main.js`

### Qué pasa

En cada envío, `form.getResponses().length` descarga en memoria el arreglo completo de objetos `FormResponse`. En formularios con alto volumen (cientos o miles de respuestas), esta operación tarda varios segundos, arriesgando límites de memoria y timeouts en `LockService.waitLock(30000)` ante envíos rápidos consecutivos.

### Propuesta

1. Evaluar si es viable mantener un contador en `DocumentProperties` actualizado de forma incremental o si el recálculo debe hacerse de forma más liviana.
2. Analizar el manejo de errores ante expiración del candado (timeout de `waitLock`) para registrar la incidencia sin interrumpir la experiencia del usuario.

## 9. Permitir remover o deshabilitar el límite y limpiar triggers

**Estado:** abierto  
**Severidad:** media  
**Archivos:** `src/actions.js`, `src/triggers.js`, `src/index.html`

### Qué pasa

1. `setMaxResponses(limit)` rechaza cadenas vacías o `0`, lanzando un error (`Please enter a valid number greater than zero`). No existe forma de eliminar el límite una vez configurado.
2. Si el usuario quisiera pausar o retirar el límite, el trigger instalable `checkResponseLimit` continúa ejecutándose en cada envío de por vida.

### Propuesta

1. Permitir un valor vacío o un botón "Remove Limit / Disable" en la UI.
2. En `actions.js`, si el límite se elimina: borrar la propiedad `maxResponses` y eliminar el trigger asociado de `ScriptApp.getProjectTriggers()` para liberar cuota de ejecución.

## 10. Eliminación de llamadas a servicios en el ámbito global del script

**Estado:** abierto  
**Severidad:** media  
**Archivos:** `src/main.js`, `src/actions.js`, `src/triggers.js`

### Qué pasa

`var formProperties = PropertiesService.getDocumentProperties();` se ejecuta en la raíz global de tres archivos distintos. Esto genera colisiones en V8 y puede fallar prematuramente en contextos donde los servicios aún no cuentan con autorización (por ejemplo, durante la evaluación previa de triggers simples).

### Propuesta

Eliminar la inicialización global en el tope de los archivos y llamar a `PropertiesService.getDocumentProperties()` de forma perezosa dentro de las funciones que realmente lo requieran.

## 11. Comportamiento al modificar el límite con el formulario cerrado

**Estado:** abierto (decisión de diseño pendiente)  
**Severidad:** media  
**Archivos:** `src/actions.js`

- Subir el límite con el formulario cerrado por el add-on no lo reabre: queda cerrado hasta que se habilite manualmente.
- Bajar el límite por debajo de la cantidad de respuestas actuales no cierra el formulario hasta el próximo envío.

### Propuesta

Decidir explícitamente entre documentar ambos comportamientos o automatizarlos (por ejemplo, reabrir el formulario al detectar un límite mayor al conteo actual). En cualquiera de los dos casos, dejarlo asentado en el README.

## 12. Definir la identidad definitiva para el listado

**Estado:** abierto  
**Severidad:** media

Los assets existentes en `misc/` provienen de la etapa anterior del proyecto y no contienen texto visible, por lo que siguen siendo utilizables. Para el listado público conviene definir el conjunto definitivo (ícono de 128×128, banner y capturas de pantalla) siguiendo la estética del ícono actual.

## 13. Mejoras de UX/UI en el diálogo de configuración

**Estado:** abierto  
**Severidad:** baja  
**Archivos:** `src/index.html`

### Qué pasa

1. **Estado invisible:** El diálogo no indica si el formulario está actualmente "Aceptando respuestas: Sí / No".
2. **Guardado fragmentado:** Cuenta con tres botones independientes sin un guardado conjunto ni advertencias de cambios sin aplicar.
3. **Falta de soporte de teclado:** Presionar la tecla `Enter` en los campos de entrada no ejecuta la acción.
4. **Validación únicamente en servidor:** No hay validación inmediata en el cliente antes de invocar `google.script.run`.
5. **Logo dependiente de red externa:** La etiqueta `<img>` referencia a `raw.githubusercontent.com`. En redes corporativas con proxy o firewalls puede no cargar.

### Propuesta

1. Incorporar badge visual con el estado actual del formulario (Open / Closed).
2. Añadir event listeners para la tecla `Enter` y validación local de inputs antes del envío.
3. Incrustar el logo en base64 en `index.html` (pesa solo ~6 KB) para garantizar funcionamiento offline y cumplir con políticas CSP.
4. Diseñar un botón unificado de guardado o feedback claro por campo.

## 14. Internacionalización de la interfaz

**Estado:** abierto  
**Severidad:** baja

La interfaz está en inglés, con `useLocaleFromApp` declarado pero sin traducciones. Si el alcance inicial es hispanohablante, evaluar una localización mínima (es-AR); si no, dejar documentado que el alcance es únicamente en inglés.

## 15. Estrategia de pruebas

**Estado:** abierto  
**Severidad:** baja

No hay pruebas automatizadas (Apps Script no incluye un runner nativo). Alternativas: mantener el checklist manual del README (situación actual) o automatizar verificaciones básicas con `clasp` y ejecución remota de funciones (`clasp run`) como paso previo a cada release.

## 16. Release v1.0.0

**Estado:** abierto  
**Severidad:** baja

No existen tags ni releases. Al mergear las correcciones pendientes corresponde crear `v1.0.0` con notas de versión (rebrand, almacenamiento por formulario, correcciones de concurrencia, documentación).

## 5. Publicar URLs públicas, landing page y cumplimiento legal en dominio propio (Cloudflare)

**Estado:** abierto  
**Severidad:** baja  
**Archivos:** `docs/Privacy_policy.md`, `docs/Terms_of_service.md`

### Qué falta

El listado y la verificación de Google OAuth exigen que la Homepage, la Política de Privacidad y los Términos de Servicio estén publicados bajo un **dominio verificado en Google Search Console**. Hoy los documentos viven únicamente dentro del repositorio en Markdown y carecen de cláusulas mandatorias de Google Trust & Safety.

### Propuesta y requisitos clave

1. **Hosting en Cloudflare con dominio propio:**
   - Desplegar la landing page y las políticas mediante Cloudflare Pages en el dominio propio del autor.
   - En el panel DNS de Cloudflare, añadir el registro `TXT` para verificar el dominio en **Google Search Console** en segundos (paso obligatorio para que Google acepte el dominio en la consola de OAuth).
   - Estructura de URLs recomendada:
     - Homepage / Landing: `https://tudominio.com/limit-switch` (o subdominio `https://limit-switch.tudominio.com`).
     - Política de Privacidad: `https://tudominio.com/limit-switch/privacy`.
     - Términos de Servicio: `https://tudominio.com/limit-switch/terms`.

2. **Cláusula obligatoria de "Limited Use" en Política de Privacidad:**
   Google rechaza cualquier política que no incluya de forma visible y literal el compromiso con la política de datos de usuario de Google APIs:
   > *"Limit-Switch's use and transfer to any other app of information received from Google APIs will adhere to [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements."*

3. **Sección explícita de Retención y Borrado de Datos (Data Retention & Deletion):**
   Especificar que los datos de configuración se almacenan únicamente en el propio formulario mediante `DocumentProperties` y que se destruyen automáticamente cuando el usuario desinstala el add-on o elimina el formulario en Google Drive.

4. **Consistencia de Identidad:**
   El nombre de la aplicación (`Limit-Switch`) y el correo de soporte al usuario (`schkurkonicolas@gmail.com`) deben ser exactamente los mismos en la política, en los términos y en los campos de la pantalla de consentimiento de Google Cloud.

5. **Requisitos de la Landing Page (Homepage):**
   La página principal debe explicar qué hace el add-on y contar con enlaces claramente visibles en el pie de página hacia la Política de Privacidad y los Términos de Servicio.

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
