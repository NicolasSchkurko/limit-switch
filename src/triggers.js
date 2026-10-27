var formProperties = PropertiesService.getDocumentProperties();

/**
 * Checks if the response limit has been reached every time the form is submitted.
 * @param {object} e The event parameter for an onFormSubmit trigger.
 */
function checkResponseLimit(e) {
  if (!e || !e.response) return;

  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // Wait for any other modifications to finish.

  try {
    var maxResponses = parseInt(formProperties.getProperty('maxResponses') || '0', 10);
    if (maxResponses <= 0) return;

    var form = FormApp.getActiveForm();
    var currentResponseId = e.response.getId();

    var allResponses = form.getResponses();
    var totalCount = allResponses.length;

    var responseIndex = -1;
    for (var i = 0; i < totalCount; i++) {
      if (allResponses[i].getId() === currentResponseId) {
        responseIndex = i;
        break;
      }
    }

    // If the response is not found (e.g. already deleted), exit safely.
    if (responseIndex === -1) return;

    if (responseIndex >= maxResponses) {
      if (form.isAcceptingResponses()) {
        form.setAcceptingResponses(false);
      }
      form.deleteResponse(currentResponseId);
    } else {
      if (totalCount >= maxResponses && form.isAcceptingResponses()) {
        form.setAcceptingResponses(false);
      }
    }
  } finally {
    lock.releaseLock(); // Release the lock
  }
}

/**
 * Creates an onFormSubmit trigger for the checkResponseLimit function if it doesn't exist.
 */
function setTrigger() {
  var formId = FormApp.getActiveForm().getId();
  var triggers = ScriptApp.getProjectTriggers();
  var triggerExists = triggers.some(function(trigger) {
    return trigger.getHandlerFunction() === 'checkResponseLimit' &&
           trigger.getTriggerSourceId() === formId;
  });

  if (!triggerExists) {
    ScriptApp.newTrigger('checkResponseLimit')
      .forForm(FormApp.getActiveForm())
      .onFormSubmit()
      .create();
  }
}
