# Privacy Policy for Limit-Switch

**Version:** 1.3 | **Last Updated:** October 2026

This Privacy Policy describes how Limit-Switch ("we," "us," or "our"), an independent Google Forms™ Editor Add-on developed by Nicolas Schkurko, handles information and user data in connection with the Limit-Switch add-on (the "Service"). Our commitment is absolute data minimization, transparent processing, and robust protection of user data.

---

### 1. Google API Services User Data Policy & Limited Use Disclosure

Limit-Switch's use and transfer to any other app of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the **Limited Use** requirements.

We explicitly affirm:
- **No Human Review:** We never allow humans to read Google user data.
- **No Advertising:** Google user data is never used or transferred for serving advertisements, retargeting, personalized advertising, or marketing.
- **No AI / Model Training:** Google user data is never used to train, retrain, or improve machine learning or artificial intelligence models.
- **No Sale or Commercial Transfer:** Google user data is never sold, rented, leased, or transferred to third-party data brokers or advertising networks.

---

### 2. Information We Access and How We Use Google User Data

Limit-Switch accesses only the minimum Google user data strictly required to deliver the core response limiter functionality, based on permissions granted by you via Google OAuth:

#### Authorized OAuth Scopes:
- `https://www.googleapis.com/auth/forms.currentonly`: Grants access strictly to the single Google Form where you open the add-on. It does not grant access to your Google Drive, other forms, or your account files.
- `https://www.googleapis.com/auth/script.container.ui`: Allows rendering the configuration dialog within the Google Forms editor interface.
- `https://www.googleapis.com/auth/script.scriptapp`: Allows creating and managing the installable `onFormSubmit` trigger that evaluates limits in the background upon each submission.

#### How Google User Data is Accessed and Used:
- **Form Response Counter:** The Service accesses the total count of submitted responses (`form.getResponses().length`) to verify whether total responses have reached your configured quota. The actual text, answers, or uploaded files of respondents are **never accessed, read, parsed, or logged**.
- **Form Status Management:** The Service reads the current acceptance state (`form.isAcceptingResponses()`) and calls `form.setAcceptingResponses(false)` to automatically close the form when the quota is reached, or `form.setAcceptingResponses(true)` when you explicitly increase the quota.
- **Form Messaging:** The Service reads and sets the custom confirmation message and the custom closed-form message as entered by you in the settings panel.

All processing occurs in volatile execution memory during Google Apps Script execution and is discarded immediately after function return.

---

### 3. Information We Store

The Service stores only the configuration values you provide directly in the add-on dialog:
- **Maximum Response Limit (`maxResponses`):** The numerical threshold at which the form should automatically close.
- **Response Count Cache (`responseCount`):** A cached numeric integer used by background triggers to prevent race conditions during rapid submissions.

These values are stored exclusively within Google's internal `PropertiesService` stores:
1. **`DocumentProperties` (Primary):** Scoped exclusively to the container Google Form where the add-on is running.
2. **`ScriptProperties` (Fallback for Triggers):** Strictly keyed by the unique form ID (`<formId>_maxResponses`), ensuring complete isolation between forms and users.

We operate **no external servers, no third-party databases, and no remote storage**. All configuration data stays permanently within your Google Workspace™ account infrastructure.

---

### 4. Data Protection Mechanisms for Sensitive Data

To protect all data and Google user data, Limit-Switch enforces strict technical, organizational, and architectural safeguards:

- **Encryption in Transit:** All communication between your client browser and Google APIs is strictly encrypted using modern Transport Layer Security (**TLS 1.2 and TLS 1.3**) over HTTPS.
- **Encryption at Rest:** All persistent configuration settings are stored inside Google's enterprise-grade cloud storage infrastructure, protected by Google's native **AES-256 server-side encryption at rest**.
- **Serverless Runtime Sandboxing:** The add-on executes entirely inside Google's sandboxed V8 execution environment (Google Apps Script). No external JavaScript bundles, CDNs, third-party analytics (like Google Analytics or Mixpanel), or tracking scripts are loaded.
- **Principle of Least Privilege:** By utilizing the restricted `forms.currentonly` scope, the add-on's access is technically restricted to only the form currently active in the user's browser, preventing cross-document data leakage.
- **Authentication & Access Control:** Configuration and execution are governed by Google's native OAuth 2.0 framework. Only authenticated Google users with explicit edit permissions on the Google Form can execute the add-on or modify settings.
- **Concurrency & State Protection:** Critical state transitions and trigger evaluations are guarded by Google's `LockService.getScriptLock()` to prevent race conditions or data corruption during concurrent submissions.

---

### 5. Data Sharing and Third-Party Disclosure

We **do not share, transfer, or disclose** any Google user data or form metadata to any third party:
- No data is sent to external servers or APIs.
- No analytics or telemetry libraries are embedded in the add-on.
- Processing is performed 100% within Google's cloud infrastructure.

---

### 6. Data Retention and Deletion

Because all configuration data resides directly inside your Google Form property store, you maintain complete ownership and lifecycle control:
- **Disabling the Limit:** Clearing the limit field or clicking "Disable Limit" immediately removes the quota and deletes the `onFormSubmit` background trigger.
- **Uninstalling the Add-on:** Uninstalling Limit-Switch halts all future executions. You can revoke OAuth authorization at any time via your [Google Account Third-Party Apps](https://myaccount.google.com/permissions) page.
- **Deleting the Form:** Deleting the Google Form permanently deletes its associated property store and triggers from Google's servers.

---

### 7. Trademark Attribution

Google Forms™, Google Workspace™, Google Drive™, and Google Apps Script™ are trademarks of Google LLC. Limit-Switch is an independent add-on developed by Nicolas Schkurko and is not affiliated with, sponsored by, or endorsed by Google LLC.

---

### 8. Contact & Security Inquiries

If you have questions, feedback, or security-related inquiries regarding this Privacy Policy or data protection practices, please contact the developer:

- **Developer:** Nicolas Schkurko
- **Email:** `schkurkonicolas@gmail.com`
- **Website & Documentation:** [https://nschkurko.com/limit-switch/](https://nschkurko.com/limit-switch/)
- **Source Code Repository:** [https://github.com/NicolasSchkurko/limit-switch](https://github.com/NicolasSchkurko/limit-switch)
