import React, { createContext } from 'react';
import { useInterpret } from '@xstate/react';
import { useLocation } from "react-router-dom";
import createFrameMachine from './statechart/frameMachine';

export const FrameContext = createContext();

const ServiceContext = (props) => {
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('projectId');
  const frameService = useInterpret(createFrameMachine(projectId));

  return (
    <FrameContext.Provider value={frameService}>
      {props.children}
    </FrameContext.Provider>
  );
};

export default ServiceContext;