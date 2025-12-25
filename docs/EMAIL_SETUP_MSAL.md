# Email Setup for Contact Form (Microsoft Graph API via MSAL)

The contact form sends emails to `contact@synvoy.com` using Microsoft Graph API with MSAL authentication.

## Prerequisites

- Microsoft Azure account
- Azure AD app registration
- Office 365 or Microsoft 365 account with email

## Azure AD App Registration Setup

### 1. Create App Registration in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: Synvoy Contact Form
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Leave blank (not needed for client credentials flow)
5. Click **Register**

### 2. Get Application (Client) ID and Tenant ID

After registration:
- **Application (client) ID**: Copy this value → `MSAL_CLIENT_ID`
- **Directory (tenant) ID**: Copy this value → `MSAL_TENANT_ID`

### 3. Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: "Synvoy Contact Form"
4. Choose expiration (recommended: 24 months)
5. Click **Add**
6. **IMPORTANT**: Copy the secret value immediately (you won't see it again) → `MSAL_CLIENT_SECRET`

### 4. Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Application permissions** (not Delegated)
5. Search for and add:
   - `Mail.Send` - Send mail as any user
6. Click **Add permissions**
7. Click **Grant admin consent** for your organization

### 5. Set Sender Email

The email address that will send the emails:
- This should be a valid email in your Microsoft 365/Office 365 organization
- Example: `noreply@yourdomain.com` or `contact@synvoy.com`
- This goes in `MSAL_SENDER_EMAIL`

## Environment Configuration

Add these variables to your `.env` file (in the `backend/` directory or root):

```env
# Email Configuration (Microsoft Graph API via MSAL)
MSAL_TENANT_ID=your-tenant-id-here
MSAL_CLIENT_ID=your-client-id-here
MSAL_CLIENT_SECRET=your-client-secret-here
MSAL_SENDER_EMAIL=your-email@yourdomain.com
CONTACT_EMAIL=contact@synvoy.com
```

## For Docker

If using Docker, add these to your root `.env` file (same one used by `docker-compose.yml`):

```env
MSAL_TENANT_ID=your-tenant-id-here
MSAL_CLIENT_ID=your-client-id-here
MSAL_CLIENT_SECRET=your-client-secret-here
MSAL_SENDER_EMAIL=your-email@yourdomain.com
CONTACT_EMAIL=contact@synvoy.com
```

Then restart the backend:
```bash
docker compose restart backend
```

## Testing

After configuring:
1. Submit the contact form at `/contact`
2. Check the `contact@synvoy.com` inbox
3. Check backend logs for any errors:
   ```bash
   docker compose logs backend | tail -20
   ```

## Troubleshooting

### "MSAL not configured" error
- Verify all environment variables are set: `MSAL_TENANT_ID`, `MSAL_CLIENT_ID`, `MSAL_CLIENT_SECRET`, `MSAL_SENDER_EMAIL`
- Check that values don't have extra spaces or quotes

### "Failed to acquire token" error
- Verify Tenant ID is correct
- Verify Client ID is correct
- Verify Client Secret is correct (and not expired)
- Check that API permissions are granted with admin consent

### "Failed to send email" error
- Verify `MSAL_SENDER_EMAIL` is a valid email in your organization
- Check that `Mail.Send` permission is granted
- Verify the sender email has a mailbox in Microsoft 365/Office 365
- Check backend logs for detailed error messages

### 403 Forbidden error
- Ensure `Mail.Send` application permission is granted
- Ensure admin consent is granted for the permission
- Verify the sender email exists and is active

### 404 Not Found error
- Verify `MSAL_SENDER_EMAIL` is correct
- Ensure the email address exists in your Microsoft 365 organization

## Security Notes

- **Never commit** `.env` file with secrets to version control
- Client secrets should be rotated regularly
- Use environment-specific secrets (dev, staging, production)
- Consider using Azure Key Vault for production secrets

## Alternative: Using n8n with Microsoft Outlook

If you prefer, you can also use n8n to send emails:
1. Create an n8n workflow with HTTP trigger
2. Add Microsoft Outlook node
3. Configure OAuth (you already have this set up)
4. Update contact controller to call n8n webhook instead



