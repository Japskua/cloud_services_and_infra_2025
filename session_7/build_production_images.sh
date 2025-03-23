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