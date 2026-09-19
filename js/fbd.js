import { G } from './physics.js';
export function updateFBD(params, segment, physics, skidding) {
  const format = n => Math.round(n).toLocaleString('en-US');
  const showFriction = segment.type === 'curve' && !skidding;
  const left = segment.direction === 'left';
  document.getElementById('fbd-friction').toggleAttribute('hidden', !showFriction);
  document.getElementById('fbd-arrow').setAttribute('d', left ? 'M132 91 H60' : 'M168 91 H240');
  document.getElementById('fbd-force-label').setAttribute('x', left ? '90' : '207');
  document.getElementById('normal-value').textContent = format(params.mass * G);
  document.getElementById('fbd-max').textContent = `Fmax = μsN = ${format(physics.available)} N`;
  document.getElementById('horizontal-label').textContent = skidding ? 'After grip loss · tangent approximation' : showFriction ? `Inward · car’s ${segment.direction}` : 'No lateral acceleration';
  document.getElementById('horizontal-value').textContent = skidding ? 'Kinetic friction omitted in this model' : showFriction ? physics.skids ? `Needed ${format(physics.required)} N > available` : `Ffriction = Fc = ${format(physics.required)} N` : 'Ffriction = 0 N';
  document.getElementById('fbd-description').textContent = `Normal force ${format(params.mass * G)} N upward balances weight downward. ${skidding ? 'Post-skid educational approximation omits kinetic friction.' : showFriction ? `Static friction acts toward the car’s ${segment.direction}, toward the curve centre. Centripetal force is its role, not another force.` : 'There is no lateral force on a straight road.'}`;
  // An unsafe paused preview shows a required-force annotation, not an impossible static force.
  if (showFriction && physics.skids) {
    document.getElementById('fbd-friction').setAttribute('hidden', '');
    document.getElementById('horizontal-label').textContent = 'Selected conditions exceed static grip';
  }
}
