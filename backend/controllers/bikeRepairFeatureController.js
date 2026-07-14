const fs = require("fs");
const path = require("path");

const reportsFile = path.join(__dirname, "../data/bikeRepairReports.json");

function readReports() {
    if (!fs.existsSync(reportsFile)) {
        return [];
    }

    const data = fs.readFileSync(reportsFile, "utf8");
    return JSON.parse(data);
}

function saveReports(reports) {
    fs.writeFileSync(
        reportsFile,
        JSON.stringify(reports, null, 4)
    );
}

// =======================================
// Show Repair Form
// =======================================

exports.showRepairPage = (req, res) => {
    res.render("bikeRepairReportPage", {
        user: req.session.user
    });
};

// =======================================
// Submit Repair Report
// =======================================

exports.submitRepairReport = (req, res) => {

    const {
        bikeStation,
        bikeID,
        issueType,
        description
    } = req.body;

    const reports = readReports();

    const newReport = {
        id: Date.now(),
        bikeStation,
        bikeID,
        issueType,
        description,
        status: "Pending",
        date: new Date().toLocaleString()
    };

    reports.push(newReport);

    saveReports(reports);

    res.render("bikeRepairSubmittedPage", {
        report: newReport,
        user: req.session.user
    });
};

// =======================================
// Admin Page
// =======================================

exports.showAdminPage = (req, res) => {

    if (!req.session.user || req.session.user.role !== "Admin") {
        return res.status(403).send("Access Denied");
    }

    const reports = readReports();

    res.render("bikeRepairAdminPage", {
        reports,
        user: req.session.user
    });
};

// =======================================
// Update Repair Status
// =======================================

exports.updateRepairStatus = (req, res) => {

    const { id } = req.params;
    const { status } = req.body;

    const reports = readReports();

    const report = reports.find(r => r.id == id);

    if (report) {
        report.status = status;
    }

    saveReports(reports);

    res.redirect("/repair/admin");
};