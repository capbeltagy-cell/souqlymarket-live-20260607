import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("production security boundaries", () => {
  it("does not expose private agent financial or contact data", () => {
    const server = read("src/lib/public-agent.functions.ts");
    const page = read("src/routes/agents.$id.tsx");

    expect(server).not.toMatch(/select\([^)]*phone[,\s"]/s);
    expect(server).not.toContain('from("commissions")');
    expect(page).not.toContain('from("commissions")');
    expect(page).not.toContain("wa.me");
    expect(page).not.toContain("tel:");
  });

  it("does not elevate privileges or hard-delete moderated listings", () => {
    const superAdmin = read("src/lib/super-admin.functions.ts");
    const moderation = read("src/lib/moderation.functions.ts");

    expect(superAdmin).not.toContain('.upsert({ user_id: ctx.userId, role: "admin" }');
    expect(superAdmin).not.toContain('"delete",');
    expect(superAdmin).not.toMatch(/\.from\(data\.entity\)\.delete\(\)/);
    expect(moderation).not.toContain('.from("listings").delete()');
    expect(moderation).toContain('update({ status: "rejected" })');
  });
});
