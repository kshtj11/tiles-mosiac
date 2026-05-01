import re

with open('src/components/Sidebar.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '<div className="sidebar-section" style={{ marginTop: \'16px\', background: \'var(--bg-darker)\', padding: \'12px\', borderRadius: \'8px\' }}>'
idx = text.find(target)

if idx != -1:
    new_ui = """      <div className="sidebar-section" style={{ marginTop: '24px' }}>
        <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px' }}>GIF Export & Animation Settings</h3>
        
        {selectedImage && selectedImage.type === 'gif' && (
          <div className="sidebar-section" style={{ marginBottom: '16px', background: 'var(--bg-darker)', padding: '12px', borderRadius: '8px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Export Animated Input</label>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Export the uploaded GIF through the mosaic processor.
            </p>
            <div className="input-group" style={{ marginBottom: '12px' }}>
              <label>Output Speed (FPS)</label>
              <input 
                type="range" 
                min="1" max="60" 
                value={outputFps} 
                onChange={e => setOutputFps(parseInt(e.target.value))} 
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>{outputFps} fps</span>
                {originalFps && <span>(Original: ~{originalFps} fps)</span>}
              </div>
            </div>
            <button className="primary-btn" onClick={() => {
              if (workspaceRef.current && workspaceRef.current.exportGifInput) {
                setExportProgress('Starting animated input export...');
                workspaceRef.current.exportGifInput(outputFps, (status) => {
                  setExportProgress(status);
                  if (status === 'Finished') setTimeout(() => setExportProgress(null), 2000);
                }).catch(err => {
                  console.error(err);
                  setExportProgress('Error exporting GIF');
                  setTimeout(() => setExportProgress(null), 3000);
                });
              }
            }} disabled={!!exportProgress} style={{ background: 'var(--accent)', width: '100%', padding: '10px', opacity: exportProgress ? 0.5 : 1, border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
               Export Processed GIF
            </button>
          </div>
        )}
        
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
"""
    final_str = text[:idx] + new_ui
    with open('src/components/Sidebar.jsx', 'w', encoding='utf-8') as f:
        f.write(final_str)
    print("Done")
else:
    print("Not found")
