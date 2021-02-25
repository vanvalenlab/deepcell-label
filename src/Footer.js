  
import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';

const useStyles = makeStyles(theme => ({
  footer: {
    flex: 'none',
    marginTop: theme.spacing(6),
    padding: `${theme.spacing(2)}px ${theme.spacing(2)}px`,
    backgroundColor: theme.palette.background.paper
  }
}));

export default function Footer() {
  const fullDate = new Date();
  const currYear = fullDate.getFullYear();
  const classes = useStyles();
  return (
    <footer className={classes.footer}>
      <Typography variant='subtitle1' align='center' color='textSecondary' component='p'>
        © 2016-{currYear} The Van Valen Lab at the California Institute of Technology
        (Caltech). All rights reserved.
      </Typography>
    </footer>
  );
}