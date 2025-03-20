# Use a lightweight Python base image
FROM python:3.12-slim-bookworm AS builder

# Install necessary system dependencies for building
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy uv from the official image
COPY --from=ghcr.io/astral-sh/uv:0.6.7 /uv /uvx /bin/

# Set work directory
WORKDIR /usr/src/app

# Set the UV_LINK_MODE to copy to enable local mounting
ENV UV_LINK_MODE=copy

# Copy dependency files
COPY pyproject.toml .
COPY uv.lock* ./

# Install dependencies without installing the project (cache optimized)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-install-project

# Copy project files
COPY . .

# Sync and compile bytecode
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --compile-bytecode

# Remove build dependencies to reduce image size
RUN apt-get remove -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN useradd -m -d /usr/src/app appuser && \
    chown -R appuser:appuser /usr/src/app

# Switch to the non-root user
USER appuser

# Expose port
EXPOSE 8000

# Add virtual environment to the path
ENV PATH="/usr/src/app/.venv/bin:$PATH"

# Define the command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]