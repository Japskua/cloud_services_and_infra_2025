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

echo "building project-processor:dev..."
docker build -f processor/Dockerfile -t project-processor:dev processor/
echo "project-processor:dev DONE"