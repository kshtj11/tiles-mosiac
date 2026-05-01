const fs = require('fs');
const path = 'tile-mosaic/src/components/Sidebar.jsx';
let text = fs.readFileSync(path, 'utf8');

const regex = /  return \([\s\S]*?<div className="sidebar">[\s\S]*?<div className="sidebar-header">/;
const newCode = \`  return (
    <div className="sidebar" style={{ position: 'relative' }}>
      {decodingGifProgress && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, color: 'white' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <style>{\\\`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }\\\`}</style>
          <div style={{ fontWeight: 'bold', textAlign: 'center', padding: '0 20px', fontSize: '13px', lineHeight: 1.5 }}>
             {decodingGifProgress}
          </div>
        </div>
      )}
      <div className="sidebar-header">\`;

text = text.replace(regex, newCode);
fs.writeFileSync(path, text, 'utf8');
