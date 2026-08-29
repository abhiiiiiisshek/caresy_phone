/**
 * Keep the fingerprint runtime version stable against local build pollution.
 *
 * `expo run:android` (and any gradle invocation) writes `.gradle/` and `build/`
 * into native modules under node_modules. Those directories do not exist in a
 * fresh `npm install`, so the fingerprint computed here stopped matching the one
 * EAS computes on its builder, and every production build died at
 * CONFIGURE_EXPO_UPDATES with "Runtime version calculated on local machine not
 * equal to runtime version calculated during build" (builds 2 and 3, 2026-08-29).
 *
 * This file is committed, so both sides apply the same ignores.
 */
/** @type {import('@expo/fingerprint').Config} */
module.exports = {
  ignorePaths: [
    '**/node_modules/**/.gradle/**',
    '**/node_modules/**/android/build/**',
    '**/node_modules/**/.cxx/**',
  ],
};
