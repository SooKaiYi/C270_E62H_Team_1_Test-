async function signup(event) {

    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const result = document.getElementById("result");

    result.innerHTML = "";

    if (!name || !email || !password) {
        result.innerHTML = `
            <div class="alert alert-danger">
                Please fill in all fields.
            </div>
        `;
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

        if (response.ok) {

            result.innerHTML = `
                <div class="alert alert-success">
                    ${data.message}
                </div>
            `;

            // Clear the form
            document.getElementById("name").value = "";
            document.getElementById("email").value = "";
            document.getElementById("password").value = "";

            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = "/login.html";
            }, 2000);

        } else {

            result.innerHTML = `
                <div class="alert alert-danger">
                    ${data.message}
                </div>
            `;

        }

    } catch (err) {

        console.error(err);

        result.innerHTML = `
            <div class="alert alert-danger">
                Unable to connect to the server.
            </div>
        `;

    }

}
window.signup = signup;