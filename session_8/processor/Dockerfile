# Dockerfile
FROM python:3.12-slim-bookworm

# Copy uv from the official image
COPY --from=ghcr.io/astral-sh/uv:0.6.7 /uv /uvx /bin/

# Set work directory
WORKDIR /usr/src/app

# Set the UV_LINK_MODE to copy in order to make system to accept mounting from local filesystem 
ENV UV_LINK_MODE=copy

# Copy pyproject.toml and lockfile (if exists) for dependency installation
COPY pyproject.toml .
COPY uv.lock* ./

# Install dependencies without installing the project
# This creates an intermediate layer for better caching
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-install-project

# Copy project files
COPY . .

# Sync the project with bytecode compilation
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --compile-bytecode

# Add the virtual environment to the path
ENV PATH="/usr/src/app/.venv/bin:$PATH"

# Expose port
EXPOSE 8000

# Run the application
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]