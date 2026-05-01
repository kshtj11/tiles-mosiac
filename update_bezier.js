const fs = require('fs');
const path = 'tile-mosaic/src/components/Sidebar.jsx';

let text = fs.readFileSync(path, 'utf8');

// 1. Update handlePointerMove
const dragLogicTarget = `      if (p === 'p1') { newBezier.x1 = bezX; newBezier.y1 = bezY; }
      if (p === 'p2') { newBezier.x2 = bezX; newBezier.y2 = bezY; }`;
const dragLogicReplacement = `      if (p === 'p0') { newBezier.x0 = bezX; newBezier.y0 = bezY; }
      if (p === 'p1') { newBezier.x1 = bezX; newBezier.y1 = bezY; }
      if (p === 'p2') { newBezier.x2 = bezX; newBezier.y2 = bezY; }
      if (p === 'p3') { newBezier.x3 = bezX; newBezier.y3 = bezY; }`;
text = text.replace(dragLogicTarget, dragLogicReplacement);

// 2. Update SVG contents
const svgTargetStart = text.indexOf('<svg viewBox="0 0 100 100"');
const svgTargetEnd = text.indexOf('</svg>', svgTargetStart);

if (svgTargetStart !== -1 && svgTargetEnd !== -1) {
    const oldSvg = text.substring(svgTargetStart, svgTargetEnd + 6);
    
    // The new SVG content
    const newSvg = `<svg viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <path 
                d={\`M \${(settings.bezier.x0 ?? 0) * 100} \${(1 - (settings.bezier.y0 ?? 0)) * 100} C \${settings.bezier.x1 * 100} \${(1 - settings.bezier.y1) * 100}, \${settings.bezier.x2 * 100} \${(1 - settings.bezier.y2) * 100}, \${(settings.bezier.x3 ?? 1) * 100} \${(1 - (settings.bezier.y3 ?? 1)) * 100}\`}
                fill="none" stroke="var(--accent)" strokeWidth="3"
              />
              <line x1={(settings.bezier.x0 ?? 0) * 100} y1={(1 - (settings.bezier.y0 ?? 0)) * 100} x2={settings.bezier.x1 * 100} y2={(1 - settings.bezier.y1) * 100} stroke="var(--border)" strokeWidth="2" strokeDasharray="4 4" />
              <line x1={(settings.bezier.x3 ?? 1) * 100} y1={(1 - (settings.bezier.y3 ?? 1)) * 100} x2={settings.bezier.x2 * 100} y2={(1 - settings.bezier.y2) * 100} stroke="var(--border)" strokeWidth="2" strokeDasharray="4 4" />
              <circle 
                cx={(settings.bezier.x0 ?? 0) * 100} cy={(1 - (settings.bezier.y0 ?? 0)) * 100} 
                r="3.75" fill="var(--bg-dark)" stroke="var(--text-muted)" strokeWidth="2"
                style={{ pointerEvents: 'auto', cursor: 'grab' }}
                onPointerDown={(e) => handlePointerDown(e, 'bez_p0')}
              />
              <circle 
                cx={settings.bezier.x1 * 100} cy={(1 - settings.bezier.y1) * 100} 
                r="3.75" fill="var(--bg-dark)" stroke="var(--accent)" strokeWidth="2"
                style={{ pointerEvents: 'auto', cursor: 'grab' }}
                onPointerDown={(e) => handlePointerDown(e, 'bez_p1')}
              />
              <circle 
                cx={settings.bezier.x2 * 100} cy={(1 - settings.bezier.y2) * 100} 
                r="3.75" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2"
                style={{ pointerEvents: 'auto', cursor: 'grab' }}
                onPointerDown={(e) => handlePointerDown(e, 'bez_p2')}
              />
              <circle 
                cx={(settings.bezier.x3 ?? 1) * 100} cy={(1 - (settings.bezier.y3 ?? 1)) * 100} 
                r="3.75" fill="var(--accent)" stroke="var(--text-muted)" strokeWidth="2"
                style={{ pointerEvents: 'auto', cursor: 'grab' }}
                onPointerDown={(e) => handlePointerDown(e, 'bez_p3')}
              />
            </svg>`;
            
    text = text.substring(0, svgTargetStart) + newSvg + text.substring(svgTargetEnd + 6);
} else {
    console.log("Could not find SVG in Sidebar.jsx");
    process.exit(1);
}

fs.writeFileSync(path, text, 'utf8');
console.log("Bezier updated.");
