// Keyboard + mouse input. Keys are tracked as a held set so the game can
// read "sneak held" and "move direction" every frame; mouse clicks are
// queued as throw-coin requests with their canvas coordinates.

export function makeInput(canvas) {
  const input = {
    keys: new Set(),
    mouse: { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 },
    pressed: new Set(), // keys pressed since the last frame was consumed
  };

  const KEYMAP = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ShiftLeft: 'sneak',
    ShiftRight: 'sneak',
    Enter: 'confirm',
    Space: 'confirm',
    KeyP: 'pause',
    Escape: 'pause',
    KeyR: 'restart',
    KeyM: 'mute',
  };

  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (!action) return;
    e.preventDefault();
    if (!input.keys.has(action)) input.pressed.add(action);
    input.keys.add(action);
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) input.keys.delete(action);
  });
  // Losing the window must not leave a key stuck down (a classic pitfall).
  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  function canvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }
  canvas.addEventListener('mousemove', (e) => {
    const p = canvasPos(e);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = canvasPos(e);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.mouse.clicked = true;
    input.mouse.clickX = p.x;
    input.mouse.clickY = p.y;
  });

  return input;
}

// Read the current move direction as a unit vector (or {0,0} when idle).
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('left')) x -= 1;
  if (input.keys.has('right')) x += 1;
  if (input.keys.has('up')) y -= 1;
  if (input.keys.has('down')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.hypot(x, y);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

// True once for a key pressed since the last call; consumes it.
export function wasPressed(input, action) {
  if (input.pressed.has(action)) {
    input.pressed.delete(action);
    return true;
  }
  return false;
}

// True once for a mouse click since the last call; consumes it.
export function wasClicked(input) {
  if (input.mouse.clicked) {
    input.mouse.clicked = false;
    return { x: input.mouse.clickX, y: input.mouse.clickY };
  }
  return null;
}

// Drop one-frame presses at the end of each frame so a press never fires twice.
export function endFrame(input) {
  input.pressed.clear();
}
