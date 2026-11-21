/**
 * ForkIt Android tester sign-ups: "Get Forkit on Android" Google Form →
 * forkit-testers@googlegroups.com → "ForkIt is ready" email.
 *
 * Paste into the form's response sheet ("Forkit Android Testers") under
 * Extensions → Apps Script, together with ReadyEmail.html. Setup and the
 * day-to-day steps are in README.md next to this file.
 *
 * Consumer Google Groups (@googlegroups.com) have no API for adding members,
 * so that one step stays manual in the Groups UI. Everything around it is
 * automatic:
 *   1. onFormSubmit logs the email on the "Testers" tab as Pending and emails
 *      the owner a link to the group's Members page.
 *   2. Every 15 minutes checkGroupAndNotify() asks Google Groups whether each
 *      Pending email is a member yet (added, accepted an invite, or joined on
 *      their own). Once it is, the tester gets the ready email.
 *   3. The ForkIt testers menu covers the rest by hand: list Pending emails to
 *      paste into Groups, run the check now, or send the ready email to
 *      selected rows if the membership check can't see the group.
 */

var CONFIG = {
  groupEmail: 'forkit-testers@googlegroups.com',
  groupMembersUrl: 'https://groups.google.com/g/forkit-testers/members',
  optInUrl: 'https://play.google.com/apps/testing/com.seandm.forkit',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.seandm.forkit',
  guideUrl: 'https://claude.ai/artifact/6Ms4rcaMnd1xgWxJr29myU',
  senderName: 'ForkIt',
  subject: 'ForkIt is ready for you on Android',
  testersSheet: 'Testers',
  // Email owner on each new sign-up (the address running the script).
  notifyOwner: true,
};

var HEADERS = ['Email', 'Requested', 'Status', 'In group', 'Ready email sent', 'Note'];
var COL = { email: 1, requested: 2, status: 3, inGroup: 4, sent: 5, note: 6 };
var STATUS = { pending: 'Pending', ready: 'Ready email sent' };

// ---------- Setup ----------

/** Run once from the editor: creates the Testers tab and both triggers. */
function setup() {
  var ss = SpreadsheetApp.getActive();
  testersSheet_();

  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === 'onFormSubmit' || fn === 'checkGroupAndNotify') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('checkGroupAndNotify').timeBased().everyMinutes(15).create();

  importExistingResponses();
}

/** Adds any form responses already in the sheet (safe to run again). */
function importExistingResponses() {
  var responses = responsesSheet_();
  if (!responses || responses.getLastRow() < 2) return;
  var emailCol = emailColumn_(responses);
  var rows = responses.getRange(2, 1, responses.getLastRow() - 1, responses.getLastColumn()).getValues();
  rows.forEach(function (row) {
    addTester_(row[emailCol - 1], row[0] instanceof Date ? row[0] : new Date());
  });
}

// ---------- Triggers ----------

function onFormSubmit(e) {
  var email = (e.namedValues && e.namedValues['Email Address'] && e.namedValues['Email Address'][0]) || '';
  var added = addTester_(email, new Date());
  if (added && CONFIG.notifyOwner) notifyOwner_(added);
}

/** Time trigger: sends the ready email to every Pending tester now in the group. */
function checkGroupAndNotify() {
  var group;
  try {
    group = GroupsApp.getGroupByEmail(CONFIG.groupEmail);
  } catch (err) {
    console.error('Cannot open ' + CONFIG.groupEmail + ': ' + err);
    return;
  }

  var sheet = testersSheet_();
  eachTester_(sheet, function (r, row) {
    if (row[COL.status - 1] !== STATUS.pending) return;
    var email = row[COL.email - 1];
    var inGroup;
    try {
      inGroup = group.hasUser(email);
    } catch (err) {
      sheet.getRange(r, COL.note).setValue('Membership check failed: ' + err);
      return;
    }
    if (!inGroup) return;
    sheet.getRange(r, COL.inGroup).setValue(new Date());
    sendReady_(sheet, r, email);
  });
}

// ---------- Menu ----------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ForkIt testers')
    .addItem('Show pending emails (to add to the group)', 'showPending')
    .addItem('Check group now and send ready emails', 'checkGroupAndNotify')
    .addSeparator()
    .addItem('Send ready email to selected rows', 'sendReadyToSelection')
    .addItem('Preview the ready email', 'previewReadyEmail')
    .addToUi();
}

function showPending() {
  var pending = [];
  eachTester_(testersSheet_(), function (r, row) {
    if (row[COL.status - 1] === STATUS.pending) pending.push(row[COL.email - 1]);
  });
  var html = pending.length
    ? '<p>Copy these into <b>Add members</b> at <a href="' + CONFIG.groupMembersUrl +
      '" target="_blank">forkit-testers → Members</a>:</p>' +
      '<textarea style="width:100%;height:140px" readonly onclick="this.select()">' +
      escape_(pending.join(', ')) + '</textarea>' +
      '<p>Ready emails go out on their own within 15 minutes of each person showing up in the group.</p>'
    : '<p>No one is waiting. Everyone who signed up has been sent the ready email.</p>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput('<div style="font-family:sans-serif">' + html + '</div>').setWidth(460).setHeight(280),
    pending.length + ' pending'
  );
}

/** Manual fallback: sends the ready email to selected Testers rows still Pending. */
function sendReadyToSelection() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== CONFIG.testersSheet) {
    ui.alert('Select rows on the "' + CONFIG.testersSheet + '" tab first.');
    return;
  }
  var targets = [];
  sheet.getActiveRangeList().getRanges().forEach(function (range) {
    for (var r = range.getRow(); r < range.getRow() + range.getNumRows(); r++) {
      if (r < 2) continue;
      var row = sheet.getRange(r, 1, 1, HEADERS.length).getValues()[0];
      if (row[COL.email - 1] && row[COL.status - 1] === STATUS.pending) targets.push({ r: r, email: row[COL.email - 1] });
    }
  });
  if (!targets.length) {
    ui.alert('No Pending rows selected.');
    return;
  }
  var ok = ui.alert(
    'Send the ready email to ' + targets.length + ' tester(s)?',
    targets.map(function (t) { return t.email; }).join('\n') +
      '\n\nOnly do this once they are in ' + CONFIG.groupEmail + ', or Play will say the app is not available.',
    ui.ButtonSet.OK_CANCEL
  );
  if (ok !== ui.Button.OK) return;
  targets.forEach(function (t) { sendReady_(sheet, t.r, t.email); });
}

function previewReadyEmail() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(readyEmailHtml_()).setWidth(620).setHeight(640),
    'Subject: ' + CONFIG.subject
  );
}

// ---------- Email ----------

function readyEmailHtml_() {
  var t = HtmlService.createTemplateFromFile('ReadyEmail');
  t.optInUrl = CONFIG.optInUrl;
  t.playStoreUrl = CONFIG.playStoreUrl;
  t.guideUrl = CONFIG.guideUrl;
  return t.evaluate().getContent();
}

function readyEmailText_() {
  return [
    "You're in! ForkIt is ready for you on Android.",
    '',
    'On your Android phone, signed in to Google Play with this email address:',
    '',
    '1. Become a tester: open ' + CONFIG.optInUrl + ' and tap "Become a tester".',
    '2. Install ForkIt: ' + CONFIG.playStoreUrl,
    '3. Open ForkIt, enter your name, and start a room with friends.',
    '',
    'If Play says the app isn\'t available, wait a few minutes and open the step 1 link again.',
    '',
    'Step-by-step guide with screenshots: ' + CONFIG.guideUrl,
    '',
    'Please keep ForkIt installed for at least two weeks: Google needs that before ForkIt can go public on the Play Store.',
    'Found a bug or have an idea? Just reply to this email.',
    '',
    'Swipe right on dinner,',
    'ForkIt',
  ].join('\n');
}

/**
 * Sends the ready email to row r unless another run already has. The 15-minute
 * check, the menu check and the manual send can overlap (e.g. a confirm dialog
 * left open), so the status is re-read under the script lock and the send and
 * the status update happen while holding it.
 */
function sendReady_(sheet, r, email) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    console.warn('Skipped ' + email + ': another run holds the lock; the next check retries.');
    return;
  }
  try {
    var current = sheet.getRange(r, 1, 1, HEADERS.length).getValues()[0];
    if (String(current[COL.email - 1]).toLowerCase() !== String(email).toLowerCase()) return;
    if (current[COL.status - 1] !== STATUS.pending) return;

    MailApp.sendEmail({
      to: email,
      subject: CONFIG.subject,
      name: CONFIG.senderName,
      body: readyEmailText_(),
      htmlBody: readyEmailHtml_(),
    });
    sheet.getRange(r, COL.status).setValue(STATUS.ready);
    sheet.getRange(r, COL.sent).setValue(new Date());
    sheet.getRange(r, COL.note).setValue('');
  } catch (err) {
    sheet.getRange(r, COL.note).setValue('Send failed: ' + err);
  } finally {
    // Write the status before letting the next run read it.
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

function notifyOwner_(email) {
  var owner = Session.getEffectiveUser().getEmail();
  if (!owner) return;
  MailApp.sendEmail({
    to: owner,
    subject: 'New ForkIt Android tester: ' + email,
    name: CONFIG.senderName,
    body:
      email + ' signed up on the Get Forkit on Android form.\n\n' +
      'Add them to the testers group (Add members):\n' + CONFIG.groupMembersUrl + '\n\n' +
      'The ready-to-download email goes to them automatically within 15 minutes of joining the group.\n' +
      'Sheet: ' + SpreadsheetApp.getActive().getUrl(),
  });
}

// ---------- Sheet helpers ----------

/** Appends a Pending row unless the email is already listed. Returns the email if added. */
function addTester_(raw, when) {
  var email = String(raw || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = testersSheet_();
    var exists = false;
    eachTester_(sheet, function (r, row) {
      if (String(row[COL.email - 1]).toLowerCase() === email) exists = true;
    });
    if (exists) return null;
    sheet.appendRow([email, when, STATUS.pending, '', '', '']);
    return email;
  } finally {
    lock.releaseLock();
  }
}

function eachTester_(sheet, fn) {
  var last = sheet.getLastRow();
  if (last < 2) return;
  var rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  rows.forEach(function (row, i) {
    if (row[COL.email - 1]) fn(i + 2, row);
  });
}

function testersSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(CONFIG.testersSheet);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.testersSheet);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange('B:B').setNumberFormat('yyyy-mm-dd h:mm');
    sheet.getRange('D:E').setNumberFormat('yyyy-mm-dd h:mm');
    sheet.setColumnWidth(1, 260);
    sheet.setColumnWidth(6, 320);
  }
  return sheet;
}

function responsesSheet_() {
  var sheets = SpreadsheetApp.getActive().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getFormUrl()) return sheets[i];
  }
  return null;
}

function emailColumn_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var i = headers.indexOf('Email Address');
  return i >= 0 ? i + 1 : 2;
}

function escape_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
