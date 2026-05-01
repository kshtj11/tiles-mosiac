const fs = require('fs');
const path = 'tile-mosaic/src/components/Sidebar.jsx';
let text = fs.readFileSync(path, 'utf8');

text = text.replace(
  /: 'Finds the closest exact color match for every tile. Adjust the global Gradient Curve to non-linearly shift the brightness values.'}\r?\n\r?\n          <div className="input-group"/g,
  ": 'Finds the closest exact color match for every tile. Adjust the global Gradient Curve to non-linearly shift the brightness values.'}\n          </p>\n\n          <div className=\"input-group\""
);

fs.writeFileSync(path, text, 'utf8');
