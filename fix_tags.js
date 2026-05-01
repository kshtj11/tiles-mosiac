const fs = require('fs');
const path = 'tile-mosaic/src/components/Sidebar.jsx';
let text = fs.readFileSync(path, 'utf8');

text = text.replace(
\`              </div>
            </div>
          )}
        
          </p>
        </div>
      )}\`,
\`        </div>
      )}\`
);

// Fallback if whitespace differs
text = text.replace(
\`             </div>
          )}
              </div>
            </div>
          )}
        
          </p>
        </div>
      )}\`,
\`             </div>
          )}
        </div>
      )}\`
);

fs.writeFileSync(path, text, 'utf8');
