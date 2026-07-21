const express = require("express");
const pool = require("../config/database");

const router = express.Router();

// =======================================
// Admin Middleware
// =======================================

function requireAdmin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect("/login.html");
    }

    if (String(req.session.user.role).toLowerCase() !== "admin") {
        return res.status(403).send("Access Denied");
    }

    next();
}

// =======================================
// Login
// =======================================

router.post("/api/auth/login", async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        email = email.trim().toLowerCase();
        password = password.trim();

        const [rows] = await pool.execute(
            `
            SELECT id, name, email, password, role
            FROM users
            WHERE LOWER(email) = ?
            LIMIT 1
            `,
            [email]
        );

        const user = rows[0];

        if (!user || user.password !== password) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        res.json({
            success: true,
            message: "Login successful",
            user: req.session.user
        });
    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to log in."
        });
    }
});

// =======================================
// Signup
// =======================================

router.post("/api/auth/signup", async (req, res) => {
    try {
        let { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required."
            });
        }

        name = name.trim();
        email = email.trim().toLowerCase();
        password = password.trim();

        const [existingUsers] = await pool.execute(
            `
            SELECT id
            FROM users
            WHERE LOWER(email) = ?
            LIMIT 1
            `,
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already exists."
            });
        }

        const [idRows] = await pool.execute(
            `
            SELECT COALESCE(MAX(id), 0) + 1 AS nextId
            FROM users
            `
        );

        const nextId = idRows[0].nextId;

        await pool.execute(
            `
            INSERT INTO users (
                id,
                name,
                email,
                password,
                role
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [nextId, name, email, password, "Member"]
        );

        res.json({
            success: true,
            message: "Account created successfully!"
        });
    } catch (error) {
        console.error("Signup error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create account."
        });
    }
});

// =======================================
// Root
// =======================================

router.get("/", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login.html");
    }

    res.redirect("/home");
});

// =======================================
// Home
// =======================================

router.get("/home", (req, res) => {
    if (!req.session.user) {
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

router.get("/admin/users", requireAdmin, async (req, res) => {
    try {
        const [users] = await pool.execute(
            `
            SELECT id, name, email, password, role
            FROM users
            ORDER BY id
            `
        );

        res.render("manage-users", {
            users,
            admin: req.session.user
        });
    } catch (error) {
        console.error("Load users error:", error);
        res.status(500).send("Unable to load users.");
    }
});

// =======================================
// Edit User Page
// =======================================

router.get("/admin/users/:id", requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `
            SELECT id, name, email, password, role
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [req.params.id]
        );

        const user = rows[0];

        if (!user) {
            return res.status(404).send("User not found");
        }

        res.render("edit-user", {
            user
        });
    } catch (error) {
        console.error("Load user error:", error);
        res.status(500).send("Unable to load user.");
    }
});

// =======================================
// Save Edited User
// =======================================

router.post("/admin/users/:id", requireAdmin, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const [result] = await pool.execute(
            `
            UPDATE users
            SET
                name = ?,
                email = ?,
                password = ?,
                role = ?
            WHERE id = ?
            `,
            [
                name.trim(),
                email.trim().toLowerCase(),
                password.trim(),
                role,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).send("User not found");
        }

        if (Number(req.session.user.id) === Number(req.params.id)) {
            req.session.user.name = name.trim();
            req.session.user.email = email.trim().toLowerCase();
            req.session.user.role = role;
        }

        res.redirect("/admin/users");
    } catch (error) {
        console.error("Update user error:", error);
        res.status(500).send("Unable to update user.");
    }
});

// =======================================
// Delete User
// =======================================

router.post(
    "/admin/users/:id/delete",
    requireAdmin,
    async (req, res) => {
        try {
            const userId = Number(req.params.id);

            if (Number(req.session.user.id) === userId) {
                return res.send("You cannot delete your own account.");
            }

            const [result] = await pool.execute(
                `
                DELETE FROM users
                WHERE id = ?
                `,
                [userId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).send("User not found");
            }

            res.redirect("/admin/users");
        } catch (error) {
            console.error("Delete user error:", error);

            if (error.code === "ER_ROW_IS_REFERENCED_2") {
                return res.status(400).send(
                    "This user cannot be deleted because they still have related rentals, wallet records or other data."
                );
            }

            res.status(500).send("Unable to delete user.");
        }
    }
);

// =======================================
// Logout
// =======================================

router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login.html");
    });
});

module.exports = router;