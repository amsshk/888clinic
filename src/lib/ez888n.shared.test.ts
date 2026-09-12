import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateEz888nAppUrl } from "./ez888n.shared";

describe("validateEz888nAppUrl", () => {
  it("1. validates secure hosted HTTPS URLs", () => {
    const result = validateEz888nAppUrl("https://ez888n.888clinic.co");
    assert.equal(result.isValid, true);
    assert.equal(result.url, "https://ez888n.888clinic.co");
    assert.equal(result.isLocalhost, false);
    assert.equal(result.error, undefined);
  });

  it("2. permits HTTP for localhost development", () => {
    const result = validateEz888nAppUrl("http://localhost:3000");
    assert.equal(result.isValid, true);
    assert.equal(result.url, "http://localhost:3000");
    assert.equal(result.isLocalhost, true);
    assert.equal(result.error, undefined);

    const ipResult = validateEz888nAppUrl("http://127.0.0.1:5173");
    assert.equal(ipResult.isValid, true);
    assert.equal(ipResult.url, "http://127.0.0.1:5173");
  });

  it("3. handles missing or empty values gracefully", () => {
    const nullResult = validateEz888nAppUrl(null);
    assert.equal(nullResult.isValid, false);
    assert.equal(nullResult.url, null);
    assert.match(nullResult.error ?? "", /not configured/);

    const emptyResult = validateEz888nAppUrl("   ");
    assert.equal(emptyResult.isValid, false);
    assert.equal(emptyResult.url, null);
    assert.match(emptyResult.error ?? "", /empty/);
  });

  it("4. rejects insecure HTTP for non-localhost hosted environments", () => {
    const result = validateEz888nAppUrl("http://ez888n.888clinic.co");
    assert.equal(result.isValid, false);
    assert.equal(result.url, null);
    assert.match(result.error ?? "", /HTTPS is required/);
  });

  it("5. rejects script and non-web URLs", () => {
    const scriptResult = validateEz888nAppUrl("javascript:alert('xss')");
    assert.equal(scriptResult.isValid, false);
    assert.equal(scriptResult.url, null);
    assert.match(scriptResult.error ?? "", /forbidden/);

    const dataResult = validateEz888nAppUrl("data:text/html,<script>alert(1)</script>");
    assert.equal(dataResult.isValid, false);
    assert.equal(dataResult.url, null);
  });

  it("6. removes embedded usernames and passwords from valid URLs", () => {
    const result = validateEz888nAppUrl("https://admin:secret123@ez888n.888clinic.co/dashboard");
    assert.equal(result.isValid, true);
    assert.equal(result.url, "https://ez888n.888clinic.co/dashboard");
  });

  it("7. rejects malformed URLs", () => {
    const result = validateEz888nAppUrl("not-a-valid-url");
    assert.equal(result.isValid, false);
    assert.equal(result.url, null);
    assert.match(result.error ?? "", /Malformed/);
  });
});
