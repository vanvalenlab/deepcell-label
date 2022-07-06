import React, { createContext, useContext } from 'react';

export const Context = createContext();

export const useReview = () => {
  return useReturnContext(Context);
};

function useReturnContext(contextType) {
  const context = useContext(contextType);
  if (context === undefined) {
    throw new Error(`${contextType} must be used within its appropriate parent provider`);
  }
  return context;
}

function ReviewContext({ review, children }) {
  return <Context.Provider value={review}>{children}</Context.Provider>;
}

export default ReviewContext;
