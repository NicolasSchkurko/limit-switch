/**
 * Retrieves a property value supporting DocumentProperties (primary) and UserProperties (fallback).
 * Falls back once to the legacy ScriptProperties store and migrates the value if found.
 * @param {string} [formId] Form ID for scoping in UserProperties.
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
      var userProps = PropertiesService.getUserProperties();
      if (userProps) {
        var scopedKey = formId + '_' + key;
        var uVal = userProps.getProperty(scopedKey);
        if (uVal !== null && uVal !== undefined && uVal !== '') {
          return uVal;
        }

        var legacy = PropertiesService.getScriptProperties();
        var lVal = legacy ? legacy.getProperty(scopedKey) : null;
        if (lVal !== null && lVal !== undefined && lVal !== '') {
          userProps.setProperty(scopedKey, lVal);
          return lVal;
        }
      }
    } catch (e) {
      console.error('Limit-Switch property read failed (' + key + '): ' + e);
    }
  }

  return null;
}

/**
 * Persists a property value across DocumentProperties and UserProperties.
 * @param {string} [formId] Form ID for scoping in UserProperties.
 * @param {string} key Property key.
 * @param {string} val Property value.
 * @returns {boolean} Whether the form-scoped (UserProperties) write succeeded.
 */
function setStoredProperty(formId, key, val) {
  var stringVal = (val === null || val === undefined) ? '' : val.toString();
  var saved = false;

  try {
    var docProps = PropertiesService.getDocumentProperties();
    if (docProps) {
      docProps.setProperty(key, stringVal);
    }
  } catch (e) {}

  if (formId) {
    try {
      var userProps = PropertiesService.getUserProperties();
      if (userProps) {
        userProps.setProperty(formId + '_' + key, stringVal);
        saved = true;
      }
    } catch (e) {
      console.error('Limit-Switch property write failed (' + key + '): ' + e);
    }
  }

  return saved;
}

/**
 * Deletes a property from DocumentProperties, UserProperties and the legacy ScriptProperties store.
 * @param {string} [formId] Form ID for scoping in UserProperties.
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
      var userProps = PropertiesService.getUserProperties();
      if (userProps) {
        userProps.deleteProperty(formId + '_' + key);
      }
    } catch (e) {
      console.error('Limit-Switch property delete failed (' + key + '): ' + e);
    }
    try {
      var legacy = PropertiesService.getScriptProperties();
      if (legacy) {
        legacy.deleteProperty(formId + '_' + key);
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
 * Records that the limiter closed the form so it can be safely reopened later.
 * @param {FormApp.Form} form Form instance.
 * @returns {boolean} Whether the status was toggled from open to closed.
 */
function ensureFormClosed(form) {
  if (form && form.isAcceptingResponses()) {
    form.setAcceptingResponses(false);
    setStoredProperty(form.getId(), 'closedByLimiter', '1');
    return true;
  }
  return false;
}

/**
 * Determines whether the form was closed by the limiter rather than by its owner.
 * For forms closed by older versions that predate the flag, infers it from the stored limit.
 * @param {string} formId Form ID.
 * @param {number} liveCount Current response count.
 * @param {number} limitNumber Previously stored limit (0 if none).
 * @returns {boolean} Whether the limiter closed the form.
 */
function wasClosedByLimiter(formId, liveCount, limitNumber) {
  if (getStoredProperty(formId, 'closedByLimiter') === '1') {
    return true;
  }
  return limitNumber > 0 && liveCount >= limitNumber;
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
 * Wraps an action within a per-user lock and standardizes error handling.
 * @param {Function} actionFn Callback to execute while holding lock.
 * @param {number} [timeoutMs=30000] Maximum lock wait time.
 * @returns {*} Return value of actionFn.
 */
function withUserLock(actionFn, timeoutMs) {
  var lock = LockService.getUserLock();
  var locked = false;

  try {
    lock.waitLock(timeoutMs || 30000);
    locked = true;
    return actionFn();
  } catch (e) {
    var message = (e && e.message) ? e.message : String(e);
    if (message.includes('PERMISSION_DENIED')) {
      throw new Error('Permission Error: Please ensure you are logged into only one Google account and try again.');
    }
    throw new Error(message);
  } finally {
    if (locked) lock.releaseLock();
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
  var previousLimit = getLimitNumber(formId);
  var count = getAndSyncResponseCount(form);
  var reopen = wasClosedByLimiter(formId, count, previousLimit);

  deleteStoredProperty(formId, 'maxResponses');
  deleteTrigger(form);

  if (reopen) {
    form.setAcceptingResponses(true);
    deleteStoredProperty(formId, 'closedByLimiter');
  }

  return {
    message: 'Response limit removed successfully.' + (reopen ? ' Form is now accepting responses.' : ''),
    isAccepting: form.isAcceptingResponses(),
    count: count
  };
}

/**
 * Persists the limit and current count, throwing if the form-scoped store rejects the write.
 * @param {string} formId Form ID.
 * @param {number} limitNumber Response limit.
 * @param {number} liveCount Current response count.
 */
function persistLimit(formId, limitNumber, liveCount) {
  var savedLimit = setStoredProperty(formId, 'maxResponses', limitNumber.toString());
  var savedCount = setStoredProperty(formId, 'responseCount', liveCount.toString());
  if (!savedLimit || !savedCount) {
    throw new Error('Could not save the response limit. Please try again.');
  }
}

/**
 * Sets the maximum number of allowed responses, or removes the limit if empty/invalid.
 * @param {string} limit The maximum number of responses.
 * @returns {object} Result with message, accepting status and response count.
 */
function setMaxResponses(limit) {
  return withUserLock(function() {
    var form = FormApp.getActiveForm();
    if (!form) {
      throw new Error('Active form could not be found.');
    }
    var formId = form.getId();

    if (limit === null || limit === undefined || (typeof limit === 'string' && limit.trim() === '')) {
      return clearLimitInternal();
    }

    var limitNumber = Number(limit);
    if (!Number.isInteger(limitNumber) || limitNumber <= 0) {
      return clearLimitInternal();
    }

    var previousLimit = getLimitNumber(formId);
    var liveCount = form.getResponses().length;

    if (liveCount >= limitNumber) {
      persistLimit(formId, limitNumber, liveCount);
      deleteTrigger(form);
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

    persistLimit(formId, limitNumber, liveCount);

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

    if (!form.isAcceptingResponses() && wasClosedByLimiter(formId, liveCount, previousLimit)) {
      form.setAcceptingResponses(true);
      deleteStoredProperty(formId, 'closedByLimiter');
    }

    return {
      message: 'Limit set to ' + limitNumber + ' responses.',
      isAccepting: form.isAcceptingResponses(),
      count: liveCount
    };
  });
}

/**
 * Removes the response limit and deletes the onFormSubmit trigger.
 * @returns {object} Result with message and current form accepting status.
 */
function removeLimit() {
  return withUserLock(function() {
    return clearLimitInternal();
  });
}

/**
 * Sets the confirmation message displayed after submission.
 * @param {string} message The confirmation message.
 * @returns {object} Result with message and form accepting status.
 */
function setConfirmationMessage(message) {
  return withUserLock(function() {
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
  return withUserLock(function() {
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
  return withUserLock(function() {
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
