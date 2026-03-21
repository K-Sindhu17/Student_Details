#!/bin/sh
# Smart entrypoint: use HTTPS config if certs exist, otherwise HTTP-only

CERT_PATH="/etc/letsencrypt/live/sindhu-kodaboina.com/fullchain.pem"

if [ -f "$CERT_PATH" ]; then
    echo "SSL certificates found — starting with HTTPS"
    cp /etc/nginx/conf.d/nginx-ssl.conf /etc/nginx/conf.d/default.conf
else
    echo "No SSL certificates — starting with HTTP only"
    cp /etc/nginx/conf.d/nginx-init.conf /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
