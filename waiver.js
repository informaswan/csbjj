emailjs.init('8qMKhFAwBtbkeX9fe');

var WAIVER_SERVICE_ID = 'service_n8fpsfb';
var WAIVER_TEMPLATE_ID = 'template_26ztuq8';

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
    var link = e.target.closest('a[data-plan]');
    if (!link) return;
    e.preventDefault();
    openModal(link.getAttribute('data-plan'), link.getAttribute('href'));
  });

  closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

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
  });

  // Exposed for Task 6's submit handler.
  window.__waiverGetPendingCheckoutUrl = function () {
    return pendingCheckoutUrl;
  };
});
