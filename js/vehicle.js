import { calculatePhysics } from './physics.js';
import { getCurrentRoadSegment, poseAtDistance, routeLength } from './road-data.js';
export const DEFAULTS = Object.freeze({ speed: 15, mass: 1200, mu: .75 });
export function createSimulation() {
  const sim = { params: { ...DEFAULTS }, playback: 1 };
  resetSimulation(sim);
  return sim;
}
export function resetSimulation(sim) {
  Object.assign(sim, { running: false, phase: 'ready', distance: 0, time: 0, pose: poseAtDistance(0),
    trail: [], skidMarks: [], skid: null, maxGrip: 0, demandingTurn: null, lastTrail: -1 });
}
export function triggerSkid(sim, segment) {
  if (sim.skid) return;
  const physics = calculatePhysics(sim.params, segment);
  sim.phase = 'skidding';
  sim.skid = { origin: { ...sim.pose }, elapsed: 0, params: { ...sim.params }, segment, physics,
    vx: Math.cos(sim.pose.heading) * sim.params.speed, vy: Math.sin(sim.pose.heading) * sim.params.speed };
}
function recordTrail(sim) {
  if (sim.time - sim.lastTrail < .04) return;
  sim.lastTrail = sim.time;
  const sample = { ...sim.pose };
  if (sim.skid) sim.skidMarks.push(sample);
  else sim.trail.push(sample);
  if (sim.trail.length > 3000) sim.trail.shift();
}
export function updateVehiclePosition(sim, dt) {
  if (!sim.running || dt <= 0) return;
  // Substeps and exact segment boundaries prevent jumping past a short unsafe arc.
  let remaining = dt;
  while (remaining > 1e-9 && sim.running) {
    const step = Math.min(remaining, 1 / 120);
    remaining -= step;
    if (sim.skid) {
      const skidStep = Math.min(step, 2 - sim.skid.elapsed);
      sim.skid.elapsed += skidStep;
      sim.time += skidStep;
      // Educational tangent-coasting approximation: kinetic friction is omitted.
      sim.pose.x = sim.skid.origin.x + sim.skid.vx * sim.skid.elapsed;
      sim.pose.y = sim.skid.origin.y + sim.skid.vy * sim.skid.elapsed;
      recordTrail(sim);
      if (sim.skid.elapsed >= 2 - 1e-9) { sim.running = false; sim.phase = 'ended'; }
      continue;
    }
    const segment = getCurrentRoadSegment(sim.distance);
    const p = calculatePhysics(sim.params, segment);
    if (p.ratio > sim.maxGrip) { sim.maxGrip = p.ratio; sim.demandingTurn = segment.name; }
    if (p.skids) { triggerSkid(sim, segment); remaining += step; continue; }
    const toBoundary = segment.offset + segment.length - sim.distance;
    const travel = Math.min(sim.params.speed * step, toBoundary);
    const actualStep = travel / sim.params.speed;
    sim.distance = Math.min(routeLength, sim.distance + travel);
    sim.time += actualStep;
    sim.pose = poseAtDistance(sim.distance);
    recordTrail(sim);
    remaining += step - actualStep;
    if (sim.distance >= routeLength - 1e-8) { sim.running = false; sim.phase = 'completed'; }
  }
}
