import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useTracking } from '../../../ProjectContext';
import { formatFrames, parentAfterDivision } from '../trackingUtils';
import AlertGroup, { alertStyle } from './AlertGroup';

function ParentAfterDivisionAlert({ label }) {
  const tracking = useTracking();
  const division = useSelector(tracking, (state) => state.context.labels[label]);
  const { divisionFrame, frames } = division;

  const framesAfterDivision = frames.filter((frame) => frame >= divisionFrame);
  const frameText = formatFrames(framesAfterDivision);

  return (
    <Alert sx={alertStyle} severity='error'>
      Parent {label} in {frameText} after division in frame {divisionFrame}.
    </Alert>
  );
}

function ParentAfterDivisionAlerts() {
  const tracking = useTracking();
  const divisions = useSelector(tracking, (state) => state.context.labels);

  const parentAfterDivisionAlerts = Object.values(divisions)
    .filter((division) => parentAfterDivision(division))
    .map((division) => division.label);
  const count = parentAfterDivisionAlerts.length;

  const header =
    count === 1 ? `1 parent present after division` : `${count} parents present after division`;

  return (
    count > 0 && (
      <AlertGroup header={header} severity={'error'}>
        {parentAfterDivisionAlerts.map((label) => (
          <ParentAfterDivisionAlert label={label} />
        ))}
      </AlertGroup>
    )
  );
}

export default ParentAfterDivisionAlerts;
