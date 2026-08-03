from app import app
from flask import render_template, request, jsonify


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/breakdown", methods=["POST"])
def breakdown():
    data = request.get_json()
    steps = ["open doc and title it", "write one messy sentence"]
    return jsonify({"steps": steps})


