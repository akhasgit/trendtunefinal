import modal

app = modal.App("trendtune-api")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("requirements.txt")
    .add_local_dir(".", remote_path="/root")
)


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("trendtune-secrets")],
    timeout=300,
)
@modal.concurrent(max_inputs=10)
@modal.asgi_app()
def fastapi_app():
    import sys

    sys.path.insert(0, "/root")
    from main import app as _app

    return _app
