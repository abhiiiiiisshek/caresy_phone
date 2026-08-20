#!/usr/bin/env node
// Patch Next 16.2 _global-error prerender hardcode that crashes `next build`.
// Upstream bug: isPageStatic() hardcodes _global-error as isStatic:true and
// ignores `export const dynamic` in app/global-error.tsx, causing React
// `null useContext` during static prerender (issues #93011, #93024, #95705).
// Patch makes _global-error dynamic so it is not prerendered.
// Idempotent — safe to run on every postinstall.
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'build', 'utils.js');
if (!fs.existsSync(target)) {
  // not installed yet (e.g. CI partial) — skip silently
  process.exit(0);
}
let t = fs.readFileSync(target, 'utf8');
let changed = false;

// 1) isStatic: true -> false for _global-error early return
const old1 = "    // Skip page data collection for synthetic _global-error routes\n    if (page === _constants1.UNDERSCORE_GLOBAL_ERROR_ROUTE) {\n        return {\n            isStatic: true,";
const new1 = "    // Patched for Caresy companion: _global-error is NOT static — respect appConfig.dynamic.\n    // Upstream Next 16.2 hardcodes isStatic:true here, ignoring `export const dynamic`\n    // in app/global-error.tsx, which causes React null useContext during prerender.\n    // See https://github.com/vercel/next.js/issues/93011, #93024, #95705.\n    if (page === _constants1.UNDERSCORE_GLOBAL_ERROR_ROUTE) {\n        return {\n            isStatic: false,";
if (t.includes(old1)) {
  t = t.replace(old1, new1);
  changed = true;
} else if (t.includes("Patched for Caresy companion")) {
  // already patched
} else {
  console.warn('[fix-next-global-error] pattern 1 not found — Next version may have changed');
}

// 2) appConfig = {} -> { dynamic: 'force-dynamic' } for global-error entry
const old2 = "appConfig = originalAppPath === _constants1.UNDERSCORE_GLOBAL_ERROR_ROUTE_ENTRY ? {} : reduceAppConfig(segments);";
const new2 = "appConfig = originalAppPath === _constants1.UNDERSCORE_GLOBAL_ERROR_ROUTE_ENTRY ? { dynamic: 'force-dynamic' } : reduceAppConfig(segments);";
if (t.includes(old2)) {
  t = t.replace(old2, new2);
  changed = true;
} else if (t.includes("{ dynamic: 'force-dynamic' }")) {
  // already patched
} else {
  console.warn('[fix-next-global-error] pattern 2 not found');
}

if (changed) {
  fs.writeFileSync(target, t, 'utf8');
  console.log('[fix-next-global-error] patched next/dist/build/utils.js');
} else {
  console.log('[fix-next-global-error] already patched or nothing to do');
}
