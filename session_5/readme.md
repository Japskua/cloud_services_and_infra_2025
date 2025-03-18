# Cloud Services & Infrastructure - Session 4 - Authentication system

Goal: Introduce long-running microservice & productionize frontend
Topics & Hands-on:

1. Creating a Python microservice (simple processing task)
2. Connecting it to the backend API
3. Set up Nginx to serve the frontend (production-mode)

**Project Task:** Teams create a microservice for additional processing + dockerize frontend for serving

## 0. Creating certificates

We are adding one more microservice to our application. This one will be called `processor`. So, create the localhost certificate for `processor.localhost`.

## 1. Create a Python microservice

We will create a simple recommendation system for our application. It will be a simple Python microservice. This will take user's written text and recommend a book based on the text.

We will be using `uv` to specify the Python environment securely. Go and read more about [uv here](https://docs.astral.sh/uv/).

```sh
mkdir processor
cd processor
uv init --app
# If using OSX, run (something else for other OS)
source .venv/bin/activate
```

```
# Project structure
# processor/
# ├── app/
# │   ├── __init__.py
# │   ├── main.py
# │   ├── model.py
# │   ├── schemas.py
# │   └── config.py
# ├── data/
# │   └── books.json
# ├── Dockerfile
# ├── requirements.txt
# └── README.md
```
