import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * ADR-0001 requires a **one-way** dependency graph. A modular monolith that
 * does not enforce its own direction is just a monolith, so the rule is a test
 * rather than a comment.
 *
 * Four independent checks:
 * 1. declared `package.json` dependencies;
 * 2. actual `import` statements in source, which is what would really create
 *    the cycle;
 * 3. the same two checks for `apps/*`, including ADR-0001 rule 4 ("apps may not
 *    import each other");
 * 4. relative import specifiers, which bypass the `@chefmate/*` scan entirely —
 *    `../../../database/src/pool.js` is the same violation written differently.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** What each package is allowed to depend on. Anything else is a violation. */
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  contracts: [],
  domain: ["contracts"],
  application: ["contracts", "domain"],
  config: ["contracts"],
  observability: ["config", "contracts"],
  database: ["application", "config", "contracts", "domain", "observability"],
  integrations: ["application", "config", "contracts", "domain", "observability"],
  testkit: ["application", "config", "contracts", "domain", "observability"],
};

const PACKAGE_NAMES = Object.keys(ALLOWED);

/**
 * What each app is allowed to depend on.
 *
 * `apps/*` are the composition roots of ADR-0001, so they may reach into the
 * adapter packages — but not into each other (rule 4), and `web` runs in a
 * browser: `database`, `integrations` and `config` carry a SQL client, provider
 * secrets and server environment parsing, so a `web` import of any of them would
 * put them in a client bundle and hand the browser "pricing authority ... bank
 * decryption, provider secrets" that blueprint section 5.2 forbids it.
 */
const APP_ALLOWED: Readonly<Record<string, readonly string[]>> = {
  web: ["contracts"],
  api: [
    "application",
    "config",
    "contracts",
    "database",
    "domain",
    "integrations",
    "observability",
  ],
  worker: [
    "application",
    "config",
    "contracts",
    "database",
    "domain",
    "integrations",
    "observability",
  ],
};

const APP_NAMES = Object.keys(APP_ALLOWED);

function sourceFiles(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }
  const output: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      output.push(full);
    }
  }
  return output;
}

function importedChefmatePackages(file: string): string[] {
  const contents = readFileSync(file, "utf8");
  return [...contents.matchAll(/from\s+["']@chefmate\/([a-z]+)["']/g)].map(
    (match) => match[1] ?? "",
  );
}

/** Every relative specifier (`import`, `export ... from`, dynamic `import()`). */
function relativeSpecifiers(file: string): string[] {
  const contents = readFileSync(file, "utf8");
  return [
    ...[...contents.matchAll(/from\s+["'](\.[^"']*)["']/g)],
    ...[...contents.matchAll(/import\s*\(\s*["'](\.[^"']*)["']\s*\)/g)],
    ...[...contents.matchAll(/require\s*\(\s*["'](\.[^"']*)["']\s*\)/g)],
  ].map((match) => match[1] ?? "");
}

/**
 * Relative imports that climb out of their own package/app root.
 *
 * The `@chefmate/*` scan above only sees package specifiers. `../../../database/
 * src/pool.js` is the identical violation with the module resolution written by
 * hand, and it is invisible to that scan — so it gets its own rule. The boundary
 * is the package/app root, not `src`: reaching a sibling directory inside the
 * same unit (a fixture, `data/`, a config file) is not a topology violation.
 */
function relativeEscapes(unitRoot: string, sourceRoot: string): string[] {
  const violations: string[] = [];
  for (const file of sourceFiles(sourceRoot)) {
    for (const specifier of relativeSpecifiers(file)) {
      const resolved = path.resolve(path.dirname(file), specifier);
      const relativeToUnit = path.relative(unitRoot, resolved);
      if (relativeToUnit === ".." || relativeToUnit.startsWith(`..${path.sep}`)) {
        violations.push(
          `${path.relative(repoRoot, file)} imports "${specifier}", which escapes ${path.relative(repoRoot, unitRoot)}`,
        );
      }
    }
  }
  return violations;
}

describe("declared dependencies respect the dependency direction", () => {
  it.each(PACKAGE_NAMES)("packages/%s", (name) => {
    const manifest = JSON.parse(
      readFileSync(path.join(repoRoot, "packages", name, "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };

    const workspaceDeps = Object.keys(manifest.dependencies ?? {})
      .filter((dependency) => dependency.startsWith("@chefmate/"))
      .map((dependency) => dependency.replace("@chefmate/", ""));

    const allowed = ALLOWED[name] ?? [];
    expect(workspaceDeps.filter((dependency) => !allowed.includes(dependency))).toEqual([]);
  });
});

describe("actual imports respect the dependency direction", () => {
  it.each(PACKAGE_NAMES)("packages/%s", (name) => {
    const allowed = ALLOWED[name] ?? [];
    const violations: string[] = [];

    for (const file of sourceFiles(path.join(repoRoot, "packages", name, "src"))) {
      for (const imported of importedChefmatePackages(file)) {
        if (imported !== name && !allowed.includes(imported)) {
          violations.push(`${path.relative(repoRoot, file)} imports @chefmate/${imported}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("no package imports an application", () => {
    const violations: string[] = [];
    for (const name of PACKAGE_NAMES) {
      for (const file of sourceFiles(path.join(repoRoot, "packages", name, "src"))) {
        const contents = readFileSync(file, "utf8");
        if (/from\s+["'](?:@chefmate\/(?:api|web|worker)|.*apps\/)/.test(contents)) {
          violations.push(path.relative(repoRoot, file));
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("no relative import escapes its own package (ADR-0001 rule 5)", () => {
    const violations: string[] = [];
    for (const name of PACKAGE_NAMES) {
      const root = path.join(repoRoot, "packages", name);
      violations.push(...relativeEscapes(root, path.join(root, "src")));
      violations.push(...relativeEscapes(root, path.join(root, "tests")));
    }
    expect(violations).toEqual([]);
  });

  it("the graph is acyclic by construction", () => {
    // Every allow-list entry must itself be a known package, and no package may
    // appear in its own transitive allow-list.
    const reachable = (name: string, seen = new Set<string>()): Set<string> => {
      for (const dependency of ALLOWED[name] ?? []) {
        expect(PACKAGE_NAMES).toContain(dependency);
        if (!seen.has(dependency)) {
          seen.add(dependency);
          reachable(dependency, seen);
        }
      }
      return seen;
    };

    for (const name of PACKAGE_NAMES) {
      expect(reachable(name).has(name)).toBe(false);
    }
  });
});

describe("apps respect the dependency direction (ADR-0001 rule 4)", () => {
  it.each(APP_NAMES)("apps/%s declares only allowed workspace dependencies", (name) => {
    const manifest = JSON.parse(
      readFileSync(path.join(repoRoot, "apps", name, "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

    // `devDependencies` are checked too: `@chefmate/testkit` is the only
    // workspace package an app may take as a dev dependency.
    const allowed = [...(APP_ALLOWED[name] ?? []), "testkit"];
    const declared = [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
    ]
      .filter((dependency) => dependency.startsWith("@chefmate/"))
      .map((dependency) => dependency.replace("@chefmate/", ""));

    expect(declared.filter((dependency) => !allowed.includes(dependency))).toEqual([]);
  });

  it.each(APP_NAMES)("apps/%s imports only allowed workspace packages", (name) => {
    const allowed = [...(APP_ALLOWED[name] ?? []), "testkit"];
    const violations: string[] = [];

    for (const file of sourceFiles(path.join(repoRoot, "apps", name, "src"))) {
      for (const imported of importedChefmatePackages(file)) {
        if (!allowed.includes(imported)) {
          violations.push(`${path.relative(repoRoot, file)} imports @chefmate/${imported}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("no app imports another app", () => {
    const violations: string[] = [];
    for (const name of APP_NAMES) {
      const others = APP_NAMES.filter((other) => other !== name);
      for (const file of sourceFiles(path.join(repoRoot, "apps", name, "src"))) {
        const contents = readFileSync(file, "utf8");
        // Spelling one: the package specifier, or any path naming the sibling.
        for (const other of others) {
          const pattern = new RegExp(`["'](?:@chefmate/${other}(?:/|["'])|[^"']*apps/${other}/)`);
          if (pattern.test(contents)) {
            violations.push(`${path.relative(repoRoot, file)} reaches into apps/${other}`);
          }
        }
        // Spelling two: a relative path that *resolves* into a sibling app. It
        // never contains the literal `apps/<other>` segment, so the regex above
        // cannot see it.
        for (const specifier of relativeSpecifiers(file)) {
          const resolved = path.resolve(path.dirname(file), specifier);
          const other = others.find((candidate) => {
            const relative = path.relative(path.join(repoRoot, "apps", candidate), resolved);
            return relative !== ".." && !relative.startsWith(`..${path.sep}`);
          });
          if (other !== undefined) {
            violations.push(
              `${path.relative(repoRoot, file)} resolves "${specifier}" into apps/${other}`,
            );
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("apps/web imports no server-only package (blueprint section 5.2)", () => {
    const serverOnly = ["database", "integrations", "config", "observability", "application"];
    const violations: string[] = [];
    for (const file of sourceFiles(path.join(repoRoot, "apps", "web", "src"))) {
      for (const imported of importedChefmatePackages(file)) {
        if (serverOnly.includes(imported)) {
          violations.push(`${path.relative(repoRoot, file)} imports @chefmate/${imported}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("no relative import escapes its own app", () => {
    const violations: string[] = [];
    for (const name of APP_NAMES) {
      const root = path.join(repoRoot, "apps", name);
      violations.push(...relativeEscapes(root, path.join(root, "src")));
    }
    expect(violations).toEqual([]);
  });
});
