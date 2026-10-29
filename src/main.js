/**
 * Creates menu entries in the Google Forms UI when the form is opened.
 * @param {object} e The onOpen event object.
 */
function onOpen(e) {
  var ui = FormApp.getUi();
  try {
    ui.createMenu('Limit-Switch')
      .addItem('Configure Limiter', 'showLimitDialog')
      .addToUi();
  } catch (err) {}
  try {
    ui.createAddonMenu()
      .addItem('Configure Limiter', 'showLimitDialog')
      .addToUi();
  } catch (err) {}
}

/**
 * Runs when the add-on is installed or tested.
 * @param {object} e The onInstall event object.
 */
function onInstall(e) {
  onOpen(e);
  showLimitDialog();
}

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
    'Documentation & Privacy: https://nschkurko.com/limit-switch/',
    ui.ButtonSet.OK
  );
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
