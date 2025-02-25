# Cloud Services & Infrastructure - Session 3 - Frontend & Nginx

Goal: Deploy the React UI served through Nginx.
Topics & Hands-on:

1. Create a basic React UI (starting from a template)
2. Dockerize the frontend
3. Connect frontend to backend
4. Set up Nginx to serve the frontend (production-mode)

**Project Task:** Teams set up their initial repo and infrastructure. Teams start to implement their backend, frontend and database.

## 0. Project Setup, Prerequisites

**NOTE!** Remember to run run the certificates creation for the project! This time we need app.localhost, backend.localhost, traefik.localhost and postgres.localhost. If you don't remember how to do that, check the previous session or `certificates.md` from the project root.

In addition, you should have a working traefik, backend and database. We are building on top of that. If you do not have them, check the previous Session 2.

## 1. Create a basic React UI (starting from a template)

Well, we already have Bun.js installed, so lets use it to create a new React project.

1. In the project root folder, run `bun create vite ui --template react-ts` to create a new React project with TypeScript in the folder ui/.
2. Run `cd ui`
3. Install the dependencies with `bun install`
4. Run `bun dev` to check that the development server works. Now you should be able to access the UI at http://localhost:5173/.

## 2. Dockerize the frontend

Because we can! Let's dockerize the frontend to run in a container also in the development environment. This is the same as the backend, but with a different Dockerfile.

1. Create a new file called `Dockerfile` in the ui/ folder.
2. Copy the following content into the file:

##### ui/Dockerfile

```dockerfile
# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.2.3
WORKDIR /usr/src/app
COPY package*.json .
RUN bun install
COPY . .
CMD ["bun", "dev"]
```

3. Add the build command for our ui in the build_docker_images.sh script.

##### build_docker_images.sh

```bash
#!/bin/bash
# build_docker_images.sh
# Builds the docker images for the project
echo "Starting to build the docker images..."

echo "building project-backend:dev..."
docker build -f backend/Dockerfile -t project-backend:dev backend/
echo "project-backend:dev DONE"

echo "building project-ui:dev..."
docker build -f ui/Dockerfile -t project-ui:dev ui/
echo "project-ui:dev DONE"
```

4. Create the .dockerignore file in the ui/ folder.

##### ui/.dockerignore

```
node_modules
Dockerfile*
docker-compose*
.dockerignore
.git
.gitignore
README.md
LICENSE
.vscode
Makefile
.env
.editorconfig
.idea
coverage*
```

5. Run the build script with `./build_docker_images.sh`
6. Let's add all requirements to the docker-compose.yml file.

NOTE: We are not showing the full docker-compose.yml file here, but you can find it in the project root folder.
Here are just the settings for the ui service:

##### docker-compose.yml

```yaml
services:
    ui:
        image: project-ui:dev # This is the image we have built. If missing, check build_docker_images.sh
        volumes:
            - ./ui:/usr/src/app # We want to mount our local ui folder to the container
            - /usr/src/app/node_modules # A neat trick: We want to make sure the container node_modules does not get written by our local node_modules
        networks:
            - cloud_project # Note the network is the same as for traefik! Otherwise this won't work!
        command: bun dev -- --host # We want to add the --host so that we can access the frontend from outside the container
        labels:
            - "traefik.enable=true"
            - "traefik.http.routers.ui.rule=Host(`app.localhost`)" # This is the ui service URL
            - "traefik.http.routers.ui.entrypoints=websecure"
            - "traefik.http.routers.ui.tls=true"
            - "traefik.http.services.ui.loadbalancer.server.port=5173"
```

7. Now, if you run `docker compose up`, you should be able to access the UI at https://app.localhost
