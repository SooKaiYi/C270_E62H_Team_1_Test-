// ===============================
// Sign Up Function
// ===============================

async function signup(event) {

    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    const result = document.getElementById("result");

    // Clear previous message
    result.innerText = "";

    // Validate input
    if (!name || !email || !password || !confirmPassword) {

        result.style.color = "red";
        result.innerText = "Please fill in all fields.";
        return;

    }

    if (password !== confirmPassword) {

        result.style.color = "red";
        result.innerText = "Passwords do not match.";
        return;

    }

    try {

        const response = await fetch("/api/auth/signup", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name,
                email,
                password
            })

        });

        const data = await response.json();

        if (!response.ok) {

            result.style.color = "red";
            result.innerText = data.message;
            return;

        }

        result.style.color = "green";
        result.innerText = "Account created successfully! Redirecting to login...";

        // Redirect back to Login page
        setTimeout(() => {

            window.location.href = "/login.html";

        }, 1500);

    }

    catch (error) {

        console.error(error);

        result.style.color = "red";
        result.innerText = "Unable to connect to the server.";

    }

}

// ===============================
// Press Enter to Sign Up
// ===============================

document.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {

        const form = document.querySelector("form");

        if (form) {

            form.requestSubmit();

        }

    }

});