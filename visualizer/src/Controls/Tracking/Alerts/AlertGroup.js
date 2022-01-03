import { IconButton } from '@material-ui/core';
import Collapse from '@material-ui/core/Collapse';
import { makeStyles } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Alert from '@material-ui/lab/Alert';
import clsx from 'clsx';
import React from 'react';

export const useAlertStyles = makeStyles((theme) => {
  const transition = {
    duration: theme.transitions.duration.shortest,
  };

  return {
    root: {
      width: '100%',
      // '& > * + *': {
      //   marginTop: theme.spacing(2),
      // },
    },
    headerAlert: {
      boxSizing: 'border-box',
      maxWidth: '20rem',
      marginTop: theme.spacing(2),
    },
    alert: {
      position: 'relative',
      boxSizing: 'border-box',
      maxWidth: '18rem',
      left: '2rem',
    },
    expandIcon: {
      transform: 'rotate(0deg)',
      transition: theme.transitions.create('transform', transition),
      '&:hover': {
        // Disable the hover effect for the IconButton,
        // because a hover effect should apply to the entire Expand button and
        // not only to the IconButton.
        backgroundColor: 'transparent',
      },
      '&$expanded': {
        transform: 'rotate(180deg)',
      },
    },
    expanded: {},
  };
});

function AlertGroup({ header, severity, children }) {
  const styles = useAlertStyles();

  const [open, setOpen] = React.useState(false);
  const toggle = () => setOpen(!open);
  const action = (
    <IconButton
      className={clsx(styles.expandIcon, {
        [styles.expanded]: open,
      })}
      aria-label='open'
      color='inherit'
      size='small'
      onClick={toggle}
    >
      <ExpandMoreIcon fontSize='inherit' />
    </IconButton>
  );

  return (
    <>
      <Alert className={styles.headerAlert} severity={severity} onClick={toggle} action={action}>
        {header}
      </Alert>
      <Collapse in={open}>{children}</Collapse>
    </>
  );
}

export default AlertGroup;
