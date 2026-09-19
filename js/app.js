import { createSimulation, resetSimulation, updateVehiclePosition, triggerSkid } from './vehicle.js';
import { calculatePhysics } from './physics.js';
import { getCurrentRoadSegment, routeLength } from './road-data.js';
import { TrackRenderer } from './renderer.js';
import { updateFBD } from './fbd.js';
import { bindControls } from './controls.js';
const $ = id => document.getElementById(id);
const sim = createSimulation();
const renderer = new TrackRenderer($('road-canvas'));
const number = n => Math.round(n).toLocaleString('en-US');
let lastFrame = null, lastUI = -Infinity, requestedFrame = null;
let lastOutcome = '', lastStatus = '';

function updateUI() {
  const section = sim.skid?.segment || getCurrentRoadSegment(sim.distance);
  const p = calculatePhysics(sim.params, section);
  $('section-title').textContent = section.name;
  $('direction').textContent = section.type === 'straight' ? 'STRAIGHT →' : `${section.direction.toUpperCase()} ${section.direction === 'left' ? '↶' : '↷'}${section.uTurn ? ' · U-TURN' : ''}`;
  $('radius-value').innerHTML = `${Number.isFinite(p.radius) ? p.radius : '∞'} <small>m</small>`;
  $('critical-value').innerHTML = `${Number.isFinite(p.critical) ? p.critical.toFixed(1) : '—'} <small>m/s</small>`;
  $('grip-value').textContent = `${Math.round(p.ratio * 100)}%`;
  const status = sim.skid ? 'SKIDDING' : p.status;
  const badge = $('grip-status'); badge.dataset.status = status;
  badge.textContent = `${status === 'SAFE' ? '✓' : status === 'SKIDDING' ? '✕' : '⚠'} ${sim.skid && sim.phase === 'ended' ? 'GRIP LOST' : status}`;
  $('grip-fill').style.width = `${Math.min(100, p.ratio * 100)}%`;
  $('grip-fill').style.background = status === 'SKIDDING' ? '#c66b48' : status === 'SAFE' ? '#92a85e' : '#d0a34c';
  $('required-substitution').textContent = section.type === 'curve' ? `${number(sim.params.mass)} × ${sim.params.speed.toFixed(1)}² ÷ ${p.radius}` : 'Straight road → no curvature';
  $('required-result').innerHTML = `${number(p.required)} <small>N</small>`;
  $('available-substitution').textContent = `${sim.params.mu.toFixed(2)} × ${number(sim.params.mass)} × 9.81`;
  $('available-result').innerHTML = `${number(p.available)} <small>N</small>`;
  $('force-comparison').textContent = `${number(p.required)} N ${p.skids ? '>' : '≤'} ${number(p.available)} N`;
  $('force-comparison').style.color = p.skids ? '#b04b35' : '';
  $('critical-equation').textContent = Number.isFinite(p.critical) ? `vc = √(${sim.params.mu.toFixed(2)} × 9.81 × ${p.radius}) = ${p.critical.toFixed(1)} m/s` : 'vc = √(μsgr)';
  $('speed-comparison').hidden = !Number.isFinite(p.critical);
  $('speed-comparison').textContent = `Current speed: ${sim.params.speed.toFixed(1)} ${p.skids ? '>' : '≤'} ${p.critical.toFixed(1)} m/s`;
  $('equation-context').textContent = sim.skid ? 'SELECTED CONDITIONS' : 'LIVE VALUES';
  $('elapsed').textContent = sim.time.toFixed(1);
  $('progress').textContent = String(Math.round(sim.distance / routeLength * 100));
  const phaseText = sim.phase === 'completed' ? '✓ Route completed' : sim.phase === 'ended' ? '✕ Route ended' : sim.running ? sim.skid ? '⚠ Grip lost' : '● Driving' : sim.phase === 'ready' ? '● Ready to drive' : 'Ⅱ Paused';
  $('run-state').textContent = phaseText;
  $('start').disabled = sim.running || sim.phase === 'ended' || sim.phase === 'completed';
  $('start').innerHTML = `<span aria-hidden="true">▶</span> ${sim.phase === 'ready' ? 'Start' : 'Resume'}`;
  $('pause').disabled = !sim.running;
  $('map-caption').textContent = sim.skid ? 'Grip lost → inertia carries the car along its tangent' : sim.phase === 'completed' ? 'All curves cleared. Try changing one variable.' : section.type === 'curve' ? `${section.name} · friction points toward the centre` : sim.phase === 'ready' ? 'Your experiment starts here' : 'Straight road · no inward force needed';
  updateFBD(sim.params, section, p, Boolean(sim.skid));
  const statusKey = `${phaseText}:${section.id}:${status}`;
  if (lastStatus !== statusKey) {
    $('road-canvas').setAttribute('aria-label', `Test track. ${phaseText}. ${section.name}. Radius ${Number.isFinite(p.radius) ? p.radius + ' metres' : 'infinite'}. ${sim.skid ? 'The car leaves the intended curve along its tangent, with visible tyre marks.' : 'Green friction points inward; blue velocity is tangent to the road.'}`);
    lastStatus = statusKey;
  }
  const outcome = sim.skid ? 'skid' : sim.phase === 'completed' ? 'complete' : '';
  if (outcome !== lastOutcome) {
    lastOutcome = outcome;
    $('outcome').hidden = !outcome;
    $('outcome').classList.toggle('success', outcome === 'complete');
    if (outcome === 'skid') {
      const s = sim.skid;
      $('outcome').innerHTML = `<strong>⚠ Tyre grip lost · ${s.segment.name}</strong><p>At grip loss: r = ${s.segment.radius} m · v = ${s.params.speed.toFixed(1)} m/s · required ${number(s.physics.required)} N &gt; available ${number(s.physics.available)} N.</p><p>Inertia carries the car along its tangent. This coasting illustration omits kinetic friction. Reset to try again; live values reflect your selected conditions.</p>`;
    } else if (outcome === 'complete') {
      $('outcome').innerHTML = `<strong>✓ Route completed</strong><p>Maximum grip usage: ${Math.round(sim.maxGrip * 100)}% · Most demanding turn: ${sim.demandingTurn} · Smallest radius: 12 m.</p><p>Reset, then try increasing the speed or selecting Rainy.</p>`;
    }
  }
}
function render() { updateUI(); renderer.draw(sim); }
function requestFrame() { if (requestedFrame === null && sim.running) requestedFrame = requestAnimationFrame(frame); }
function frame(timestamp) {
  requestedFrame = null;
  if (!sim.running) return;
  const dt = lastFrame === null ? 0 : Math.min((timestamp - lastFrame) / 1000, .05);
  lastFrame = timestamp;
  updateVehiclePosition(sim, dt * sim.playback);
  renderer.draw(sim);
  if (timestamp - lastUI >= 80 || !sim.running) { updateUI(); lastUI = timestamp; }
  requestFrame();
}
function haltFrame() {
  if (requestedFrame !== null) cancelAnimationFrame(requestedFrame);
  requestedFrame = null; lastFrame = null;
}
$('start').addEventListener('click', () => {
  if (sim.running || ['ended', 'completed'].includes(sim.phase)) return;
  sim.running = true; if (!sim.skid) sim.phase = 'driving'; lastFrame = null; render(); requestFrame();
});
$('pause').addEventListener('click', () => { sim.running = false; haltFrame(); render(); });
$('reset').addEventListener('click', () => { haltFrame(); resetSimulation(sim); render(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && sim.running) { sim.running = false; haltFrame(); render(); } });
bindControls(sim, renderer, () => {
  // A live parameter or weather change can cause immediate grip loss on a curve.
  if (sim.running && !sim.skid) {
    const section = getCurrentRoadSegment(sim.distance);
    if (calculatePhysics(sim.params, section).skids) triggerSkid(sim, section);
  }
  render();
});
