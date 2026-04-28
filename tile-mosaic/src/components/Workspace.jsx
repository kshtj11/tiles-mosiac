import React, { useEffect, useRef, useState } from 'react';
import { generateGridMosaic, generateQuadtreeMosaic, getBezier } from '../utils/mosaic';
import './Workspace.css';
import GIF from 'gif.js';

const Workspace = React.forwardRef(({ metadata, vibrantMetadata, settings, selectedImage, onImageUpload }, ref) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});

  // Preload images
  useEffect(() => {
    if (metadata.length === 0) return;
    
    const images = { 64: {}, 128: {}, 256: {}, 512: {} };
    const sizes = [64, 128, 256, 512];
    let loaded = 0;
    const total = (metadata.length + (vibrantMetadata ? vibrantMetadata.length : 0)) * sizes.length;
    
    const loadTile = (tile, isVibrant) => {
      sizes.forEach(size => {
        const img = new Image();
        img.onload = () => {
          loaded++;
          if (loaded === total || loaded % 50 === 0) {
            setLoadedImages({...images});
          }
        };
        img.onerror = () => {
          loaded++;
          if (loaded === total) {
            setLoadedImages({...images});
          }
        };
        const folder = isVibrant ? 'tiles-vibrant' : 'tiles';
        img.src = `${import.meta.env.BASE_URL}${folder}/resized/${size}/${encodeURIComponent(tile.filename)}`; 
        images[size][tile.id] = img;
      });
    };

    metadata.forEach(tile => loadTile(tile, false));
    if (vibrantMetadata) {
      vibrantMetadata.forEach(tile => loadTile(tile, true));
    }
    
    setLoadedImages(images);
  }, [metadata, vibrantMetadata]);


  const mod = (n, m) => ((n % m) + m) % m;

  const renderFrame = async (frameSettings, outCanvas, hiddenCanvas, width, height) => {
    const ctx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
    
    // Clear canvas with transparent
    ctx.clearRect(0, 0, width, height);
    if (frameSettings.mode === 'text') {
      ctx.fillStyle = 'rgb(0, 0, 255)'; // Semantic Background blue for text mode
      ctx.fillRect(0, 0, width, height);
    }
    
    if (frameSettings.mode === 'text' && frameSettings.text) {
      ctx.lineJoin = 'round';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${frameSettings.fontSize}px "${frameSettings.fontFamily}", sans-serif`;
      ctx.letterSpacing = `${frameSettings.tracking || 0}px`;
      
      const lines = frameSettings.text.split('\n');
      const lineHeight = frameSettings.fontSize * (frameSettings.leading || 1.1);
      const totalHeight = lineHeight * lines.length;
      
      let textWidth = 0;
      lines.forEach(l => {
        textWidth = Math.max(textWidth, ctx.measureText(l).width);
      });
      
      const textLeft = width / 2 - textWidth / 2;
      const textTop = height / 2 - totalHeight / 2;
      const startY = textTop + lineHeight / 2;

      let fillStyle = 'rgb(255, 0, 0)';
      if (frameSettings.textGradientType === 'directional' && frameSettings.directionLine) {
        const { p1, p2 } = frameSettings.directionLine;
        const x0 = textLeft + p1.x * textWidth;
        const y0 = textTop + p1.y * totalHeight;
        const x1 = textLeft + p2.x * textWidth;
        const y1 = textTop + p2.y * totalHeight;
        
        const grad = ctx.createLinearGradient(x0, y0, x1, y1);
        const { x1: bx1, y1: by1, x2: bx2, y2: by2 } = frameSettings.bezier || { x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.75 };
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          const adjustedT = getBezier(t, bx1, by1, bx2, by2);
          const loopedT = mod(adjustedT + (frameSettings.phaseOffset || 0), 1.0);
          const rVal = Math.max(1, Math.floor(loopedT * 255));
          grad.addColorStop(t, `rgb(${rVal}, 0, 0)`);
        }
        fillStyle = grad;
      }
      
      const textCanvas = document.createElement('canvas');
      textCanvas.width = width;
      textCanvas.height = height;
      const tCtx = textCanvas.getContext('2d', { willReadFrequently: true });
      tCtx.lineJoin = 'round';
      tCtx.textAlign = 'center';
      tCtx.textBaseline = 'middle';
      tCtx.font = `800 ${frameSettings.fontSize}px "${frameSettings.fontFamily}", sans-serif`;
      tCtx.letterSpacing = `${frameSettings.tracking || 0}px`;
      
      lines.forEach((line, i) => {
        const y = startY + i * lineHeight + (frameSettings.textOffsetY || 0);
        const x = width / 2 + (frameSettings.textOffsetX || 0);
        
        if (frameSettings.textGradientType === 'radial') {
          const steps = frameSettings.gradientWidth || 40;
          const { x1: bx1, y1: by1, x2: bx2, y2: by2 } = frameSettings.bezier || { x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.75 };
          for (let w = steps; w >= 1; w--) {
            const t = 1 - (w / steps); 
            const adjustedT = getBezier(t, bx1, by1, bx2, by2);
            const loopedT = mod(adjustedT + (frameSettings.phaseOffset || 0), 1.0);
            const rVal = Math.max(1, Math.floor(loopedT * 255));
            tCtx.strokeStyle = `rgb(${rVal}, 0, 0)`;
            tCtx.lineWidth = w;
            tCtx.strokeText(line, width / 2 + (frameSettings.textOffsetX || 0), y);
          }
          tCtx.fillStyle = `rgb(255, 0, 0)`; 
        } else {
          tCtx.fillStyle = fillStyle;
        }
        
        tCtx.fillText(line, x, y);
      });
      
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const mCtx = maskCanvas.getContext('2d');
      mCtx.textAlign = 'center';
      mCtx.textBaseline = 'middle';
      mCtx.font = tCtx.font;
      mCtx.letterSpacing = `${frameSettings.tracking || 0}px`;
      mCtx.fillStyle = 'white';
      
      lines.forEach((line, i) => {
        const y = startY + i * lineHeight + (frameSettings.textOffsetY || 0);
        const x = width / 2 + (frameSettings.textOffsetX || 0);
        mCtx.fillText(line, x, y);
      });
      
      tCtx.globalCompositeOperation = 'destination-in';
      tCtx.drawImage(maskCanvas, 0, 0);
      
      lines.forEach((line, i) => {
        const y = startY + i * lineHeight + (frameSettings.textOffsetY || 0);
        const x = width / 2 + (frameSettings.textOffsetX || 0);
        if (frameSettings.useStroke) {
          ctx.strokeStyle = '#00FF00'; // Green border
          ctx.lineWidth = frameSettings.strokeWidth;
          ctx.strokeText(line, x, y);
        }
      });
      
      ctx.drawImage(textCanvas, 0, 0);
      
    } else if (frameSettings.mode === 'image' && selectedImage) {
      const img = new Image();
      img.src = selectedImage;
      await new Promise(r => { img.onload = r; });
      
      const scale = Math.min(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (width - w) / 2;
      const y = (height - h) / 2;
      
      ctx.drawImage(img, x, y, w, h);
    }

    let tiles = [];
    if (frameSettings.quadtreeMode) {
      tiles = generateQuadtreeMosaic(hiddenCanvas, frameSettings, metadata, vibrantMetadata);
    } else {
      tiles = generateGridMosaic(hiddenCanvas, frameSettings, metadata, vibrantMetadata);
    }

    if (frameSettings.textOnlyBg) {
      outCanvas.style.backgroundColor = frameSettings.bgIsBlack ? '#000000' : '#ffffff';
    } else {
      outCanvas.style.backgroundColor = 'transparent';
    }
    
    const outCtx = outCanvas.getContext('2d');
    outCtx.clearRect(0, 0, width, height);

    tiles.forEach(t => {
      let bestSize = 64;
      if (t.size > 256) bestSize = 512;
      else if (t.size > 128) bestSize = 256;
      else if (t.size > 64) bestSize = 128;
      
      if (t.tileId) {
        const img = loadedImages[bestSize]?.[t.tileId] || loadedImages[64]?.[t.tileId];
        if (img) {
          const drawX = Math.floor(t.x);
          const drawY = Math.floor(t.y);
          const drawW = Math.ceil(t.x + t.size) - drawX;
          const drawH = Math.ceil(t.y + t.size) - drawY;
          outCtx.drawImage(img, drawX, drawY, drawW, drawH);
        }
      }
    });
  };

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current || !hiddenCanvasRef.current) return;
    if (Object.keys(loadedImages).length === 0) return;

    const processMosaic = async () => {
      setIsProcessing(true);
      const container = containerRef.current;
      const width = container.clientWidth - 40;
      const height = container.clientHeight - 40;
      
      hiddenCanvasRef.current.width = width;
      hiddenCanvasRef.current.height = height;
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      
      await renderFrame(settings, canvasRef.current, hiddenCanvasRef.current, width, height);
      setIsProcessing(false);
    };

    // Use a short timeout to debounce renders
    const tid = setTimeout(processMosaic, 100);
    return () => clearTimeout(tid);
  }, [settings, metadata, loadedImages, selectedImage]);

  React.useImperativeHandle(ref, () => ({
    exportGif: async (keyframeA, keyframeB, frames, delay, onProgress) => {
      const container = containerRef.current;
      const width = container.clientWidth - 40;
      const height = container.clientHeight - 40;
      
      const gif = new GIF({
        workers: 2,
        quality: 10,
        workerScript: `${import.meta.env.BASE_URL}gif.worker.js`,
        width,
        height
      });
      
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = width;
      tmpCanvas.height = height;
      const tmpHidden = document.createElement('canvas');
      tmpHidden.width = width;
      tmpHidden.height = height;

      for (let i = 0; i <= frames; i++) {
        onProgress(`Rendering frame ${i}/${frames}...`);
        const t = i / frames;
        
        const interpolatedBezier = {
          x1: keyframeA.x1 + (keyframeB.x1 - keyframeA.x1) * t,
          y1: keyframeA.y1 + (keyframeB.y1 - keyframeA.y1) * t,
          x2: keyframeA.x2 + (keyframeB.x2 - keyframeA.x2) * t,
          y2: keyframeA.y2 + (keyframeB.y2 - keyframeA.y2) * t,
        };

        const frameSettings = {
          ...settings,
          bezier: interpolatedBezier
        };

        await renderFrame(frameSettings, tmpCanvas, tmpHidden, width, height);
        
        // Important: copy canvas because GIF.js adds it to worker queue
        const frameCopy = document.createElement('canvas');
        frameCopy.width = width;
        frameCopy.height = height;
        const ctx = frameCopy.getContext('2d');
        if (frameSettings.textOnlyBg) {
          ctx.fillStyle = frameSettings.bgIsBlack ? '#000000' : '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(tmpCanvas, 0, 0);
        
        gif.addFrame(frameCopy, { delay });
      }

      onProgress('Encoding GIF (this may take a while)...');
      
      gif.on('progress', p => {
        onProgress(`Encoding GIF: ${Math.round(p * 100)}%`);
      });

      gif.on('finished', function(blob) {
        onProgress('Finished');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `glaze-mosaic-wave.gif`;
        a.click();
        URL.revokeObjectURL(url);
      });

      gif.render();
    },
    exportGifLoop: async (frames, delay, onProgress) => {
      const container = containerRef.current;
      const width = container.clientWidth - 40;
      const height = container.clientHeight - 40;
      
      const gif = new GIF({
        workers: 2,
        quality: 10,
        workerScript: `${import.meta.env.BASE_URL}gif.worker.js`,
        width,
        height
      });
      
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = width;
      tmpCanvas.height = height;
      const tmpHidden = document.createElement('canvas');
      tmpHidden.width = width;
      tmpHidden.height = height;

      for (let i = 0; i < frames; i++) {
        onProgress(`Rendering frame ${i}/${frames}...`);
        const t = i / frames;
        
        const frameSettings = {
          ...settings,
          phaseOffset: t
        };

        await renderFrame(frameSettings, tmpCanvas, tmpHidden, width, height);
        
        const frameCopy = document.createElement('canvas');
        frameCopy.width = width;
        frameCopy.height = height;
        const ctx = frameCopy.getContext('2d');
        if (frameSettings.textOnlyBg) {
          ctx.fillStyle = frameSettings.bgIsBlack ? '#000000' : '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(tmpCanvas, 0, 0);
        
        gif.addFrame(frameCopy, { delay });
      }

      onProgress('Encoding GIF (this may take a while)...');
      
      gif.on('progress', p => {
        onProgress(`Encoding GIF: ${Math.round(p * 100)}%`);
      });

      gif.on('finished', function(blob) {
        onProgress('Finished');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `glaze-mosaic-loop.gif`;
        a.click();
        URL.revokeObjectURL(url);
      });

      gif.render();
    },
    exportResGif: async (resKeyframeA, resKeyframeB, frames, delay, onProgress) => {
      const container = containerRef.current;
      const width = container.clientWidth - 40;
      const height = container.clientHeight - 40;
      
      const gif = new GIF({
        workers: 2,
        quality: 10,
        workerScript: `${import.meta.env.BASE_URL}gif.worker.js`,
        width,
        height
      });
      
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = width;
      tmpCanvas.height = height;
      const tmpHidden = document.createElement('canvas');
      tmpHidden.width = width;
      tmpHidden.height = height;

      for (let i = 0; i <= frames; i++) {
        onProgress(`Rendering frame ${i}/${frames}...`);
        const t = i / frames;
        
        const interpolatedGridRes = resKeyframeA.gridResolution + (resKeyframeB.gridResolution - resKeyframeA.gridResolution) * t;
        const interpolatedQuadDetail = resKeyframeA.quadtreeDetail + (resKeyframeB.quadtreeDetail - resKeyframeA.quadtreeDetail) * t;

        const frameSettings = {
          ...settings,
          gridResolution: interpolatedGridRes,
          quadtreeDetail: interpolatedQuadDetail
        };

        await renderFrame(frameSettings, tmpCanvas, tmpHidden, width, height);
        
        const frameCopy = document.createElement('canvas');
        frameCopy.width = width;
        frameCopy.height = height;
        const ctx = frameCopy.getContext('2d');
        if (frameSettings.textOnlyBg) {
          ctx.fillStyle = frameSettings.bgIsBlack ? '#000000' : '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(tmpCanvas, 0, 0);
        
        gif.addFrame(frameCopy, { delay });
      }

      onProgress('Encoding GIF (this may take a while)...');
      
      gif.on('progress', p => {
        onProgress(`Encoding GIF: ${Math.round(p * 100)}%`);
      });

      gif.on('finished', function(blob) {
        onProgress('Finished');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `glaze-mosaic-res.gif`;
        a.click();
        URL.revokeObjectURL(url);
      });

      gif.render();
    }
  }));

  return (
    <div className="workspace" ref={containerRef}>
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} className="mosaic-canvas" />
        {isProcessing && (
          <div className="processing-overlay">
            <div className="spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
});

export default Workspace;
