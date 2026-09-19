export const G = 9.81;
export const WEATHER = Object.freeze({ sunny: 0.75, rainy: 0.40 });
export function calculateCentripetalForce(m, v, r = Infinity) {
  return Number.isFinite(r) && r > 0 ? m * v * v / r : 0;
}
export function calculateMaxStaticFriction(mu, m, g = G) { return mu * m * g; }
export function calculateCriticalSpeed(mu, g = G, r = Infinity) { return Math.sqrt(mu * g * r); }
export function calculateGripRatio(m, v, r, mu) {
  return calculateCentripetalForce(m, v, r) / calculateMaxStaticFriction(mu, m);
}
export function calculatePhysics(params, segment) {
  const radius = segment.type === 'curve' ? segment.radius : Infinity;
  const required = calculateCentripetalForce(params.mass, params.speed, radius);
  const available = calculateMaxStaticFriction(params.mu, params.mass);
  // Compare accelerations: mass cancels and cannot change the skid threshold.
  const ratio = Number.isFinite(radius) ? params.speed ** 2 / (radius * params.mu * G) : 0;
  return { radius, required, available, ratio, critical: calculateCriticalSpeed(params.mu, G, radius),
    skids: ratio > 1 + 1e-12,
    status: ratio > 1 + 1e-12 ? 'SKIDDING' : ratio >= .95 ? 'NEAR LIMIT' : ratio >= .75 ? 'CAUTION' : 'SAFE' };
}
