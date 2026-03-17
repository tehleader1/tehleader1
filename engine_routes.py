import json, os, datetime
from flask import jsonify, request

ENGINE_LOG = os.path.join(os.path.dirname(__file__), "content_engine_log.json")

def _load_log():
    if not os.path.exists(ENGINE_LOG):
        return []
    try:
        with open(ENGINE_LOG,"r") as f:
            return json.load(f)
    except:
        return []

def _save_log(log):
    with open(ENGINE_LOG,"w") as f:
        json.dump(log,f,indent=2)

def register_engine_routes(app):

    # run engine manually
    @app.route("/api/engine/run", methods=["POST"])
    def engine_run():
        try:
            import importlib
            ce = importlib.import_module("content_engine")
            result = ce.run_engine()

            log = _load_log()
            log.insert(0,{
                "ts":datetime.datetime.utcnow().isoformat(),
                "topic":result.get("topic"),
                "shopify_url":result.get("shopify_url"),
                "pinterest":result.get("pinterest"),
                "reddit":result.get("reddit")
            })
            _save_log(log)

            return jsonify({"ok":True,"result":result})
        except Exception as e:
            return jsonify({"error":str(e)}),500

    # dashboard feed
    @app.route("/api/dashboard/feed")
    def dashboard_feed():

        log = _load_log()

        events = []
        for r in log[:30]:
            events.append({
                "type":"content_engine",
                "title":r.get("topic"),
                "shopify":bool(r.get("shopify_url")),
                "pinterest":r.get("pinterest"),
                "reddit":r.get("reddit"),
                "ts":r.get("ts")
            })

        return jsonify({"events":events})
