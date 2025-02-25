#!/bin/bash
# build_docker_images.sh
# Builds the docker images for the project
echo "Starting to build the docker images..."

echo "building project-backend:dev..."
docker build -f backend/Dockerfile -t project-backend:dev backend/
echo "project-backend:dev DONE"