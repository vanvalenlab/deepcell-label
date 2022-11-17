import Box from '@mui/material/Box';
import { ResizeSensor } from 'css-element-queries';
import debounce from 'lodash.debounce';
import { useEffect, useRef, useState } from 'react';
import { useCanvas } from '../ProjectContext';
import Canvas from './Canvas';

function SpaceFillingCanvas() {
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
    const padding = 23;
    canvas.send({
      type: 'AVAILABLE_SPACE',
      width: canvasBoxWidth,
      height: canvasBoxHeight,
      padding,
    });
  }, [canvas, canvasBoxWidth, canvasBoxHeight]);

  return (
    <Box
      ref={canvasBoxRef}
      sx={{ position: 'relative', flex: '1 1 auto', maxHeight: '100vh', maxWidth: '100vw' }}
    >
      <Canvas />
    </Box>
  );
}

export default SpaceFillingCanvas;
