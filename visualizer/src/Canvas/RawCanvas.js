import React, { useEffect, useRef } from 'react';
import { useSelector } from '@xstate/react';
import { useImage, useComposeChannels } from '../ServiceContext';
import ChannelCanvas from './ChannelCanvas';

export const RawCanvas = ({ sx, sy, sw, sh, zoom, width, height, className }) => {
  const image = useImage();
  const channels = useSelector(image, state => state.context.channels);
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
    {Object.entries(channels).map(([index, channel]) => <ChannelCanvas
      key={index}
      channel={channel}
      setChannelCanvases={setChannelCanvases}/>)}
  </>;
};

export default React.memo(RawCanvas);
