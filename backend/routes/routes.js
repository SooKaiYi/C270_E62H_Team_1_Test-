const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// =======================================
// User Database
// =======================================

const userFile = path.join(__dirname, "../data/user.json");

function loadUsers() {
    return JSON.parse(fs.readFileSync(userFile, "utf8"));
}

function saveUsers(users) {
    fs.writeFileSync(userFile, JSON.stringify(users, null, 2));
}

router.get("/", (req, res) => {
    res.redirect("/login.html");
});

// =======================================
// Admin Middleware
// =======================================

function requireAdmin(req, res, next) {

    if (!req.session.user) {
        return res.redirect("/login.html");
    }

    if (req.session.user.role !== "Admin") {
        return res.status(403).send("Access Denied");
    }

    next();

}

// =======================================
// Login
// =======================================

router.post("/api/auth/login", (req, res) => {

    let { email, password } = req.body;

    email = email.trim().toLowerCase();
    password = password.trim();

    const users = loadUsers();

    const user = users.find(
        u =>
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

// =======================================
// Signup
// =======================================

router.post("/api/auth/signup", (req, res) => {

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

// =======================================
// Home
// =======================================

router.get("/home", (req, res) => {

    console.log("========== HOME ==========");
    console.log("Session:", req.session);

    if (!req.session.user) {
        console.log("No user found in session");
        return res.redirect("/login.html");
    }

    res.render("home", {
        user: req.session.user
    });

});

// =======================================
// Admin Dashboard
// =======================================

router.get("/admin/dashboard", requireAdmin, (req, res) => {

    res.render("admin-dashboard", {
        user: req.session.user
    });

});

// =======================================
// Manage Users
// =======================================

router.get("/admin/users", requireAdmin, (req, res) => {

    const users = loadUsers();

    res.render("manage-users", {
        users,
        admin: req.session.user
    });

});

// =======================================
// Edit User Page
// =======================================

router.get("/admin/users/:id", requireAdmin, (req, res) => {

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

// =======================================
// Save Edited User
// =======================================

router.post("/admin/users/:id", requireAdmin, (req, res) => {

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
// =======================================
// Delete User
// =======================================

router.post("/admin/users/:id/delete", requireAdmin, (req, res) => {

    console.log("===== DELETE USER =====");
    console.log("Deleting ID:", req.params.id);

    const users = loadUsers();

    const userId = parseInt(req.params.id);

    if (req.session.user.id === userId) {
        return res.send("You cannot delete your own account.");
    }

    const updatedUsers = users.filter(user => user.id !== userId);

    saveUsers(updatedUsers);

    console.log("User deleted successfully.");

    res.redirect("/admin/users");

});


// =======================================
// Logout
// =======================================

router.get("/logout", (req, res) => {

    req.session.destroy(() => {

        res.redirect("/login.html");

    });

});

module.exports = router;