#!/bin/bash
# Run this script ONCE on the EC2 instance to get initial SSL certificates.
# Usage: cd ~/student-app && bash init-letsencrypt.sh

set -e

DOMAIN="sindhu-kodaboina.com"
EMAIL="sindhukodaboina2002@gmail.com"
COMPOSE_FILE="docker-compose.prod.yml"

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Get DOCKERHUB_USERNAME if not set
if [ -z "$DOCKERHUB_USERNAME" ]; then
    read -p "Enter your Docker Hub username: " DOCKERHUB_USERNAME
    export DOCKERHUB_USERNAME
fi

echo ""
echo "========================================="
echo "  SSL Certificate Setup for $DOMAIN"
echo "========================================="
echo ""

# Step 1: Make sure frontend is running (HTTP-only mode, since no certs yet)
echo "[1/4] Making sure frontend is running on port 80..."
docker compose -f "$COMPOSE_FILE" up -d frontend
sleep 5

# Step 2: Verify port 80 is accessible
echo "[2/4] Verifying nginx is responding..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "000" ]; then
    echo "ERROR: nginx is not responding on port 80. Check 'docker logs student_frontend'"
    exit 1
fi
echo "OK — nginx is responding (HTTP $HTTP_CODE)"

# Step 3: Request SSL certificate
echo "[3/4] Requesting SSL certificate from Let's Encrypt..."
docker compose -f "$COMPOSE_FILE" run --rm certbot \
    certonly --webroot \
    --webroot-path=/var/www/certbot \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal

# Step 4: Restart frontend so it picks up the certs (entrypoint will detect them)
echo "[4/4] Restarting frontend with HTTPS enabled..."
docker compose -f "$COMPOSE_FILE" restart frontend
sleep 3

echo ""
echo "========================================="
echo "  SUCCESS! HTTPS is now enabled"
echo "========================================="
echo ""
echo "  https://$DOMAIN"
echo "  https://www.$DOMAIN"
echo ""
