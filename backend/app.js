const express = require("express");
const path = require("path");

const mapRoutes = require("./routes/mapRoutes");

const app = express();

app.set("view engine", "ejs");
app.set(
    "views",
    path.join(__dirname, "..", "frontend", "pages")
);

app.use(
    express.static(
        path.join(__dirname, "..", "frontend")
    )
);



app.use("/", mapRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


