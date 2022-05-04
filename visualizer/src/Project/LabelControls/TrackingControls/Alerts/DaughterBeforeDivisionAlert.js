import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useLineage } from '../../../ProjectContext';
import { daughterBeforeDivision, formatFrames } from '../trackingUtils';
import AlertGroup, { alertStyle } from './AlertGroup';

function DaughterBeforeDivisionAlert({ division }) {
  const { label, frames, parentDivisionFrame } = division;

  const framesBeforeDivision = frames.filter((frame) => frame < parentDivisionFrame);
  const frameText = formatFrames(framesBeforeDivision);

  return (
    <Alert sx={alertStyle} severity='error'>
      Daughter {label} in {frameText} before division in frame {parentDivisionFrame}.
    </Alert>
  );
}

function DaughterBeforeDivisionAlerts() {
  const lineageMachine = useLineage();
  const lineage = useSelector(lineageMachine, (state) => state.context.lineage);

  const daughterBeforeDivisionAlerts = Object.values(lineage).filter((division) =>
    daughterBeforeDivision(division, lineage)
  );
  const count = daughterBeforeDivisionAlerts.length;

  const header =
    count === 1
      ? `1 daughter present before division`
      : `${count} daughters present before division`;
  return (
    count > 0 && (
      <AlertGroup header={header} severity={'error'}>
        {daughterBeforeDivisionAlerts.map((division) => (
          <DaughterBeforeDivisionAlert division={division} />
        ))}
      </AlertGroup>
    )
  );
}

export default DaughterBeforeDivisionAlerts;
