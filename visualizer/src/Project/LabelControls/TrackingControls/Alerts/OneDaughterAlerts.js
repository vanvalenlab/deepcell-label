import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useDivision, useImage, useLineage, useSelect } from '../../../ProjectContext';
import { oneDaughter } from '../trackingUtils';
import AlertGroup, { alertStyle } from './AlertGroup';

function OneDaughterAlert({ label }) {
  const { daughters, divisionFrame } = useDivision(label);

  const image = useImage();
  const select = useSelect();

  const onClick = () => {
    select.send({ type: 'SET_FOREGROUND', foreground: daughters[0] });
    image.send({ type: 'SET_FRAME', frame: divisionFrame });
  };

  return (
    <Alert sx={alertStyle} severity='warning' onClick={onClick}>
      Parent {label} has only daughter {daughters[0]}
    </Alert>
  );
}

function OneDaughterAlerts() {
  const lineageMachine = useLineage();
  const lineage = useSelector(lineageMachine, (state) => state.context.lineage);

  const oneDaughterAlerts = Object.values(lineage)
    .filter((cell) => oneDaughter(cell))
    .map((cell) => cell.label);
  const count = oneDaughterAlerts.length;

  const header =
    count === 1 ? `1 division with one daughter` : `${count} divisions with one daughter`;

  return (
    count > 0 && (
      <AlertGroup header={header} severity={'warning'}>
        {oneDaughterAlerts.map((label) => (
          <OneDaughterAlert label={label} />
        ))}
      </AlertGroup>
    )
  );
}

export default OneDaughterAlerts;
