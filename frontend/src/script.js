async function login(event) {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const result = document.getElementById('result');

  if (!email || !password) {
    result.innerText = 'Please fill in all fields';
    return;
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Store logged-in user information
      localStorage.setItem('id', data.user.id);
      localStorage.setItem('name', data.user.name);
      localStorage.setItem('email', data.user.email);
      localStorage.setItem('role', data.user.role);

      window.location.href = '/home';
    } else {
      result.innerText = data.message;
    }
  } catch {
    result.innerText = 'Cannot connect to server';
  }
}
window.login = login;
