/**
 * Retrieves a property value supporting DocumentProperties (primary) and ScriptProperties (fallback).
 * @param {string} [formId] Form ID for scoping in ScriptProperties.
 * @param {string} key Property key.
 * @returns {string|null} The property value.
 */
function getStoredProperty(formId, key) {
  try {
    var docProps = PropertiesService.getDocumentProperties();
    if (docProps) {
      var dVal = docProps.getProperty(key);
      if (dVal !== null && dVal !== undefined && dVal !== '') {
        return dVal;
      }
    }
  } catch (e) {}

  if (formId) {
    try {
      var scriptProps = PropertiesService.getScriptProperties();
      if (scriptProps) {
        var sVal = scriptProps.getProperty(formId + '_' + key);
        if (sVal !== null && sVal !== undefined && sVal !== '') {
          return sVal;
        }
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Persists a property value across DocumentProperties and ScriptProperties.
 * @param {string} [formId] Form ID for scoping in ScriptProperties.
 * @param {string} key Property key.
 * @param {string} val Property value.
 */
function setStoredProperty(formId, key, val) {
  var stringVal = (val === null || val === undefined) ? '' : val.toString();

  try {
    var docProps = PropertiesService.getDocumentProperties();
    if (docProps) {
      docProps.setProperty(key, stringVal);
    }
  } catch (e) {}

  if (formId) {
    try {
      var scriptProps = PropertiesService.getScriptProperties();
      if (scriptProps) {
        scriptProps.setProperty(formId + '_' + key, stringVal);
      }
    } catch (e) {}
  }
}

/**
 * Deletes a property from both DocumentProperties and ScriptProperties.
 * @param {string} [formId] Form ID for scoping in ScriptProperties.
 * @param {string} key Property key.
 */
function deleteStoredProperty(formId, key) {
  try {
    var docProps = PropertiesService.getDocumentProperties();
    if (docProps) {
      docProps.deleteProperty(key);
    }
  } catch (e) {}

  if (formId) {
    try {
      var scriptProps = PropertiesService.getScriptProperties();
      if (scriptProps) {
        scriptProps.deleteProperty(formId + '_' + key);
      }
    } catch (e) {}
  }
}

/**
 * Returns the numeric response limit configured for a form, or 0 if not set.
 * @param {string} formId Form ID.
 * @returns {number} The response limit.
 */
function getLimitNumber(formId) {
  var val = getStoredProperty(formId, 'maxResponses');
  var num = parseInt(val || '0', 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Ensures the form is marked as closed if it is currently accepting responses.
 * @param {FormApp.Form} form Form instance.
 * @returns {boolean} Whether the status was toggled from open to closed.
 */
function ensureFormClosed(form) {
  if (form && form.isAcceptingResponses()) {
    form.setAcceptingResponses(false);
    return true;
  }
  return false;
}

/**
 * Obtains the live response count from Google Forms and synchronizes storage.
 * @param {FormApp.Form} [form] Optional active form instance.
 * @returns {number} The actual response count.
 */
function getAndSyncResponseCount(form) {
  var activeForm = form || FormApp.getActiveForm();
  if (!activeForm) return 0;
  var actualCount = activeForm.getResponses().length;
  var formId = activeForm.getId();
  setStoredProperty(formId, 'responseCount', actualCount.toString());
  return actualCount;
}

/**
 * Wraps an action within a script lock and standardizes error handling.
 * @param {Function} actionFn Callback to execute while holding lock.
 * @param {number} [timeoutMs=30000] Maximum lock wait time.
 * @returns {*} Return value of actionFn.
 */
function withScriptLock(actionFn, timeoutMs) {
  var lock = LockService.getScriptLock();
  lock.waitLock(timeoutMs || 30000);

  try {
    return actionFn();
  } catch (e) {
    if (e.message && e.message.includes('PERMISSION_DENIED')) {
      throw new Error('Permission Error: Please ensure you are logged into only one Google account and try again.');
    }
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Clears the max responses limit and removes the submission trigger.
 * @returns {object} Result with message, accepting status and response count.
 */
function clearLimitInternal() {
  var form = FormApp.getActiveForm();
  if (!form) {
    throw new Error('Active form could not be found.');
  }
  var formId = form.getId();
  deleteStoredProperty(formId, 'maxResponses');
  deleteTrigger(form);
  var count = getAndSyncResponseCount(form);
  return {
    message: 'Response limit removed successfully.',
    isAccepting: form.isAcceptingResponses(),
    count: count
  };
}

/**
 * Sets the maximum number of allowed responses, or removes the limit if empty/invalid.
 * @param {string} limit The maximum number of responses.
 * @returns {object} Result with message, accepting status and response count.
 */
function setMaxResponses(limit) {
  return withScriptLock(function() {
    var form = FormApp.getActiveForm();
    if (!form) {
      throw new Error('Active form could not be found.');
    }
    var formId = form.getId();

    if (limit === null || limit === undefined || (typeof limit === 'string' && limit.trim() === '')) {
      return clearLimitInternal();
    }

    var limitNumber = parseInt(limit, 10);
    if (isNaN(limitNumber) || limitNumber <= 0) {
      return clearLimitInternal();
    }

    var liveCount = form.getResponses().length;

    if (liveCount >= limitNumber) {
      deleteTrigger(form);
      setStoredProperty(formId, 'maxResponses', limitNumber.toString());
      setStoredProperty(formId, 'responseCount', liveCount.toString());
      ensureFormClosed(form);

      return {
        message: 'Limit set to ' + limitNumber + ' responses. Form is now closed (already has ' + liveCount + ' responses).',
        isAccepting: false,
        count: liveCount
      };
    }

    try {
      if (typeof form.supportsAdvancedResponderPermissions === 'function' && form.supportsAdvancedResponderPermissions()) {
        if (typeof form.isPublished === 'function' && !form.isPublished()) {
          form.setPublished(true);
        }
      }
    } catch (e) {}

    try {
      setTrigger(form);
    } catch (trigErr) {
      deleteStoredProperty(formId, 'maxResponses');
      var errStr = trigErr.toString();
      if (errStr.indexOf('published') !== -1 || errStr.indexOf('Publish') !== -1) {
        throw new Error('Google Forms requires this form to be published or open for responses before activating the limiter trigger.');
      }
      throw new Error('Could not set limiter trigger: ' + trigErr.message);
    }

    setStoredProperty(formId, 'maxResponses', limitNumber.toString());
    setStoredProperty(formId, 'responseCount', liveCount.toString());

    var isAcceptingNow = form.isAcceptingResponses();
    if (!isAcceptingNow) {
      form.setAcceptingResponses(true);
      isAcceptingNow = true;
    }

    return {
      message: 'Limit set to ' + limitNumber + ' responses.',
      isAccepting: isAcceptingNow,
      count: liveCount
    };
  });
}

/**
 * Removes the response limit and deletes the onFormSubmit trigger.
 * @returns {object} Result with message and current form accepting status.
 */
function removeLimit() {
  return withScriptLock(function() {
    return clearLimitInternal();
  });
}

/**
 * Sets the confirmation message displayed after submission.
 * @param {string} message The confirmation message.
 * @returns {object} Result with message and form accepting status.
 */
function setConfirmationMessage(message) {
  return withScriptLock(function() {
    if (messageIsEmpty(message)) {
      throw new Error('Confirmation message cannot be empty.');
    }
    var form = FormApp.getActiveForm();
    form.setConfirmationMessage(message);
    return {
      message: 'Confirmation message updated successfully.',
      isAccepting: form.isAcceptingResponses()
    };
  });
}

/**
 * Sets the message displayed when the form is closed.
 * @param {string} message The closed form message.
 * @returns {object} Result with message and form accepting status.
 */
function setClosedMessage(message) {
  return withScriptLock(function() {
    if (messageIsEmpty(message)) {
      throw new Error('Closed form message cannot be empty.');
    }
    var form = FormApp.getActiveForm();
    form.setCustomClosedFormMessage(message);
    return {
      message: 'Closed form message updated successfully.',
      isAccepting: form.isAcceptingResponses()
    };
  });
}

/**
 * Recalibrates live response count from Google Forms and enforces closure if limit is reached.
 * Never reopens a closed form.
 * @returns {object} Result with actual response count and form accepting status.
 */
function syncResponseCount() {
  return withScriptLock(function() {
    var form = FormApp.getActiveForm();
    if (!form) {
      throw new Error('Active form could not be found.');
    }
    var formId = form.getId();
    var actualCount = getAndSyncResponseCount(form);
    var maxResponses = getLimitNumber(formId);

    if (maxResponses > 0 && actualCount >= maxResponses) {
      ensureFormClosed(form);
    }

    try {
      var scriptProps = PropertiesService.getScriptProperties();
      if (scriptProps) {
        scriptProps.deleteProperty('maxResponses');
        scriptProps.deleteProperty('responseCount');
      }
    } catch (e) {}

    return {
      count: actualCount,
      isAccepting: form.isAcceptingResponses()
    };
  }, 15000);
}

/**
 * Verifies if a message is empty or whitespace.
 * @param {string} message Evaluated string.
 * @returns {boolean} True if empty.
 */
function messageIsEmpty(message) {
  return !message || message.trim() === '';
}
