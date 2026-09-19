const HALF_PI = Math.PI / 2;
let point = { x: 30, y: 35 }, heading = 0, distance = 0;
export const roadSegments = [];
function addStraight(length, name = 'Connecting straight') {
  const start = { ...point };
  point = { x: point.x + Math.cos(heading) * length, y: point.y + Math.sin(heading) * length };
  roadSegments.push({ id: roadSegments.length, type: 'straight', name, start, end: { ...point }, heading, length, offset: distance });
  distance += length;
}
function addCurve(radius, direction, angle, name) {
  // Canvas y grows downward, so a positive heading change is a right turn.
  const sign = direction === 'right' ? 1 : -1;
  const centre = { x: point.x - Math.sin(heading) * radius * sign, y: point.y + Math.cos(heading) * radius * sign };
  const startAngle = Math.atan2(point.y - centre.y, point.x - centre.x);
  const sweep = sign * angle, length = radius * angle;
  const start = { ...point }, startHeading = heading;
  heading += sweep;
  point = { x: centre.x + radius * Math.cos(startAngle + sweep), y: centre.y + radius * Math.sin(startAngle + sweep) };
  roadSegments.push({ id: roadSegments.length, type: 'curve', name, direction, radius, centre, startAngle, sweep,
    start, end: { ...point }, heading: startHeading, length, offset: distance, uTurn: Math.abs(angle - Math.PI) < 1e-8 });
  distance += length;
}
addStraight(40, 'Start straight');
addCurve(60, 'right', HALF_PI, 'Gentle right');
addStraight(25);
addCurve(35, 'left', HALF_PI, 'Sharp left');
addStraight(65);
addCurve(22, 'left', Math.PI, 'Wide U-turn');
addStraight(15);
addCurve(45, 'right', HALF_PI, 'Sweeping right');
addStraight(32);
addCurve(18, 'right', HALF_PI, 'Sharp right');
addStraight(35);
addCurve(18, 'right', Math.PI / 4, 'S-bend · right');
addCurve(18, 'left', Math.PI / 4, 'S-bend · left');
addStraight(18);
addCurve(12, 'right', Math.PI, 'Tight U-turn');
addStraight(15, 'Finish straight');
export const routeLength = distance;
export const curves = roadSegments.filter(s => s.type === 'curve');
export function getCurrentRoadSegment(s) {
  return roadSegments.find(segment => s < segment.offset + segment.length - 1e-9) || roadSegments.at(-1);
}
export function getCurveCentre(segment) { return segment.centre || null; }
export function getPose(segment, localDistance) {
  const s = Math.max(0, Math.min(localDistance, segment.length));
  if (segment.type === 'straight') return { x: segment.start.x + Math.cos(segment.heading) * s, y: segment.start.y + Math.sin(segment.heading) * s, heading: segment.heading };
  const angle = segment.startAngle + Math.sign(segment.sweep) * s / segment.radius;
  return { x: segment.centre.x + segment.radius * Math.cos(angle), y: segment.centre.y + segment.radius * Math.sin(angle), heading: segment.heading + Math.sign(segment.sweep) * s / segment.radius };
}
export function getTangentDirection(segment, localDistance) {
  const { heading } = getPose(segment, localDistance);
  return { x: Math.cos(heading), y: Math.sin(heading) };
}
export function poseAtDistance(s) { const segment = getCurrentRoadSegment(s); return getPose(segment, s - segment.offset); }
