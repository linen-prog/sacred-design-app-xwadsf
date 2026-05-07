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

  describe("Archetypes", () => {
    const archetypePayload = {
      primary_archetype: "Warrior",
      secondary_archetype: "Sage",
      blend_name: "Warrior Sage",
      scores: {
        avoidant_score: 3,
        anxious_score: 2,
        overactive_score: 4,
        grounded_score: 7,
      },
    };

    test("GET /api/archetypes/me returns quiz_completed: false before saving archetype", async () => {
      const res = await authenticatedApi("/api/archetypes/me", authToken, {
        method: "GET",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.quiz_completed).toBe(false);
    });

    test("POST /api/archetypes/save returns 400 with missing required fields", async () => {
      const incompletePayload = { primary_archetype: "Warrior" };
      const res = await authenticatedApi("/api/archetypes/save", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incompletePayload),
      });
      await expectStatus(res, 400);
    });

    test("POST /api/archetypes/save returns 401 without authentication", async () => {
      const res = await api("/api/archetypes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(archetypePayload),
      });
      await expectStatus(res, 401);
    });

    test("POST /api/archetypes/save saves archetype when authenticated", async () => {
      const res = await authenticatedApi("/api/archetypes/save", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(archetypePayload),
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.user_id).toBeDefined();
      expect(data.quiz_completed).toBe(true);
    });

    test("GET /api/archetypes/me returns quiz_completed: true after saving archetype", async () => {
      const res = await authenticatedApi("/api/archetypes/me", authToken, {
        method: "GET",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.quiz_completed).toBe(true);
      expect(data.primary_archetype).toBeDefined();
      expect(data.secondary_archetype).toBeDefined();
      expect(data.blend_name).toBeDefined();
      expect(data.scores).toBeDefined();
    });

    test("GET /api/archetypes/me returns 401 without authentication", async () => {
      const res = await api("/api/archetypes/me", {
        method: "GET",
      });
      await expectStatus(res, 401);
    });

    test("POST /api/archetypes/upsert upserts archetype when authenticated", async () => {
      const res = await authenticatedApi("/api/archetypes/upsert", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(archetypePayload),
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.archetype).toBeDefined();
      expect(data.archetype.id).toBeDefined();
      expect(data.archetype.user_id).toBeDefined();
      expect(data.archetype.quiz_completed).toBe(true);
    });

    test("POST /api/archetypes/upsert returns 401 without authentication", async () => {
      const res = await api("/api/archetypes/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(archetypePayload),
      });
      await expectStatus(res, 401);
    });
  });

  describe("Alignments", () => {
    let alignmentId: string;

    test("POST /api/alignments/generate returns 400 when no archetype saved", async () => {
      // Create a new user without a saved archetype
      const { token: newUserToken } = await signUpTestUser();
      const res = await authenticatedApi("/api/alignments/generate", newUserToken, {
        method: "POST",
      });
      await expectStatus(res, 400);
    });

    test("POST /api/alignments/generate creates alignment when authenticated", async () => {
      const res = await authenticatedApi("/api/alignments/generate", authToken, {
        method: "POST",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.alignment).toBeDefined();
      expect(data.alignment.id).toBeDefined();
      alignmentId = data.alignment.id;
    });

    test("POST /api/alignments/generate accepts optional local_date parameter", async () => {
      const res = await authenticatedApi("/api/alignments/generate", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ local_date: "2026-04-28" }),
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.alignment).toBeDefined();
    });

    test("POST /api/alignments/generate returns 401 without authentication", async () => {
      const res = await api("/api/alignments/generate", {
        method: "POST",
      });
      await expectStatus(res, 401);
    });

    test("POST /api/alignments/{id}/complete completes alignment when authenticated", async () => {
      const res = await authenticatedApi(`/api/alignments/${alignmentId}/complete`, authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, reflection_text: "This was a meaningful reflection." }),
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test("POST /api/alignments/{id}/complete returns 401 without authentication", async () => {
      const res = await api(`/api/alignments/${alignmentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      await expectStatus(res, 401);
    });

    test("POST /api/alignments/{id}/complete returns 400 with missing required completed field", async () => {
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
        body: JSON.stringify({ completed: true }),
      });
      await expectStatus(res, 404);
    });

    test("POST /api/alignments/{id}/complete returns 400 with invalid UUID format", async () => {
      const res = await authenticatedApi("/api/alignments/invalid-uuid/complete", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      await expectStatus(res, 400);
    });

    test("POST /api/alignments/{id}/complete returns 403 when user doesn't own alignment", async () => {
      // Create a new alignment with the first user
      const alignRes = await authenticatedApi("/api/alignments/generate", authToken, {
        method: "POST",
      });
      await expectStatus(alignRes, 200);
      const alignData = await alignRes.json();
      const otherAlignmentId = alignData.alignment.id;

      // Sign up a second user
      const { token: otherToken } = await signUpTestUser();

      // Try to complete the alignment created by the first user with the second user
      const res = await authenticatedApi(`/api/alignments/${otherAlignmentId}/complete`, otherToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });

      await expectStatus(res, 403);
    });

    test("POST /api/alignments/{id}/reflection submits reflection when authenticated", async () => {
      const res = await authenticatedApi(`/api/alignments/${alignmentId}/reflection`, authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection_text: "This was a thoughtful experience." }),
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.reflection).toBeDefined();
      expect(data.reflection.reflection_text).toBeDefined();
    });

    test("POST /api/alignments/{id}/reflection returns 401 without authentication", async () => {
      const res = await api(`/api/alignments/${alignmentId}/reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection_text: "test" }),
      });
      await expectStatus(res, 401);
    });

    test("POST /api/alignments/{id}/reflection returns 400 with missing reflection_text", async () => {
      const res = await authenticatedApi(`/api/alignments/${alignmentId}/reflection`, authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await expectStatus(res, 400);
    });

    test("POST /api/alignments/{id}/reflection returns 400 with empty reflection_text", async () => {
      const res = await authenticatedApi(`/api/alignments/${alignmentId}/reflection`, authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection_text: "" }),
      });
      await expectStatus(res, 400);
    });

    test("POST /api/alignments/{id}/reflection returns 404 with nonexistent UUID", async () => {
      const res = await authenticatedApi("/api/alignments/00000000-0000-0000-0000-000000000000/reflection", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection_text: "test" }),
      });
      await expectStatus(res, 404);
    });

    test("POST /api/alignments/{id}/reflection returns 400 with invalid UUID format", async () => {
      const res = await authenticatedApi("/api/alignments/invalid-uuid/reflection", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection_text: "test" }),
      });
      await expectStatus(res, 400);
    });

    test("GET /api/alignments/today returns alignment when authenticated", async () => {
      const res = await authenticatedApi("/api/alignments/today", authToken, {
        method: "GET",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.alignment).toBeDefined();
    });

    test("GET /api/alignments/today accepts optional local_date query parameter", async () => {
      const res = await authenticatedApi("/api/alignments/today?local_date=2026-04-28", authToken, {
        method: "GET",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.alignment).toBeDefined();
    });

    test("GET /api/alignments/today returns 401 without authentication", async () => {
      const res = await api("/api/alignments/today", {
        method: "GET",
      });
      await expectStatus(res, 401);
    });

    test("GET /api/alignments/history returns alignment history when authenticated", async () => {
      const res = await authenticatedApi("/api/alignments/history", authToken, {
        method: "GET",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test("GET /api/alignments/history returns 401 without authentication", async () => {
      const res = await api("/api/alignments/history", {
        method: "GET",
      });
      await expectStatus(res, 401);
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

  describe("Progress", () => {
    test("GET /api/progress returns user progress when authenticated", async () => {
      const res = await authenticatedApi("/api/progress", authToken, {
        method: "GET",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.day_count).toBeDefined();
      expect(data.streak).toBeDefined();
    });

    test("GET /api/progress returns 401 without authentication", async () => {
      const res = await api("/api/progress", {
        method: "GET",
      });
      await expectStatus(res, 401);
    });
  });

  describe("Reflections", () => {
    test("GET /api/reflections returns reflections array when authenticated", async () => {
      const res = await authenticatedApi("/api/reflections", authToken, {
        method: "GET",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test("GET /api/reflections returns 401 without authentication", async () => {
      const res = await api("/api/reflections", {
        method: "GET",
      });
      await expectStatus(res, 401);
    });
  });

  describe("Account", () => {
    test("DELETE /api/account deletes account when authenticated", async () => {
      // Create a new user for deletion since this endpoint removes the account
      const { token: deleteToken } = await signUpTestUser();
      const res = await authenticatedApi("/api/account", deleteToken, {
        method: "DELETE",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test("DELETE /api/account returns 401 without authentication", async () => {
      const res = await api("/api/account", {
        method: "DELETE",
      });
      await expectStatus(res, 401);
    });
  });
});
