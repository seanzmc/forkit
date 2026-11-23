# Android closed-test signups

Share the [Android signup form](https://docs.google.com/forms/d/e/1FAIpQLSdT20TuugOF8F2Axs1h2ID_9IR5RMJs584phhH9FrKOma3EMA/viewform). It collects the verified Google account used in the Play Store and requires the tester to acknowledge the 14-day commitment. The published Alpha track uses `forkit-testers@googlegroups.com`.

## Add a tester

1. A submission adds a **Pending** row in the linked spreadsheet’s **Testers** tab. You receive an email with the address and the group’s [Members page](https://groups.google.com/g/forkit-testers/members). For a batch, open **ForkIt testers → Show emails to add to the group**.
2. In Google Groups choose **Add members**, enter the addresses, and turn **Directly add members** **on**. Verify the final button says **Add members**. If Google requires an invitation for a particular account, the person must accept it and appear under **Members** before their wait begins.
3. Every 15 minutes the sheet checks membership. The first positive check records **Membership confirmed** and **Send after**. The install email goes out on a check at least **six hours after confirmation**. The menu’s **Check membership and send due emails** uses the same rule. A confirmed removal resets the wait. `CONFIG.delayHours` controls the interval.
4. The email asks the tester to tap **Become a tester**, then open Google Play with the same account and tap **Install**. They should keep ForkIt installed and stay opted in for at least 14 days. Send new friends the signup form. Google Play can still take time to apply changes. Track opted-in testers on the Play Console dashboard.

## If someone is waiting

- **Pending** means membership has yet to be confirmed. Check the address under **Members**, including whether Google sent an invitation.
- **Waiting for Play** shows when the install email becomes eligible. **Ready email sent** records when MailApp accepted the message.
- **Testers!H1** shows the group check result. A failed lookup also writes a note on affected rows and emails the owner once per outage. If automated reads fail, verify the person is on the Members page, select their row, and choose **Confirm selected members by hand**. The clock then sends after the same full wait, even if the lookup remains unavailable. An explicit negative membership result still resets the row.
- A mail quota shortage retries automatically. **Check email delivery** means the send was interrupted or Google could not confirm it. Check with the tester. If they received the email, set the status to **Ready email sent**. If delivery failed, set it to **Pending** to reconfirm membership and schedule a fresh email.

## Install or update the bound Apps Script

Open the form’s response spreadsheet as the group owner. Keep the form’s **Collect email addresses** setting on **Verified** and its 14-day acknowledgement required.

1. Under **Extensions → Apps Script**, sync [Code.gs](Code.gs) and [ReadyEmail.html](ReadyEmail.html) to the bound project. The HTML file is named **ReadyEmail** in the editor. A GitHub merge does not sync the script.
2. Run **setup** in the editor and authorize Google’s Sheets, Groups, mail and trigger permissions. Setup verifies the response header and email template, creates the queue, imports any existing signups, checks group access and installs one spreadsheet submit trigger and one 15-minute clock trigger. Use the same owner account if you rerun it.
3. Reload the spreadsheet. Check **Testers!H1**, both entries in the Apps Script **Triggers** view, and **ForkIt testers → Preview the install email**.
4. For a first-install check, use a consenting Android tester who has never joined. Verify their form response and owner notification, add them directly, and check their recorded send time. Opening the menu check early must leave the row waiting. After the install email arrives, have them opt in with their signup account and verify **Install** appears on their phone. Confirm aggregate enrollment in Play Console.

The [install email preview](install-email-preview.jpg) shows the two Play steps as rendered by the live sheet.

Run the local regression checks with `node --test scripts/android-testers/tests/workflow.cjs`.
