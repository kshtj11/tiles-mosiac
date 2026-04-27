export function getTileAtGradient(t, line, metadata, vibrantMetadata, settings) {
  // Check for vibrant stops first
  if (vibrantMetadata && settings && settings.vibrantStops) {
    const stops = Object.keys(settings.vibrantStops).map(id => ({
      id,
      t: settings.vibrantStops[id].t
    }));
    
    if (stops.length > 0) {
      let closestStop = null;
      let minDiff = Infinity;
      for (const stop of stops) {
        const diff = Math.abs(t - stop.t);
        if (diff < minDiff) {
          minDiff = diff;
          closestStop = stop;
        }
      }
      
      const spread = settings.vibrantSpread || 0.05;
      if (minDiff <= spread) {
        const vibrantTile = vibrantMetadata.find(v => v.id === closestStop.id);
        if (vibrantTile) return vibrantTile;
      }
    }
  }

  // Fallback to standard gradient logic
  // t is between 0 and 1
  const x = line.p1.x + t * (line.p2.x - line.p1.x);
  const y = line.p1.y + t * (line.p2.y - line.p1.y);
  // Grid is 8x8
  const col = Math.floor(Math.max(0, Math.min(0.999, x)) * 8);
  const row = Math.floor(Math.max(0, Math.min(0.999, y)) * 8);
  const index = row * 8 + col;
  return metadata[index];
}

// Cubic Bezier solver
export function getBezier(t, x1, y1, x2, y2) {
  let u = t;
  for (let i = 0; i < 8; i++) {
    const currentX = 3 * Math.pow(1 - u, 2) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
    const dx = 3 * Math.pow(1 - u, 2) * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2);
    if (Math.abs(currentX - t) < 0.001) break;
    u = u - (currentX - t) / (dx || 1e-6);
  }
  u = Math.max(0, Math.min(1, u));
  return 3 * Math.pow(1 - u, 2) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
}

export function getClosestByRGB(r, g, b, list) {
  let minDistance = Infinity;
  let closestTile = list[0] || null;
  for (const tile of list) {
    const dist = (tile.r - r)**2 + (tile.g - g)**2 + (tile.b - b)**2;
    if (dist < minDistance) {
      minDistance = dist;
      closestTile = tile;
    }
  }
  return closestTile;
}

let cachedMetadata = null;
let cachedCandidates = null;
function getCandidates(metadata) {
  if (cachedMetadata === metadata && cachedCandidates) return cachedCandidates;
  cachedMetadata = metadata;
  
  let bg = metadata.filter(t => t.type === 'bg');
  let border = metadata.filter(t => t.type === 'border');
  let fill = metadata.filter(t => t.type === 'fill');
  
  cachedCandidates = {
    bgCandidates: bg.length ? bg : metadata,
    borderCandidates: border.length ? border : metadata,
    fillCandidates: fill.length ? fill : metadata
  };
  return cachedCandidates;
}

export function getRegionColor(imgData, x, y, regionWidth, regionHeight, canvasWidth, canvasHeight) {
  // Prevent zero-width/height crashes
  if (regionWidth < 1 || regionHeight < 1) {
    return { r: 0, g: 0, b: 0, a: 0, variance: 0 };
  }
  
  const startX = Math.max(0, Math.floor(x));
  const startY = Math.max(0, Math.floor(y));
  const endX = Math.min(canvasWidth, Math.ceil(x + regionWidth));
  const endY = Math.min(canvasHeight, Math.ceil(y + regionHeight));
  
  let r = 0, g = 0, b = 0, a = 0;
  let count = 0;
  
  for (let py = startY; py < endY; py++) {
    const rowOffset = py * canvasWidth;
    for (let px = startX; px < endX; px++) {
      const idx = (rowOffset + px) * 4;
      r += imgData.data[idx];
      g += imgData.data[idx + 1];
      b += imgData.data[idx + 2];
      a += imgData.data[idx + 3];
      count++;
    }
  }
  
  if (count === 0) {
    return { r: 0, g: 0, b: 0, a: 0, variance: 0 };
  }
  
  r /= count;
  g /= count;
  b /= count;
  a /= count;
  
  // Calculate variance to see if we should subdivide
  let variance = 0;
  for (let py = startY; py < endY; py++) {
    const rowOffset = py * canvasWidth;
    for (let px = startX; px < endX; px++) {
      const idx = (rowOffset + px) * 4;
      if (imgData.data[idx+3] < 128) continue; // Skip transparent pixels from variance
      const dr = imgData.data[idx] - r;
      const dg = imgData.data[idx+1] - g;
      const db = imgData.data[idx+2] - b;
      variance += dr * dr + dg * dg + db * db;
    }
  }
  variance /= count;
  
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a: Math.round(a), variance };
}

let cachedWhiteTile = null;

export function findClosestTile(r, g, b, a, x, y, width, height, settings, metadata, vibrantMetadata) {
  const { bgCandidates, borderCandidates, fillCandidates } = getCandidates(metadata);

  if (settings.whiteBgTile && !cachedWhiteTile) {
    cachedWhiteTile = getClosestByRGB(255, 255, 255, metadata);
  }

  // Handle empty transparent padding for images
  if (a < 128) {
    if (settings.textOnly) return null;
    if (settings.mode === 'image') {
      if (settings.whiteBgTile) return cachedWhiteTile;
      return null; // By default, transparent padding has no tiles
    }
    // Text Mode
    if (settings.whiteBgTile) return cachedWhiteTile;
    return bgCandidates[Math.floor(Math.random() * bgCandidates.length)];
  }

  if (settings.mode === 'text') {
    const isBg = b > g && b > r;
    const isBorder = g > b && g > r;
    const isGradient = r >= g && r >= b;

    if (isBg || (r === 0 && g === 0 && b === 0)) {
      if (settings.textOnly) return null; // No background tiles
      if (settings.whiteBgTile) return cachedWhiteTile;
      return bgCandidates[Math.floor(Math.random() * bgCandidates.length)];
    }

    if (isBorder) {
      if (settings.useStrokePalette && settings.strokeLine) {
        return getTileAtGradient(g / 255, settings.strokeLine, metadata, vibrantMetadata, settings);
      }
      return borderCandidates[Math.floor(Math.random() * borderCandidates.length)];
    }
    
    // RED (Font Text Fill Core)
    if (isGradient) {
      if (settings.useGradientPalette && settings.gradientLine) {
        // Red maps to text fill, value indicates the calculated Bezier t mapping
        const t = Math.max(0, Math.min(1, r / 255));
        return getTileAtGradient(t, settings.gradientLine, metadata, vibrantMetadata, settings);
      }
      return fillCandidates[Math.floor(Math.random() * fillCandidates.length)];
    }
    
    return bgCandidates[Math.floor(Math.random() * bgCandidates.length)];
  } else {
    // IMAGE MODE LOGIC
    let targetR = r;
    let targetG = g;
    let targetB = b;
    
    // Calculate raw mathematical brightness of the source region
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    
    if (settings.imageMappingType === 'gradient' || (settings.useGradientPalette && !settings.imageMappingType)) {
      // GRADIENT LINE MAP (Luminosity -> Gradient Line via Bezier)
      const { x1: bx1, y1: by1, x2: bx2, y2: by2 } = settings.bezier || { x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.75 };
      const t = getBezier(Math.max(0, Math.min(1, brightness)), bx1, by1, bx2, by2);
      return getTileAtGradient(t, settings.gradientLine, metadata, vibrantMetadata, settings);
    } 
    
    // DIRECT COLOR MATCH (Shift brightness via Bezier first)
    const { x1: bx1, y1: by1, x2: bx2, y2: by2 } = settings.bezier || { x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.75 };
    const shiftedBrightness = getBezier(Math.max(0, Math.min(1, brightness)), bx1, by1, bx2, by2);
    
    // Scale the raw RGB values by the new brightness factor
    if (brightness > 0.001) {
      const scale = shiftedBrightness / brightness;
      targetR = Math.min(255, r * scale);
      targetG = Math.min(255, g * scale);
      targetB = Math.min(255, b * scale);
    } else {
      targetR = shiftedBrightness * 255;
      targetG = shiftedBrightness * 255;
      targetB = shiftedBrightness * 255;
    }
    
    // Find absolute closest exact RGB match from the full palette
    let bestMatch = null;
    let minDistance = Infinity;
    
    // Always use full metadata since this is direct color mapping
    for (const tile of metadata) {
      const dr = targetR - tile.r;
      const dg = targetG - tile.g;
      const db = targetB - tile.b;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = tile;
      }
    }
    
    return bestMatch;
  }
}

export function generateGridMosaic(canvas, settings, metadata, vibrantMetadata) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const width = canvas.width;
  const height = canvas.height;
  const fullImgData = ctx.getImageData(0, 0, width, height);
  
  const cols = settings.gridResolution;
  const cellSizeX = width / cols;
  const rows = Math.floor(height / cellSizeX);
  const cellSizeY = cellSizeX; // keep it square
  
  const tiles = [];
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * cellSizeX;
      const py = y * cellSizeY;
      
      const { r, g, b, a } = getRegionColor(fullImgData, px, py, cellSizeX, cellSizeY, width, height);
      
      const closest = findClosestTile(r, g, b, a, px, py, width, height, settings, metadata, vibrantMetadata);
      
      if (closest) {
        tiles.push({
          x: px,
          y: py,
          size: cellSizeX,
          tileId: closest.id
        });
      }
    }
  }
  
  return tiles;
}

export function generateQuadtreeMosaic(canvas, settings, metadata, vibrantMetadata) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const width = canvas.width;
  const height = canvas.height;
  const fullImgData = ctx.getImageData(0, 0, width, height);
  
  const tiles = [];
  const cols = settings.gridResolution;
  const cellSize = width / cols;
  const varianceThreshold = settings.quadtreeDetail * 100; 
  
  // Find power of 2 grid dimension that covers the entire canvas
  let gridDim = 1;
  while (gridDim < cols || gridDim * cellSize < height) {
    gridDim *= 2;
  }
  
  function subdivide(gridX, gridY, sizeInCells) {
    const x = gridX * cellSize;
    const y = gridY * cellSize;
    const size = sizeInCells * cellSize;
    
    // If the entire block is outside the canvas, ignore it
    if (x >= width || y >= height) return;
    
    // Directional QuadTree logic
    let forceSplit = false;
    if (settings.quadtreeDirectional && settings.directionLine) {
      const nx = (x + size / 2) / width;
      const ny = (y + size / 2) / height;
      const { p1, p2 } = settings.directionLine;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len2 = dx * dx + dy * dy;
      if (len2 > 0) {
        let tDir = ((nx - p1.x) * dx + (ny - p1.y) * dy) / len2;
        tDir = Math.max(0, Math.min(1, tDir));
        // t=0 -> BIG cells (e.g. 32), t=1 -> SMALL cells (e.g. 1)
        const maxDesired = Math.max(8, gridDim / 4);
        const desiredSize = Math.max(1, maxDesired * (1 - tDir));
        if (sizeInCells > desiredSize) {
          forceSplit = true;
        }
      }
    }
    
    if (sizeInCells <= 1) {
      // Reached minimum size
      const checkW = Math.min(size, width - x);
      const checkH = Math.min(size, height - y);
      const { r, g, b, a } = getRegionColor(fullImgData, x, y, checkW, checkH, width, height);
      const tile = findClosestTile(r, g, b, a, x, y, width, height, settings, metadata, vibrantMetadata);
      if (tile) {
        tiles.push({ x, y, size, tileId: tile.id });
      }
      return;
    }
    
    const checkW = Math.min(size, width - x);
    const checkH = Math.min(size, height - y);
    const { r, g, b, a, variance } = getRegionColor(fullImgData, x, y, checkW, checkH, width, height);
    
    // If it's detailed enough, or we are forcing it due to directional scale
    if (variance > varianceThreshold || forceSplit) {
      const halfCells = sizeInCells / 2;
      subdivide(gridX, gridY, halfCells);
      subdivide(gridX + halfCells, gridY, halfCells);
      subdivide(gridX, gridY + halfCells, halfCells);
      subdivide(gridX + halfCells, gridY + halfCells, halfCells);
    } else {
      // Uniform enough, add a big tile
      const tile = findClosestTile(r, g, b, a, x, y, width, height, settings, metadata, vibrantMetadata);
      if (tile) {
        tiles.push({ x, y, size, tileId: tile.id });
      }
    }
  }
  
  // Start from top-left with the power-of-2 grid
  subdivide(0, 0, gridDim);
  
  return tiles;
}
