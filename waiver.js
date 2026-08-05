emailjs.init('8qMKhFAwBtbkeX9fe');

var WAIVER_SERVICE_ID = 'service_n8fpsfb';
var WAIVER_TEMPLATE_ID = 'template_waiver_form';

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

  // Exposed for Task 6's submit handler.
  window.__waiverGetPendingCheckoutUrl = function () {
    return pendingCheckoutUrl;
  };
});
