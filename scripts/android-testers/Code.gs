/**
 * @OnlyCurrentDoc
 * Bound to the ForkIt Android signup form's response spreadsheet.
 * Setup and the owner's direct-add instructions are in README.md.
 */
var CONFIG = {
  groupEmail: 'forkit-testers@googlegroups.com',
  groupMembersUrl: 'https://groups.google.com/g/forkit-testers/members',
  optInUrl: 'https://play.google.com/apps/testing/com.seandm.forkit',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.seandm.forkit',
  signupUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdT20TuugOF8F2Axs1h2ID_9IR5RMJs584phhH9FrKOma3EMA/viewform',
  senderName: 'ForkIt',
  subject: 'Your ForkIt Android test link',
  testersSheet: 'Testers',
};
var HEADERS = ['Email', 'Requested', 'Status', 'Membership confirmed', 'Ready email sent', 'Note'];
var COL = { email: 1, requested: 2, status: 3, inGroup: 4, sent: 5, note: 6 };
var STATUS = {
  pending: 'Pending',
  alreadyTesting: 'Already testing',
  sending: 'Check email delivery',
  ready: 'Ready email sent',
};
// Statuses written by the earlier version that waited before emailing. Treated as Pending.
var LEGACY_WAITING = ['Waiting for Play', 'Waiting for Play (owner confirmed)'];
var DIRECT_ADD = 'Open Members → Add members. Turn ON “Directly add members” and check that the final button says “Add members”. If Google can only invite this account, wait for the person to accept and appear under Members.';
var DUPLICATE_EMAIL_FORMULA = '=IF(TRIM($A2)="",FALSE,SUMPRODUCT(--(LOWER(TRIM($A$2:$A))=LOWER(TRIM($A2))))>1)';
var TESTER_MENU = [
  { label: 'Show emails to add to the group', handler: 'showPending', help: 'Opens a copyable list of Pending addresses and the Google Group members page.' },
  { label: 'Check membership and send emails', handler: 'checkGroupAndNotify', help: 'Runs the scheduled check now. Pending testers who are in the group get the install email.' },
  { label: 'Confirm selected members by hand', handler: 'confirmSelectedMembers', help: 'If the group check fails, verify membership in Google Groups first. Select the matching Testers rows, then use this command to send them the install email.' },
  { label: 'Preview the install email', handler: 'previewReadyEmail', help: 'Displays the email your testers will receive. Previewing sends nothing.' },
];

function setup() {
  var ss = SpreadsheetApp.getActive();
  var responses = responsesSheet_();
  if (!responses) throw new Error('Open the spreadsheet linked to the signup form.');
  emailColumn_(responses);
  readyEmailHtml_(); // Check the template before enabling the triggers.
  var sheet = testersSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.getRange('B:B').setNumberFormat('mmm d, h:mm AM/PM');
  sheet.getRange('D:E').setNumberFormat('mmm d, h:mm AM/PM');
  [230, 145, 245, 165, 160, 360, 150, 300].forEach(function (width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
  sheet.getRange('H1').setWrap(true);
  refreshTesterTools();

  // Keep one trigger per handler when setup is run again by the same owner.
  var triggers = ScriptApp.getProjectTriggers();
  var submitTriggers = triggers.filter(function (t) {
    return t.getHandlerFunction() === 'onFormSubmit' &&
      t.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT && t.getTriggerSourceId() === ss.getId();
  });
  var pollTriggers = triggers.filter(function (t) {
    return t.getHandlerFunction() === 'checkGroupAndNotify' && t.getEventType() === ScriptApp.EventType.CLOCK;
  });
  if (!submitTriggers.length) ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  if (!pollTriggers.length) ScriptApp.newTrigger('checkGroupAndNotify').timeBased().everyMinutes(15).create();
  submitTriggers.slice(1).concat(pollTriggers.slice(1)).forEach(function (t) { ScriptApp.deleteTrigger(t); });

  importExistingResponses();
  checkGroupAndNotify();
  console.log('Setup complete. See Testers!H1 for the group check.');
}

// Also runnable on an installed workbook without importing signups or polling the queue.
function refreshTesterTools() {
  var sheet = testersSheet_();
  // The earlier version kept its send time in column G.
  if (sheet.getRange('G1').getValue() === 'Send after') sheet.getRange('G:G').clearContent();
  var emails = sheet.getRange('A2:A');
  var duplicate = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(DUPLICATE_EMAIL_FORMULA).setBackground('#fce8e6').setFontColor('#9c241a')
    .setBold(true).setRanges([emails]).build();
  var otherRules = sheet.getConditionalFormatRules().filter(function (rule) {
    var condition = rule.getBooleanCondition();
    var ranges = rule.getRanges();
    return !(condition && condition.getCriteriaType() === SpreadsheetApp.BooleanCriteria.CUSTOM_FORMULA &&
      condition.getCriteriaValues()[0] === DUPLICATE_EMAIL_FORMULA && ranges.length === 1 &&
      ranges[0].getColumn() === COL.email && ranges[0].getRow() === 2 && ranges[0].getNumColumns() === 1 &&
      ranges[0].getLastRow() === emails.getLastRow());
  });
  sheet.setConditionalFormatRules([duplicate].concat(otherRules));
  sheet.getRange('C2:C').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(STATUS), true).setAllowInvalid(false)
    .setHelpText('Choose Pending for a new tester or Already testing for a known install. Clear the cell to pause a row.')
    .build());
  writeTesterInstructions_(sheet.getParent());
}

function writeTesterInstructions_(ss) {
  var guide = ss.getSheetByName('Instructions');
  if (!guide) {
    var previous = ss.getActiveSheet();
    guide = ss.insertSheet('Instructions', ss.getNumSheets());
    ss.setActiveSheet(previous);
  }
  var rows = [
    ['Android tester onboarding', 'Use the Testers tab to manage signups and Google Play install emails.'],
    ['=HYPERLINK("' + CONFIG.signupUrl + '","Share the signup form")', 'The form collects the tester’s Play account and 14-day agreement. Each new address gets a Pending row and you get an email.'],
    ['Add a tester by hand', 'Confirm they can keep ForkIt installed and stay in the test for 14 days. Search column A, then enter their Play email once and choose Pending in C.'],
    ['Someone already has ForkIt', 'Choose Already testing to record a known install. A blank status also keeps a row out of the email queue.'],
    ['Red email addresses', 'The address appears more than once. Keep the original row and clear the status on any extra active copy. Two active rows can send two emails.'],
    ['=HYPERLINK("' + CONFIG.groupMembersUrl + '","Add to Google Groups")', 'Choose Add members, turn on Directly add members, then click Add members. If Google sends an invitation, the tester must accept it first.'],
    ['When the link goes out', 'The script checks every 15 minutes. Once it confirms membership (D), it emails the opt-in and install links and records the send time (E).'],
    ['If a tester is waiting', 'Check H1 for group access and F for details. For Check email delivery, confirm receipt with the tester before scheduling another send.'],
    ['ForkIt testers menu', 'What each command does'],
  ];
  var menuHeading = rows.length;
  TESTER_MENU.forEach(function (item) { rows.push([item.label, item.help]); });
  guide.setColumnWidth(1, 275);
  guide.setColumnWidth(2, 590);
  guide.getRange(1, 1, rows.length, 2).setValues(rows).setWrap(true).setVerticalAlignment('middle');
  guide.getRange(1, 1, rows.length, 1).setFontWeight('bold');
  guide.getRangeList(['A1:B1', 'A' + menuHeading + ':B' + menuHeading])
    .setBackground('#e8eaed').setFontWeight('bold');
  guide.getRange('A1').setFontSize(14);
  guide.setRowHeights(1, rows.length, 42);
  guide.setHiddenGridlines(true);
}

function importExistingResponses() {
  var responses = responsesSheet_();
  if (!responses || responses.getLastRow() < 2) return;
  var emailCol = emailColumn_(responses);
  var rows = responses.getRange(2, 1, responses.getLastRow() - 1, responses.getLastColumn()).getValues();
  var added = [];
  rows.forEach(function (row) {
    var email = addTester_(row[emailCol - 1], row[0] instanceof Date ? row[0] : new Date());
    if (email) added.push(email);
  });
  if (added.length) notifyOwner_(added);
}

function onFormSubmit(e) {
  var values = e.namedValues['Email Address'];
  if (!values || !values[0]) throw new Error('The signup form must collect a verified Email Address.');
  var added = addTester_(values[0], new Date());
  if (added) notifyOwner_([added]);
}

function checkGroupAndNotify() {
  var sheet = testersSheet_();
  var group;
  var groupError = '';
  try {
    group = GroupsApp.getGroupByEmail(CONFIG.groupEmail);
    group.hasUser(Session.getEffectiveUser().getEmail()); // Exercise membership reads even with an empty queue.
  } catch (err) {
    group = null;
    groupError = String(err);
  }
  var firstError = groupError;
  eachTester_(sheet, function (r, row) {
    if (!isQueued_(row[COL.status - 1])) return;
    withQueuedRow_(sheet, r, row[0], function (current) {
      var member = null;
      var error = groupError;
      if (group) {
        try {
          member = group.hasUser(current[0]);
        } catch (err) {
          error = String(err);
        }
      }
      if (error && !firstError) firstError = error;
      processMembership_(sheet, r, current, member, error);
    });
  });
  updateGroupHealth_(sheet, firstError);
}

function processMembership_(sheet, r, row, member, error, ownerConfirmed) {
  if (member === false) {
    if (row[COL.status - 1] !== STATUS.pending || row[COL.note - 1] || row[COL.inGroup - 1]) {
      writeState_(sheet, r, STATUS.pending, '', '', '');
    }
    return;
  }
  if (member === null && !ownerConfirmed) {
    sheet.getRange(r, COL.note).setValue('Membership check failed. ' + error);
    return;
  }
  if (MailApp.getRemainingDailyQuota() < 1) {
    sheet.getRange(r, COL.note).setValue(member === null
      ? 'Daily mail quota reached. Confirm this row again tomorrow.'
      : 'Daily mail quota reached. The next check will retry.');
    return;
  }
  var now = new Date();
  var html = readyEmailHtml_();
  // Persist intent first. An interruption after Google accepts mail requires reconciliation.
  writeState_(sheet, r, STATUS.sending, now, '', 'Check with the tester before retrying an interrupted send.');
  SpreadsheetApp.flush();
  try {
    MailApp.sendEmail({ to: row[0], subject: CONFIG.subject, name: CONFIG.senderName, body: readyEmailText_(), htmlBody: html });
  } catch (err) {
    sheet.getRange(r, COL.note).setValue('Could not confirm delivery. Check with the tester before retrying. ' + err);
    return;
  }
  writeState_(sheet, r, STATUS.ready, now, new Date(), '');
}

function writeState_(sheet, r, status, confirmed, sent, note) {
  sheet.getRange(r, COL.status, 1, 4).setValues([[status, confirmed, sent, note]]);
}

function isQueued_(status) {
  return status === STATUS.pending || LEGACY_WAITING.indexOf(status) >= 0;
}

function locked_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    try { SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  }
}

function withQueuedRow_(sheet, r, email, fn) {
  locked_(function () {
    var current = sheet.getRange(r, 1, 1, HEADERS.length).getValues()[0];
    if (current[0] === email && isQueued_(current[COL.status - 1])) fn(current);
  });
}

function updateGroupHealth_(sheet, error) {
  locked_(function () {
    var cell = sheet.getRange('H1');
    var previous = String(cell.getValue());
    var prefix = 'Group check failed';
    var message = error ? prefix + '. See Members and the Note column. ' + error : 'Group check OK';
    if (previous === message) return;
    cell.setValue(message);
    if (error && previous.indexOf(prefix) !== 0) {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'ForkIt tester group needs attention',
        'Check the membership permissions for ' + CONFIG.groupEmail + '.\n' + CONFIG.groupMembersUrl +
        '\nIf needed, confirm actual members using the ForkIt testers menu in ' + sheet.getParent().getUrl() + '\n\n' + error);
    }
  });
}

function onOpen() {
  var menu = SpreadsheetApp.getUi().createMenu('ForkIt testers');
  TESTER_MENU.forEach(function (item) {
    if (item.handler === 'previewReadyEmail') menu.addSeparator();
    menu.addItem(item.label, item.handler);
  });
  menu.addToUi();
}

function showPending() {
  var pending = [];
  eachTester_(testersSheet_(), function (r, row) {
    if (row[COL.status - 1] === STATUS.pending) pending.push(row[0]);
  });
  var html = pending.length
    ? '<p>' + DIRECT_ADD + '</p><p><a href="' + CONFIG.groupMembersUrl + '" target="_blank">Open the ForkIt group members</a></p>' +
      '<textarea style="width:100%;height:100px" readonly onclick="this.select()">' + escape_(pending.join(', ')) + '</textarea>'
    : '<p>No signups are waiting to be added. See the Testers tab for sent emails.</p>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(480).setHeight(260), 'Emails to add');
}

function confirmSelectedMembers() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== CONFIG.testersSheet) return ui.alert('Select rows on the Testers tab first.');
  var targets = [];
  var last = sheet.getLastRow();
  sheet.getActiveRangeList().getRanges().forEach(function (range) {
    var start = Math.max(2, range.getRow());
    var end = Math.min(last, range.getLastRow());
    if (end < start) return;
    sheet.getRange(start, 1, end - start + 1, HEADERS.length).getValues().forEach(function (row, i) {
      if (row[0] && isQueued_(row[COL.status - 1])) targets.push({ r: start + i, email: row[0] });
    });
  });
  if (!targets.length) return ui.alert('Select a pending tester.');
  var ok = ui.alert('Confirm these people appear under Members?',
    targets.map(function (t) { return t.email; }).join('\n') +
    '\n\nCheck actual membership, including accepted invitations. The install email goes out now.', ui.ButtonSet.OK_CANCEL);
  if (ok !== ui.Button.OK) return;
  targets.forEach(function (t) {
    withQueuedRow_(sheet, t.r, t.email, function (row) {
      // A readable group that says "not a member" still overrides the owner.
      var member = null;
      try { member = GroupsApp.getGroupByEmail(CONFIG.groupEmail).hasUser(row[0]); } catch (err) { /* outage */ }
      processMembership_(sheet, t.r, row, member, '', true);
    });
  });
}

function previewReadyEmail() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(readyEmailHtml_()).setWidth(620).setHeight(640), CONFIG.subject);
}

function readyEmailHtml_() {
  var t = HtmlService.createTemplateFromFile('ReadyEmail');
  t.optInUrl = CONFIG.optInUrl;
  t.playStoreUrl = CONFIG.playStoreUrl;
  t.signupUrl = CONFIG.signupUrl;
  return t.evaluate().getContent();
}

function readyEmailText_() {
  return [
    'Your Google account has been added to the ForkIt Android test.',
    'On your Android phone, use the Google account you submitted on the signup form.',
    '',
    '1. Open ' + CONFIG.optInUrl + ' and tap “Become a tester”.',
    '2. Once it says you are a tester, wait about 5 minutes. Google needs a moment to let you in.',
    '3. Open ' + CONFIG.playStoreUrl + ' and tap Install.',
    '4. Open ForkIt, enter your name, and start a room with friends.',
    '',
    'Please keep ForkIt installed and stay opted in to the Google Play test for at least 14 days after you join.',
    'Says "Item not found"? The Play Store can keep showing that from before you were let in. Open Settings > Apps > Google Play Store > Force stop, then open the install link again. Still not found? Check that the Play Store uses the account you signed up with, wait half an hour and try again.',
    'If the opt-in page says the app is not available, wait a few minutes and reopen it. Stuck? Reply here for help.',
    'Have an Android friend who wants to test? Share the signup form: ' + CONFIG.signupUrl,
    '',
    'Swipe right on dinner,', 'ForkIt',
  ].join('\n');
}

function notifyOwner_(emails) {
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'New ForkIt Android tester' + (emails.length === 1 ? ': ' + emails[0] : 's (' + emails.length + ')'),
    name: CONFIG.senderName,
    body: emails.join(', ') + '\n\n' + DIRECT_ADD + '\n' + CONFIG.groupMembersUrl + '\n\n' +
      'The sheet checks every 15 minutes and emails the install link once they are in the group: ' +
      SpreadsheetApp.getActive().getUrl(),
  });
}

function addTester_(raw, when) {
  var email = String(raw || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return locked_(function () {
    var sheet = testersSheet_();
    var exists = false;
    eachTester_(sheet, function (r, row) {
      if (String(row[0]).trim().toLowerCase() === email) exists = true;
    });
    if (exists) return null;
    sheet.appendRow([email, when, STATUS.pending, '', '', '']);
    return email;
  });
}

function eachTester_(sheet, fn) {
  var last = sheet.getLastRow();
  if (last < 2) return;
  var rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  rows.forEach(function (row, i) { if (row[0]) fn(i + 2, row); });
}

function testersSheet_() {
  var ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(CONFIG.testersSheet) || ss.insertSheet(CONFIG.testersSheet);
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
  if (i < 0) throw new Error('The linked response tab needs the verified Email Address column.');
  return i + 1;
}

function escape_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
