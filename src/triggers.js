var SAFETY_MARGIN = 10;

/**
 * Checks if the response limit has been reached every time the form is submitted.
 * @param {object} e The event parameter for an onFormSubmit trigger.
 */
function checkResponseLimit(e) {
  if (!e || !e.response) return;

  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // Wait for any other modifications to finish.

  try {
    var maxResponses = parseInt(getProperties().getProperty('maxResponses') || '0', 10);
    if (maxResponses <= 0) return;

    // Fast-path: Check estimated response count.
    var cachedCount = parseInt(getProperties().getProperty('responseCount') || '-1', 10);

    // If cache was never initialized, sync live count right now using the shared helper.
    if (cachedCount === -1) {
      cachedCount = getAndSyncResponseCount();
      if (cachedCount < (maxResponses - SAFETY_MARGIN)) {
        return;
      }
    } else if ((cachedCount + 1) < (maxResponses - SAFETY_MARGIN)) {
      setCachedResponseCount(cachedCount + 1);
      return;
    }

    // Critical zone: Fetch live responses from Google Forms to ensure precise ordering and counts.
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

    // If the response is not found (e.g. already deleted), calibrate cache and exit safely.
    if (responseIndex === -1) {
      setCachedResponseCount(totalCount);
      return;
    }

    if (responseIndex >= maxResponses) {
      if (form.isAcceptingResponses()) {
        form.setAcceptingResponses(false);
      }
      form.deleteResponse(currentResponseId);
      setCachedResponseCount(totalCount - 1);
    } else {
      if (totalCount >= maxResponses && form.isAcceptingResponses()) {
        form.setAcceptingResponses(false);
      }
      setCachedResponseCount(totalCount);
    }
  } finally {
    lock.releaseLock(); // Release the lock
  }
}

/**
 * Creates an onFormSubmit trigger for the checkResponseLimit function if it doesn't exist.
 */
function setTrigger() {
  var form = FormApp.getActiveForm();
  var formId = form.getId();
  var triggers = ScriptApp.getProjectTriggers();
  var triggerExists = triggers.some(function(trigger) {
    return trigger.getHandlerFunction() === 'checkResponseLimit' &&
           trigger.getTriggerSourceId() === formId;
  });

  if (!triggerExists) {
    ScriptApp.newTrigger('checkResponseLimit')
      .forForm(form)
      .onFormSubmit()
      .create();
  }
}

/**
 * Deletes all onFormSubmit triggers for checkResponseLimit associated with this form.
 */
function deleteTrigger() {
  var formId = FormApp.getActiveForm().getId();
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'checkResponseLimit' &&
        trigger.getTriggerSourceId() === formId) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}
