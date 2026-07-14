import os

import pytest

from cognigy_client import CognigySession

ENDPOINT_ENV = "COGNIGY_REST_ENDPOINT_URL"


@pytest.fixture()
def session() -> CognigySession:
    """Fresh conversation session per test — tests must not share dialog state."""
    endpoint = os.environ.get(ENDPOINT_ENV)
    if not endpoint:
        pytest.skip(f"{ENDPOINT_ENV} not set — create a REST endpoint on the Main flow and export it")
    return CognigySession(endpoint_url=endpoint)
