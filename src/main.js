/**
 * Creates a menu entry in the Google Forms UI when the form is opened.
 * @param {object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  FormApp.getUi()
    .createAddonMenu()
    .addItem('Configure Limiter', 'showLimitDialog')
    .addItem('Help', 'showHelpDialog')
    .addToUi();
}

/**
 * Runs when the add-on is installed or tested.
 * Immediately registers the menu and displays the limiter dialog.
 * @param {object} e The event parameter for a simple onInstall trigger.
 */
function onInstall(e) {
  onOpen(e);
  showLimitDialog();
}

/**
 * Fallback execution handlers for Google test harness entries.
 */
function install() {
  onInstall();
}

function configure() {
  showLimitDialog();
}

function help() {
  showHelpDialog();
}

/**
 * Displays a modal dialog with help and documentation.
 */
function showHelpDialog() {
  var ui = FormApp.getUi();
  ui.alert(
    'Limit-Switch Help & Documentation',
    'Limit-Switch manages response quotas for Google Forms.\n\n' +
    '• Set Response Limit: Sets quota. The form automatically closes upon reaching this limit.\n' +
    '• Closed Message: Message displayed to users attempting to access a closed form.\n' +
    '• Confirmation Message: Message displayed upon successful submission.\n' +
    '• Sync: Recalibrates live response counts directly with Google Forms.\n\n' +
    'Documentation & Privacy: https://portfolio-12u.pages.dev/limit-switch/',
    ui.ButtonSet.OK
  );
}

/**
 * Displays a modal dialog with the limiter settings.
 */
function showLimitDialog() {
  var form = FormApp.getActiveForm();
  var formId = form.getId();

  var currentResponseCount = getAndSyncResponseCount(form);
  var maxResponses = getStoredProperty(formId, 'maxResponses') || "Not set";
  var confirmationMessage = form.getConfirmationMessage() || "Your response has been recorded.";
  var closedMessage = form.getCustomClosedFormMessage() || "This form is no longer accepting responses.";
  var isAccepting = form.isAcceptingResponses();

  var template = HtmlService.createTemplateFromFile('index');
  template.maxResponses = maxResponses;
  template.currentResponses = currentResponseCount;
  template.confirmationMessage = confirmationMessage;
  template.closedMessage = closedMessage;
  template.isAccepting = isAccepting;

  var ui = template.evaluate().setWidth(450).setHeight(560);
  FormApp.getUi().showModalDialog(ui, 'Limit-Switch Settings');
}
