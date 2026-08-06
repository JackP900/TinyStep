from flask import Flask
from app.db import init_db

app = Flask(__name__)

init_db()

from app import routes