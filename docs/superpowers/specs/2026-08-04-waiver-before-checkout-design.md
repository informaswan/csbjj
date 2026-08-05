# Waiver-Before-Checkout Design

## Problem

Today, clicking "Start Training" on any pricing card (`pricing-section.html`) sends the visitor
straight to an external `sixpac.app` recurring-payment checkout link. There is no digital
liability waiver step first — waivers are only handled on paper, in person.

We want visitors to complete and sign the gym's liability waiver online, with a copy emailed to
`csbjj@yahoo.com`, before they're allowed to reach the checkout page.

The reference waiver content/fields come from `waiver15miles 2.pages` (Enrollment and Waiver of
Liability and Fee Agreement, Colorado Springs Brazilian Jiu Jitsu).

## Scope

- Applies to **all 6 pricing cards**: Kids BJJ, Adult BJJ, Kickboxing, Women's BJJ,
  Military & First Responders, Couples.
- Static site, no backend — reuse the EmailJS pattern already working in `contactus.html`
  (no new infrastructure).
- Out of scope: storing submissions in a database/spreadsheet, PDF generation, drawn/canvas
  signatures, changing the actual payment/checkout flow itself.

## Architecture & Data Flow

1. `pricing.html` gains a waiver modal (markup lives directly in `pricing.html`, **not**
   `pricing-section.html`), so it survives the mobile-view reload that replaces
   `pricing-section.html`'s inner HTML.
2. A new `waiver.js` attaches **one delegated click listener** to the `#pricing-section`
   container div in `pricing.html`. That container element itself is never replaced (only its
   `innerHTML` is, on mobile reload / carousel re-render), so delegation keeps working
   regardless of view mode.
3. Each card's checkout link in `pricing-section.html` gets a `data-plan="<Plan Name>"`
   attribute (e.g. `data-plan="Adult BJJ"`) so the waiver/email knows which plan was selected.
4. Click flow:
   - Listener catches clicks on `a.cta-button` links (or their child button) within
     `#pricing-section`.
   - `preventDefault()` — stop navigation.
   - Read `data-plan` and `href` (checkout URL) from the clicked link; stash both on the modal
     instance.
   - Open the waiver modal.
5. Submit flow:
   - Validate required fields (see below).
   - Send via EmailJS (`emailjs.sendForm` or `emailjs.send`) to a **new** waiver-specific
     template.
   - **On success**: `window.location.href = <stashed checkout URL>` (same-tab redirect,
     matching current click-through behavior).
   - **On failure**: show an inline error message and a "Retry" button; modal stays open,
     no redirect. The visitor cannot reach checkout without a successfully-sent waiver email.

## Form Fields

Legal waiver text (from the `.pages` source) is shown at the top of the modal, scrollable.
Below it:

- Name (text, required)
- Birthdate (date, required)
- Phone (tel, required)
- Address (text, required)
- ZIP (text, required)
- Email (email, required)
- Emergency contact name (text, required)
- Emergency contact phone (tel, required)
- Allergies / medical conditions (textarea, optional)
- Signature — typed full legal name (text, required)
- Checkbox: "I have read and agree to the waiver terms above" (required)

**Minor handling**: on blur of the Birthdate field, compute age. If under 18, reveal a required
"Parent/Guardian Name" field, and the agreement checkbox label switches to reflect a
parent/guardian is consenting on the minor's behalf. If 18+, that field stays hidden and is not
required.

## Spam Protection

Add the same reCAPTCHA v2 checkbox widget already used in `contactus.html`, reusing its existing
site key (`6Lcm4kksAAAAACXmnGTR9FM9HN-xG-27jg52o0Qw`). Submission is blocked client-side until
the reCAPTCHA is completed, same pattern as the contact form.

## EmailJS Integration

- Reuses the existing EmailJS account/init (`emailjs.init('8qMKhFAwBtbkeX9fe')`,
  same as `contactus.html`).
- Requires a **new EmailJS template** (separate from the contact form's
  `template_33bk7xo`), since the field set differs. Template creation happens in the EmailJS
  web dashboard — implementation will hand over the exact variable list and a recommended
  "To Email: csbjj@yahoo.com" setting for the user to paste in.
- Service ID: reuse `service_n8fpsfb` if it's a generic mail-sending connection (confirmed
  during implementation); otherwise create a matching one.

## Error Handling

- Required-field validation happens client-side before EmailJS is called (native HTML5
  `required` plus the conditional parent/guardian and reCAPTCHA checks).
- EmailJS send failure → inline error text + Retry button, modal remains open, no redirect.
- No silent failures: the visitor always sees either a success (immediate redirect) or an
  explicit error state.

## Testing

Manual verification in a browser (this is a static site with no test suite):
- Each of the 6 cards opens the modal with the correct plan name and checkout URL stashed.
- Modal works after a mobile-width reload of `pricing-section.html` (delegation survives).
- Under-18 birthdate reveals the parent/guardian field; 18+ does not.
- Submit with missing required fields is blocked with visible validation feedback.
- Successful submit redirects to the correct `sixpac.app` URL for that plan.
- Simulated EmailJS failure (e.g. invalid template ID temporarily) shows the error/Retry state
  and does not redirect.
