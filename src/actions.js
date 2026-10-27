/**
 * Returns the document properties for the active form.
 * Uses lazy loading to avoid top-level service calls.
 * @returns {GoogleAppsScript.Properties.Properties} The form's document properties.
 */
function getProperties() {
  return PropertiesService.getDocumentProperties();
}

/**
 * Persists the cached response count in DocumentProperties.
 * @param {number} count The response count to store.
 * @returns {number} The stored count.
 */
function setCachedResponseCount(count) {
  getProperties().setProperty('responseCount', count.toString());
  return count;
}

/**
 * Obtains the live response count from Google Forms and synchronizes the cache.
 * @param {FormApp.Form} [form] Optional active form instance.
 * @returns {number} The actual response count.
 */
function getAndSyncResponseCount(form) {
  var activeForm = form || FormApp.getActiveForm();
  var actualCount = activeForm.getResponses().length;
  return setCachedResponseCount(actualCount);
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
 * @returns {string} A confirmation message.
 */
function clearLimitInternal() {
  getProperties().deleteProperty('maxResponses');
  deleteTrigger();
  return 'Response limit removed successfully.';
}

/**
 * Sets the maximum number of allowed responses, or removes the limit if empty or zero.
 * @param {string} limit The maximum number of responses as a string.
 * @returns {string} A confirmation or error message.
 */
function setMaxResponses(limit) {
  return withScriptLock(function() {
    if (limit === null || limit === undefined || (typeof limit === 'string' && limit.trim() === '')) {
      return clearLimitInternal();
    }

    var limitNumber = parseInt(limit, 10);
    if (limitNumber === 0) {
      return clearLimitInternal();
    }

    if (!isNaN(limitNumber) && limitNumber > 0) {
      getProperties().setProperty('maxResponses', limitNumber.toString());
      getAndSyncResponseCount();
      setTrigger();
      return 'Limit set to ' + limitNumber + ' responses.';
    }

    throw new Error('Please enter a valid number greater than zero, or leave empty to remove the limit.');
  });
}

/**
 * Removes the response limit and deletes the onFormSubmit trigger.
 * Exposed to client-side UI via google.script.run.
 * @returns {string} A confirmation message.
 */
function removeLimit() {
  return withScriptLock(function() {
    return clearLimitInternal();
  });
}

/**
 * Sets the confirmation message that appears after a form is submitted.
 * @param {string} message The confirmation message.
 * @returns {string} A confirmation message.
 */
function setConfirmationMessage(message) {
  return withScriptLock(function() {
    if (messageIsEmpty(message)) {
      throw new Error('Confirmation message cannot be empty.');
    }

    var form = FormApp.getActiveForm();
    form.setConfirmationMessage(message);
    return 'Confirmation message updated successfully.';
  });
}

/**
 * Sets the message that appears when the form is closed.
 * @param {string} message The closed form message.
 * @returns {string} A confirmation message.
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
      // Guarantee the form is closed again even if setCustomClosedFormMessage throws.
      if (wasClosed) {
        form.setAcceptingResponses(false);
      }
    }

    return 'Closed form message updated successfully.';
  });
}

/**
 * Forces a live recount of all form responses and synchronizes the cache.
 * Exposed to client-side UI via google.script.run.
 * @returns {number} The actual response count.
 */
function syncResponseCount() {
  return withScriptLock(function() {
    return getAndSyncResponseCount();
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
