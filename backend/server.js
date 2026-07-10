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
// Absolute Paths Config
// =======================================
// This finds the exact folder where server.js lives, then goes out one level to the root
const rootDir = path.resolve(__dirname, '..');
const frontendPath = path.join(rootDir, 'frontend');
const pagesPath = path.join(frontendPath, 'pages');

console.log("Root Directory:", rootDir);
console.log("Frontend Path:", frontendPath);
console.log("Pages Path:", pagesPath);

// =======================================
// Static Files
// =======================================
app.use(express.static(frontendPath));
app.use(express.static(pagesPath));

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
app.set("views", pagesPath);

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