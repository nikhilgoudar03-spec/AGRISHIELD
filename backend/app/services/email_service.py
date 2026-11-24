import smtplib
import secrets
import datetime
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.models import EmailVerificationOTP, User

logger = logging.getLogger("agrishield.email")

def is_smtp_configured() -> bool:
    """Returns True if valid SMTP credentials are configured in settings."""
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)

def get_email_service_status() -> Dict[str, Any]:
    """Returns diagnostic status of the email verification service."""
    configured = is_smtp_configured()
    return {
        "smtp_configured": configured,
        "smtp_host": settings.SMTP_HOST if configured else None,
        "smtp_port": settings.SMTP_PORT if configured else None,
        "from_email": settings.SMTP_FROM_EMAIL if configured else None,
        "dev_fallback_active": settings.ALLOW_DEV_OTP_FALLBACK and not configured,
        "instructions": (
            "To enable live inbox verification emails, configure SMTP_HOST, SMTP_PORT, "
            "SMTP_USER, and SMTP_PASSWORD in backend/.env (e.g. Gmail SMTP with App Password)."
            if not configured else "Real SMTP email delivery is active and verified."
        )
    }

def generate_secure_otp(length: int = 6) -> str:
    """Generates a cryptographically random numeric OTP."""
    return "".join(str(secrets.randbelow(10)) for _ in range(length))

def create_or_renew_otp(
    db: Session, 
    email: str, 
    purpose: str = "REGISTRATION", 
    expires_minutes: int = 10
) -> str:
    """
    Invalidates any previous pending OTP for this email/purpose and creates a new one.
    """
    email_clean = email.strip().lower()
    
    # Invalidate older active OTPs
    db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.email == email_clean,
        EmailVerificationOTP.purpose == purpose,
        EmailVerificationOTP.is_used == False
    ).update({"is_used": True})
    
    otp_code = generate_secure_otp(6)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=expires_minutes)
    
    otp_record = EmailVerificationOTP(
        email=email_clean,
        otp_code=otp_code,
        purpose=purpose,
        created_at=datetime.datetime.utcnow(),
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_record)
    db.commit()
    db.refresh(otp_record)
    
    return otp_code

def verify_otp_code(
    db: Session, 
    email: str, 
    code: str, 
    purpose: str = "REGISTRATION"
) -> Tuple[bool, str]:
    """
    Validates the provided OTP code against the database.
    """
    email_clean = email.strip().lower()
    code_clean = code.strip()
    
    now = datetime.datetime.utcnow()
    otp_record = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.email == email_clean,
        EmailVerificationOTP.purpose == purpose,
        EmailVerificationOTP.is_used == False,
        EmailVerificationOTP.expires_at > now
    ).order_by(EmailVerificationOTP.id.desc()).first()
    
    if not otp_record:
        return False, "Verification code has expired or was already used. Please request a new code."
        
    if otp_record.otp_code != code_clean:
        return False, "Incorrect verification code. Please check your email and try again."
        
    # Mark OTP as used
    otp_record.is_used = True
    db.commit()
    
    return True, "Email verified successfully."

def send_verification_email(
    email: str, 
    otp_code: str, 
    purpose: str = "REGISTRATION",
    role: str = "FARMER"
) -> Dict[str, Any]:
    """
    Sends the 6-digit OTP verification email via real SMTP if configured.
    If unconfigured, safely informs caller and logs instructions.
    """
    email_clean = email.strip().lower()
    
    if not is_smtp_configured():
        logger.warning(
            f"[AgriShield Email] Real SMTP not configured for recipient: {email_clean}. "
            f"To enable live emails to inboxes, set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in backend/.env. "
            f"[LOCAL_DEV_OTP for testing: {otp_code}]"
        )
        return {
            "success": True if settings.ALLOW_DEV_OTP_FALLBACK else False,
            "smtp_configured": False,
            "message": "Email delivery provider is currently unconfigured. Showing setup notice.",
            "instructions": "Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in backend/.env to send real emails.",
            "dev_otp": otp_code if settings.ALLOW_DEV_OTP_FALLBACK else None,
            "recipient": email_clean
        }

    # Prepare real email using SMTP
    try:
        subject = f"AgriShield Verification Code: {otp_code}"
        
        # Plain text version
        text_content = (
            f"AgriShield – Smart Technology for Safer Farming\n\n"
            f"Hello,\n\n"
            f"Your AgriShield security verification code for {role.lower()} account access is:\n\n"
            f"    {otp_code}\n\n"
            f"This code will expire in 10 minutes.\n\n"
            f"SECURITY NOTICE: AgriShield will NEVER ask for your personal email account password.\n"
            f"If you did not initiate this request, please disregard this message.\n\n"
            f"AgriShield Platform Security Team"
        )
        
        # Responsive HTML version
        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AgriShield Verification Code</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4fbf7; margin: 0; padding: 24px; color: #1e293b; }}
    .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #d1fae5; overflow: hidden; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08); }}
    .header {{ background: linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }}
    .header p {{ margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }}
    .content {{ padding: 32px 24px; }}
    .badge {{ display: inline-block; padding: 4px 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 20px; font-size: 11px; font-weight: 700; color: #065f46; margin-bottom: 16px; text-transform: uppercase; }}
    .otp-box {{ background: #f0fdf4; border: 2px dashed #34d399; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
    .otp-code {{ font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #065f46; font-family: 'Courier New', monospace; }}
    .otp-sub {{ font-size: 12px; color: #047857; margin-top: 8px; font-weight: 600; }}
    .security-notice {{ background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 14px; font-size: 12px; color: #92400e; margin-top: 24px; }}
    .footer {{ padding: 20px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AGRISHIELD</h1>
      <p>Smart Technology for Safer Farming</p>
    </div>
    <div class="content">
      <div class="badge">Identity Verification</div>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 12px 0;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
        You have requested authentication for your AgriShield <strong>{role}</strong> account.
        Please enter the single-use 6-digit verification code below:
      </p>
      <div class="otp-box">
        <div class="otp-code">{otp_code}</div>
        <div class="otp-sub">Valid for 10 minutes</div>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
        If you did not request this verification code, someone may have entered your email address by mistake. Your account remains secure.
      </p>
      <div class="security-notice">
        <strong>Security Notice:</strong> AgriShield will <em>never</em> ask for your personal email password or banking credentials. Always protect your application credentials.
      </div>
    </div>
    <div class="footer">
      &copy; 2026 AgriShield Platform. Real-Time Smart Farmer Safety Architecture.
    </div>
  </div>
</body>
</html>
"""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = email_clean
        
        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        msg.attach(part1)
        msg.attach(part2)
        
        if settings.SMTP_SSL:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            if settings.SMTP_TLS:
                server.starttls()
                
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM_EMAIL, [email_clean], msg.as_string())
        server.quit()
        
        logger.info(f"[AgriShield Email] Successfully delivered OTP email to {email_clean}")
        return {
            "success": True,
            "smtp_configured": True,
            "message": f"Verification code sent to {email_clean}",
            "recipient": email_clean
        }
        
    except Exception as e:
        logger.error(f"[AgriShield Email] Failed to send email via SMTP to {email_clean}: {e}")
        return {
            "success": False,
            "smtp_configured": True,
            "message": f"Failed to deliver verification email: {str(e)}",
            "error": str(e),
            "recipient": email_clean
        }
