import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useCells, useDivisions } from '../../../ProjectContext';
import { daughterBeforeDivision, formatFrames } from '../trackingUtils';
import AlertGroup, { alertStyle } from './AlertGroup';

function DaughterBeforeDivisionAlert({ division }) {
  const cellsMachine = useCells();
  const cells = useSelector(cellsMachine, (state) => state.context.cells);
  const { daughters, t } = division;
  const alerts = [];
  for (const daughter of daughters) {
    const frames = cells.getFrames(daughter);
    const framesBeforeDivision = frames.filter((f) => f < t);
    const frameText = formatFrames(framesBeforeDivision);
    if (framesBeforeDivision.length > 0) {
      alerts.append([daughter, frameText]);
    }
  }

  return alerts.map(([daughter, frameText]) => (
    <Alert sx={alertStyle} severity='error' key={daughter}>
      Daughter {daughter} in {frameText} before division in frame {t}.
    </Alert>
  ));
}

function DaughterBeforeDivisionAlerts() {
  const cellsMachine = useCells();
  const cells = useSelector(cellsMachine, (state) => state.context.cells);
  const divisionsMachine = useDivisions();
  const divisions = useSelector(divisionsMachine, (state) => state.context.divisions);

  const alerts = divisions.filter((division) => daughterBeforeDivision(division, cells));
  const count = alerts.length;

  const header =
    count === 1
      ? `1 daughter present before division`
      : `${count} daughters present before division`;
  return (
    count > 0 && (
      <AlertGroup header={header} severity={'error'}>
        {alerts.map((division) => (
          <DaughterBeforeDivisionAlert division={division} />
        ))}
      </AlertGroup>
    )
  );
}

export default DaughterBeforeDivisionAlerts;
