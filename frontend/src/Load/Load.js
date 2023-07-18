import { Box, Container, Link, Paper, Typography } from '@mui/material';
import { styled } from '@mui/system';
import { useInterpret } from '@xstate/react';
import ExampleFileSelect from './ExampleFileSelect';
import FileUpload from './FileUpload';
import loadMachine from './loadMachine';

const Main = styled('main')``;

function Introduction() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: (theme) => `calc(100% - ${theme.spacing(4)})`,
        m: 4,
        boxSizing: 'border-box',
      }}
    >
      <Typography variant='h2' align='center'>
        Welcome to DeepCell Label
      </Typography>
      <Typography variant='body1' sx={{ width: '80%', m: 1, boxSizing: 'border-box' }}>
        DeepCell Label is a data labeling tool to segment images into instance labels, mapping each
        pixel to an object in the image.
      </Typography>
      <Typography variant='body1' sx={{ width: '80%', m: 1, boxSizing: 'border-box' }}>
        Label can work with 2D images, 3D images, and timelapses. 4D images, or 3D timelapse images,
        are not yet supported. Label expects input images to have time (T) first and channels (C)
        last, or a ZYXC (TYXC for timelapses) dimension order. When loading images with a different
        dimension order, update the dimensions dropdown in the drag-and-drop box below. For more
        details on DCL image formats, see the{' '}
        <Link
          href='https://github.com/vanvalenlab/deepcell-label/blob/main/documentation/LABEL_FILE_FORMAT.md'
          target='_blank'
        >
          documentation
        </Link>
        .
      </Typography>
    </Box>
  );
}

function Load() {
  const loadService = useInterpret(loadMachine);
  window.loadService = loadService;

  return (
    <Main sx={{ flexGrow: 1 }}>
      <Introduction />
      <Container maxWidth='md'>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: (theme) => `calc(100% - ${theme.spacing(4)})`,
            m: 4,
            boxSizing: 'border-box',
          }}
        >
          <Paper sx={{ p: 4, width: '100%', boxSizing: 'border-box' }}>
            <FileUpload loadService={loadService} onDroppedFile={() => {}} />
          </Paper>
          <ExampleFileSelect loadService={loadService} />
        </Box>
      </Container>
    </Main>
  );
}

export default Load;
