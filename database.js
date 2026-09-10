const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const defaultDatabasePath = path.join(__dirname, "database.db");
const databasePath = process.env.DB_PATH || defaultDatabasePath;
const backupDirectory = process.env.BACKUP_PATH
    || (process.env.DB_PATH ? path.join(path.dirname(process.env.DB_PATH), "backups") : path.join(__dirname, "backups"));
let db = null;

function ensureBackupDirectory() {
    try {
        fs.mkdirSync(backupDirectory, { recursive: true });
    } catch (error) {
        // ignore
    }
}

function backupFileName(reason) {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const safeReason = reason ? `-${String(reason).replace(/[^a-z0-9-_]+/gi, "")}` : "";
    return `database-${stamp}${safeReason}.db`;
}

function createDatabaseBackup(reason = "manual") {
    try {
        ensureBackupDirectory();
        if (!fs.existsSync(databasePath)) return null;
        const target = path.join(backupDirectory, backupFileName(reason));
        fs.copyFileSync(databasePath, target);
        try {
            const entries = fs.readdirSync(backupDirectory)
                .filter((fileName) => fileName.toLowerCase().endsWith(".db"))
                .map((fileName) => ({ fileName, fullPath: path.join(backupDirectory, fileName), mtimeMs: fs.statSync(path.join(backupDirectory, fileName)).mtimeMs }))
                .sort((left, right) => right.mtimeMs - left.mtimeMs);
            entries.slice(20).forEach((entry) => {
                try { fs.unlinkSync(entry.fullPath); } catch (error) { /* ignore */ }
            });
        } catch (error) { /* ignore pruning errors */ }
        console.log(`💾 Backup database tersimpan: backups/${path.basename(target)}`);
        return target;
    } catch (error) {
        console.error("Backup database gagal:", error.message);
        return null;
    }
}

function getDb() {
    if (!db) {
        throw new Error("Database belum siap. Pastikan inisialisasi database sudah selesai sebelum menggunakan query.");
    }

    return db;
}

const databaseProxy = {
    run(...args) {
        return getDb().run(...args);
    },
    get(...args) {
        return getDb().get(...args);
    },
    all(...args) {
        return getDb().all(...args);
    },
    each(...args) {
        return getDb().each(...args);
    },
    prepare(...args) {
        return getDb().prepare(...args);
    },
    serialize(...args) {
        return getDb().serialize(...args);
    },
    exec(...args) {
        return getDb().exec(...args);
    },
    close(...args) {
        if (!db) {
            return undefined;
        }

        return db.close(...args);
    },
    on(...args) {
        return getDb().on(...args);
    },
    once(...args) {
        return getDb().once(...args);
    }
};

function getUsersCount(databaseFilePath, callback) {
    const probe = new sqlite3.Database(databaseFilePath, sqlite3.OPEN_READONLY, (error) => {
        if (error) {
            callback(0);
            return;
        }

        probe.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'", (schemaError, row) => {
            if (schemaError || !row) {
                probe.close(() => callback(0));
                return;
            }

            probe.get("SELECT COUNT(*) AS count FROM users", (countError, result) => {
                probe.close(() => callback(countError ? 0 : Number(result?.count || 0)));
            });
        });
    });
}

function listBackupCandidates() {
    ensureBackupDirectory();
    const repoBackupDirectory = path.join(__dirname, "backups");
    const directories = [backupDirectory, repoBackupDirectory]
        .filter((directory, index, all) => directory && all.indexOf(directory) === index);
    let entries = [];
    directories.forEach((directory) => {
        try {
            fs.readdirSync(directory)
                .filter((fileName) => fileName.toLowerCase().endsWith(".db"))
                .forEach((fileName) => {
                    const fullPath = path.join(directory, fileName);
                    if (!entries.includes(fullPath) && fullPath !== databasePath) {
                        entries.push(fullPath);
                    }
                });
        } catch (error) { /* ignore missing dir */ }
    });
    return entries;
}

function recoverPrimaryDatabaseIfNeeded(callback) {
    const finishWithStartupBackup = () => {
        getUsersCount(databasePath, (countAfter) => {
            if (countAfter > 0) createDatabaseBackup("startup");
            callback();
        });
    };

    const tryRestoreFromCandidates = (done) => {
        let rootCandidates = [];
        try {
            rootCandidates = fs.readdirSync(__dirname)
                .filter((fileName) => fileName.toLowerCase().endsWith(".db") && path.join(__dirname, fileName) !== defaultDatabasePath && path.join(__dirname, fileName) !== databasePath)
                .map((fileName) => path.join(__dirname, fileName));
        } catch (error) { /* ignore */ }
        const candidatePaths = [...rootCandidates, ...listBackupCandidates()]
            .filter((candidatePath, index, all) => all.indexOf(candidatePath) === index && candidatePath !== databasePath)
            .sort((left, right) => {
                const leftTime = fs.existsSync(left) ? fs.statSync(left).mtimeMs : 0;
                const rightTime = fs.existsSync(right) ? fs.statSync(right).mtimeMs : 0;
                return rightTime - leftTime;
            });

        if (!candidatePaths.length) {
            done(false);
            return;
        }

        let bestCandidate = null;
        let pending = candidatePaths.length;

        candidatePaths.forEach((candidatePath) => {
            getUsersCount(candidatePath, (candidateCount) => {
                if (candidateCount > (bestCandidate?.count || 0)) {
                    bestCandidate = { path: candidatePath, count: candidateCount };
                }

                pending -= 1;
                if (pending === 0) {
                    if (bestCandidate && bestCandidate.count > 0) {
                        try {
                            try { fs.mkdirSync(path.dirname(databasePath), { recursive: true }); } catch (error) { /* ignore */ }
                            fs.copyFileSync(bestCandidate.path, databasePath);
                            console.log(`🔄 Database lama dipulihkan dari ${path.relative(__dirname, bestCandidate.path)} ke ${databasePath}.`);
                            done(true);
                            return;
                        } catch (error) {
                            console.error("Gagal memulihkan database:", error.message);
                        }
                    }
                    done(false);
                }
            });
        });
    };

    getUsersCount(databasePath, (currentCount) => {
        if (currentCount > 0) {
            finishWithStartupBackup();
            return;
        }

        tryRestoreFromCandidates(() => finishWithStartupBackup());
    });
}

recoverPrimaryDatabaseIfNeeded(() => {
    db = new sqlite3.Database(databasePath, (err) => {
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
});

module.exports = databaseProxy;
module.exports.createDatabaseBackup = createDatabaseBackup;
module.exports.getDatabasePath = () => databasePath;
