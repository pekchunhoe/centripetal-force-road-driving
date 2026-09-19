# Turning Point

A mobile-first centripetal-force lab built with semantic HTML, CSS, ES modules and Canvas. No runtime dependencies or build step.

## Run locally

Requires Node.js 20.11 or newer.

```sh
npm start
```

Open **http://localhost:4173**. Use Start, Pause and Reset below the track. Reset preserves your selected conditions, playback speed and overlay toggles. Sliders work before and during a run, and while paused. Changing the tab pauses the experiment.

## Verify

```sh
npm test
```

Physics and motion tests use Node's built-in test runner. Browser verification, when available, is documented in `VERIFICATION.md`.

For the responsive and interaction suite, install the development dependency and run:

```sh
npm ci
npm run test:browser
```

The browser configuration uses locally installed Microsoft Edge in headless mode. It checks all eleven requested screen sizes and saves screenshots in `artifacts/`. On a system without Edge, install a Playwright browser and change `channel` in `playwright.config.js` accordingly. There are no browser packages shipped to the application.

## Architecture

- `js/physics.js`: equations, grip thresholds and weather presets.
- `js/road-data.js`: connected metric straight and circular segments, curve centres, tangents and distance lookup.
- `js/vehicle.js`: simulation time, boundary-aware integration, pause/reset, trails and tangent skid state.
- `js/renderer.js`: cached track drawing, responsive Canvas, vectors, radius annotations, car and tyre tracks.
- `js/fbd.js`: accessible, car-relative force diagram.
- `js/controls.js`: sliders, presets and presentation settings.
- `js/app.js`: one animation loop and throttled live readouts.
- `styles/main.css`: responsive, touch-friendly interface and reduced-motion handling.

## Model and experiments

The unbanked road uses g = 9.81 m/s², Fc = mv²/r and Fmax = μs mg. Static friction supplies the inward force; it is not an additional force beside centripetal force. Safe speed is √(μs gr), independent of mass. The FBD is a car-relative cross-section; the map vectors use the actual curve centre in world coordinates.

Defaults are 15 m/s, 1,200 kg, Sunny (μs = 0.75). The first 60 m curve is safe, the 35 m curve uses about 87% grip, and the 22 m U-turn loses grip. At the same speed, Rainy (μs = 0.40) loses grip at the 35 m curve. At 5 m/s the complete route is safe under either preset. Try 800 kg and 2,000 kg to see force magnitudes change while critical speed stays fixed.

The car follows analytically defined circular arcs only while grip is sufficient. On loss of grip it leaves the route along its instantaneous tangent. The two-second post-skid illustration omits kinetic friction and steering dynamics, as labelled in the interface. It does not represent a radial outward force. The failed-run summary retains the values at grip loss; equation readouts continue to show the newly selected conditions for comparison.

The selected speed is an instantaneous experimental parameter: longitudinal acceleration, braking, tyre force sharing, air resistance and banking are outside this model. Sunny/Rainy coefficients are educational presets, not universal measured values. Playback affects simulation time progression only, never speed in force calculations. Reduced-motion users start with 0.25× playback; no simulation autoplays.
