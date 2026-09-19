import { roadSegments, curves, getPose, getCurrentRoadSegment } from './road-data.js';
import { calculatePhysics } from './physics.js';

export class TrackRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.background = document.createElement('canvas');
    this.width = 0;
    this.height = 0;
    this.key = '';
    this.options = { vectors: true, trail: true, rainy: false };
    this.observer = new ResizeObserver(() => { this.key = ''; this.draw(this.sim); });
    this.observer.observe(canvas);
  }
  fit(sim) {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width; this.height = rect.height;
    this.canvas.width = Math.round(rect.width * dpr); this.canvas.height = Math.round(rect.height * dpr);
    this.background.width = this.canvas.width; this.background.height = this.canvas.height;
    this.dpr = dpr;
    const bounds = { minX: 12, maxX: 296, minY: -9, maxY: 179 };
    if (sim?.skid) {
      const end = { x: sim.skid.origin.x + sim.skid.vx * 2, y: sim.skid.origin.y + sim.skid.vy * 2 };
      bounds.minX = Math.min(bounds.minX, end.x - 20); bounds.maxX = Math.max(bounds.maxX, end.x + 20);
      bounds.minY = Math.min(bounds.minY, end.y - 20); bounds.maxY = Math.max(bounds.maxY, end.y + 20);
    }
    this.scale = Math.min((this.width - 22) / (bounds.maxX - bounds.minX), (this.height - 64) / (bounds.maxY - bounds.minY));
    this.ox = (this.width - (bounds.maxX - bounds.minX) * this.scale) / 2 - bounds.minX * this.scale;
    this.oy = (this.height - (bounds.maxY - bounds.minY) * this.scale) / 2 - bounds.minY * this.scale;
    this.drawBackground();
    document.querySelector('.map-scale > span').style.width = `${20 * this.scale}px`;
  }
  screen(p) { return { x: this.ox + p.x * this.scale, y: this.oy + p.y * this.scale }; }
  path(ctx, segment) {
    const start = this.screen(segment.start);
    ctx.moveTo(start.x, start.y);
    if (segment.type === 'curve') {
      const centre = this.screen(segment.centre);
      ctx.arc(centre.x, centre.y, segment.radius * this.scale, segment.startAngle, segment.startAngle + segment.sweep, segment.sweep < 0);
    } else { const end = this.screen(segment.end); ctx.lineTo(end.x, end.y); }
  }
  drawBackground() {
    const ctx = this.background.getContext('2d');
    this.labelBoxes = [];
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = this.options.rainy ? '#e7eeeb' : '#edf1e6';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = this.options.rainy ? '#d6dfd8' : '#dce3d1';
    for (let x = 14; x < this.width; x += 20) for (let y = 14; y < this.height; y += 20) {
      ctx.beginPath(); ctx.arc(x, y, .65, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    const widths = [11, 9.8, 8.7];
    const colors = ['#b9c3ab', '#f7f7e7', this.options.rainy ? '#495a59' : '#596158'];
    widths.forEach((width, i) => {
      ctx.beginPath(); roadSegments.forEach(s => this.path(ctx, s));
      ctx.lineWidth = width * this.scale; ctx.strokeStyle = colors[i]; ctx.stroke();
    });
    ctx.beginPath(); roadSegments.forEach(s => this.path(ctx, s));
    ctx.lineWidth = Math.max(.65, .43 * this.scale); ctx.strokeStyle = '#e0dfb8';
    ctx.setLineDash([3.1 * this.scale, 3.8 * this.scale]); ctx.stroke(); ctx.setLineDash([]);
    for (const s of roadSegments.filter(s => s.type === 'straight' && s.length >= 25)) {
      const p = this.screen(getPose(s, s.length * .65));
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(s.heading); ctx.strokeStyle = '#d7daca'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(1, 0); ctx.lineTo(-3, 3); ctx.stroke(); ctx.restore();
    }
    const first = this.screen(roadSegments[0].start), last = this.screen(roadSegments.at(-1).end);
    this.label(ctx, 'START', first.x, first.y + 20, '#6c7c52', false, 8);
    this.label(ctx, 'FINISH', last.x, last.y + 20, '#6c7c52', false, 8);
    ctx.save(); ctx.translate(last.x, last.y);
    const tile = Math.max(2, this.scale * 1.8);
    for (let x = 0; x < 2; x++) for (let y = -2; y < 3; y++) { ctx.fillStyle = (x + y) % 2 ? '#f7f6e8' : '#323c32'; ctx.fillRect(x * tile, y * tile, tile, tile); }
    ctx.restore();
    if (this.width > 410) {
      const labels = [curves[0], curves[1], curves[2], curves.at(-1)];
      labels.forEach((s, i) => {
        const pose = getPose(s, s.length / 2);
        const radial = { x: (pose.x - s.centre.x) / s.radius, y: (pose.y - s.centre.y) / s.radius };
        const p = this.screen({ x: pose.x + radial.x * 10, y: pose.y + radial.y * 10 });
        this.label(ctx, `${s.radius} m`, p.x, p.y, '#7e8a6d', false, 8);
      });
    }
    if (this.options.rainy) {
      ctx.strokeStyle = '#bacbd0'; ctx.lineWidth = .7;
      for (let i = 0; i < 24; i++) {
        const x = (i * 73 + 35) % this.width, y = (i * 47 + 30) % this.height;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 6); ctx.stroke();
      }
    }
    this.backgroundLabels = this.labelBoxes.map(box => ({ ...box }));
  }
  label(ctx, text, x, y, color = '#53644b', pill = true, size = 10) {
    ctx.save(); ctx.font = `${size}px "Segoe UI", sans-serif`;
    const w = ctx.measureText(text).width + 12;
    const clampX = value => Math.max(w / 2 + 4, Math.min(this.width - w / 2 - 4, value));
    const clampY = value => Math.max(39, Math.min(this.height - 37, value));
    const candidates = [[0,0],[0,22],[0,-22],[0,44],[0,-44],[38,0],[-38,0],[38,22],[-38,-22]];
    this.labelBoxes ||= [];
    let box;
    for (const [dx,dy] of candidates) {
      const cx = clampX(x + dx), cy = clampY(y + dy);
      box = { x: cx - w / 2, y: cy - 10, w, h: 18 };
      if (!this.labelBoxes.some(b => box.x < b.x + b.w + 3 && box.x + box.w + 3 > b.x && box.y < b.y + b.h + 3 && box.y + box.h + 3 > b.y)) break;
    }
    x = box.x + w / 2; y = box.y + 10;
    this.labelBoxes.push(box);
    if (pill) { ctx.fillStyle = '#f8faeff0'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 10, w, 18, 4); ctx.fill(); }
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y); ctx.restore();
  }
  arrow(ctx, origin, direction, length, color) {
    const x = origin.x + direction.x * length, y = origin.y + direction.y * length;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(x, y); ctx.stroke();
    const a = Math.atan2(direction.y, direction.x);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7 * Math.cos(a - .42), y - 7 * Math.sin(a - .42)); ctx.lineTo(x - 7 * Math.cos(a + .42), y - 7 * Math.sin(a + .42)); ctx.closePath(); ctx.fill();
    return { x, y };
  }
  draw(sim) {
    if (!sim) return;
    this.sim = sim;
    const rect = this.canvas.getBoundingClientRect();
    // A responsive grid can briefly report zero size while changing orientation.
    // ResizeObserver will redraw after layout settles; never use a negative scale.
    if (rect.width < 40 || rect.height < 80) return;
    const key = `${rect.width}:${rect.height}:${this.options.rainy}:${sim.skid?.segment.id ?? ''}`;
    if (this.key !== key) { this.key = key; this.fit(sim); }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.background, 0, 0); ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.labelBoxes = (this.backgroundLabels || []).map(box => ({ ...box }));
    const segment = sim.skid?.segment || getCurrentRoadSegment(sim.distance);
    const physics = calculatePhysics(sim.params, segment);
    ctx.beginPath(); this.path(ctx, segment); ctx.lineWidth = Math.max(2, this.scale * 2.5); ctx.strokeStyle = sim.skid ? '#e4a76b99' : '#dbe9a590'; ctx.stroke();
    if (this.options.trail && sim.trail.length > 1) {
      ctx.beginPath(); sim.trail.forEach((p, i) => { const s = this.screen(p); if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y); });
      ctx.lineWidth = 2; ctx.strokeStyle = '#c0d787b0'; ctx.stroke();
    }
    // Two wheel tracks remain visible even when the optional centreline trail is hidden.
    if (sim.skidMarks.length > 1) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        sim.skidMarks.forEach((p, i) => { const s = this.screen({ x: p.x - Math.sin(p.heading) * side * 1.1, y: p.y + Math.cos(p.heading) * side * 1.1 }); if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y); });
        ctx.lineWidth = Math.max(1, this.scale * .65); ctx.strokeStyle = '#976c45ba'; ctx.stroke();
      }
    }
    const car = this.screen(sim.pose);
    if (this.options.vectors) {
      if (segment.type === 'curve') {
        const centre = this.screen(segment.centre);
        // During a skid, the radius belongs to the intended road at loss of grip.
        const anchor = sim.skid ? this.screen(sim.skid.origin) : car;
        ctx.beginPath(); ctx.moveTo(anchor.x, anchor.y); ctx.lineTo(centre.x, centre.y); ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.strokeStyle = '#81936b'; ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(centre.x, centre.y, 3, 0, Math.PI * 2); ctx.fillStyle = '#778e55'; ctx.fill();
        ctx.beginPath(); ctx.arc(centre.x, centre.y, 7, 0, Math.PI * 2); ctx.strokeStyle = '#92a77160'; ctx.stroke();
        this.label(ctx, 'Centre', centre.x, centre.y - 15, '#6e8254', true, 9);
        this.label(ctx, `r = ${segment.radius} m`, (anchor.x + centre.x) / 2 + 8, (anchor.y + centre.y) / 2 - 9, '#70825a', true, 9);
        if (!sim.skid && !physics.skids) {
          const dx = centre.x - car.x, dy = centre.y - car.y, length = Math.hypot(dx, dy);
          const direction = { x: dx / length, y: dy / length };
          const tip = this.arrow(ctx, car, direction, Math.min(length * .72, 26 + physics.required / 350), '#26816d');
          this.label(ctx, 'Ffriction = Fc', tip.x - direction.y * 30, tip.y + direction.x * 15, '#267c68', true, 9);
        }
      }
      const direction = { x: Math.cos(sim.pose.heading), y: Math.sin(sim.pose.heading) };
      const tip = this.arrow(ctx, car, direction, 25 + (sim.skid?.params.speed || sim.params.speed) * .6, '#5785a1');
      this.label(ctx, 'v', tip.x - direction.y * 11 + direction.x * 8, tip.y + direction.x * 11 + direction.y * 8, '#47718b', true, 11);
    }
    ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(sim.pose.heading);
    const length = Math.max(15, 5.5 * this.scale), width = Math.max(8, 2.8 * this.scale);
    ctx.beginPath(); ctx.arc(0, 0, length * .95, 0, Math.PI * 2); ctx.fillStyle = sim.skid ? '#d68c4030' : '#e2edba45'; ctx.fill();
    ctx.fillStyle = '#273a2f';
    for (const x of [-length * .3, length * .25]) for (const y of [-width * .65, width * .42]) ctx.fillRect(x, y, length * .2, width * .23);
    ctx.fillStyle = '#deeb9b'; ctx.strokeStyle = '#f6fad8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(-length / 2, -width / 2, length, width, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#536c58'; ctx.fillRect(-length * .2, -width * .37, length * .29, width * .74);
    ctx.fillStyle = '#344b3d'; ctx.fillRect(length * .14, -width * .34, length * .13, width * .68);
    ctx.fillStyle = '#ffffd1'; ctx.fillRect(length * .43, -width * .4, 1.5, width * .24); ctx.fillRect(length * .43, width * .16, 1.5, width * .24);
    ctx.restore();
  }
}
