# Pending Items — Limit-Switch

> Spanish version: [PENDIENTES.md](PENDIENTES.md)

Log of open project items, ordered from highest to lowest criticality. Each item states its status, severity, affected files, and a concrete proposal. Resolved items move to the [Fixed](#fixed) section with their date and the reason for the change.

| # | Item | Severity | Why it is here |
| --- | --- | --- | --- |
| 12 | Define final brand assets for the listing | Medium | Existing assets belong to the "Limiter" stage; the Marketplace requires a 128×128 icon, banner, and screenshots |
| 14 | Evaluate UI internationalization (i18n) | Low | UI is currently English-only; `useLocaleFromApp` is declared but there are no translations |
| 15 | Define code testing strategy | Low | No automated tests exist; only the manual checklist in the README |
| 16 | Create the v1.0.0 release | Low | No git tags or release notes exist; should be tagged once pending items are resolved |
| 5 | Publish URLs and legal compliance on custom domain (Cloudflare) | Low | Required for Google OAuth verification: domain verified via Search Console, Limited Use disclosure, and data deletion clause |
| 7 | Publish the add-on on the Google Workspace Marketplace | Low | Currently only exists in the Apps Script project: nobody else can install it (confirmed total cost: $0 USD) |

---


## 12. Brand assets for the listing

**Status:** open  
**Severity:** medium

The existing assets in `misc/` come from the earlier "Limiter" stage and contain no visible text, so they remain usable. For the public Marketplace listing, define the final asset bundle (128×128 icon, banner, and promotional screenshots) matching the current branding.

## 14. UI internationalization (i18n)

**Status:** open  
**Severity:** low

The UI is in English, with `useLocaleFromApp` declared but no translations. If the initial audience includes Spanish speakers, consider minimal localization (es-AR); otherwise, explicitly document that the scope is English-only.

## 15. Testing strategy

**Status:** open  
**Severity:** low

There are no automated tests (Apps Script lacks a native runner). Alternatives: keep the manual checklist in `README.md` (current setup) or automate core verifications using `clasp` and remote function execution (`clasp run`) prior to releases.

## 16. Create the v1.0.0 release

**Status:** open  
**Severity:** low

No tags or releases exist yet. Once the pending items are resolved, create `v1.0.0` with release notes (rebrand, per-form storage, concurrency fixes, documentation).

## 5. Publish URLs, landing page, and legal compliance on custom domain (Cloudflare)

**Status:** open  
**Severity:** low  
**Files:** `docs/Privacy_policy.md`, `docs/Terms_of_service.md`

### What is missing

Google OAuth verification requires that the Homepage, Privacy Policy, and Terms of Service be publicly reachable under a **domain verified in Google Search Console**. The documents currently live only in Markdown inside the repository and lack mandatory Google Trust & Safety clauses.

### Proposal & Key Requirements

1. **Hosting on Cloudflare with a custom domain:**
   - Deploy the landing page and policy documents via Cloudflare Pages on the author's custom domain.
   - Add the Google Search Console DNS `TXT` verification record in Cloudflare DNS (verified within seconds, fulfilling Google's domain ownership mandate).
   - Recommended URL structure:
     - Homepage / Landing: `https://yourdomain.com/limit-switch` (or subdomain `https://limit-switch.yourdomain.com`).
     - Privacy Policy: `https://yourdomain.com/limit-switch/privacy`.
     - Terms of Service: `https://yourdomain.com/limit-switch/terms`.

2. **Mandatory "Limited Use" disclosure in Privacy Policy:**
   Google Trust & Safety rejects verification requests if the policy does not include the exact compliance statement:
   > *"Limit-Switch's use and transfer to any other app of information received from Google APIs will adhere to [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements."*

3. **Explicit Data Retention & Deletion section:**
   Specify that configuration settings are stored solely within the form via `DocumentProperties` and are automatically destroyed when the user uninstalls the add-on or deletes the form from Google Drive.

4. **Identity & Support Email Consistency:**
   The application name (`Limit-Switch`) and user support email (`schkurkonicolas@gmail.com`) must match across the policy, terms, and Google Cloud OAuth Consent Screen configuration.

5. **Landing Page Requirements:**
   The homepage must clearly describe the add-on's purpose and contain visible footer links to both the Privacy Policy and Terms of Service.

## 7. Publish the add-on on the Google Workspace Marketplace

**Status:** open  
**Severity:** low  
**Files:** Apps Script project (outside repository), `src/appsscript.json`

### What is missing

The add-on is functional and version-controlled, but has no public listing: installation currently requires direct access to the Apps Script project.

### Publication and Maintenance Costs ($0 USD)

Confirmed cost breakdown:
- **Developer Registration Fee:** $0 USD (Google Workspace Marketplace does not charge registration or annual fees, unlike Apple or Google Play).
- **Hosting / Server / Backend:** $0 USD (all logic runs on Google Apps Script under free user quotas).
- **Google Cloud Platform (GCP):** $0 USD (the GCP project is only used for OAuth Consent and Marketplace SDK setup; no paid resources used).
- **External Security Audit (CASA):** $0 USD (Limit-Switch only requests `forms.currentonly`, which is sensitive but **not restricted**; review is conducted internally and free of charge by Google).
- **Support / Policy Hosting:** $0 USD (via Cloudflare Pages free tier).
- **Total Cost:** **$0 USD**.

### Proposal

1. Create or link a standard Google Cloud project and configure the OAuth consent screen (external type, testing mode).
2. Publish an **unlisted** listing via Workspace Marketplace SDK: allows direct link installation for the author and first users without Google review (up to 100 test users).
3. Request public publication once validated (requires app verification: demo video, scope justification, and the URLs/legal requirements from item 5).

---

## Fixed

### Settings dialog UX/UI improvements — fixed 2026-10-27

`src/index.html`, `src/main.js`, `src/actions.js` (former item 13): Overhauled the configuration dialog with five key enhancements:
1. **Visual status badge:** Added a dynamic badge (`● Open` in green / `● Closed` in red) displaying the form's live state (`isAcceptingResponses`) that updates reactively upon every save or sync.
2. **Inlined Base64 logo:** Replaced the remote GitHub image URL with inlined base64 data, ensuring offline rendering and full CSP compliance.
3. **Keyboard support (Enter):** Pressing `Enter` on any input field (`limit`, `confirmationMessage`, `closedMessage`) executes the respective save action.
4. **Client-side validation:** Added pre-flight input validation (positive numbers for limits, non-empty text for messages) that immediately displays modal alerts without wasteful network round-trips.
5. **Structured server responses:** Backend functions now return structured `{ message, isAccepting }` objects for fluid UI reactivity.

### Automated form lifecycle management upon limit adjustments — fixed 2026-10-27

`src/actions.js`, `README.md` (former item 11): Automated the form's open/closed state in `setMaxResponses()`. Raising the limit above the current response count on a closed form now automatically reopens it (`form.setAcceptingResponses(true)`). Lowering the limit to or below the current number of responses immediately closes the form (`form.setAcceptingResponses(false)`), preventing incoming respondents from completing forms only to have their submissions rejected. Documented in the technical notes of `README.md`.

### Elimination of global service calls and unified lock management — fixed 2026-10-27

`src/main.js`, `src/actions.js`, `src/triggers.js` (former item 10): Removed top-level `var formProperties = PropertiesService.getDocumentProperties()` calls across all script files, replacing them with lazy access via `getProperties()`. This prevents V8 collisions and avoids authorization failures in restricted contexts (such as simple `onOpen` triggers). In addition, script lock acquisition and multi-account exception handling (`PERMISSION_DENIED`) were unified into a reusable higher-order function `withScriptLock(actionFn, timeoutMs)`, eliminating boilerplate duplication across all public actions in `src/actions.js`.

### Ability to remove/disable limit and clean up triggers — fixed 2026-10-27

`src/actions.js`, `src/triggers.js`, `src/index.html` (former item 9): Added the ability to remove or disable an active response limit without uninstalling the add-on. `setMaxResponses` now accepts empty strings or `0` to disable the limit, and a dedicated `removeLimit()` action and "Remove Limit" UI button were added. Disabling the limit removes the `maxResponses` document property and cleans up all `checkResponseLimit` triggers from `ScriptApp.getProjectTriggers()`, reclaiming user and project trigger quota.

### Bulk response reading optimization (Critical Zone strategy with safety margin) — fixed 2026-10-27

`src/triggers.js`, `src/actions.js`, `src/main.js` (former item 8): Implemented a fast-path using an estimated response counter in `DocumentProperties`. When responses are more than 10 submissions away from the limit (`SAFETY_MARGIN = 10`), the trigger quickly increments the counter and exits in ~30 ms without hydrating all response objects in memory. Upon entering the "Critical Zone" (within 10 responses of the limit), `form.getResponses()` is fetched live to recalibrate the cache and enforce exact chronological ordering and quota limits.

### Use `createAddonMenu()` for Marketplace — fixed 2026-10-27

`src/main.js` (former item 4): Replaced `FormApp.getUi().createMenu('Limit-Switch')` with `FormApp.getUi().createAddonMenu()`. This ensures standard integration under the Google Forms Add-ons menu (puzzle piece icon) and satisfies Google Workspace Marketplace's strict requirement for published Editor Add-ons.

### Response desynchronization with linked Google Sheets documented — fixed 2026-10-27

`README.md` (former item 3): Documented the Google Forms / Sheets platform limitation in the technical notes of `README.md`. Explains that `deleteResponse()` in Apps Script only operates on the form's internal response store and does not remove the corresponding row in a linked spreadsheet, detailing how the user can safely delete the extra row manually without impacting the add-on's behavior.

### Accidental form reopening in `setClosedMessage` — fixed 2026-10-27

`src/actions.js` (former item 2): The `form.setAcceptingResponses(false)` restoration call was moved from the main block into the `finally` clause of a nested `try` wrapping only `form.setCustomClosedFormMessage(message)`. This guarantees the form is always re-closed, even if the Google Forms API throws an exception while updating the message.

### Race condition in `checkResponseLimit` (double deletion) — fixed 2026-10-27

`src/triggers.js` (former item 1): Replaced logic based on instantaneous response counts and `!form.isAcceptingResponses()` with a chronological index check of `e.response.getId()` within `form.getResponses()`. Responses with index `< maxResponses` are always kept; only submissions with index `>= maxResponses` are removed.

### Shared storage across forms — fixed 2026-10-15

`src/main.js`, `src/actions.js`, `src/triggers.js`: `PropertiesService.getScriptProperties()` (script-project scope, shared by all users and forms) replaced by `getDocumentProperties()` (form scope). Since there was no previous publication, no data migration is required.

### Typos — fixed 2026-10-15

`messageIsEmtpy` → `messageIsEmpty`. File `misc/LimterUiLogo.png` → `misc/LimiterUiLogo.png`, with the reference updated in `src/index.html`.

### Duplicate manifest — fixed 2026-10-15

Removed the root `appsscript.json`, which had become outdated (no `addOns` block) after the repository reorganization. The valid manifest is `src/appsscript.json`.

### Rebrand to Limit-Switch — 2026-10-15

Product name updated in the manifest, menu, UI, documentation, and policies. Asset URLs updated to the renamed repository (`limit-switch`).

---

*Last updated: 2026-10-27*
