# Cloud Services & Infrastructure - Session 3 - Authentication system

Goal: Implement user authentication & security.
Topics & Hands-on:

1. Creating a new user authentication services
2. Setting up JWT-based authentication in Bunjs
3. Securing API endpoints
4. Login/logout flow in the frontend

**Project Task:** Teams integrate authentication into their systems.

## 1. Creating a new user authentication services

We will be using the Bun.js package called `auth` for this. It is a simple authentication package that allows you to create users, login, logout, and verify tokens.

Let's create the new auth service as we did with the backend.

```sh
bun create elysia auth
cd auth
# Let's add couple of dependencies
bun add @elysiajs/jwt @elysiajs/cors @elysiajs/bearer @elysiajs/swagger
bun dev
```

Change the project to be run in a different port, for example 3001.

###### **auth/src/index.ts**

```ts
import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";

const app = new Elysia()
    .use(swagger())
    .use(cors())
    .get("/", () => "Hello from auth!")
    .listen(3001);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
```

Next, create the Dockerfile and .dockerignore for the auth service. (Check from session 2 how to do this.).
Update the build_docker_images.sh to build the auth service as well.

###### **build_docker_images.sh**

```bash
#!/bin/bash
# build_docker_images.sh
# Builds the docker images for the project
echo "Starting to build the docker images..."

echo "building project-auth:dev..."
docker build -f auth/Dockerfile -t project-auth:dev auth/
echo "project-auth:dev DONE"

echo "building project-backend:dev..."
docker build -f backend/Dockerfile -t project-backend:dev backend/
echo "project-backend:dev DONE"

echo "building project-ui:dev..."
docker build -f ui/Dockerfile -t project-ui:dev ui/
echo "project-ui:dev DONE"
```
