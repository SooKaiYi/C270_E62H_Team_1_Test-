console.log("=== NEW SERVER.JS IS RUNNING ===");

const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// Static Files
// =========================

app.use(express.static(path.join(__dirname, "../frontend")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

// =========================
// Session
// =========================

app.use(session({
    secret: "bikeappsecret",
    resave: false,
    saveUninitialized: true
}));

// =========================
// User Database
// =========================

const userFile = path.join(__dirname, "user.json");

function loadUsers() {
    return JSON.parse(fs.readFileSync(userFile, "utf8"));
}

function saveUsers(users) {
    fs.writeFileSync(userFile, JSON.stringify(users, null, 2));
}

// =========================
// Admin Middleware
// =========================

function requireAdmin(req, res, next) {

    if (!req.session.user) {
        return res.redirect("/login.html");
    }

    if (req.session.user.role !== "Admin") {
        return res.status(403).send("Access Denied");
    }

    next();

}

// =========================
// Login
// =========================

app.post("/api/auth/login", (req, res) => {

    let { email, password } = req.body;

    email = email.trim().toLowerCase();
    password = password.trim();

    const users = loadUsers();

    const user = users.find(u =>
        u.email.toLowerCase() === email &&
        u.password === password
    );

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });

    }

    req.session.user = user;

    res.json({
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

// =========================
// Sign Up
// =========================

app.post("/api/auth/signup", (req, res) => {

    const { name, email, password } = req.body;

    const users = loadUsers();

    const exists = users.find(
        u => u.email.toLowerCase() === email.toLowerCase()
    );

    if (exists) {

        return res.status(400).json({
            success: false,
            message: "Email already exists."
        });

    }

    const newUser = {
        id: users.length + 1,
        name,
        email,
        password,
        role: "Member"
    };

    users.push(newUser);

    saveUsers(users);

    res.json({
        success: true,
        message: "Account created successfully!"
    });

});

// =========================
// Home Page
// =========================

app.get("/home", (req, res) => {

    if (!req.session.user) {
        return res.redirect("/login.html");
    }

    res.render("home", {
        user: req.session.user
    });

});

// =========================
// Admin Dashboard
// =========================

app.get("/admin/dashboard", requireAdmin, (req, res) => {

    res.render("admin-dashboard", {
        user: req.session.user
    });

});

// =========================
// Logout
// =========================

app.get("/logout", (req, res) => {

    req.session.destroy(() => {

        res.redirect("/login.html");

    });

});
app.get("/admin/users", requireAdmin, (req, res) => {

    const users = loadUsers();

    res.render("manage-users", {
        users,
        admin: req.session.user
    });

});
app.get("/admin/users/:id", requireAdmin, (req, res) => {

    const users = loadUsers();

    const user = users.find(
        u => u.id == req.params.id
    );

    if (!user) {

        return res.send("User not found");

    }

    res.render("edit-user", {
        user
    });

});
app.post("/admin/users/:id", requireAdmin, (req, res) => {

    const users = loadUsers();

    const user = users.find(
        u => u.id == req.params.id
    );

    if (!user) {

        return res.send("User not found");

    }

    user.name = req.body.name;
    user.email = req.body.email;
    user.password = req.body.password;
    user.role = req.body.role;

    saveUsers(users);

    res.redirect("/admin/users");

});

// =========================

const PORT = 3000;

app.listen(PORT, () => {

    console.log(`Server running on http://localhost:${PORT}`);

});