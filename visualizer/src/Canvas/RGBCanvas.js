import React, { useEffect, useRef } from 'react';
import { useSelector } from '@xstate/react';
import { useRaw, useComposeLayers } from '../ServiceContext';
import ChannelCanvas from './ChannelCanvas';

export const RGBCanvas = ({ sx, sy, sw, sh, zoom, width, height, className }) => {
  const raw = useRaw();
  const invert = useSelector(raw, state => state.context.invert);
  const layers = useSelector(raw, state => state.context.layers);

  const canvasRef = useRef();
  const ctx = useRef();
  const [composeCanvasRef, canvases, setCanvases] = useComposeLayers();

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
  }, [height, width]);

  useEffect(() => {
    const composeCanvas = composeCanvasRef.current;
    ctx.current.clearRect(0, 0, width, height);
    ctx.current.drawImage(
      composeCanvas,
      sx, sy,
      sw / zoom, sh / zoom,
      0, 0,
      width, height,
    );
  }, [composeCanvasRef, canvases, invert, sx, sy, zoom, sw, sh, width, height]);

  return <>
    {/* hidden processing canvas */}
    <canvas id='raw-processing'
      hidden={true}
      ref={composeCanvasRef}
      width={sw}
      height={sh}
    />
    {/* visible output canvas */}
    <canvas id='raw-canvas'
      className={className}
      ref={canvasRef}
      width={width}
      height={height}
    />
    {layers
      .map(layer => <ChannelCanvas
        layer={layer}
        setCanvases={setCanvases}
      />)
    }
  </>;
};

export default RGBCanvas;
