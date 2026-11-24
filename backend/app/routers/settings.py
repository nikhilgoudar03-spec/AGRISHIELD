from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserSettings
from app.schemas import UserSettingsIn, UserSettingsOut
from app.dependencies import get_current_user

router = APIRouter(prefix="/settings", tags=["User Settings"])

@router.get("", response_model=UserSettingsOut)
def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("", response_model=UserSettingsOut)
def update_user_settings(
    data: UserSettingsIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)

    if data.language is not None:
        settings.language = data.language
    if data.theme is not None:
        settings.theme = data.theme
    if data.fall_cancellation_timeout_sec is not None:
        settings.fall_cancellation_timeout_sec = data.fall_cancellation_timeout_sec
    if data.mq135_warning_ppm is not None:
        settings.mq135_warning_ppm = data.mq135_warning_ppm
    if data.mq135_critical_ppm is not None:
        settings.mq135_critical_ppm = data.mq135_critical_ppm
    if data.email_notifications_enabled is not None:
        settings.email_notifications_enabled = data.email_notifications_enabled
    if data.sms_notifications_enabled is not None:
        settings.sms_notifications_enabled = data.sms_notifications_enabled

    db.commit()
    db.refresh(settings)
    return settings
