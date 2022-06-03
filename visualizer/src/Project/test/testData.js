export const EMPTY = {
  raw: [[[new Uint8Array([0])]]],
  labeled: [[[new Int32Array([0])]]],
  labels: { 0: {} },
};

export const ONE_CHANNEL = {
  raw: [[[new Uint8Array([1])]]],
  labeled: [[[new Int32Array([0])]]],
  labels: { 0: {} },
};

export const TWO_CHANNELS = {
  raw: [[[new Uint8Array([1])]], [[[new Uint8Array([1])]]]],
  labeled: [[[new Int32Array([0])]]],
  labels: { 0: {} },
};

export const TWO_FRAMES = {
  raw: [[[new Uint8Array([1])], [new Uint8Array([1])]]],
  labeled: [[[new Int32Array([0])], [new Int32Array([0])]]],
  labels: { 0: {} },
};

export const ONE_LABEL = {
  raw: [[[new Uint8Array([0])]]],
  labeled: [[[new Int32Array([1])]]],
  labels: {
    0: {
      segments: [{ id: 0, value: 1, t: 0, c: 0, bbox: { x: 0, y: 0, height: 1, width: 1 } }],
    },
  },
};

export const TWO_LABELS = {
  raw: [[[new Uint8Array([0, 0]), new Uint8Array([0, 0])]]],
  labeled: [[[new Int32Array([1, 0]), new Int32Array([0, 2])]]],
  labels: {
    0: {
      segments: [
        { id: 0, value: 1, t: 0, c: 0, bbox: { x: 0, y: 0, height: 1, width: 1 } },
        { id: 1, value: 2, t: 0, c: 0, bbox: { x: 1, y: 1, height: 1, width: 1 } },
      ],
    },
  },
};

export const THREE_BY_THREE_LABEL = {
  raw: [[[new Uint8Array([0, 0, 0]), new Uint8Array([0, 0, 0]), new Uint8Array([0, 0, 0])]]],
  labeled: [[[new Int32Array([1, 1, 1]), new Int32Array([1, 1, 1]), new Int32Array([1, 1, 1])]]],
  labels: {
    0: {
      segments: [{ id: 0, value: 1, t: 0, c: 0, bbox: { x: 0, y: 0, height: 3, width: 3 } }],
    },
  },
};
