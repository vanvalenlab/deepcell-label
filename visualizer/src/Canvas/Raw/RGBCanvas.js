import { useSelector } from '@xstate/react';
import React, { useEffect, useRef, useState } from 'react';
import { useCanvas, useLayers } from '../../ProjectContext';
import ChannelCanvas from './ChannelCanvas';

export const RGBCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const sw = useSelector(canvas, (state) => state.context.width);
  const sh = useSelector(canvas, (state) => state.context.height);

  const layers = useLayers();

  // keys: layer index, values: ref to canvas for each layer
  const [layerCanvases, setLayerCanvases] = useState({});

  const composeCanvasRef = useRef();
  const composeCtxRef = useRef();

  useEffect(() => {
    composeCtxRef.current = composeCanvasRef.current.getContext('2d');
    composeCtxRef.current.globalCompositeOperation = 'lighter';
  }, [sh, sw]);

  useEffect(() => {
    composeCtxRef.current.clearRect(0, 0, sw, sh);
    for (let key in layerCanvases) {
      composeCtxRef.current.drawImage(layerCanvases[key], 0, 0);
    }
    setCanvases((canvases) => ({ ...canvases, raw: composeCanvasRef.current }));
  }, [layerCanvases, sh, sw, setCanvases]);

  useEffect(
    () => () => {
      setCanvases((canvases) => {
        delete canvases['raw'];
        return { ...canvases };
      });
    },
    [setCanvases]
  );

  return (
    <>
      <canvas id='compose-layers' hidden={true} ref={composeCanvasRef} width={sw} height={sh} />
      {layers.map((layer) => (
        <ChannelCanvas layer={layer} setCanvases={setLayerCanvases} key={layer.sessionId} />
      ))}
    </>
  );
};

export default RGBCanvas;
