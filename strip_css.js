const fs = require('fs');
const path = 'tile-mosaic/src/components/Sidebar.css';

let text = fs.readFileSync(path, 'utf8');

const accIndex = text.indexOf('/* Accordion Styles */');
if (accIndex !== -1) {
    text = text.substring(0, accIndex).trim();
    fs.writeFileSync(path, text + '\n', 'utf8');
}
