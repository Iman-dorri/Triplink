#!/bin/bash
# Script to get SSL certificate using certbot standalone method

echo "Stopping nginx to free port 80..."
sudo docker compose stop nginx

echo "Waiting for port 80 to be free..."
sleep 3

echo "Requesting SSL certificate..."
sudo certbot certonly --standalone \
  --email iman.dorri@synvoy.com \
  --agree-tos \
  --no-eff-email \
  -d www.synvoy.com \
  -d synvoy.com

if [ $? -eq 0 ]; then
    echo "Certificate obtained successfully!"
    echo "Updating docker-compose.yml to mount certificates..."
    
    # Update docker-compose.yml to mount /etc/letsencrypt
    # You'll need to manually update the nginx volumes section to include:
    # - /etc/letsencrypt:/etc/letsencrypt:ro
    
    echo "Starting nginx with SSL..."
    sudo docker compose up -d nginx
    
    echo "Done! Your site should now be accessible via HTTPS."
else
    echo "Failed to obtain certificate. Starting nginx anyway..."
    sudo docker compose up -d nginx
fi


