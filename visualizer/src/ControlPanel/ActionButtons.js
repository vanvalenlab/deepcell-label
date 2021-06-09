import React from 'react';
import { useSelector } from '@xstate/react';
import { withStyles } from '@material-ui/core/styles';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Tooltip from '@material-ui/core/Tooltip';

import { useToolbar } from '../ServiceContext';


export default function ActionButtons() {
  const toolbar = useToolbar();
  const { send } = toolbar;

  return (
    <Box display='flex' flexDirection='column'>
      <ButtonGroup orientation='vertical'>
        <Button onClick={() => send('SWAP')}>
          Swap
        </Button>
        <Button onClick={() => send('REPLACE')}>
          Replace
        </Button>
      </ButtonGroup>
    </Box>
  );
}
