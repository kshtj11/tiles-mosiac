import os

path = r"tile-mosaic/src/components/Sidebar.jsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

def extract(start_str, end_str):
    start = text.find(start_str)
    if start == -1: return ""
    
    if end_str is None:
        end = len(text)
    else:
        end = text.find(end_str, start)
        if end == -1: return text[start:]
    
    return text[start:end]

# Define markers
header_start = '      <div className="sidebar-header">'
header_end = '      <div className="sidebar-section">\n        <h3>Input Mode</h3>'

input_mode_start = '      <div className="sidebar-section">\n        <h3>Input Mode</h3>'
input_mode_end = '      {settings.mode === \'text\' && ('

font_settings_start = '      {settings.mode === \'text\' && ('
font_settings_end = '      {/* GLOBAL CONTROLS MOVED OUT OF FONT SETTINGS */}'

global_controls_start = '      {/* GLOBAL CONTROLS MOVED OUT OF FONT SETTINGS */}'
global_controls_end = '      <div className="sidebar-section" style={{ marginTop: \'16px\', background: \'var(--bg-darker)\', padding: \'12px\', borderRadius: \'8px\' }}>\n        <label style={{ display: \'block\', marginBottom: \'8px\', fontWeight: \'bold\' }}>GIF Export (Wave Effect)</label>'

gif_wave_start = '      <div className="sidebar-section" style={{ marginTop: \'16px\', background: \'var(--bg-darker)\', padding: \'12px\', borderRadius: \'8px\' }}>\n        <label style={{ display: \'block\', marginBottom: \'8px\', fontWeight: \'bold\' }}>GIF Export (Wave Effect)</label>'
gif_wave_end = '      { ((settings.mode === \'text\' && settings.textGradientType === \'directional\') || settings.quadtreeDirectional) && ('

spatial_dir_start = '      { ((settings.mode === \'text\' && settings.textGradientType === \'directional\') || settings.quadtreeDirectional) && ('
spatial_dir_end = '      {settings.mode === \'image\' && ('

image_input_start = '      {settings.mode === \'image\' && (\n        <div className="sidebar-section">\n          <h3>Image Input</h3>'
image_input_end = '      <div className="sidebar-section">\n        <h3>Mapping Settings</h3>'

mapping_start = '      <div className="sidebar-section">\n        <h3>Mapping Settings</h3>'
mapping_end = '        <div className="sidebar-section" style={{ marginTop: \'16px\', background: \'var(--bg-darker)\', padding: \'12px\', borderRadius: \'8px\' }}>\n          <label style={{ display: \'block\', marginBottom: \'8px\', fontWeight: \'bold\' }}>GIF Export (Resolution/Zoom)</label>'

gif_res_start = '        <div className="sidebar-section" style={{ marginTop: \'16px\', background: \'var(--bg-darker)\', padding: \'12px\', borderRadius: \'8px\' }}>\n          <label style={{ display: \'block\', marginBottom: \'8px\', fontWeight: \'bold\' }}>GIF Export (Resolution/Zoom)</label>'
gif_res_end = '      <div className="sidebar-section">\n        <h3>Background Settings</h3>'

# Notice that gif_res is actually INSIDE the Mapping Settings div. Let's fix that.
# The Mapping Settings div ends right before Background Settings.
mapping_full = extract('      <div className="sidebar-section">\n        <h3>Mapping Settings</h3>', '      <div className="sidebar-section">\n        <h3>Background Settings</h3>')

# Let's manually split mapping_full
mapping_res_split = '        <div className="sidebar-section" style={{ marginTop: \'16px\', background: \'var(--bg-darker)\', padding: \'12px\', borderRadius: \'8px\' }}>\n          <label style={{ display: \'block\', marginBottom: \'8px\', fontWeight: \'bold\' }}>GIF Export (Resolution/Zoom)</label>'

mapping_settings = mapping_full[:mapping_full.find(mapping_res_split)]
# Add the closing div for mapping_settings since we split it
mapping_settings += "      </div>\n"

gif_res = mapping_full[mapping_full.find(mapping_res_split):]
# gif_res already contains the closing div for the original mapping settings. Wait, we need to make sure brackets match.
# The original structure:
# <div className="sidebar-section">
#   <h3>Mapping Settings</h3>
#   ...
#   <div className="sidebar-section"> ... </div> (this is gif res)
# </div>
# So if we split before gif res, mapping_settings needs a `</div>`.
# And gif_res has an extra `</div>` at the end which closes mapping_settings.
gif_res = gif_res.rstrip()
if gif_res.endswith('</div>'):
    gif_res = gif_res[:-6] # remove the extra closing div

bg_start = '      <div className="sidebar-section">\n        <h3>Background Settings</h3>'
bg_end = '      <div className="sidebar-section palette-display-container">'

grad_spec_start = '      <div className="sidebar-section palette-display-container">'
grad_spec_end = '      {vibrantMetadata && vibrantMetadata.length > 0 && ('

vib_override_start = '      {vibrantMetadata && vibrantMetadata.length > 0 && ('
vib_override_end = '      {settings.mode === \'image\' && settings.imagePalette && settings.imagePalette.length > 0 && ('

img_pal_start = '      {settings.mode === \'image\' && settings.imagePalette && settings.imagePalette.length > 0 && ('
img_pal_end = '    </div>\n  );\n}'

header = extract(header_start, header_end)
input_mode = extract(input_mode_start, input_mode_end)
font_settings = extract(font_settings_start, font_settings_end)
global_controls = extract(global_controls_start, global_controls_end)
gif_wave = extract(gif_wave_start, gif_wave_end)
spatial_dir = extract(spatial_dir_start, spatial_dir_end)
image_input = extract(image_input_start, image_input_end)
bg_settings = extract(bg_start, bg_end)
grad_spec = extract(grad_spec_start, grad_spec_end)
vib_override = extract(vib_override_start, vib_override_end)
img_pal = extract(img_pal_start, img_pal_end)

new_return = f"""  return (
    <div className="sidebar">
{header}
      <Accordion section="source" title="1. Source & Typography" active={{activeAccordion}} toggle={{toggleAccordion}}>
{input_mode}
{font_settings}
{image_input}
      </Accordion>

      <Accordion section="topology" title="2. Topology & Layout" active={{activeAccordion}} toggle={{toggleAccordion}}>
{mapping_settings}
{bg_settings}
      </Accordion>

      <Accordion section="color" title="3. Color & Palette Engine" active={{activeAccordion}} toggle={{toggleAccordion}}>
{global_controls}
{spatial_dir}
{grad_spec}
{vib_override}
{img_pal}
      </Accordion>

      <Accordion section="export" title="4. Animation & Export" active={{activeAccordion}} toggle={{toggleAccordion}}>
{gif_wave}
{gif_res}
      </Accordion>
    </div>
  );
}}
"""

return_start_idx = text.find('  return (\n    <div className="sidebar">')
before_return = text[:return_start_idx]

# Write out the new file
with open("tile-mosaic/src/components/Sidebar.jsx", "w", encoding="utf-8") as f:
    f.write(before_return + new_return)

print("Done restructuring!")
