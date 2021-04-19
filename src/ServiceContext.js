import React, { createContext, useContext } from 'react';
import { useInterpret } from '@xstate/react';
import { useLocation } from "react-router-dom";
import createDeepcellLabelMachine from './statechart/deepcellLabelMachine';
import Hotkeys from './Hotkeys';
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

export function useUndo() {
  const { service } = useLabelService();
  const { undo } = service.state.children;
  return undo;
}

export function useImage() {
  const { service } = useLabelService();
  const { image } = service.state.children;
  return image;
}

export function useCanvas() {
  const { service } = useLabelService();
  const { canvas } = service.state.children;
  return canvas;
}

export function useTool() {
  const { service } = useLabelService();
  const { tool } = service.state.children;
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
      <Hotkeys />
    </LabelContext.Provider>
  );
};



export default ServiceContext;