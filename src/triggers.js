/**
 * Number of recent response IDs kept per form to make trigger execution idempotent.
 */
var PROCESSED_RESPONSES_LIMIT = 20;

/**
 * Number of submissions before the quota at which the trigger reconciles with
 * Google Forms, so the closing decision is based on the live count.
 */
var RECONCILE_MARGIN = 10;

/**
 * Trigger handler executed automatically on every form submission.
 * Enforces response limit and closes the form when reached.
 * @param {object} e The onFormSubmit event object.
 */
function checkResponseLimit(e) {
  if (!e) return;

  var lock = LockService.getUserLock();
  var locked = false;

  try {
    lock.waitLock(30000);
    locked = true;

    var form = (e && e.source) ? e.source : FormApp.getActiveForm();
    if (!form) return;

    var formId = form.getId();
    var maxResponses = getLimitNumber(formId);
    if (maxResponses <= 0) return;

    var responseId = (e.response && typeof e.response.getId === 'function') ? e.response.getId() : null;
    if (responseId && wasResponseProcessed(formId, responseId)) return;

    var prevCount = parseInt(getStoredProperty(formId, 'responseCount') || '0', 10);
    var totalCount = prevCount + 1;

    if (form.isAcceptingResponses() && prevCount >= maxResponses) {
      // Counter drifted above the limit (for example, responses were deleted).
      // Trust the live count so the form is not closed early.
      totalCount = form.getResponses().length;
    } else if (totalCount >= maxResponses - RECONCILE_MARGIN) {
      // Near the quota: reconcile with Google Forms so a lost trigger cannot
      // leave the counter short when the closing decision is made.
      totalCount = Math.max(totalCount, form.getResponses().length);
    }

    setStoredProperty(formId, 'responseCount', totalCount.toString());

    if (totalCount >= maxResponses) {
      ensureFormClosed(form);
    }

    if (responseId) {
      rememberResponse(formId, responseId);
    }
  } catch (err) {
    console.error('Limit-Switch checkResponseLimit error: ' + err.toString());
  } finally {
    if (locked) lock.releaseLock();
  }
}

/**
 * Determines whether a response was already counted by a previous trigger run.
 * @param {string} formId Form ID.
 * @param {string} responseId Response ID.
 * @returns {boolean} Whether the response was already processed.
 */
function wasResponseProcessed(formId, responseId) {
  return getProcessedResponseIds(formId).indexOf(responseId) !== -1;
}

/**
 * Records a response ID so duplicate trigger deliveries are ignored.
 * Keeps a bounded list to avoid unbounded property growth.
 * @param {string} formId Form ID.
 * @param {string} responseId Response ID.
 */
function rememberResponse(formId, responseId) {
  var ids = getProcessedResponseIds(formId);
  ids.push(responseId);
  if (ids.length > PROCESSED_RESPONSES_LIMIT) {
    ids = ids.slice(ids.length - PROCESSED_RESPONSES_LIMIT);
  }
  setStoredProperty(formId, 'processedResponses', JSON.stringify(ids));
}

/**
 * Reads the bounded list of processed response IDs for a form.
 * @param {string} formId Form ID.
 * @returns {string[]} Processed response IDs.
 */
function getProcessedResponseIds(formId) {
  var raw = getStoredProperty(formId, 'processedResponses');
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
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
