import React, { createContext, useContext } from 'react';

export const Context = createContext();

export const useQualityControl = () => {
  return useReturnContext(Context);
};

function useReturnContext(contextType) {
  const context = useContext(contextType);
  if (context === undefined) {
    throw new Error(`${contextType} must be used within its appropriate parent provider`);
  }
  return context;
}

function QualityControlContext({ qualityControl, children }) {
  return <Context.Provider value={qualityControl}>{children}</Context.Provider>;
}

export default QualityControlContext;
