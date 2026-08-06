
import sqlite3

def init_db():
    con = sqlite3.connect("tasks")
    cursor = con.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS tasks (" \
        "id             INTEGER PRIMARY KEY AUTOINCREMENT," \
        "device_token   TEXT NOT NULL," \
        "assignment     TEXT NOT NULL," \
        "state_json     TEXT NOT NULL," \
        "finished       INTEGER NOT NULL DEFAULT 0," \
        "created_at     TEXT NOT NULL DEFAULT (datetime('now'))," \
        "updated_at     TEXT NOT NULL DEFAULT (datetime('now))," \
        ");" \
        "CREATE INDEX IF NOT EXISTS idx_tasks_device ON  tasks(device_token);" \
        "CREATE TABLE IF NOT EXISTS stall_events (" \
        "id             INTERGER PRIMARY KEY AUTOINCREMENT," \
        "device_token   TEXT NOT NULL," \
        "task_id        INTEGER," \
        "reason         TEXT NOT NULL," \
        "created_at     TEXT NOT NULL DEFAULT (datetime('now'))," \
        "FOREIGN KEY (task_id) REFERENCES tasks(id)," \
        ");" \
        "CREATE INDEX IF NOT EXISTS idx_stall_device ON stall_events(device_tokens);")

    con.commit()
    con.close()