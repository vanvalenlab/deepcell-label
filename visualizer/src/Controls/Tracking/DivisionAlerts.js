import { makeStyles } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useValidate } from '../../ServiceContext';

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    '& > * + *': {
      marginTop: theme.spacing(2),
    },
  },
}));

function DivisionAlert({ warning }) {
  return <Alert severity='warning'>{warning}</Alert>;
}

export default function DivisionAlerts() {
  const classes = useStyles();

  const validate = useValidate();
  const warnings = useSelector(validate, state => state.context.warnings);

  return (
    <div className={classes.root}>
      {warnings.map(warning => (
        <DivisionAlert warning={warning} />
      ))}
    </div>
  );
}
