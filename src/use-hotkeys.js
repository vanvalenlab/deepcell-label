import { useEffect } from 'react';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import { useImage, useCanvas, useUndo, useTool, useFeature } from './ServiceContext';

export function useImageHotkeys() {
  const image = useImage();
  const { send } = image;

  useEffect(() => {
    bind('i', () => { send('TOGGLEINVERT'); });
    bind('h', () => { send('TOGGLEHIGHLIGHT'); });
    bind('0', () => {
      send('SETBRIGHTNESS', { brightness: 0 });
      send('SETCONTRAST', { contrast: 0 });
    });
    return () => {
      unbind('i');
      unbind('h');
      unbind('0');
    };
  }, []);

  const frame = useSelector(image, state => state.context.frame);
  const channel = useSelector(image, state => state.context.channel);
  const feature = useSelector(image, state => state.context.feature);
  const numFrames = useSelector(image, state => state.context.numFrames);
  const numChannels = useSelector(image, state => state.context.numChannels);
  const numFeatures = useSelector(image, state => state.context.numFeatures);

  useEffect(() => {
    const prevFrame = (frame - 1 + numFrames) % numFrames;
    const nextFrame = (frame + 1) % numFrames;
    bind('a', () => send('LOADFRAME', { frame: prevFrame }));
    bind('d', () => send('LOADFRAME', { frame: nextFrame }));
    return () => {
      unbind('a');
      unbind('d');
    }
  }, [frame, numFrames]);

  useEffect(() => {
    const prevChannel = (channel - 1 + numChannels) % numChannels;
    const nextChannel = (channel + 1) % numChannels;
    bind('shift+c', () => send('LOADCHANNEL', { channel: prevChannel }));
    bind('c', () => send('LOADCHANNEL', { channel: nextChannel }));
    return () => {
      unbind('shift+c');
      unbind('c');
    }
  }, [channel, numChannels]);

  useEffect(() => {
    const prevFeature = (feature - 1 + numFeatures) % numFeatures;
    const nextFeature = (feature + 1) % numFeatures;
    bind('shift+f', () => send('LOADFEATURE', { feature: prevFeature }));
    bind('f', () => send('LOADFEATURE', { feature: nextFeature }));
    return () => {
      unbind('shift+f');
      unbind('f');
    }
  }, [feature, numFeatures]);
}

export function useUndoHotkeys() {
  const undo = useUndo();
  const { send } = undo;
  useEffect(() => {
    bind('command+z', () => send('UNDO'));
    bind('command+shift+z', () => send('REDO'));
    return () => {
      unbind('command+z');
      unbind('command+shift+z');
    };
  }, []);
}

export function useCanvasHotkeys() {
  const canvas = useCanvas();
  const { send } = canvas;
  useEffect(() => {
    bind('space', (event) => {
      if (event.repeat) return;
      canvas.send('keydown.Space');
    });
    bind('space', () => send('keyup.Space'), 'keyup');
    bind('=', () => send('ZOOMIN'));
    bind('-', () => send('ZOOMOUT'));
    return () => {
      unbind('space');
      unbind('space', 'keyup');
      unbind('=');
      unbind('-');
    }
  }, [send]);
}

export function useToolHotkeys() {
  const tool = useTool();
  const { send } = tool;
  useEffect(() => {
    bind('up', (event) => send('keydown.up'));
    bind('down', (event) => send('keydown.down'));
    bind('b', (event) => send('keydown.b'));
    bind('v', (event) => send('keydown.v'));
    return () => {
      unbind('up');
      unbind('down');
      unbind('b');
      unbind('v');
    }
  }, [send]);
};

export function useSelectHotkeys() {
  const tool = useTool();
  const { send } = tool;
  const foreground = useSelector(tool, state => state.context.foreground);
  const background = useSelector(tool, state => state.context.background);
  
  const feature = useFeature();
  const labels = useSelector(feature, state => state.context.semanticInstanceLabels);
  const maxLabel = labels.length === 0 ? 0 : Math.max(...Object.keys(labels).map(Number));

  useEffect(() => {
    // bind('x', () => {
    //   send('SETFOREGROUND', { foreground: background });
    //   send('SETBACKGROUND', { background: foreground });
    // });
    // bind('n', () => send('SETFOREGROUND', { foreground: maxLabel + 1 }));
    // bind('esc', () => send('SETBACKGROUND', { background: 0 }));
    bind('esc', () => send('SETFOREGROUND', { background: 0 }));
    bind('[', () => send('SETFOREGROUND', { foreground: foreground <= 1 ? maxLabel : foreground - 1 }));
    bind(']', () => send('SETFOREGROUND', { foreground: foreground >= maxLabel ? 1 : foreground + 1 }));
    // bind('{', () => send('SETBACKGROUND', { background: background <= 1 ? maxLabel : background - 1 }));
    // bind('}', () => send('SETBACKGROUND', { background: background >= maxLabel ? 1 : background + 1 }));
    return () => {
      // unbind('x');
      // unbind('n');
      unbind('esc');
      unbind('[');
      unbind(']');
      // unbind('{');
      // unbind('}');
    }
  }, [foreground, background, maxLabel, send]);

}
