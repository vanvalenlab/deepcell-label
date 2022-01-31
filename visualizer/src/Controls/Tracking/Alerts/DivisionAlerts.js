import { styled } from '@mui/system';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import DaughterBeforeDivisionAlerts from './DaughterBeforeDivisionAlert';
import OneDaughterAlerts from './OneDaughterAlerts';
import ParentAfterDivisionAlerts from './ParentAfterDivisionAlert';

const Div = styled('div')``;

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role='alert'>
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function DivisionAlerts() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // reset the state of your app so the error doesn't happen again
      }}
    >
      <Div sx={{ maxHeight: '200px', overflow: 'auto' }}>
        <ParentAfterDivisionAlerts />
        <DaughterBeforeDivisionAlerts />
        <OneDaughterAlerts />
      </Div>
    </ErrorBoundary>
  );
}

export default DivisionAlerts;
