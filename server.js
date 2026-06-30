const express = require("express");

const app = express();

app.use(express.json());

// Serve frontend files
app.use(express.static("public"));

/*
=====================================
Mock User Database
=====================================
*/

const user = {
  email: "student@bikeapp.com",
  password: "123456",
  name: "Kai Yi",
  role: "Cyclist"
};

/*
=====================================
LOGIN API
POST /api/auth/login
=====================================
*/

app.post("/api/auth/login", (req, res) => {

  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  // Check credentials
  if (
    email !== user.email ||
    password !== user.password
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  // Success
  return res.status(200).json({
    success: true,
    message: "Login successful",
    user: {
      name: user.name,
      email: user.email,
      role: user.role
    }
  });

});

/*
=====================================
PROFILE API
GET /api/auth/profile
=====================================
*/

app.get("/api/auth/profile", (req, res) => {

  return res.status(200).json({
    success: true,
    message: "Profile loaded successfully",
    user: {
      name: user.name,
      email: user.email,
      role: user.role
    }
  });

});

/*
=====================================
LOGOUT API
POST /api/auth/logout
=====================================
*/

app.post("/api/auth/logout", (req, res) => {

  return res.status(200).json({
    success: true,
    message: "Logout successful"
  });

});

/*
=====================================
START SERVER
=====================================
*/

app.listen(3000, () => {
  console.log("Server running on port 3000");
});