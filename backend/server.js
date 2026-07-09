console.log("=== SERVER.JS IS RUNNING ===");

const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();

// =======================================
// Body Parser
// =======================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================================
// Static Files
// =======================================
app.use(express.static(path.join(__dirname, "../frontend")));
app.use(express.static(path.join(__dirname, "../frontend/pages")));
app.use("/src", express.static(path.join(__dirname, "../frontend/src")));
app.use("/styles", express.static(path.join(__dirname, "../frontend/styles")));

// =======================================
// Session
// =======================================

app.use(
    session({
        secret: "bikeappsecret",
        resave: false,
        saveUninitialized: false
    })
);

// =======================================
// View Engine
// =======================================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

// =======================================
// Routes
// =======================================

const routes = require("./routes/routes");
const mapRoutes = require("./routes/mapRoutes");

app.use("/", routes);
app.use("/", mapRoutes);
// =======================================
// 404 Page
// =======================================

app.use((req, res) => {
    res.status(404).send("404 - Page Not Found");
});

// =======================================
// Start Server
// =======================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});