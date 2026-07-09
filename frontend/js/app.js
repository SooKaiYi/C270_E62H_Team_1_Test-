// ========== CONFIG ==========
// Point this at wherever the backend server (server.js) is running.
const API_BASE = 'http://localhost:3001';

let state = {
    user: null,
    transactions: [],
    progress: 0,
    nextReward: 50
};

// ========== INITIAL LOAD ==========
async function loadDashboard() {
    try {
        const res = await fetch(`${API_BASE}/api/dashboard`);
        const data = await res.json();
        state.user = data.user;
        state.transactions = data.transactions;
        state.progress = data.progress;
        state.nextReward = data.nextReward;
        renderAll();
    } catch (err) {
        console.error('Failed to load dashboard from backend:', err);
        document.getElementById('mainContent').innerHTML =
            '<p style="padding:40px;text-align:center;color:#9b2c2c;">⚠️ Could not reach the backend API. Make sure the backend server is running at ' + API_BASE + '.</p>';
    }
}

function renderAll() {
    const u = state.user;

    document.getElementById('menuUserName').textContent = u.name;
    document.getElementById('menuUserPoints').textContent = u.points;
    document.getElementById('welcomeName').textContent = u.name;

    document.getElementById('pointsDisplay').textContent = u.points;
    document.getElementById('progressFill').style.width = state.progress + '%';
    document.getElementById('progressText').textContent = `${u.points} / ${state.nextReward} pts to Free 1 Hour`;

    document.getElementById('statFreeHours').textContent = u.freeHours;
    document.getElementById('statRides').textContent = u.rides;
    document.getElementById('statTotalTime').textContent =
        `${Math.floor(u.totalMinutes / 60)}h ${u.totalMinutes % 60}m`;

    document.getElementById('referralCode').textContent = u.referralCode;

    if (u.referredBy) {
        document.getElementById('referredByNotice').style.display = 'block';
        document.getElementById('referredByName').textContent = u.referredBy;
        document.getElementById('referralInputWrap').style.display = 'none';
    } else {
        document.getElementById('referredByNotice').style.display = 'none';
        document.getElementById('referralInputWrap').style.display = 'block';
    }

    // Profile page
    document.getElementById('profileName').textContent = u.name;
    document.getElementById('profilePoints').textContent = u.points;
    document.getElementById('profileEmail').textContent = u.email;
    document.getElementById('profilePhone').textContent = u.phone || '+65 9123 4567';
    document.getElementById('profileLocation').textContent = u.location || 'Singapore';
    document.getElementById('profileMemberSince').textContent = u.memberSince || 'January 2026';
    document.getElementById('profileRides').textContent = `${u.rides} rides`;
    document.getElementById('profileTotalTime').textContent =
        `${Math.floor(u.totalMinutes / 60)}h ${u.totalMinutes % 60}m`;
    document.getElementById('profileFreeHours').textContent = `${u.freeHours} hour(s)`;
    document.getElementById('profileReferralCode').textContent = u.referralCode;
    document.getElementById('profileFriendsReferred').textContent = `${u.friendsReferred || 0} friends`;
    document.getElementById('profileReferredBy').textContent = u.referredBy || 'None';

    renderTransactions();
}

function renderTransactions() {
    const list = document.getElementById('transactionList');
    list.innerHTML = state.transactions.map(txn => `
        <div class="transaction ${txn.type}">
            <span class="icon">${txn.type === 'earned' ? '➕' : '➖'}</span>
            <span class="desc">${txn.desc}</span>
            <span class="date">${txn.date}</span>
            <span class="points ${txn.type === 'earned' ? 'green' : 'red'}">
                ${txn.type === 'earned' ? '+' : '-'}${txn.points}
            </span>
        </div>
    `).join('');
}

// ========== PROFILE PAGE FUNCTIONS ==========
function openProfilePage() {
    closeMenu();
    document.getElementById('profilePage').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
    document.body.style.overflow = 'hidden';
}

function closeProfilePage() {
    document.getElementById('profilePage').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    document.body.style.overflow = '';
}

// ========== SLIDE MENU FUNCTIONS ==========
function toggleMenu() {
    const menu = document.getElementById('slideMenu');
    const overlay = document.getElementById('menuOverlay');
    menu.classList.toggle('open');
    overlay.classList.toggle('show');
    document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
}

function closeMenu() {
    const menu = document.getElementById('slideMenu');
    const overlay = document.getElementById('menuOverlay');
    menu.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
}

function openRefer() {
    closeMenu();
    const referSection = document.getElementById('referSection');
    if (referSection.style.display === 'none') {
        referSection.style.display = 'block';
        referSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        referSection.style.display = 'none';
    }
}

function closeRefer() {
    document.getElementById('referSection').style.display = 'none';
}

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
        const response = await fetch(`${API_BASE}/api/referral/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referralCode: code })
        });

        const data = await response.json();
        const resultDiv = document.getElementById('referralResult');

        if (data.success) {
            resultDiv.className = 'referral-result success';
            resultDiv.innerHTML = `✅ ${data.message}`;
            if (typeof data.newPoints === 'number') {
                document.getElementById('pointsDisplay').textContent = data.newPoints;
            }
            setTimeout(() => loadDashboard(), 1500);
        } else {
            resultDiv.className = 'referral-result error';
            resultDiv.innerHTML = `❌ ${data.message}`;
        }
    } catch (error) {
        const resultDiv = document.getElementById('referralResult');
        resultDiv.className = 'referral-result error';
        resultDiv.innerHTML = '❌ Something went wrong. Please try again.';
    }
}

// Enter key support
document.addEventListener('DOMContentLoaded', function () {
    const input = document.getElementById('friendCode');
    if (input) {
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') submitReferral();
        });
    }
    loadDashboard();
});

// ========== RIDE CALCULATOR ==========
async function calculateRide() {
    const minutesInput = document.getElementById('minutesInput');
    const minutes = parseFloat(minutesInput.value);
    const box = document.getElementById('calculationResultBox');

    if (isNaN(minutes) || minutes <= 0) {
        box.innerHTML = `<div class="result warning">⚠️ Please enter a valid number of minutes.</div>`;
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minutes })
        });
        const data = await response.json();
        const r = data.calculationResult;

        if (data.pointsEarned > 0) {
            box.innerHTML = `
                <div class="result success">
                    ✅ <strong>${data.rideMinutes} min</strong> → rounded down to <strong>${r.roundedMinutes} min</strong> → <strong>${data.pointsEarned} points</strong>
                    ${r.roundedMinutes >= 60 ? '<br>⭐ Bonus: 15 points minimum for 1h+ rides applied!' : ''}
                    <br><small>This would be added to your balance automatically</small>
                </div>`;
        } else {
            box.innerHTML = `
                <div class="result warning">
                    ⚠️ <strong>${data.rideMinutes} min</strong> → rounded down to <strong>${r.roundedMinutes} min</strong> → <strong>0 points</strong>
                    <br><small>Rides under 10 minutes earn no points</small>
                </div>`;
        }
    } catch (error) {
        box.innerHTML = `<div class="result warning">❌ Something went wrong.</div>`;
    }
}

// ========== REDEEM FUNCTION ==========
async function redeem(points) {
    const rewardNames = {
        25: 'Free 30 Minutes',
        50: 'Free 1 Hour',
        100: 'Free 2 Hours'
    };

    if (!confirm(`Redeem ${points} points for ${rewardNames[points]}?`)) return;

    try {
        const response = await fetch(`${API_BASE}/api/redeem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: points })
        });

        const data = await response.json();
        const msgDiv = document.getElementById('redeemMessage');

        if (data.success) {
            msgDiv.className = 'redeem-message success';
            msgDiv.innerHTML = `✅ ${data.message}`;
            setTimeout(() => loadDashboard(), 1500);
        } else {
            msgDiv.className = 'redeem-message error';
            msgDiv.innerHTML = `❌ ${data.message}`;
        }
    } catch (error) {
        const msgDiv = document.getElementById('redeemMessage');
        msgDiv.className = 'redeem-message error';
        msgDiv.innerHTML = '❌ Something went wrong.';
    }
}

// Close menu on escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeMenu();
        closeRefer();
        closeProfilePage();
    }
});
