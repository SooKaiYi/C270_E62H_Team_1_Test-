const express = require("express");
const router = express.Router();

const bikeController = require("../controllers/bikeController");

// =======================================
// Middleware
// =======================================

function requireLogin(req, res, next) {

    if (!req.session || !req.session.user) {
        return res.redirect("/login.html");
    }

    next();
}

function requireAdmin(req, res, next) {

    if (
        !req.session ||
        !req.session.user ||
        String(req.session.user.role).toLowerCase() !== "admin"
    ) {
        return res.status(403).send("Admin access required.");
    }

    next();
}

router.use(requireLogin);

// =======================================
// Member Routes
// =======================================

router.get("/", bikeController.showBikes);

// =======================================
// Admin Routes
// =======================================

router.get("/admin", requireAdmin, bikeController.showAdminBikes);

router.get("/add", requireAdmin, bikeController.showAddBike);
router.post("/add", requireAdmin, bikeController.addBike);

router.get("/edit/:id", requireAdmin, bikeController.showEditBike);
router.post("/edit/:id", requireAdmin, bikeController.updateBike);

router.post("/delete/:id", requireAdmin, bikeController.deleteBike);

module.exports = router;