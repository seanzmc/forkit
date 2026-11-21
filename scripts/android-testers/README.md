# Android tester sign-ups

The **Get Forkit on Android** Google Form collects a tester's Google account email. Its responses go to the **Forkit Android Testers** sheet, which runs the Apps Script in this folder:

1. **New sign-up** → `onFormSubmit` adds the email to the sheet's **Testers** tab as `Pending` (duplicates are skipped) and emails you a link to the group's Members page.
2. **You add them** to `forkit-testers@googlegroups.com` (Groups → Members → Add members). This step can't be automated: consumer Google Groups have no API for adding members, and Apps Script's `GroupsApp` is read-only.
3. **Every 15 minutes** `checkGroupAndNotify` asks Google Groups whether each `Pending` email is a member yet. Once it is (you added them, they accepted your invite, or they joined on their own), it sends the [ready email](ReadyEmail.html) (opt-in link, Play Store link, Android guide link) and marks the row `Ready email sent`.

The Play closed test (`alpha`) uses that group as its tester list, so being in the group is what lets them install.

## Setup (once)

1. Form → **Settings → Responses → Collect email addresses: Verified**. Testers then have to be signed in to Google, so the address is a real Google account Play can match.
2. Open the **Forkit Android Testers** sheet → **Extensions → Apps Script**.
3. Replace the contents of `Code.gs` with [Code.gs](Code.gs).
4. **+ → HTML**, name it `ReadyEmail` (the editor adds `.html`), and paste [ReadyEmail.html](ReadyEmail.html).
5. Choose `setup` in the function dropdown and **Run**. Approve the permissions (Sheets, sending mail as you, Google Groups, triggers). Google shows "Google hasn't verified this app" for your own scripts: **Advanced → Go to … (unsafe)**. `setup` creates the Testers tab, the form-submit trigger and the 15-minute trigger, and imports any responses already in the sheet. Running it again replaces the triggers rather than adding more.
6. Reload the sheet. A **ForkIt testers** menu appears.
7. Test it: **ForkIt testers → Preview the ready email**, then submit the form yourself with an account already in the group and run **Check group now and send ready emails**. That account gets the email within a few seconds.

## Day to day

- Each sign-up emails you "New ForkIt Android tester: …". Add the address in Groups (paste several at once from **ForkIt testers → Show pending emails**). Nothing else to do: the ready email follows within 15 minutes.
- If Groups only lets you **invite**, the person gets Google's invite and the ready email goes out once they accept.
- If the **Note** column says `Membership check failed`, the script can't read the group's members (it must run as a group owner). Once you've added someone, select their row on the Testers tab and use **Send ready email to selected rows**.
- To resend to someone, set their **Status** back to `Pending`.

## Changing the email

The HTML is `ReadyEmail.html`; the plain-text copy (for mail apps that don't show HTML) is `readyEmailText_()` in `Code.gs`. Keep the two in step, and keep both copies of each file in step: here in the repo and in the sheet's Apps Script project (the script isn't deployed from the repo). Links and the subject line are in `CONFIG` at the top of `Code.gs`.

Gmail lets a personal account send about 100 script emails a day, far more than sign-ups need.
