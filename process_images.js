const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const inputDir = path.join(__dirname, 'Export-crop-high');
const outputBaseDir = path.join(__dirname, 'tile-mosaic', 'public', 'tiles-vibrant', 'resized');

const sizes = [64, 128, 256, 512];

async function processImages() {
  if (!fs.existsSync(outputBaseDir)) {
    fs.mkdirSync(outputBaseDir, { recursive: true });
  }

  sizes.forEach(size => {
    const sizeDir = path.join(outputBaseDir, size.toString());
    if (!fs.existsSync(sizeDir)) {
      fs.mkdirSync(sizeDir, { recursive: true });
    }
  });

  const files = fs.readdirSync(inputDir).filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png'));

  let count = 0;
  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    
    for (const size of sizes) {
      const outputPath = path.join(outputBaseDir, size.toString(), file);
      try {
        await sharp(inputPath)
          .resize(size, size, { fit: 'cover' })
          .toFile(outputPath);
      } catch (e) {
        console.error(`Error processing ${file} at size ${size}:`, e);
      }
    }
    count++;
    if (count % 10 === 0) {
      console.log(`Processed ${count}/${files.length} images...`);
    }
  }
  
  console.log(`Successfully processed all ${files.length} images into 64, 128, 256, and 512 sizes.`);
}

processImages();
