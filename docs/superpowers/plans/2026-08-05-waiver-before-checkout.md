# Waiver-Before-Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate every pricing card's "Start Training" checkout link behind an online liability waiver, emailed to csbjj@yahoo.com via EmailJS, before the visitor reaches the `sixpac.app` payment page.

**Architecture:** A waiver modal lives in `pricing.html` (survives the mobile-view reload that replaces `pricing-section.html`'s inner HTML). A delegated click listener on the persistent `#pricing-section` container intercepts clicks on any pricing card's checkout link, stashes the plan name + checkout URL, and opens the modal instead of navigating. On successful EmailJS send, the browser redirects to the stashed checkout URL; on failure, the visitor stays on the modal and can retry.

**Tech Stack:** Plain HTML/CSS/JS (no build step, no framework). EmailJS browser SDK (`@emailjs/browser@4`, already used in `contactus.html`) for email delivery. Google reCAPTCHA v2 checkbox (already used in `contactus.html`) for spam protection.

## Global Constraints

- No backend/server component — this is a static site (confirmed: no `package.json`, no test runner in the repo).
- Reuse the existing EmailJS account: `emailjs.init('8qMKhFAwBtbkeX9fe')`.
- Reuse the existing EmailJS mail-sending service ID: `service_n8fpsfb`.
- Reuse the existing reCAPTCHA v2 site key: `6Lcm4kksAAAAACXmnGTR9FM9HN-xG-27jg52o0Qw`.
- Waiver recipient email: `csbjj@yahoo.com` (matches the existing footer `mailto:` link).
- Applies to all 6 pricing cards: Kids BJJ, Adult BJJ, Kickboxing, Women's BJJ, Military & First Responders, Couples.
- No test framework exists in this repo — every task's verification step is a manual check in a browser, served locally with `python3 -m http.server 8000` from the repo root.

---

### Task 1: Tag each pricing card's checkout link with its plan name

**Files:**
- Modify: `pricing-section.html:39,65,90,115,140,165`

**Interfaces:**
- Produces: each `<a class="cta-button-link" data-plan="...">` checkout link now carries a `data-plan` attribute that later tasks read to label the waiver and the outgoing email.

- [ ] **Step 1: Add `data-plan` to each of the 6 checkout `<a>` tags**

In `pricing-section.html`, the checkout links currently look like:

```html
<a href="https://sixpac.app/mystore/csbjj/recurringplan/384"><button class="cta-button">Start Training</button></a>
```

Update each of the 6 `<a>` tags to add a `data-plan` attribute (leave everything else — href, button, classes — unchanged):

```html
<!-- Kids BJJ Card (line 39) -->
<a href="https://sixpac.app/mystore/csbjj/recurringplan/384" data-plan="Kids BJJ"><button class="cta-button">Start Training</button></a>

<!-- Adult BJJ Card (line 65) -->
<a href="https://sixpac.app/mystore/csbjj/recurringplan/383" data-plan="Adult BJJ"><button class="cta-button">Start Training</button></a>

<!-- Kickboxing Card (line 90) -->
<a href="https://sixpac.app/mystore/csbjj/recurringplan/387" data-plan="Kickboxing"><button class="cta-button">Start Training</button></a>

<!-- Women's BJJ Card (line 115) -->
<a href="https://sixpac.app/mystore/csbjj/recurringplan/297" data-plan="Women's BJJ"><button class="cta-button">Start Training</button></a>

<!-- Military/First Responders Card (line 140) -->
<a href="https://sixpac.app/mystore/csbjj/recurringplan/385" data-plan="Military &amp; First Responders"><button class="cta-button">Start Training</button></a>

<!-- Couples Card (line 165) -->
<a href="https://sixpac.app/mystore/csbjj/recurringplan/386" data-plan="Couples"><button class="cta-button">Start Training</button></a>
```

- [ ] **Step 2: Manually verify the page still renders unchanged**

Run: `python3 -m http.server 8000` from the repo root, then open `http://localhost:8000/pricing.html` in a browser.
Expected: all 6 pricing cards render exactly as before (no visual change — `data-plan` is not styled), and clicking "Start Training" still navigates directly to the `sixpac.app` checkout URL (waiver interception isn't wired up yet).

- [ ] **Step 3: Commit**

```bash
git add pricing-section.html
git commit -m "Tag pricing card checkout links with data-plan attribute"
```

---

### Task 2: Add the waiver modal markup, stylesheet, and SDK includes

**Files:**
- Create: `waiver.css`
- Modify: `pricing.html:8` (stylesheet link), `pricing.html:113` (insert modal markup before `<div id="footer"></div>`), `pricing.html:118` (script includes)

**Interfaces:**
- Produces: a hidden-by-default `#waiverModal` element with a `#waiver-form` inside it, containing every field task 3 onward will wire up: `#waiverPlanName`, `#waiverPlanField`, `#waiverBirthdate`, `#waiverGuardianGroup`/`#waiverGuardianName`, `#waiverAgreeText`, `#waiverSuccessMessage`, `#waiverErrorMessage`, `#waiverSubmitBtn`, `#waiverCloseBtn`.
- Produces: global `emailjs` (from the EmailJS SDK) and `grecaptcha` (from the reCAPTCHA API) objects available to `waiver.js`.

- [ ] **Step 1: Create `waiver.css`**

```css
.waiver-modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 1000;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  padding: 3rem 1rem;
}

.waiver-modal {
  background: #2a323a;
  color: white;
  max-width: 640px;
  width: 100%;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2.5rem;
  position: relative;
}

.waiver-close {
  position: absolute;
  top: 1rem;
  right: 1.25rem;
  background: none;
  border: none;
  color: #b0b0b0;
  font-size: 1.75rem;
  line-height: 1;
  cursor: pointer;
}

.waiver-close:hover {
  color: white;
}

.waiver-title {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  padding-right: 2rem;
}

.waiver-plan-label {
  color: rgb(128, 255, 54);
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.waiver-legal-text {
  max-height: 260px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #e0e0e0;
}

.waiver-legal-text p {
  margin-bottom: 1rem;
}

.waiver-legal-text p:last-child {
  margin-bottom: 0;
}

.waiver-modal .form-group {
  margin-bottom: 1.25rem;
}

.waiver-checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  color: #e0e0e0;
  font-size: 0.95rem;
  cursor: pointer;
}

.waiver-checkbox-label input[type="checkbox"] {
  margin-top: 0.2rem;
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .waiver-modal {
    padding: 1.75rem;
  }
}
```

- [ ] **Step 2: Link `waiver.css` in `pricing.html`**

In `pricing.html`, add the stylesheet link right after the existing `header-navbar.css` link (after line 8):

```html
    <link rel="stylesheet" href="header-navbar.css" type="text/css"/>
    <link rel="stylesheet" href="waiver.css" type="text/css"/>
```

- [ ] **Step 3: Insert the waiver modal markup**

In `pricing.html`, insert this block immediately before `<div id="footer"></div>` (line 113):

```html
    <div id="waiverModal" class="waiver-modal-overlay">
      <div class="waiver-modal">
        <button type="button" class="waiver-close" id="waiverCloseBtn" aria-label="Close waiver form">&times;</button>
        <h2 class="waiver-title">Enrollment and Waiver of Liability and Fee Agreement</h2>
        <p class="waiver-plan-label">Plan: <span id="waiverPlanName"></span></p>

        <div class="waiver-legal-text">
          <p>I hereby submit my application for participation in classes at the Colorado Springs Brazilian Jiu Jitsu academy. I clearly recognize that a risk is involved in participating in this class and related activities. I (and my parent/guardian/caregiver if I am under the age of 18) attest that I am physically fit to participate in the class. In consideration of services to be received as a student, I, the undersigned, hereby release and forever discharge the Colorado Springs Brazilian Jiu Jitsu academy, William (Bill) Hosken, and any other instructors and or participants in the class from any and all actions, liability claims and demands upon or by reason of any damage, loss, injury, or in connection with and in course of receiving this school's training and techniques, from the instructor or instructors, staff, official, or employees of this school or any fellow students in connection there with and within the course of taking training or lessons for the purpose designed in this application. I agree not to open a school or commercial training operation for Brazilian Jiu Jitsu. I will not teach within 15 mile radius of Colorado Springs Brazilian Jiu Jitsu or any other grappling martial arts. I hereby waive all my rights to the claims, actions, and cause of action, demand or suit of loss, injury, damage, or suffering sustained. I promise to pay to CSBJJ my monthly fees and will give a 30 day written notice upon cancelation. I understand not to make any charge backs to CSBJJ and understand that there is a $50 charge back fee and to explain to CSBJJ how you want to cancel your current membership 30 day written notice and an on hold membership agree to pay a $140 cancelation fee.</p>
          <p>I consent that any photos, videos, taken in any connection to Colorado Springs Brazilian Jiu Jitsu can be used for publicity promotions with TV, Internet and other similar advertising. I hereby release rights of photo and videos of myself to Colorado Springs Brazilian Jiu Jitsu while at the School Location and any team function, i.e. tournaments.</p>
          <p>I have read this release of liability and assumption of risk agreement, fully understand its terms, understand that I have given up substantial rights by signing it, and sign it freely and voluntarily without inducement.</p>
          <p>This is to certify that I (and my parent/guardian/caregiver if I am under the age of 18), do consent and agree not only to this release of the Colorado Springs Brazilian Jiu Jitsu academy and all other releases, but also to release and indemnify the releases from any and all liabilities incident to my involvement in these programs for myself, my heirs, my assigns and next of kin.</p>
        </div>

        <div id="waiverSuccessMessage" class="success-message"></div>
        <div id="waiverErrorMessage" class="error-message"></div>

        <form id="waiver-form">
          <input type="hidden" id="waiverPlanField" name="plan_name" value="">

          <div class="form-group">
            <label for="waiverName">Full Name <span class="required">*</span></label>
            <input type="text" id="waiverName" name="full_name" required>
          </div>

          <div class="form-group">
            <label for="waiverBirthdate">Birthdate <span class="required">*</span></label>
            <input type="date" id="waiverBirthdate" name="birthdate" required>
          </div>

          <div class="form-group" id="waiverGuardianGroup" style="display:none;">
            <label for="waiverGuardianName">Parent/Guardian Name <span class="required">*</span></label>
            <input type="text" id="waiverGuardianName" name="guardian_name">
          </div>

          <div class="form-group">
            <label for="waiverPhone">Phone <span class="required">*</span></label>
            <input type="tel" id="waiverPhone" name="phone" required>
          </div>

          <div class="form-group">
            <label for="waiverAddress">Address <span class="required">*</span></label>
            <input type="text" id="waiverAddress" name="address" required>
          </div>

          <div class="form-group">
            <label for="waiverZip">ZIP <span class="required">*</span></label>
            <input type="text" id="waiverZip" name="zip" required>
          </div>

          <div class="form-group">
            <label for="waiverEmail">Email <span class="required">*</span></label>
            <input type="email" id="waiverEmail" name="email" required>
          </div>

          <div class="form-group">
            <label for="waiverEmergencyName">Emergency Contact Name <span class="required">*</span></label>
            <input type="text" id="waiverEmergencyName" name="emergency_name" required>
          </div>

          <div class="form-group">
            <label for="waiverEmergencyPhone">Emergency Contact Phone <span class="required">*</span></label>
            <input type="tel" id="waiverEmergencyPhone" name="emergency_phone" required>
          </div>

          <div class="form-group">
            <label for="waiverMedical">Allergies / Medical Conditions</label>
            <textarea id="waiverMedical" name="medical_notes" rows="3" placeholder="Optional — all information is confidential"></textarea>
          </div>

          <div class="form-group">
            <label for="waiverSignature">Signature (type your full legal name) <span class="required">*</span></label>
            <input type="text" id="waiverSignature" name="signature" required>
          </div>

          <div class="form-group waiver-agree-group">
            <label class="waiver-checkbox-label">
              <input type="checkbox" id="waiverAgree" name="agree" required>
              <span id="waiverAgreeText">I have read and agree to the waiver terms above.</span>
            </label>
          </div>

          <div class="recaptcha-container">
            <div class="g-recaptcha" data-sitekey="6Lcm4kksAAAAACXmnGTR9FM9HN-xG-27jg52o0Qw"></div>
          </div>

          <button type="submit" class="cta-button" id="waiverSubmitBtn">Sign &amp; Continue to Payment</button>
        </form>
      </div>
    </div>
```

- [ ] **Step 4: Add the reCAPTCHA, EmailJS, and `waiver.js` script includes**

In `pricing.html`, add these three lines right after the existing `<script src="pricing.js" defer></script>` / `<script src="navbar.js"></script>` includes (after line 118):

```html
    <!-- Include the navbar JavaScript -->
    <script src="navbar.js"></script>
    <!-- reCAPTCHA Script -->
    <script src="https://www.google.com/recaptcha/api.js" async defer></script>
    <!-- EmailJS SDK -->
    <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
    <!-- Waiver modal logic -->
    <script src="waiver.js"></script>
```

- [ ] **Step 5: Manually verify the modal markup renders**

Run: `python3 -m http.server 8000` from the repo root, open `http://localhost:8000/pricing.html`, open the browser devtools console, and run:

```js
document.getElementById('waiverModal').style.display = 'flex';
```

Expected: the modal appears centered over a dark overlay, styled consistently with the rest of the dark-themed site (matches the look of `contactus.html`'s form card), showing the waiver legal text, all form fields, the reCAPTCHA widget, and the "Sign & Continue to Payment" button. The X close button is visible top-right. No console errors (an empty `waiver.js` file — created in Task 3 — is fine at this point; if `waiver.js` doesn't exist yet, create an empty `waiver.js` file now so the `<script>` tag doesn't 404).

- [ ] **Step 6: Commit**

```bash
git add pricing.html waiver.css waiver.js
git commit -m "Add waiver modal markup, stylesheet, and SDK includes to pricing.html"
```

---

### Task 3: Open/close the waiver modal from pricing card clicks

**Files:**
- Modify: `waiver.js` (created empty in Task 2)

**Interfaces:**
- Consumes: `#pricing-section` container (from `pricing.html:110`), `a[data-plan]` checkout links (from Task 1), `#waiverModal`, `#waiverPlanName`, `#waiverPlanField`, `#waiverCloseBtn` (from Task 2).
- Produces: a module-level `pendingCheckoutUrl` variable that Task 6's submit handler reads to know where to redirect on success.

- [ ] **Step 1: Write the modal open/close logic**

Replace the contents of `waiver.js` with:

```js
document.addEventListener('DOMContentLoaded', function () {
  var pricingSection = document.getElementById('pricing-section');
  var modal = document.getElementById('waiverModal');
  var planNameEl = document.getElementById('waiverPlanName');
  var planField = document.getElementById('waiverPlanField');
  var closeBtn = document.getElementById('waiverCloseBtn');

  if (!pricingSection || !modal) return;

  var pendingCheckoutUrl = null;

  function openModal(plan, checkoutUrl) {
    pendingCheckoutUrl = checkoutUrl;
    planNameEl.textContent = plan;
    planField.value = plan;
    document.getElementById('waiverSuccessMessage').style.display = 'none';
    document.getElementById('waiverErrorMessage').style.display = 'none';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  pricingSection.addEventListener('click', function (e) {
    var button = e.target.closest('.cta-button');
    if (!button) return;
    var link = button.closest('a[data-plan]');
    if (!link) return;
    e.preventDefault();
    openModal(link.getAttribute('data-plan'), link.getAttribute('href'));
  });

  closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  // Exposed for Task 6's submit handler.
  window.__waiverGetPendingCheckoutUrl = function () {
    return pendingCheckoutUrl;
  };
});
```

- [ ] **Step 2: Manually verify click-to-open and close behavior**

Run: `python3 -m http.server 8000`, open `http://localhost:8000/pricing.html`.

Expected:
- Clicking "Start Training" on each of the 6 cards opens the modal, the browser does **not** navigate away, and `Plan:` shows the correct plan name for that card (Kids BJJ, Adult BJJ, Kickboxing, Women's BJJ, Military & First Responders, Couples).
- Clicking the `×` button closes the modal.
- Clicking the dark overlay outside the modal box closes the modal.
- Clicking inside the modal box does **not** close it.
- This works identically after resizing the browser below 1100px width (mobile view, which reloads `pricing-section.html`'s inner HTML) — click delegation on `#pricing-section` survives that reload.

- [ ] **Step 3: Commit**

```bash
git add waiver.js
git commit -m "Wire up waiver modal open/close from pricing card clicks"
```

---

### Task 4: Add parent/guardian field for under-18 signers

**Files:**
- Modify: `waiver.js`

**Interfaces:**
- Consumes: `#waiverBirthdate`, `#waiverGuardianGroup`, `#waiverGuardianName`, `#waiverAgreeText` (from Task 2).

- [ ] **Step 1: Add age detection and conditional field logic**

Inside the same `DOMContentLoaded` handler in `waiver.js`, after the `modal.addEventListener('click', ...)` block from Task 3, add:

```js
  var birthdateInput = document.getElementById('waiverBirthdate');
  var guardianGroup = document.getElementById('waiverGuardianGroup');
  var guardianInput = document.getElementById('waiverGuardianName');
  var agreeText = document.getElementById('waiverAgreeText');

  var MINOR_AGREE_TEXT = 'I am the parent/guardian of the minor named above, and I have read and agree to the waiver terms above.';
  var ADULT_AGREE_TEXT = 'I have read and agree to the waiver terms above.';

  function isMinor(birthdateValue) {
    var birthdate = new Date(birthdateValue + 'T00:00:00');
    var today = new Date();
    var age = today.getFullYear() - birthdate.getFullYear();
    var monthDiff = today.getMonth() - birthdate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
      age--;
    }
    return age < 18;
  }

  birthdateInput.addEventListener('blur', function () {
    if (!birthdateInput.value) return;
    if (isMinor(birthdateInput.value)) {
      guardianGroup.style.display = 'block';
      guardianInput.required = true;
      agreeText.textContent = MINOR_AGREE_TEXT;
    } else {
      guardianGroup.style.display = 'none';
      guardianInput.required = false;
      agreeText.textContent = ADULT_AGREE_TEXT;
    }
  });
```

- [ ] **Step 2: Manually verify minor detection**

Run: `python3 -m http.server 8000`, open `http://localhost:8000/pricing.html`, open the waiver modal on any card.

Expected:
- Enter a birthdate less than 18 years ago (e.g. today's date), then click/tab out of the field (blur). The "Parent/Guardian Name" field appears, and the checkbox label changes to the parent/guardian wording.
- Clear the field and enter a birthdate more than 18 years ago, then blur. The "Parent/Guardian Name" field hides again, and the checkbox label reverts to the adult wording.
- Try submitting with an under-18 birthdate and an empty guardian name — the browser's native validation should block submission on the guardian field (confirms `required` toggled correctly).

- [ ] **Step 3: Commit**

```bash
git add waiver.js
git commit -m "Show parent/guardian field for under-18 waiver signers"
```

---

### Task 5: Create the EmailJS waiver template

This is a manual setup step in the EmailJS web dashboard (https://dashboard.emailjs.com) — there is no code change in this task, but it's required before Task 6's submission code will actually deliver email.

**Files:** none (external configuration)

- [ ] **Step 1: Create a new email template**

In the EmailJS dashboard, under the account that owns service `service_n8fpsfb` (the same account used by `contactus.html`, initialized with public key `8qMKhFAwBtbkeX9fe`):

1. Go to **Email Templates** → **Create New Template**.
2. Set the template ID to exactly: `template_waiver_form`
3. Set **To Email** to: `csbjj@yahoo.com`
4. Set **Subject** to: `New Waiver Signed — {{plan_name}} — {{full_name}}`
5. Set the template **Content** (body) to:

```
A new waiver has been signed online.

Plan: {{plan_name}}
Full Name: {{full_name}}
Birthdate: {{birthdate}}
Parent/Guardian Name: {{guardian_name}}
Phone: {{phone}}
Address: {{address}}
ZIP: {{zip}}
Email: {{email}}
Emergency Contact Name: {{emergency_name}}
Emergency Contact Phone: {{emergency_phone}}
Allergies / Medical Conditions: {{medical_notes}}

Signature (typed name): {{signature}}
Agreed to terms: {{agree}}
```

6. Save the template.

- [ ] **Step 2: Verify the template ID**

In the dashboard's template list, confirm the new template's ID reads exactly `template_waiver_form` — Task 6's code references this ID literally and a mismatch will cause every submission to fail with an EmailJS "template not found" error.

- [ ] **Step 3: No commit needed**

This task changes no files in the repository (EmailJS dashboard configuration only).

---

### Task 6: Submit the waiver via EmailJS and redirect to checkout

**Files:**
- Modify: `waiver.js`

**Interfaces:**
- Consumes: `#waiver-form`, `#waiverSubmitBtn`, `#waiverSuccessMessage`, `#waiverErrorMessage` (from Task 2), `window.__waiverGetPendingCheckoutUrl()` (from Task 3), EmailJS template `template_waiver_form` (from Task 5).

- [ ] **Step 1: Initialize EmailJS and wire up the submit handler**

At the very top of `waiver.js`, before the `document.addEventListener('DOMContentLoaded', ...)` line, add:

```js
emailjs.init('8qMKhFAwBtbkeX9fe');

var WAIVER_SERVICE_ID = 'service_n8fpsfb';
var WAIVER_TEMPLATE_ID = 'template_waiver_form';
```

Inside the `DOMContentLoaded` handler, after the age-detection block from Task 4, add:

```js
  var form = document.getElementById('waiver-form');
  var submitBtn = document.getElementById('waiverSubmitBtn');
  var successMsg = document.getElementById('waiverSuccessMessage');
  var errorMsg = document.getElementById('waiverErrorMessage');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var recaptchaResponse = grecaptcha.getResponse();
    if (recaptchaResponse.length === 0) {
      errorMsg.textContent = 'Please complete the reCAPTCHA verification.';
      errorMsg.style.display = 'block';
      return;
    }

    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    emailjs.sendForm(WAIVER_SERVICE_ID, WAIVER_TEMPLATE_ID, form).then(
      function () {
        successMsg.textContent = 'Waiver received! Redirecting you to checkout...';
        successMsg.style.display = 'block';
        var checkoutUrl = window.__waiverGetPendingCheckoutUrl();
        window.location.href = checkoutUrl;
      },
      function (error) {
        console.error('Waiver email failed to send', error);
        errorMsg.textContent = 'We could not send your waiver. Please check your connection and click the button below to retry.';
        errorMsg.style.display = 'block';
        submitBtn.textContent = 'Retry — Sign & Continue to Payment';
        submitBtn.disabled = false;
        grecaptcha.reset();
      }
    );
  });
```

- [ ] **Step 2: Manually verify successful submission**

Run: `python3 -m http.server 8000`, open `http://localhost:8000/pricing.html`, open the waiver modal on the Adult BJJ card, fill in all required fields, type a signature, check the agreement box, complete the reCAPTCHA, and click "Sign & Continue to Payment".

Expected:
- Button text changes to "Sending...", then the browser redirects to `https://sixpac.app/mystore/csbjj/recurringplan/383` (the Adult BJJ checkout URL).
- An email arrives at csbjj@yahoo.com (or whatever inbox the EmailJS service is connected to) containing all the submitted field values, matching the template from Task 5.

- [ ] **Step 3: Manually verify failure handling**

Temporarily change `WAIVER_TEMPLATE_ID` in `waiver.js` to an invalid value (e.g. `'template_does_not_exist'`), refresh the page, and submit the form again with valid data and a completed reCAPTCHA.

Expected:
- No redirect occurs. An error message appears: "We could not send your waiver...". The submit button re-enables and reads "Retry — Sign & Continue to Payment". The reCAPTCHA resets (must be re-completed to retry).

Revert `WAIVER_TEMPLATE_ID` back to `'template_waiver_form'` afterward.

- [ ] **Step 4: Commit**

```bash
git add waiver.js
git commit -m "Send waiver via EmailJS and redirect to checkout on success"
```

---

### Task 7: Full end-to-end verification across all 6 pricing cards

**Files:** none (verification only)

- [ ] **Step 1: Verify each plan end-to-end**

Run: `python3 -m http.server 8000`, open `http://localhost:8000/pricing.html`. For each of the 6 cards (Kids BJJ, Adult BJJ, Kickboxing, Women's BJJ, Military & First Responders, Couples):

1. Click "Start Training".
2. Confirm the modal's "Plan:" label matches the card.
3. Fill out the form with valid data (use an under-18 birthdate for at least one card, to confirm the guardian field, and an 18+ birthdate for the rest), sign, check the agreement box, complete the reCAPTCHA.
4. Submit and confirm redirect to that card's exact `sixpac.app` checkout URL (see Task 1's step 1 for the 6 URLs).
5. Confirm the corresponding waiver email arrived with the correct plan name and field values.

- [ ] **Step 2: Verify required-field blocking**

Open the modal on any card and click "Sign & Continue to Payment" with the form completely empty.
Expected: the browser blocks submission and highlights the first missing required field (native HTML5 validation) — no EmailJS call is made, no redirect occurs.

- [ ] **Step 3: Verify mobile view**

Resize the browser window to under 1100px width (or use devtools device emulation) so `pricing.html` switches to the stacked mobile layout (which reloads `pricing-section.html`'s inner HTML). Confirm clicking "Start Training" on any card still opens the waiver modal correctly.

- [ ] **Step 4: No commit needed (verification only)**

If any check above fails, fix the underlying task's code and re-commit there rather than adding a new commit here.

