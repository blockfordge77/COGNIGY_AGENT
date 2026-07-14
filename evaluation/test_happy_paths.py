"""Happy-path regression suite for the Aurora Outdoors agent.

Mirrors demo/demo-script.md — if this suite is green, the demo is safe.
Run it after every prompt/instruction/tool-description change:

    export COGNIGY_REST_ENDPOINT_URL="https://endpoint-trial.cognigy.ai/..."
    pytest -v

Assertions are keyword-based on purpose: LLM phrasing varies between runs, but a grounded
answer about the 30-day return policy will always contain "30", and a correct order lookup
for AO-1001 will always mention DHL. Testing invariants, not exact strings, is what keeps
an LLM regression suite stable.
"""


class TestFaqKnowledge:
    def test_return_policy_is_grounded(self, session):
        reply = session.say("What is your return policy?")
        reply.assert_contains_any("30 day", "30-day", "30 days")

    def test_refund_timing_followup(self, session):
        session.say("What is your return policy?")
        reply = session.say("And how long until I get my money back?")
        reply.assert_contains_any("3-5", "3 to 5", "business days", "bank")

    def test_shipping_costs(self, session):
        reply = session.say("How much is shipping?")
        reply.assert_contains_any("4.95", "4,95", "free")


class TestOrderStatus:
    def test_shipped_order_lookup(self, session):
        session.say("Where is my order?")
        reply = session.say("Order AO-1001, email erika.mustermann@example.com")
        reply.assert_contains_any("shipped", "DHL")

    def test_processing_order_lookup(self, session):
        session.say("Can you check order AO-1003? My email is erika.mustermann@example.com")
        reply = session.say("yes please")
        reply.assert_contains_any("processing", "AO-1003")

    def test_unknown_order_is_not_hallucinated(self, session):
        """The agent must not invent data for a non-existent order."""
        session.say("Check my order please")
        reply = session.say("AO-9999, erika.mustermann@example.com")
        reply.assert_contains_any("couldn't find", "could not find", "not find", "no order", "unable")


class TestReturnFlow:
    def test_return_request_triggers_xapp(self, session):
        """The start_return tool should fire and deliver an xApp (data output),
        not interrogate the customer about products in chat."""
        session.say("I'd like to return something from order AO-1002, erika.mustermann@example.com")
        reply = session.say("yes, start the return")
        combined = (reply.full_text + " " + str(reply.data)).lower()
        assert reply.data or "form" in combined or "select" in combined, (
            f"Expected an xApp/data output or form reference, got: {reply.full_text!r}"
        )


class TestLanguageSwitching:
    def test_switch_to_german(self, session):
        session.say("Hi there!")
        reply = session.say("Können wir auf Deutsch weitermachen?")
        reply.assert_contains_any("gerne", "natürlich", "deutsch", "helfen", "kann ich")

    def test_german_faq_is_grounded_in_german(self, session):
        session.say("Können wir auf Deutsch weitermachen?")
        reply = session.say("Was kostet der Versand?")
        reply.assert_contains_any("4,95", "4.95", "kostenlos")


class TestSupportTicket:
    def test_ticket_creation_returns_number(self, session):
        session.say("I have a problem with a discount code, please create a support ticket. My email is erika.mustermann@example.com")
        reply = session.say("Subject: discount code AURORA10 not working. That's all.")
        reply.assert_contains_any("TCK-", "ticket")
