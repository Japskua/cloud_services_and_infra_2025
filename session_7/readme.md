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
