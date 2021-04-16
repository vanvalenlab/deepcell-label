import React, { createContext, useContext, useEffect } from 'react';
import { useInterpret, useActor } from '@xstate/react';
import { useLocation } from "react-router-dom";
import createDeepcellLabelMachine from './statechart/deepcellLabelMachine';
import { bind, unbind } from 'mousetrap';
// import { inspect } from '@xstate/inspect';

export const LabelContext = createContext();


export const useLabelService = () => {
  return {
    service: useReturnContext(LabelContext),
  };
};

function useReturnContext(contextType) {
    const context = useContext(contextType);
    if (context === undefined) {
        throw new Error(`${contextType} must be used within its appropriate parent provider`);
    }
    return context;
}

export function useLabel() {
  const { service } = useLabelService();
  const [state, send] = useActor(service);
  return [state, send];
}

export function useUndo() {
  const { service } = useLabelService();
  const { undo } = service.state.children;
  useEffect(() => {
    bind('command+z', () => undo.send('UNDO'));
    bind('command+shift+z', () => undo.send('REDO'));
    return () => {
      unbind('command+z');
      unbind('command+shift+z');
    };
  }, []);
  return undo;
}

export function useImage() {
  const { service } = useLabelService();
  const { image } = service.state.children;
  const [current, send] = useActor(image);
  const { frame, numFrames, channel, numChannels, feature, numFeatures } = current.context;

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

  return image;
}

export function useCanvas() {
  const { service } = useLabelService();
  const { canvas } = service.state.children;
  useEffect(() => {
    bind('space', (event) => {
      if (event.repeat) return;
      canvas.send('keydown.Space');
    });
    bind('space', () => canvas.send('keyup.Space'), 'keyup');
    return () => {
      unbind('space');
      unbind('space', 'keyup');
    }
  }, []);
  return canvas;
}

export function useTool() {
  const { service } = useLabelService();
  const { tool } = service.state.children;
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
  return tool;
}

const ServiceContext = (props) => {
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('projectId');

  const labelService = useInterpret(createDeepcellLabelMachine(projectId));
  labelService.start();
  window.dcl = labelService;


  return (
    <LabelContext.Provider value={labelService}>
      {props.children}
    </LabelContext.Provider>
  );
};



export default ServiceContext;