import React, { useEffect, useRef } from 'react';
import { useSelector } from '@xstate/react';
import { useRaw, useComposeChannels } from '../ServiceContext';
import ChannelCanvas from './ChannelCanvas';

export const RawCanvas = ({ sx, sy, sw, sh, zoom, width, height, className }) => {
  const raw = useRaw();
  const layers = useSelector(raw, state => state.context.layers);
  const channels = useSelector(raw, state => state.context.channels);
  const layerColors = useSelector(raw, state => state.context.layerColors);
  const activeLayers = useSelector(raw, state => state.context.activeLayers);

  console.log(layerColors);

  const canvasRef = useRef();
  const ctx = useRef();
  const [composeCanvasRef, channelCanvases, setChannelCanvases] = useComposeChannels();

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
  }, [composeCanvasRef, channelCanvases, sx, sy, zoom, sw, sh, width, height]);

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
      .map((layer, index) => <ChannelCanvas
        key={index}
        channel={channels[layer]}
        color={layerColors[index]}
        setChannelCanvases={setChannelCanvases} />)
      .filter((layer, index) =>
        activeLayers[index]
      )}
  </>;
};

export default React.memo(RawCanvas);
