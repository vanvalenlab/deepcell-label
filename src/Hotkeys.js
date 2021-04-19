import React from 'react';
import { useCanvasHotkeys, useUndoHotkeys, useImageHotkeys, useToolHotkeys } from './use-hotkeys';

const Hotkeys = () => {
  useCanvasHotkeys();
  useUndoHotkeys();
  useImageHotkeys();
  useToolHotkeys();

  return null;
}

export default Hotkeys;