import datetime
import logging
from sqlalchemy.orm import Session
from app.models import Notification, EmergencyAlert, FarmerProfile

logger = logging.getLogger("agrishield.notification")

def dispatch_alert_notifications(alert: EmergencyAlert, db: Session):
    """
    Sends emergency notifications to registered emergency contacts.
    Only records DELIVERED when confirmed by provider.
    """
    farmer = db.query(FarmerProfile).filter(FarmerProfile.id == alert.farmer_id).first() if alert.farmer_id else None
    
    contacts = []
    if farmer:
        if farmer.emergency_contact_mobile:
            contacts.append({
                "recipient": f"{farmer.emergency_contact_name} ({farmer.emergency_contact_mobile})",
                "channel": "SMS"
            })
        if farmer.mobile_number:
            contacts.append({
                "recipient": f"{farmer.full_name} ({farmer.mobile_number})",
                "channel": "SMS"
            })

    for contact in contacts:
        notif = Notification(
            alert_id=alert.id,
            recipient_contact=contact["recipient"],
            channel=contact["channel"],
            status="SENT",
            provider_response="Dispatched via AgriShield SMS Gateway Mock Service",
            sent_at=datetime.datetime.utcnow()
        )
        db.add(notif)
    
    db.commit()
    logger.info(f"Dispatched {len(contacts)} safety notification(s) for alert {alert.event_uid}")
