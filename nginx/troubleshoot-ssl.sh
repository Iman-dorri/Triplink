#!/bin/bash
# Script to troubleshoot SSL certificate issues

echo "=== Checking DNS Configuration ==="
echo "Checking if domains point to this server..."
echo ""
echo "synvoy.com A record:"
dig +short synvoy.com A
echo ""
echo "www.synvoy.com A record:"
dig +short www.synvoy.com A
echo ""
echo "Current server IP (from ifconfig):"
ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1
echo ""

echo "=== Checking Port 80 ==="
echo "Is port 80 listening?"
sudo netstat -tlnp | grep :80 || sudo ss -tlnp | grep :80
echo ""

echo "=== Checking Firewall ==="
echo "UFW status:"
sudo ufw status | grep -E "(80|443|Status)" || echo "UFW not installed or not active"
echo ""

echo "=== Testing HTTP Access ==="
echo "Testing if port 80 is accessible from localhost:"
curl -I http://localhost 2>&1 | head -5 || echo "Cannot connect to localhost:80"
echo ""

echo "=== Testing External Access ==="
echo "Your server IP appears to be: 173.249.63.246"
echo "Testing if port 80 is accessible externally..."
echo "You can test this from another machine with: curl -I http://173.249.63.246"
echo ""

echo "=== Recommendations ==="
echo "1. Verify DNS: Make sure synvoy.com and www.synvoy.com point to 173.249.63.246"
echo "2. Check firewall: sudo ufw allow 80/tcp && sudo ufw allow 443/tcp"
echo "3. Check Contabo firewall: Log into Contabo control panel and ensure ports 80/443 are open"
echo "4. Wait for DNS propagation (can take up to 48 hours, usually 1-2 hours)"


