const fs = require('fs');
let text = fs.readFileSync('src/components/Sidebar.jsx', 'utf8');

const targetStr = `      )}



      

      
      <div className="sidebar-section">
        <h3>Mapping Settings</h3>`;

const insertion = `
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
                    left: \`\${stop.t * 100}%\`, 
                    top: '50%', 
                    transform: 'translate(-50%, -50%)',
                    width: '32px', height: '32px',
                    backgroundImage: \`url("\${import.meta.env.BASE_URL}tiles-vibrant/resized/64/\${encodeURIComponent(tile.filename)}")\`,
                    backgroundSize: 'cover',
                    border: '2px solid var(--accent)',
                    borderRadius: '50%',
                    cursor: 'grab',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                    zIndex: dragging === \`vibrant_\${id}\` ? 100 : 10
                  }}
                  onPointerDown={(e) => handlePointerDown(e, \`vibrant_\${id}\`)}
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
                  title={\`Toggle override for tile \${tile.id}\`}
                  style={{
                    aspectRatio: '1',
                    backgroundImage: \`url("\${import.meta.env.BASE_URL}tiles-vibrant/resized/64/\${encodeURIComponent(tile.filename)}")\`,
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
              const key = \`\${color.r},\${color.g},\${color.b}\`;
              const mappedTileId = settings.paletteMappings?.[key];
              const mappedTile = mappedTileId ? allTiles.find(t => t.id === mappedTileId) : null;
              
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', backgroundColor: \`rgb(\${color.r},\${color.g},\${color.b})\`, border: '1px solid var(--border)', borderRadius: '4px' }} />
                  <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                  <div 
                     style={{ 
                       width: '32px', height: '32px', 
                       border: '1px solid var(--border)', 
                       borderRadius: '4px',
                       backgroundImage: mappedTile ? \`url("\${import.meta.env.BASE_URL}\${mappedTile.isVibrant ? 'tiles-vibrant' : 'tiles'}/resized/64/\${encodeURIComponent(mappedTile.filename)}")\` : 'none',
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
                      title={\`Select tile \${tile.id}\`}
                      style={{
                        aspectRatio: '1',
                        backgroundImage: \`url("\${import.meta.env.BASE_URL}\${tile.isVibrant ? 'tiles-vibrant' : 'tiles'}/resized/64/\${encodeURIComponent(tile.filename)}")\`,
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
`;

const idx = text.indexOf('      <div className="sidebar-section">\r\n        <h3>Mapping Settings</h3>');
if (idx !== -1) {
    const finalStr = text.substring(0, idx) + insertion + text.substring(idx);
    fs.writeFileSync('src/components/Sidebar.jsx', finalStr, 'utf8');
    console.log("Done");
} else {
    console.log("Not found idx!");
}
