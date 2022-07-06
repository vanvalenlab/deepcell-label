import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useCells, useDivisions } from '../../../ProjectContext';
import { daughterBeforeDivision, formatTimes } from '../divisionUtils';
import AlertGroup, { alertStyle } from './AlertGroup';

function DaughterBeforeDivisionAlert({ division }) {
  const cells = useCells();
  const { daughters, t } = division;
  const alerts = [];
  for (const daughter of daughters) {
    const times = cells.getTimes(daughter);
    const timesBeforeDivision = times.filter((f) => f < t);
    const timeText = formatTimes(timesBeforeDivision);
    if (timesBeforeDivision.length > 0) {
      alerts.push([daughter, timeText]);
    }
  }

  return alerts.map(([daughter, timeText]) => (
    <Alert sx={alertStyle} severity='error' key={daughter}>
      Daughter {daughter} in {timeText} before division at time {t}.
    </Alert>
  ));
}

function DaughterBeforeDivisionAlerts() {
  const cells = useCells();
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
          <DaughterBeforeDivisionAlert
            division={division}
            key={`parent${division.parent}daughters${division.daughters}`}
          />
        ))}
      </AlertGroup>
    )
  );
}

export default DaughterBeforeDivisionAlerts;
