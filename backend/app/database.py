import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger("agrishield.database")

def get_engine():
    db_url = settings.DATABASE_URL
    use_sqlite = os.getenv("USE_SQLITE", "1")  # Default to fast local SQLite when standalone
    if use_sqlite == "1" and not db_url:
        sqlite_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "agrishield.db")
        db_url = f"sqlite:///{sqlite_path}"

    if not db_url:
        mysql_url = f"mysql+pymysql://{settings.MYSQL_USER}:{settings.MYSQL_PASSWORD}@{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DB}?charset=utf8mb4"
        try:
            test_engine = create_engine(mysql_url, pool_pre_ping=True, connect_args={"connect_timeout": 1})
            with test_engine.connect():
                logger.info("Connected successfully to MySQL database.")
                return test_engine
        except Exception as e:
            logger.warning(f"MySQL unavailable ({e}). Gracefully falling back to local SQLite database.")
            sqlite_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "agrishield.db")
            db_url = f"sqlite:///{sqlite_path}"

    if db_url.startswith("sqlite"):
        engine = create_engine(db_url, connect_args={"check_same_thread": False})
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        return engine
    else:
        return create_engine(db_url, pool_pre_ping=True)

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
