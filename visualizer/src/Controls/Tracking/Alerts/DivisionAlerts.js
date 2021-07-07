import { makeStyles } from '@material-ui/core/styles';
import React from 'react';
import DaughterBeforeDivisionAlerts from './DaughterBeforeDivisionAlert';
import OneDaughterAlerts from './OneDaughterAlerts';
import ParentAfterDivisionAlerts from './ParentAfterDivisionAlert';

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    // '& > * + *': {
    //   marginTop: theme.spacing(2),
    // },
  },
}));

function DivisionAlerts() {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <ParentAfterDivisionAlerts />
      <DaughterBeforeDivisionAlerts />
      <OneDaughterAlerts />
    </div>
  );
}

export default DivisionAlerts;
