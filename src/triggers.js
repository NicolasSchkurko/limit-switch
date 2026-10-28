/**
 * Checks if the response limit has been reached every time the form is submitted.
 * Triggered automatically by the installable onFormSubmit trigger.
 * @param {object} e The event parameter for an onFormSubmit trigger.
 */
function checkResponseLimit(e) {
  if (!e) return;

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    // Crucial: In onFormSubmit trigger executions, e.source provides the Form instance.
    // FormApp.getActiveForm() returns null during background trigger execution.
    var form = (e && e.source) ? e.source : FormApp.getActiveForm();
    if (!form) {
      console.error('Limit-Switch: Unable to determine form instance in trigger execution.');
      return;
    }

    var formId = form.getId();
    var maxResponsesStr = getStoredProperty(formId, 'maxResponses');
    var maxResponses = parseInt(maxResponsesStr || '0', 10);

    // If no limit is configured, exit gracefully
    if (isNaN(maxResponses) || maxResponses <= 0) {
      return;
    }

    var allResponses = form.getResponses();
    var totalCount = allResponses.length;
    var currentResponseId = (e && e.response) ? e.response.getId() : null;

    var responseIndex = -1;
    if (currentResponseId) {
      for (var i = 0; i < totalCount; i++) {
        if (allResponses[i].getId() === currentResponseId) {
          responseIndex = i;
          break;
        }
      }
    }

    // If this submission exceeds capacity, close the form and remove excess response
    if (responseIndex >= maxResponses) {
      if (form.isAcceptingResponses()) {
        form.setAcceptingResponses(false);
      }
      if (currentResponseId) {
        form.deleteResponse(currentResponseId);
      }
      setStoredProperty(formId, 'responseCount', (totalCount - 1).toString());
      console.log('Limit-Switch: Excess submission removed. Form closed at limit: ' + maxResponses);
    } else {
      // Submission is within capacity
      if (totalCount >= maxResponses && form.isAcceptingResponses()) {
        form.setAcceptingResponses(false);
        console.log('Limit-Switch: Form reached limit (' + totalCount + '/' + maxResponses + '). Closed.');
      }
      setStoredProperty(formId, 'responseCount', totalCount.toString());
    }
  } catch (err) {
    console.error('Limit-Switch checkResponseLimit trigger error: ' + err.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * Creates an onFormSubmit installable trigger for the checkResponseLimit function.
 * Removes existing triggers first to prevent duplicate trigger invocations.
 */
function setTrigger() {
  var form = FormApp.getActiveForm();
  if (!form) return;
  var formId = form.getId();

  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var t = triggers[i];
    if (t.getHandlerFunction() === 'checkResponseLimit') {
      try {
        var sourceId = t.getTriggerSourceId();
        if (!sourceId || sourceId === formId) {
          ScriptApp.deleteTrigger(t);
        }
      } catch (e) {
        ScriptApp.deleteTrigger(t);
      }
    }
  }

  ScriptApp.newTrigger('checkResponseLimit')
    .forForm(form)
    .onFormSubmit()
    .create();
}

/**
 * Deletes all onFormSubmit triggers for checkResponseLimit associated with this form.
 */
function deleteTrigger() {
  var form = FormApp.getActiveForm();
  if (!form) return;
  var formId = form.getId();

  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var t = triggers[i];
    if (t.getHandlerFunction() === 'checkResponseLimit') {
      try {
        var sourceId = t.getTriggerSourceId();
        if (!sourceId || sourceId === formId) {
          ScriptApp.deleteTrigger(t);
        }
      } catch (e) {
        ScriptApp.deleteTrigger(t);
      }
    }
  }
}
