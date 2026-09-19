const { app, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let pendingTimer = null;

function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function scheduleSave(win) {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => saveWindowState(win), 400);
}

function saveWindowState(win) {
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  if (!win || win.isDestroyed()) return;
  const b = win.getBounds();
  const state = { x: b.x, y: b.y, width: b.width, height: b.height, isMaximized: win.isMaximized() };
  try {
    fs.writeFileSync(stateFile(), JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Non-fatal: window state is a convenience, not critical data.
  }
}

function loadWindowState() {
  try {
    const raw = fs.readFileSync(stateFile(), 'utf8');
    const state = JSON.parse(raw);
    if (
      state &&
      Number.isFinite(state.x) && Number.isFinite(state.y) &&
      Number.isFinite(state.width) && Number.isFinite(state.height) &&
      state.width >= 200 && state.height >= 200
    ) {
      return state;
    }
  } catch {
    // First launch — no saved state.
  }
  return null;
}

// Reject saved bounds that ended up off-screen (unplugged monitor, etc.).
function isOnScreen(bounds) {
  const displays = screen.getAllDisplays();
  return displays.some((display) => {
    const a = display.workArea;
    return (
      bounds.x + bounds.width > a.x + 40 &&
      bounds.y + bounds.height > a.y + 40 &&
      bounds.x < a.x + a.width - 40 &&
      bounds.y < a.y + a.height - 40
    );
  });
}

module.exports = { loadWindowState, saveWindowState, scheduleSave, isOnScreen };
