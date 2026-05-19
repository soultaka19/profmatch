from app.core.security import create_access_token, decode_access_token


def test_token_contains_role_claim():
    token = create_access_token(subject=42, role="prof")
    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    assert payload["role"] == "prof"
    assert "exp" in payload
