import React from 'react';
import {
  useCanvasHotkeys,
  useUndoHotkeys,
  useImageHotkeys,
  useToolHotkeys,
  useSelectHotkeys
} from './use-hotkeys';
import { useFeature } from './ServiceContext';

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

const ToolHotkeys = () => {
  useToolHotkeys();
  return null;
}
const Hotkeys = () => {
  const feature = useFeature();

  return <>
    <CanvasHotkeys />
    {/* <UndoHotkeys /> */}
    <ImageHotkeys />
    {/* <ToolHotkeys /> */}
    {/*  // uses feature to check which labels can be selected */}
    { feature && <SelectHotkeys /> } 
  </>;
}

export default Hotkeys;