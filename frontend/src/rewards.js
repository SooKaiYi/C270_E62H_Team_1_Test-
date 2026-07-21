// ========== COPY REFERRAL CODE ==========
function copyCode() {
  const code = document.getElementById('referralCode').textContent;
  navigator.clipboard.writeText(code);
  alert('✅ Referral code copied!');
}

// ========== SUBMIT REFERRAL ==========
async function submitReferral() {
  const input = document.getElementById('friendCode');
  const code = input.value.trim().toUpperCase();

  if (!code) {
    alert('⚠️ Please enter a referral code.');
    return;
  }

  try {
    const response = await fetch('/api/rewards/referral/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode: code }),
    });

    const data = await response.json();
    const resultDiv = document.getElementById('referralResult');

    if (data.success) {
      resultDiv.className = 'mt-2 text-success fw-bold';
      resultDiv.innerHTML = `✅ ${data.message}`;
      setTimeout(() => location.reload(), 1500);
    } else {
      resultDiv.className = 'mt-2 text-danger fw-bold';
      resultDiv.innerHTML = `❌ ${data.message}`;
    }
  } catch {
    const resultDiv = document.getElementById('referralResult');
    resultDiv.className = 'mt-2 text-danger fw-bold';
    resultDiv.innerHTML = '❌ Something went wrong. Please try again.';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const input = document.getElementById('friendCode');
  if (input) {
    input.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') submitReferral();
    });
  }
});

// ========== RIDE CALCULATOR ==========
async function calculateRide() {
  const minutesInput = document.getElementById('minutesInput');
  const minutes = parseFloat(minutesInput.value);
  const box = document.getElementById('calculationResultBox');

  if (isNaN(minutes) || minutes <= 0) {
    box.innerHTML = `<div class="alert alert-warning">⚠️ Please enter a valid number of minutes.</div>`;
    return;
  }

  try {
    const response = await fetch('/api/rewards/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes }),
    });
    const data = await response.json();
    const r = data.calculationResult;

    if (data.pointsEarned > 0) {
      box.innerHTML = `
                <div class="alert alert-success">
                    ✅ <strong>${data.rideMinutes} min</strong> → rounded down to <strong>${r.roundedMinutes} min</strong> → <strong>${data.pointsEarned} points</strong>
                    ${r.roundedMinutes >= 60 ? '<br>⭐ Bonus: 15 points minimum for 1h+ rides applied!' : ''}
                    <br><small>This would be added to your balance automatically</small>
                </div>`;
    } else {
      box.innerHTML = `
                <div class="alert alert-warning">
                    ⚠️ <strong>${data.rideMinutes} min</strong> → rounded down to <strong>${r.roundedMinutes} min</strong> → <strong>0 points</strong>
                    <br><small>Rides under 10 minutes earn no points</small>
                </div>`;
    }
  } catch {
    box.innerHTML = `<div class="alert alert-danger">❌ Something went wrong.</div>`;
  }
}

// ========== REDEEM FUNCTION ==========
async function redeem(points) {
  const rewardNames = {
    25: 'Free 30 Minutes',
    50: 'Free 1 Hour',
    100: 'Free 2 Hours',
  };

  if (!confirm(`Redeem ${points} points for ${rewardNames[points]}?`)) return;

  try {
    const response = await fetch('/api/rewards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: points }),
    });

    const data = await response.json();
    const msgDiv = document.getElementById('redeemMessage');

    if (data.success) {
      msgDiv.className = 'mt-3 alert alert-success';
      msgDiv.innerHTML = `✅ ${data.message}`;
      setTimeout(() => location.reload(), 1500);
    } else {
      msgDiv.className = 'mt-3 alert alert-danger';
      msgDiv.innerHTML = `❌ ${data.message}`;
    }
  } catch {
    const msgDiv = document.getElementById('redeemMessage');
    msgDiv.className = 'mt-3 alert alert-danger';
    msgDiv.innerHTML = '❌ Something went wrong.';
  }
}
window.copyCode = copyCode;
window.calculateRide = calculateRide;
window.redeem = redeem;
