const request = require("supertest");
const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");

// Use a separate test database
const TEST_DB_PATH = path.join(__dirname, "test-database.db");
const TEST_UPLOAD_PATH = path.join(__dirname, "test-uploads");

process.env.DB_PATH = TEST_DB_PATH;
process.env.UPLOAD_PATH = TEST_UPLOAD_PATH;

// Clean up before loading modules
try { fs.unlinkSync(TEST_DB_PATH); } catch (e) { /* ignore */ }
try { fs.rmSync(TEST_UPLOAD_PATH, { recursive: true, force: true }); } catch (e) { /* ignore */ }
fs.mkdirSync(TEST_UPLOAD_PATH, { recursive: true });
fs.mkdirSync(path.join(TEST_UPLOAD_PATH, "profiles"), { recursive: true });
fs.mkdirSync(path.join(TEST_UPLOAD_PATH, "gallery"), { recursive: true });

let db;
let auth;
let app;

function waitForDb(timeout = 10000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            try {
                db.get("SELECT 1", (err) => {
                    if (!err) return resolve();
                    if (Date.now() - start > timeout) return reject(new Error("DB init timeout"));
                    setTimeout(check, 100);
                });
            } catch (e) {
                if (Date.now() - start > timeout) return reject(new Error("DB init timeout"));
                setTimeout(check, 100);
            }
        };
        check();
    });
}

beforeAll(async () => {
    db = require("../database");
    auth = require("../auth");

    await waitForDb();

    // Wait for tables to be created
    await new Promise(resolve => setTimeout(resolve, 1000));

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(session({
        secret: "test-secret",
        resave: false,
        saveUninitialized: false,
    }));

    // Status endpoint
    app.get("/api/status", (req, res) => {
        db.get("SELECT 1 AS status", (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database bermasalah" });
            }
            res.json({ success: true, message: "Server dan database berjalan", database: row.status === 1 });
        });
    });

    // Session endpoint
    app.get("/api/session", (req, res) => {
        res.json({ loggedIn: !!req.session.user, user: req.session.user || null });
    });

    app.use("/api/auth", auth.router);

    // Seed a test developer user
    const hash = await bcrypt.hash("password123", 10);
    await new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO users (username, password, role, nama) VALUES (?, ?, ?, ?)",
            ["testdev", hash, "developer", "Test Developer"],
            (err) => err ? reject(err) : resolve()
        );
    });
});

afterAll(async () => {
    await new Promise((resolve) => {
        try { db.close(() => resolve()); } catch (e) { resolve(); }
    });
    try { fs.unlinkSync(TEST_DB_PATH); } catch (e) { /* ignore */ }
    try { fs.rmSync(TEST_UPLOAD_PATH, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    try { fs.rmSync(path.join(__dirname, "backups"), { recursive: true, force: true }); } catch (e) { /* ignore */ }
});

// ================================
// STATUS ENDPOINT
// ================================

describe("GET /api/status", () => {
    test("mengembalikan status server dan database", async () => {
        const res = await request(app).get("/api/status");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.database).toBe(true);
    });
});

// ================================
// SESSION ENDPOINT
// ================================

describe("GET /api/session", () => {
    test("mengembalikan tidak login jika belum login", async () => {
        const res = await request(app).get("/api/session");
        expect(res.status).toBe(200);
        expect(res.body.loggedIn).toBe(false);
        expect(res.body.user).toBeNull();
    });
});

// ================================
// AUTH - LOGIN
// ================================

describe("POST /api/auth/login", () => {
    test("gagal jika field kosong", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ username: "", password: "", role: "" });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("gagal jika role tidak valid", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ username: "testdev", password: "password123", role: "invalid_role" });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("gagal jika password salah", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ username: "testdev", password: "wrongpassword", role: "developer" });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test("gagal jika username tidak ada", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ username: "nonexistent", password: "password123", role: "developer" });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test("berhasil login dengan kredensial yang benar", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ username: "testdev", password: "password123", role: "developer" });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.username).toBe("testdev");
        expect(res.body.user.role).toBe("developer");
    });
});

// ================================
// AUTH - ME
// ================================

describe("GET /api/auth/me", () => {
    test("mengembalikan tidak login jika belum login", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.status).toBe(200);
        expect(res.body.loggedIn).toBe(false);
    });
});

// ================================
// AUTH - MEMBER REGISTRATION
// ================================

describe("POST /api/auth/member-register", () => {
    test("gagal jika field wajib kosong", async () => {
        const res = await request(app)
            .post("/api/auth/member-register")
            .send({ nama: "", username: "", password: "", kelas: "" });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("gagal jika password kurang dari 6 karakter", async () => {
        const res = await request(app)
            .post("/api/auth/member-register")
            .send({ nama: "Test", username: "test_short", password: "12345", kelas: "X TKJ" });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("berhasil mendaftar anggota baru", async () => {
        const res = await request(app)
            .post("/api/auth/member-register")
            .send({ nama: "Murid Baru", username: "murid_test", password: "password123", kelas: "X TKJ" });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.user.username).toBe("murid_test");
        expect(res.body.user.role).toBe("murid");
    });

    test("gagal jika username sudah digunakan", async () => {
        const res = await request(app)
            .post("/api/auth/member-register")
            .send({ nama: "Murid Duplikat", username: "murid_test", password: "password123", kelas: "X TKJ" });
        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });
});

// ================================
// AUTH - MEMBER REGISTRATION STATUS
// ================================

describe("GET /api/auth/member-registration-status", () => {
    test("mengembalikan status kuota pendaftaran", async () => {
        const res = await request(app).get("/api/auth/member-registration-status");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty("count");
        expect(res.body).toHaveProperty("max");
        expect(res.body).toHaveProperty("remaining");
        expect(res.body).toHaveProperty("available");
        expect(res.body.max).toBe(30);
    });
});

// ================================
// PUBLIC ENDPOINTS (tanpa auth)
// ================================

describe("GET /api/auth/announcements", () => {
    test("mengembalikan daftar pengumuman", async () => {
        const res = await request(app).get("/api/auth/announcements");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.announcements)).toBe(true);
    });
});

describe("GET /api/auth/class-content", () => {
    test("mengembalikan konten kelas", async () => {
        const res = await request(app).get("/api/auth/class-content");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

describe("GET /api/auth/class-structure", () => {
    test("mengembalikan struktur kelas", async () => {
        const res = await request(app).get("/api/auth/class-structure");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

describe("GET /api/auth/gallery", () => {
    test("mengembalikan daftar galeri", async () => {
        const res = await request(app).get("/api/auth/gallery");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.photos)).toBe(true);
    });
});

describe("GET /api/auth/members", () => {
    test("mengembalikan daftar anggota publik", async () => {
        const res = await request(app).get("/api/auth/members");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.members)).toBe(true);
    });
});

// ================================
// PROTECTED ENDPOINTS (perlu auth)
// ================================

describe("GET /api/auth/dashboard", () => {
    test("401 jika belum login", async () => {
        const res = await request(app).get("/api/auth/dashboard");
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

describe("GET /api/auth/profile", () => {
    test("401 jika belum login", async () => {
        const res = await request(app).get("/api/auth/profile");
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

describe("PUT /api/auth/profile", () => {
    test("401 jika belum login", async () => {
        const res = await request(app)
            .put("/api/auth/profile")
            .send({ nama_lengkap: "Test" });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

describe("GET /api/auth/developer/members", () => {
    test("401 jika belum login", async () => {
        const res = await request(app).get("/api/auth/developer/members");
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

describe("POST /api/auth/announcements", () => {
    test("401 jika belum login", async () => {
        const res = await request(app)
            .post("/api/auth/announcements")
            .send({ title: "Test", content: "Test content" });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

// ================================
// LOGOUT
// ================================

describe("POST /api/auth/logout", () => {
    test("berhasil logout (tanpa session aktif)", async () => {
        const res = await request(app).post("/api/auth/logout");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
