const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const databasePath = process.env.DB_PATH || path.join(__dirname, "database.db");
const db = new sqlite3.Database(databasePath, (err) => {
    if (err) {
        console.error("❌ Database gagal:", err.message);
    } else {
        console.log("✅ Database terhubung");
    }
});

db.serialize(() => {
    db.run("PRAGMA busy_timeout = 5000");
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA synchronous = NORMAL");

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            nama TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            image_url TEXT,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.all("PRAGMA table_info(announcements)", (error, columns) => {
        if (error) {
            console.error("Gagal memeriksa kolom pengumuman:", error.message);
            return;
        }

        if (!columns.some((column) => column.name === "expires_at")) {
            db.run("ALTER TABLE announcements ADD COLUMN expires_at DATETIME");
        }
        if (!columns.some((column) => column.name === "image_url")) {
            db.run("ALTER TABLE announcements ADD COLUMN image_url TEXT");
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS class_info (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS class_structure (
            position TEXT PRIMARY KEY,
            user_id INTEGER,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);
    ["wali_kelas", "ketua", "wakil", "sekretaris"].forEach((position) => {
        db.run("INSERT OR IGNORE INTO class_structure (position) VALUES (?)", [position]);
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS class_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day TEXT UNIQUE NOT NULL,
            subjects TEXT NOT NULL
        )
    `);

    db.run(
        `INSERT OR IGNORE INTO class_info (id, title, content)
         VALUES (1, 'Satu Kelas, Satu Tim', 'Website ini dibuat sebagai pusat informasi digital KELAS X TKJ.')`
    );
    const defaultSchedule = [
        ["Senin", "Matematika • Bahasa Indonesia"],
        ["Selasa", "Bahasa Inggris • Informatika"],
        ["Rabu", "IPA • Pendidikan Jasmani"],
        ["Kamis", "IPS • Bahasa Indonesia"],
        ["Jumat", "Pendidikan Agama • Seni"],
        ["Sabtu", "Kegiatan Kelas • Ekstrakurikuler"]
    ];
    const insertSchedule = db.prepare("INSERT OR IGNORE INTO class_schedule (day, subjects) VALUES (?, ?)");
    defaultSchedule.forEach((schedule) => insertSchedule.run(schedule));
    insertSchedule.finalize();

    db.run(`
        CREATE TABLE IF NOT EXISTS login_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            logged_out_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS class_gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            photo_url TEXT NOT NULL,
            uploaded_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS member_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            nama_lengkap TEXT NOT NULL,
            kelas TEXT NOT NULL DEFAULT 'X TKJ',
            jabatan TEXT NOT NULL DEFAULT '',
            bio TEXT NOT NULL DEFAULT '',
            photo_url TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS app_migrations (
            name TEXT PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.get("SELECT name FROM app_migrations WHERE name = 'remove-demo-accounts'", (migrationError, migration) => {
        if (migrationError || migration) return;
        const demoUsernames = ["wali_uji", "murid_uji"];
        const placeholders = demoUsernames.map(() => "?").join(", ");
        db.serialize(() => {
            db.run(`DELETE FROM login_sessions WHERE user_id IN (SELECT id FROM users WHERE username IN (${placeholders}))`, demoUsernames);
            db.run(`DELETE FROM class_gallery WHERE uploaded_by IN (SELECT id FROM users WHERE username IN (${placeholders}))`, demoUsernames);
            db.run(`DELETE FROM member_profiles WHERE user_id IN (SELECT id FROM users WHERE username IN (${placeholders}))`, demoUsernames);
            db.run("DELETE FROM users WHERE username IN (" + placeholders + ")", demoUsernames);
            db.run("INSERT INTO app_migrations (name) VALUES ('remove-demo-accounts')");
        });
    });

    db.get("SELECT name FROM app_migrations WHERE name = 'remove-test-accounts'", (migrationError, migration) => {
        if (migrationError || migration) return;
        const testUsernames = ["wali_uji", "murid_uji"];
        const placeholders = testUsernames.map(() => "?").join(", ");
        db.serialize(() => {
            db.run(`DELETE FROM login_sessions WHERE user_id IN (SELECT id FROM users WHERE username IN (${placeholders}))`, testUsernames);
            db.run(`DELETE FROM class_gallery WHERE uploaded_by IN (SELECT id FROM users WHERE username IN (${placeholders}))`, testUsernames);
            db.run(`DELETE FROM member_profiles WHERE user_id IN (SELECT id FROM users WHERE username IN (${placeholders}))`, testUsernames);
            db.run(`DELETE FROM users WHERE username IN (${placeholders})`, testUsernames);
            db.run("INSERT INTO app_migrations (name) VALUES ('remove-test-accounts')");
        });
    });

    db.all("PRAGMA table_info(member_profiles)", (error, columns) => {
        if (error) {
            console.error("Gagal memeriksa kolom profil:", error.message);
            return;
        }

        if (!columns.some((column) => column.name === "photo_url")) {
            db.run("ALTER TABLE member_profiles ADD COLUMN photo_url TEXT");
        }
        if (!columns.some((column) => column.name === "jabatan")) {
            db.run("ALTER TABLE member_profiles ADD COLUMN jabatan TEXT NOT NULL DEFAULT ''");
        }
    });

});

module.exports = db;
