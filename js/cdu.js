// CDU window entry (cdu.html): thin client around the shared MCDU unit.
// Renders snapshots from the main window and sends key presses back.
import { buildCduUnit } from './cdu_ui.js';
import { openChannel } from './sync.js';

let lastStateAt = 0;
let unit = null;

const channel = openChannel(msg => {
  if (msg.type === 'state') {
    lastStateAt = Date.now();
    unit.draw(msg.state);
  }
});

unit = buildCduUnit(document.getElementById('cdu-root'),
  key => channel.send({ type: 'cduKey', key }));
channel.send({ type: 'hello' });

// no snapshot recently -> the main window is gone
setInterval(() => {
  unit.overlay.style.display = Date.now() - lastStateAt > 2000 ? 'flex' : 'none';
}, 500);
