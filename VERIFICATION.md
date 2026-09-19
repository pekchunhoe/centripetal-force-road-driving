# Verification report

Verified on 19 September 2026 using Node.js 24.18.0 and locally installed Microsoft Edge 153 in headless mode. The in-app browser had no available session; browser checks used the project's Playwright development dependency instead.

## Results and commands

| Command | Result |
| --- | --- |
| `npm test` | **PASS: 29 tests, 0 failures.** |
| `npm run test:browser` | **PASS: 6 end-to-end tests, 0 failures.** Full run completed in 55.5 seconds. |
| `npm run test:browser -- --grep directions` | **PASS: 1 targeted regression, 0 failures.** Repeated after the final Canvas label-placement change, including a 320 px turning screenshot. |

All browser tests collect uncaught page errors and fail if any occur. The final runs recorded none. Screenshots are saved in `artifacts/`.

## Physics

| Check | Result | Evidence |
| --- | --- | --- |
| Fc = mv²/r | PASS | 1,000 kg × (10 m/s)² ÷ 20 m = 5,000 N. |
| Fmax = μs mg | PASS | 0.5 × 1,000 kg × 9.81 m/s² = 4,905 N; this is insufficient for 5,000 N. |
| Critical speed | PASS | Matches √(μs gr); the threshold itself is safe and a slightly higher speed skids. |
| Mass cancellation | PASS | 800 kg and 2,000 kg give identical critical speed, grip ratio and skid outcome; force values scale by 2.5. Browser mass control also updates the displayed forces. |
| Speed² relationship | PASS | Doubling speed quadruples the required inward force. |
| Radius relationship | PASS | A 15 m curve requires four times the force of a 60 m curve at equal speed and mass. |
| Rainy / Sunny coefficients | PASS | Presets are 0.40 / 0.75. Both controls and available force update. At 15 m/s, Rainy skids at Sharp left; Sunny reaches Wide U-turn. |
| Straight road | PASS | Zero required inward force, zero grip ratio, infinite radius and no finite curve critical speed. |

## Vehicle

| Check | Result | Evidence |
| --- | --- | --- |
| Straight motion | PASS | Distance advances by speed × time with constant heading. |
| Left turn | PASS | Arc geometry and continuous tangents tested; browser screenshot confirms the Sharp left state. |
| Right turn | PASS | Arc geometry and continuous tangents tested; browser screenshot confirms the Gentle right state. |
| U-turn | PASS | Two semicircles have length πr and reverse heading by π. Browser completes both at 5 m/s. |
| S-turn | PASS | Connected arcs reverse signed curvature and preserve tangent continuity. Safe browser run completes the section. |
| Tangent orientation | PASS | Every arc sampled at 11 positions; all segment boundaries preserve position and tangent heading. |
| Skid trajectory | PASS | Initial skid velocity is perpendicular to the radius. Post-skid displacement follows that tangent and moves outside the intended circle. Browser captures the departure. |
| Skid marks | PASS | Motion model records skid samples; renderer draws two tyre tracks. Skid screenshots inspected. |
| Finish state | PASS | 5 m/s safely completes the route. Browser shows 100%, maximum grip usage of 28%, and Tight U-turn as the most demanding curve. |

## Vectors

| Check | Result | Evidence |
| --- | --- | --- |
| Velocity tangent to path | PASS | Dot product of velocity direction and inward radius vector is zero throughout each arc. Renderer uses the corresponding vehicle heading. |
| Friction points toward centre | PASS | Map arrow uses centre minus car position. Right / left and U-turn screenshots inspected. |
| Curve centre correct | PASS | Every sampled arc point is exactly its assigned radius from its centre. |
| Radius line correct | PASS | Drawn between the actual car and centre during a safe turn. After grip loss, the line retains the original road radius at the loss point. |
| Straight-road force arrow absent | PASS | Only curve segments with sufficient grip show the map friction arrow. Straight FBD verified hidden. |
| Labels | PASS | Added collision-aware placement for centre, radius and vector captions. Final right-turn and 320 px left-turn screenshots inspected. |

## Free-body diagram

| Check | Result | Evidence |
| --- | --- | --- |
| N upward | PASS | Separate arrow from y=77 to y=24, with a verified endpoint marker. Screenshot inspected. |
| mg downward | PASS | Separate arrow from y=105 to y=157, with a verified endpoint marker. Screenshot inspected. |
| Friction inward | PASS | Car-relative lateral arrow points toward the current turn. |
| No additional centripetal force | PASS | One lateral friction arrow only, with an explicit explanation that it supplies the centripetal force. |
| Left / right direction updates | PASS | Browser asserts the rightward and leftward SVG paths during the corresponding turns. |
| Skid state | PASS | Static-friction arrow disappears; the diagram explicitly says kinetic friction is omitted in the tangent approximation. |

## Controls

| Check | Result | Evidence |
| --- | --- | --- |
| Speed slider | PASS | 20 m/s displays 72.0 km/h; keyboard ArrowRight changes the selected value by 0.1 m/s. |
| Mass slider | PASS | 2,000 kg displays weight 19,620 N and updates curve forces; safe speed stays unchanged. |
| μ slider | PASS | Manual coefficient change updates the number and displays Custom μ. |
| Sunny preset | PASS | Restores μs=0.75 and selected-button semantics. |
| Rainy preset | PASS | Applies μs=0.40, changes road appearance and can trigger immediate grip loss while turning. |
| Start | PASS | Starts one animation loop and advances onto the first curve. |
| Pause | PASS | Time and a pixel-identical Canvas screenshot remain frozen while the browser clock advances. |
| Resume | PASS | Continues from the paused state without resetting elapsed time. |
| Reset | PASS | Returns to Start straight, clears failure state and paths, restores straight-road FBD and time, and preserves chosen settings. |
| Repeated reset | PASS | Six repeated reset/start operations still advance only approximately one second in one second. |
| Vectors / motion-trail toggles | PASS | Checkbox state and rendering options update. Tyre skid marks are retained as physical evidence independently of the optional normal trail. |
| Playback | PASS | Playback changes time progression without changing the selected physical speed or force values. |
| Reduced motion | PASS | Defaults to 0.25× playback with no autoplay. |

## Responsive layout

Each viewport below was checked for page-level horizontal overflow, visible rendered road and car pixels, a fitting FBD, and usable button dimensions; a full-page screenshot was captured.

| Viewport | Result |
| --- | --- |
| 320 × 568 | PASS |
| 360 × 800 | PASS |
| 375 × 812 | PASS |
| 390 × 844 | PASS |
| 412 × 915 | PASS |
| 430 × 932 | PASS |
| 844 × 390, phone landscape | PASS |
| 768 × 1024, tablet portrait | PASS |
| 1024 × 768, tablet landscape | PASS |
| 1366 × 768, desktop | PASS |
| 1920 × 1080, desktop | PASS |
| No horizontal page overflow | PASS at every listed size |
| Resize / orientation changes during motion | PASS: portrait → landscape → desktop, without resetting motion or introducing runtime errors |
| Resize after a skid | PASS: desktop → 320 px; the car, failure state and track remain rendered |

Visual review included desktop, 320 px portrait, phone landscape, left and right turns, the wide U-turn, and the skid state. The desktop uses three columns; phones stack the map, transport, controls, current section, FBD and equations. Vertical scrolling remains necessary on small screens and short landscape viewports.

## Files created

The workspace was empty at the start. No pre-existing application files were modified.

- `index.html`
- `styles/main.css`
- `js/app.js`
- `js/physics.js`
- `js/road-data.js`
- `js/vehicle.js`
- `js/renderer.js`
- `js/controls.js`
- `js/fbd.js`
- `server.mjs`
- `package.json`, `package-lock.json`
- `playwright.config.js`
- `tests/physics.test.js`
- `tests/browser/lab.spec.js`
- `.gitignore`
- `README.md`
- `VERIFICATION.md`
- `artifacts/layout-*.png`: eleven viewport screenshots
- `artifacts/right-turn.png`, `artifacts/left-turn.png`, `artifacts/left-turn-mobile.png`, `artifacts/u-turn.png`, `artifacts/skid.png`, `artifacts/skid-mobile.png`

## Limits and simplifications

- Unbanked, horizontal road with constant g=9.81 m/s². No suspension, banking, aerodynamic forces or longitudinal tyre-force sharing.
- Speed changes are instantaneous experimental settings, not an engine/braking model.
- Post-skid motion is explicitly labelled as a two-second, constant-velocity tangent-coasting approximation. Kinetic friction and steering dynamics are omitted; no fictitious outward force is added.
- The loss-of-grip summary preserves the original conditions. Changing controls afterward updates the live comparison values without rewriting that event.
- Sunny and Rainy are illustrative coefficients, not universal real-road measurements.
- The car and vector lengths have minimum visual sizes for readability; road geometry and radius calculations share one metric scale.
- Browser verification used Chromium-based Edge. Safari, Firefox, physical mobile devices and assistive-technology user testing were not performed.
- Playwright is a development-only dependency. The application itself uses no external fonts, images, libraries, or network APIs.
