import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useDivision, useLineage } from '../../../ProjectContext';
import { daughterBeforeDivision, formatFrames } from '../trackingUtils';
import AlertGroup, { alertStyle } from './AlertGroup';

function DaughterBeforeDivisionAlert({ label }) {
  const { frames, parentDivisionFrame: divisionFrame } = useDivision(label);

  const framesBeforeDivision = frames.filter((frame) => frame < divisionFrame);
  const frameText = formatFrames(framesBeforeDivision);

  return (
    <Alert sx={alertStyle} severity='error'>
      Daughter {label} in {frameText} before division in frame {divisionFrame}.
    </Alert>
  );
}

function DaughterBeforeDivisionAlerts() {
  const lineageMachine = useLineage();
  const lineage = useSelector(lineageMachine, (state) => state.context.lineage);

  const daughterBeforeDivisionAlerts = Object.values(lineage)
    .filter((cell) => daughterBeforeDivision(cell, lineage))
    .map((cell) => cell.label);
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
