const fs = require('fs');
const path = 'tile-mosaic/src/components/Sidebar.jsx';
let text = fs.readFileSync(path, 'utf8');

// Replace handleImageChange
const oldHandle = \`  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'image/gif') {
        const buffer = await file.arrayBuffer();
        const gif = parseGIF(buffer);
        const frames = decompressFrames(gif, true);
        const composited = compositeGifFrames(frames, gif.lsd.width, gif.lsd.height);
        const url = URL.createObjectURL(file);
        onImageUpload({ type: 'gif', frames: composited, width: gif.lsd.width, height: gif.lsd.height, url, file });
        updateSetting('mode', 'image');
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          onImageUpload(event.target.result);
          updateSetting('mode', 'image');
        };
        reader.readAsDataURL(file);
      }
    }
  };\`;

const newHandle = \`  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'image/gif') {
        setDecodingGifProgress("Reading file...");
        setTimeout(async () => {
          try {
            const buffer = await file.arrayBuffer();
            setDecodingGifProgress("Parsing GIF metadata...");
            await new Promise(r => setTimeout(r, 20));

            const gif = parseGIF(buffer);
            
            setDecodingGifProgress(\\\`Decompressing \${gif.frames.length} frames (this may take a moment)...\\\`);
            await new Promise(r => setTimeout(r, 20));

            const frames = decompressFrames(gif, true);
            
            setDecodingGifProgress("Compositing frames...");
            await new Promise(r => setTimeout(r, 20));

            const composited = compositeGifFrames(frames, gif.lsd.width, gif.lsd.height);
            const url = URL.createObjectURL(file);
            
            onImageUpload({ type: 'gif', frames: composited, width: gif.lsd.width, height: gif.lsd.height, url, file });
            updateSetting('mode', 'image');
          } catch(err) {
            console.error(err);
            alert("Error decoding GIF!");
          } finally {
            setDecodingGifProgress(null);
          }
        }, 50);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          onImageUpload(event.target.result);
          updateSetting('mode', 'image');
        };
        reader.readAsDataURL(file);
      }
    }
  };\`;

text = text.replace(oldHandle, newHandle);

// Add Overlay
const oldReturn = "  return (\n    <div className=\"sidebar-container\">";
const newReturn = \`  return (
    <div className="sidebar-container" style={{ position: 'relative' }}>
      {decodingGifProgress && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, color: 'white', borderRadius: '8px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <style>{\\\`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }\\\`}</style>
          <div style={{ fontWeight: 'bold', textAlign: 'center', padding: '0 20px' }}>{decodingGifProgress}</div>
        </div>
      )}\`;

text = text.replace(oldReturn, newReturn);

fs.writeFileSync(path, text, 'utf8');
