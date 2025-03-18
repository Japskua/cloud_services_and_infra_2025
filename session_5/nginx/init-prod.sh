
#!/usr/bin/env bash
envsubst '$$SERVER_UI_NAME' < /etc/nginx/nginx-prod.template > /etc/nginx/nginx.conf && cat /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'