# Pending Items — Limit-Switch

> Spanish version: [PENDIENTES.md](PENDIENTES.md)

Log of open project items, ordered from highest to lowest criticality. Each item states its status, severity, affected files, and a concrete proposal. Resolved items move to the [Fixed](#fixed) section with their date and the reason for the change.

| # | Item | Severity | Why it is here |
| --- | --- | --- | --- |
| 8 | Optimize bulk response reading with `form.getResponses().length` | Medium | Loads all responses into memory on every submission, risking execution timeouts and quota exhaustion |
| 9 | Allow removing or disabling the limit and clean up triggers | Medium | Currently impossible to remove the limit or disable enforcement without uninstalling the add-on |
| 10 | Eliminate service calls from the global script scope | Medium | Declaring `PropertiesService` at top-level across multiple files causes V8 collisions and failures in unauthorized contexts |
| 11 | Decide behavior when modifying the limit while the form is closed | Medium | Raising the limit does not reopen the form; lowering it below current count does not close it until the next submission |
| 12 | Define final brand assets for the listing | Medium | Existing assets belong to the "Limiter" stage; the Marketplace requires a 128×128 icon, banner, and screenshots |
| 13 | Improve settings dialog UX/UI (`index.html`) | Low | Missing open/closed status badge, unified save workflow, client-side input validation, Enter key support, and offline logo |
| 14 | Evaluate UI internationalization (i18n) | Low | UI is currently English-only; `useLocaleFromApp` is declared but there are no translations |
| 15 | Define code testing strategy | Low | No automated tests exist; only the manual checklist in the README |
| 16 | Create the v1.0.0 release | Low | No git tags or release notes exist; should be tagged once pending items are resolved |
| 5 | Publish URLs and legal compliance on custom domain (Cloudflare) | Low | Required for Google OAuth verification: domain verified via Search Console, Limited Use disclosure, and data deletion clause |
| 7 | Publish the add-on on the Google Workspace Marketplace | Low | Currently only exists in the Apps Script project: nobody else can install it (confirmed total cost: $0 USD) |

---

## 8. Optimize bulk reading with `form.getResponses().length`

**Status:** open  
**Severity:** medium  
**Files:** `src/triggers.js`, `src/main.js`

### What is happening

On every submission, `form.getResponses().length` downloads the entire array of `FormResponse` objects into memory. On forms with high submission volumes, this takes several seconds, risking memory limits and lock acquisition timeouts (`LockService.waitLock(30000)`) during rapid bursts.

### Proposal

1. Evaluate storing an incremental counter in `DocumentProperties` or lightweight counting mechanisms.
2. Implement proper error handling when `waitLock` times out to record the issue gracefully without disrupting the user experience.

## 9. Allow removing or disabling the limit and clean up triggers

**Status:** open  
**Severity:** medium  
**Files:** `src/actions.js`, `src/triggers.js`, `src/index.html`

### What is happening

1. `setMaxResponses(limit)` rejects empty strings or `0`, throwing an error (`Please enter a valid number greater than zero`). There is no way to remove or disable an active limit.
2. Even if a user no longer needs limits, the installable trigger `checkResponseLimit` continues to run on every submission indefinitely, wasting the 20-trigger quota per user/project.

### Proposal

1. Support an empty value or add a "Remove Limit / Disable" button in the UI.
2. In `actions.js`, when a limit is cleared: delete the `maxResponses` property and delete the associated trigger from `ScriptApp.getProjectTriggers()` to reclaim project quota.

## 10. Eliminate service calls from the global script scope

**Status:** open  
**Severity:** medium  
**Files:** `src/main.js`, `src/actions.js`, `src/triggers.js`

### What is happening

`var formProperties = PropertiesService.getDocumentProperties();` executes in the global root scope of three different files. This creates collisions under V8 and causes runtime errors in contexts where services lack authorization (e.g., during initial simple trigger evaluation).

### Proposal

Remove top-level initializations and call `PropertiesService.getDocumentProperties()` lazily inside the functions that require it.

## 11. Behavior when modifying the limit while the form is closed

**Status:** open (design decision pending)  
**Severity:** medium  
**Files:** `src/actions.js`

- Raising the limit while the form is closed does not reopen it: it stays closed until manually enabled in Google Forms settings.
- Lowering the limit below the current response count does not close the form until the next submission arrives.

### Proposal

Explicitly decide whether to document both behaviors or automate them (for example, automatically reopening the form when a limit greater than the current count is set). Document the final decision in `README.md`.

## 12. Brand assets for the listing

**Status:** open  
**Severity:** medium

The existing assets in `misc/` come from the earlier "Limiter" stage and contain no visible text, so they remain usable. For the public Marketplace listing, define the final asset bundle (128×128 icon, banner, and promotional screenshots) matching the current branding.

## 13. Settings dialog UX/UI improvements

**Status:** open  
**Severity:** low  
**Files:** `src/index.html`

### What is happening

1. **Invisible state:** The modal does not inform the user whether the form is currently open or closed (`isAcceptingResponses`).
2. **Fragmented saving:** Three separate buttons without a unified save option or warnings about unsaved fields.
3. **No keyboard handling:** Pressing `Enter` inside input fields does nothing.
4. **Server-only validation:** No client-side pre-validation before invoking `google.script.run`.
5. **External image dependency:** The logo points to `raw.githubusercontent.com`, which may fail under strict corporate firewalls or CSP rules.

### Proposal

1. Add a status badge indicating the form's current state (Open / Closed).
2. Attach `Enter` key event listeners and client-side input validation.
3. Embed the logo in base64 in `index.html` (~6 KB) to ensure offline functionality and CSP compliance.
4. Design a unified save button or per-field feedback indicators.

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
