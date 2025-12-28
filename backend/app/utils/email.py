"""
Email utility for sending emails via Microsoft Graph API using MSAL
"""
import os
import requests
from msal import ConfidentialClientApplication
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime

# Load .env file from multiple possible locations
# Try root .env first (for local development), then backend/.env
base_path = Path(__file__).parent.parent.parent.parent  # Go up to project root
env_paths = [
    base_path / ".env",  # root .env (preferred for local dev)
    Path(__file__).parent.parent.parent / ".env",  # backend/.env
    Path.cwd() / ".env",  # current directory
]

loaded = False
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path, override=True)
        loaded = True
        print(f"Loaded .env from: {env_path}")
        break

if not loaded:
    # Fallback to default load_dotenv behavior
    load_dotenv()
    print("Using default load_dotenv() - checking current directory")

# Microsoft Graph API configuration
# Load from environment (works in both local and Docker)
TENANT_ID = os.getenv("MSAL_TENANT_ID", "")
CLIENT_ID = os.getenv("MSAL_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("MSAL_CLIENT_SECRET", "")
# SENDER_USER: The actual mailbox used for authentication (iman.dorri@synvoy.com)
SENDER_USER = os.getenv("MSAL_SENDER_USER", "iman.dorri@synvoy.com")
# FROM_ALIAS: The alias email that appears as "From" (contact@synvoy.com)
FROM_ALIAS = os.getenv("MSAL_FROM_ALIAS", "contact@synvoy.com")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "contact@synvoy.com")
# NO_REPLY_ALIAS: The alias email for verification emails (no-reply@synvoy.com)
NO_REPLY_ALIAS = os.getenv("MSAL_NO_REPLY_ALIAS", "no-reply@synvoy.com")
# NOTIFICATIONS_ALIAS: The alias email for notifications (notifications@synvoy.com)
NOTIFICATIONS_ALIAS = os.getenv("MSAL_NOTIFICATIONS_ALIAS", "notifications@synvoy.com")

# Debug: Print loaded values (without secrets)
if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET, SENDER_USER]):
    print(f"DEBUG: MSAL Config Status:")
    print(f"  TENANT_ID: {'SET' if TENANT_ID else 'NOT SET'} ({TENANT_ID[:10]}...)" if TENANT_ID else "  TENANT_ID: NOT SET")
    print(f"  CLIENT_ID: {'SET' if CLIENT_ID else 'NOT SET'} ({CLIENT_ID[:10]}...)" if CLIENT_ID else "  CLIENT_ID: NOT SET")
    print(f"  CLIENT_SECRET: {'SET' if CLIENT_SECRET else 'NOT SET'}")
    print(f"  SENDER_USER: {'SET' if SENDER_USER else 'NOT SET'} ({SENDER_USER})" if SENDER_USER else "  SENDER_USER: NOT SET")
    print(f"  FROM_ALIAS: {'SET' if FROM_ALIAS else 'NOT SET'} ({FROM_ALIAS})" if FROM_ALIAS else "  FROM_ALIAS: NOT SET")
    print(f"  CONTACT_EMAIL: {CONTACT_EMAIL}")

# Microsoft Graph API endpoints
GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0"
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
# For client credentials flow, use /.default suffix
SCOPES = ["https://graph.microsoft.com/.default"]

def get_access_token() -> Optional[str]:
    """
    Get access token using MSAL for Microsoft Graph API
    
    Returns:
        Access token string or None if authentication fails
    """
    if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET]):
        print("Error: MSAL configuration missing. Please set MSAL_TENANT_ID, MSAL_CLIENT_ID, and MSAL_CLIENT_SECRET")
        return None
    
    try:
        # Create MSAL app instance
        app = ConfidentialClientApplication(
            client_id=CLIENT_ID,
            client_credential=CLIENT_SECRET,
            authority=AUTHORITY
        )
        
        # Acquire token for client credentials flow
        result = app.acquire_token_for_client(scopes=SCOPES)
        
        if "access_token" in result:
            return result["access_token"]
        else:
            error = result.get("error_description", result.get("error", "Unknown error"))
            print(f"Failed to acquire token: {error}")
            return None
            
    except Exception as e:
        print(f"Error acquiring access token: {e}")
        return None

def send_contact_email(
    name: str,
    email: str,
    subject: str,
    message: str,
    phone: Optional[str] = None
) -> bool:
    """
    Send contact form email to contact@synvoy.com using Microsoft Graph API
    
    Args:
        name: Sender's name
        email: Sender's email
        subject: Email subject
        message: Email message
        phone: Optional phone number
    
    Returns:
        True if email sent successfully, False otherwise
    """
    # Check if MSAL is configured
    if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET, SENDER_USER]):
        print("Warning: MSAL not configured. Email not sent.")
        print("Please set MSAL_TENANT_ID, MSAL_CLIENT_ID, MSAL_CLIENT_SECRET, and MSAL_SENDER_USER in .env file")
        return False
    
    try:
        # Get access token
        access_token = get_access_token()
        if not access_token:
            print("Failed to get access token")
            return False
        
        # Create email body
        body_text = f"""New Contact Form Submission

Name: {name}
Email: {email}
"""
        if phone:
            body_text += f"Phone: {phone}\n"
        
        body_text += f"""
Subject: {subject}

Message:
{message}

---
This email was sent from the Synvoy contact form.
Reply directly to this email to respond to {name} ({email}).
"""
        
        body_html = f"""<html>
<body>
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> {name}</p>
<p><strong>Email:</strong> <a href="mailto:{email}">{email}</a></p>
"""
        if phone:
            body_html += f"<p><strong>Phone:</strong> {phone}</p>"
        
        body_html += f"""
<p><strong>Subject:</strong> {subject}</p>
<hr>
<p><strong>Message:</strong></p>
<p>{message.replace(chr(10), '<br>')}</p>
<hr>
<p><em>This email was sent from the Synvoy contact form.<br>
Reply directly to this email to respond to {name} ({email}).</em></p>
</body>
</html>"""
        
        # Prepare email message for Microsoft Graph API
        # Use SENDER_USER for the API endpoint (actual mailbox)
        # Use FROM_ALIAS in the "from" field (alias email)
        email_message = {
            "message": {
                "subject": f"Contact Form: {subject}",
                "body": {
                    "contentType": "HTML",
                    "content": body_html
                },
                "from": {
                    "emailAddress": {
                        "address": FROM_ALIAS,
                        "name": "Synvoy Contact Form"
                    }
                },
                "toRecipients": [
                    {
                        "emailAddress": {
                            "address": CONTACT_EMAIL
                        }
                    }
                ],
                "replyTo": [
                    {
                        "emailAddress": {
                            "address": email,
                            "name": name
                        }
                    }
                ]
            },
            "saveToSentItems": "true"
        }
        
        # Send email via Microsoft Graph API
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Use SENDER_USER (actual mailbox) for the API endpoint
        url = f"{GRAPH_API_ENDPOINT}/users/{SENDER_USER}/sendMail"
        
        response = requests.post(url, json=email_message, headers=headers)
        
        if response.status_code == 202:
            print(f"Contact email sent successfully to {CONTACT_EMAIL}")
            return True
        else:
            print(f"Failed to send email. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
    except requests.exceptions.RequestException as e:
        print(f"Request error sending email: {e}")
        return False
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

def send_verification_email(
    email: str,
    name: str,
    code: str
) -> bool:
    """
    Send email verification code to user using Microsoft Graph API
    
    Args:
        email: Recipient's email address
        name: Recipient's name
        code: 6-digit verification code
    
    Returns:
        True if email sent successfully, False otherwise
    """
    # Check if MSAL is configured
    if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET, SENDER_USER]):
        print("Warning: MSAL not configured. Verification email not sent.")
        print("Please set MSAL_TENANT_ID, MSAL_CLIENT_ID, MSAL_CLIENT_SECRET, and MSAL_SENDER_USER in .env file")
        return False
    
    try:
        # Get access token
        access_token = get_access_token()
        if not access_token:
            print("Failed to get access token for verification email")
            return False
        
        # Create email body
        body_html = f"""<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi {name},</p>
        <p style="font-size: 16px; margin-bottom: 20px;">Thank you for signing up for Synvoy! Please verify your email address by entering the code below:</p>
        
        <div style="background: #f3f4f6; border: 2px dashed #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <p style="font-size: 14px; color: #6b7280; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
            <p style="font-size: 36px; font-weight: bold; color: #2563eb; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">{code}</p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">This code will expire in <strong>60 minutes</strong>.</p>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="font-size: 14px; color: #92400e; margin: 0;">
                <strong>⚠️ Can't find this email?</strong><br>
                Please check your spam or junk folder. If you still don't see it, you can request a new code.
            </p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px; margin-bottom: 0;">If you didn't create an account with Synvoy, please ignore this email.</p>
    </div>
    <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">© {datetime.now().year} Synvoy. All rights reserved.</p>
        <p style="margin: 5px 0 0 0;">This is an automated email, please do not reply.</p>
    </div>
</body>
</html>"""
        
        body_text = f"""Verify Your Email

Hi {name},

Thank you for signing up for Synvoy! Please verify your email address by entering the code below:

Your Verification Code: {code}

This code will expire in 60 minutes.

⚠️ Can't find this email?
Please check your spam or junk folder. If you still don't see it, you can request a new code.

If you didn't create an account with Synvoy, please ignore this email.

© {datetime.now().year} Synvoy. All rights reserved.
This is an automated email, please do not reply.
"""
        
        # Prepare email message for Microsoft Graph API
        email_message = {
            "message": {
                "subject": "Verify Your Synvoy Email Address",
                "body": {
                    "contentType": "HTML",
                    "content": body_html
                },
                "from": {
                    "emailAddress": {
                        "address": NO_REPLY_ALIAS,
                        "name": "Synvoy"
                    }
                },
                "toRecipients": [
                    {
                        "emailAddress": {
                            "address": email,
                            "name": name
                        }
                    }
                ]
            },
            "saveToSentItems": "true"
        }
        
        # Send email via Microsoft Graph API
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Use SENDER_USER (actual mailbox) for the API endpoint
        url = f"{GRAPH_API_ENDPOINT}/users/{SENDER_USER}/sendMail"
        
        response = requests.post(url, json=email_message, headers=headers)
        
        if response.status_code == 202:
            print(f"Verification email sent successfully to {email}")
            return True
        else:
            print(f"Failed to send verification email. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
    except requests.exceptions.RequestException as e:
        print(f"Request error sending verification email: {e}")
        return False
    except Exception as e:
        print(f"Error sending verification email: {e}")
        return False

def send_password_change_email(
    email: str,
    name: str
) -> bool:
    """
    Send password change notification email to user using Microsoft Graph API
    
    Args:
        email: User's email address
        name: User's name
    
    Returns:
        True if email sent successfully, False otherwise
    """
    # Check if MSAL is configured
    if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET, SENDER_USER]):
        print("Warning: MSAL not configured. Password change email not sent.")
        print("Please set MSAL_TENANT_ID, MSAL_CLIENT_ID, MSAL_CLIENT_SECRET, and MSAL_SENDER_USER in .env file")
        return False
    
    try:
        # Get access token
        access_token = get_access_token()
        if not access_token:
            print("Failed to get access token for password change email")
            return False
        
        # Create email body
        body_html = f"""<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Password Changed</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi {name},</p>
        <p style="font-size: 16px; margin-bottom: 20px;">This is to confirm that your password has been successfully changed.</p>
        
        <div style="background: #f3f4f6; border-left: 4px solid #2563eb; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <p style="font-size: 14px; color: #1f2937; margin: 0;">
                <strong>✅ Password Changed Successfully</strong><br>
                Your account password was updated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')} UTC.
            </p>
        </div>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <p style="font-size: 14px; color: #991b1b; margin: 0;">
                <strong>⚠️ If this wasn't you:</strong><br>
                If you did not change your password, please reset your password immediately or contact our support team right away. Your account may be at risk.
            </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.synvoy.com/contact" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">Contact Support</a>
            <a href="https://www.synvoy.com/dashboard/profile" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Profile</a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px; margin-bottom: 0;">If you have any questions or concerns, please don't hesitate to contact our support team.</p>
    </div>
    <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">© {datetime.now().year} Synvoy. All rights reserved.</p>
        <p style="margin: 5px 0 0 0;">This is an automated email, please do not reply.</p>
    </div>
</body>
</html>"""
        
        body_text = f"""Password Changed

Hi {name},

This is to confirm that your password has been successfully changed.

Password Changed Successfully
Your account password was updated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')} UTC.

⚠️ If this wasn't you:
If you did not change your password, please reset your password immediately or contact our support team right away. Your account may be at risk.

Contact Support: https://www.synvoy.com/contact
View Profile: https://www.synvoy.com/dashboard/profile

If you have any questions or concerns, please don't hesitate to contact our support team.

© {datetime.now().year} Synvoy. All rights reserved.
This is an automated email, please do not reply.
"""
        
        # Prepare email message for Microsoft Graph API
        email_message = {
            "message": {
                "subject": "Password Changed - Synvoy",
                "body": {
                    "contentType": "HTML",
                    "content": body_html
                },
                "from": {
                    "emailAddress": {
                        "address": NOTIFICATIONS_ALIAS,
                        "name": "Synvoy Notifications"
                    }
                },
                "toRecipients": [
                    {
                        "emailAddress": {
                            "address": email,
                            "name": name
                        }
                    }
                ]
            },
            "saveToSentItems": "true"
        }
        
        # Send email via Microsoft Graph API
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Use SENDER_USER (actual mailbox) for the API endpoint
        url = f"{GRAPH_API_ENDPOINT}/users/{SENDER_USER}/sendMail"
        
        response = requests.post(url, json=email_message, headers=headers)
        
        if response.status_code == 202:
            print(f"Password change email sent successfully to {email}")
            return True
        else:
            print(f"Failed to send password change email. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
    except requests.exceptions.RequestException as e:
        print(f"Request error sending password change email: {e}")
        return False
    except Exception as e:
        print(f"Error sending password change email: {e}")
        return False
