from app import app
from app.db import get_db
from flask import render_template, request, jsonify, g
from app.ai import breakdown, rebreak, continue_steps, ModelOutputError
import uuid, json


@app.before_request
def assign_device_token():
    token = request.cookies.get("device_token")
    if token is None:
        g.device_token = str(uuid.uuid4())
        g.new_token = True
    else:
        g.device_token = token
        g.new_token = False


@app.after_request
def set_device_cookie(response):
    if g.get("new_token"):
        response.set_cookie(
            "device_token", g.device_token,
            httponly=True, samesite="Lax",
            max_age= 60 * 60 * 24 * 365,
        )

    return response



@app.route("/save", methods=["POST"])
def save():
    data = request.get_json(silent=True)
    if data is None or "state" not in data:
        return jsonify({"error": "save didn't work, try again"}), 400
    
    state_json = json.dumps(data["state"])
    finished = int(bool(data.get("finished")))
    db = get_db()

    task_id = data.get("task_id")
    if task_id is None:
        if not data.get("assignment"):
            return jsonify({"error": "No assignment"}), 400

        cur = db.execute("INSERT INTO tasks (device_token, assignment, state_json, finished) VALUES (?, ?, ?, ?)", (g.device_token, data.get("assignment"), state_json, finished))
        db.commit()
        return jsonify({"task_id": cur.lastrowid})
    else:
        cur = db.execute("UPDATE tasks SET state_json = ?, finished = ?, updated_at = datetime('now') WHERE id = ? AND device_token = ?", (state_json, finished, data.get("task_id"), g.device_token))
        db.commit()
        if cur.rowcount == 0:
            return jsonify({"error": "task not found"}), 404
        return jsonify({"task_id": task_id})


@app.route("/load", methods=["GET"])
def load():
    db = get_db()
    row = db.execute("SELECT * FROM tasks WHERE device_token = ? AND finished = 0 ORDER BY updated_at DESC LIMIT 1", (g.device_token,)).fetchone()
    if row is None:
        return jsonify({"task": None})
    return jsonify({"task": {
        "task_id": row["id"],
        "assignment": row["assignment"],
        "state": json.loads(row["state_json"]),
    }})



@app.errorhandler(ModelOutputError)
def handle_model_error(e):
    return jsonify({"error": "We hit a snag turning that into steps, that's on our end, not yours. Give it another go."}), 502


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/breakdown", methods=["POST"])
def steps():
    data = request.get_json(silent=True)

    if not data or not data.get("assignment"):
        return jsonify({"error": "Looks like there's no assignment yet. Pop your task in the box and try again."}), 400

    steps = breakdown(data.get("assignment"))
    return jsonify({"steps": steps})


@app.route("/stuck", methods=["POST"])
def stuck():
    data = request.get_json(silent=True)

    if not data or not data.get("step") or not data.get("assignment") or not data.get("reason"):
        return jsonify({"error": "Something went wrong breaking that step down. Try again in a moment."}), 400

    smaller_steps = rebreak(
        data.get("step"),
        data.get("assignment"),
        data.get("reason"),
        data.get("stall_history") or []
    )
    
    return jsonify({"steps": smaller_steps})


@app.route("/continue", methods=["POST"])
def continue_step():
    data = request.get_json(silent=True)

    if not data or not data.get("assignment"):
        return jsonify({"error": "We couldn't load your next steps just now. Give it another try."}), 400

    next_steps = continue_steps(data.get("assignment"), data.get("steps") or [])
    return jsonify({"steps": next_steps})
    
