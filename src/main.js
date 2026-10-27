var formProperties = PropertiesService.getDocumentProperties();

/**
 * Creates a menu entry in the Google Forms UI when the form is opened.
 * @param {object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  FormApp.getUi()
    .createAddonMenu()
    .addItem('⚙️ Configure Limiter', 'showLimitDialog')
    .addToUi();
}

/**
 * Runs when the add-on is installed.
 * @param {object} e The event parameter for a simple onInstall trigger.
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Displays a modal dialog with the limiter settings.
 */
function showLimitDialog() {
  var form = FormApp.getActiveForm();

  var currentResponseCount = getAndSyncResponseCount(form);
  var maxResponses = formProperties.getProperty('maxResponses') || "Not set";
  var confirmationMessage = form.getConfirmationMessage() || "Your response has been recorded.";
  var closedMessage = form.getCustomClosedFormMessage() || "This form is no longer accepting responses.";

  var template = HtmlService.createTemplateFromFile('index');
  template.maxResponses = maxResponses;
  template.currentResponses = currentResponseCount;
  template.confirmationMessage = confirmationMessage;
  template.closedMessage = closedMessage;


  var ui = template.evaluate().setWidth(450).setHeight(580);
  FormApp.getUi().showModalDialog(ui, 'Limiter Settings');
}
