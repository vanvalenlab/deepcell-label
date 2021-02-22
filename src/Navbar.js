
import React from 'react';
import { AppBar, Toolbar, Button, Typography } from '@material-ui/core';

export default function Navbar() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h5">
          DeepCell Label
        </Typography>
        <Button color="inherit">DeepCell</Button>
        <Button color="inherit">GitHub</Button>
      </Toolbar>
    </AppBar>
  );
}
