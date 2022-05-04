import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useLineage } from '../../../ProjectContext';
import { formatFrames, parentAfterDivision } from '../trackingUtils';
import AlertGroup, { alertStyle } from './AlertGroup';

function ParentAfterDivisionAlert({ division }) {
  const { label, divisionFrame, frames } = division;

  const framesAfterDivision = frames.filter((frame) => frame >= divisionFrame);
  const frameText = formatFrames(framesAfterDivision);

  return (
    <Alert sx={alertStyle} severity='error'>
      Parent {label} in {frameText} after division in frame {divisionFrame}.
    </Alert>
  );
}

function ParentAfterDivisionAlerts() {
  const lineageMachine = useLineage();
  const lineage = useSelector(lineageMachine, (state) => state.context.lineage);
  console.log(lineage);

  const parentAfterDivisionAlerts = Object.values(lineage).filter((cell) =>
    parentAfterDivision(cell)
  );
  const count = parentAfterDivisionAlerts.length;
  console.log(parentAfterDivisionAlerts);

  const header =
    count === 1 ? `1 parent present after division` : `${count} parents present after division`;

  return (
    count > 0 && (
      <AlertGroup header={header} severity={'error'}>
        {parentAfterDivisionAlerts.map((division) => (
          <ParentAfterDivisionAlert division={division} />
        ))}
      </AlertGroup>
    )
  );
}

export default ParentAfterDivisionAlerts;
