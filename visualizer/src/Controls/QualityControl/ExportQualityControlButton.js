import { Button, makeStyles } from '@material-ui/core';
import { green } from '@material-ui/core/colors';
import GetAppIcon from '@material-ui/icons/GetApp';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useQualityControl } from '../../QualityControlContext';

const useStyles = makeStyles(theme => ({
  buttonProgress: {
    color: green[500],
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
}));

function download(judgments) {
  const a = document.createElement('a');
  const csvContent =
    'data:text/csv,' +
    encodeURI(
      Object.entries(judgments)
        .map(e => e.join(','))
        .join('\n')
    );
  a.href = csvContent;
  a.setAttribute('download', 'qualityControl.csv');
  a.click();
}

function ExportQualityControlButton() {
  const qualityControl = useQualityControl();
  const judgments = useSelector(qualityControl, state => state.context.judgments);
  // { 'EXAMPLEID': true, 'OTHERID': false }

  const styles = useStyles();

  return (
    <Button
      className={styles.button}
      type='submit'
      variant='contained'
      color='primary'
      endIcon={<GetAppIcon />}
      onClick={() => download(judgments)}
    >
      Download QC
    </Button>
  );
}

export default ExportQualityControlButton;
