import { Box, Typography } from '@mui/material';

function InvalidId({ id }) {
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
        <tt>{id}</tt> is not a valid project ID.
      </Typography>
      <Typography>
        Use a 12 character ID in your URL with only <tt>_</tt>, <tt>-</tt>, letters or numbers like{' '}
        <tt>projectId=abc-ABC_1234</tt>.
      </Typography>
    </Box>
  );
}

export default InvalidId;
