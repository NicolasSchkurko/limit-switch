/**
 * Creates the add-on menu when the form is opened.
 * @param {object} e The onOpen event object.
 */
function onOpen(e) {
  if (e && e.authMode === ScriptApp.AuthMode.NONE) {
    return;
  }
  try {
    FormApp.getUi()
      .createAddonMenu()
      .addItem('Configure Limiter', 'showLimitDialog')
      .addToUi();
  } catch (err) {
    console.error('Limit-Switch onOpen error: ' + err.toString());
  }
  syncActiveFormIfLimited();
}

/**
 * Recalibrates and enforces the quota when the form editor is opened.
 * Runs without extra OAuth scopes because the form is the active container.
 */
function syncActiveFormIfLimited() {
  try {
    var form = FormApp.getActiveForm();
    if (!form) return;
    if (getLimitNumber(form.getId()) <= 0) return;
    syncResponseCount();
  } catch (err) {
    console.error('Limit-Switch onOpen sync error: ' + err.toString());
  }
}

/**
 * Runs when the add-on is installed or tested.
 * @param {object} e The onInstall event object.
 */
function onInstall(e) {
  onOpen(e);
  showLimitDialog();
}

/**
 * Displays the limiter settings dialog.
 */
function showLimitDialog() {
  var form = FormApp.getActiveForm();
  var formId = form.getId();

  var currentResponses = getAndSyncResponseCount(form);
  var maxResponsesNum = getLimitNumber(formId);
  var maxResponses = maxResponsesNum > 0 ? maxResponsesNum.toString() : 'Not set';

  var template = HtmlService.createTemplateFromFile('index');
  template.maxResponses = maxResponses;
  template.currentResponses = currentResponses;
  template.confirmationMessage = form.getConfirmationMessage() || 'Your response has been recorded.';
  template.closedMessage = form.getCustomClosedFormMessage() || 'This form is no longer accepting responses.';
  template.isAccepting = form.isAcceptingResponses();

  var ui = template.evaluate().setWidth(450).setHeight(560);
  FormApp.getUi().showModalDialog(ui, 'Limit-Switch Settings');
}
