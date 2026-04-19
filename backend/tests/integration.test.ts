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

  describe("Alignments", () => {
    let alignmentId: string;

    const generatePayload = {
      primary_archetype: "Sage",
      secondary_archetype: "Magician",
      blend_name: "Sage Magician",
      anxious_score: 4,
      avoidant_score: 2,
      overactive_score: 3,
      grounded_score: 6,
    };

    test("POST /api/alignments/generate creates alignment when authenticated", async () => {
      const res = await authenticatedApi("/api/alignments/generate", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generatePayload),
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.id).toBeDefined();
      alignmentId = data.id;
    });

    test("POST /api/alignments/generate returns 401 without authentication", async () => {
      const res = await api("/api/alignments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generatePayload),
      });
      await expectStatus(res, 401);
    });

    test("POST /api/alignments/generate returns 400 with missing required fields", async () => {
      const incompletePayload = { primary_archetype: "Sage" };
      const res = await authenticatedApi("/api/alignments/generate", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incompletePayload),
      });
      await expectStatus(res, 400);
    });

    test("POST /api/alignments/{id}/complete completes alignment when authenticated", async () => {
      const res = await authenticatedApi(`/api/alignments/${alignmentId}/complete`, authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection_text: "This was a meaningful reflection." }),
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test("POST /api/alignments/{id}/complete returns 401 without authentication", async () => {
      const res = await api(`/api/alignments/${alignmentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection_text: "test" }),
      });
      await expectStatus(res, 401);
    });

    test("POST /api/alignments/{id}/complete returns 400 with missing reflection_text", async () => {
      const res = await authenticatedApi(`/api/alignments/${alignmentId}/complete`, authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await expectStatus(res, 400);
    });

    test("POST /api/alignments/{id}/complete returns 404 with nonexistent UUID", async () => {
      const res = await authenticatedApi("/api/alignments/00000000-0000-0000-0000-000000000000/complete", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection_text: "test" }),
      });
      await expectStatus(res, 404);
    });

    test("GET /api/alignments/history returns alignment history when authenticated", async () => {
      const res = await authenticatedApi("/api/alignments/history", authToken, {
        method: "GET",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.alignments).toBeDefined();
      expect(Array.isArray(data.alignments)).toBe(true);
      expect(data.total_days).toBeDefined();
    });

    test("GET /api/alignments/history returns 200 with empty data when unauthenticated", async () => {
      const res = await api("/api/alignments/history", {
        method: "GET",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.alignments).toBeDefined();
      expect(Array.isArray(data.alignments)).toBe(true);
    });

    test("GET /api/alignments/progress returns user progress when authenticated", async () => {
      const res = await authenticatedApi("/api/alignments/progress", authToken, {
        method: "GET",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.day_count).toBeDefined();
      expect(data.level).toBeDefined();
      expect(data.last_active_date).toBeDefined();
    });

    test("GET /api/alignments/progress returns 200 with empty data when unauthenticated", async () => {
      const res = await api("/api/alignments/progress", {
        method: "GET",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.day_count).toBeDefined();
      expect(data.level).toBeDefined();
    });
  });
});
