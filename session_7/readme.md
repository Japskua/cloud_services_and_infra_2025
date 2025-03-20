# Cloud Services & Infrastructure - Session 6 - Productionizing the Application & CI/CD Pipeline in GitHub

Goal: Deploy the full system to a cloud provider.
Topics & Hands-on:

1. Setting up Docker Swarm on a cloud server
2. Deploying containers using Portainer

**Project Task:** Project Task: Teams deploy to a cloud server.

0. Prerequisites

In order to continue, you need to have a working production version of the system, and a place where to store the Docker images. If you have followed the sessions so far, you should have GitHub Container Registry, with working production Docker images for deployment.

You will also need a domain name in order to continue. Without proper domain, you cannot get HTTPS working.

You can get cheap domain like `blueblackgreenorange.biz` or something for 1-5 dollars a year. You could try to search for such domains from https://porkbun.com/products/domains. But get one from somewhere.

## 1. Setting up Docker Swarm on a cloud server

Now, we finally get to the point of setting up the full system and getting it to work online, in a real production environment.
For this tutorial, you can use any cloud provider you want. I will be demonstrating this using Digital Ocean, as it is easy to use.

You can use the referral code below to get $200 in credit for Digital Ocean.
Referral Code: https://m.do.co/c/a6ede09eeb46

You should also be able to get Microsoft Azure credits with student email from https://azure.microsoft.com/en-us/pricing/offers/ms-azr-0170p

The following steps are for Digital Ocean, but the process is similar for other cloud providers. I am just selecting the simplest one.

### 1.1. Create droplets

We are going to get cheapest possible droplets from Digital Ocean. Droplets here mean virtual machines. So we are going to get just the bare Linux server and that's it. No extra software, no extra services. Just a Linux server. That's why you can follow the same instructions in any place, and we are also not vendor locking ourselves to one provider. We can always set up the same system in any other cloud provider.

1. Create -> Droplets
2. Select Region to be Frankfurt -> Datacenter FRA1 (there are currently no others)
3. Choose an image -> Ubuntu 24.04 LTS x64
4. Choose size -> Basic -> CPU options -> Regular SSD -> 1 CPU, 1GB RAM, 25GB SSD (this is something like 6 USD per month)
5. Additional storage and backups can be left out for now (they are not needed for learning, but can be handy in real-life scenarios)
6. Choose Authentication Method -> SSH Key (If you don't have one, create and add one with "New SSH Key" button)
7. Add improved metrics monitoring and alerting (free)
8. Advanced Options -> Enable IPv6
9. Finalize Details
    - -> Quantityy -> 2
    - -> Hostname: lut-project-swarm-manager, lut-project-swarm-worker-1
10. Create Droplet

!!NOTE!!
You need to run the following settings for EVERY DOCKER DROPLET!!

### 1.2. Connect to Droplet and create the dockeruser

You can now access the droplets using SSH (your SSH key should work, so no need for password to access the droplets).

```bash
ssh root@<IP_ADDRESS>
```

Next, create a docker-user. We don't want to run as a root user, as it is not a good practice.
_NOTE! DO NOT CREATE ”docker” named user, as the entire docker will break!_

(on the remote machine)

```bash
adduser dockeruser
```

Give a name an let everything else be empty.

Then, we need to give sudo permissions to this user

```bash
usermod -aG sudo dockeruser
mkdir /home/dockeruser/.ssh
cp .ssh/authorized_keys /home/dockeruser/.ssh/authorized_keys
# And give the proper permissions for the new files
chown -R dockeruser:dockeruser /home/dockeruser/.ssh
chmod 700 /home/dockeruser/.ssh
chmod 600 /home/dockeruser/.ssh/authorized_keys
```

Now, you should be able to log in as dockeruser. We will be using that from this point onwards.
So, `exit` from the root user and log in as dockeruser.

```bash
ssh dockeruser@<IP_ADDRESS>
```

### 1.3 Install ufw and Docker

As the dockeruser on the machine, run the following commands:

```bash
sudo apt update
sudo apt upgrade
sudo apt autoremove
# Now, allow SSH to firewall and enable it
sudo ufw allow OpenSSH
sudo ufw enable
```

Next, we need to install Docker. Let's follow the instructions from Digital Ocean's website on installing Docker. Read the instructions from here: https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-22-04

Basically, it is the following:

```bash
sudo apt update
sudo apt install apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install docker-ce
```

And now if you run `sudo systemctl status docker` you should see that the Docker service is running.

Next, we want to add the docker execution for the dockeruser, so that we don't need to use sudo for docker commands.

```bash
sudo usermod -aG docker ${USER}
# To apply the new membership, exit the session and log back in.
# OR, run the  following command to apply the new membership immediately
su - ${USER}
```

Test that docker is working

```bash
docker run hello-world
```

### 1.4 Configure Docker Swarm & Firewall

Here is (a very old) Digital Ocean post on Linux Firewall configurations for Docker: https://www.digitalocean.com/community/tutorials/how-to-configure-the-linux-firewall-for-docker-swarm-on-ubuntu-16-04

Check it for more information.
Meanwhile, we just allow the following ports (notice that we are using eth1 interface. This is the Digital Ocean internal network):

```bash
sudo ufw allow OpenSSH
sudo ufw allow in on eth1 to any port 2376
sudo ufw allow in on eth1 to any port 2377
sudo ufw allow in on eth1 to any port 7946
sudo ufw allow in on eth1 to any port 4789
sudo ufw allow in on eth1 to any port 50
sudo ufw allow in on eth1 to any port 9000
sudo ufw allow in on eth1 to any port 9001
sudo ufw allow in on eth1 to any port 9443
```

### 1.5 Install loki-driver

We will be using loki as the logging driver in the later sessions. So, let's install it, so we won't run into problems later. Again, remember to run this in all the droplets.

```bash
docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions
```

### 1.6 Create the Docker Swarm

We are connecting the two droplets as a Docker Swarm. The first droplet will be the manager, and the second one will be the worker.
You can check for the private IP from the Digital Ocean dashboard of the droplet.

Run the following command on the manager droplet:

```bash
docker swarm init --advertise-addr <PRIVATE_IP>
```

You will receive a command with join-token that you need to run on the worker droplet.

Run the following command on the worker droplet:

```bash
docker swarm join --token <JOIN_TOKEN>
```

After this, you do not need to access the worker droplets anymore. Everything will be done from the manager droplet.

### 1.7 Setting the URL for the Docker Swarm

In the Digital Ocean, navigate to Networking -> domains.
Add the domains of our service to point to the manager droplet. For our example this would be:

-   `traefik.myservice.com`
-   `portainer.myservice.com`
-   `app.myservice.com`
-   `auth.myservice.com`
-   `backend.myservice.com`
-   `processor.myservice.com`

It will take some time for the new domains to target the manager droplet. Sometimes, it takes a few minutes, sometimes it takes a few hours. But if you follow this step-by-step, it should probably happen by the time you get to actually use the domains.

### 2. Deploy the services

Using the command line will get quite tedious soon. So, instead, we will be using Portainer as a graphical user interface for our Docker Swarm. This makes things much easier and nicer. So, let's start to deploy the services.

### 2.1 Deploy Create required networks and volumes

First, we need to create the networks and volumes that we will be using. Everything we do will be done in the manager droplet.

Let's create two networks, one for portainer & it's agents and a second one for our own system.

```bash
docker network create --driver overlay --attachable agent_network
docker network create --driver overlay --attachable app_network
```

Also, we want to create a volume to store portainer data and one for letsencrypt certificate data. This means, that one the machine where we are running, we are creating a folder that is then mounted to our container. This volume will persist across restarts, so no data is lost even though we shut down the container.

```bash
docker volume create portainer_data
docker volume create letsencrypt
```

### 2.2 Deploy Portainer

You can read more details from the Portainer website: https://docs.portainer.io/start/install-ce/server/swarm/linux

###### portainer-stack.yml

```yaml
version: "3.2"

services:
    agent:
        image: portainer/agent:lts
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock
            - /var/lib/docker/volumes:/var/lib/docker/volumes
        networks:
            - agent_network
        deploy:
            mode: global
            placement:
                constraints: [node.platform.os == linux]

    portainer:
        image: portainer/portainer-ce:lts
        command: -H tcp://tasks.agent:9001 --tlsskipverify
        ports:
            - "9443:9443"
            - "9000:9000"
            - "8000:8000"
        volumes:
            - portainer_data:/data
            - "/var/run/docker.sock:/var/run/docker.sock"
        networks:
            - agent_network
            - app_network
        deploy:
            mode: replicated
            replicas: 1
            placement:
                constraints: [node.role == manager]
            restart_policy:
                condition: on-failure
            labels:
                - "traefik.enable=true"
                - "traefik.http.routers.portainer.rule=Host(`portainer.myservice.com`)"
                - "traefik.http.routers.portainer.entrypoints=websecure"
                - "traefik.http.routers.portainer.tls.certresolver=myresolver"
                - "traefik.http.services.portainer.loadbalancer.server.port=9000"
                - "traefik.docker.network=app_network"

networks:
    agent_network:
        external: true
    app_network:
        external: true

volumes:
    portainer_data:
        external: true
```

Copy this into the docker master droplet and run the following command:

```bash
nano portainer-stack.yml
# Paste the content of the file
# And then, run the following command
docker stack deploy -c portainer-stack.yml portainer-stack
```

Now, we should be able to access our portainer at the http://<ip_address>:9000. Not yet in the URL, as we are not running traefik yet.

Go to that address, and create yourself the admin credentials.

### 2.3 Setting up permissions to ghcr.io

Now that we have portainer running, we need to set up the permissions to access ghcr.io.

1. Navigate to Registries
2.  - Add Registry
3. Ghcr.io -> Add the credentials
4. Click update

Now we should be able to pull the images from our private ghcr.io registry. (Mine are actually public, so we can pull them without any issues.)

### 2.3 Creating secrets

We cannot store sensitive information in our docker-compose files. So, we will need to be using docker secrets. The most important for now is to just create Digital Ocean authentication token. This is what Traefik will use to access the Digital Ocean API and create the TLS certificates with letsencrypt.

0. Create Digital Ocean Personal Access Token (see https://docs.digitalocean.com/reference/api/create-personal-access-token/)
1. Navigate to Secrets -> Add secret
2. Create a new secret, naming it `do_token`. Put the token you created in the previous step.
3. Add another new secret, name it `traefik_users`. This will contain the login credentials for traefik. Format: `username:password`.
4. Add another new secret, name it `prometheus_users`. This will contain the login credentials for prometheus (monitoring, that we will introduce later). Format: `username:password`.

### 2.4 Creating the traefik stack

Now, we are going to create a stack for traefik. Instead of having ALL our services in one yaml stack file, it is nicer to deploy these separately. We will deploy the traefik stack first, and then the other services.

1. Navigate to Stacks -> Add Stack
2. Name the stackk `traefik-stack`
3. Paste the following content into the yaml file. (Make sure to change the URL properly)
4. After this, you should be able to log in from the address https://traefik.myservice.com

###### traefik-stack.yml

```yaml
version: "3.7"

services:
    traefik:
        image: traefik:v2.11.21
        logging:
            options:
                max-size: 50m
        command:
            - "--api.insecure=false"
            - "--providers.docker=true"
            - "--providers.docker.swarmmode=true"
            - "--providers.docker.watch"
            - "--providers.docker.exposedbydefault=false"
            - "--entrypoints.websecure.address=:443"
            # SSL Configurations
            - "--certificatesresolvers.myresolver.acme.email=japskua@gmail.com"
            - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
            - "--certificatesresolvers.myresolver.acme.dnschallenge=true"
            - "--certificatesResolvers.myresolver.acme.dnsChallenge.provider=digitalocean"
            - "--certificatesResolvers.myresolver.acme.dnsChallenge.delayBeforeCheck=0"
            # Comment this to go into production
            # - "--certificatesResolvers.myresolver.acme.caServer=https://acme-staging-v02.api.letsencrypt.org/directory"
            # Metrics definitions
            - "--metrics.prometheus=true"
            - "--metrics.prometheus.buckets=0.1,0.3,1.2,5.0"
            - "--metrics.prometheus.addEntryPointsLabels=true"
            - "--metrics.prometheus.addServicesLabels=true"
            - "--metrics.prometheus.manualrouting=true"
        volumes:
            - "/var/run/docker.sock:/var/run/docker.sock:ro"
            - "letsencrypt:/letsencrypt"
        environment:
            - DO_TOKEN_FILE=/run/secrets/do_token
        secrets:
            - do_token
            - prometheus_users
            - traefik_users
        ports:
            - "443:443"
        networks:
            - app_network
        deploy:
            replicas: 1
            placement:
                constraints:
                    - node.role == manager
            restart_policy:
                condition: on-failure
            labels:
                - "traefik.enable=true"
                - "traefik.docker.network=app_network"
                # Configure the Dashboard
                - "traefik.http.routers.traefik.rule=Host(`traefik.myservice.com`)"
                - "traefik.http.routers.traefik.entrypoints=websecure"
                - "traefik.http.routers.traefik.tls.certresolver=myresolver"
                - "traefik.http.services.traefik.loadbalancer.server.port=9999"
                - "traefik.http.routers.traefik.service=api@internal"
                - "traefik.http.routers.traefik.middlewares=traefik-auth"
                - "traefik.http.middlewares.traefik-auth.basicauth.usersfile=/run/secrets/prometheus_users"
                # The prometheus metrics configs
                - "traefik.http.routers.metrics.rule=Host(`traefik.myservice.com`) && Path(`/metrics`)"
                - "traefik.http.routers.metrics.entrypoints=websecure"
                - "traefik.http.routers.metrics.tls.certresolver=myresolver"
                - "traefik.http.routers.metrics.service=prometheus@internal"
                - "traefik.http.routers.metrics.middlewares=prometheus-auth"
                - "traefik.http.middlewares.prometheus-auth.basicauth.usersfile=/run/secrets/prometheus_users"

secrets:
    traefik_users:
        external: true
    prometheus_users:
        external: true
    do_token:
        external: true

volumes:
    letsencrypt:
        external: true

networks:
    app_network:
        external: true
```
