import React, { useEffect, useRef } from 'react';
import { useSelector } from '@xstate/react';
import { useCanvas } from '../ServiceContext';

const adjustRangeImageData = (data, min, max) => {
  const diff = (max - min);
  const scale = diff === 0 ? 255 : 255 / diff;

  for (let i = 0; i < data.length; i += 4) {  //pixel values in 4-byte blocks (r,g,b,a)
    data[i] = (data[i] - min) * scale;     //r value
    data[i+1] = (data[i+1] - min) * scale; //g value
    data[i+2] = (data[i+2] - min) * scale; //b value
  }
  return data;
}

const recolorImageData = (data, color) => {
  const [red, green, blue] = color;
  for (let i = 0; i < data.length; i += 4) {
    data[i] *= red / 255;
    data[i + 1] *= green / 255;
    data[i + 2] *= blue / 255;
  }
  return data;
}

export const ChannelCanvas = ({ channel, setChannelCanvases }) => {

  const canvas = useCanvas();
  const width = useSelector(canvas, state => state.context.width);
  const height = useSelector(canvas, state => state.context.height);

  const canvasRef = useRef();

  const channelIndex = useSelector(channel, state => state.context.channel);
  const rawImage = useSelector(channel, state => state.context.rawImage);
  const color = useSelector(channel, state => state.context.color);
  const [min, max] = useSelector(channel, state => state.context.range);

  useEffect(() => {
    const channelCanvas = canvasRef.current;
    const ctx = channelCanvas.getContext('2d');
    ctx.drawImage(rawImage, 0, 0);
    console.log(rawImage);
    let data = ctx.getImageData(0, 0, width, height).data;

    data = adjustRangeImageData(data, min, max);

    switch (channelIndex) {
      case 0:
        data = recolorImageData(data, [255, 0, 0]);
        break;
      case 1:
        data = recolorImageData(data, [0, 255, 0]);
        break;
      case 2:
        data = recolorImageData(data, [0, 0, 255]);
        break;
      case 3:
        data = recolorImageData(data, [0, 255, 255]);
        break;
      case 4:
        data = recolorImageData(data, [255, 0, 255]);
        break;
      case 5:
        data = recolorImageData(data, [255, 255, 0]);
        break;
      default:
        break;
    }
    const adjustedData = new ImageData(data, width, height);
    ctx.putImageData(adjustedData, 0, 0);
    setChannelCanvases(prevChannels => ({ ...prevChannels, [channelIndex]: channelCanvas }));
  }, [canvasRef, setChannelCanvases, channelIndex, rawImage, color, min, max, width, height]);
  
  return <canvas id={`channel${channelIndex}-processing`}
    hidden={true}
    ref={canvasRef}
    width={width}
    height={height}
  />;
};

export default ChannelCanvas;
