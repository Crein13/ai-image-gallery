/**
 * Returns a list of endpoints for a mounted router with the given prefix.
 * Works with Express 4/5 by inspecting router.stack safely.
 * @param {string} prefix
 * @param {import('express').Router} router
 * @returns {Array<{path: string, methods: string[]}>}
 */
export function listEndpointsForRouter(prefix, router) {
  const endpoints = [];
  const stack = router?.stack || [];
  for (const layer of stack) {
    const route = layer && layer.route;
    if (!route) continue;
    const methods = Object.keys(route.methods || {}).map((m) => m.toUpperCase());
    const fullPath = `${prefix}${route.path}`;
    endpoints.push({ path: fullPath, methods });
  }
  return endpoints;
}

/**
 * Pretty-prints endpoints to console in a readable table.
 * @param {Array<{path: string, methods: string[]}>} endpoints
 */
export function printEndpoints(endpoints) {
  if (!endpoints || endpoints.length === 0) {
    console.log('No routes to display.');
    return;
  }
  const rows = endpoints.map((e) => ({ Method: e.methods.join(', '), Path: e.path }));
  console.log('Registered routes:');
  console.table(rows);
}
