import os

def get_auth_headers():
    """
    Returns the authorization headers required to talk to the server API.
    Uses the WORKER_API_TOKEN environment variable.
    """
    token = os.getenv("WORKER_API_TOKEN")
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}
