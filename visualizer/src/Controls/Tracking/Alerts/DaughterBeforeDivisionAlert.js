import { makeStyles } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useTracking } from '../../../ProjectContext';
import { daughterBeforeDivision, formatFrames } from '../trackingUtils';
import AlertGroup from './AlertGroup';

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    // '& > * + *': {
    //   marginTop: theme.spacing(2),
    // },
  },
  headerAlert: {
    boxSizing: 'border-box',
    maxWidth: '300px',
    marginTop: theme.spacing(2),
  },
  alert: {
    position: 'relative',
    boxSizing: 'border-box',
    maxWidth: '280px',
    left: '20px',
  },
}));

function DaughterBeforeDivisionAlert({ label }) {
  const tracking = useTracking();
  const division = useSelector(tracking, state => state.context.labels[label]);
  const { frames, parentDivisionFrame: divisionFrame } = division;

  const framesBeforeDivision = frames.filter(frame => frame < divisionFrame);
  const frameText = formatFrames(framesBeforeDivision);

  const styles = useStyles();

  return (
    <Alert className={styles.alert} severity='error'>
      Daughter {label} in {frameText} before division in frame {divisionFrame}.
    </Alert>
  );
}

function DaughterBeforeDivisionAlerts() {
  const tracking = useTracking();
  const divisions = useSelector(tracking, state => state.context.labels);

  const daughterBeforeDivisionAlerts = Object.values(divisions)
    .filter(division => daughterBeforeDivision(division, divisions))
    .map(division => division.label);
  const count = daughterBeforeDivisionAlerts.length;

  const header =
    count === 1
      ? `1 daughter present before division`
      : `${count} daughters present before division`;
  return (
    count > 0 && (
      <AlertGroup header={header} severity={'error'}>
        {daughterBeforeDivisionAlerts.map(label => (
          <DaughterBeforeDivisionAlert label={label} />
        ))}
      </AlertGroup>
    )
  );
}

export default DaughterBeforeDivisionAlerts;
