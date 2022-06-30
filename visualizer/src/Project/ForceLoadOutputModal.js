import { Button } from '@mui/material';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useIdb } from './ProjectContext';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

function ForceLoadOutputModal() {
  const idb = useIdb();
  const open = useSelector(idb, (state) => state.matches('promptForceLoadOutput'));

  const id = new URLSearchParams(window.location.search).get('projectId');

  return (
    <Modal open={open} onClose={() => idb.send('USE_LOCAL_PROJECT')}>
      <Box sx={style}>
        <Typography variant='h6' component='h2'>
          Confirm Force Reload from Output Bucket
        </Typography>
        <Typography sx={{ my: 2 }}>
          Project <strong>{id}</strong> has been loaded previously, but you've opened a link to
          force loading project from the output bucket.
        </Typography>
        <Typography sx={{ my: 2 }}>
          Do you want to overwrite with the project in output bucket, or keep your local project
          copy?
        </Typography>
        <Box display='flex' gap={2} justifyContent='space-between'>
          <Button
            variant='contained'
            color='secondary'
            onClick={() => idb.send('FORCE_LOAD_OUTPUT')}
          >
            Overwrite Project
          </Button>
          <Button variant='contained' color='primary' onClick={() => idb.send('USE_LOCAL_PROJECT')}>
            Keep Local Project
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default ForceLoadOutputModal;
