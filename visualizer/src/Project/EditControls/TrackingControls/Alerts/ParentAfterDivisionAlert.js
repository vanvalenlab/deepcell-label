import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useCells, useDivisions } from '../../../ProjectContext';
import { formatFrames, parentAfterDivision } from '../trackingUtils';
import AlertGroup, { alertStyle } from './AlertGroup';

function ParentAfterDivisionAlert({ division }) {
  const cellsMachine = useCells();
  const cells = useSelector(cellsMachine, (state) => state.context.cells);
  const { parent, t } = division;
  const frames = cells.getFrames(parent);

  const framesAfterDivision = frames.filter((f) => f >= t);
  const frameText = formatFrames(framesAfterDivision);

  return (
    <Alert sx={alertStyle} severity='error'>
      Parent {parent} in {frameText} after division in frame {t}.
    </Alert>
  );
}

function ParentAfterDivisionAlerts() {
  const cellsMachine = useCells();
  const cells = useSelector(cellsMachine, (state) => state.context.cells);
  const divisionsMachine = useDivisions();
  const divisions = useSelector(divisionsMachine, (state) => state.context.divisions);

  const alerts = divisions.filter((division) => parentAfterDivision(division, cells));
  const count = alerts.length;

  const header =
    count === 1 ? `1 parent present after division` : `${count} parents present after division`;

  return (
    count > 0 && (
      <AlertGroup header={header} severity={'error'}>
        {alerts.map((division) => (
          <ParentAfterDivisionAlert division={division} />
        ))}
      </AlertGroup>
    )
  );
}

export default ParentAfterDivisionAlerts;
