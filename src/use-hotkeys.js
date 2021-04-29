import { useEffect } from 'react';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import { useImage, useCanvas, useUndo, useTool } from './ServiceContext';

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
    bind('a', () => {
      send({ type: 'LOADFRAME', frame: (frame - 1 + numFrames) % numFrames });
    });
    bind('d', () => {
      send({ type: 'LOADFRAME', frame: (frame + 1) % numFrames });
    });
    bind('shift+c', () => {
      send({ type: 'LOADCHANNEL', channel: (channel - 1 + numChannels) % numChannels });
    });
    bind('c', () => {
      send({ type: 'LOADCHANNEL', channel: (channel + 1) % numChannels });
    });
    bind('shift+f', () => {
      send({ type: 'LOADFEATURE', feature: (feature - 1 + numFeatures) % numFeatures });
    });
    bind('f', () => {
      send({ type: 'LOADFEATURE', feature: (feature + 1) % numFeatures });
    });

    return () => {
      unbind('a');
      unbind('d');
      unbind('c');
      unbind('shift+c');
      unbind('f')
      unbind('shift+f');
    }
  }, [frame, numFrames, channel, numChannels, feature, numFeatures, send]);
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
    return () => {
      unbind('space');
      unbind('space', 'keyup');
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
    bind('x', (event) => send('keydown.x'));
    bind('n', (event) => send('keydown.n'));
    bind('esc', (event) => send('keydown.Escape'));
    bind('[', (event) => send('keydown.['));
    bind(']', (event) => send('keydown.]'));
    bind('{', (event) => send('keydown.{'));
    bind('}', (event) => send('keydown.}'));
    return () => {
      unbind('up');
      unbind('down');
      unbind('b');
      unbind('v');
      unbind('x');
      unbind('n');
      unbind('esc');
      unbind('[');
      unbind(']');
      unbind('{');
      unbind('}');
    }
  }, [send]);
};