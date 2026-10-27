# <img src="https://raw.githubusercontent.com/NicolasSchkurko/limit-switch/refs/heads/main/misc/Limiter.svg" alt="Limit-Switch logo" width="50"/> Limit-Switch

A free Google Forms add-on to limit the number of responses a form will accept. Once the limit is reached, the form is closed automatically and a custom message is displayed to visitors.

> Currently being prepared for the Google Workspace Marketplace.

### Features
- **Set Response Limits:** easily set a maximum number of responses for your form.
- **Automated Closing:** the add-on closes the form as soon as the limit is reached.
- **Custom Messages:** customize both the confirmation message (after a successful submission) and the message shown when the form is closed.
- **Per-Form Settings:** the limit and messages are stored with the form itself, so every form keeps its own configuration.
- **Concurrency-Safe:** simultaneous submissions or settings changes can't exceed the limit or corrupt the configuration.
- **Modern UI:** a clean, responsive, and easy-to-use interface to manage the settings.

### How to Use
- **Install the Add-on:** from the Google Workspace Marketplace (listing coming soon).
- **Open the Add-on:** in your Google Form, click on the puzzle piece icon (Add-ons), select "Limit-Switch," and then click "⚙️ Configure Limiter."
- **Set the Limit:** in the dialog, enter the maximum number of responses you want to accept in the "Set Response Limit" field and click "Save Limit."
- **Customize Messages (Optional):** you can also update the confirmation message and the message that will be shown once the form is closed. Click the corresponding "Update" button to save each message.

The add-on will then monitor new submissions. When the total number of responses reaches the limit you set, it will automatically stop accepting new responses.

### Technical Notes
This section documents some specific behaviors and design choices.

**Per-Form Storage**
- Settings are stored with `PropertiesService.getDocumentProperties()`, which is scoped to the Google Form where the add-on is installed. Two forms using the add-on never share their limits or messages.

**Updating the "Closed Form" Message**
- **Problem:** The Google Apps Script API can throw an error if you try to modify the closed-form message while the form is already closed.
- **Solution:** To work around this, the function temporarily re-opens the form, applies the new message, and then immediately closes it again. This is almost invisible to the user and ensures the message can be updated at any time.

**Preventing Race Conditions**
- The add-on uses Google’s LockService to serialize settings changes and submissions. Simultaneous submissions near the limit are resolved by chronological order of arrival: responses within the quota are always kept, and only genuine excess submissions are deleted.

**Dynamic Limit Adjustments and Form Lifecycle**
- **Raising the limit:** If the form was previously closed because it reached its limit, setting a higher limit automatically reopens the form (`form.setAcceptingResponses(true)`) so visitors can immediately submit responses without requiring manual intervention in Google Forms settings.
- **Lowering the limit:** If the limit is set to or below the current number of responses, the add-on immediately closes the form (`form.setAcceptingResponses(false)`). This guarantees that new respondents do not waste time filling out a form that would discard their submissions.
- **Removing the limit:** Setting an empty value, `0`, or clicking "Remove Limit" clears the limit and cleans up background triggers.

**Linked Google Sheets — Known Limitation**
- If your form is connected to a Google Sheet (via _Responses → Link to Sheets_), be aware that deleteResponse() in Google Apps Script **only removes the response from the form’s internal store**. The corresponding row in the linked spreadsheet is **not deleted automatically**. This is a platform-level constraint of the Google Forms / Sheets API.
- In practice this means: if a submission arrives over the limit and is rejected by the add-on, the form’s response count will be correct, but the linked sheet may contain one extra row for that rejected submission. You can safely delete that row manually from the spreadsheet without affecting the add-on’s behavior.

### Development
The source lives in `src/`; the add-on manifest is `src/appsscript.json`.

- With [clasp](https://github.com/google/clasp): point `rootDir` to `src/` and run `clasp push`.
- Without clasp: create a Forms add-on project in the Apps Script editor and copy the files.

Before deploying a change, verify:
1. With a limit of N, submit N times: the form closes and keeps all N responses.
2. Submit once more: the extra response is deleted.
3. Open a second form with the add-on: its limit and messages are independent from the first one.

Open items and pending decisions are tracked in [PENDING.md](PENDING.md) (also available in [Spanish](PENDIENTES.md)).

### Legal
- [Privacy Policy](docs/Privacy_policy.md)
- [Terms of Service](docs/Terms_of_service.md)

### License
This project is licensed under the GNU General Public License v3.0.
