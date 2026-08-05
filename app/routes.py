from app import app
from flask import render_template, request, jsonify
from app.ai import breakdown, rebreak, continue_steps, ModelOutputError


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
    
