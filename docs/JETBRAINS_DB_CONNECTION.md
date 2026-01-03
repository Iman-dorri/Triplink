# Connecting to Synvoy Database from JetBrains IDE

## Connection Details

- **Host:** `localhost` (or `127.0.0.1`)
- **Port:** `5433` (mapped from container port 5432)
- **Database:** `synvoy`
- **Username:** `synvoy_user`
- **Password:** `synvoy_secure_password_2024` (check your `.env` file for actual password)

## PyCharm Professional

### Step 1: Open Database Tool Window
1. Go to **View** → **Tool Windows** → **Database**
   - Or click the **Database** icon in the right sidebar
   - Or press `Alt + 1` (Windows/Linux) or `Cmd + 1` (Mac)

### Step 2: Add Data Source
1. Click the **`+`** button in the Database tool window
2. Select **Data Source** → **PostgreSQL**

### Step 3: Configure Connection
Fill in the following details:

**General Tab:**
- **Name:** `Synvoy Local` (or any name you prefer)
- **Host:** `localhost`
- **Port:** `5433`
- **Database:** `synvoy`
- **User:** `synvoy_user`
- **Password:** `synvoy_secure_password_2024` (from your `.env` file)
- **Authentication:** `User & Password`

**Advanced Tab (Optional):**
- **Connection timeout:** `30` seconds
- **Read timeout:** `30` seconds

### Step 4: Test Connection
1. Click the **Test Connection** button
2. If prompted to download PostgreSQL driver, click **Download**
3. Wait for the driver to download and install
4. You should see: **"Connection successful"**

### Step 5: Apply and Connect
1. Click **Apply**
2. Click **OK**
3. The database connection will appear in the Database tool window
4. Expand it to see all tables

### Step 6: Browse Tables
- Expand **synvoy** → **Schemas** → **public** → **Tables**
- You should see:
  - `users`
  - `user_connections`
  - `messages`
  - `trips`
  - `trip_participants`
  - `destinations`

## DataGrip (JetBrains Database IDE)

### Step 1: Create New Data Source
1. Click **File** → **New** → **Data Source** → **PostgreSQL**
   - Or click the **`+`** button in the Database tool window
   - Or press `Ctrl + Alt + Shift + S` (Windows/Linux) or `Cmd + Option + Shift + S` (Mac)

### Step 2: Configure Connection
Fill in the connection details:

**General Tab:**
- **Name:** `Synvoy Local`
- **Host:** `localhost`
- **Port:** `5433`
- **Database:** `synvoy`
- **User:** `synvoy_user`
- **Password:** `synvoy_secure_password_2024`
- **Authentication:** `User & Password`

**Options Tab (Optional):**
- **Connection timeout:** `30`
- **Read timeout:** `30`

### Step 3: Test and Connect
1. Click **Test Connection**
2. Download driver if prompted
3. Click **OK** to save and connect

## Troubleshooting

### Connection Refused
**Problem:** "Connection to localhost:5433 refused"

**Solution:**
1. Make sure Docker container is running:
   ```bash
   docker ps | grep synvoy-db
   ```
2. If not running, start it:
   ```bash
   docker compose up -d db
   ```
3. Verify port mapping:
   ```bash
   docker ps | grep synvoy-db
   ```
   Should show: `0.0.0.0:5433->5432/tcp`

### Authentication Failed
**Problem:** "Password authentication failed"

**Solution:**
1. Check your `.env` file for the correct password:
   ```bash
   grep POSTGRES_PASSWORD .env
   ```
2. Make sure you're using the password from `.env`, not the default
3. If password has special characters, make sure they're entered correctly

### Database Not Found
**Problem:** "Database 'synvoy' does not exist"

**Solution:**
1. Verify database name in `.env`:
   ```bash
   grep POSTGRES_DB .env
   ```
2. Check if database was initialized:
   ```bash
   docker compose logs backend | grep "Database tables created"
   ```

### Driver Download Issues
**Problem:** Cannot download PostgreSQL driver

**Solution:**
1. Check your internet connection
2. In PyCharm: **File** → **Settings** → **Appearance & Behavior** → **System Settings** → **HTTP Proxy**
3. Try manual download: Download PostgreSQL JDBC driver from https://jdbc.postgresql.org/
4. In connection settings, click **Driver** → **Custom JARs** → Add the downloaded JAR

## Quick Connection Test

Test the connection from terminal:
```bash
cd /home/necromancer/PycharmProjects/Synvoy
source .env
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h localhost -p 5433 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "\dt"
```

This should list all tables in your database.

## Useful Features in JetBrains IDEs

### View Table Data
- Right-click on a table → **Open Table**
- Or double-click the table name

### Run SQL Queries
- Right-click on database/schema → **New** → **Query Console**
- Or press `Ctrl + Alt + L` (Windows/Linux) or `Cmd + Option + L` (Mac)
- Type your SQL and press `Ctrl + Enter` (Windows/Linux) or `Cmd + Enter` (Mac)

### Export Data
- Right-click on table → **Export Data to File**
- Choose format: CSV, JSON, SQL, etc.

### View Table Structure
- Right-click on table → **Modify Table**
- Or press `F4` when table is selected

## Connection String Format

For tools that use connection strings:
```
jdbc:postgresql://localhost:5433/synvoy?user=synvoy_user&password=YOUR_PASSWORD
```

Replace `YOUR_PASSWORD` with the actual password from your `.env` file.













