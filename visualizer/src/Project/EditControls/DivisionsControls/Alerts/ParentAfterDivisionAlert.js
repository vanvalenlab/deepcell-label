import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useCells, useDivisions } from '../../../ProjectContext';
import { formatTimes, parentAfterDivision } from '../divisionUtils';
import AlertGroup, { alertStyle } from './AlertGroup';

function ParentAfterDivisionAlert({ division }) {
  const cells = useCells();
  const { parent, t } = division;
  const times = cells.getTimes(parent);

  const timesAfterDivision = times.filter((f) => f >= t);
  const timeText = formatTimes(timesAfterDivision);

  return (
    <Alert sx={alertStyle} severity='error'>
      Parent {parent} in {timeText} after division at time {t}.
    </Alert>
  );
}

function ParentAfterDivisionAlerts() {
  const cells = useCells();
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
          <ParentAfterDivisionAlert
            division={division}
            key={`parent${division.parent}daughters${division.daughters}`}
          />
        ))}
      </AlertGroup>
    )
  );
}

export default ParentAfterDivisionAlerts;
