import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// One config for every workspace. ESLint 9 walks up from the directory it is run
// in, so `npm run lint -w @caresy/admin` finds this file and each app needs no
// copy of its own — admin and companion previously had a `lint` script with no
// config at all, so `npm run lint` there failed before it linted a single line.
//
// apps/mobile is the Capacitor shell and holds no product code, so it has no
// lint script to satisfy.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next. Every pattern is **-prefixed
  // because these resolve against this file's directory, not the app the lint
  // runs in — bare ".next/**" only hides the root's build output and let 15,900
  // problems in apps/*/.next through.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    // Generated, not authored: graphify's knowledge-graph output ships in-repo.
    "graphify-out/**",
  ]),
]);

export default eslintConfig;
