import React from 'react';
import { makeStyles } from "@material-ui/core/styles";
import Draggable from 'react-draggable';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';

import Menu from '../ControlPanel/Menu';


const useStyles = makeStyles({
  toolbar: {
    width: '80px',
    marginLeft: '100px',
    position: 'absolute',
    top: '10%',
  },
  });

const Toolbar = () => {
  const styles = useStyles();
  
  return (
    <Draggable>
      <Menu>
        <Button>Hand</Button>
        <Button>Paint</Button>
      </Menu>
    </Draggable>
  );
};

export default Toolbar;
