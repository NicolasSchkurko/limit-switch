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
 * @returns {object} Result object with message and current form accepting status.
 */
function clearLimitInternal() {
  getProperties().deleteProperty('maxResponses');
  deleteTrigger();
  var form = FormApp.getActiveForm();
  return {
    message: 'Response limit removed successfully.',
    isAccepting: form.isAcceptingResponses()
  };
}

/**
 * Sets the maximum number of allowed responses, or removes the limit if empty or zero.
 * Automatically synchronizes the form's open/closed state with available capacity.
 * @param {string} limit The maximum number of responses as a string.
 * @returns {object} Result object with message and current form accepting status.
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
      var form = FormApp.getActiveForm();
      getProperties().setProperty('maxResponses', limitNumber.toString());
      var currentCount = getAndSyncResponseCount(form);
      setTrigger();

      var isAccepting = form.isAcceptingResponses();

      // Case 1: Limit already reached or exceeded -> close form if currently open.
      if (currentCount >= limitNumber) {
        if (isAccepting) {
          form.setAcceptingResponses(false);
          return {
            message: 'Limit set to ' + limitNumber + ' responses. Form is now closed (already has ' + currentCount + ' responses).',
            isAccepting: false
          };
        }
        return {
          message: 'Limit set to ' + limitNumber + ' responses. Form remains closed (limit reached).',
          isAccepting: false
        };
      }

      // Case 2: Available capacity exists -> reopen form if it was closed.
      if (!isAccepting) {
        form.setAcceptingResponses(true);
        return {
          message: 'Limit set to ' + limitNumber + ' responses. Form has been reopened.',
          isAccepting: true
        };
      }

      return {
        message: 'Limit set to ' + limitNumber + ' responses.',
        isAccepting: true
      };
    }

    throw new Error('Please enter a valid number greater than zero, or leave empty to remove the limit.');
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
      // Guarantee the form is closed again even if setCustomClosedFormMessage throws.
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
 * Forces a live recount of all form responses and synchronizes the cache.
 * Exposed to client-side UI via google.script.run.
 * @returns {object} Result object with actual response count and form accepting status.
 */
function syncResponseCount() {
  return withScriptLock(function() {
    var form = FormApp.getActiveForm();
    var actualCount = getAndSyncResponseCount(form);
    return {
      count: actualCount,
      isAccepting: form.isAcceptingResponses()
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
