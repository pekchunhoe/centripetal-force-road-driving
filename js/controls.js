import { WEATHER } from './physics.js';
export function bindControls(sim, renderer, onChange) {
  const $ = id => document.getElementById(id);
  let weather = 'sunny';
  const refresh = () => {
    $('speed-value').innerHTML = `${sim.params.speed.toFixed(1)} <small>m/s</small>`;
    $('speed-kmh').textContent = `${(sim.params.speed * 3.6).toFixed(1)} km/h`;
    $('mass-value').innerHTML = `${sim.params.mass.toLocaleString('en-US')} <small>kg</small>`;
    $('mu-value').textContent = sim.params.mu.toFixed(2);
    for (const key of ['speed', 'mass', 'mu']) {
      const el = $(key); el.value = sim.params[key];
      el.style.setProperty('--range', `${(el.value - el.min) / (el.max - el.min) * 100}%`);
      el.setAttribute('aria-valuetext', key === 'speed' ? `${sim.params.speed.toFixed(1)} metres per second, ${(sim.params.speed * 3.6).toFixed(1)} kilometres per hour` : key === 'mass' ? `${sim.params.mass} kilograms` : sim.params.mu.toFixed(2));
    }
    for (const key of ['sunny', 'rainy']) {
      const selected = weather === key && Math.abs(sim.params.mu - WEATHER[key]) < .00001;
      $(key).classList.toggle('selected', selected); $(key).setAttribute('aria-pressed', String(selected));
    }
    $('preset-caption').textContent = Math.abs(sim.params.mu - WEATHER[weather]) < .00001 ? 'Preset' : 'Custom μ';
    renderer.options.rainy = weather === 'rainy';
    $('map-wrap').classList.toggle('rainy', weather === 'rainy');
    onChange();
  };
  for (const key of ['speed', 'mass', 'mu']) $(key).addEventListener('input', event => {
    sim.params[key] = Number(event.target.value);
    if (key === 'mass') $('control-insight').textContent = 'Mass changes required force and maximum friction by the same proportion. The safe turning speed stays unchanged.';
    else if (key === 'speed') $('control-insight').textContent = 'Double the speed → four times the required inward force.';
    else $('control-insight').textContent = 'More tyre grip raises the critical speed. The road radius stays the same.';
    refresh();
  });
  for (const key of ['sunny', 'rainy']) $(key).addEventListener('click', () => {
    weather = key; sim.params.mu = WEATHER[key];
    $('control-insight').textContent = key === 'rainy' ? 'Less grip, same curve. Compare this run with Sunny at the same speed.' : 'Sunny preset selected. Try the same run in Rainy conditions.';
    refresh();
  });
  $('playback').addEventListener('change', e => { sim.playback = Number(e.target.value); onChange(); });
  for (const [id, key] of [['vectors', 'vectors'], ['trail', 'trail']]) $(id).addEventListener('change', e => { renderer.options[key] = e.target.checked; onChange(); });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sim.playback = .25; $('playback').value = '0.25';
  }
  refresh();
}
