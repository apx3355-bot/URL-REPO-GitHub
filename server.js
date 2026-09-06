const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const session = require("express-session");
const db = require("./database");
const auth = require("./auth");

const storageRoot = process.env.UPLOAD_PATH ? process.env.UPLOAD_PATH : path.join(__dirname, "storage", "uploads");
fs.mkdirSync(storageRoot, { recursive: true });
fs.mkdirSync(path.join(storageRoot, "profiles"), { recursive: true });
fs.mkdirSync(path.join(storageRoot, "gallery"), { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;

function getLanAddresses() {
    return Object.values(os.networkInterfaces())
        .flat()
        .filter((networkAddress) => networkAddress && networkAddress.family === "IPv4" && !networkAddress.internal)
        .map((networkAddress) => networkAddress.address);
}

// ================================
// MIDDLEWARE
// ================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "YPK_CLASS_SECRET_2026",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 4
        }
    })
);

// ================================
// FRONTEND
// ================================

app.get("/dashboard.html", (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login.html");
    }

    next();
});

app.use("/uploads", express.static(path.join(__dirname, "storage", "uploads")));

const frontendDistPath = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
}

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", auth.router);

app.get("/", (req, res) => {
    const builtIndexPath = path.join(frontendDistPath, "index.html");
    if (fs.existsSync(builtIndexPath)) {
        return res.sendFile(builtIndexPath);
    }

    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================================
// DATABASE STATUS
// ================================

app.get("/api/status", (req, res) => {
    db.get("SELECT 1 AS status", (err, row) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Database bermasalah"
            });
        }

        res.json({
            success: true,
            message: "Server dan database berjalan",
            database: row.status === 1
        });
    });
});

// ================================
// TEST SESSION
// ================================

app.get("/api/session", (req, res) => {
    res.json({
        loggedIn: !!req.session.user,
        user: req.session.user || null
    });
});

// ================================
// SERVER
// ================================

app.listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("================================");
    console.log("🚀 WEBSITE KELAS X TKJ");
    console.log("================================");
    console.log(`🌐 http://localhost:${PORT}`);
    getLanAddresses().forEach((address) => {
        console.log(`📱 http://${address}:${PORT}`);
    });
    console.log("🔐 Session: Aktif");
    console.log("🗄️ Database: Terhubung");
    console.log("================================");
});
