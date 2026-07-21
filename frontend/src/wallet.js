document.addEventListener('DOMContentLoaded', () => {
  const topupForm = document.querySelector('[data-validate-topup]');
  const amountInput = document.querySelector('#amount');

  document.querySelectorAll('[data-amount]').forEach((button) => {
    button.addEventListener('click', () => {
      if (amountInput) {
        amountInput.value = Number(button.dataset.amount).toFixed(2);
        amountInput.focus();
      }
    });
  });

  if (topupForm) {
    topupForm.addEventListener('submit', (event) => {
      const amount = Number(amountInput.value);
      if (!amount || amount <= 0) {
        event.preventDefault();
        alert('Please enter a top-up amount greater than 0.');
      }
    });
  }

  document.querySelectorAll('[data-confirm-purchase]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const passName = button.dataset.confirmPurchase;
      const confirmed = confirm(`Confirm purchase of ${passName}?`);
      if (!confirmed) {
        event.preventDefault();
      }
    });
  });
});
