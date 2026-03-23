from flask import Blueprint, jsonify
import requests
import os


render_status_bp = Blueprint("render_status", __name__)


def _probe_primary_url():
    url = (os.environ.get("PRIMARY_PUBLIC_URL") or "https://aria.supportrd.com").strip()
    try:
        response = requests.get(url, timeout=6)
        return {
            "url": url,
            "ok": response.status_code < 500,
            "status_code": response.status_code,
        }
    except Exception as exc:
        return {
            "url": url,
            "ok": False,
            "status_code": 502,
            "error": str(exc)[:160],
        }


@render_status_bp.route("/api/status/render-health")
def render_health():
    probe = _probe_primary_url()
    return jsonify({
        "ok": True,
        "probe": probe,
        "official_pages": {
            "render_status": "https://status.render.com",
            "render_troubleshooting": "https://render.com/docs/troubleshooting-deploys",
            "render_web_services": "https://render.com/docs/web-services",
        },
    })


@render_status_bp.route("/status/502")
def bad_gateway_help():
    probe = _probe_primary_url()
    message = (
        "Service responded normally."
        if probe.get("ok")
        else "Bad gateway detected or upstream unavailable. Use official Render status/troubleshooting links."
    )
    return jsonify({
        "ok": probe.get("ok", False),
        "status": probe.get("status_code", 502),
        "message": message,
        "probe_url": probe.get("url"),
        "official_pages": {
            "status_page": "https://status.render.com",
            "troubleshooting": "https://render.com/docs/troubleshooting-deploys",
            "docs": "https://render.com/docs",
        },
    }), (200 if probe.get("ok") else 502)
