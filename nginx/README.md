# Nginx Configuration for Synvoy

This directory contains the nginx reverse proxy configuration for www.synvoy.com.

## Setup Instructions

### 1. Point Your Domain to Your Server

In your GoDaddy DNS settings, add an A record:
- **Type**: A
- **Name**: @ (or www)
- **Value**: Your Contabo server IP address
- **TTL**: 600 (or default)

Also add:
- **Type**: A
- **Name**: www
- **Value**: Your Contabo server IP address
- **TTL**: 600

### 2. Initial Setup (Without SSL)

For the first setup, you'll need to temporarily modify `nginx.conf` to allow HTTP access:

1. Comment out the SSL certificate lines in the HTTPS server block
2. Change the HTTP server to not redirect (temporarily)
3. Start nginx to verify it works

### 3. Get SSL Certificates with Let's Encrypt

#### Option A: Using Certbot Docker Container (Recommended)

Add this to your `docker-compose.yml`:

```yaml
  certbot:
    image: certbot/certbot
    container_name: synvoy-certbot
    volumes:
      - certbot_data:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    command: certonly --webroot -w /var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d www.synvoy.com -d synvoy.com
```

Then run:
```bash
sudo docker compose up -d nginx
sudo docker compose run --rm certbot
```

#### Option B: Using Certbot on Host

1. Install certbot on your server:
```bash
sudo apt update
sudo apt install certbot
```

2. Stop nginx temporarily:
```bash
sudo docker compose stop nginx
```

3. Get certificate:
```bash
sudo certbot certonly --standalone -d www.synvoy.com -d synvoy.com
```

4. Update docker-compose volumes to mount certificates:
```yaml
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

5. Start nginx:
```bash
sudo docker compose up -d nginx
```

### 4. Update Frontend API URL

Make sure your frontend is configured to use the API at `https://www.synvoy.com/api`:

Set in `.env` or `docker-compose.yml`:
```
NEXT_PUBLIC_API_URL=https://www.synvoy.com/api
```

### 5. Start All Services

```bash
sudo docker compose up -d
```

## Renewal

SSL certificates expire every 90 days. Set up automatic renewal:

### Using Cron

Add to crontab:
```bash
sudo crontab -e
```

Add this line:
```
0 0 * * * docker compose -f /path/to/docker-compose.yml run --rm certbot renew && docker compose -f /path/to/docker-compose.yml exec nginx nginx -s reload
```

### Using Certbot on Host

```bash
sudo certbot renew --dry-run  # Test
sudo certbot renew  # Actual renewal
sudo docker compose exec nginx nginx -s reload
```

## Testing

- HTTP should redirect to HTTPS: `http://www.synvoy.com` → `https://www.synvoy.com`
- Frontend: `https://www.synvoy.com`
- API: `https://www.synvoy.com/api/auth/login`
- Health check: `https://www.synvoy.com/health`

## Troubleshooting

### Check nginx logs:
```bash
sudo docker logs synvoy-nginx
```

### Test nginx configuration:
```bash
sudo docker compose exec nginx nginx -t
```

### Reload nginx:
```bash
sudo docker compose exec nginx nginx -s reload
```

### Check SSL certificate:
```bash
sudo docker compose exec nginx openssl s_client -connect www.synvoy.com:443 -servername www.synvoy.com
```


