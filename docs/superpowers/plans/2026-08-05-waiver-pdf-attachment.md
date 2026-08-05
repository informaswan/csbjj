# Waiver PDF Attachment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a formal PDF copy of the signed waiver client-side and attach it to the same EmailJS email already being sent, so the gym has a real document on file instead of just field values in the email body.

**Architecture:** `waiver.js` gains a `buildWaiverPdf(fields)` function using the jsPDF library (CDN) that lays out the gym logo, the full legal waiver text, the submitted fields, and the typed signature/date into a PDF, returned as a base64 data URI. The submit handler switches from `emailjs.sendForm(form)` to `emailjs.send(serviceId, templateId, templateParams)`, where `templateParams` is built by hand from the form fields plus one extra key (`waiver_pdf`) holding that PDF data, matching the dynamic attachment parameter the site owner already configured in the EmailJS dashboard. Everything else about the submit flow (validation, reCAPTCHA gate, block-until-success, failure/retry, redirect) is unchanged.

**Tech Stack:** Plain HTML/CSS/JS (no build step). [jsPDF](https://github.com/parallax/jsPDF) v2 (UMD build via CDN) for client-side PDF generation.

## Global Constraints

- No backend/server component — static site only.
- jsPDF CDN URL (verified reachable): `https://cdn.jsdelivr.net/npm/jspdf@2/dist/jspdf.umd.min.js`
- Logo asset for embedding: `img/csbjjlogo.png` (already added to the repo, converted from the existing `img/csbjjlogo.webp`).
- EmailJS dynamic attachment parameter name (already configured by the site owner on template `template_26ztuq8`): `waiver_pdf`. The value sent for this key must be a full data URI string: `data:application/pdf;base64,<...>`.
- Reuse the existing EmailJS account/service/template: `emailjs.init('8qMKhFAwBtbkeX9fe')`, `WAIVER_SERVICE_ID = 'service_n8fpsfb'`, `WAIVER_TEMPLATE_ID = 'template_26ztuq8'` — all already set in `waiver.js`, do not change them.
- No test framework exists in this repo — verification is real Playwright headless-browser testing. Chromium is cached; the `playwright` npm package is available via `NODE_PATH=/home/mswan/.npm/_npx/e41f203b7505f1fb/node_modules node your-script.js` (re-locate via `find /home/mswan/.npm/_npx -maxdepth 5 -iname playwright` if that path no longer exists). Test scripts live outside the repo (e.g. the session scratchpad) and are never committed.
- Safety-critical invariant carried over from the base plan and already hand-verified there: there must be exactly one path to `window.location.href = checkoutUrl`, reachable only from a genuinely fulfilled `emailjs.send(...)` promise — never from a catch block, never unconditionally. This task modifies the code around that invariant (swapping `sendForm` for `send`) and must not weaken it.
- Do not regress the 5 existing submit-flow scenarios already covered by prior Playwright verification: empty-form submit blocked, missing-reCAPTCHA blocked, success redirect to the exact checkout URL, failure+retry (rejected promise), and synchronous-throw+retry.

---

### Task 1: Build the waiver PDF generator

**Files:**
- Modify: `pricing.html` (add jsPDF CDN script tag)
- Modify: `waiver.js` (add logo preloading, legal text constant, and `buildWaiverPdf(fields)`)

**Interfaces:**
- Produces: a top-level function `buildWaiverPdf(fields)` in `waiver.js`, where `fields` is a plain object with keys `planName, fullName, birthdate, guardianName, phone, address, zip, email, emergencyName, emergencyPhone, medicalNotes, signature, dateSigned` (all strings; `guardianName` may be `''`). Returns a string: `'data:application/pdf;base64,' + <base64 PDF data>`.
- Produces: a module-level `waiverLogoDataUri` variable (string or `null`) that becomes non-null once the logo image has loaded and been converted, consumed internally by `buildWaiverPdf`.

- [ ] **Step 1: Add the jsPDF CDN include**

In `pricing.html`, add this line immediately after the existing EmailJS SDK `<script>` tag (after line 214, before the `<!-- Waiver modal logic -->` comment on line 215):

```html
    <!-- jsPDF (for generating the waiver PDF attachment) -->
    <script src="https://cdn.jsdelivr.net/npm/jspdf@2/dist/jspdf.umd.min.js"></script>
```

- [ ] **Step 2: Add the legal text constant and logo preloader**

At the very top of `waiver.js`, after the existing `emailjs.init(...)` / `WAIVER_SERVICE_ID` / `WAIVER_TEMPLATE_ID` lines (after the current line 4) and before `document.addEventListener('DOMContentLoaded', ...)`, add:

```js
var WAIVER_LEGAL_PARAGRAPHS = [
  "I hereby submit my application for participation in classes at the Colorado Springs Brazilian Jiu Jitsu academy. I clearly recognize that a risk is involved in participating in this class and related activities. I (and my parent/guardian/caregiver if I am under the age of 18) attest that I am physically fit to participate in the class. In consideration of services to be received as a student, I, the undersigned, hereby release and forever discharge the Colorado Springs Brazilian Jiu Jitsu academy, William (Bill) Hosken, and any other instructors and or participants in the class from any and all actions, liability claims and demands upon or by reason of any damage, loss, injury, or in connection with and in course of receiving this school's training and techniques, from the instructor or instructors, staff, official, or employees of this school or any fellow students in connection there with and within the course of taking training or lessons for the purpose designed in this application. I agree not to open a school or commercial training operation for Brazilian Jiu Jitsu. I will not teach within 15 mile radius of Colorado Springs Brazilian Jiu Jitsu or any other grappling martial arts. I hereby waive all my rights to the claims, actions, and cause of action, demand or suit of loss, injury, damage, or suffering sustained. I promise to pay to CSBJJ my monthly fees and will give a 30 day written notice upon cancelation. I understand not to make any charge backs to CSBJJ and understand that there is a $50 charge back fee and to explain to CSBJJ how you want to cancel your current membership 30 day written notice and an on hold membership agree to pay a $140 cancelation fee.",
  "I consent that any photos, videos, taken in any connection to Colorado Springs Brazilian Jiu Jitsu can be used for publicity promotions with TV, Internet and other similar advertising. I hereby release rights of photo and videos of myself to Colorado Springs Brazilian Jiu Jitsu while at the School Location and any team function, i.e. tournaments.",
  "I have read this release of liability and assumption of risk agreement, fully understand its terms, understand that I have given up substantial rights by signing it, and sign it freely and voluntarily without inducement.",
  "This is to certify that I (and my parent/guardian/caregiver if I am under the age of 18), do consent and agree not only to this release of the Colorado Springs Brazilian Jiu Jitsu academy and all other releases, but also to release and indemnify the releases from any and all liabilities incident to my involvement in these programs for myself, my heirs, my assigns and next of kin."
];

var WAIVER_LOGO_SRC = 'img/csbjjlogo.png';
var waiverLogoDataUri = null;

(function loadWaiverLogo() {
  var img = new Image();
  img.onload = function () {
    var canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    try {
      waiverLogoDataUri = canvas.toDataURL('image/png');
    } catch (err) {
      console.warn('Waiver PDF logo could not be prepared', err);
    }
  };
  img.onerror = function () {
    console.warn('Waiver PDF logo image failed to load from ' + WAIVER_LOGO_SRC);
  };
  img.src = WAIVER_LOGO_SRC;
})();

function buildWaiverPdf(fields) {
  var doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' });
  var pageWidth = doc.internal.pageSize.getWidth();
  var pageHeight = doc.internal.pageSize.getHeight();
  var marginX = 54;
  var contentWidth = pageWidth - marginX * 2;
  var y = 54;

  function ensureRoom(lineHeight) {
    if (y + lineHeight > pageHeight - 54) {
      doc.addPage();
      y = 54;
    }
  }

  if (waiverLogoDataUri) {
    var logoSize = 60;
    doc.addImage(waiverLogoDataUri, 'PNG', (pageWidth - logoSize) / 2, y, logoSize, logoSize);
    y += logoSize + 12;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ENROLLMENT and WAIVER of LIABILITY AND FEE AGREEMENT', pageWidth / 2, y, { align: 'center', maxWidth: contentWidth });
  y += 18;
  doc.text('COLORADO SPRINGS BRAZILIAN JIU JITSU', pageWidth / 2, y, { align: 'center' });
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  WAIVER_LEGAL_PARAGRAPHS.forEach(function (paragraph) {
    var lines = doc.splitTextToSize(paragraph, contentWidth);
    lines.forEach(function (line) {
      ensureRoom(12);
      doc.text(line, marginX, y);
      y += 12;
    });
    y += 8;
  });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  ensureRoom(16);
  doc.text('Submitted Information', marginX, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  var rows = [
    ['Plan', fields.planName],
    ['Full Name', fields.fullName],
    ['Birthdate', fields.birthdate]
  ];
  if (fields.guardianName) {
    rows.push(['Parent/Guardian Name', fields.guardianName]);
  }
  rows.push(
    ['Phone', fields.phone],
    ['Address', fields.address],
    ['ZIP', fields.zip],
    ['Email', fields.email],
    ['Emergency Contact Name', fields.emergencyName],
    ['Emergency Contact Phone', fields.emergencyPhone],
    ['Allergies / Medical Conditions', fields.medicalNotes || 'None provided']
  );

  rows.forEach(function (row) {
    var label = row[0];
    var value = row[1] || '';
    var lines = doc.splitTextToSize(label + ': ' + value, contentWidth);
    lines.forEach(function (line) {
      ensureRoom(14);
      doc.text(line, marginX, y);
      y += 14;
    });
  });

  y += 16;
  ensureRoom(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Signature (typed name): ' + fields.signature, marginX, y);
  y += 16;
  ensureRoom(16);
  doc.text('Date Signed: ' + fields.dateSigned, marginX, y);

  var rawDataUri = doc.output('datauristring');
  var base64Payload = rawDataUri.substring(rawDataUri.indexOf(',') + 1);
  return 'data:application/pdf;base64,' + base64Payload;
}
```

- [ ] **Step 3: Manually verify the PDF builder in isolation**

Serve the repo locally (`python3 -m http.server 8000`), open `http://localhost:8000/pricing.html` with Playwright, wait briefly for the logo to preload, then in `page.evaluate(...)` call:

```js
buildWaiverPdf({
  planName: 'Adult BJJ', fullName: 'Test Person', birthdate: '1990-01-01',
  guardianName: '', phone: '555-000-0000', address: '123 Test St', zip: '80903',
  email: 'test@example.com', emergencyName: 'Emergency Person', emergencyPhone: '555-000-0001',
  medicalNotes: 'None', signature: 'Test Person', dateSigned: '1/1/2026'
})
```

Assert the returned string: starts with `'data:application/pdf;base64,'`, and is longer than 1000 characters (confirms real multi-paragraph PDF content was generated, not an empty/near-empty document). Also confirm no console errors were logged during the call.

- [ ] **Step 4: Commit**

```bash
git add pricing.html waiver.js
git commit -m "Add client-side waiver PDF generator"
```

---

### Task 2: Attach the PDF to the EmailJS send

**Files:**
- Modify: `waiver.js` (submit handler)

**Interfaces:**
- Consumes: `buildWaiverPdf(fields)` from Task 1.
- Produces: the submit handler now calls `emailjs.send(WAIVER_SERVICE_ID, WAIVER_TEMPLATE_ID, templateParams)` instead of `emailjs.sendForm(WAIVER_SERVICE_ID, WAIVER_TEMPLATE_ID, form)`, where `templateParams.waiver_pdf` holds the PDF data URI.

- [ ] **Step 1: Replace the submit handler's send call**

In `waiver.js`, inside the `form.addEventListener('submit', function (e) { ... })` handler, the current body (after the `submitBtn.textContent = 'Sending...'; submitBtn.disabled = true;` lines) reads:

```js
    function handleSendFailure(error) {
      console.error('Waiver email failed to send', error);
      errorMsg.textContent = 'We could not send your waiver. Please check your connection and click the button below to retry.';
      errorMsg.style.display = 'block';
      submitBtn.textContent = 'Retry — Sign & Continue to Payment';
      submitBtn.disabled = false;
      grecaptcha.reset();
    }

    try {
      emailjs.sendForm(WAIVER_SERVICE_ID, WAIVER_TEMPLATE_ID, form).then(
        function () {
          successMsg.textContent = 'Waiver received! Redirecting you to checkout...';
          successMsg.style.display = 'block';
          var checkoutUrl = window.__waiverGetPendingCheckoutUrl();
          window.location.href = checkoutUrl;
        },
        handleSendFailure
      );
    } catch (err) {
      handleSendFailure(err);
    }
```

Replace the `try { ... } catch (err) { handleSendFailure(err); }` block with:

```js
    try {
      var fields = {
        planName: document.getElementById('waiverPlanField').value,
        fullName: document.getElementById('waiverName').value,
        birthdate: document.getElementById('waiverBirthdate').value,
        guardianName: document.getElementById('waiverGuardianName').value,
        phone: document.getElementById('waiverPhone').value,
        address: document.getElementById('waiverAddress').value,
        zip: document.getElementById('waiverZip').value,
        email: document.getElementById('waiverEmail').value,
        emergencyName: document.getElementById('waiverEmergencyName').value,
        emergencyPhone: document.getElementById('waiverEmergencyPhone').value,
        medicalNotes: document.getElementById('waiverMedical').value,
        signature: document.getElementById('waiverSignature').value,
        dateSigned: new Date().toLocaleDateString('en-US')
      };

      var waiverPdfDataUri = buildWaiverPdf(fields);

      var templateParams = {
        plan_name: fields.planName,
        full_name: fields.fullName,
        birthdate: fields.birthdate,
        guardian_name: fields.guardianName,
        phone: fields.phone,
        address: fields.address,
        zip: fields.zip,
        email: fields.email,
        emergency_name: fields.emergencyName,
        emergency_phone: fields.emergencyPhone,
        medical_notes: fields.medicalNotes,
        signature: fields.signature,
        agree: document.getElementById('waiverAgree').checked ? 'Yes' : 'No',
        waiver_pdf: waiverPdfDataUri
      };

      emailjs.send(WAIVER_SERVICE_ID, WAIVER_TEMPLATE_ID, templateParams).then(
        function () {
          successMsg.textContent = 'Waiver received! Redirecting you to checkout...';
          successMsg.style.display = 'block';
          var checkoutUrl = window.__waiverGetPendingCheckoutUrl();
          window.location.href = checkoutUrl;
        },
        handleSendFailure
      );
    } catch (err) {
      handleSendFailure(err);
    }
```

The `handleSendFailure` function itself is unchanged — leave it exactly as-is.

- [ ] **Step 2: Re-verify the 5 existing submit-flow scenarios still pass**

Using the same Playwright approach as the base plan's Task 6 (stub `window.grecaptcha.getResponse`/`.reset`, and now stub `window.emailjs.send` instead of `window.emailjs.sendForm` — same stubbing technique, different function name), re-run all 5 scenarios against the Adult BJJ card:
1. Empty-form submit blocked (no `emailjs.send` call, no navigation).
2. Missing-reCAPTCHA blocked (error shown, no `emailjs.send` call, no navigation).
3. Success path: stub `window.emailjs.send = () => Promise.resolve();`, fill validly, submit → assert navigation to `https://sixpac.app/mystore/csbjj/recurringplan/383`.
4. Failure path: stub `window.emailjs.send = () => Promise.reject(new Error('simulated failure'));` → assert no navigation, error shown, button re-enabled/retext, `grecaptcha.reset()` called.
5. Synchronous-throw path: stub `window.emailjs.send = () => { throw new Error('simulated synchronous failure'); };` → assert the same failure-recovery behavior as scenario 4, no navigation, no uncaught page error.

- [ ] **Step 3: Verify the PDF is actually included in the send call**

Add a 6th scenario: stub `window.emailjs.send` with a function that captures its arguments (e.g. assign them to a variable on `window` for the test script to read afterward, or resolve a promise with them) instead of just resolving immediately, e.g.:

```js
window.__capturedSendCall = null;
window.emailjs.send = function (serviceId, templateId, templateParams) {
  window.__capturedSendCall = { serviceId: serviceId, templateId: templateId, templateParams: templateParams };
  return Promise.resolve();
};
```

Fill the form validly, submit, then read `window.__capturedSendCall` back out via `page.evaluate(() => window.__capturedSendCall)`. Assert: `serviceId === 'service_n8fpsfb'`, `templateId === 'template_26ztuq8'`, `templateParams.waiver_pdf` is a string starting with `'data:application/pdf;base64,'` and longer than 1000 characters, and `templateParams.plan_name === 'Adult BJJ'` (or whichever plan card you opened).

- [ ] **Step 4: Commit**

```bash
git add waiver.js
git commit -m "Attach generated waiver PDF to the EmailJS send"
```

---

### Task 3: Real end-to-end send with attachment

**Files:** none (verification only — no code changes expected unless verification surfaces a bug, in which case fix `waiver.js` and commit that fix here)

- [ ] **Step 1: Send one real (non-stubbed) test submission**

Using the same technique as the base plan's real-send test (stub only `window.grecaptcha.getResponse` to return a fake token — leave `window.emailjs` completely real, making an actual network call), submit the waiver form on the Adult BJJ card with this obviously-fake-but-valid test data so it's unmistakable in the inbox:
- Full Name: `TEST SUBMISSION - PDF Attachment Check`
- Birthdate: `1990-01-01`
- Phone: `555-000-0000`
- Address: `123 Test St`
- ZIP: `80903`
- Email: `test@example.com`
- Emergency Contact Name: `Test Contact`
- Emergency Contact Phone: `555-000-0001`
- Allergies/Medical: `This is a test submission, not a real signup.`
- Signature: `TEST SUBMISSION`

Submit, and confirm the page navigates to `https://sixpac.app/mystore/csbjj/recurringplan/383` (confirms the real `emailjs.send(...)` call — now carrying the PDF — resolved successfully).

- [ ] **Step 2: Report and hand off for the site owner to confirm**

Write a report to the SDD workspace's task report file stating the real send succeeded (or the exact error if it didn't), and note explicitly that a human needs to check csbjj@yahoo.com for this email and confirm: the email arrived, it has a PDF attachment, the PDF opens, and its content (logo, legal text, submitted fields, signature, date) looks correct. This final confirmation cannot be done by an automated agent — it requires checking a real inbox and opening a real file.

- [ ] **Step 3: No commit needed unless a bug was found and fixed in Step 1**
