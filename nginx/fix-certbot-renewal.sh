#!/bin/bash
# Script to fix certbot renewal to use webroot method

echo "Updating certbot renewal configuration to use webroot method..."

# Backup the current config
sudo cp /etc/letsencrypt/renewal/www.synvoy.com.conf /etc/letsencrypt/renewal/www.synvoy.com.conf.backup

# Update the renewal config to use webroot
sudo sed -i 's/authenticator = standalone/authenticator = webroot/' /etc/letsencrypt/renewal/www.synvoy.com.conf

# Add webroot path if not present
if ! grep -q "webroot_path" /etc/letsencrypt/renewal/www.synvoy.com.conf; then
    sudo sed -i '/\[renewalparams\]/a webroot_path = /var/www/certbot' /etc/letsencrypt/renewal/www.synvoy.com.conf
fi

echo "Renewal configuration updated!"
echo "Testing renewal..."
sudo certbot renew --dry-run

