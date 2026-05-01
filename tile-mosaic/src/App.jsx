import { useState, useEffect, useRef } from 'react';
import './App.css';
import Workspace from './components/Workspace';
import Sidebar from './components/Sidebar';

function App() {
  const [metadata, setMetadata] = useState([]);
  const [settings, setSettings] = useState({
    mode: 'text', // 'text' or 'image'
    text: 'Love\nGlazing',
    fontFamily: 'Outfit',
    fontSize: 150,
    textOffsetX: 0,
    textOffsetY: 0,
    tracking: 0,
    leading: 1.1,
    gridResolution: 32, // how many tiles across
    quadtreeMode: true,
    quadtreeDetail: 10, // threshold for splitting
    textOnlyBg: true,
    bgIsBlack: false,
    useGradientPalette: true,
    gradientLine: { p1: { x: 0.2, y: 0.4 }, p2: { x: 0.8, y: 0.6 } },
    useStroke: false,
    strokeWidth: 8,
    borderTileId: null,
    gradientWidth: 65,
    imageMappingType: 'direct', // 'direct' or 'gradient'
    quadtreeDirectional: false,
    textGradientType: 'directional', // 'radial' or 'directional'
    directionLine: { p1: { x: 0.5, y: 0.1 }, p2: { x: 0.5, y: 0.9 } },
    bezier: { x0: 0, y0: 0, x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.75, x3: 1, y3: 1 },
    whiteBgTile: false,
    vibrantStops: {}, // { "id": { t: 0.5 } }
    vibrantSpread: 0.05,
    paletteMappings: {},
    imagePalette: [],
    dithering: 'none', // 'none', 'floyd', 'atkinson', 'ordered'
    colorLock: false,
    gifFrameIndex: 0
  });
  
  const [selectedImage, setSelectedImage] = useState(null);

  const [vibrantMetadata, setVibrantMetadata] = useState([]);
  const workspaceRef = useRef(null);

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

  useEffect(() => {
    if (selectedImage) {
      const isGif = selectedImage.type === 'gif';
      const imgSrc = isGif ? selectedImage.url : selectedImage; // Fallback for old strings

      const img = new Image();
      img.src = imgSrc;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = Math.max(1, 100 * (img.height / img.width));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        
        const colorCounts = {};
        for (let i = 0; i < data.length; i += 4) {
          if (data[i+3] < 128) continue;
          const r = Math.round(data[i] / 32) * 32;
          const g = Math.round(data[i+1] / 32) * 32;
          const b = Math.round(data[i+2] / 32) * 32;
          const key = `${r},${g},${b}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;
        }

        // If it's a GIF, maybe add colors from other frames? 
        // For now, first frame is enough for palette extraction to keep it fast.
        
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8) // Top 8 dominant colors
          .map(entry => {
            const [r, g, b] = entry[0].split(',').map(Number);
            return { r, g, b };
          });
          
        setSettings(prev => ({ 
          ...prev, 
          imagePalette: sortedColors, 
          paletteMappings: {}, // Reset mappings on new image
          gifFrameIndex: 0 // Reset frame
        }));
      };
    }
  }, [selectedImage]);

  return (
    <div className="app-container">
      <Workspace 
        ref={workspaceRef}
        metadata={metadata} 
        vibrantMetadata={vibrantMetadata}
        settings={settings} 
        selectedImage={selectedImage}
        onImageUpload={setSelectedImage}
      />
      <Sidebar 
        workspaceRef={workspaceRef}
        settings={settings} 
        onSettingsChange={setSettings} 
        metadata={metadata}
        vibrantMetadata={vibrantMetadata}
        onImageUpload={setSelectedImage}
        selectedImage={selectedImage}
      />
    </div>
  );
}

export default App;
