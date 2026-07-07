// Initialize data from LocalStorage
let currentBalance = parseFloat(localStorage.getItem('userBalance')) || 0.00;
let history = JSON.parse(localStorage.getItem('userHistory')) || [];

// Pagination setting: how many items to show initially
let showAllHistory = false;
const DEFAULT_VISIBLE_COUNT = 3;

// Function to add credits
function handleTopUp() {
    const input = document.getElementById('topup-amount');
    const amount = parseFloat(input.value);
    const message = document.getElementById('message');

    if (isNaN(amount) || amount <= 0) {
        message.style.color = "red";
        message.innerText = "Please enter a valid amount.";
        return;
    }

    currentBalance += amount;
    
    const entry = {
        type: "Top Up",
        amount: "+$" + amount.toFixed(2),
        date: new Date().toLocaleString()
    };
    history.unshift(entry);

    saveData();
    updateUI();
    
    input.value = '';
    message.style.color = "green";
    message.innerText = "Credits added successfully!";
}

// Function to spend credits on plans
function buyPlan(planName, price) {
    const message = document.getElementById('message');

    if (currentBalance < price) {
        alert("Insufficient credits! Please top up.");
        return;
    }

    currentBalance -= price;

    const entry = {
        type: "Bought " + planName,
        amount: "-$" + price.toFixed(2),
        date: new Date().toLocaleString()
    };
    history.unshift(entry);

    saveData();
    updateUI();
}

// Toggle showing all history items
function toggleHistory() {
    showAllHistory = !showAllHistory;
    updateUI();
}

// Update the screen and handle the dynamic list length
function updateUI() {
    document.getElementById('display-balance').innerText = `$${currentBalance.toFixed(2)}`;
    
    const list = document.getElementById('activity-list');
    const toggleBtn = document.getElementById('toggle-history-btn');
    list.innerHTML = "";

    if (history.length === 0) {
        list.innerHTML = "<li>No transactions yet.</li>";
        toggleBtn.style.display = "none";
        return;
    }

    // Determine how many items to display
    const itemsToShow = showAllHistory ? history : history.slice(0, DEFAULT_VISIBLE_COUNT);

    itemsToShow.forEach(item => {
        const li = document.createElement('li');
        li.style.borderBottom = "1px solid #eee";
        li.style.padding = "10px 0";
        li.innerHTML = `<strong>${item.type}</strong>: ${item.amount} <br><small>${item.date}</small>`;
        list.appendChild(li);
    });

    // Show the toggle button only if there are more than 3 items
    if (history.length > DEFAULT_VISIBLE_COUNT) {
        toggleBtn.style.display = "block";
        toggleBtn.innerText = showAllHistory ? "View Less" : `View More (${history.length - DEFAULT_VISIBLE_COUNT} more)`;
    } else {
        toggleBtn.style.display = "none";
    }
}

function saveData() {
    localStorage.setItem('userBalance', currentBalance);
    localStorage.setItem('userHistory', JSON.stringify(history));
}

// Run immediately on page load
updateUI();