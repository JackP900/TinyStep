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
    smaller_steps = rebreak(step, data, )
    smaller_steps = ["open the doc", "title the doc", "write a singluar messy sentence", ]
    return jsonify({"steps": smaller_steps, "assignment": data.get("assignment")})