import { makeStyles } from '@material-ui/core/styles';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import DaughterBeforeDivisionAlerts from './DaughterBeforeDivisionAlert';
import OneDaughterAlerts from './OneDaughterAlerts';
import ParentAfterDivisionAlerts from './ParentAfterDivisionAlert';

const useStyles = makeStyles(theme => ({
  root: {
    maxHeight: '200px',
    overflow: 'auto',
  },
}));

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
  const classes = useStyles();

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // reset the state of your app so the error doesn't happen again
      }}
    >
      <div className={classes.root}>
        <ParentAfterDivisionAlerts />
        <DaughterBeforeDivisionAlerts />
        <OneDaughterAlerts />
      </div>
    </ErrorBoundary>
  );
}

export default DivisionAlerts;
