const fs = require('fs');
let text = fs.readFileSync('tile-mosaic/src/utils/gif.js', 'utf8');

const func = \`
export async function compositeGifFramesAsync(frames, width, height, onProgress) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const compositedCanvases = [];
  let prevImageData = null;
  
  for (let i = 0; i < frames.length; i++) {
    if (i % 5 === 0) {
      if(onProgress) onProgress(i, frames.length);
      await new Promise(r => setTimeout(r, 0));
    }
    const frame = frames[i];
    
    if (frame.disposalType === 3) {
      prevImageData = ctx.getImageData(0, 0, width, height);
    }
    
    const patchData = new ImageData(frame.patch, frame.dims.width, frame.dims.height);
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = frame.dims.width;
    tempCanvas.height = frame.dims.height;
    tempCanvas.getContext("2d").putImageData(patchData, 0, 0);
    
    const disposalType = frame.disposalType || 1;
    if (disposalType === 2) {
      ctx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
    }
    
    ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);
    
    const outCanvas = document.createElement("canvas");
    outCanvas.width = width;
    outCanvas.height = height;
    outCanvas.getContext("2d").drawImage(canvas, 0, 0);
    
    compositedCanvases.push({ canvas: outCanvas, delay: frame.delay * 10 || 100 });
    
    if (disposalType === 2) {
      ctx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
    } else if (disposalType === 3 && prevImageData) {
      ctx.putImageData(prevImageData, 0, 0);
    }
  }
  return compositedCanvases;
}
\`;

text += func;
fs.writeFileSync('tile-mosaic/src/utils/gif.js', text, 'utf8');
