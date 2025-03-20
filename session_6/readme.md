# Cloud Services & Infrastructure - Session 6 - Productionizing the Application & CI/CD Pipeline in GitHub

Goal: Automate deployments using CI/CD.
Topics & Hands-on:

1. Creating production-ready Docker images for all our services
2. Writing a GitHub Actions workflow for backend/frontend
3. Automating Docker builds and pushes

**Project Task:** Project Task: Teams set up CI/CD for automated builds.

## 1. Creating production-ready Docker images for all our services

In our previous session, we created the production-ready Docker image for our user interface (nginx). Now, we will create the production-ready Docker images for the rest of our services. This means `auth`, `backend` and `processor` services.

For bun, we will be using the bytecode-compilation to create a single file for fast startup. Check the link for more information: https://bun.sh/docs/bundler/executables#deploying-to-production

### 1.1. Creating a production-ready Docker image for the `auth` and `backend` service

First, we should make sure the bun commands work on your local machine. Let's test that by running the following command in your auth/ folder:

```bash
cd auth
bun build --compile --minify --sourcemap --bytecode src/index.ts --outfile auth
./auth
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

Now, lets update the `build_production_images.sh` script to build the production-ready Docker images for the `auth` and `backend` services.

##### `build_production_images.sh`

```bash
# Start is omitted
echo "building project-auth:prod..."
docker build -f auth/production.Dockerfile -t project-auth:prod auth/
echo "project-auth:prod DONE"

echo "building project-backend:prod..."
docker build -f backend/production.Dockerfile -t project-backend:prod backend/
echo "project-backend:prod DONE"
# continues like the old part...
```

Now, we should be able to run these with the docker-compose. Let's update and try it

##### `docker-compose-prod.yml`

```yaml
auth:
    image: project-auth:prod # This is the image we have built. If missing, check build_production_images.sh
    networks:
        - cloud_project
    environment:
        - JWT_SECRET=secret
    labels:
        - "traefik.enable=true"
        - "traefik.http.routers.auth.rule=Host(`auth.localhost`)"
        - "traefik.http.routers.auth.entrypoints=websecure"
        - "traefik.http.routers.auth.tls=true"
        - "traefik.http.services.auth.loadbalancer.server.port=3001"

backend:
    image: project-backend:prod
    networks:
        - cloud_project
    environment:
        - POSTGRES_URL=postgres://user:password@postgres:5432/projectdb
        - JWT_SECRET=secret
    labels:
        - "traefik.enable=true"
        - "traefik.http.routers.backend.rule=Host(`backend.localhost`)"
        - "traefik.http.routers.backend.entrypoints=websecure"
        - "traefik.http.routers.backend.tls=true"
        - "traefik.http.services.backend.loadbalancer.server.port=3000"
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
