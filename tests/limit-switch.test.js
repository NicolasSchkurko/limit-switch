'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const SRC = path.join(__dirname, '..', 'src');
const code = [
  fs.readFileSync(path.join(SRC, 'actions.js'), 'utf8'),
  fs.readFileSync(path.join(SRC, 'triggers.js'), 'utf8'),
].join('\n');

function makeStore() {
  const data = new Map();
  return {
    getProperty: (key) => (data.has(key) ? data.get(key) : null),
    setProperty: (key, value) => { data.set(key, String(value)); },
    deleteProperty: (key) => { data.delete(key); },
    values: data,
  };
}

function setup(options = {}) {
  const state = {
    count: options.count || 0,
    accepting: options.accepting !== false,
    getResponsesCalls: 0,
  };
  const doc = makeStore();
  const user = makeStore();
  const legacy = makeStore();
  const triggers = [];
  const logs = [];
  const env = { docAvailable: true };
  const capture = (level) => (...args) => logs.push({ level, message: args.join(' ') });

  if (options.failUserWrite) {
    user.setProperty = () => { throw new Error('quota exceeded'); };
  }

  const form = {
    getId: () => 'FORM1',
    getResponses: () => {
      state.getResponsesCalls++;
      return new Array(state.count);
    },
    isAcceptingResponses: () => state.accepting,
    setAcceptingResponses: (value) => { state.accepting = value; },
    setConfirmationMessage: () => {},
    setCustomClosedFormMessage: () => {},
    supportsAdvancedResponderPermissions: () => false,
    isPublished: () => true,
    setPublished: () => {},
  };

  const sandbox = {
    console: { log: capture('log'), error: capture('error') },
    PropertiesService: {
      getDocumentProperties: () => {
        if (!env.docAvailable) throw new Error('document is not open');
        return doc;
      },
      getUserProperties: () => user,
      getScriptProperties: () => legacy,
    },
    LockService: {
      getUserLock: () => ({ waitLock: () => {}, releaseLock: () => {} }),
    },
    FormApp: { getActiveForm: () => form },
    ScriptApp: {
      AuthMode: { NONE: 'NONE', LIMITED: 'LIMITED', FULL: 'FULL' },
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (trigger) => {
        const index = triggers.indexOf(trigger);
        if (index !== -1) triggers.splice(index, 1);
      },
      newTrigger: (handler) => ({
        forForm: (target) => ({
          onFormSubmit: () => ({
            create: () => {
              triggers.push({
                getHandlerFunction: () => handler,
                getTriggerSourceId: () => target.getId(),
              });
            },
          }),
        }),
      }),
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  return { ctx: sandbox, state, form, doc, user, legacy, triggers, env, logs };
}

function userValue(app, key) {
  return app.user.getProperty('FORM1_' + key);
}

// Trigger executions run without an open document, so DocumentProperties are unavailable.
function submit(app, responseId) {
  app.env.docAvailable = false;
  app.ctx.checkResponseLimit({
    source: app.form,
    response: { getId: () => responseId },
  });
  app.env.docAvailable = true;
}

test('sets a limit on an open form without closing it and arms the trigger', () => {
  const app = setup({ count: 0, accepting: true });

  const result = app.ctx.setMaxResponses('5');

  assert.equal(result.isAccepting, true);
  assert.equal(app.state.accepting, true);
  assert.equal(userValue(app, 'maxResponses'), '5');
  assert.equal(app.triggers.length, 1);
});

test('does not reopen a form the owner closed manually', () => {
  const app = setup({ count: 3, accepting: false });

  app.ctx.setMaxResponses('5');

  assert.equal(app.state.accepting, false);
  assert.equal(userValue(app, 'maxResponses'), '5');
});

test('closes when the trigger reaches the quota', () => {
  const app = setup({ count: 0, accepting: true });
  app.ctx.setMaxResponses('2');

  submit(app, 'R1');
  assert.equal(app.state.accepting, true);

  submit(app, 'R2');
  assert.equal(app.state.accepting, false);
  assert.equal(userValue(app, 'responseCount'), '2');
  assert.equal(userValue(app, 'closedByLimiter'), '1');
});

test('counts a duplicate trigger delivery only once', () => {
  const app = setup({ count: 0, accepting: true });
  app.ctx.setMaxResponses('3');

  submit(app, 'R1');
  submit(app, 'R1');

  assert.equal(userValue(app, 'responseCount'), '1');
});

test('does not scan all responses on the normal trigger path', () => {
  const app = setup({ count: 0, accepting: true });
  app.ctx.setMaxResponses('5');
  const before = app.state.getResponsesCalls;

  submit(app, 'R1');

  assert.equal(app.state.getResponsesCalls, before);
});

test('reconciles a drifted counter instead of closing early', () => {
  const app = setup({ count: 2, accepting: true });
  app.user.setProperty('FORM1_maxResponses', '5');
  app.user.setProperty('FORM1_responseCount', '9');

  submit(app, 'R1');

  assert.equal(userValue(app, 'responseCount'), '2');
  assert.equal(app.state.accepting, true);
});

test('raising the quota reopens a form the limiter closed', () => {
  const app = setup({ count: 5, accepting: true });
  app.ctx.setMaxResponses('5');
  assert.equal(app.state.accepting, false);

  app.ctx.setMaxResponses('10');

  assert.equal(app.state.accepting, true);
  assert.equal(userValue(app, 'maxResponses'), '10');
  assert.equal(userValue(app, 'closedByLimiter'), null);
});

test('Remove Limit reopens a form the limiter closed', () => {
  const app = setup({ count: 5, accepting: true });
  app.ctx.setMaxResponses('5');
  assert.equal(app.state.accepting, false);

  app.ctx.removeLimit();

  assert.equal(app.state.accepting, true);
  assert.equal(userValue(app, 'maxResponses'), null);
  assert.equal(app.triggers.length, 0);
});

test('Remove Limit leaves an owner-closed form closed', () => {
  const app = setup({ count: 3, accepting: false });

  app.ctx.removeLimit();

  assert.equal(app.state.accepting, false);
});

test('does not arm a trigger when the limit cannot be saved', () => {
  const app = setup({ count: 0, accepting: true, failUserWrite: true });

  assert.throws(() => app.ctx.setMaxResponses('5'), /Could not save the response limit/);
  assert.equal(app.triggers.length, 0);
  assert.ok(app.logs.some((entry) => entry.level === 'error'));
});

test('closes immediately when the form is already at the limit', () => {
  const app = setup({ count: 10, accepting: true });

  const result = app.ctx.setMaxResponses('5');

  assert.equal(result.isAccepting, false);
  assert.equal(app.state.accepting, false);
  assert.equal(userValue(app, 'maxResponses'), '5');
  assert.equal(app.triggers.length, 0);
});

test('rejects non-integer limits', () => {
  const app = setup({ count: 0, accepting: true });

  app.ctx.setMaxResponses('3.9');
  assert.equal(userValue(app, 'maxResponses'), null);

  app.ctx.setMaxResponses('3abc');
  assert.equal(userValue(app, 'maxResponses'), null);
});
