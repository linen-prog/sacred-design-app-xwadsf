import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectWebSocket, connectAuthenticatedWebSocket, waitForMessage } from "./helpers";

describe("API Integration Tests", () => {
  let authToken: string;

  test("Sign up test user for authenticated endpoints", async () => {
    const { token } = await signUpTestUser();
    authToken = token;
    expect(authToken).toBeDefined();
  });

  describe("Daily Alignment", () => {
    const validPayload = {
      primary_archetype: "Warrior",
      secondary_archetype: "Sage",
      blend_name: "Warrior Sage",
      avoidant_score: 3,
      anxious_score: 2,
      overactive_score: 4,
      grounded_score: 7,
    };

    test("POST /api/daily-alignment creates alignment when authenticated", async () => {
      const res = await authenticatedApi("/api/daily-alignment", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.id).toBeDefined();
    });

    test("POST /api/daily-alignment returns 401 without authentication", async () => {
      const res = await api("/api/daily-alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      });
      await expectStatus(res, 401);
    });

    test("POST /api/daily-alignment returns 400 with missing required fields", async () => {
      const incompletePayload = { primary_archetype: "Warrior" };
      const res = await authenticatedApi("/api/daily-alignment", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incompletePayload),
      });
      await expectStatus(res, 400);
    });

    test("GET /api/daily-alignment/today returns alignment when authenticated", async () => {
      const res = await authenticatedApi("/api/daily-alignment/today", authToken, {
        method: "GET",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.alignment).toBeDefined();
    });

    test("GET /api/daily-alignment/today returns 401 without authentication", async () => {
      const res = await api("/api/daily-alignment/today", {
        method: "GET",
      });
      await expectStatus(res, 401);
    });
  });
});
