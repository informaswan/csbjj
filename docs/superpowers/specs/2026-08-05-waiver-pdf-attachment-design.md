# Waiver PDF Attachment — Design Addendum

Addendum to [2026-08-04-waiver-before-checkout-design.md](2026-08-04-waiver-before-checkout-design.md).
That design deliberately left PDF generation out of scope. After building and testing the
plain-text version end-to-end (real email confirmed delivered via EmailJS template
`template_26ztuq8`), the site owner asked for an actual document copy of the signed waiver for
their records, not just field values in an email body.

## Problem

The waiver email currently lists the submitted field values as plain text/HTML in the message
body. That's not a document the gym can point to as "the signed waiver" — it's a data dump. The
site owner wants a real PDF, laid out like the original paper waiver, attached to the same
email.

## Scope

- Generate a PDF client-side, at submit time, containing: the gym logo, the full legal waiver
  text (identical to what's already shown in the modal), the submitted field values, the typed
  signature, and today's date.
- Attach that PDF to the same EmailJS send that already delivers the notification email — one
  email, one attachment, no separate send.
- Out of scope: server-side PDF generation (no backend exists), storing the PDF anywhere other
  than the email attachment, drawn/canvas signatures (still a typed name, per the original
  design), changing the checkout/payment flow.

## Decisions Already Made (via direct conversation with the site owner)

- PDF style: a **formal copy of the paper waiver** — logo, full legal text, then the person's
  answers — not just a bare data summary.
- EmailJS attachment mechanism: the site owner confirmed their EmailJS plan supports
  attachments and configured the waiver template (`template_26ztuq8`) with a **dynamic**
  attachment parameter named **`waiver_pdf`**.
- The email body itself was trimmed (already done, not part of this addendum's tasks) to a short
  notice — name, plan, phone, email, and a note that the full record is in the attached PDF —
  since duplicating every field in both the body and the PDF would be redundant.

## Architecture

1. **PDF library:** [jsPDF](https://github.com/parallax/jsPDF) (UMD build) loaded via CDN in
   `pricing.html`, the same pattern already used for the EmailJS SDK and reCAPTCHA — no build
   step, no package.json, no node_modules added to the repo.
2. **Logo asset:** `img/csbjjlogo.png` (already added to the repo — converted from the existing
   `img/csbjjlogo.webp`, since jsPDF's `addImage` needs PNG/JPEG data, not WebP).
3. **PDF generation:** a new function in `waiver.js` builds the PDF at submit time (after
   validation and reCAPTCHA pass, before the EmailJS call) from the same form field values
   already being collected, plus the same legal waiver text already present in the modal
   markup. It returns the PDF as a base64 data string via jsPDF's `output('datauristring')`.
4. **Sending mechanism changes:** the submit handler switches from `emailjs.sendForm(form)`
   (which only sends whatever's in the form's own fields) to `emailjs.send(serviceId,
   templateId, templateParams)`, where `templateParams` is built by hand from the form's field
   values (same field names/merge tags as today) plus one extra key, `waiver_pdf`, holding the
   base64 PDF data — matching the dynamic attachment parameter name configured in the EmailJS
   dashboard.
5. **Everything else about the flow is unchanged:** still blocks until the send succeeds, same
   failure/retry UI, same redirect-on-success to the stashed checkout URL, same validation and
   reCAPTCHA gating, same minor/guardian handling.

## PDF Layout

- Header: gym logo image, then centered title text — "ENROLLMENT and WAIVER of LIABILITY AND
  FEE AGREEMENT", "COLORADO SPRINGS BRAZILIAN JIU JITSU" — matching the original paper waiver's
  header.
- Body: the same four paragraphs of legal waiver text already rendered in the modal's
  `.waiver-legal-text` block, reproduced verbatim, word-wrapped to the page width.
- A labeled section below the legal text with the submitted values: Plan, Full Name, Birthdate,
  Parent/Guardian Name (only included if the field was shown/filled — omitted entirely for adult
  signers rather than printed blank), Phone, Address, ZIP, Email, Emergency Contact Name,
  Emergency Contact Phone, Allergies/Medical Conditions.
- Closing line: "Signature (typed name): `<signature>`" and "Date Signed: `<today's date,
  formatted>`" — the paper form's signature+date line, reproduced with the typed signature and
  the current date (there is no separate "date" form field; today's date is computed at
  generation time).
- Multi-page: if content overflows one page (likely, given the full legal text plus all fields),
  jsPDF's normal page-break handling applies — no special pagination logic needed beyond letting
  text wrap and calling `addPage()` when the cursor Y position would run off the page.

## Error Handling

No new error-handling paths. PDF generation is synchronous, local, and has no network
dependency — if it were to throw, it would need to be inside the same `try` block that already
wraps `emailjs.sendForm`/`emailjs.send` and routes into the existing failure-recovery path
(`handleSendFailure`), so a broken PDF build fails the same way a failed send does, rather than
silently sending an email with no attachment.

## Testing

Same approach as the rest of this plan: manual/Playwright-driven verification in a browser
(no test framework exists in this repo). Specifically:
- The generated PDF's base64 data is non-empty and has the correct MIME prefix.
- `emailjs.send` (not `sendForm`) is called, with `templateParams.waiver_pdf` present.
- The existing 5 submit-flow scenarios (empty-form blocked, missing-reCAPTCHA blocked, success
  redirect, failure+retry, synchronous-throw+retry) still pass after switching from `sendForm`
  to `send` — this is the highest-risk regression, since it touches the safety-critical submit
  path already hardened in the base plan.
- One real (non-stubbed) end-to-end send, confirming a real email arrives at csbjj@yahoo.com
  with an actual PDF attachment that opens and displays the expected content.
