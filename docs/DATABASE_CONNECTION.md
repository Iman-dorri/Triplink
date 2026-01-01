# Connecting to Docker PostgreSQL Database from IDE

## Connection Details

Based on your `docker-compose.yml` configuration:

- **Host:** `localhost` (or `127.0.0.1`)
- **Port:** `5433` (mapped from container port 5432)
- **Database:** `synvoy` (or value from `POSTGRES_DB` in `.env`)
- **Username:** `synvoy_user` (or value from `POSTGRES_USER` in `.env`)
- **Password:** Check your `.env` file for `POSTGRES_PASSWORD`

## PyCharm Professional / DataGrip

1. **Open Database Tool Window:**
   - Go to `View` → `Tool Windows` → `Database`
   - Or click the `Database` icon in the right sidebar

2. **Add Data Source:**
   - Click the `+` button → `Data Source` → `PostgreSQL`

3. **Configure Connection:**
   - **Host:** `localhost`
   - **Port:** `5433`
   - **Database:** `synvoy`
   - **User:** `synvoy_user`
   - **Password:** (enter from your `.env` file)
   - **Authentication:** `User & Password`

4. **Test Connection:**
   - Click `Test Connection` button
   - If it fails, make sure the Docker container is running: `docker-compose up -d db`

5. **Apply and OK:**
   - Click `Apply` then `OK`

## VS Code (with PostgreSQL Extension)

1. **Install Extension:**
   - Install "PostgreSQL" extension by Chris Kolkman
   - Or "SQLTools" with "SQLTools PostgreSQL/Cockroach Driver"

2. **Add Connection:**
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Type: `PostgreSQL: Add Connection` or `SQLTools: Add New Connection`

3. **Enter Details:**
   - **Connection Name:** `Synvoy Local`
   - **Host:** `localhost`
   - **Port:** `5433`
   - **Database:** `synvoy`
   - **Username:** `synvoy_user`
   - **Password:** (from `.env` file)

4. **Connect:**
   - Click `Connect` or save the connection

## DBeaver (Universal Database Tool)

1. **New Database Connection:**
   - Click `New Database Connection` icon
   - Select `PostgreSQL`

2. **Main Tab:**
   - **Host:** `localhost`
   - **Port:** `5433`
   - **Database:** `synvoy`
   - **Username:** `synvoy_user`
   - **Password:** (from `.env` file)

3. **Test Connection:**
   - Click `Test Connection`
   - Download driver if prompted

4. **Finish:**
   - Click `Finish`

## pgAdmin (Web-based)

1. **Add New Server:**
   - Right-click `Servers` → `Create` → `Server`

2. **General Tab:**
   - **Name:** `Synvoy Local`

3. **Connection Tab:**
   - **Host name/address:** `localhost`
   - **Port:** `5433`
   - **Maintenance database:** `synvoy`
   - **Username:** `synvoy_user`
   - **Password:** (from `.env` file)

4. **Save:**
   - Click `Save`

## Quick Check: Get Your Connection Details

Run this command to see your current database configuration:

```bash
cd /home/necromancer/PycharmProjects/Synvoy
grep -E "^POSTGRES_" .env
```

## Troubleshooting

### Connection Refused
- Make sure Docker container is running: `docker-compose ps db`
- Start the database: `docker-compose up -d db`
- Check if port 5433 is available: `netstat -tuln | grep 5433`

### Authentication Failed
- Verify password in `.env` file matches what you're entering
- Check for special characters in password that might need URL encoding

### Database Not Found
- Verify database name matches `POSTGRES_DB` in `.env`
- Default is `synvoy`

## Example Connection String

For tools that use connection strings:

```
postgresql://synvoy_user:YOUR_PASSWORD@localhost:5433/synvoy
```

Replace `YOUR_PASSWORD` with the actual password from your `.env` file.











