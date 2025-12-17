# Deployment Guide for www.synvoy.com

This guide will help you deploy Synvoy to your Contabo server with the domain www.synvoy.com.

## Prerequisites

1. **Contabo VPS/Server** with:
   - Ubuntu 20.04+ or Debian 11+
   - Docker and Docker Compose installed
   - Root or sudo access
   - Ports 80 and 443 open in firewall

2. **Domain Configuration**:
   - Domain: www.synvoy.com (purchased from GoDaddy)
   - Access to GoDaddy DNS settings

## Step 1: Point Domain to Your Server

1. Log in to your GoDaddy account
2. Go to DNS Management for synvoy.com
3. Add/Update A records:
   - **Type**: A
   - **Name**: @
   - **Value**: Your Contabo server IP address
   - **TTL**: 600

   - **Type**: A
   - **Name**: www
   - **Value**: Your Contabo server IP address
   - **TTL**: 600

4. Wait for DNS propagation (can take up to 48 hours, usually 1-2 hours)

## Step 2: Prepare Your Server

### Install Docker and Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Add your user to docker group (optional, to avoid sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### Clone Your Repository

```bash
# Install git if not installed
sudo apt install git -y

# Clone your repository
cd /opt  # or wherever you want to deploy
git clone https://github.com/your-username/your-repo-name.git synvoy
cd synvoy
```

## Step 3: Initial Setup (Without SSL)

### 1. Use Temporary Nginx Config

```bash
# Copy the no-SSL config
cp nginx/nginx.conf.no-ssl nginx/nginx.conf
```

### 2. Update Environment Variables

Create or update `.env` file:

```bash
# Database
POSTGRES_USER=synvoy_user
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=synvoy

# Backend
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
DEBUG=False
ENVIRONMENT=production

# Frontend
NEXT_PUBLIC_API_URL=https://www.synvoy.com/api
```

### 3. Start Services (Without SSL)

```bash
# Build and start all services
sudo docker compose up -d --build

# Check logs
sudo docker compose logs -f
```

### 4. Verify Everything Works

- Test HTTP: `http://www.synvoy.com` (or your server IP)
- Test API: `http://www.synvoy.com/api/health`
- Check all containers are running: `sudo docker compose ps`

## Step 4: Set Up SSL with Let's Encrypt

### Option A: Using Certbot Docker Container (Recommended)

1. **Add certbot service to docker-compose.yml** (temporarily):

```yaml
  certbot:
    image: certbot/certbot
    container_name: synvoy-certbot
    volumes:
      - certbot_data:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

2. **Get initial certificate**:

```bash
# Make sure nginx is running
sudo docker compose up -d nginx

# Request certificate
sudo docker compose run --rm certbot certonly \
  --webroot \
  -w /var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d www.synvoy.com \
  -d synvoy.com
```

3. **Switch to SSL config**:

```bash
# Restore the SSL-enabled nginx config
git checkout nginx/nginx.conf
# Or manually copy if you modified it
```

4. **Reload nginx**:

```bash
sudo docker compose exec nginx nginx -s reload
```

### Option B: Using Certbot on Host

1. **Install certbot**:

```bash
sudo apt install certbot -y
```

2. **Stop nginx temporarily**:

```bash
sudo docker compose stop nginx
```

3. **Get certificate**:

```bash
sudo certbot certonly --standalone \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d www.synvoy.com \
  -d synvoy.com
```

4. **Update docker-compose.yml** to mount certificates:

```yaml
  nginx:
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro  # Add this line
      - certbot_www:/var/www/certbot
```

5. **Start nginx**:

```bash
sudo docker compose up -d nginx
```

## Step 5: Set Up Auto-Renewal

SSL certificates expire every 90 days. Set up automatic renewal:

### Using Cron

```bash
# Edit crontab
sudo crontab -e

# Add this line (adjust path to your docker-compose.yml)
0 0 * * * cd /opt/synvoy && docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload
```

### Or using systemd timer (Alternative)

Create `/etc/systemd/system/certbot-renewal.service`:

```ini
[Unit]
Description=Certbot Renewal
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/opt/synvoy
ExecStart=/usr/bin/docker compose run --rm certbot renew
ExecStartPost=/usr/bin/docker compose exec nginx nginx -s reload
```

Create `/etc/systemd/system/certbot-renewal.timer`:

```ini
[Unit]
Description=Run Certbot Renewal Daily

[Timer]
OnCalendar=daily
RandomizedDelaySec=3600

[Install]
WantedBy=timers.target
```

Enable:
```bash
sudo systemctl enable certbot-renewal.timer
sudo systemctl start certbot-renewal.timer
```

## Step 6: Final Configuration

### Update Frontend API URL

Make sure your frontend uses the correct API URL. Rebuild frontend:

```bash
sudo docker compose up -d --build frontend
```

### Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# If you need SSH (usually already enabled)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

## Step 7: Verify Deployment

1. **Test HTTPS**: `https://www.synvoy.com`
2. **Test API**: `https://www.synvoy.com/api/health`
3. **Test Frontend**: Should load the Synvoy homepage
4. **Test Login**: Try logging in through the web interface

## Maintenance Commands

```bash
# View logs
sudo docker compose logs -f

# Restart services
sudo docker compose restart

# Update and rebuild
git pull
sudo docker compose up -d --build

# Check SSL certificate expiry
sudo docker compose exec nginx openssl s_client -connect www.synvoy.com:443 -servername www.synvoy.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

## Troubleshooting

### Nginx won't start
```bash
# Check nginx config
sudo docker compose exec nginx nginx -t

# View nginx logs
sudo docker compose logs nginx
```

### SSL certificate issues
```bash
# Test certificate
sudo docker compose exec nginx openssl s_client -connect www.synvoy.com:443

# Check certificate files
sudo docker compose exec nginx ls -la /etc/letsencrypt/live/www.synvoy.com/
```

### DNS not resolving
```bash
# Check DNS
dig www.synvoy.com
nslookup www.synvoy.com

# Wait for propagation (can take up to 48 hours)
```

### Backend not accessible
```bash
# Check backend logs
sudo docker compose logs backend

# Test backend directly (if ports are exposed)
curl http://localhost:8000/health
```

## Security Recommendations

1. **Change default passwords** in `.env`
2. **Use strong SECRET_KEY** for JWT tokens
3. **Restrict database access** (only expose port 5433 if needed for external access)
4. **Regular updates**: `sudo apt update && sudo apt upgrade`
5. **Monitor logs**: Set up log rotation
6. **Backup database** regularly
7. **Use firewall** (ufw) to restrict access

## Backup

### Database Backup

```bash
# Create backup
sudo docker compose exec db pg_dump -U synvoy_user synvoy > backup_$(date +%Y%m%d).sql

# Restore backup
sudo docker compose exec -T db psql -U synvoy_user synvoy < backup_20231216.sql
```

## Support

For issues, check:
- Docker logs: `sudo docker compose logs`
- Nginx logs: `sudo docker compose logs nginx`
- Application logs in respective containers


