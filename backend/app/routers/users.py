"""BR8: managers create, update and deactivate employee accounts."""
import re
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import EventLog, User, UserRole
from app.security import hash_password

router = APIRouter(prefix='/api/admin/users', tags=['users'])


def manager(user: Annotated[User, Depends(get_current_user)]):
    if user.role != UserRole.ADMIN:
        raise HTTPException(403, 'Only a manager can manage employee accounts. Ask your branch manager for help.')
    return user


def user_data(user):
    return {'id': user.id, 'email': user.email, 'full_name': user.full_name,
            'role': user.role.value, 'is_active': user.is_active}


def checked_name(value):
    if not isinstance(value, str) or not 1 <= len(value.strip()) <= 100:
        raise HTTPException(422, 'Employee name must contain 1 to 100 characters. Correct the name and submit again.')
    return value.strip()


@router.get('')
def list_users(db: Annotated[Session, Depends(get_db)], actor: Annotated[User, Depends(manager)]):
    return [user_data(user) for user in db.query(User).order_by(User.full_name, User.id).all()]


@router.post('', status_code=201)
def create_user(body: Annotated[dict, Body()], db: Annotated[Session, Depends(get_db)], actor: Annotated[User, Depends(manager)]):
    if set(body) - {'email', 'full_name', 'password'}:
        raise HTTPException(422, 'Only employee email, name and initial password may be set here. New accounts are Officers.')
    name = checked_name(body.get('full_name'))
    email = body.get('email')
    if not isinstance(email, str) or len(email) > 254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email.strip()):
        raise HTTPException(422, 'Employee email is invalid. Enter a complete email address and submit again.')
    password = body.get('password')
    if not isinstance(password, str) or not 12 <= len(password) <= 128:
        raise HTTPException(422, 'Initial password must contain 12 to 128 characters. Choose a longer password and submit again.')
    user = User(email=email.strip().lower(), full_name=name, hashed_password=hash_password(password), role=UserRole.USER)
    db.add(user)
    try:
        db.flush()
        db.add(EventLog(actor_id=actor.id, action='user.created', detail=f'employee {user.id}'))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'An account already uses this email. Use another email or update the existing employee.') from None
    return user_data(user)


@router.patch('/{user_id}')
def update_user(user_id: str, body: Annotated[dict, Body()], db: Annotated[Session, Depends(get_db)], actor: Annotated[User, Depends(manager)]):
    if not body or set(body) - {'full_name', 'is_active'}:
        raise HTTPException(422, 'Only employee name and active status may be changed. Correct the form and submit again.')
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, 'Employee account not found. Refresh the employee list.')
    if user.role != UserRole.USER:
        raise HTTPException(403, 'Manager accounts cannot be changed from employee management. Select an Officer account.')
    name = checked_name(body['full_name']) if 'full_name' in body else user.full_name
    if 'is_active' in body and type(body['is_active']) is not bool:
        raise HTTPException(422, 'Active status must be true or false. Correct the form and submit again.')
    if 'is_active' in body and body['is_active'] != user.is_active:
        user.is_active = body['is_active']
        user.token_version += 1  # invalidate previous tokens even after reactivation
        user.failed_login_count = 0
        user.locked_until = None
    user.full_name = name
    db.add(EventLog(actor_id=actor.id, action='user.updated', detail=f'employee {user.id}; active={user.is_active}'))
    db.commit()
    return user_data(user)
