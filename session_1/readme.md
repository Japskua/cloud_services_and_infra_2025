# Cloud Services & Infrastructure - Session 1 - Project kickoff & environment setup

Goal: Ensure everyone has the required setup to start coding.
Topics & Hands-on:

1. Clone project template from GitHub (if provided)
2. Set up Docker, Docker Compose, and Docker Swarm
3. Running a sample container locally
4. Creating a simple Docker Compose setup
5. Basic Traefik setup for reverse proxying
6. Setting the HTTPS localhost certificate for Traefik

    Project Task: Teams set up their initial repo and infrastructure.

### Note for VSCode users

Handy tools to use with docker-compose are the Docker extension and Docker Compose extension for VSCode. It allows you to easily run and stop the services.

Docker extension for VSCode: https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker
Docker Compose extension for VSCode: https://marketplace.visualstudio.com/items?itemName=p1c2u.docker-compose

## 1. Clone project template from GitHub (if provided)

Clone this project template from the GitHub repository or just create a similar new project on your own local machine.

## 2. Set up Docker, Docker Compose, and Docker Swarm

Install Docker and Docker Compose on your local machine.

1. Go to https://www.docker.com/ and download the Docker Desktop for your operating system.
2. This installs Docker Desktop, Docker Engine, Docker compose and Docker Swarm.
3. Test that the docker works by running the following command in your terminal:

```sh
docker run hello-world
```

You should get the following output:

```sh
docker run hello-world
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
c9c5fd25a1bd: Pull complete
Digest: sha256:e0b569a5163a5e6be84e210a2587e7d447e08f87a0e90798363fa44a0464a1e8
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (arm64v8)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
```

## 3. Running a sample container locally

Lets build and run a simple container locally. This time, we will be using Nodejs (https://nodejs.org/en) to create a really simple web server and Dockerize it.

If you do not have NodeJS installed, get the latest LTS version from the official website.

In addition, installing nodejs version manager is highly suggested. It allows you to easily switch between different versions of NodeJS.
You can find it from: https://github.com/nvm-sh/nvm

You can replicate the files included in the nodejs folder in order to follow along.

1. Create yourself a new folder nodejs

2. Create a new file called app.js in the nodejs folder and add the following content to it:

###### `app.js`

```javascript
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Hello World!"));
app.listen(3000, () => console.log("Server ready"));
```

3. Create package.json and install the required dependencies (only expressjs this time). Make sure to run the following commands in the nodejs folder:

```sh
npm init -y
npm install express
```

4. Test that the application works locally by running the following command in the nodejs folder:

```sh
node app.js
```

5. You should now be able to access the application by going to http://localhost:3000 in your browser.

![Example of expressjs app running in the browser](nodejs_running_screenshot.png)

6. Create a new file called Dockerfile in the nodejs folder

7. Add the following content to the Dockerfile:

###### `Dockerfile`

```Dockerfile
FROM node:22.14.0
WORKDIR /usr/src/app
COPY package*.json app.js ./
RUN npm install
EXPOSE 3000
CMD ["node", "app.js"]
```

8. Create a .dockerignore file in the nodejs folder and add the following content to it:

###### `.dockerignore`

```Dockerfile
node_modules
```

9. Lets build the docker image and see how it goes.

Remember, this must be done in the same folder as the Dockerfile.

```sh
docker build -t examplenode .
```

10. After the build is done, run the following command to run the container:

```sh
docker run -d -p 3000:3000 --name node-app examplenode
```

You should now be able to see the container running in Docker Desktop. Try also running `docker ps` to see the running containers.

```sh
CONTAINER ID   IMAGE         COMMAND                  CREATED              STATUS              PORTS                    NAMES
970980923f33   examplenode   "docker-entrypoint.s…"   About a minute ago   Up About a minute   0.0.0.0:3000->3000/tcp   node-app
```

In addition, you should be able to access the application by going to http://localhost:3000 in your browser.

Finally, stop the container by running the following command:

```sh
docker stop node-app
```

## 4. Running a sample container in docker-compose

In this section, we will start using docker-compose to define the services we want to run. This is much easier than running everything separately on a command line. We will also use a docker-compose.yml file to define the services we want to run.

Create a new file called docker-compose.yml and put it into the root folder (in this project, we consider root to be the session_1 folder).

Add the following content to the docker-compose.yml file:

###### `docker-compose.yml`

```yaml
services:
    node-app:
        image: examplenode # This is the image we have built
        ports:
            - 3000:3000 # We want to open the port 3000 of the container and show it as port 3000 of the host
```

Now, you can either use your IDE (for example VSCode) to run the docker-compose.yml file or you can run the following command (in the same folder as the docker-compose.yml file):

```sh
docker-compose up
```

And you should see following similar output:

```sh
[+] Running 2/2
 ✔ Network session_1_default       Created                                                                                          0.1s
 ✔ Container session_1-node-app-1  Created                                                                                          0.0s
Attaching to node-app-1
node-app-1  | Server ready
```

And by navigating again to http://localhost:3000, you should see the same result as before.

To stop the services, use your IDE's down tools, or run the following command on commandline (in the same folder as the docker-compose.yml file):

```sh
docker-compose down
```

## 5. Basic Traefik setup for reverse proxying

In order to run multiple services in a production environment (and to test them with proper URLs locall), we need to set up a reverse proxy.
There are many options for this, but we will use Traefik: https://traefik.io/traefik/

During this course, we will not install any applications locally, but use everything via Docker. You can find the Traefik installation instructions from here: https://doc.traefik.io/traefik/getting-started/install-traefik/

### Getting started

All right! Time to get some URLs working!
First, we need to configure Traefik to work with our Docker setup.
Let's start by creating a new docker-compose-with-traefik.yml file in the root folder.

1. Create the docker-compose-with-traefik.yml file in the root folder and add the following content to it:

###### `docker-compose-with-traefik.yml`

```yaml
services:
    traefik:
        image: traefik:v3.3.3
        command:
            - "--configFile=/app/configs/traefik.toml" # This is the traefik configuration file
        volumes:
            - ./traefik/traefik.toml:/app/configs/traefik.toml:ro # We want to mount our local traefik.toml file
            - /var/run/docker.sock:/var/run/docker.sock:rw
        labels:
            - "traefik.enable=true" # We enable traefik for this service
            - "traefik.http.routers.traefik.rule=Host(`traefik.localhost`)" # This is the traefik service URL
            - "traefik.http.routers.traefik.entrypoints=websecure" # We want to use websecure as entrypoint (HTTPS)
            - "traefik.http.routers.traefik.tls=true" # Enable the HTTPS router
            - "traefik.http.routers.traefik.service=api@internal" # This is just internal configuration
        environment:
            - TZ=Europe/Helsinki # Lets set the environment variable TZ to Europe/Helsinki
        ports:
            - "80:80" # Open port 80 to the outside world
            - "443:443" # Open port 443 to the outside world
        networks:
            - cloud_project # And we use this network to connect to the other services
    node-app:
        image: examplenode # This is the image we have built
        ports:
            - 3000:3000 # We want to open the port 3000 of the container and show it as port 3000 of the host
        networks:
            - cloud_project # Note the network is the same as for traefik! Otherwise this won't work!
        labels:
            - "traefik.enable=true"
            - "traefik.http.routers.node-app.rule=Host(`node-app.localhost`)" # This is the node-app service URL
            - "traefik.http.routers.node-app.entrypoints=websecure"
            - "traefik.http.routers.node-app.tls=true"
            - "traefik.http.services.node-app.loadbalancer.server.port=3000"

networks:
    cloud_project:
        name: cloud_project # We are creating a network with the name cloud_project
        driver: bridge # We are using the bridge driver
```

2. Create the traefik folder in the root folder and create the traefik.toml file in the traefik folder.

Add the following content to the traefik.toml file:

###### `traefik.toml`

```toml
[entryPoints]
  [entryPoints.web]
    address = ":80"
  [entryPoints.websecure]
    address = ":443"

[providers]
  [providers.docker]
    endpoint = "unix:///var/run/docker.sock"
    exposedByDefault = false
    defaultRule = "Host(`{{ trimPrefix `/` .Name }}.localhost`)"

[api]
  dashboard = true

[ping]

[log]
  level = "DEBUG"
```

3. Now, run docker-compose up for the docker-compose-with-traefik.yml file.

You should be able to navigate to https://traefik.localhost and see the Traefik dashboard.
HOWEVER! This is not working quite properly yet, because we have not configured the certificates.
You will see the following error (at least in Chrome):

![HTTPS Error given by Chrome](https_error.png)

Don't worry, just click on the "Advanced" button and then click on "Proceed to traefik.localhost (unsafe)".
Now you should see the Traefik dashboard.

![Screenshot of traefik dashboard](traefik_dashboard.png)

And, if you navigate to https://node-app.localhost, you should see the same result as before (with the HTTPS warning at the start).

## 6. Adding HTTPS to the Traefik setup

We want to get rid of the annoying HTTPS warning. Otherwise, it will bug as for the rest of our lives. Traefik does create localhost certificates, but for example Chrome does not trust them, because they are not signed by a certificate authority. So, we will create our own certificates for localhost and sign the certificates.

For this, we will use mkcert tool to make our life easier. The installation instructions can be found from [mkcert](https://github.com/FiloSottile/mkcert) page.

1. Install mkcert
2. Setup local certificate authority

```sh
mkcert -install
```

3. Create certificates for the required services (this example traefik.localhost & node-app.localhost)

```sh
mkcert "*.localhost" traefik.localhost node-app.localhost localhost 127.0.0.1 ::1
```

This will generate:
• _.localhost.pem (certificate) [it will have +5 or more, depending on how many domains you have added]
• _.localhost-key.pem (private key)

4. Move the certificates to the correct folder

```sh
mkdir - traefik-ssl/
mkdir -p traefik-ssl//certs
mv _wildcard.localhost+5.pem traefik-ssl/certs/cert.pem
mv _wildcard.localhost+5-key.pem traefik-ssl/certs/key.pem
```

5. Create a new dynamic configuration file for traefik (note we are working in new folder traefik-ssl)

###### `traefik.toml`

```toml
[tls]
  [tls.stores]
    [tls.stores.default]
      defaultCertificate = { certFile = "/certs/cert.pem", keyFile = "/certs/key.pem" }

  [[tls.certificates]]
    certFile = "/certs/cert.pem"
    keyFile = "/certs/key.pem"
```

6. Update the traefik.toml to include the dynamic configuration file

###### `traefik.toml`

```toml
[entryPoints]
  [entryPoints.web]
    address = ":80"
  [entryPoints.websecure]
    address = ":443"

[providers]
  [providers.docker]
    endpoint = "unix:///var/run/docker.sock"
    exposedByDefault = false
    defaultRule = "Host(`{{ trimPrefix `/` .Name }}.localhost`)"

  [providers.file]
    filename = "/app/configs/dynamic_conf.toml"
    watch = true

[api]
  dashboard = true

[ping]

[log]
  level = "DEBUG"
```

7. Create a new docker-compose file with added root certificates and dynamic configuration file

Here are the contents for the new docker-compose file (node-app and networks part is the same as before):

###### `docker-compose-with-traefik-and-certs.yml`

```yaml
services:
    traefik:
        image: traefik:v3.3.3
        command:
            - "--configFile=/app/configs/traefik.toml" # This is the traefik configuration file
        volumes:
            - ./traefik-ssl/traefik.toml:/app/configs/traefik.toml:ro # We want to mount our local traefik.toml file
            - ./traefik-ssl/dynamic_conf.toml:/app/configs/dynamic_conf.toml:ro # We want to mount our local dynamic_conf.toml file
            - ./traefik-ssl/certs:/certs:ro # We are adding the certificates to the container as read only (:ro)
            - /var/run/docker.sock:/var/run/docker.sock:rw
        labels:
            - "traefik.enable=true" # We enable traefik for this service
            - "traefik.http.routers.traefik.rule=Host(`traefik.localhost`)" # This is the traefik service URL
            - "traefik.http.routers.traefik.entrypoints=websecure" # We want to use websecure as entrypoint (HTTPS)
            - "traefik.http.routers.traefik.tls=true" # Enable the HTTPS router
            - "traefik.http.routers.traefik.service=api@internal" # This is just internal configuration
        environment:
            - TZ=Europe/Helsinki # Lets set the environment variable TZ to Europe/Helsinki
        ports:
            - "80:80" # Open port 80 to the outside world
            - "443:443" # Open port 443 to the outside world
        networks:
            - cloud_project # And we use this network to connect to the other services
```

8. Start the new docker-compose file

Now everything should work nicely, without issues in the HTTPS certificates.

Remember! When you are adding new services, remember to create the HTTPS certificates for them as well. Otherwise you will run into issues.
