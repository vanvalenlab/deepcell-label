import React, { createContext, useContext, useEffect } from 'react';
import { useInterpret, useActor } from '@xstate/react';
import { useLocation } from "react-router-dom";
import createFrameMachine from './statechart/frameMachine';
import createDeepcellLabelMachine from './statechart/deepcellLabelMachine';
import { bind, unbind } from 'mousetrap';
import { inspect } from '@xstate/inspect';

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

export function useImage() {
  const { service } = useLabelService();
  const { image } = service.state.children;
  const [state, send] = useActor(image);

  useEffect(() => {
    bind('a', () => {
      const { frame, numFrames } = state.context;
      send({ type: 'SETFRAME', frame: (frame - 1 + numFrames) % numFrames });
    });
    bind('d', () => {
      const { frame, numFrames } = state.context;
      send({ type: 'SETFRAME', frame: (frame + 1) % numFrames });
    });
    bind('shift+c', () => {
      const { channel, numChannels } = state.context;
      send({ type: 'SETCHANNEL', channel: (channel - 1 + numChannels) % numChannels });
    });
    bind('c', () => {
      const { channel, numChannels } = state.context;
      send({ type: 'SETCHANNEL', channel: (channel + 1) % numChannels });
    });
    bind('shift+f', () => {
      const { feature, numFeatures } = state.context;
      send({ type: 'SETFEATURE', feature: (feature - 1 + numFeatures) % numFeatures });
    });
    bind('f', () => {
      const { feature, numFeatures } = state.context;
      send({ type: 'SETFEATURE', feature: (feature + 1) % numFeatures });
    });

    return () => {
      unbind('a');
      unbind('d');
      unbind('c');
      unbind('shift+c');
      unbind('f')
      unbind('shift+f');
    }
  }, [state, send]);

  return [state, send];
}

export function useRaw() {
  const { service } = useLabelService();
  const { image } = service.state.children;
  const { raw } = image.state.children;
  const [state, send] = useActor(raw);
  return [state, send];
}

// Doesn't work because changing channelActor does not update the hook
// export function useChannel() {
//   const { service } = useLabelService();
//   const { frame } = service.state.children;
//   const { raw } = frame.state.children;
//   const { channelActor } = raw.state.context;
//   const [state, send] = useActor(channelActor);
//   return [state, send];
// }

// Doesn't work because changing featureActor does not update the hook
// export function useFeature() {
//   const { service } = useLabelService();
//   const { label } = service.state.children;
//   const { featureActor } = label.state.context;
//   const [state, send] = useActor(featureActor);
//   return [state, send];
// }

export function useLabeled() {
  const { service } = useLabelService();
  const { image } = service.state.children;
  const { labeled } = image.state.children;
  const [state, send] = useActor(labeled);
  return [state, send];
}

export function useCanvas() {
  const { service } = useLabelService();
  const { canvas } = service.state.children;
  const [state, send] = useActor(canvas);
  useEffect(() => {
    bind('space', (event) => {
      if (event.repeat) return;
      send('keydown.Space');
    });
    bind('space', () => send('keyup.Space'), 'keyup');
    return () => {
      unbind('space');
      unbind('space', 'keyup');
    }
  }, []);
  return [state, send];
}

export function useTool() {
  const { service } = useLabelService();
  const { tool } = service.state.children;
  const [state, send] = useActor(tool);
  useEffect(() => {
    bind('x', (event) => send('keydown.x'));
    bind('n', (event) => send('keydown.n'));
    bind('esc', (event) => send('keydown.Escape'));
    bind('[', (event) => send('keydown.['));
    bind(']', (event) => send('keydown.]'));
    bind('{', (event) => send('keydown.{'));
    bind('}', (event) => send('keydown.}'));
    return () => {
      unbind('x');
      unbind('n');
      unbind('esc');
      unbind('[');
      unbind(']');
      unbind('{');
      unbind('}');
    }
  }, []);
  return [state, send];
}

const ServiceContext = (props) => {
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('projectId');

  const labelService = useInterpret(createDeepcellLabelMachine(projectId));
  labelService.start();


  return (
    <LabelContext.Provider value={labelService}>
      {props.children}
    </LabelContext.Provider>
  );
};



export default ServiceContext;