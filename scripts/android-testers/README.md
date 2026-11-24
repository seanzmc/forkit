# Android closed-test signups

Share the [Android signup form](https://docs.google.com/forms/d/e/1FAIpQLSdT20TuugOF8F2Axs1h2ID_9IR5RMJs584phhH9FrKOma3EMA/viewform). It collects the verified Google account used in the Play Store and requires the tester to acknowledge the 14-day commitment. The published Alpha track uses `forkit-testers@googlegroups.com`.

## Add a tester

1. A submission adds a **Pending** row in the linked spreadsheet’s **Testers** tab. You receive an email with the address and the group’s [Members page](https://groups.google.com/g/forkit-testers/members). For a batch, open **ForkIt testers → Show emails to add to the group**.
2. In Google Groups choose **Add members**, enter the addresses, and turn **Directly add members** **on**. Verify the final button says **Add members**. If Google requires an invitation for a particular account, the person must accept it and appear under **Members** before the email goes out.
3. Every 15 minutes the sheet checks membership. The first positive check records **Membership confirmed** and sends the install email. The menu’s **Check membership and send emails** does the same right away.
4. The email asks the tester to tap **Become a tester**, wait about five minutes, then open Google Play with the same account and tap **Install**. It also covers **Item not found**: testers see that after opting in, and force-stopping the Play Store or waiting clears it. They should keep ForkIt installed and stay opted in for at least 14 days. Send new friends the signup form. Google Play can still take time to apply changes. Track opted-in testers on the Play Console dashboard.

For a manual signup, collect the Play account and the same 14-day commitment. Search **Testers** column A before entering the address. Choose **Pending** in column C if the person needs the link, or **Already testing** for a known install. A blank status pauses the row. Repeated addresses in A turn red, including differences in capitalization and surrounding spaces. Keep the original row and clear the status on any extra active copy to prevent a second email. The **Instructions** tab also explains each **ForkIt testers** menu command.

## If someone is waiting

- **Pending** means membership has yet to be confirmed. Check the address under **Members**, including whether Google sent an invitation.
- **Ready email sent** records when MailApp accepted the message.
- **Testers!H1** shows the group check result. A failed lookup also writes a note on affected rows and emails the owner once per outage. If automated reads fail, verify the person is on the Members page, select their row, and choose **Confirm selected members by hand**. The email goes out at once. If the group can be read and says the person is not a member, nothing is sent.
- A mail quota shortage retries automatically. **Check email delivery** means the send was interrupted or Google could not confirm it. Check with the tester. If they received the email, set the status to **Ready email sent**. If delivery failed, set it to **Pending** to reconfirm membership and send a fresh email.

## Install or update the bound Apps Script

Open the form’s response spreadsheet as the group owner. Keep the form’s **Collect email addresses** setting on **Verified** and its 14-day acknowledgement required.

1. Under **Extensions → Apps Script**, sync [Code.gs](Code.gs) and [ReadyEmail.html](ReadyEmail.html) to the bound project. The HTML file is named **ReadyEmail** in the editor. A GitHub merge does not sync the script.
2. Run **setup** in the editor and authorize Google’s Sheets, Groups, mail and trigger permissions. Setup verifies the response header and email template, creates the queue, imports any existing signups, checks group access and installs one spreadsheet submit trigger and one 15-minute clock trigger. Use the same owner account if you rerun it.
3. Reload the spreadsheet. Check **Testers!H1**, both entries in the Apps Script **Triggers** view, and **ForkIt testers → Preview the install email**.
4. For a first-install check, use a consenting Android tester who has never joined. Verify their form response and owner notification, add them directly, and check that the email arrives within about 15 minutes. Then have them opt in with their signup account and verify **Install** appears on their phone. Confirm aggregate enrollment in Play Console.

On an already installed workbook, run **refreshTesterTools** after syncing the script to apply the duplicate rule, status dropdown and instructions. This function can be rerun without importing responses, sending mail or reinstalling triggers. It also clears the old **Send after** times from column G. The generated block is **Instructions!A1:B13**; use row 14 onward for personal notes.

Run the local regression checks with `node --test scripts/android-testers/tests/workflow.cjs`.
