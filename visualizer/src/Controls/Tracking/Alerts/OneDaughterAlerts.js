import Alert from '@material-ui/lab/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useImage, useSelect, useTracking } from '../../../ProjectContext';
import { oneDaughter } from '../trackingUtils';
import AlertGroup, { useAlertStyles } from './AlertGroup';

function OneDaughterAlert({ label }) {
  const tracking = useTracking();
  const division = useSelector(tracking, (state) => state.context.labels[label]);
  const { daughters, divisionFrame } = division;

  const image = useImage();
  const select = useSelect();

  const onClick = () => {
    select.send({ type: 'SET_FOREGROUND', foreground: daughters[0] });
    image.send({ type: 'LOAD_FRAME', frame: divisionFrame });
  };

  const styles = useAlertStyles();

  return (
    <Alert className={styles.alert} severity='warning' onClick={onClick}>
      Parent {label} has only daughter {daughters[0]}
    </Alert>
  );
}

function OneDaughterAlerts() {
  const tracking = useTracking();
  const divisions = useSelector(tracking, (state) => state.context.labels);

  const oneDaughterAlerts = Object.values(divisions)
    .filter((division) => oneDaughter(division))
    .map((division) => division.label);
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
