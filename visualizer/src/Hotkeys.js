import React from 'react';
import {
  useCanvasHotkeys,
  useUndoHotkeys,
  useImageHotkeys,
  useRawHotkeys,
  useLabeledHotkeys,
  useToolHotkeys,
  useSelectHotkeys
} from './use-hotkeys';
import { useRaw, useLabeled } from './ServiceContext';

const SelectHotkeys = () => {
  useSelectHotkeys();
  return null;
};

const CanvasHotkeys = () => {
  useCanvasHotkeys();
  return null;
}

const UndoHotkeys = () => {
  useUndoHotkeys();
  return null;
}

const ImageHotkeys = () => {
  useImageHotkeys();
  return null;
}

const RawHotkeys = () => {
  useRawHotkeys();
  return null;
}

const LabeledHotkeys = () => {
  useLabeledHotkeys();
  return null;
}

const ToolHotkeys = () => {
  useToolHotkeys();
  return null;
}
const Hotkeys = () => {
  const raw = useRaw();
  const labeled = useLabeled();

  return <>
    <CanvasHotkeys />
    {/* <UndoHotkeys /> */}
    <ImageHotkeys />
    {raw && <RawHotkeys />}
    {labeled && <LabeledHotkeys />}
    {/* <ToolHotkeys /> */}
    {/*  // uses feature to check which labels can be selected */}
    { labeled && <SelectHotkeys /> } 
  </>;
}

export default Hotkeys;