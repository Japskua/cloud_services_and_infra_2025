# Cloud Services & Infrastructure - Session 6 - Productionizing the Application & CI/CD Pipeline in GitHub

Goal: Automate deployments using CI/CD.
Topics & Hands-on:

1. Creating production-ready Docker images for all our services
2. Writing a GitHub Actions workflow for automating Docker builds and pushes

**Project Task:** Project Task: Teams set up CI/CD for automated builds.

## 1. Creating production-ready Docker images for all our services

In our previous session, we created the production-ready Docker image for our user interface (nginx). Now, we will create the production-ready Docker images for the rest of our services. This means `auth`, `backend` and `processor` services.

For bun, we will be using the bytecode-compilation to create a single file for fast startup. Check the link for more information: https://bun.sh/docs/bundler/executables#deploying-to-production

### 1.1. Creating a production-ready Docker image for the `auth` and `backend` service

First, we should make sure the bun commands work on your local machine. Let's test that by running the following command in your auth/ folder:

```bash
cd auth
bun build --compile --minify --sourcemap --bytecode src/index.ts --outfile bin/auth
./bin/auth
```

This should start your application. If you navigate to `http://localhost:3001/` you should see the hello message from auth.

Great, now let's create a production-ready Docker image for the `auth` service.

##### `auth/production.Dockerfile`

```Dockerfile
# --- Build Stage ---
FROM oven/bun:1.2.5 AS builder
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy package.json and install dependencies
COPY package*.json ./
RUN bun install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the app
RUN bun build --compile --minify --sourcemap --bytecode src/index.ts --outfile bin/auth

# --- Run Stage (Minimized) ---
FROM oven/bun:1.2.5-slim AS runner
WORKDIR /app

# Copy the binary
COPY --from=builder /usr/src/app/bin/auth /app/bin/auth

# Ensure it's executable
RUN chmod +x /app/bin/auth

# Run the app directly
CMD ["/app/bin/auth"]
```

And the same for our backend.

##### `backend/production.Dockerfile`

```Dockerfile
# --- Build Stage ---
FROM oven/bun:1.2.5 AS builder
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy package.json and install dependencies
COPY package*.json ./
RUN bun install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the app
# Notice, we cannot run --bytecode here (I guess we have something incompatible going on?
# Maybe in later versions, as this feature is still in beta)
RUN bun build --compile --minify --sourcemap src/index.ts --outfile bin/backend

# --- Run Stage (Minimized) ---
FROM oven/bun:1.2.5-slim AS runner
WORKDIR /app

# Copy the binary
COPY --from=builder /usr/src/app/bin/backend /app/bin/backend

# Ensure it's executable
RUN chmod +x /app/bin/backend

# Run the app directly
CMD ["/app/bin/backend"]
```

### 1.2. Creating a production-ready Docker image for the `processor` service

This follows quite the same pattern as the other two services.

##### `processor/production.Dockerfile`

```Dockerfile
# Stage 1: Builder - Installs dependencies
FROM python:3.12-slim-bookworm AS builder

# Install necessary system dependencies for building
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy uv from the official image
COPY --from=ghcr.io/astral-sh/uv:0.6.7 /uv /uvx /bin/

# Set work directory
WORKDIR /usr/src/app

# Set UV_LINK_MODE to copy to allow mounting
ENV UV_LINK_MODE=copy

# Copy dependency files first for better caching
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

# Define the command
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 1.3. Building and testing all services locally

Now, lets update the `build_production_images.sh` script to build the production-ready Docker images for the new services.

##### `build_production_images.sh`

```bash
#!/bin/bash
# build_docker_images.sh
# Builds the docker images for the project
echo "Starting to build the docker images..."

echo "building project-auth:prod..."
docker build -f auth/production.Dockerfile -t project-auth:prod auth/
echo "project-auth:prod DONE"

echo "building project-backend:prod..."
docker build -f backend/production.Dockerfile -t project-backend:prod backend/
echo "project-backend:prod DONE"

echo "Building the production ui"
echo "building project-ui:prod..."
docker build -f ui/production.Dockerfile -t project-ui:prod ui/
echo "project-ui:prod DONE"

echo "building the project-nginx:prod..."
docker build -f nginx/Dockerfile -t project-nginx:prod nginx/
echo "building the project-nginx:prod DONE"
echo "Building the production ui DONE"

echo "building project-processor:prod..."
docker build -f processor/production.Dockerfile -t project-processor:prod processor/
echo "project-processor:prod DONE"
```

Now, we should be able to run these with the docker-compose. Let's update and try it

##### `docker-compose-prod.yml`

```yaml
auth:
    image: project-auth:prod # This is the image we have built. If missing, check build_production_images.sh
    networks:
        - cloud_project # Note the network is the same as for traefik! Otherwise this won't work!
    environment:
        - JWT_SECRET=secret # We want to set the JWT_SECRET in the environment variables. This must match the one in auth and backend!
    labels:
        - "traefik.enable=true"
        - "traefik.http.routers.auth.rule=Host(`auth.localhost`)" # This is the backend service URL
        - "traefik.http.routers.auth.entrypoints=websecure"
        - "traefik.http.routers.auth.tls=true"
        - "traefik.http.services.auth.loadbalancer.server.port=3001"
nginx:
    image: project-nginx:prod # This is the image we have built for production. If missing, check build_production_images.sh
    restart: always
    command: /bin/sh -c /etc/nginx/init-prod.sh
    networks:
        - cloud_project # Note the network is the same as for traefik! Otherwise this won't work!
    depends_on:
        - traefik
        - backend
        - processor
    environment:
        - SERVER_UI_NAME=app.localhost
        - TZ=Europe/Helsinki
    labels:
        - "traefik.enable=true"
        - "traefik.http.routers.nginx.rule=Host(`app.localhost`)" # This is the nginx ui service URL
        - "traefik.http.routers.nginx.entrypoints=websecure"
        - "traefik.http.routers.nginx.tls=true"
        - "traefik.http.services.nginx.loadbalancer.server.port=8904"
backend:
    image: project-backend:prod # This is the image we have built. If missing, check build_production_images.sh
    networks:
        - cloud_project # Note the network is the same as for traefik! Otherwise this won't work!
    environment:
        - POSTGRES_URL=postgres://user:password@postgres:5432/projectdb # This is the database URL
        - JWT_SECRET=secret # We want to set the JWT_SECRET in the environment variables. This must match the one in auth and backend!
    labels:
        - "traefik.enable=true"
        - "traefik.http.routers.backend.rule=Host(`backend.localhost`)" # This is the backend service URL
        - "traefik.http.routers.backend.entrypoints=websecure"
        - "traefik.http.routers.backend.tls=true"
        - "traefik.http.services.backend.loadbalancer.server.port=3000"

processor:
    image: project-processor:prod # This is the image we have built. If missing, check build_production_images.sh
    networks:
        - cloud_project # Note the network is the same as for traefik! Otherwise this won't work!
    environment:
        - JWT_SECRET=secret # We want to set the JWT_SECRET in the environment variables. This must match the one in auth and backend!
    labels:
        - "traefik.enable=true"
        - "traefik.http.routers.processor.rule=Host(`processor.localhost`)" # This is the backend service URL
        - "traefik.http.routers.processor.entrypoints=websecure"
        - "traefik.http.routers.processor.tls=true"
        - "traefik.http.services.processor.loadbalancer.server.port=8000"
```

## 2. Writing a GitHub Actions workflow for backend/frontend

First, we need to configure us to enable GitHub Actions to access our GitHub Container Registry (GHCR).

🔧 Step 1: Enable GitHub Actions Access to GHCR

1. Go to your GitHub Account Settings:
    - Open GitHub Settings: https://github.com/settings/profile.
2. Navigate to Developer Settings → Personal Access Tokens (PATs):
    - Go to Settings → Developer settings → Personal access tokens → Tokens (classic)
    - Click Generate new token (fine-grained does not have packages).
3. Set the Token Scope:
    - Expiration: Choose a reasonable expiration (or no expiration if needed).
    - Scopes: Select:
        - ✅ read:packages
        - ✅ write:packages
        - ✅ delete:packages (optional if you want to remove old images
4. Generate and copy the token.
    - Store this token securely.

🔧 Step 2: Add the Token as a Secret in Your Repository

1. Go to your GitHub repository.
2. Open Settings → Secrets and variables → Actions.
3. Click New repository secret.
4. Name it GHCR_PAT.
5. Paste the Personal Access Token (PAT) you generated.
6. Click Save.

### Creating a GitHub Actions Workflow

#### Automatically Building Auth Service

First, let's create by doing one build for the `auth` service. Create a new file called `.github/workflows/build_auth_docker.yaml` (notice we are creating a folder called `.github` in the root of our project!).

##### `.github/workflows/build_auth_docker.yaml`

```yaml
name: Build and Push Auth Docker Image

on:
    push:

permissions:
    contents: read
    packages: write # Ensures GitHub Actions can push packages

jobs:
    build-docker:
        runs-on: ubuntu-latest
        if: contains(github.event.head_commit.message, '[build-auth]') || contains(github.event.head_commit.message, '[build-all]')

        steps:
            - name: Checkout repository
              uses: actions/checkout@v4

            - name: Set up Docker Buildx
              uses: docker/setup-buildx-action@v3

            - name: Log in to GitHub Container Registry (GHCR)
              uses: docker/login-action@v3
              with:
                  registry: ghcr.io
                  username: ${{ github.actor }}
                  password: ${{ secrets.GHCR_PAT }}

            - name: Extract and sanitize branch name
              run: |
                  # Convert repository owner to lowercase
                  REPO_OWNER=$(echo "${{ github.repository_owner }}" | tr '[:upper:]' '[:lower:]')
                  echo "REPO_OWNER=$REPO_OWNER" >> $GITHUB_ENV

                  # Get branch name, replace '/' and '_' with '-', and convert to lowercase
                  SANITIZED_BRANCH=$(echo "${GITHUB_REF#refs/heads/}" | tr '/_' '-' | tr '[:upper:]' '[:lower:]')
                  echo "BRANCH_NAME=$SANITIZED_BRANCH" >> $GITHUB_ENV

            - name: Build Docker Image
              run: |
                  docker build -f session_6/auth/production.Dockerfile \
                    -t ghcr.io/${{ env.REPO_OWNER }}/project-auth:${{ env.BRANCH_NAME }} \
                    session_6/auth/

            - name: Push Docker Image to GHCR
              run: |
                  docker push ghcr.io/${{ env.REPO_OWNER }}/project-auth:${{ env.BRANCH_NAME }}
```

This will build our auth docker image whenever our commit message contains ['build-auth'] or ['build-all'].

Let's try this immediately! Commit and push with the message `[build-auth]`.

#### Automatically Building Nginx Service

##### `.github/workflows/build_nginx_docker.yaml`

```yaml
name: Build and Push Nginx Docker Image

on:
    push:

permissions:
    contents: read
    packages: write # Ensures GitHub Actions can push packages

jobs:
    build-docker:
        runs-on: ubuntu-latest
        if: contains(github.event.head_commit.message, '[build-nginx]') || contains(github.event.head_commit.message, '[build-all]')

        steps:
            - name: Checkout repository
              uses: actions/checkout@v4

            - name: Set up Docker Buildx
              uses: docker/setup-buildx-action@v3

            - name: Log in to GitHub Container Registry (GHCR)
              uses: docker/login-action@v3
              with:
                  registry: ghcr.io
                  username: ${{ github.actor }}
                  password: ${{ secrets.GHCR_PAT }}

            - name: Extract and sanitize branch name
              run: |
                  # Convert repository owner to lowercase
                  REPO_OWNER=$(echo "${{ github.repository_owner }}" | tr '[:upper:]' '[:lower:]')
                  echo "REPO_OWNER=$REPO_OWNER" >> $GITHUB_ENV

                  # Get branch name, replace '/' and '_' with '-', and convert to lowercase
                  SANITIZED_BRANCH=$(echo "${GITHUB_REF#refs/heads/}" | tr '/_' '-' | tr '[:upper:]' '[:lower:]')
                  echo "BRANCH_NAME=$SANITIZED_BRANCH" >> $GITHUB_ENV

            - name: Build UI Docker Image
              run: |
                  docker build -f session_6/ui/production.Dockerfile \
                    -t project-ui:prod \
                    session_6/ui/

            - name: Build Nginx Docker Image (Uses UI)
              run: |
                  docker build -f session_6/nginx/Dockerfile \
                    -t ghcr.io/${{ env.REPO_OWNER }}/project-nginx:${{ env.BRANCH_NAME }} \
                    session_6/nginx/

            - name: Push Docker Image to GHCR
              run: |
                  docker push ghcr.io/${{ env.REPO_OWNER }}/project-nginx:${{ env.BRANCH_NAME }}
```

#### Automatically Building Processor Service

##### `.github/workflows/build_processor_docker.yaml`

```yaml
name: Build and Push Processor Docker Image

on:
    push:

permissions:
    contents: read
    packages: write # Ensures GitHub Actions can push packages

jobs:
    build-docker:
        runs-on: ubuntu-latest
        if: contains(github.event.head_commit.message, '[build-processor]') || contains(github.event.head_commit.message, '[build-all]')

        steps:
            - name: Checkout repository
              uses: actions/checkout@v4

            - name: Set up Docker Buildx
              uses: docker/setup-buildx-action@v3

            - name: Log in to GitHub Container Registry (GHCR)
              uses: docker/login-action@v3
              with:
                  registry: ghcr.io
                  username: ${{ github.actor }}
                  password: ${{ secrets.GHCR_PAT }}

            - name: Extract and sanitize branch name
              run: |
                  # Convert repository owner to lowercase
                  REPO_OWNER=$(echo "${{ github.repository_owner }}" | tr '[:upper:]' '[:lower:]')
                  echo "REPO_OWNER=$REPO_OWNER" >> $GITHUB_ENV

                  # Get branch name, replace '/' and '_' with '-', and convert to lowercase
                  SANITIZED_BRANCH=$(echo "${GITHUB_REF#refs/heads/}" | tr '/_' '-' | tr '[:upper:]' '[:lower:]')
                  echo "BRANCH_NAME=$SANITIZED_BRANCH" >> $GITHUB_ENV

            - name: Build Docker Image
              run: |
                  docker build -f session_6/processor/production.Dockerfile \
                    -t ghcr.io/${{ env.REPO_OWNER }}/project-processor:${{ env.BRANCH_NAME }} \
                    session_6/processor/

            - name: Push Docker Image to GHCR
              run: |
                  docker push ghcr.io/${{ env.REPO_OWNER }}/project-processor:${{ env.BRANCH_NAME }}
```

#### Automatically Building Backend Service

##### `.github/workflows/build_backend_docker.yaml`

```yaml
name: Build and Push Backend Docker Image

on:
    push:

permissions:
    contents: read
    packages: write # Ensures GitHub Actions can push packages

jobs:
    build-docker:
        runs-on: ubuntu-latest
        if: contains(github.event.head_commit.message, '[build-backend]') || contains(github.event.head_commit.message, '[build-all]')

        steps:
            - name: Checkout repository
              uses: actions/checkout@v4

            - name: Set up Docker Buildx
              uses: docker/setup-buildx-action@v3

            - name: Log in to GitHub Container Registry (GHCR)
              uses: docker/login-action@v3
              with:
                  registry: ghcr.io
                  username: ${{ github.actor }}
                  password: ${{ secrets.GHCR_PAT }}

            - name: Extract and sanitize branch name
              run: |
                  # Convert repository owner to lowercase
                  REPO_OWNER=$(echo "${{ github.repository_owner }}" | tr '[:upper:]' '[:lower:]')
                  echo "REPO_OWNER=$REPO_OWNER" >> $GITHUB_ENV

                  # Get branch name, replace '/' and '_' with '-', and convert to lowercase
                  SANITIZED_BRANCH=$(echo "${GITHUB_REF#refs/heads/}" | tr '/_' '-' | tr '[:upper:]' '[:lower:]')
                  echo "BRANCH_NAME=$SANITIZED_BRANCH" >> $GITHUB_ENV

            - name: Build Docker Image
              run: |
                  docker build -f session_6/backend/production.Dockerfile \
                    -t ghcr.io/${{ env.REPO_OWNER }}/project-backend:${{ env.BRANCH_NAME }} \
                    session_6/backend/

            - name: Push Docker Image to GHCR
              run: |
                  docker push ghcr.io/${{ env.REPO_OWNER }}/project-backend:${{ env.BRANCH_NAME }}
```

### Making the packages public

By default, the GitHub Container Registry (GHCR) packages are private. To make them public, you need to follow these steps:

1. Go to your packages tab: https://github.com/<username>?tab=packages
2. Open the package you want to make public.
3. Click on the Package Settings button.
4. Change the Visibility to Public.
