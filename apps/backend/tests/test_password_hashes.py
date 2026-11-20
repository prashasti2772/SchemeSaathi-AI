"""Legacy account verification with current bcrypt and full PBKDF2 passphrases."""
import bcrypt
import pytest

from src.utils.security import hash_password, verify_password


@pytest.mark.parametrize("password", ["legacy-test-password", "long-legacy-passphrase-" * 5, "सुरक्षित-पासवर्ड" * 8])
def test_legacy_bcrypt_hashes_remain_usable(password):
    # Legacy bcrypt silently truncated at 72 bytes; preserve existing accounts.
    digest = bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt(rounds=4)).decode("ascii")
    assert verify_password(password, digest)
    assert not verify_password("incorrect-" + password, digest)


def test_new_hashes_keep_all_characters_beyond_bcrypt_limit():
    password = "x" * 90 + " correct suffix "
    digest = hash_password(password)
    assert digest.startswith("$pbkdf2-sha256$")
    assert verify_password(password, digest)
    assert not verify_password("x" * 90 + " wrong suffix ", digest)


@pytest.mark.parametrize("digest", ["not-a-password-hash", "$2b$broken", ""])
def test_malformed_hashes_fail_closed(digest):
    assert verify_password("test-password", digest) is False
