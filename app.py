import os
from flask import Flask, send_from_directory, abort

DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
app = Flask(__name__, static_folder=DIST_DIR)


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def index(path):
    # Serve static files from dist/ only, otherwise serve index.html for SPA routing
    if path:
        full = os.path.realpath(os.path.join(DIST_DIR, path))
        if not full.startswith(os.path.realpath(DIST_DIR)):
            abort(403)
        if os.path.isfile(full):
            return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
