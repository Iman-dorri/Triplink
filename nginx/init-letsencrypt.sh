#!/bin/bash

# Script to initialize Let's Encrypt certificates
# Run this once to get SSL certificates

if ! [ -x "$(command -v docker compose)" ]; then
  echo 'Error: docker compose is not installed.' >&2
  exit 1
fi

domains=(www.synvoy.com synvoy.com)
rsa_key_size=4096
data_path="./certbot"
email="" # Adding a valid address is strongly recommended
staging=0 # Set to 1 if you're testing your setup to avoid hitting rate limits

echo "### Requesting Let's Encrypt certificate for $domains ..."
# Select appropriate email arg
case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $email" ;;
esac

# Enable staging mode if needed
if [ $staging != "0" ]; then staging_arg="--staging"; fi

# Join $domains to -d args
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

# Prepare nginx for certbot
echo "### Starting nginx temporarily for certbot ..."
docker compose up -d nginx

# Wait for nginx to be ready
sleep 5

# Request certificate
docker compose run --rm certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --agree-tos \
    --force-renewal

echo "### Reloading nginx ..."
docker compose exec nginx nginx -s reload


