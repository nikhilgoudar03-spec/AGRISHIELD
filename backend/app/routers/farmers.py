from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import FarmerProfile, User, UserRole, FarmerDevice, Device, EmergencyAlert
from app.schemas import FarmerProfileOut, DeviceOut
from app.dependencies import get_current_admin, get_current_user
from app.services.safety_engine import evaluate_device_freshness

router = APIRouter(prefix="/farmers", tags=["Farmer Management"])

@router.get("")
def list_farmers(
    search: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(FarmerProfile)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (FarmerProfile.full_name.ilike(search_filter)) |
            (FarmerProfile.village.ilike(search_filter)) |
            (FarmerProfile.district.ilike(search_filter)) |
            (FarmerProfile.mobile_number.ilike(search_filter))
        )
    
    farmers = query.all()
    results = []
    for f in farmers:
        assigned_devices = (
            db.query(Device)
            .join(FarmerDevice, FarmerDevice.device_id == Device.id)
            .filter(FarmerDevice.farmer_profile_id == f.id, FarmerDevice.is_active == True)
            .all()
        )
        
        alerts_count = db.query(EmergencyAlert).filter(
            EmergencyAlert.farmer_id == f.id,
            EmergencyAlert.status != "RESOLVED"
        ).count()

        results.append({
            "id": f.id,
            "user_id": f.user_id,
            "full_name": f.full_name,
            "mobile_number": f.mobile_number,
            "village": f.village,
            "district": f.district,
            "emergency_contact_name": f.emergency_contact_name,
            "emergency_contact_mobile": f.emergency_contact_mobile,
            "created_at": f.created_at.isoformat(),
            "devices_count": len(assigned_devices),
            "unresolved_alerts": alerts_count,
            "devices": [
                {
                    "id": d.id,
                    "device_uid": d.device_uid,
                    "name": d.name,
                    "status": evaluate_device_freshness(d, db)
                }
                for d in assigned_devices
            ]
        })
    return results

@router.post("/{farmer_id}/assign-device")
def assign_device_to_farmer(
    farmer_id: int,
    device_id: int = Query(...),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Check if already assigned
    existing = db.query(FarmerDevice).filter(
        FarmerDevice.farmer_profile_id == farmer_id,
        FarmerDevice.device_id == device_id,
        FarmerDevice.is_active == True
    ).first()

    if existing:
        return {"status": "ALREADY_ASSIGNED", "message": "Device is already assigned to this farmer"}

    assignment = FarmerDevice(
        farmer_profile_id=farmer_id,
        device_id=device_id,
        is_active=True
    )
    db.add(assignment)
    db.commit()

    return {"status": "SUCCESS", "message": f"Device {device.device_uid} successfully assigned to {farmer.full_name}"}
