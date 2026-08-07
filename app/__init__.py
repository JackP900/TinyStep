from flask import Flask
from app.db import init_db, close_db

app = Flask(__name__)

init_db()
app.teardown_appcontext(close_db)

from app import routes