import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useDivisions, useImage, useSelect } from '../../../ProjectContext';
import { oneDaughter } from '../divisionUtils';
import AlertGroup, { alertStyle } from './AlertGroup';

function OneDaughterAlert({ division }) {
  const { parent, daughters, t } = division;

  const image = useImage();
  const select = useSelect();

  const onClick = () => {
    select.send({ type: 'SELECT', cell: daughters[0] });
    image.send({ type: 'SET_T', t });
  };

  return (
    <Alert sx={alertStyle} severity='warning' onClick={onClick}>
      Parent {parent} has only one daughter {daughters[0]}
    </Alert>
  );
}

function OneDaughterAlerts() {
  const divisionsMachine = useDivisions();
  const divisions = useSelector(divisionsMachine, (state) => state.context.divisions);

  const alerts = divisions.filter((division) => oneDaughter(division));
  const count = alerts.length;

  const header =
    count === 1 ? `1 division with one daughter` : `${count} divisions with one daughter`;

  return (
    count > 0 && (
      <AlertGroup header={header} severity={'warning'}>
        {alerts.map((division) => (
          <OneDaughterAlert
            division={division}
            key={`parent${division.parent}daughters${division.daughters}`}
          />
        ))}
      </AlertGroup>
    )
  );
}

export default OneDaughterAlerts;
