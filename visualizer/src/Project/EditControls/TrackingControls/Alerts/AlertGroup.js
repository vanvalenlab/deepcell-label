import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { IconButton } from '@mui/material';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import React from 'react';

export const alertStyle = {
  position: 'relative',
  boxSizing: 'border-box',
  maxWidth: '18rem',
  left: '2rem',
};

function AlertGroup({ header, severity, children }) {
  const [open, setOpen] = React.useState(false);
  const toggle = () => setOpen(!open);
  const action = (
    <IconButton
      sx={{
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: (theme) =>
          theme.transitions.create('transform', {
            duration: theme.transitions.duration.shortest,
          }),
        '&:hover': {
          // Disable the hover effect for the IconButton,
          // because a hover effect should apply to the entire Expand button and
          // not only to the IconButton.
          backgroundColor: 'transparent',
        },
      }}
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
      <Alert
        sx={{ boxSizing: 'border-box', maxWidth: '20rem', mt: 0.5 }}
        severity={severity}
        onClick={toggle}
        action={action}
      >
        {header}
      </Alert>
      <Collapse in={open}>{children}</Collapse>
    </>
  );
}

export default AlertGroup;
