/**
 * Retrieves a property value supporting both DocumentProperties and UserProperties fallback.
 * @param {string} [formId] The form ID used for scoping UserProperties fallback.
 * @param {string} key The property key.
 * @returns {string|null} The property value.
 */
function getStoredProperty(formId, key) {
  try {
    var docProps = PropertiesService.getDocumentProperties();
    if (docProps) {
      var val = docProps.getProperty(key);
      if (val !== null && val !== undefined) {
        return val;
      }
    }
  } catch (e) {
    // DocumentProperties may not be available in standalone/trigger context
  }

  try {
    var userProps = PropertiesService.getUserProperties();
    if (userProps) {
      var scopedKey = formId ? (formId + '_' + key) : key;
      var userVal = userProps.getProperty(scopedKey);
      if (userVal !== null && userVal !== undefined) {
        return userVal;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Persists a property value in both DocumentProperties and UserProperties.
 * @param {string} [formId] The form ID used for scoping UserProperties.
 * @param {string} key The property key.
 * @param {string} val The property value.
 */
function setStoredProperty(formId, key, val) {
  var stringVal = (val === null || val === undefined) ? '' : val.toString();

  try {
    var docProps = PropertiesService.getDocumentProperties();
    if (docProps) {
      docProps.setProperty(key, stringVal);
    }
  } catch (e) {}

  try {
    var userProps = PropertiesService.getUserProperties();
    if (userProps) {
      var scopedKey = formId ? (formId + '_' + key) : key;
      userProps.setProperty(scopedKey, stringVal);
    }
  } catch (e) {}
}

/**
 * Deletes a property in both DocumentProperties and UserProperties.
 * @param {string} [formId] The form ID.
 * @param {string} key The property key.
 */
function deleteStoredProperty(formId, key) {
  try {
    var docProps = PropertiesService.getDocumentProperties();
    if (docProps) {
      docProps.deleteProperty(key);
    }
  } catch (e) {}

  try {
    var userProps = PropertiesService.getUserProperties();
    if (userProps) {
      var scopedKey = formId ? (formId + '_' + key) : key;
      userProps.deleteProperty(scopedKey);
    }
  } catch (e) {}
}

/**
 * Returns document properties for the active form (legacy compatibility helper).
 * @returns {GoogleAppsScript.Properties.Properties} The form's document properties.
 */
function getProperties() {
  return PropertiesService.getDocumentProperties();
}

/**
 * Persists the cached response count in storage.
 * @param {number} count The response count to store.
 * @param {string} [formId] Optional form ID.
 * @returns {number} The stored count.
 */
function setCachedResponseCount(count, formId) {
  setStoredProperty(formId, 'responseCount', count.toString());
  return count;
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
 * @param {Function} actionFn The callback function to execute while holding the lock.
 * @param {number} [timeoutMs=30000] Maximum milliseconds to wait for the script lock.
 * @returns {*} The return value of actionFn.
 */
function withScriptLock(actionFn, timeoutMs) {
  var lock = LockService.getScriptLock();
  lock.waitLock(timeoutMs || 30000);

  try {
    return actionFn();
  } catch (e) {
    if (e.message && e.message.includes('PERMISSION_DENIED')) {
      throw new Error('Permission Error: It seems you have multiple Google accounts logged in. Please log out of other accounts and try again.');
    }
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Internal helper to clear the max responses limit and remove the submission trigger.
 * @returns {object} Result object with message, current form accepting status and response count.
 */
function clearLimitInternal() {
  var form = FormApp.getActiveForm();
  var formId = form.getId();
  deleteStoredProperty(formId, 'maxResponses');
  deleteTrigger();
  var count = getAndSyncResponseCount(form);
  return {
    message: 'Response limit removed successfully.',
    isAccepting: form.isAcceptingResponses(),
    count: count
  };
}

/**
 * Sets the maximum number of allowed responses, or removes the limit if empty or zero.
 * Automatically synchronizes the form's open/closed state with available capacity.
 * @param {string} limit The maximum number of responses as a string.
 * @returns {object} Result object with message, accepting status and response count.
 */
function setMaxResponses(limit) {
  return withScriptLock(function() {
    if (limit === null || limit === undefined || (typeof limit === 'string' && limit.trim() === '')) {
      return clearLimitInternal();
    }

    var limitNumber = parseInt(limit, 10);
    if (isNaN(limitNumber) || limitNumber <= 0) {
      return clearLimitInternal();
    }

    var form = FormApp.getActiveForm();
    var formId = form.getId();
    setStoredProperty(formId, 'maxResponses', limitNumber.toString());

    var currentCount = getAndSyncResponseCount(form);
    setTrigger();

    var isAccepting = form.isAcceptingResponses();

    // Case 1: Limit already reached or exceeded -> close form immediately
    if (currentCount >= limitNumber) {
      if (isAccepting) {
        form.setAcceptingResponses(false);
        return {
          message: 'Limit set to ' + limitNumber + ' responses. Form is now closed (already has ' + currentCount + ' responses).',
          isAccepting: false,
          count: currentCount
        };
      }
      return {
        message: 'Limit set to ' + limitNumber + ' responses. Form remains closed (limit reached).',
        isAccepting: false,
        count: currentCount
      };
    }

    // Case 2: Available capacity exists -> reopen form if it was closed
    if (!isAccepting) {
      form.setAcceptingResponses(true);
      return {
        message: 'Limit set to ' + limitNumber + ' responses. Form has been reopened.',
        isAccepting: true,
        count: currentCount
      };
    }

    return {
      message: 'Limit set to ' + limitNumber + ' responses.',
      isAccepting: true,
      count: currentCount
    };
  });
}

/**
 * Removes the response limit and deletes the onFormSubmit trigger.
 * Exposed to client-side UI via google.script.run.
 * @returns {object} Result object with message and current form accepting status.
 */
function removeLimit() {
  return withScriptLock(function() {
    return clearLimitInternal();
  });
}

/**
 * Sets the confirmation message that appears after a form is submitted.
 * @param {string} message The confirmation message.
 * @returns {object} Result object with confirmation message and form accepting status.
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
 * Sets the message that appears when the form is closed.
 * @param {string} message The closed form message.
 * @returns {object} Result object with confirmation message and form accepting status.
 */
function setClosedMessage(message) {
  return withScriptLock(function() {
    if (messageIsEmpty(message)) {
      throw new Error('Closed form message cannot be empty.');
    }
    var form = FormApp.getActiveForm();
    var wasClosed = !form.isAcceptingResponses();

    if (wasClosed) {
      form.setAcceptingResponses(true);
    }

    try {
      form.setCustomClosedFormMessage(message);
    } finally {
      if (wasClosed) {
        form.setAcceptingResponses(false);
      }
    }

    return {
      message: 'Closed form message updated successfully.',
      isAccepting: form.isAcceptingResponses()
    };
  });
}

/**
 * Forces a live recount of all form responses, synchronizes storage,
 * and actively enforces the configured limit policy.
 * Exposed to client-side UI via google.script.run.
 * @returns {object} Result object with actual response count and form accepting status.
 */
function syncResponseCount() {
  return withScriptLock(function() {
    var form = FormApp.getActiveForm();
    if (!form) {
      throw new Error('Active form could not be found.');
    }
    var formId = form.getId();
    var actualCount = getAndSyncResponseCount(form);

    var maxResponsesStr = getStoredProperty(formId, 'maxResponses');
    var maxResponses = parseInt(maxResponsesStr || '0', 10);
    var isAccepting = form.isAcceptingResponses();

    // Actively enforce limit policy upon sync
    if (!isNaN(maxResponses) && maxResponses > 0) {
      if (actualCount >= maxResponses && isAccepting) {
        form.setAcceptingResponses(false);
        isAccepting = false;
      } else if (actualCount < maxResponses && !isAccepting) {
        form.setAcceptingResponses(true);
        isAccepting = true;
      }
    }

    return {
      count: actualCount,
      isAccepting: isAccepting
    };
  }, 15000);
}

/**
 * Verifies if a message is empty.
 * @param {string} message The evaluated message.
 * @returns {boolean} The validation.
 */
function messageIsEmpty(message) {
  return !message || message.trim() === '';
}
