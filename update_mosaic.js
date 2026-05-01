const fs = require('fs');
const path = 'tile-mosaic/src/utils/mosaic.js';

let text = fs.readFileSync(path, 'utf8');

const newGetBezier = `export function getBezier(t, x0, y0, x1, y1, x2, y2, x3, y3) {
  let u = t;
  for (let i = 0; i < 8; i++) {
    const currentX = Math.pow(1 - u, 3) * x0 + 3 * Math.pow(1 - u, 2) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u * x3;
    const dx = 3 * Math.pow(1 - u, 2) * (x1 - x0) + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (x3 - x2);
    if (Math.abs(currentX - t) < 0.001) break;
    u = u - (currentX - t) / (dx || 1e-6);
  }
  u = Math.max(0, Math.min(1, u));
  return Math.pow(1 - u, 3) * y0 + 3 * Math.pow(1 - u, 2) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u * y3;
}`;

const oldGetBezierRegex = /export function getBezier\(t, x1, y1, x2, y2\) \{[\s\S]*?return 3 \* Math\.pow\(1 - u, 2\) \* u \* y1 \+ 3 \* \(1 - u\) \* u \* u \* y2 \+ u \* u \* u;\n\}/m;

text = text.replace(oldGetBezierRegex, newGetBezier);

// Update calls in imageMappingType === 'gradient' block
const oldCall1 = `      const { x1: bx1, y1: by1, x2: bx2, y2: by2 } = settings.bezier || { x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.75 };
      const rawT = Math.max(0, Math.min(1, brightness));
      const adjustedT = getBezier(rawT, bx1, by1, bx2, by2);`;
const newCall1 = `      const { x0 = 0, y0 = 0, x1 = 0.25, y1 = 0.25, x2 = 0.75, y2 = 0.75, x3 = 1, y3 = 1 } = settings.bezier || {};
      const rawT = Math.max(0, Math.min(1, brightness));
      const adjustedT = getBezier(rawT, x0, y0, x1, y1, x2, y2, x3, y3);`;
text = text.replace(oldCall1, newCall1);

// Update calls in DIRECT COLOR MATCH block
const oldCall2 = `    const { x1: bx1, y1: by1, x2: bx2, y2: by2 } = settings.bezier || { x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.75 };
    const rawT = Math.max(0, Math.min(1, brightness));
    const rawShifted = getBezier(rawT, bx1, by1, bx2, by2);`;
const newCall2 = `    const { x0 = 0, y0 = 0, x1 = 0.25, y1 = 0.25, x2 = 0.75, y2 = 0.75, x3 = 1, y3 = 1 } = settings.bezier || {};
    const rawT = Math.max(0, Math.min(1, brightness));
    const rawShifted = getBezier(rawT, x0, y0, x1, y1, x2, y2, x3, y3);`;
text = text.replace(oldCall2, newCall2);

fs.writeFileSync(path, text, 'utf8');
console.log("Updated mosaic.js");
