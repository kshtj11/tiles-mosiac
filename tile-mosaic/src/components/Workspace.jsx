import React, { useEffect, useRef, useState } from 'react';
import { generateGridMosaic, generateQuadtreeMosaic, getBezier } from '../utils/mosaic';
import './Workspace.css';

export default function Workspace({ metadata, vibrantMetadata, settings, selectedImage, onImageUpload }) {
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

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current || !hiddenCanvasRef.current) return;
    if (Object.keys(loadedImages).length === 0) return;

    const processMosaic = async () => {
      setIsProcessing(true);
      
      const container = containerRef.current;
      const width = container.clientWidth - 40; // padding
      const height = container.clientHeight - 40;
      
      const hiddenCanvas = hiddenCanvasRef.current;
      hiddenCanvas.width = width;
      hiddenCanvas.height = height;
      const ctx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
      
      // Clear canvas with transparent
      ctx.clearRect(0, 0, width, height);
      if (settings.mode === 'text') {
        ctx.fillStyle = 'rgb(0, 0, 255)'; // Semantic Background blue for text mode
        ctx.fillRect(0, 0, width, height);
      }
      
      if (settings.mode === 'text' && settings.text) {
        ctx.lineJoin = 'round';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `800 ${settings.fontSize}px "${settings.fontFamily}", sans-serif`;
        
        const lines = settings.text.split('\n');
        const lineHeight = settings.fontSize * 1.1;
        const totalHeight = lineHeight * lines.length;
        
        let textWidth = 0;
        lines.forEach(l => {
          textWidth = Math.max(textWidth, ctx.measureText(l).width);
        });
        
        const textLeft = width / 2 - textWidth / 2;
        const textTop = height / 2 - totalHeight / 2;
        const startY = textTop + lineHeight / 2;

        let fillStyle = 'rgb(255, 0, 0)';
        if (settings.textGradientType === 'directional' && settings.directionLine) {
          const { p1, p2 } = settings.directionLine;
          const x0 = textLeft + p1.x * textWidth;
          const y0 = textTop + p1.y * totalHeight;
          const x1 = textLeft + p2.x * textWidth;
          const y1 = textTop + p2.y * totalHeight;
          
          const grad = ctx.createLinearGradient(x0, y0, x1, y1);
          const { x1: bx1, y1: by1, x2: bx2, y2: by2 } = settings.bezier || { x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.75 };
          for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            const adjustedT = getBezier(t, bx1, by1, bx2, by2);
            const rVal = Math.max(1, Math.floor(adjustedT * 255));
            grad.addColorStop(t, `rgb(${rVal}, 0, 0)`);
          }
          fillStyle = grad;
        }
        
        // We will draw the gradient/strokes to a temporary canvas so we can mask it
        // and prevent the stroke from thickening the outer bounds of the font.
        const textCanvas = document.createElement('canvas');
        textCanvas.width = width;
        textCanvas.height = height;
        const tCtx = textCanvas.getContext('2d', { willReadFrequently: true });
        tCtx.lineJoin = 'round';
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.font = `800 ${settings.fontSize}px "${settings.fontFamily}", sans-serif`;
        
        lines.forEach((line, i) => {
          const y = startY + i * lineHeight + (settings.textOffsetY || 0);
          const x = width / 2 + (settings.textOffsetX || 0);
          
          if (settings.textGradientType === 'radial') {
            const steps = settings.gradientWidth || 40;
            const { x1: bx1, y1: by1, x2: bx2, y2: by2 } = settings.bezier || { x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.75 };
            for (let w = steps; w >= 1; w--) {
              const t = 1 - (w / steps); // 0 (outer) to 1 (inner)
              const adjustedT = getBezier(t, bx1, by1, bx2, by2);
              const rVal = Math.max(1, Math.floor(adjustedT * 255));
              tCtx.strokeStyle = `rgb(${rVal}, 0, 0)`;
              tCtx.lineWidth = w;
              tCtx.strokeText(line, width / 2 + (settings.textOffsetX || 0), y);
            }
            tCtx.fillStyle = `rgb(255, 0, 0)`; // Ensure the interior center is filled with max red
          } else {
            tCtx.fillStyle = fillStyle;
          }
          
          tCtx.fillText(line, x, y);
        });
        
        // Now mask the drawn text so it doesn't thicken.
        // We must draw all lines to a single mask canvas first, otherwise 
        // destination-in will clear the other lines on each loop iteration.
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const mCtx = maskCanvas.getContext('2d');
        mCtx.textAlign = 'center';
        mCtx.textBaseline = 'middle';
        mCtx.font = tCtx.font;
        mCtx.fillStyle = 'white';
        
        lines.forEach((line, i) => {
          const y = startY + i * lineHeight + (settings.textOffsetY || 0);
          const x = width / 2 + (settings.textOffsetX || 0);
          mCtx.fillText(line, x, y);
        });
        
        tCtx.globalCompositeOperation = 'destination-in';
        tCtx.drawImage(maskCanvas, 0, 0);
        
        // Draw the border on the main context FIRST
        lines.forEach((line, i) => {
          const y = startY + i * lineHeight + (settings.textOffsetY || 0);
          const x = width / 2 + (settings.textOffsetX || 0);
          if (settings.useStroke) {
            ctx.strokeStyle = '#00FF00'; // Green border
            ctx.lineWidth = settings.strokeWidth;
            ctx.strokeText(line, x, y);
          }
        });
        
        // Then draw the perfectly masked text core
        ctx.drawImage(textCanvas, 0, 0);
        
      } else if (settings.mode === 'image' && selectedImage) {
        const img = new Image();
        img.src = selectedImage;
        await new Promise(r => { img.onload = r; });
        
        // Scale to fit
        const scale = Math.min(width / img.width, height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (width - w) / 2;
        const y = (height - h) / 2;
        
        ctx.drawImage(img, x, y, w, h);
      }

      // Now generate mosaic
      let tiles = [];
      if (settings.quadtreeMode) {
        tiles = generateQuadtreeMosaic(hiddenCanvas, settings, metadata, vibrantMetadata);
      } else {
        tiles = generateGridMosaic(hiddenCanvas, settings, metadata, vibrantMetadata);
      }

      // Render to main canvas
      const outCanvas = canvasRef.current;
      outCanvas.width = width;
      outCanvas.height = height;
      if (settings.textOnlyBg) {
        outCanvas.style.backgroundColor = settings.bgIsBlack ? '#000000' : '#ffffff';
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
            // Calculate integer pixel bounds to completely eliminate rendering seams
            const drawX = Math.floor(t.x);
            const drawY = Math.floor(t.y);
            const drawW = Math.ceil(t.x + t.size) - drawX;
            const drawH = Math.ceil(t.y + t.size) - drawY;
            outCtx.drawImage(img, drawX, drawY, drawW, drawH);
          }
        }
      });
      
      setIsProcessing(false);
    };

    // Use a short timeout to debounce renders
    const tid = setTimeout(processMosaic, 100);
    return () => clearTimeout(tid);
    
  }, [settings, metadata, loadedImages, selectedImage]);

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
}
