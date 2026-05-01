const fs = require('fs');
const path = 'tile-mosaic/src/components/Sidebar.jsx';

let text = fs.readFileSync(path, 'utf8');
text = text.replace(/\r\n/g, '\n');

function extract(startStr, endStr) {
    let start = text.indexOf(startStr);
    if (start === -1) return '';
    if (endStr === null) return text.substring(start);
    let end = text.indexOf(endStr, start);
    if (end === -1) return text.substring(start);
    return text.substring(start, end);
}

const header_start = '      <div className="sidebar-header">';
const header_end = '      <div className="sidebar-section">\n        <h3>Input Mode</h3>';

const input_mode_start = '      <div className="sidebar-section">\n        <h3>Input Mode</h3>';
const input_mode_end = "      {settings.mode === 'text' && (";

const font_settings_start = "      {settings.mode === 'text' && (";
const font_settings_end = "      {/* GLOBAL CONTROLS MOVED OUT OF FONT SETTINGS */}";

const global_controls_start = "      {/* GLOBAL CONTROLS MOVED OUT OF FONT SETTINGS */}";
const global_controls_end = '      <div className="sidebar-section" style={{ marginTop: \'16px\', background: \'var(--bg-darker)\', padding: \'12px\', borderRadius: \'8px\' }}>\n        <label style={{ display: \'block\', marginBottom: \'8px\', fontWeight: \'bold\' }}>GIF Export (Wave Effect)</label>';

const gif_wave_start = '      <div className="sidebar-section" style={{ marginTop: \'16px\', background: \'var(--bg-darker)\', padding: \'12px\', borderRadius: \'8px\' }}>\n        <label style={{ display: \'block\', marginBottom: \'8px\', fontWeight: \'bold\' }}>GIF Export (Wave Effect)</label>';
const gif_wave_end = "      { ((settings.mode === 'text' && settings.textGradientType === 'directional') || settings.quadtreeDirectional) && (";

const spatial_dir_start = "      { ((settings.mode === 'text' && settings.textGradientType === 'directional') || settings.quadtreeDirectional) && (";
const spatial_dir_end = "      {settings.mode === 'image' && (";

const image_input_start = '      {settings.mode === \'image\' && (\n        <div className="sidebar-section">\n          <h3>Image Input</h3>';
const image_input_end = '      <div className="sidebar-section">\n        <h3>Mapping Settings</h3>';

const mapping_start = '      <div className="sidebar-section">\n        <h3>Mapping Settings</h3>';
const mapping_end = '      <div className="sidebar-section">\n        <h3>Background Settings</h3>';

let mapping_full = extract(mapping_start, mapping_end);
const mapping_res_split = '        <div className="sidebar-section" style={{ marginTop: \'16px\', background: \'var(--bg-darker)\', padding: \'12px\', borderRadius: \'8px\' }}>\n          <label style={{ display: \'block\', marginBottom: \'8px\', fontWeight: \'bold\' }}>GIF Export (Resolution/Zoom)</label>';

let mapping_settings = mapping_full.substring(0, mapping_full.indexOf(mapping_res_split));
mapping_settings += "      </div>\n";

let gif_res = mapping_full.substring(mapping_full.indexOf(mapping_res_split));
gif_res = gif_res.trimEnd();
if (gif_res.endsWith('</div>')) {
    gif_res = gif_res.substring(0, gif_res.length - 6);
}

const bg_start = '      <div className="sidebar-section">\n        <h3>Background Settings</h3>';
const bg_end = '      <div className="sidebar-section palette-display-container">';

const grad_spec_start = '      <div className="sidebar-section palette-display-container">';
const grad_spec_end = "      {vibrantMetadata && vibrantMetadata.length > 0 && (";

const vib_override_start = "      {vibrantMetadata && vibrantMetadata.length > 0 && (";
const vib_override_end = "      {settings.mode === 'image' && settings.imagePalette && settings.imagePalette.length > 0 && (";

const img_pal_start = "      {settings.mode === 'image' && settings.imagePalette && settings.imagePalette.length > 0 && (";
const img_pal_end = "    </div>\n  );\n}";

let header = extract(header_start, header_end);
let input_mode = extract(input_mode_start, input_mode_end);
let font_settings = extract(font_settings_start, font_settings_end);
let global_controls = extract(global_controls_start, global_controls_end);
let gif_wave = extract(gif_wave_start, gif_wave_end);
let spatial_dir = extract(spatial_dir_start, spatial_dir_end);
let image_input = extract(image_input_start, image_input_end);
let bg_settings = extract(bg_start, bg_end);
let grad_spec = extract(grad_spec_start, grad_spec_end);
let vib_override = extract(vib_override_start, vib_override_end);
let img_pal = extract(img_pal_start, img_pal_end);

let new_return = `  return (
    <div className="sidebar">
${header}
      <Accordion section="source" title="1. Source & Typography" active={activeAccordion} toggle={toggleAccordion}>
${input_mode}
${font_settings}
${image_input}
      </Accordion>

      <Accordion section="topology" title="2. Topology & Layout" active={activeAccordion} toggle={toggleAccordion}>
${mapping_settings}
${bg_settings}
      </Accordion>

      <Accordion section="color" title="3. Color & Palette Engine" active={activeAccordion} toggle={toggleAccordion}>
${global_controls}
${spatial_dir}
${grad_spec}
${vib_override}
${img_pal}
      </Accordion>

      <Accordion section="export" title="4. Animation & Export" active={activeAccordion} toggle={toggleAccordion}>
${gif_wave}
${gif_res}
      </Accordion>
    </div>
  );
}`;

let return_start_idx = text.indexOf('  return (\n    <div className="sidebar">');
if (return_start_idx === -1) {
  console.log("Error: could not find return statement");
  process.exit(1);
}
let before_return = text.substring(0, return_start_idx);

// Add accordion state
const state_code = `  const [exportProgress, setExportProgress] = useState(null);
  const [activeAccordion, setActiveAccordion] = useState('source');

  const toggleAccordion = (section) => {
    setActiveAccordion(prev => prev === section ? null : section);
  };`;
before_return = before_return.replace("  const [exportProgress, setExportProgress] = useState(null);", state_code);

// Add Accordion component
const accordion_code = `import React, { useRef, useState, useEffect } from 'react';
import { Image as ImageIcon, Type, LayoutGrid, Layers, Upload, Download } from 'lucide-react';
import './Sidebar.css';

const Accordion = ({ section, title, active, toggle, children }) => (
  <div className="accordion-section">
    <div className={\`accordion-header \${active === section ? 'active' : ''}\`} onClick={() => toggle(section)}>
      <h3>{title}</h3>
      <span className="accordion-icon">{active === section ? '▼' : '▶'}</span>
    </div>
    {active === section && (
      <div className="accordion-content">
        {children}
      </div>
    )}
  </div>
);
`;
before_return = before_return.replace("import React, { useRef, useState, useEffect } from 'react';\nimport { Image as ImageIcon, Type, LayoutGrid, Layers, Upload, Download } from 'lucide-react';\nimport './Sidebar.css';", accordion_code);

fs.writeFileSync(path, before_return + new_return, 'utf8');
console.log("Done restructuring!");
