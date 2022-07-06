import { Alert, Box, CircularProgress, Container, Typography } from '@mui/material';
import { styled } from '@mui/system';

const Main = styled('main')``;

function Loading() {
  const error = new URLSearchParams(window.location.search).get('error');

  return (
    <Main sx={{ flexGrow: 1 }}>
      <Container maxWidth='md'>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            m: 4,
          }}
        >
          {error ? (
            <Alert severity='error'>{error}</Alert>
          ) : (
            <>
              <Typography variant='body1'>Loading project...</Typography>
              <CircularProgress style={{ margin: '10%', width: '50%', height: '50%' }} />
            </>
          )}
        </Box>
      </Container>
    </Main>
  );
}

export default Loading;
