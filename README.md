<<<<<<< HEAD
# <img src="https://raw.githubusercontent.com/NicolasSchkurko/limit-switch/refs/heads/main/misc/logo.svg" alt="Limit-Switch logo" width="42"/> Limit-Switch
=======
# <img src="misc/logo.svg" alt="Limit-Switch logo" width="42"/> Limit-Switch
>>>>>>> develop

<p align="center">
  <img src="misc/limit-switch-demo-960-12.gif" alt="Limit-Switch demo" width="640"/>
</p>

### A lightweight, robust, and free Google Forms editor add-on that automatically stops accepting responses once a predefined response quota is reached. Once the limit is met, the form immediately switches to closed and displays a customizable message to visitors.

👉 **[Install Limit-Switch from Google Workspace Marketplace](https://workspace.google.com/marketplace/app/limit_switch/1041132526220)**

---

### Features
- **Best-Effort Response Quota:** Set a numeric limit on allowed submissions. Google Forms has no synchronous submit hook, so a few extra responses may arrive under heavy concurrency before the background trigger closes the form.
- **Automatic Closure:** Sets `Accepting Responses` to closed as soon as the background trigger detects the quota is reached.
- **Custom Closed & Confirmation Messages:** Set both the on-screen submission confirmation message and the custom message shown to respondents after the form is closed.
- **Live Status & Sync:** Real-time top bar in the add-on dialog showing current response count, form status badge (`● Open` / `● Closed`), and a manual `Sync` button to recalibrate directly with Google's backend.
- **Isolated Per-Form Storage:** Limits and settings are strictly scoped per form; multiple forms managed by the same account or organization never collide.
- **Concurrency-Safe:** Background trigger executions and user configuration updates use Google Apps Script `LockService` to prevent race conditions.
- **Clean Technical UI:** Minimalist, high-contrast aesthetic designed with clean typography, clear status indicators, and zero emojis.
- **Free & Privacy-First:** 100% free, open source, with zero ads and zero third-party telemetry. All data stays strictly within your Google account.

---

### How to Use
1. **Install the Add-on:** Add [Limit-Switch from Google Workspace Marketplace](https://workspace.google.com/marketplace/app/limit_switch/1041132526220).
2. **Open Limit-Switch:** Inside your Google Form editor, click the Add-ons icon (puzzle piece), select **Limit-Switch**, and click **Configure Limiter**.
3. **Set the Response Limit:** Enter the desired maximum number of responses and click **Set Response Limit**.
   - If the form currently has fewer responses than the limit, the limiter activates and ensures the form is open for submissions.
   - If the form already has equal to or more responses than the limit, the add-on closes the form immediately.
4. **Customize Messages (Optional):**
   - **Closed Form Message:** Customize what visitors see when navigating to a closed form. Click **Update Closed Message**.
   - **Confirmation Message:** Customize what submitters see immediately after submitting. Click **Update Confirmation**.
5. **Remove Limit:** To let the form accept unlimited responses, leave the limit field blank or click **Disable Limit**. This clears the threshold and removes the submission trigger.

---

### Development & Deployment

The source code is organized under `src/`:
- `src/actions.js`: Limit management, storage access, messaging, and synchronization logic.
- `src/triggers.js`: Background `onFormSubmit` trigger handlers and trigger lifecycle management.
- `src/main.js`: Menus (`onOpen`, `onInstall`) and dialog rendering.
- `src/index.html`: Client-side dialog UI and styles.
- `src/appsscript.json`: Add-on manifest with OAuth scopes and Google Forms add-on configuration.

#### Pushing to Google Apps Script
```bash
# Push source code to the active Google Apps Script project
clasp push --force

# Create a new immutable version
clasp version "V1.0.3 - Marketplace Release"

# Update existing deployment
clasp deploy -i <DEPLOYMENT_ID> -V <VERSION_NUMBER>
```

#### Tests
The limit logic is covered by dependency-free Node tests (nothing to install):

```bash
npm test
```

---

### Verification & Testing Checklist
1. Open a Google Form with 0 responses and set the limit to `3`. The status badge displays `● Open`.
2. Submit 3 test responses. Upon the 3rd submission, the form closes automatically.
3. Attempt a 4th submission; Google Forms shows the custom closed-form message.
4. Click **Sync** in the add-on settings; the form remains closed and displays `3` responses.
5. Increase the limit to `5`; the form automatically reopens and displays `● Open`.
6. Click **Disable Limit**; the quota is removed and background triggers are cleaned up.

---

### Legal & Documentation
- **Google Workspace Marketplace:** [https://workspace.google.com/marketplace/app/limit_switch/1041132526220](https://workspace.google.com/marketplace/app/limit_switch/1041132526220)
- **Home & Documentation:** [https://nschkurko.com/limit-switch/](https://nschkurko.com/limit-switch/)
- **Privacy Policy:** [https://nschkurko.com/limit-switch/privacy.html](https://nschkurko.com/limit-switch/privacy.html) (Local: [docs/Privacy_policy.md](docs/Privacy_policy.md))
- **Terms of Service:** [https://nschkurko.com/limit-switch/terms.html](https://nschkurko.com/limit-switch/terms.html) (Local: [docs/Terms_of_service.md](docs/Terms_of_service.md))

---

### License
This project is open source and licensed under the [GNU General Public License v3.0](LICENSE).
