export function compositeGifFrames(frames, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  const compositedCanvases = [];
  
  let frameImageData = ctx.createImageData(width, height);
  let prevImageData = null;
  
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    
    // Save previous frame state for disposal type 3
    if (frame.disposalType === 3) {
      prevImageData = ctx.getImageData(0, 0, width, height);
    }
    
    // Apply patch
    const patchData = new ImageData(frame.patch, frame.dims.width, frame.dims.height);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = frame.dims.width;
    tempCanvas.height = frame.dims.height;
    tempCanvas.getContext('2d').putImageData(patchData, 0, 0);
    
    // Some gifs have no disposal type defined, treat as 1
    const disposalType = frame.disposalType || 1;
    
    if (disposalType === 2) {
      // Clear before drawing
      ctx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
    }
    
    ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);
    
    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    outCanvas.getContext('2d').drawImage(canvas, 0, 0);
    
    compositedCanvases.push({
      canvas: outCanvas,
      delay: frame.delay * 10 || 100 // default 100ms
    });
    
    if (disposalType === 2) {
      ctx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
    } else if (disposalType === 3 && prevImageData) {
      ctx.putImageData(prevImageData, 0, 0);
    }
  }
  
  return compositedCanvases;
}

export async function compositeGifFramesAsync(frames, width, height, onProgress) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  const compositedCanvases = [];
  
  let frameImageData = ctx.createImageData(width, height);
  let prevImageData = null;
  
  for (let i = 0; i < frames.length; i++) {
    if (i % 5 === 0) {
      if (onProgress) onProgress(i, frames.length);
      await new Promise(r => setTimeout(r, 0));
    }
    
    const frame = frames[i];
    if (frame.disposalType === 3) {
      prevImageData = ctx.getImageData(0, 0, width, height);
    }
    
    const patchData = new ImageData(frame.patch, frame.dims.width, frame.dims.height);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = frame.dims.width;
    tempCanvas.height = frame.dims.height;
    tempCanvas.getContext('2d').putImageData(patchData, 0, 0);
    
    const disposalType = frame.disposalType || 1;
    if (disposalType === 2) {
      ctx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
    }
    
    ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);
    
    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    outCanvas.getContext('2d').drawImage(canvas, 0, 0);
    
    compositedCanvases.push({
      canvas: outCanvas,
      delay: frame.delay * 10 || 100
    });
    
    if (disposalType === 2) {
      ctx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
    } else if (disposalType === 3 && prevImageData) {
      ctx.putImageData(prevImageData, 0, 0);
    }
  }
  
  return compositedCanvases;
}
