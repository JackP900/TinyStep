from app import app
from flask import render_template, request, jsonify
from app.ai import breakdown, rebreak

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/breakdown", methods=["POST"])
def steps():
    data = request.get_json()
    steps = breakdown(data.get("assignment"))
    return jsonify({"steps": steps})

@app.route("/stuck", methods=["POST"])
def stuck():
    data = request.get_json()
    step = data.get("step")
    assignment = data.get("assignment")
    reason = data.get("reason")
    stall_history = data.get("stall_history") or []
    smaller_steps = rebreak(step, assignment, reason, stall_history)
    return jsonify({"steps": smaller_steps})