#!/bin/bash
# Script to fix external access to nginx

echo "=== Checking nginx configuration ==="
echo "Checking if nginx is listening on all interfaces..."
sudo docker compose exec nginx netstat -tlnp | grep :80 || sudo docker compose exec nginx ss -tlnp | grep :80
echo ""

echo "=== Checking UFW firewall ==="
echo "Current UFW status:"
sudo ufw status verbose
echo ""

echo "=== Checking if port 80 is open ==="
echo "Allowing port 80 in UFW..."
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
echo ""

echo "=== Checking iptables ==="
echo "Checking if iptables is blocking port 80..."
sudo iptables -L -n | grep -E "(80|443)" || echo "No specific iptables rules found"
echo ""

echo "=== Testing nginx from server ==="
echo "Testing localhost:"
curl -I http://localhost 2>&1 | head -3
echo ""

echo "=== Important: Contabo Firewall ==="
echo "You MUST configure Contabo's firewall in their control panel:"
echo "1. Log into Contabo control panel"
echo "2. Go to your VPS/server settings"
echo "3. Find Firewall/Security settings"
echo "4. Add rules to allow:"
echo "   - Port 80 (HTTP) - Inbound"
echo "   - Port 443 (HTTPS) - Inbound"
echo "5. Save and apply"
echo ""

echo "=== After fixing firewall, test with ==="
echo "From another machine: curl -I http://90.230.25.45"
echo "Or visit: http://90.230.25.45 in a browser"


