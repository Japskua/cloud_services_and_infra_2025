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

echo "Building the production ui"
echo "building project-ui:prod..."
docker build -f ui/production.Dockerfile -t project-ui:prod ui/
echo "project-ui:prod DONE"

echo "building the project-nginx:prod..."
docker build -f nginx/Dockerfile -t project-nginx:prod nginx/

echo "building the project-nginx:prod DONE"
echo "Building the production ui DONE"

echo "building project-processor:dev..."
docker build -f processor/Dockerfile -t project-processor:dev processor/
echo "project-processor:dev DONE"