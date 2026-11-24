import csv
import io
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.database import get_db
from app.models import (
    SensorReading, PumpEvent, EmergencyAlert, Device, User, UserRole, FarmerProfile
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/sensors")
def export_sensor_report(
    device_id: int,
    format: str = Query("csv", pattern="^(csv|json|pdf)$"),
    limit: int = 500,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    readings = db.query(SensorReading).filter(
        SensorReading.device_id == device_id
    ).order_by(SensorReading.server_timestamp.desc()).limit(limit).all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Device UID", "Sensor ID", "Value", "Unit", "Raw ADC", "Validity", "Timestamp (UTC)"])
        for r in readings:
            writer.writerow([r.id, device.device_uid, r.sensor_id, r.value, r.unit, r.raw_adc, r.validity_status, r.server_timestamp.isoformat()])
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=agrishield_sensors_{device.device_uid}.csv"}
        )

    elif format == "pdf":
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, 750, "AGRISHIELD - Sensor Telemetry Safety Report")
        p.setFont("Helvetica", 10)
        p.drawString(50, 730, f"Device: {device.name} ({device.device_uid}) | Generated: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        p.line(50, 720, 550, 720)

        y = 700
        p.setFont("Helvetica-Bold", 9)
        p.drawString(50, y, "Timestamp")
        p.drawString(180, y, "Sensor")
        p.drawString(280, y, "Value")
        p.drawString(360, y, "Raw ADC")
        p.drawString(450, y, "Status")
        y -= 15

        p.setFont("Helvetica", 8)
        for r in readings[:35]:  # Fits on one page
            val_str = f"{r.value} {r.unit}" if r.value is not None else "N/A"
            p.drawString(50, y, r.server_timestamp.strftime("%Y-%m-%d %H:%M:%S"))
            p.drawString(180, y, r.sensor_id)
            p.drawString(280, y, val_str)
            p.drawString(360, y, str(r.raw_adc or "N/A"))
            p.drawString(450, y, r.validity_status)
            y -= 14
            if y < 50:
                p.showPage()
                y = 750

        p.save()
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=agrishield_sensors_{device.device_uid}.pdf"}
        )

    return [
        {
            "id": r.id,
            "sensor_id": r.sensor_id,
            "value": r.value,
            "unit": r.unit,
            "raw_adc": r.raw_adc,
            "validity_status": r.validity_status,
            "server_timestamp": r.server_timestamp.isoformat()
        }
        for r in readings
    ]

@router.get("/pump")
def export_pump_report(
    device_id: int,
    format: str = Query("csv", pattern="^(csv|json|pdf)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    events = db.query(PumpEvent).filter(
        PumpEvent.device_id == device_id
    ).order_by(PumpEvent.requested_at.desc()).limit(200).all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Device UID", "Command", "Reported State", "Source", "Requested At", "Acknowledged At"])
        for e in events:
            writer.writerow([
                e.id, device.device_uid, e.command, e.state, e.source,
                e.requested_at.isoformat(),
                e.acknowledged_at.isoformat() if e.acknowledged_at else "PENDING_ACK"
            ])
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=agrishield_pump_{device.device_uid}.csv"}
        )

    return [
        {
            "id": e.id,
            "command": e.command,
            "state": e.state,
            "source": e.source,
            "requested_at": e.requested_at.isoformat(),
            "acknowledged_at": e.acknowledged_at.isoformat() if e.acknowledged_at else None
        }
        for e in events
    ]

@router.get("/emergency")
def export_emergency_report(
    format: str = Query("csv", pattern="^(csv|json|pdf)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(EmergencyAlert)
    if current_user.role != UserRole.ADMIN:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if not farmer:
            return []
        query = query.filter(EmergencyAlert.farmer_id == farmer.id)

    alerts = query.order_by(EmergencyAlert.created_at.desc()).all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Alert ID", "Event UID", "Alert Type", "Severity", "Status", "Message", "Created At", "Resolved At"])
        for a in alerts:
            writer.writerow([
                a.id, a.event_uid, a.alert_type, a.severity, a.status, a.message,
                a.created_at.isoformat(),
                a.resolved_at.isoformat() if a.resolved_at else "UNRESOLVED"
            ])
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=agrishield_emergency_incidents.csv"}
        )

    return [
        {
            "id": a.id,
            "event_uid": a.event_uid,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "message": a.message,
            "status": a.status,
            "created_at": a.created_at.isoformat(),
            "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None
        }
        for a in alerts
    ]
