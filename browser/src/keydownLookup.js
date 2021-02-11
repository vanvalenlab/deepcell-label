/* eslint-disable quote-props */

const keydownLookup = {
  'a': 'keydown.a',
  'b': 'keydown.b',
  'c': 'keydown.c',
  'C': 'keydown.C',
  'd': 'keydown.d',
  'f': 'keydown.f',
  'F': 'keydown.F',
  'g': 'keydown.g',
  'h': 'keydown.h',
  'i': 'keydown.i',
  'k': 'keydown.k',
  'm': 'keydown.m',
  'n': 'keydown.n',
  'o': 'keydown.o',
  'O': 'keydown.O',
  'p': 'keydown.p',
  'q': 'keydown.q',
  'r': 'keydown.r',
  'R': 'keydown.R',
  's': 'keydown.s',
  't': 'keydown.t',
  'w': 'keydown.w',
  'x': 'keydown.x',
  'z': 'keydown.z',
  '-': 'keydown.-',
  '=': 'keydown.=',
  ']': 'keydown.]',
  '[': 'keydown.[',
  '}': 'keydown.}',
  '{': 'keydown.{',
  '0': 'keydown.0',
  ' ': 'keydown.space',
  'Enter': 'keydown.Enter',
  'Escape': 'keydown.Escape',
  'ArrowLeft': 'keydown.left',
  'ArrowRight': 'keydown.right',
  'ArrowUp': 'keydown.up',
  'ArrowDown': 'keydown.down',

      this.service.send({ type: 'ZOOM', change: 1 });
    } else if (evt.key === '=') {
      this.service.send({ type: 'ZOOM', change: -1 });
    } if (evt.key === 'ArrowDown') {
      this.service.send({ type: 'SETSIZE', size: this.model.brush.size - 1 });
    } else if (evt.key === 'ArrowUp') {
      this.service.send({ type: 'SETSIZE', size: this.model.brush.size + 1 });
};

export default keydownLookup;
