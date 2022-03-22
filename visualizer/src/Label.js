import Box from '@mui/material/Box';
import { ResizeSensor } from 'css-element-queries';
import debounce from 'lodash.debounce';
import { useEffect, useRef, useState } from 'react';
import DisplayControls from './Label/DisplayControls';
import Instructions from './Label/Instructions';
import LabelControls from './Label/LabelControls';
import LabelTabs from './Label/LabelControls/LabelTabs';
import QualityControlControls from './Label/QualityControlControls/QualityControlControls';
import SpaceFillingCanvas from './Label/SpaceFillingCanvas';
import { useCanvas } from './ProjectContext';

function Label({ review }) {
  const search = new URLSearchParams(window.location.search);
  const track = search.get('track');

  const canvasBoxRef = useRef({ offsetWidth: 0, offsetHeight: 0 });
  const [canvasBoxWidth, setCanvasBoxWidth] = useState(0);
  const [canvasBoxHeight, setCanvasBoxHeight] = useState(0);

  const canvas = useCanvas();

  useEffect(() => {
    const setCanvasBoxDimensions = () => {
      setCanvasBoxWidth(canvasBoxRef.current.offsetWidth);
      setCanvasBoxHeight(canvasBoxRef.current.offsetHeight);
    };
    setCanvasBoxDimensions();

    new ResizeSensor(canvasBoxRef.current, debounce(setCanvasBoxDimensions, 20));
  }, [canvasBoxRef]);

  useEffect(() => {
    const padding = 5;
    canvas.send({
      type: 'AVAILABLE_SPACE',
      width: canvasBoxWidth,
      height: canvasBoxHeight,
      padding,
    });
  }, [canvas, canvasBoxWidth, canvasBoxHeight]);

  return (
    <>
      <Instructions />
      <Box
        sx={{
          boxSizing: 'border-box',
          display: 'flex',
          flexGrow: 1,
          p: 1,
          alignItems: 'stretch',
          justifyContent: 'space-evenly',
          minHeight: 'calc(100vh - 73px - 56px - 76px - 2px)',
        }}
      >
        <Box
          sx={{
            flex: '0 0 auto',
            p: 1,
          }}
        >
          {track && <LabelTabs />}
          {review && <QualityControlControls />}
          <DisplayControls />
        </Box>
        <LabelControls />
        <SpaceFillingCanvas />
      </Box>
    </>
  );
}

export default Label;
