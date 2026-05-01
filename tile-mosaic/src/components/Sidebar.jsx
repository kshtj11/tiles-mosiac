import React, { useRef, useState, useEffect } from 'react';
import { Image as ImageIcon, Type, LayoutGrid, Layers, Upload, Download, Film } from 'lucide-react';
import './Sidebar.css';
import { parseGIF, decompressFrames } from 'gifuct-js';
import { compositeGifFramesAsync } from '../utils/gif';



export default function Sidebar({ settings, onSettingsChange, metadata, vibrantMetadata, onImageUpload, selectedImage, workspaceRef }) {
  const fileInputRef = useRef(null);
  const fontInputRef = useRef(null);
  const paletteRef = useRef(null);
  const dirRef = useRef(null);
  const bezierRef = useRef(null);
  const vibrantMapRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'p1', 'p2', 'vibrant_id'
  const [selectingForColor, setSelectingForColor] = useState(null);
  const projectInputRef = useRef(null);
  const [keyframeA, setKeyframeA] = useState(null);
  const [keyframeB, setKeyframeB] = useState(null);
  const [gifFrames, setGifFrames] = useState(30);
  const [resKeyframeA, setResKeyframeA] = useState(null);
  const [resKeyframeB, setResKeyframeB] = useState(null);
  const [resGifFrames, setResGifFrames] = useState(30);
  const [exportProgress, setExportProgress] = useState(null);
  const [outputFps, setOutputFps] = useState(10);
  const [originalFps, setOriginalFps] = useState(null);
  const [inputTab, setInputTab] = useState('text'); // 'text' | 'image' | 'gif'

  // Sync originalFps when a GIF is loaded
  useEffect(() => {
    if (selectedImage && selectedImage.type === 'gif' && selectedImage.frames?.length > 0) {
      const firstDelay = selectedImage.frames[0]?.delay || 100;
      setOriginalFps(Math.round(1000 / firstDelay));
      setOutputFps(Math.round(1000 / firstDelay));
      setInputTab('gif');
    }
  }, [selectedImage]);

  const allTiles = [
    ...metadata.map(t => ({...t, type: t.type || 'normal', isVibrant: false})),
    ...(vibrantMetadata || []).map(t => ({...t, type: t.type || 'vibrant', isVibrant: true}))
  ];

  const updateSetting = (key, value) => {
    onSettingsChange(prev => ({ ...prev, [key]: value }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (file.type === 'image/gif') {
      try {
        setExportProgress('Parsing GIF...');
        const arrayBuffer = await file.arrayBuffer();
        const parsed = parseGIF(arrayBuffer);
        const rawFrames = decompressFrames(parsed, true);
        const width = parsed.lsd.width;
        const height = parsed.lsd.height;
        setExportProgress(`Compositing ${rawFrames.length} frames...`);
        const compositedFrames = await compositeGifFramesAsync(
          rawFrames, width, height,
          (i, total) => setExportProgress(`Compositing frame ${i + 1}/${total}...`)
        );
        setExportProgress(null);
        const url = compositedFrames[0].canvas.toDataURL();
        onImageUpload({ type: 'gif', url, frames: compositedFrames });
        updateSetting('mode', 'image');
        setInputTab('gif');
      } catch (err) {
        console.error('GIF parse error:', err);
        setExportProgress('Failed to parse GIF');
        setTimeout(() => setExportProgress(null), 3000);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        onImageUpload(event.target.result);
        updateSetting('mode', 'image');
        setInputTab('image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProject = () => {
    const projectData = {
      settings,
      selectedImage,
      version: 1
    };
    const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glaze-project-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.settings) {
            onSettingsChange(data.settings);
          }
          if (data.selectedImage !== undefined) {
            onImageUpload(data.selectedImage);
          }
        } catch (err) {
          alert("Failed to load project file.");
        }
      };
      reader.readAsText(file);
    }
    // reset input
    if (projectInputRef.current) {
      projectInputRef.current.value = '';
    }
  };

  const handleExportGif = async () => {
    if (!keyframeA || !keyframeB || !workspaceRef.current) return;
    try {
      setExportProgress('Starting export...');
      await workspaceRef.current.exportGif(keyframeA, keyframeB, gifFrames, 50, (status) => {
        setExportProgress(status);
        if (status === 'Finished') {
          setTimeout(() => setExportProgress(null), 2000);
        }
      });
    } catch (err) {
      console.error(err);
      setExportProgress('Error exporting GIF');
      setTimeout(() => setExportProgress(null), 3000);
    }
  };

  const handleExportGifLoop = async () => {
    if (!workspaceRef.current) return;
    try {
      setExportProgress('Starting loop export...');
      await workspaceRef.current.exportGifLoop(gifFrames, 50, (status) => {
        setExportProgress(status);
        if (status === 'Finished') {
          setTimeout(() => setExportProgress(null), 2000);
        }
      });
    } catch (err) {
      console.error(err);
      setExportProgress('Error exporting GIF');
      setTimeout(() => setExportProgress(null), 3000);
    }
  };

  const handleExportResGif = async () => {
    if (!resKeyframeA || !resKeyframeB || !workspaceRef.current) return;
    try {
      setExportProgress('Starting res export...');
      await workspaceRef.current.exportResGif(resKeyframeA, resKeyframeB, resGifFrames, 50, (status) => {
        setExportProgress(status);
        if (status === 'Finished') {
          setTimeout(() => setExportProgress(null), 2000);
        }
      });
    } catch (err) {
      console.error(err);
      setExportProgress('Error exporting GIF');
      setTimeout(() => setExportProgress(null), 3000);
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
      if (p === 'p0') { newBezier.x0 = bezX; newBezier.y0 = bezY; }
      if (p === 'p1') { newBezier.x1 = bezX; newBezier.y1 = bezY; }
      if (p === 'p2') { newBezier.x2 = bezX; newBezier.y2 = bezY; }
      if (p === 'p3') { newBezier.x3 = bezX; newBezier.y3 = bezY; }
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
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button className="upload-btn" onClick={handleSaveProject} style={{ flex: 1, padding: '6px', fontSize: '11px', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>
            <Download size={14} /> Save Project
          </button>
          <button className="upload-btn" onClick={() => projectInputRef.current?.click()} style={{ flex: 1, padding: '6px', fontSize: '11px', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>
            <Upload size={14} /> Load Project
          </button>
          <input 
            type="file" 
            ref={projectInputRef} 
            style={{ display: 'none' }} 
            accept=".json" 
            onChange={handleLoadProject} 
          />
        </div>
      </div>


      
      <div className="sidebar-section">
        <h3>Input Mode</h3>
        <div className="mode-toggle">
          <button
            className={inputTab === 'text' ? 'active' : ''}
            onClick={() => { setInputTab('text'); updateSetting('mode', 'text'); }}
          >
            <Type size={18} /> Text
          </button>
          <button
            className={inputTab === 'image' ? 'active' : ''}
            onClick={() => { setInputTab('image'); updateSetting('mode', 'image'); }}
          >
            <ImageIcon size={18} /> Image
          </button>
          <button
            className={inputTab === 'gif' ? 'active' : ''}
            onClick={() => { setInputTab('gif'); updateSetting('mode', 'image'); }}
          >
            <Film size={18} /> GIF
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
            <label>Tracking (Letter Spacing)</label>
            <input 
              type="range" 
              min="-100" max="500" 
              value={settings.tracking || 0} 
              onChange={e => updateSetting('tracking', parseInt(e.target.value))} 
            />
          </div>
          <div className="input-group">
            <label>Leading (Line Height)</label>
            <input 
              type="range" 
              min="0.5" max="3" step="0.1"
              value={settings.leading || 1.1} 
              onChange={e => updateSetting('leading', parseFloat(e.target.value))} 
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
            <div style={{ padding: '8px', background: 'var(--bg-darker)', borderRadius: '8px', marginTop: '8px' }}>
              <div className="input-group" style={{ marginBottom: '12px' }}>
                <label>Border Width</label>
                <input 
                  type="range" 
                  min="2" max="60" 
                  value={settings.strokeWidth} 
                  onChange={e => updateSetting('strokeWidth', parseInt(e.target.value))} 
                />
              </div>
              <div className="input-group" style={{ marginBottom: '0' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Border Tile Override</span>
                  {settings.borderTileId && (
                    <span 
                      style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: '10px' }}
                      onClick={() => updateSetting('borderTileId', null)}
                    >
                      Use Random
                    </span>
                  )}
                </label>
                <div className="custom-scrollbar" style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px' }}>
                  <div 
                    onClick={() => updateSetting('borderTileId', null)}
                    style={{
                      flexShrink: 0,
                      width: '32px', height: '32px',
                      border: !settings.borderTileId ? '2px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: 'var(--text-muted)',
                      background: 'var(--bg-dark)'
                    }}
                  >
                    RND
                  </div>
                  {allTiles.map(tile => (
                    <div 
                      key={tile.id}
                      onClick={() => updateSetting('borderTileId', tile.id)}
                      title={tile.filename}
                      style={{
                        flexShrink: 0,
                        width: '32px', height: '32px',
                        backgroundImage: `url("${import.meta.env.BASE_URL}${tile.isVibrant ? 'tiles-vibrant' : 'tiles'}/resized/64/${encodeURIComponent(tile.filename)}")`,
                        backgroundSize: 'cover',
                        border: settings.borderTileId === tile.id ? '2px solid var(--accent)' : '1px solid transparent',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        opacity: (!settings.borderTileId || settings.borderTileId === tile.id) ? 1 : 0.4
                      }}
                    />
                  ))}
                </div>
              </div>
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


      {inputTab === 'image' && (
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
              ? 'Converts to B&W luminosity, then maps tiles along the gradient line.'
              : 'Finds the closest exact colour match. Adjust the Gradient Curve to shift brightness non-linearly.'}
          </p>
        </div>
      )}


      

      

      {/* ── GIF INPUT MODE ── */}
      {inputTab === 'gif' && (
        <div className="sidebar-section">
          <h3>GIF Input</h3>
          <button className="upload-btn" onClick={() => fileInputRef.current.click()} style={{ marginBottom: '16px' }}>
            <Upload size={18} /> Upload GIF
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/gif"
            onChange={handleImageChange}
          />

          {selectedImage && selectedImage.type === 'gif' && selectedImage.frames?.length > 0 ? (
            <>
              {/* Info bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px', padding: '8px 10px', background: 'var(--bg-darker)', borderRadius: '6px' }}>
                <span>🎞 {selectedImage.frames.length} frames loaded</span>
                {originalFps && <span>~{originalFps} fps original</span>}
              </div>

              {/* Frame scrubber */}
              <div className="input-group">
                <div className="slider-header">
                  <label>Preview Frame</label>
                  <span>{(settings.gifFrameIndex || 0) + 1} / {selectedImage.frames.length}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={selectedImage.frames.length - 1}
                  value={settings.gifFrameIndex || 0}
                  onChange={e => updateSetting('gifFrameIndex', parseInt(e.target.value))}
                />
              </div>

              {/* Color mapping */}
              <div className="input-group" style={{ marginTop: '12px' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Color Mapping Engine</label>
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
              </div>

              {/* Export processed GIF */}
              <div style={{ marginTop: '16px', background: 'var(--bg-darker)', padding: '12px', borderRadius: '8px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Export Processed GIF</label>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Re-render all {selectedImage.frames.length} frames through the mosaic pipeline and download.
                </p>
                <div className="input-group" style={{ marginBottom: '12px' }}>
                  <div className="slider-header">
                    <label>Output Speed (FPS)</label>
                    <span>{outputFps} fps</span>
                  </div>
                  <input
                    type="range"
                    min="1" max="60"
                    value={outputFps}
                    onChange={e => setOutputFps(parseInt(e.target.value))}
                  />
                  {originalFps && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Original: ~{originalFps} fps</div>}
                </div>
                <button
                  onClick={() => {
                    if (!workspaceRef.current?.exportGifInput) return;
                    setExportProgress('Starting animated GIF export...');
                    workspaceRef.current.exportGifInput(outputFps, (status) => {
                      setExportProgress(status);
                      if (status === 'Finished') setTimeout(() => setExportProgress(null), 2000);
                    }).catch(err => {
                      console.error(err);
                      setExportProgress('Error exporting GIF');
                      setTimeout(() => setExportProgress(null), 3000);
                    });
                  }}
                  disabled={!!exportProgress}
                  style={{ width: '100%', padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', opacity: exportProgress ? 0.5 : 1 }}
                >
                  Export Processed GIF
                </button>
              </div>
            </>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
              No GIF loaded. Upload a .gif file above.
            </p>
          )}
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


      

      
      {/* GLOBAL CONTROLS MOVED OUT OF FONT SETTINGS */}
      <div className="sidebar-section" style={{ marginTop: '16px', background: 'var(--bg-darker)', padding: '12px', borderRadius: '8px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Gradient Curve (Easing & Brightness)</label>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Adjust how colors distribute radially, or shift the direct image brightness non-linearly.
        </p>
          <div className="palette-wrapper" ref={bezierRef} style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <path 
                d={`M ${(settings.bezier.x0 ?? 0) * 100} ${(1 - (settings.bezier.y0 ?? 0)) * 100} C ${settings.bezier.x1 * 100} ${(1 - settings.bezier.y1) * 100}, ${settings.bezier.x2 * 100} ${(1 - settings.bezier.y2) * 100}, ${(settings.bezier.x3 ?? 1) * 100} ${(1 - (settings.bezier.y3 ?? 1)) * 100}`}
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
                style={{ backgroundImage: `url("${import.meta.env.BASE_URL}tiles/resized/64/${encodeURIComponent(tile.filename)}")` }}
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
                    backgroundImage: `url("${import.meta.env.BASE_URL}tiles-vibrant/resized/64/${encodeURIComponent(tile.filename)}")`,
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
              min="0.01" max="1" step="0.01" 
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
                    backgroundImage: `url("${import.meta.env.BASE_URL}tiles-vibrant/resized/64/${encodeURIComponent(tile.filename)}")`,
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


      {settings.mode === 'image' && settings.imagePalette && settings.imagePalette.length > 0 && (
        <div className="sidebar-section">
          <h3>Image Palette Overrides</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Map dominant colors from the image to specific tiles.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {settings.imagePalette.map((color, i) => {
              const key = `${color.r},${color.g},${color.b}`;
              const mappedTileId = settings.paletteMappings?.[key];
              const mappedTile = mappedTileId ? allTiles.find(t => t.id === mappedTileId) : null;
              
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', backgroundColor: `rgb(${color.r},${color.g},${color.b})`, border: '1px solid var(--border)', borderRadius: '4px' }} />
                  <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                  <div 
                     style={{ 
                       width: '32px', height: '32px', 
                       border: '1px solid var(--border)', 
                       borderRadius: '4px',
                       backgroundImage: mappedTile ? `url("${import.meta.env.BASE_URL}${mappedTile.isVibrant ? 'tiles-vibrant' : 'tiles'}/resized/64/${encodeURIComponent(mappedTile.filename)}")` : 'none',
                       backgroundSize: 'cover',
                       cursor: 'pointer',
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       fontSize: '10px',
                       color: 'var(--text-muted)',
                       backgroundColor: mappedTile ? 'transparent' : 'var(--bg-dark)'
                     }}
                     onClick={() => setSelectingForColor(selectingForColor === key ? null : key)}
                  >
                    {!mappedTile && "None"}
                  </div>
                </div>
              );
            })}
          </div>
          
          {selectingForColor && (
            <div style={{ marginTop: '12px', background: 'var(--bg-darker)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Select Tile</span>
                <button 
                  onClick={() => updateSetting('paletteMappings', { ...settings.paletteMappings, [selectingForColor]: null })}
                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                >
                  Clear Mapping
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))', gap: '4px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                {allTiles.map(tile => {
                  const isSelected = settings.paletteMappings?.[selectingForColor] === tile.id;
                  return (
                    <div 
                      key={tile.id}
                      onClick={() => {
                        updateSetting('paletteMappings', { ...settings.paletteMappings, [selectingForColor]: tile.id });
                        setSelectingForColor(null);
                      }}
                      title={`Select tile ${tile.id}`}
                      style={{
                        aspectRatio: '1',
                        backgroundImage: `url("${import.meta.env.BASE_URL}${tile.isVibrant ? 'tiles-vibrant' : 'tiles'}/resized/64/${encodeURIComponent(tile.filename)}")`,
                        backgroundSize: 'cover',
                        cursor: 'pointer',
                        borderRadius: '2px',
                        border: isSelected ? '2px solid var(--accent)' : '2px solid transparent'
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      

      
            <div className="sidebar-section" style={{ marginTop: '24px' }}>
        <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px' }}>GIF Export & Animation Settings</h3>
        


        <div className="sidebar-section" style={{ marginBottom: '16px', background: 'var(--bg-darker)', padding: '12px', borderRadius: '8px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>GIF Export (Wave Effect)</label>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Animate the Bezier curve between two keyframes.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button className="upload-btn" onClick={() => setKeyframeA(settings.bezier)} style={{ flex: 1, padding: '6px', fontSize: '11px', background: keyframeA ? 'var(--accent)' : 'var(--bg-dark)', border: '1px solid var(--border)' }}>{keyframeA ? 'Keyframe A Set' : 'Set Keyframe A'}</button>
            <button className="upload-btn" onClick={() => setKeyframeB(settings.bezier)} style={{ flex: 1, padding: '6px', fontSize: '11px', background: keyframeB ? 'var(--accent)' : 'var(--bg-dark)', border: '1px solid var(--border)' }}>{keyframeB ? 'Keyframe B Set' : 'Set Keyframe B'}</button>
          </div>
          <div className="input-group" style={{ marginBottom: '8px' }}>
            <label>Frames (Duration)</label>
            <input type="range" min="10" max="100" value={gifFrames} onChange={e => setGifFrames(parseInt(e.target.value))} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{gifFrames} frames</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="upload-btn" onClick={handleExportGif} disabled={!keyframeA || !keyframeB || exportProgress} style={{ flex: 1, padding: '8px', fontSize: '12px', background: (!keyframeA || !keyframeB) ? 'var(--bg-dark)' : 'var(--accent)', border: '1px solid var(--border)', opacity: (!keyframeA || !keyframeB || exportProgress) ? 0.5 : 1 }}>Export Wave GIF</button>
            <button className="upload-btn" onClick={handleExportGifLoop} disabled={exportProgress} style={{ flex: 1, padding: '8px', fontSize: '12px', background: 'var(--accent)', border: '1px solid var(--border)', opacity: exportProgress ? 0.5 : 1 }}>Export Loop GIF</button>
          </div>
        </div>

        <div className="sidebar-section" style={{ background: 'var(--bg-darker)', padding: '12px', borderRadius: '8px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>GIF Export (Resolution/Zoom)</label>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Animate the resolution scale between two keyframes.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button className="upload-btn" onClick={() => setResKeyframeA({ gridResolution: settings.gridResolution, quadtreeDetail: settings.quadtreeDetail })} style={{ flex: 1, padding: '6px', fontSize: '11px', background: resKeyframeA ? 'var(--accent)' : 'var(--bg-dark)', border: '1px solid var(--border)' }}>{resKeyframeA ? 'Res A Set' : 'Set Res A'}</button>
            <button className="upload-btn" onClick={() => setResKeyframeB({ gridResolution: settings.gridResolution, quadtreeDetail: settings.quadtreeDetail })} style={{ flex: 1, padding: '6px', fontSize: '11px', background: resKeyframeB ? 'var(--accent)' : 'var(--bg-dark)', border: '1px solid var(--border)' }}>{resKeyframeB ? 'Res B Set' : 'Set Res B'}</button>
          </div>
          <div className="input-group" style={{ marginBottom: '8px' }}>
            <label>Frames (Duration)</label>
            <input type="range" min="10" max="100" value={resGifFrames} onChange={e => setResGifFrames(parseInt(e.target.value))} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{resGifFrames} frames</span>
          </div>
          <button className="upload-btn" onClick={handleExportResGif} disabled={!resKeyframeA || !resKeyframeB || exportProgress} style={{ width: '100%', padding: '8px', fontSize: '12px', background: (!resKeyframeA || !resKeyframeB) ? 'var(--bg-dark)' : 'var(--accent)', border: '1px solid var(--border)', opacity: (!resKeyframeA || !resKeyframeB || exportProgress) ? 0.5 : 1 }}>Export Resolution GIF</button>
        </div>
      </div>

      {exportProgress && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg-darker)', padding: '32px', borderRadius: '12px',
            border: '1px solid var(--border)', textAlign: 'center', minWidth: '350px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}>
            <div className="spinner" style={{ margin: '0 auto 24px', width: '40px', height: '40px', borderWidth: '4px' }}></div>
            <h3 style={{ margin: 0, marginBottom: '12px', color: 'var(--text)', fontSize: '18px' }}>Exporting GIF</h3>
            <p style={{ margin: 0, color: 'var(--accent)', fontSize: '14px', fontWeight: 'bold' }}>{exportProgress}</p>
          </div>
        </div>
      )}
    </div>
  );
}
