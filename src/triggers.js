/**
 * Trigger handler executed automatically on every form submission.
 * Enforces response limit and closes the form when reached.
 * @param {object} e The onFormSubmit event object.
 */
function checkResponseLimit(e) {
  if (!e) return;

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var form = (e && e.source) ? e.source : FormApp.getActiveForm();
    if (!form) return;

    var formId = form.getId();
    var maxResponses = getLimitNumber(formId);
    if (maxResponses <= 0) return;

    var prevCount = parseInt(getStoredProperty(formId, 'responseCount') || '0', 10);
    var liveResponses = form.getResponses();
    var liveCount = liveResponses ? liveResponses.length : 0;
    var totalCount = Math.max(prevCount + 1, liveCount);

    setStoredProperty(formId, 'responseCount', totalCount.toString());

    if (totalCount >= maxResponses) {
      ensureFormClosed(form);
    }
  } catch (err) {
    console.error('Limit-Switch checkResponseLimit error: ' + err.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * Removes all checkResponseLimit triggers associated with this form.
 * @param {FormApp.Form} [form] The form instance.
 */
function deleteTrigger(form) {
  var activeForm = form || FormApp.getActiveForm();
  if (!activeForm) return;
  var formId = activeForm.getId();

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

/**
 * Creates an onFormSubmit trigger for the form, cleaning any existing one first.
 * @param {FormApp.Form} [form] The form instance.
 */
function setTrigger(form) {
  var activeForm = form || FormApp.getActiveForm();
  if (!activeForm) return;

  deleteTrigger(activeForm);

  ScriptApp.newTrigger('checkResponseLimit')
    .forForm(activeForm)
    .onFormSubmit()
    .create();
}
