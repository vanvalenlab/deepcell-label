import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useImage, useLineage } from '../../../ProjectContext';
import { oneDaughter } from '../trackingUtils';
import AlertGroup, { alertStyle } from './AlertGroup';

function OneDaughterAlert(division) {
  const { label, daughters, divisionFrame } = division;

  const image = useImage();
  const lineage = useLineage();

  const onClick = () => {
    lineage.send({ type: 'SET_CELL', cell: daughters[0] });
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

  const oneDaughterAlerts = Object.values(lineage).filter((division) => oneDaughter(division));
  const count = oneDaughterAlerts.length;

  const header =
    count === 1 ? `1 division with one daughter` : `${count} divisions with one daughter`;

  return (
    count > 0 && (
      <AlertGroup header={header} severity={'warning'}>
        {oneDaughterAlerts.map((division) => (
          <OneDaughterAlert division={division} />
        ))}
      </AlertGroup>
    )
  );
}

export default OneDaughterAlerts;
