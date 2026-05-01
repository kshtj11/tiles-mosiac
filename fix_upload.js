const fs = require('fs');
const path = 'tile-mosaic/src/components/Sidebar.jsx';
let text = fs.readFileSync(path, 'utf8');

const oldStr = \`  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onImageUpload(event.target.result);
        updateSetting('mode', 'image');
      };
      reader.readAsDataURL(file);
    }
  };\`;

const newStr = \`  const handleImageChange = async (e) => {
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

text = text.replace(oldStr, newStr);

fs.writeFileSync(path, text, 'utf8');
