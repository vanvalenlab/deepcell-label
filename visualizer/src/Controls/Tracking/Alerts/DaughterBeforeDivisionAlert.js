import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useDivision, useTracking } from '../../../ProjectContext';
import { daughterBeforeDivision, formatFrames } from '../trackingUtils';
import AlertGroup, { useAlertStyles } from './AlertGroup';

function DaughterBeforeDivisionAlert({ label }) {
  const division = useDivision(label);
  const { frames, parentDivisionFrame: divisionFrame } = division;

  const framesBeforeDivision = frames.filter((frame) => frame < divisionFrame);
  const frameText = formatFrames(framesBeforeDivision);

  const styles = useAlertStyles();

  return (
    <Alert className={styles.alert} severity='error'>
      Daughter {label} in {frameText} before division in frame {divisionFrame}.
    </Alert>
  );
}

function DaughterBeforeDivisionAlerts() {
  const tracking = useTracking();
  const divisions = useSelector(tracking, (state) => state.context.labels);

  const daughterBeforeDivisionAlerts = Object.values(divisions)
    .filter((division) => daughterBeforeDivision(division, divisions))
    .map((division) => division.label);
  const count = daughterBeforeDivisionAlerts.length;

  const header =
    count === 1
      ? `1 daughter present before division`
      : `${count} daughters present before division`;
  return (
    count > 0 && (
      <AlertGroup header={header} severity={'error'}>
        {daughterBeforeDivisionAlerts.map((label) => (
          <DaughterBeforeDivisionAlert label={label} />
        ))}
      </AlertGroup>
    )
  );
}

export default DaughterBeforeDivisionAlerts;
