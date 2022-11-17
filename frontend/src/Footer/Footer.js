import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/system';
import React from 'react';

const MuiFooter = styled('footer')``;

export default function Footer() {
  const fullDate = new Date();
  const currYear = fullDate.getFullYear();
  return (
    <MuiFooter
      sx={{
        flex: 'none',
        marginTop: -5.5,
        p: 1,
        backgroundColor: 'background.paper',
      }}
    >
      <Typography variant='caption' align='center' color='textSecondary' component='p'>
        © 2016-{currYear} The Van Valen Lab at the California Institute of Technology (Caltech). All
        rights reserved.
      </Typography>
      <Typography variant='caption' align='center' color='textSecondary' component='p'>
        For any questions or issues, please post on our{' '}
        <Link href='https://github.com/vanvalenlab/deepcell-label/issues'>GitHub Issues</Link> page.
      </Typography>
    </MuiFooter>
  );
}
