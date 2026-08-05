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

  // Exposed for Task 6's submit handler.
  window.__waiverGetPendingCheckoutUrl = function () {
    return pendingCheckoutUrl;
  };
});
