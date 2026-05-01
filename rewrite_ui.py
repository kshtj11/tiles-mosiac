import os

jsx_path = r"tile-mosaic/src/components/Sidebar.jsx"
css_path = r"tile-mosaic/src/components/Sidebar.css"

with open(jsx_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Inject Accordion component and state
accordion_code = """import React, { useRef, useState, useEffect } from 'react';
import { Image as ImageIcon, Type, LayoutGrid, Layers, Upload, Download } from 'lucide-react';
import './Sidebar.css';

const Accordion = ({ section, title, active, toggle, children }) => (
  <div className="accordion-section">
    <div className={`accordion-header ${active === section ? 'active' : ''}`} onClick={() => toggle(section)}>
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
"""

state_code = """  const [exportProgress, setExportProgress] = useState(null);
  const [activeAccordion, setActiveAccordion] = useState('source'); // 'source', 'topology', 'color', 'export'

  const toggleAccordion = (section) => {
    setActiveAccordion(prev => prev === section ? null : section);
  };"""

content = content.replace("import React, { useRef, useState, useEffect } from 'react';\nimport { Image as ImageIcon, Type, LayoutGrid, Layers, Upload, Download } from 'lucide-react';\nimport './Sidebar.css';", accordion_code)
content = content.replace("  const [exportProgress, setExportProgress] = useState(null);", state_code)

# 2. Extract specific sections by using simple string splits or regex.
# Actually, it's safer to extract blocks using string indexing.

def extract_block(text, start_marker, end_marker=None):
    start_idx = text.find(start_marker)
    if start_idx == -1: return "", text
    if end_marker:
        end_idx = text.find(end_marker, start_idx + len(start_marker))
        if end_idx == -1: return "", text
        end_idx += len(end_marker)
        block = text[start_idx:end_idx]
        new_text = text[:start_idx] + text[end_idx:]
        return block, new_text
    else:
        # Assuming we just want to replace something
        pass

# Since extracting perfectly balanced brackets is hard in python without a parser,
# we will just replace the `return (` block. We know exactly where `return (` is.

return_start = content.find("  return (\n    <div className=\"sidebar\">")
if return_start != -1:
    before_return = content[:return_start]
    
    # We will just write a new return block completely!
    # To save tokens, I will write out the exact new return block in a second tool call to append it to the script.
    
    script2 = '''
new_return = """  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Glaze Mosaic</h2>
        <p>Visual mapping to tile art.</p>
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button className="upload-btn" onClick={handleSaveProject} style={{ flex: 1, padding: '6px', fontSize: '11px', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>
            <Download size={14} /> Save Project
          </button>
          <button className="upload-btn" onClick={() => projectInputRef.current?.click()} style={{ flex: 1, padding: '6px', fontSize: '11px', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>
            <Upload size={14} /> Load Project
          </button>
          <input 
            type="file" 
            ref={projectInputRef} 
            style={{ display: 'none' }} 
            accept=".json" 
            onChange={handleLoadProject} 
          />
        </div>
      </div>
"""
'''
    with open("rewrite_sidebar.py", "w", encoding="utf-8") as out:
        out.write(content) # Wait, this is wrong.
    
    pass

