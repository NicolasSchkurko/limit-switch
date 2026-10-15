# Pending Items — Limit-Switch

> Spanish version: [PENDIENTES.md](PENDIENTES.md)

Log of the project's open items, ordered from most to least urgent. Each item states its status, severity, affected files, and a concrete proposal. IDs are stable and never renumbered; resolved items move to the [Fixed](#fixed) section with their date and the reason for the change.

| # | Item | Why it is here |
| --- | --- | --- |
| 1 | Publish the add-on on the Google Workspace Marketplace | It only exists in the Apps Script project: there is no way for anyone else to install it |
| 2 | Publish the URLs Google requires (homepage, privacy policy, terms) | The listing and the OAuth verification require public URLs; the documents currently live only inside the repository |
| 3 | Verify per-form storage in a real environment | The 2026-10-15 fix has not been tested yet with two accounts and two forms at the same time |
| 4 | Decide how limit changes behave while the form is closed | Raising the limit does not reopen the form; lowering it below the current count does not close it until the next submission |
| 5 | Define the final brand assets for the listing | Current assets belong to the "Limiter" stage; the Marketplace requires an icon, banner and screenshots |
| 6 | Evaluate UI internationalization | The UI is English-only; `useLocaleFromApp` is declared but there are no translations |
| 7 | Define the code testing strategy | There are no automated tests; only the manual checklist in the README |
| 8 | Create the v1.0.0 release | No tags or release notes exist; it should be done when the rebrand branch is merged |

---

## 1. Publish the add-on on the Google Workspace Marketplace

**Status:** open
**Severity:** high
**Files:** Apps Script project (outside the repository), `src/appsscript.json`

### What is missing

The add-on is functional and the code is versioned, but there is no public listing: any installation requires direct access to the Apps Script project.

### Proposal

1. Create or link a standard Google Cloud project and configure the OAuth consent screen (external type, testing mode).
2. Publish an **unlisted** listing through the Workspace Marketplace SDK: install by link for the author and the first users, without Google review (up to 100 test users).
3. Request public publishing once the above is validated (requires app verification: demo video, scope justification, and the URLs from item 2).

## 2. Public URLs required by Google

**Status:** open
**Severity:** high
**Files:** `docs/Privacy_policy.md`, `docs/Terms_of_service.md`

### What is missing

The listing and the verification require a homepage, privacy policy and terms reachable via public URL. Today those documents are only readable inside the repository.

### Proposal

Publish them with GitHub Pages from `docs/`: add a landing page and HTML versions of both documents. That is enough for Google; a custom domain is not required.

## 3. Verification of per-form storage

**Status:** open
**Severity:** high
**Files:** `src/main.js`, `src/actions.js`, `src/triggers.js`

### What is missing

The fix (`getDocumentProperties()`) is in the code but has not been deployed or tested under real conditions.

### Proposal

With two Google accounts and two different forms, set different limits and verify that each form keeps its own configuration and closes independently. Record the result before requesting publication.

## 4. Behavior when the limit changes while the form is closed

**Status:** open (pending design decision)
**Severity:** medium

- Raising the limit while the add-on has closed the form does not reopen it: it stays closed until manually enabled.
- Lowering the limit below the current response count does not close the form until the next submission.

### Proposal

Decide explicitly between documenting both behaviors or automating them (for example, reopening the form when a limit higher than the current count is detected). Either way, record the decision in the README.

## 5. Brand assets for the listing

**Status:** open
**Severity:** medium

The existing assets in `misc/` come from the previous stage of the project and contain no visible text, so they remain usable. For the public listing it is worth defining the final set (128×128 icon, banner and screenshots) following the current icon's style.

## 6. UI internationalization

**Status:** open
**Severity:** low

The UI is in English, with `useLocaleFromApp` declared but no translations. If the initial scope is Spanish-speaking users, evaluate a minimal localization (es-AR); otherwise, document that the scope is English-only.

## 7. Testing strategy

**Status:** open
**Severity:** low

There are no automated tests (Apps Script includes no native runner). Alternatives: keep the manual checklist in the README (current situation) or automate basic verifications with `clasp` and remote function execution (`clasp run`) as a step before each release.

## 8. v1.0.0 release

**Status:** open
**Severity:** low

There are no tags or releases. When the rebrand branch is merged, create `v1.0.0` with release notes (rebrand, per-form storage, documentation).

---

## Fixed

### Shared storage across forms — fixed 2026-10-15

`src/main.js`, `src/actions.js`, `src/triggers.js`: `PropertiesService.getScriptProperties()` (script-project scope, shared by all users and forms) replaced by `getDocumentProperties()` (form scope). Since there was no previous publication, no data migration is required. The verification from item 3 is still pending.

### Typos — fixed 2026-10-15

`messageIsEmtpy` → `messageIsEmpty`. File `misc/LimterUiLogo.png` → `misc/LimiterUiLogo.png`, with the reference updated in `src/index.html`.

### Duplicate manifest — fixed 2026-10-15

Removed the root `appsscript.json`, which had become outdated (no `addOns` block) after the repository reorganization. The valid manifest is `src/appsscript.json`.

### Rebrand to Limit-Switch — 2026-10-15

Product name updated in the manifest, menu, UI, documentation, and policies. Asset URLs updated to the renamed repository (`limit-switch`).

---

*Last updated: 2026-10-15*
