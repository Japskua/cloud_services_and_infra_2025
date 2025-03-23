
#!/usr/bin/env bash
envsubst '$$SERVER_UI_NAME $$CSP_DOMAIN' < /etc/nginx/nginx-prod.conf > /etc/nginx/nginx.conf && cat /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'