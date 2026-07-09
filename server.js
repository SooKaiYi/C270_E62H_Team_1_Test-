console.log("=== NEW SERVER.JS IS RUNNING ===");

const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
    secret: "bikeappsecret",
    resave: false,
    saveUninitialized: true
}));

// =========================
// Mock Database
// =========================

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

// =========================

const PORT = 3000;

app.listen(PORT, () => {

    console.log(`Server running on http://localhost:${PORT}`);

});