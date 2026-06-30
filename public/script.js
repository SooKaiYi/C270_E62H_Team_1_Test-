async function login() {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const result = document.getElementById("result");

  if (!email || !password) {
    result.innerText = "Please fill in all fields";
    return;
  }

  try {

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (response.status === 200) {
      result.innerText = "Login successful! Welcome " + data.user.email;
    } else {
      result.innerText = data.message;
    }

  } catch (error) {
    result.innerText = "Cannot connect to server";
  }
}