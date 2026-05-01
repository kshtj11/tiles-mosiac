const fs = require('fs');
const path = 'tile-mosaic/src/components/Sidebar.jsx';

let text = fs.readFileSync(path, 'utf8');

// 1. Remove Accordion component
const accStart = text.indexOf('const Accordion =');
if (accStart !== -1) {
    const accEnd = text.indexOf(');\n', accStart);
    if (accEnd !== -1) {
        text = text.substring(0, accStart) + text.substring(accEnd + 3);
    }
}

// 2. Remove state
const stateStart = text.indexOf('  const [activeAccordions');
if (stateStart !== -1) {
    const stateEnd = text.indexOf('  };\n', stateStart);
    if (stateEnd !== -1) {
        text = text.substring(0, stateStart) + text.substring(stateEnd + 5);
    }
}

// 3. Remove <Accordion ...> opening tags
text = text.replace(/<Accordion[^>]*>/g, '');

// 4. Remove </Accordion> closing tags
text = text.replace(/<\/Accordion>/g, '');

fs.writeFileSync(path, text, 'utf8');
console.log("Accordions stripped.");
