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

  // Exposed for Task 6's submit handler.
  window.__waiverGetPendingCheckoutUrl = function () {
    return pendingCheckoutUrl;
  };
});
