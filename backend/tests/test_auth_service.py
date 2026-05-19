import pytest

from app.services.auth_service import authenticate


@pytest.mark.asyncio
async def test_authenticate_valid_credentials(db_session, test_user_prof):
    user = await authenticate(db_session, "testprof@test.ca", "Test@1234")
    assert user is not None
    assert user.id == test_user_prof.id
    assert user.role.value == "prof"


@pytest.mark.asyncio
async def test_authenticate_wrong_password(db_session, test_user_prof):
    user = await authenticate(db_session, "testprof@test.ca", "wrong-password")
    assert user is None


@pytest.mark.asyncio
async def test_authenticate_unknown_email(db_session):
    user = await authenticate(db_session, "doesnotexist@test.ca", "anything")
    assert user is None
