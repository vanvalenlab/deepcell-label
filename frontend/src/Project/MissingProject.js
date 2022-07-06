import { Box, Typography } from '@mui/material';

function MissingProject() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('projectId');
  const forceLoadOutput = params.get('forceLoadOutput') === 'true';

  return (
    <Box
      sx={{
        boxSizing: 'border-box',
        display: 'flex',
        flexGrow: 1,
        flexDirection: 'column',
        p: 2,
        alignItems: 'center',
      }}
    >
      <Typography>
        Unable to load project <tt>{id}</tt>
        {forceLoadOutput && (
          <>
            {' '}
            from deepcell-label-output bucket.
            <br />
            Submit the project before loading the results from the output bucket
          </>
        )}
        .
      </Typography>
    </Box>
  );
}

export default MissingProject;
