import React, { useRef, useState, useEffect } from 'react';
import { Image as ImageIcon, Type, LayoutGrid, Layers, Upload, Download } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ settings, onSettingsChange, metadata, vibrantMetadata, onImageUpload }) {
  const fileInputRef = useRef(null);
  const fontInputRef = useRef(null);
  const paletteRef = useRef(null);
  const dirRef = useRef(null);
  const bezierRef = useRef(null);
  const vibrantMapRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'p1', 'p2', 'vibrant_id'

  const updateSetting = (key, value) => {
    onSettingsChange(prev => ({ ...prev, [key]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onImageUpload(event.target.result);
        updateSetting('mode', 'image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFontUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const fontName = `Custom_${file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '')}`;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const font = new FontFace(fontName, event.target.result);
          await font.load();
          document.fonts.add(font);
          updateSetting('customFont', fontName);
          updateSetting('fontFamily', fontName);
        } catch (err) {
          console.error("Error loading font:", err);
          alert("Failed to load custom font.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handlePointerDown = (e, point) => {
    e.preventDefault();
    setDragging(point);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    
    let currentRef = null;
    if (dragging.startsWith('fill_')) currentRef = paletteRef;
    if (dragging.startsWith('dir_')) currentRef = dirRef;
    if (dragging.startsWith('bez_')) currentRef = bezierRef;
    if (dragging.startsWith('vibrant_')) currentRef = vibrantMapRef;
    
    if (!currentRef || !currentRef.current) return;
    
    const rect = currentRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    if (dragging.startsWith('fill_')) {
      const p = dragging.split('_')[1];
      updateSetting('gradientLine', { ...settings.gradientLine, [p]: { x, y } });
    } else if (dragging.startsWith('dir_')) {
      const p = dragging.split('_')[1];
      updateSetting('directionLine', { ...settings.directionLine, [p]: { x, y } });
    } else if (dragging.startsWith('bez_')) {
      const p = dragging.split('_')[1];
      // In bezier, Y is inverted visually (bottom is 0, top is 1)
      const bezX = x;
      const bezY = 1 - y;
      const newBezier = { ...settings.bezier };
      if (p === 'p1') { newBezier.x1 = bezX; newBezier.y1 = bezY; }
      if (p === 'p2') { newBezier.x2 = bezX; newBezier.y2 = bezY; }
      updateSetting('bezier', newBezier);
    } else if (dragging.startsWith('vibrant_')) {
      const id = dragging.split('_')[1];
      updateSetting('vibrantStops', {
        ...settings.vibrantStops,
        [id]: { t: x }
      });
    }
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, settings.gradientLine]);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Glaze Mosaic</h2>
        <p>Visual mapping to tile art.</p>
      </div>

      <div className="sidebar-section">
        <h3>Input Mode</h3>
        <div className="mode-toggle">
          <button 
            className={settings.mode === 'text' ? 'active' : ''} 
            onClick={() => updateSetting('mode', 'text')}
          >
            <Type size={18} /> Font
          </button>
          <button 
            className={settings.mode === 'image' ? 'active' : ''} 
            onClick={() => updateSetting('mode', 'image')}
          >
            <ImageIcon size={18} /> Image
          </button>
        </div>
      </div>

      {settings.mode === 'text' && (
        <div className="sidebar-section">
          <h3>Font Settings</h3>
          <div className="input-group">
            <label>Text</label>
            <textarea 
              rows="3"
              style={{ background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px', fontFamily: 'inherit', resize: 'vertical' }}
              value={settings.text} 
              onChange={e => updateSetting('text', e.target.value)} 
            />
          </div>
          <div className="input-group">
            <label>Font Family</label>
            <select 
              value={settings.fontFamily} 
              onChange={e => updateSetting('fontFamily', e.target.value)}
              style={{ background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px' }}
            >
              <option value="Outfit">Outfit</option>
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              {settings.customFont && <option value={settings.customFont}>{settings.customFont} (Custom)</option>}
            </select>
          </div>
          <div className="input-group" style={{ marginTop: '8px' }}>
            <button className="upload-btn" onClick={() => fontInputRef.current.click()} style={{ padding: '8px', fontSize: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>
              <Upload size={14} /> Upload Custom Font (.ttf/.otf)
            </button>
            <input 
              type="file" 
              ref={fontInputRef} 
              style={{ display: 'none' }} 
              accept=".ttf,.otf,.woff,.woff2" 
              onChange={handleFontUpload} 
            />
          </div>
          <div className="input-group">
            <label>Font Size</label>
            <input 
              type="range" 
              min="50" max="1500" 
              value={settings.fontSize} 
              onChange={e => updateSetting('fontSize', parseInt(e.target.value))} 
            />
          </div>
          <div className="input-group">
            <label>Offset X</label>
            <input 
              type="range" 
              min="-1000" max="1000" 
              value={settings.textOffsetX} 
              onChange={e => updateSetting('textOffsetX', parseInt(e.target.value))} 
            />
          </div>
          <div className="input-group">
            <label>Offset Y</label>
            <input 
              type="range" 
              min="-1000" max="1000" 
              value={settings.textOffsetY} 
              onChange={e => updateSetting('textOffsetY', parseInt(e.target.value))} 
            />
          </div>
          <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={settings.useStroke} 
              onChange={e => updateSetting('useStroke', e.target.checked)} 
              style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
            />
            <label>Add Border/Stroke</label>
          </div>
          {settings.useStroke && (
            <div className="input-group">
              <label>Border Width</label>
              <input 
                type="range" 
                min="2" max="60" 
                value={settings.strokeWidth} 
                onChange={e => updateSetting('strokeWidth', parseInt(e.target.value))} 
              />
            </div>
          )}
          <div className="input-group">
            <label>Fill Gradient Width</label>
            <input 
              type="range" 
              min="10" max="100" 
              value={settings.gradientWidth} 
              onChange={e => updateSetting('gradientWidth', parseInt(e.target.value))} 
            />
          </div>
          <div className="input-group">
            <label>Fill Gradient Style</label>
            <div className="mode-toggle" style={{ marginTop: '8px' }}>
              <button 
                className={settings.textGradientType === 'radial' ? 'active' : ''} 
                onClick={() => updateSetting('textGradientType', 'radial')}
              >
                Radial (Stroke-wise)
              </button>
              <button 
                className={settings.textGradientType === 'directional' ? 'active' : ''} 
                onClick={() => updateSetting('textGradientType', 'directional')}
              >
                Directional
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL CONTROLS MOVED OUT OF FONT SETTINGS */}
      <div className="sidebar-section" style={{ marginTop: '16px', background: 'var(--bg-darker)', padding: '12px', borderRadius: '8px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Gradient Curve (Easing & Brightness)</label>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Adjust how colors distribute radially, or shift the direct image brightness non-linearly.
        </p>
          <div className="palette-wrapper" ref={bezierRef} style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <path 
                d={`M 0 100 C ${settings.bezier.x1 * 100} ${(1 - settings.bezier.y1) * 100}, ${settings.bezier.x2 * 100} ${(1 - settings.bezier.y2) * 100}, 100 0`}
                fill="none" stroke="var(--accent)" strokeWidth="3"
              />
              <line x1="0" y1="100" x2={settings.bezier.x1 * 100} y2={(1 - settings.bezier.y1) * 100} stroke="var(--border)" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="100" y1="0" x2={settings.bezier.x2 * 100} y2={(1 - settings.bezier.y2) * 100} stroke="var(--border)" strokeWidth="2" strokeDasharray="4 4" />
              <circle 
                cx={settings.bezier.x1 * 100} cy={(1 - settings.bezier.y1) * 100} 
                r="5" fill="var(--bg-dark)" stroke="var(--accent)" strokeWidth="2"
                style={{ pointerEvents: 'auto', cursor: 'grab' }}
                onPointerDown={(e) => handlePointerDown(e, 'bez_p1')}
              />
              <circle 
                cx={settings.bezier.x2 * 100} cy={(1 - settings.bezier.y2) * 100} 
                r="5" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2"
                style={{ pointerEvents: 'auto', cursor: 'grab' }}
                onPointerDown={(e) => handlePointerDown(e, 'bez_p2')}
              />
            </svg>
          </div>
        </div>

      { ((settings.mode === 'text' && settings.textGradientType === 'directional') || settings.quadtreeDirectional) && (
        <div className="sidebar-section" style={{ marginTop: '16px', background: 'var(--bg-darker)', padding: '12px', borderRadius: '8px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Spatial Direction Vector</label>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Drag points to define the direction for Font Gradient and/or QuadTree Scaling. Point 1 = Start, Point 2 = End.
          </p>
          <div className="palette-wrapper" ref={dirRef} style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <line 
                x1={`${settings.directionLine.p1.x * 100}%`} y1={`${settings.directionLine.p1.y * 100}%`} 
                x2={`${settings.directionLine.p2.x * 100}%`} y2={`${settings.directionLine.p2.y * 100}%`} 
                stroke="#a855f7" strokeWidth="4" 
              />
              <circle 
                cx={`${settings.directionLine.p1.x * 100}%`} cy={`${settings.directionLine.p1.y * 100}%`} 
                r="8" fill="var(--bg-dark)" stroke="#a855f7" strokeWidth="2"
                style={{ pointerEvents: 'auto', cursor: 'grab' }}
                onPointerDown={(e) => handlePointerDown(e, 'dir_p1')}
              />
              <circle 
                cx={`${settings.directionLine.p2.x * 100}%`} cy={`${settings.directionLine.p2.y * 100}%`} 
                r="8" fill="#a855f7" stroke="#a855f7" strokeWidth="2"
                style={{ pointerEvents: 'auto', cursor: 'grab' }}
                onPointerDown={(e) => handlePointerDown(e, 'dir_p2')}
              />
            </svg>
          </div>
        </div>
      )}

      {settings.mode === 'image' && (
        <div className="sidebar-section">
          <h3>Image Input</h3>
          <button className="upload-btn" onClick={() => fileInputRef.current.click()} style={{ marginBottom: '16px' }}>
            <Upload size={18} /> Upload Image
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*" 
            onChange={handleImageChange} 
          />
          
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Color Mapping Engine</label>
          <div className="mode-toggle">
            <button 
              className={settings.imageMappingType !== 'gradient' ? 'active' : ''} 
              onClick={() => updateSetting('imageMappingType', 'direct')}
            >
              Direct Color Match
            </button>
            <button 
              className={settings.imageMappingType === 'gradient' ? 'active' : ''} 
              onClick={() => updateSetting('imageMappingType', 'gradient')}
            >
              Palette Gradient Map
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            {settings.imageMappingType === 'gradient' 
              ? 'Converts the image to B&W luminosity, then strictly applies the selected tiles drawn along the gradient line.' 
              : 'Finds the closest exact color match for every tile. Adjust the global Gradient Curve to non-linearly shift the brightness values.'}
          </p>
        </div>
      )}

      <div className="sidebar-section">
        <h3>Mapping Settings</h3>
        <div className="mode-toggle">
          <button 
            className={!settings.quadtreeMode ? 'active' : ''} 
            onClick={() => updateSetting('quadtreeMode', false)}
          >
            <LayoutGrid size={18} /> Grid Mode
          </button>
          <button 
            className={settings.quadtreeMode ? 'active' : ''} 
            onClick={() => updateSetting('quadtreeMode', true)}
          >
            <Layers size={18} /> QuadTree Mode
          </button>
        </div>

        <div className="input-group">
          <label>Base Grid Resolution</label>
          <input 
            type="range" 
            min="10" max="400" 
            value={settings.gridResolution} 
            onChange={e => updateSetting('gridResolution', parseInt(e.target.value))} 
          />
        </div>

        {settings.quadtreeMode && (
          <>
            <div className="input-group">
              <label>QuadTree Detail (Threshold)</label>
              <input 
                type="range" 
                min="1" max="100" 
                value={settings.quadtreeDetail} 
                onChange={e => updateSetting('quadtreeDetail', parseInt(e.target.value))} 
              />
            </div>
            <label className="checkbox-label" style={{ marginTop: '12px' }}>
              <input 
                type="checkbox" 
                checked={settings.quadtreeDirectional} 
                onChange={e => updateSetting('quadtreeDirectional', e.target.checked)} 
              />
              Directional Scale (Big to Small)
            </label>
          </>
        )}
      </div>

      <div className="sidebar-section">
        <h3>Background Settings</h3>
        
        <label className="checkbox-label" style={{ marginBottom: '8px' }}>
          <input 
            type="checkbox" 
            checked={settings.textOnly} 
            onChange={e => updateSetting('textOnly', e.target.checked)} 
          />
          Remove Background Tiles (Transparent padding)
        </label>
        
        <label className="checkbox-label" style={{ marginBottom: '8px' }}>
          <input 
            type="checkbox" 
            checked={settings.whiteBgTile} 
            onChange={e => updateSetting('whiteBgTile', e.target.checked)} 
            disabled={settings.textOnly || (settings.mode === 'image')}
          />
          Use Solid White Tile for Background
        </label>
        
        {settings.textOnlyBg && (
          <label className="checkbox-label" style={{ marginLeft: '24px' }}>
            <input 
              type="checkbox" 
              checked={settings.bgIsBlack} 
              onChange={e => updateSetting('bgIsBlack', e.target.checked)} 
            />
            Black Background (instead of White)
          </label>
        )}
      </div>

      <div className="sidebar-section palette-display-container">
        <h3>Gradient Spectrum Tool (8x8)</h3>
        
        <label className="checkbox-label" style={{ marginBottom: '8px' }}>
          <input 
            type="checkbox" 
            checked={settings.useGradientPalette} 
            onChange={e => updateSetting('useGradientPalette', e.target.checked)} 
          />
          Use Gradient Line Selection
        </label>

        <div className="palette-wrapper" ref={paletteRef} style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
          <div className="palette-grid-8x8">
            {metadata.slice(0, 64).map(tile => (
              <div 
                key={tile.id} 
                className="palette-tile"
                style={{ backgroundImage: `url(${import.meta.env.BASE_URL}tiles/resized/64/${tile.filename})` }}
                title={`RGB: ${Math.round(tile.r)},${Math.round(tile.g)},${Math.round(tile.b)}`}
              />
            ))}
          </div>
          
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
            {settings.gradientLine && settings.useGradientPalette && (
              <>
                <line 
                  x1={`${settings.gradientLine.p1.x * 100}%`} y1={`${settings.gradientLine.p1.y * 100}%`} 
                  x2={`${settings.gradientLine.p2.x * 100}%`} y2={`${settings.gradientLine.p2.y * 100}%`} 
                  stroke="var(--accent)" strokeWidth="3" strokeDasharray="4 4"
                />
                <circle 
                  cx={`${settings.gradientLine.p1.x * 100}%`} cy={`${settings.gradientLine.p1.y * 100}%`} 
                  r="8" fill="var(--bg-dark)" stroke="var(--accent)" strokeWidth="2"
                  style={{ pointerEvents: 'auto', cursor: 'grab' }}
                  onPointerDown={(e) => handlePointerDown(e, 'fill_p1')}
                />
                <circle 
                  cx={`${settings.gradientLine.p2.x * 100}%`} cy={`${settings.gradientLine.p2.y * 100}%`} 
                  r="8" fill="var(--bg-dark)" stroke="var(--accent)" strokeWidth="2"
                  style={{ pointerEvents: 'auto', cursor: 'grab' }}
                  onPointerDown={(e) => handlePointerDown(e, 'fill_p2')}
                />
              </>
            )}
          </svg>
        </div>
      </div>

      {vibrantMetadata && vibrantMetadata.length > 0 && (
        <div className="sidebar-section">
          <h3>Vibrant Color Overrides</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Select vibrant tiles below and drag them on the gradient map to force them to appear at specific brightness thresholds.
          </p>

          {/* The Gradient Map */}
          <div 
            ref={vibrantMapRef}
            style={{ 
              position: 'relative', 
              height: '40px', 
              background: 'linear-gradient(to right, #000, #fff)', 
              borderRadius: '4px', 
              marginBottom: '16px', 
              boxShadow: 'inset 0 0 4px rgba(0,0,0,0.5)',
              userSelect: 'none'
            }}
          >
            {settings.vibrantStops && Object.keys(settings.vibrantStops).map(id => {
              const stop = settings.vibrantStops[id];
              const tile = vibrantMetadata.find(v => v.id === id);
              if (!tile) return null;
              return (
                <div 
                  key={id} 
                  style={{ 
                    position: 'absolute', 
                    left: `${stop.t * 100}%`, 
                    top: '50%', 
                    transform: 'translate(-50%, -50%)',
                    width: '32px', height: '32px',
                    backgroundImage: `url(${import.meta.env.BASE_URL}tiles-vibrant/resized/64/${tile.filename})`,
                    backgroundSize: 'cover',
                    border: '2px solid var(--accent)',
                    borderRadius: '50%',
                    cursor: 'grab',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                    zIndex: dragging === `vibrant_${id}` ? 100 : 10
                  }}
                  onPointerDown={(e) => handlePointerDown(e, `vibrant_${id}`)}
                />
              )
            })}
          </div>

          {/* Spread Slider */}
          <div className="input-group">
            <div className="slider-header">
              <label>Override Spread Tolerance</label>
              <span>{Math.round(settings.vibrantSpread * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0.01" max="0.5" step="0.01" 
              value={settings.vibrantSpread} 
              onChange={(e) => updateSetting('vibrantSpread', parseFloat(e.target.value))} 
            />
          </div>

          {/* The Vibrant Palette Toggles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '8px', marginTop: '12px' }}>
            {vibrantMetadata.map(tile => {
              const isActive = settings.vibrantStops && !!settings.vibrantStops[tile.id];
              return (
                <div 
                  key={tile.id}
                  onClick={() => {
                    const newStops = { ...(settings.vibrantStops || {}) };
                    if (isActive) {
                      delete newStops[tile.id];
                    } else {
                      newStops[tile.id] = { t: 0.5 };
                    }
                    updateSetting('vibrantStops', newStops);
                  }}
                  title={`Toggle override for tile ${tile.id}`}
                  style={{
                    aspectRatio: '1',
                    backgroundImage: `url(${import.meta.env.BASE_URL}tiles-vibrant/resized/64/${tile.filename})`,
                    backgroundSize: 'cover',
                    border: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    opacity: isActive ? 1 : 0.4,
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}
