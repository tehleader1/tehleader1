import asyncio
import logging
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from werkzeug.exceptions import HTTPException

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://username:password@localhost/dbname'
db = SQLAlchemy(app)

# Configure logging
logging.basicConfig(level=logging.INFO)

class DashboardData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.String(200))

@app.errorhandler(Exception)
def handle_exception(e):
    logging.error(str(e))
    return jsonify(error=str(e)), 500

@app.route('/dashboard', methods=['GET'])
async def get_dashboard_data():
    try:
        data = await fetch_dashboard_data()  # Async fetching
        return jsonify(data)
    except Exception as e:
        raise e

async def fetch_dashboard_data():
    await asyncio.sleep(1)  # Simulate async operation
    return ['data1', 'data2', 'data3']  # Simulated data

if __name__ == '__main__':
    app.run(debug=True, threaded=True, use_reloader=False, timeout=10)