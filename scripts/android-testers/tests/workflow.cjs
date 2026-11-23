const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "../Code.gs"), "utf8");
const template = fs.readFileSync(path.join(__dirname, "../ReadyEmail.html"), "utf8");
const owner = "owner@example.invalid";
const tester = "tester@example.invalid";
const hour = 3600000;

function workflow() {
  let timestamp = Date.UTC(2026, 0, 1);
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [timestamp])); }
  }
  const data = [Array(8).fill("")];
  const mail = [];
  const control = { member: false, unreadable: false, memberError: false, quota: 20, mailError: false };
  const sheet = {
    getName: () => "Testers",
    getParent: () => book,
    getLastRow: () => data.length,
    appendRow: row => data.push(Array.from(row)),
    getActiveRangeList: () => ({ getRanges: () => [{ getRow: () => 2, getLastRow: () => 2 }] }),
    getRange(row, col, height = 1, width = 1) {
      if (row === "H1") return this.getRange(1, 8);
      return {
        getValue: () => data[row - 1][col - 1],
        getValues: () => data.slice(row - 1, row - 1 + height).map(line => line.slice(col - 1, col - 1 + width)),
        setValue: value => { data[row - 1][col - 1] = value; },
        setValues: values => values.forEach((line, i) => {
          line.forEach((value, j) => { data[row - 1 + i][col - 1 + j] = value; });
        }),
      };
    },
  };
  const book = { getSheetByName: () => sheet, getUrl: () => "https://example.invalid/sheet" };
  const ui = { alert: () => "OK", Button: { OK: "OK" }, ButtonSet: { OK_CANCEL: "OK_CANCEL" } };
  const app = vm.createContext({
    Date: Clock,
    SpreadsheetApp: { getActive: () => book, getActiveSheet: () => sheet, getUi: () => ui, flush() {} },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => owner }) },
    GroupsApp: {
      getGroupByEmail() {
        if (control.unreadable) throw Error("Group access denied");
        return { hasUser(email) {
          if (email === owner) return true;
          if (control.memberError) throw Error("Member list unavailable");
          return control.member;
        } };
      },
    },
    HtmlService: {
      createTemplateFromFile: () => ({ evaluate() {
        return { getContent: () => template.replace(/<\?= (\w+) \?>/g, (_, key) => this[key]) };
      } }),
    },
    MailApp: {
      getRemainingDailyQuota: () => control.quota,
      sendEmail(message, subject, body) {
        if (control.mailError) throw Error("Unknown mail outcome");
        mail.push(typeof message === "object" ? message : { to: message, subject, body });
      },
    },
  });
  vm.runInContext(script, app);
  const submit = () => app.onFormSubmit({ namedValues: {
    "Email Address": [tester], "Testing ForkIt for 14 days": ["I understand and agree."],
  } });
  return { app, control, data, mail, submit, poll: () => app.checkGroupAndNotify(), advance: ms => { timestamp += ms; } };
}

test("wait starts at first confirmed membership, survives repeated checks, and sends once", () => {
  const { app, control, data, mail, submit, poll, advance } = workflow();
  submit();
  submit();
  advance(24 * hour);
  poll();
  assert.equal(data.length, 2);
  assert.equal(mail.length, 1);
  assert.match(mail[0].body, /Directly add members/);
  assert.equal(data[1][2], app.STATUS.pending);
  control.member = true;
  poll();
  const confirmed = data[1][3].getTime();
  assert.equal(data[1][6].getTime(), confirmed + 6 * hour);
  advance(6 * hour - 1);
  poll();
  assert.equal(data[1][3].getTime(), confirmed);
  assert.equal(mail.length, 1);
  advance(1);
  poll();
  poll();
  assert.equal(data[1][2], app.STATUS.ready);
  assert.equal(mail.length, 2);
  for (const copy of [mail[1].body, mail[1].htmlBody]) {
    for (const link of [app.CONFIG.signupUrl, app.CONFIG.optInUrl, app.CONFIG.playStoreUrl]) assert.ok(copy.includes(link));
    assert.doesNotMatch(copy, /groups\.google\.com|claude\.ai/);
    assert.match(copy, /stay opted in/);
  }
});

test("lookup failure is visible, blocks automatic sending, and alerts once per outage", () => {
  const { app, control, data, mail, submit, poll, advance } = workflow();
  submit();
  control.member = true;
  poll();
  advance(8 * hour);
  control.unreadable = true;
  poll();
  poll();
  assert.match(data[0][7], /Group check failed/);
  assert.match(data[1][5], /Membership check failed/);
  assert.deepEqual(mail.map(m => m.to), [owner, owner]);
  control.unreadable = false;
  control.memberError = true;
  poll();
  assert.equal(mail.length, 2);
  control.memberError = false;
  poll();
  assert.equal(data[0][7], "Group check OK");
  assert.equal(data[1][2], app.STATUS.ready);
  control.unreadable = true;
  poll();
  assert.equal(mail.filter(m => m.subject.includes("needs attention")).length, 2);
});

test("manual confirmation during an outage uses the same wait, even on repeated confirmation", () => {
  const { app, control, data, mail, submit, poll, advance } = workflow();
  submit();
  control.unreadable = true;
  app.confirmSelectedMembers();
  poll();
  const confirmed = data[1][3].getTime();
  advance(6 * hour - 1);
  app.confirmSelectedMembers();
  poll();
  assert.equal(data[1][3].getTime(), confirmed);
  assert.equal(mail.filter(m => m.to === tester).length, 0);
  advance(1);
  poll();
  app.confirmSelectedMembers();
  poll();
  assert.equal(mail.filter(m => m.to === tester).length, 1);
});

test("known nonmembership resets the wait, including owner confirmation", () => {
  const { app, control, data, mail, submit, poll, advance } = workflow();
  submit();
  app.confirmSelectedMembers();
  advance(5 * hour);
  poll();
  assert.equal(data[1][2], app.STATUS.pending);
  assert.equal(data[1][3], "");
  assert.equal(data[1][6], "");
  control.member = true;
  poll();
  advance(hour);
  poll();
  assert.equal(mail.length, 1);
  advance(5 * hour);
  poll();
  assert.equal(mail.length, 2);
});

test("a manual Already testing row stays out of the queue when the same address submits the form", () => {
  const { app, control, data, mail, submit, poll, advance } = workflow();
  data.push(["  " + tester.toUpperCase() + " ", "", app.STATUS.alreadyTesting, "", "", "", ""]);
  control.member = true;
  submit();
  poll();
  advance(8 * hour);
  poll();
  assert.equal(data.length, 2);
  assert.equal(data[1][2], "Already testing");
  assert.equal(mail.length, 0);
});

test("quota depletion retries, an ambiguous delivery needs owner review", () => {
  const { app, control, data, mail, submit, poll, advance } = workflow();
  submit();
  control.member = true;
  poll();
  advance(6 * hour);
  control.quota = 0;
  poll();
  assert.equal(data[1][2], app.STATUS.waiting);
  control.quota = 20;
  control.mailError = true;
  poll();
  assert.equal(data[1][2], app.STATUS.sending);
  control.mailError = false;
  poll();
  assert.equal(mail.length, 1);
});
