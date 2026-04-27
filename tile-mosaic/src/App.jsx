import { useState, useEffect } from 'react';
import './App.css';
import Workspace from './components/Workspace';
import Sidebar from './components/Sidebar';

function App() {
  const [metadata, setMetadata] = useState([]);
  const [settings, setSettings] = useState({
    mode: 'text', // 'text' or 'image'
    text: 'GLAZE',
    fontFamily: 'Outfit',
    fontSize: 200,
    textOffsetX: 0,
    textOffsetY: 0,
    gridResolution: 32, // how many tiles across
    quadtreeMode: true,
    quadtreeDetail: 10, // threshold for splitting
    textOnlyBg: true,
    bgIsBlack: false,
    useGradientPalette: true,
    gradientLine: { p1: { x: 0.1, y: 0.9 }, p2: { x: 0.9, y: 0.1 } },
    useStroke: true,
    strokeWidth: 8,
    gradientWidth: 40,
    imageMappingType: 'direct', // 'direct' or 'gradient'
    quadtreeDirectional: false,
    textGradientType: 'radial', // 'radial' or 'directional'
    directionLine: { p1: { x: 0.5, y: 0.1 }, p2: { x: 0.5, y: 0.9 } },
    bezier: { x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.75 },
    whiteBgTile: false,
    vibrantStops: {}, // { "id": { t: 0.5 } }
    vibrantSpread: 0.05
  });
  
  const [selectedImage, setSelectedImage] = useState(null);

  const [vibrantMetadata, setVibrantMetadata] = useState([]);

  useEffect(() => {
    // Load standard tile metadata
    fetch(`${import.meta.env.BASE_URL}tile_metadata.json`)
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a, b) => a.h - b.h);
        setMetadata(sorted);
      })
      .catch(err => console.error("Error loading tile metadata", err));
      
    // Load vibrant tile metadata
    fetch(`${import.meta.env.BASE_URL}tile_metadata_vibrant.json`)
      .then(res => res.json())
      .then(data => {
        setVibrantMetadata(data);
      })
      .catch(err => console.error("Error loading vibrant tile metadata", err));
  }, []);

  return (
    <div className="app-container">
      <Workspace 
        metadata={metadata} 
        vibrantMetadata={vibrantMetadata}
        settings={settings} 
        selectedImage={selectedImage}
        onImageUpload={setSelectedImage}
      />
      <Sidebar 
        settings={settings} 
        onSettingsChange={setSettings} 
        metadata={metadata}
        vibrantMetadata={vibrantMetadata}
        onImageUpload={setSelectedImage}
      />
    </div>
  );
}

export default App;
