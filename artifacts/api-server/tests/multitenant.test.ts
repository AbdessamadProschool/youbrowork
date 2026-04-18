import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Security Audit - Multi-Tenant Isolation", () => {
  it("GET /api/stagiaires doit échouer si le header x-etab-id est manquant", async () => {
    const res = await request(app).get("/api/stagiaires");
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Identifiant d'établissement manquant");
  });

  it("doit refuser l'accès aux notes d'un stagiaire d'un autre établissement", async () => {
    // Supposons que le stagiaire 'CEF123' appartient au Centre A
    // On essaie d'y accéder avec le header du Centre B
    const res = await request(app)
      .get("/api/stagiaires/CEF123/notes")
      .set("x-etab-id", "CENTRE_B");

    // Doit retourner 404 car le stagiaire n'existe pas POUR ce tenant
    expect(res.status).toBe(404);
  });
});
