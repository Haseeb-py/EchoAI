import sys
from uuid import uuid4
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password

TEST_USERS = [
    {"email": "admin@echoai.com", "password": "AdminPass123", "name": "Admin User", "role": "admin"},
    {"email": "supervisor@echoai.com", "password": "SupervisorPass123", "name": "Supervisor User", "role": "supervisor"},
    {"email": "agent@echoai.com", "password": "AgentPass123", "name": "Agent User", "role": "agent"},
]

def seed_users():
    db = SessionLocal()
    try:
        for user_data in TEST_USERS:
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if existing:
                print(f"User {user_data['email']} already exists, skipping...")
                continue
            user = User(
                id=str(uuid4()),
                name=user_data["name"],
                email=user_data["email"],
                hashed_password=hash_password(user_data["password"]),
                role=user_data["role"],
            )
            db.add(user)
            print(f"Created user: {user_data['email']} ({user_data['role']})")
        db.commit()
        print("Test users seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding users: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
