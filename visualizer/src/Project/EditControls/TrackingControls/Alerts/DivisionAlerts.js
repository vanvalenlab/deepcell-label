import { styled } from '@mui/system';
import { useSelector } from '@xstate/react';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useDivisions } from '../../../ProjectContext';
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
  const divisionsMachine = useDivisions();
  const divisions = useSelector(divisionsMachine, (state) => state.context.divisions);

  if (!divisions) {
    return null;
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // reset the state of your app so the error doesn't happen again
      }}
    >
      <Div sx={{ maxHeight: '200px', overflowY: 'auto', overflowX: 'hidden' }}>
        <ParentAfterDivisionAlerts />
        <DaughterBeforeDivisionAlerts />
        <OneDaughterAlerts />
      </Div>
    </ErrorBoundary>
  );
}

export default DivisionAlerts;
