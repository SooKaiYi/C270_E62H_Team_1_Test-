console.log("=== NEW SERVER.JS IS RUNNING ===");

const express = require("express");

const app = express();

app.use(express.json());
app.use(express.static("public"));

/*
=====================================
Mock User Database
=====================================
*/

const users = [
  {
    id: 1,
    email: "admin@bikeapp.com",
    password: "admin123",
    name: "Administrator",
    role: "Admin"
  },
  {
    id: 2,
    email: "member@bikeapp.com",
    password: "member123",
    name: "Member User",
    role: "Member"
  }
];

/*
=====================================
LOGIN API
POST /api/auth/login
=====================================
*/

app.post("/api/auth/login", (req, res) => {

  console.log("===== LOGIN REQUEST =====");
  console.log(req.body);

  let { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  email = email.trim().toLowerCase();
  password = password.trim();

  const user = users.find(u =>
    u.email.toLowerCase() === email &&
    u.password === password
  );

  console.log("Matched User:", user);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Login successful",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });

});

/*
=====================================
PROFILE API
=====================================
*/

app.get("/api/auth/profile", (req, res) => {

  const user = users[0];

  return res.status(200).json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });

});

/*
=====================================
ADMIN CHECK MIDDLEWARE
=====================================
*/

function isAdmin(req, res, next) {

  const { role } = req.body;

  if (role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Access Denied. Admin only."
    });
  }

  next();

}

/*
=====================================
MEMBER CHECK MIDDLEWARE
=====================================
*/

function isMember(req, res, next) {

  const { role } = req.body;

  if (role !== "Member") {
    return res.status(403).json({
      success: false,
      message: "Members only."
    });
  }

  next();

}

/*
=====================================
ADMIN DASHBOARD
=====================================
*/

app.get("/api/admin", isAdmin, (req, res) => {

  res.json({
    success: true,
    message: "Welcome Admin"
  });

});

/*
=====================================
MEMBER DASHBOARD
=====================================
*/

app.get("/api/member", isMember, (req, res) => {

  res.json({
    success: true,
    message: "Welcome Member"
  });

});

/*
=====================================
LOGOUT
=====================================
*/

app.post("/api/auth/logout", (req, res) => {

  res.json({
    success: true,
    message: "Logged out successfully"
  });

});

/*
=====================================
START SERVER
=====================================
*/

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});