import datetime
import json
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserRole, FarmerProfile, UserSettings, AuditLog
from app.schemas import (
    FarmerRegisterIn, AdminRegisterIn, UserLoginIn, TokenResponse, 
    RefreshTokenIn, UserOut, VerifyOtpIn, ResendOtpIn, AuthActionResponse, 
    EmailStatusOut
)
from app.security import (
    hash_password, verify_password, create_access_token, create_refresh_token, decode_token
)
from app.dependencies import get_current_user
from app.services import email_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/email-status", response_model=EmailStatusOut)
def get_email_status():
    """Returns the live status of the SMTP email verification service."""
    return email_service.get_email_service_status()

@router.post("/register", response_model=AuthActionResponse)
def register_farmer(data: FarmerRegisterIn, request: Request, db: Session = Depends(get_db)):
    """
    Registers a new farmer account.
    If SMTP is configured, dispatches real email OTP and requires verification.
    If SMTP is unconfigured (development mode), marks user verified and grants direct access.
    """
    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )
    
    clean_email = data.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists",
        )

    smtp_active = email_service.is_smtp_configured()
    # In local development without SMTP, keep verification optional and auto-verify
    is_verified = True if not smtp_active else False

    # Create user
    user = User(
        email=clean_email,
        hashed_password=hash_password(data.password),
        role=UserRole.FARMER,
        is_active=True,
        is_verified=is_verified
    )
    db.add(user)
    db.flush()

    # Create Farmer Profile
    profile = FarmerProfile(
        user_id=user.id,
        full_name=data.full_name.strip(),
        mobile_number=data.mobile_number.strip(),
        village=data.village.strip(),
        district=data.district.strip(),
        emergency_contact_name=data.emergency_contact_name.strip(),
        emergency_contact_mobile=data.emergency_contact_mobile.strip()
    )
    db.add(profile)

    # Create default user settings
    settings = UserSettings(
        user_id=user.id,
        language="en",
        theme="dark"
    )
    db.add(settings)

    if smtp_active:
        # Generate verification OTP and send real email
        otp_code = email_service.create_or_renew_otp(db, clean_email, purpose="REGISTRATION")
        send_result = email_service.send_verification_email(
            email=clean_email, 
            otp_code=otp_code, 
            purpose="REGISTRATION", 
            role="FARMER"
        )

        audit = AuditLog(
            user_id=user.id,
            action="FARMER_REGISTRATION_OTP_SENT",
            ip_address=request.client.host if request.client else None,
            details=f"Farmer {data.full_name} registered; real verification email sent to {clean_email}."
        )
        db.add(audit)
        db.commit()

        return AuthActionResponse(
            success=True,
            requires_verification=True,
            message="Account created. Verification code sent to your email inbox.",
            email=clean_email,
            role=UserRole.FARMER,
            smtp_configured=True,
            instructions="Please check your inbox (and spam folder) for the 6-digit verification code.",
            dev_otp=send_result.get("dev_otp")
        )
    else:
        # Development mode: Direct access granted without blocking
        token_payload = {"sub": str(user.id), "role": user.role, "email": user.email}
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        audit = AuditLog(
            user_id=user.id,
            action="FARMER_REGISTRATION_ACTIVE",
            ip_address=request.client.host if request.client else None,
            details=f"Farmer {data.full_name} registered; auto-verified in development mode."
        )
        db.add(audit)
        db.commit()

        return AuthActionResponse(
            success=True,
            requires_verification=False,
            message="Farmer account registered successfully. Direct access granted in development mode.",
            email=clean_email,
            role=UserRole.FARMER,
            smtp_configured=False,
            instructions="Email service is unconfigured in development. When ready for production inboxes, set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in backend/.env.",
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=user.id,
            full_name=profile.full_name
        )

@router.post("/admin/register", response_model=AuthActionResponse)
def register_admin(data: AdminRegisterIn, request: Request, db: Session = Depends(get_db)):
    """
    Onboards an Administrator.
    If SMTP is configured, sends OTP. If unconfigured, activates directly.
    """
    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )
        
    clean_email = data.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An administrator or account with this email already exists",
        )

    smtp_active = email_service.is_smtp_configured()
    is_verified = True if not smtp_active else False

    # Create Admin User
    user = User(
        email=clean_email,
        hashed_password=hash_password(data.password),
        role=UserRole.ADMIN,
        is_active=True,
        is_verified=is_verified
    )
    db.add(user)
    db.flush()

    # Create settings
    settings = UserSettings(user_id=user.id, language="en", theme="dark")
    db.add(settings)

    if smtp_active:
        otp_code = email_service.create_or_renew_otp(db, clean_email, purpose="ADMIN_SETUP")
        send_result = email_service.send_verification_email(
            email=clean_email, 
            otp_code=otp_code, 
            purpose="ADMIN_SETUP", 
            role="ADMIN"
        )

        audit = AuditLog(
            user_id=user.id,
            action="ADMIN_REGISTRATION_OTP_SENT",
            ip_address=request.client.host if request.client else None,
            details=f"Admin account onboarding initiated for {clean_email}; real email sent."
        )
        db.add(audit)
        db.commit()

        return AuthActionResponse(
            success=True,
            requires_verification=True,
            message="Administrator profile registered. Verification code sent to your email.",
            email=clean_email,
            role=UserRole.ADMIN,
            smtp_configured=True,
            instructions="Check your email for the verification code.",
            dev_otp=send_result.get("dev_otp")
        )
    else:
        token_payload = {"sub": str(user.id), "role": user.role, "email": user.email}
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        audit = AuditLog(
            user_id=user.id,
            action="ADMIN_REGISTRATION_ACTIVE",
            ip_address=request.client.host if request.client else None,
            details=f"Admin account registered and activated in development mode for {clean_email}."
        )
        db.add(audit)
        db.commit()

        return AuthActionResponse(
            success=True,
            requires_verification=False,
            message="Administrator account registered and activated.",
            email=clean_email,
            role=UserRole.ADMIN,
            smtp_configured=False,
            instructions="Email service unconfigured in development mode. Real verification is optional.",
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=user.id,
            full_name=data.full_name
        )

@router.post("/verify-otp", response_model=TokenResponse)
def verify_email_otp(data: VerifyOtpIn, request: Request, db: Session = Depends(get_db)):
    """
    Verifies the email OTP code and signs the user in with JWT tokens.
    """
    clean_email = data.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with this email address",
        )

    # Check OTP validity
    is_valid, err_msg = email_service.verify_otp_code(
        db, clean_email, data.otp_code, data.purpose
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )

    # Activate & verify user
    user.is_verified = True
    db.commit()
    db.refresh(user)

    full_name = "Administrator"
    if user.farmer_profile:
        full_name = user.farmer_profile.full_name

    audit = AuditLog(
        user_id=user.id,
        action="EMAIL_VERIFICATION_SUCCESS",
        ip_address=request.client.host if request.client else None,
        details=f"Email {clean_email} verified successfully for role {user.role}."
    )
    db.add(audit)
    db.commit()

    # Generate JWT
    token_payload = {"sub": str(user.id), "role": user.role, "email": user.email}
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        user_id=user.id,
        full_name=full_name
    )

@router.post("/resend-otp", response_model=AuthActionResponse)
def resend_otp(data: ResendOtpIn, request: Request, db: Session = Depends(get_db)):
    """
    Generates and resends a fresh 6-digit OTP to the specified user email.
    """
    clean_email = data.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address"
        )

    otp_code = email_service.create_or_renew_otp(db, clean_email, purpose=data.purpose)
    send_result = email_service.send_verification_email(
        email=clean_email, 
        otp_code=otp_code, 
        purpose=data.purpose, 
        role=user.role
    )

    audit = AuditLog(
        user_id=user.id,
        action="OTP_RESENT",
        ip_address=request.client.host if request.client else None,
        details=f"Verification code resent to {clean_email}."
    )
    db.add(audit)
    db.commit()

    return AuthActionResponse(
        success=True,
        requires_verification=True,
        message=f"A fresh verification code was dispatched to {clean_email}.",
        email=clean_email,
        role=user.role,
        smtp_configured=send_result.get("smtp_configured", False),
        instructions=send_result.get("instructions"),
        dev_otp=send_result.get("dev_otp")
    )

@router.post("/login", response_model=TokenResponse)
def login_user(data: UserLoginIn, request: Request, db: Session = Depends(get_db)):
    clean_email = data.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact administrator.",
        )

    # Check email verification status
    if not getattr(user, 'is_verified', True):
        smtp_active = email_service.is_smtp_configured()
        if not smtp_active:
            # In local development without SMTP, keep verification optional and auto-verify
            user.is_verified = True
            db.commit()
            db.refresh(user)
        else:
            # Generate fresh OTP and inform client
            otp_code = email_service.create_or_renew_otp(db, clean_email, purpose="REGISTRATION")
            send_result = email_service.send_verification_email(
                clean_email, otp_code, purpose="REGISTRATION", role=user.role
            )
            error_detail = {
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Email address not verified yet. A verification code has been dispatched to your email.",
                "email": clean_email,
                "role": user.role,
                "dev_otp": send_result.get("dev_otp"),
                "smtp_configured": True
            }
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=json.dumps(error_detail)
            )

    full_name = "Administrator"
    if user.farmer_profile:
        full_name = user.farmer_profile.full_name

    audit = AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        ip_address=request.client.host if request.client else None,
        details=f"Successful login for {user.email} (Role: {user.role})"
    )
    db.add(audit)
    db.commit()

    token_payload = {"sub": str(user.id), "role": user.role, "email": user.email}
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        user_id=user.id,
        full_name=full_name
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshTokenIn, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    full_name = "Administrator"
    if user.farmer_profile:
        full_name = user.farmer_profile.full_name

    new_payload = {"sub": str(user.id), "role": user.role, "email": user.email}
    access_token = create_access_token(new_payload)
    new_refresh = create_refresh_token(new_payload)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        role=user.role,
        user_id=user.id,
        full_name=full_name
    )

@router.get("/me", response_model=UserOut)
def get_current_user_profile(user: User = Depends(get_current_user)):
    return user

@router.post("/logout")
def logout_user(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    audit = AuditLog(
        user_id=user.id,
        action="USER_LOGOUT",
        ip_address=request.client.host if request.client else None,
        details=f"User {user.email} logged out securely."
    )
    db.add(audit)
    db.commit()
    return {"message": "Logged out successfully"}
