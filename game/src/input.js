// Keyboard + mouse input. One job: track held keys and mouse aim clicks.
export class Input {
  constructor() {
    this.keys = new Set();
    this.mouseDown = false;
    this.mouseX = 0; this.mouseY = 0;
    this.consumed = new Set();
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, .menu')) return;
      this.mouseDown = true; this.mouseX = e.clientX; this.mouseY = e.clientY;
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    window.addEventListener('mousemove', (e) => { this.mouseX = e.clientX; this.mouseY = e.clientY; });
  }
  down(code) { return this.keys.has(code); }
  axis(neg, pos) { return (this.keys.has(pos) ? 1 : 0) - (this.keys.has(neg) ? 1 : 0); }
  // True once per physical press.
  pressed(code) {
    if (this.keys.has(code) && !this.consumed.has(code)) { this.consumed.add(code); return true; }
    if (!this.keys.has(code)) this.consumed.delete(code);
    return false;
  }
}
