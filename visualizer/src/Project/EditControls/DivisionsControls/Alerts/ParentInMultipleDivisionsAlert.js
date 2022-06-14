import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useDivisions, useSelect } from '../../../ProjectContext';
import AlertGroup, { alertStyle } from './AlertGroup';

function ParentInMultipleDivisionsAlert({ cell }) {
  const divisionsMachine = useDivisions();
  const divisions = useSelector(divisionsMachine, (state) => state.context.divisions);
  const withParent = divisions.filter((d) => d.parent === cell);

  const select = useSelect();
  const onClick = () => {
    select.send({ type: 'SET_CELL', cell });
  };

  return (
    <Alert sx={alertStyle} severity='error' onClick={onClick}>
      Parent {cell} in {withParent.length} divisions
    </Alert>
  );
}

function ParentInMultipleDivisionsAlerts() {
  const divisionsMachine = useDivisions();
  const divisions = useSelector(divisionsMachine, (state) => state.context.divisions);

  const count = divisions.reduce(
    (acc, curr) => ({ ...acc, [curr.parent]: curr.parent in acc ? acc[curr.parent] + 1 : 1 }),
    {}
  );

  const multiple = Object.entries(count)
    .filter(([_, count]) => count > 1)
    .map(([cell, _]) => Number(cell));

  const header =
    multiple.length === 1
      ? `1 parent in multiple divisions`
      : `${multiple.length} parents in multiple divisions`;
  return (
    multiple.length > 0 && (
      <AlertGroup header={header} severity={'error'}>
        {multiple.map((cell) => (
          <ParentInMultipleDivisionsAlert cell={cell} key={cell} />
        ))}
      </AlertGroup>
    )
  );
}

export default ParentInMultipleDivisionsAlerts;
