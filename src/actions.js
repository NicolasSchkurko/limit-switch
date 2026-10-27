var formProperties = PropertiesService.getDocumentProperties();

/**
 * Persists the cached response count in DocumentProperties.
 * @param {number} count The response count to store.
 * @returns {number} The stored count.
 */
function setCachedResponseCount(count) {
  formProperties.setProperty('responseCount', count.toString());
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
 * Sets the maximum number of allowed responses.
 * @param {string} limit The maximum number of responses as a string.
 * @returns {string} A confirmation or error message.
 */
function setMaxResponses(limit) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var limitNumber = parseInt(limit, 10);

    if (!isNaN(limitNumber) && limitNumber > 0) {
      formProperties.setProperty('maxResponses', limitNumber.toString());
      getAndSyncResponseCount();
      setTrigger();
      return 'Limit set to ' + limitNumber + ' responses.';
    }

    throw new Error('Please enter a valid number greater than zero.');

  } catch (e) {

    if (e.message.includes('PERMISSION_DENIED')) {
      throw new Error('Permission Error: It seems you have multiple Google accounts logged in. Please log out of other accounts and try again.');
    }

    throw new Error(e.message);

  }finally {
    lock.releaseLock();
  }
}

/**
 * Sets the confirmation message that appears after a form is submitted.
 * @param {string} message The confirmation message.
 * @returns {string} A confirmation message.
 */
function setConfirmationMessage(message) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {

    if (messageIsEmpty(message)) {
      throw new Error('Confirmation message cannot be empty.');
    }

    var form = FormApp.getActiveForm();
    form.setConfirmationMessage(message);
    return 'Confirmation message updated successfully.';

  } catch (e) {
    if (e.message.includes('PERMISSION_DENIED')) {
      throw new Error('Permission Error: It seems you have multiple Google accounts logged in. Please log out of other accounts and try again.');
    }
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Sets the message that appears when the form is closed.
 * @param {string} message The closed form message.
 * @returns {string} A confirmation message.
 */
function setClosedMessage(message) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
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
  } catch (e) {
    if (e.message.includes('PERMISSION_DENIED')) {
      throw new Error('Permission Error: It seems you have multiple Google accounts logged in. Please log out of other accounts and try again.');
    }
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Forces a live recount of all form responses and synchronizes the cache.
 * Exposed to client-side UI via google.script.run.
 * @returns {number} The actual response count.
 */
function syncResponseCount() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    return getAndSyncResponseCount();
  } catch (e) {
    if (e.message.includes('PERMISSION_DENIED')) {
      throw new Error('Permission Error: It seems you have multiple Google accounts logged in. Please log out of other accounts and try again.');
    }
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Verifies if a message it's empty.
 * @param {string} message The evaluated message.
 * @returns {boolean} The validation.
 */
function messageIsEmpty(message){
 return !message || message.trim() === ''
}
