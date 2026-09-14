import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("..", import.meta.url));
const rootRoute = readFileSync(`${sourceRoot}/routes/__root.tsx`, "utf8");
const styles = readFileSync(`${sourceRoot}/styles.css`, "utf8");

describe("public theme boundaries", () => {
  test("keeps the admin console outside the public luxury theme", () => {
    expect(rootRoute).not.toMatch(/PUBLIC_LUXURY_PATHS[\s\S]*["']\/admin["']/);
  });

  test("keeps body and heading colors in separate roles", () => {
    expect(styles).toContain("--foreground: #2c2523;");
    expect(styles).toContain("color: var(--gold-deep);");
  });
});