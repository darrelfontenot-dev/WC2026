import os
from flask import Flask, send_from_directory

app = Flask(__name__, static_folder="static")


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def index(path):
    # Serve static files if they exist, otherwise serve index.html for SPA routing
    if path and os.path.exists(os.path.join(".", path)):
        return send_from_directory(".", path)
    return send_from_directory(".", "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
