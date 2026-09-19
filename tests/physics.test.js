import test from 'node:test';
import assert from 'node:assert/strict';
import { G, WEATHER, calculateCentripetalForce as force, calculateMaxStaticFriction as maxFriction, calculateCriticalSpeed as critical, calculateGripRatio, calculatePhysics } from '../js/physics.js';
import { roadSegments, curves, routeLength, getPose, getCurveCentre, getTangentDirection, getCurrentRoadSegment } from '../js/road-data.js';
import { createSimulation, updateVehiclePosition, resetSimulation } from '../js/vehicle.js';
const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≈ ${b}`);

test('Fc = mv²/r: 1000 kg, 10 m/s, 20 m gives 5000 N', () => assert.equal(force(1000, 10, 20), 5000));
test('Fmax = μmg: μ=.5 and 1000 kg gives 4905 N and loses grip at 5000 N', () => {
  assert.equal(maxFriction(.5, 1000), 4905);
  assert.equal(calculatePhysics({ mass: 1000, speed: 10, mu: .5 }, { type: 'curve', radius: 20 }).skids, true);
});
test('critical speed is sqrt(μgr)', () => near(critical(.7, G, 30), Math.sqrt(.7 * 9.81 * 30)));
test('800 kg and 2000 kg have identical critical speed and grip ratio', () => {
  const segment = { type: 'curve', radius: 30 };
  const a = calculatePhysics({ mass: 800, speed: 15, mu: .7 }, segment);
  const b = calculatePhysics({ mass: 2000, speed: 15, mu: .7 }, segment);
  assert.equal(a.critical, b.critical); assert.equal(a.ratio, b.ratio); assert.equal(a.skids, b.skids);
  near(b.required / a.required, 2.5); near(b.available / a.available, 2.5);
});
test('a 15 m radius needs four times the force of a 60 m radius', () => assert.equal(force(1200, 15, 15), 4 * force(1200, 15, 60)));
test('doubling speed quadruples force', () => assert.equal(force(1200, 30, 35), 4 * force(1200, 15, 35)));
test('Sunny has more available grip than Rainy for identical mass', () => assert.ok(maxFriction(WEATHER.sunny, 1200) > maxFriction(WEATHER.rainy, 1200)));
test('straight roads have no inward force or finite critical speed', () => {
  const p = calculatePhysics({ mass: 1200, speed: 35, mu: .1 }, roadSegments[0]);
  assert.equal(p.required, 0); assert.equal(p.ratio, 0); assert.equal(p.critical, Infinity); assert.equal(p.skids, false);
});
test('exact critical speed is safe; a slightly higher speed skids', () => {
  const curve = curves[0], vc = critical(.7, G, curve.radius);
  assert.equal(calculatePhysics({ mass: 1200, speed: vc, mu: .7 }, curve).skids, false);
  assert.equal(calculatePhysics({ mass: 1200, speed: vc + .0001, mu: .7 }, curve).skids, true);
});
test('grip ratio matches the force ratio', () => near(calculateGripRatio(1200, 15, 35, .75), force(1200, 15, 35) / maxFriction(.75, 1200)));
test('all adjacent road segments connect with matching tangents', () => {
  for (let i = 1; i < roadSegments.length; i++) {
    const a = getPose(roadSegments[i - 1], roadSegments[i - 1].length), b = getPose(roadSegments[i], 0);
    near(a.x, b.x); near(a.y, b.y); near(Math.cos(a.heading), Math.cos(b.heading)); near(Math.sin(a.heading), Math.sin(b.heading));
  }
});
for (const curve of curves) {
  test(`${curve.name}: physical radius, inward vector and tangent remain correct throughout arc`, () => {
    const centre = getCurveCentre(curve);
    for (let i = 0; i <= 10; i++) {
      const distance = curve.length * i / 10, p = getPose(curve, distance), v = getTangentDirection(curve, distance);
      const inward = { x: centre.x - p.x, y: centre.y - p.y };
      near(Math.hypot(inward.x, inward.y), curve.radius);
      near(v.x * inward.x + v.y * inward.y, 0);
      const signedCross = v.x * inward.y - v.y * inward.x;
      assert.equal(Math.sign(signedCross), curve.direction === 'right' ? 1 : -1);
    }
  });
}
test('route contains two exact semicircular U-turns and a reversing S-bend', () => {
  assert.equal(curves.filter(c => c.uTurn).length, 2);
  for (const c of curves.filter(c => c.uTurn)) { near(Math.abs(c.sweep), Math.PI); near(c.length, Math.PI * c.radius); }
  const s = curves.filter(c => c.name.startsWith('S-bend'));
  assert.equal(s.length, 2); assert.notEqual(s[0].direction, s[1].direction);
});
test('straight motion advances speed × time with fixed tangent', () => {
  const sim = createSimulation(); sim.running = true; updateVehiclePosition(sim, 1);
  near(sim.distance, 15); near(sim.pose.x, 45); near(sim.pose.y, 35); near(sim.pose.heading, 0);
});
test('default route clears first curve, cautions at sharp left and skids at wide U-turn', () => {
  const sim = createSimulation(); sim.running = true;
  assert.equal(calculatePhysics(sim.params, curves[0]).status, 'SAFE');
  assert.equal(calculatePhysics(sim.params, curves[1]).status, 'CAUTION');
  updateVehiclePosition(sim, 60);
  assert.equal(sim.skid.segment.name, 'Wide U-turn'); assert.equal(sim.phase, 'ended');
  assert.ok(sim.skid.physics.required > sim.skid.physics.available);
});
test('Sunny and Rainy at the same speed lose grip at different turns', () => {
  const sunny = createSimulation(), rainy = createSimulation();
  rainy.params.mu = WEATHER.rainy; sunny.running = true; rainy.running = true;
  updateVehiclePosition(sunny, 100); updateVehiclePosition(rainy, 100);
  assert.equal(sunny.skid.segment.name, 'Wide U-turn'); assert.equal(rainy.skid.segment.name, 'Sharp left');
});
test('skid leaves the circle tangentially, makes paired-track samples and preserves loss snapshot', () => {
  const sim = createSimulation(); sim.params.speed = 35; sim.running = true; updateVehiclePosition(sim, 5);
  const { origin, vx, vy, elapsed, segment } = sim.skid;
  near(sim.pose.x - origin.x, vx * elapsed); near(sim.pose.y - origin.y, vy * elapsed);
  const radius = { x: origin.x - segment.centre.x, y: origin.y - segment.centre.y };
  near(radius.x * vx + radius.y * vy, 0);
  assert.ok(Math.hypot(sim.pose.x - segment.centre.x, sim.pose.y - segment.centre.y) > segment.radius);
  assert.ok(sim.skidMarks.length > 20); const value = sim.skid.physics.required;
  sim.params.mass = 2000; assert.equal(sim.skid.physics.required, value);
});
test('pausing freezes car, time and trails, including during a skid', () => {
  for (const speed of [15, 35]) {
    const sim = createSimulation(); sim.params.speed = speed; sim.running = true; updateVehiclePosition(sim, 1.3);
    sim.running = false; const before = JSON.stringify(sim); updateVehiclePosition(sim, 100); assert.equal(JSON.stringify(sim), before);
  }
});
test('reset preserves parameters and playback, clears paths, time and failure state', () => {
  const sim = createSimulation(); sim.params.speed = 35; sim.playback = .25; sim.running = true; updateVehiclePosition(sim, 20);
  for (let i = 0; i < 5; i++) resetSimulation(sim);
  assert.equal(sim.params.speed, 35); assert.equal(sim.playback, .25); assert.equal(sim.time, 0); assert.equal(sim.distance, 0);
  assert.equal(sim.skid, null); assert.equal(sim.trail.length, 0); assert.equal(sim.skidMarks.length, 0); assert.equal(sim.phase, 'ready'); assert.equal(sim.running, false);
});
test('safe 5 m/s completes all turns and reports tight U-turn as most demanding', () => {
  const sim = createSimulation(); sim.params.speed = 5; sim.running = true; updateVehiclePosition(sim, 200);
  assert.equal(sim.phase, 'completed'); assert.equal(sim.skid, null); near(sim.distance, routeLength);
  assert.equal(sim.demandingTurn, 'Tight U-turn'); assert.ok(sim.maxGrip < 1);
});
test('large and small time steps produce identical segment transitions', () => {
  const a = createSimulation(), b = createSimulation(); a.running = true; b.running = true;
  updateVehiclePosition(a, 18);
  for (let i = 0; i < 1800; i++) updateVehiclePosition(b, .01);
  near(a.distance, b.distance, 1e-6); near(a.pose.x, b.pose.x, 1e-6); near(a.pose.y, b.pose.y, 1e-6);
  assert.equal(getCurrentRoadSegment(a.distance).id, getCurrentRoadSegment(b.distance).id);
});
test('parameter changes on an active curve immediately take effect on the next step', () => {
  const sim = createSimulation(); sim.running = true; updateVehiclePosition(sim, 4); assert.equal(sim.skid, null);
  sim.params.mu = .1; updateVehiclePosition(sim, .01); assert.equal(sim.skid.segment.name, 'Gentle right');
});
