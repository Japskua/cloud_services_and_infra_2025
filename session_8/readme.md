# Cloud Services & Infrastructure - Session 8 - Adding monitoring and Logging

Goal: Implement system observability.
Topics & Hands-on:

1. Using Grafana, Loki & Prometheus for monitoring
2. Logging with Docker & centralized logging services

**Project Task:** Project Task: Teams integrate monitoring tools.

## 0. Prerequisites

By now, you should have a working Docker Swarm cluster, where you are running your application.

Now, we want to add monitoring and logging to a centralized location.

Remember to add new URLs to your DNS server. These are:

-   prometheus.myservice.com
-   grafana.myservice.com
-   loki.myservice.com

## 1. Monitoring & Logging

For this, we will use the following tools:

-   Prometheus: https://prometheus.io/
    -   Prometheus is a monitoring tool that can be used to monitor your application.
-   Loki: https://grafana.com/oss/loki/
    -   Loki is a log aggregation tool that can be used to aggregate logs from various sources.
-   Grafana: https://grafana.com/
    -   Grafana is a visualization tool that can be used to visualize data from various sources.

### 1.1 Creating configurations

All of our services require a lot of configuration files.
In Digital Ocean, go to `configuration` and create a new configuration files:

1. alertmanager_config
2. loki_config
3. prometheus_config
4. promtail_config

Copy+paste the contents from this repository's `session_8/configs` folder into the configuration files.

### 1.2 Creating new secrets

We need to create new secrets for our services. We will be using the same prometheus_users as we had in the previous session. We just need to add a new secret for grafana_admin_password. So create a new secret with the following name:

-   grafana_admin_password

And add your wanted password there.

### 1.3 Creating volumes for persistent data

We do not want our data to disappear when we restart our services. So we need to create new volumes for our services.

In portainer, go to `volumes` and create new volumes (create them for the worker we have):

1. prometheus_data
2. alertmanager_data
3. grafana_data
4. grafana_provisioning
5. loki_data

### 1.4 Deploying the monitoring stack

Yes! We got to deploy the monitoring stack! One more stack! (this is the last one, I promise!)

So, the usual Stacks -> Create New Stack. We will name it `monitor-stack`.

###### `monitor-stack.yml`

```yaml
version: "3.8"

services:
    prometheus:
        image: prom/prometheus:v3.2.1
        healthcheck:
            test:
                [
                    "CMD-SHELL",
                    "wget -q --spider http://localhost:9090/-/healthy || exit 1"
                ]
            interval: 30s
            timeout: 10s
            retries: 3
        logging:
            driver: "json-file"
            options:
                max-size: "50m"
                max-file: "3"
        volumes:
            - "prometheus_data:/prometheus"
        networks:
            - app_network
        configs:
            - source: prometheus_config
              target: /prometheus_config.yml
        secrets:
            - prometheus_users
        environment:
            - TZ=Europe/Helsinki
        deploy:
            replicas: 1
            placement:
                constraints:
                    - node.role == worker
            restart_policy:
                condition: on-failure
            labels:
                - "traefik.enable=true"
                - "traefik.http.routers.prometheus.rule=Host(`prometheus.myservice.com`)" # Remember to change this!
                - "traefik.http.routers.prometheus.entrypoints=websecure"
                - "traefik.http.routers.prometheus.tls.certresolver=myresolver"
                - "traefik.http.services.prometheus.loadbalancer.server.port=9090"
                - "traefik.http.routers.prometheus.middlewares=prometheus-auth"
                - "traefik.http.middlewares.prometheus-auth.basicauth.usersfile=/run/secrets/prometheus_users"
                - "traefik.docker.network=traefik-net"
        command:
            - "--config.file=/prometheus_config.yml"
            - "--storage.tsdb.path=/prometheus"
            - "--storage.tsdb.retention.time=15d"
            - "--web.enable-lifecycle"

    alert-manager:
        image: prom/alertmanager:v0.28.1
        logging:
            driver: "json-file"
            options:
                max-size: "50m"
                max-file: "3"
        networks:
            - app_network
        volumes:
            - "alertmanager_data:/alertmanager"
        environment:
            - TZ=Europe/Helsinki
        configs:
            - source: alertmanager_config
              target: /alertmanager_config.yml
        deploy:
            replicas: 1
            placement:
                constraints:
                    - node.role == worker
            restart_policy:
                condition: on-failure
        command:
            - "--config.file=/alertmanager_config.yml"
            - "--storage.path=/alertmanager"

    grafana:
        image: grafana/grafana-oss:11.3.4
        logging:
            driver: "json-file"
            options:
                max-size: "50m"
                max-file: "3"
        networks:
            - app_network
        volumes:
            - "grafana_data:/var/lib/grafana"
            - "grafana_provisioning:/etc/grafana/provisioning"
        environment:
            - GF_SECURITY_ADMIN_PASSWORD__FILE=/run/secrets/grafana_admin_password
            - GF_SERVER_ROOT_URL=https://grafana.myservice.com
            - TZ=Europe/Helsinki
        secrets:
            - grafana_admin_password
        deploy:
            replicas: 1
            placement:
                constraints:
                    - node.role == worker
            restart_policy:
                condition: on-failure
            labels:
                - "traefik.enable=true"
                - "traefik.http.routers.grafana.rule=Host(`grafana.myservice.com`)"
                - "traefik.http.routers.grafana.entrypoints=websecure"
                - "traefik.http.routers.grafana.tls.certresolver=myresolver"
                - "traefik.http.services.grafana.loadbalancer.server.port=3000"
                - "traefik.docker.network=traefik-net"

    promtail:
        image: grafana/promtail:3.4.2
        logging:
            driver: "json-file"
            options:
                max-size: "50m"
                max-file: "3"
        networks:
            - app_network
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock:ro
            - /var/log:/var/log:ro
            - /var/lib/docker/containers:/var/lib/docker/containers:ro
        configs:
            - source: promtail_config
              target: /etc/promtail/config.yml
        command: -config.file=/etc/promtail/config.yml
        deploy:
            mode: global
            resources:
                limits:
                    memory: 128M
                reservations:
                    memory: 64M

    loki:
        image: grafana/loki:3.4.2
        logging:
            driver: "json-file"
            options:
                max-size: "50m"
                max-file: "3"
        networks:
            - app_network
        configs:
            - source: loki_config
              target: /loki_config.yaml
        volumes:
            - "loki_data:/loki"
        command: -config.file=/loki_config.yaml
        deploy:
            replicas: 1
            placement:
                constraints:
                    - node.role == worker
            restart_policy:
                condition: on-failure
            labels:
                - "traefik.enable=true"
                - "traefik.http.routers.loki.rule=Host(`loki.myservice.com`)"
                - "traefik.http.routers.loki.entrypoints=websecure"
                - "traefik.http.routers.loki.tls.certresolver=myresolver"
                - "traefik.http.services.loki.loadbalancer.server.port=3100"
                - "traefik.http.routers.loki.middlewares=loki-auth"
                - "traefik.http.middlewares.loki-auth.basicauth.usersfile=/run/secrets/prometheus_users"
                - "traefik.docker.network=traefik-net"

volumes:
    prometheus_data:
        external: true
    alertmanager_data:
        external: true
    grafana_data:
        external: true
    grafana_provisioning:
        external: true
    loki_data:
        external: true

networks:
    app_network:
        external: true

configs:
    prometheus_config:
        external: true
    alertmanager_config:
        external: true
    loki_config:
        external: true
    promtail_config:
        external: true

secrets:
    prometheus_users:
        external: true
    grafana_admin_password:
        external: true
```

### 1.5 Accessing Grafana

Now, we should be able to access Grafana at https://grafana.myservice.com. Go and try to log in.
If this is the first time you are accessing Grafana, you will be prompted to create a new password.
Create a password and log in.

Yes! Now we just need to do the final configs to our existing stacks, in order to get logs flowing to loki!

### 1.6 Configure my-stack to use Loki

Remember, in the previou session we installed a `loki driver` to each of our linux machines that are running docker. If you did not do that, you can still do it. Log to each of your linux machines and run the following command:

```bash
docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions
```

Now, we need to configure our stacks to use Loki.

Update each of your service to have the following (not for the database)

```yaml
logging:
    driver: loki
    options:
        loki-url: ${LOKI_URL}
        loki-external-labels: "container_name={{.Name}},cluster=my-stack,service_name=SERVICE_NAME,image_name={{.ImageName}}"
        max-size: 50m
```

Go to your `my-stack` stack in Portainer.

1. Replace the stack with your new config with the logging.
2. Also and add one variable called LOKI_URL and set it to `https://myuser:mypassword@loki.myservice.com/loki/api/v1/push`
    - (replace myuser and mypassword with your own credentials and loki.myservice.com with your own domain).
3. Deploy!

Now, we can finally see our logs in Grafana!

## 2. Using Grafana

We can now use Grafana to visualize our data. Let's create a dashboard and name it `My Stack`.
