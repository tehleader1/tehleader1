from flask import Blueprint,request,jsonify
from hair_ai_engine import analyze_hair
from salon_finder import find_salons

engine = Blueprint("engine",__name__)

#################################################
# HAIR SCAN AI
#################################################

@engine.route("/api/hair-scan",methods=["POST"])
def hair_scan():

    result=analyze_hair()

    return jsonify(result)

#################################################
# SALON FINDER
#################################################

@engine.route("/api/salons",methods=["POST"])
def salons():

    lat=request.json.get("lat")
    lon=request.json.get("lon")

    results=find_salons(lat,lon)

    return jsonify(results)
