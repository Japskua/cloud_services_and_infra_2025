FROM public.ecr.aws/nginx/nginx:1.27.4
LABEL Description="This is a single backend server setting configuration for nginx image"
RUN rm /etc/nginx/conf.d/default.conf
# COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY init-prod.sh /etc/nginx/init-prod.sh
COPY nginx-prod.template /etc/nginx/nginx-prod.template

# Add the built UI codes here as well
COPY --from=project-ui:prod /usr/src/app/dist /var/www/app