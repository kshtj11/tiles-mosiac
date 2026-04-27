const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const tilesDir = path.join(__dirname, 'Export-crop-low', 'resized', '64');
const outputFile = path.join(__dirname, 'tile-mosaic', 'public', 'tile_metadata.json');

async function generateMetadata() {
  const files = fs.readdirSync(tilesDir).filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png'));
  
  const metadata = [];
  
  for (const file of files) {
    const inputPath = path.join(tilesDir, file);
    
    try {
      const { dominant } = await sharp(inputPath).stats();
      
      const r = dominant.r;
      const g = dominant.g;
      const b = dominant.b;
      
      // Calculate HSV to help categorize
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const v = max / 255;
      
      const d = max - min;
      s = max === 0 ? 0 : d / max;
      
      if (max !== min) {
        if (max === r) {
          h = (g - b) / d + (g < b ? 6 : 0);
        } else if (max === g) {
          h = (b - r) / d + 2;
        } else if (max === b) {
          h = (r - g) / d + 4;
        }
        h /= 6;
      }
      
      metadata.push({
        id: file,
        filename: file,
        r, g, b,
        h: h * 360,
        s,
        v
      });
    } catch (e) {
      console.error(`Error processing ${file}:`, e);
    }
  }
  
  // Also identify white/light tiles for the "white background" feature.
  // We can sort them by lightness (v) and low saturation (s).
  
  fs.writeFileSync(outputFile, JSON.stringify(metadata, null, 2));
  console.log(`Generated metadata for ${metadata.length} tiles.`);
}

generateMetadata();
