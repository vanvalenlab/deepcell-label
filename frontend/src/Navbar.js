import MoreIcon from '@mui/icons-material/MoreVert';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/system';
import React, { useState } from 'react';
import { FaGithub } from 'react-icons/fa';

const Div = styled('div')``;

export default function NavBar() {
  // const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState(null);

  const MobileMenu = () => {
    return (
      <Menu
        anchorEl={mobileMoreAnchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={mobileMoreAnchorEl !== null}
        onClose={setMobileMoreAnchorEl(null)}
      >
        <Button
          color='inherit'
          href='http://deepcell.org/'
          target='_blank'
          sx={{ display: 'block' }}
        >
          DeepCell
        </Button>
        <Button
          color='inherit'
          href='https://github.com/vanvalenlab'
          target='_blank'
          sx={{ display: 'block' }}
        >
          <FaGithub size={28} />
        </Button>
      </Menu>
    );
  };

  return (
    <div>
      <AppBar position='static'>
        <Toolbar>
          <Typography variant='subtitle1' color='inherit' sx={{ flexGrow: 1 }}>
            <IconButton color='inherit' href='/' size='large'>
              DeepCell Label
            </IconButton>
          </Typography>
          <Div sx={{ flexGrow: 1 }} />
          <Div
            sx={{
              display: {
                xs: 'none',
                sm: 'flex',
              },
            }}
          >
            <Button
              color='inherit'
              href='http://deepcell.org/'
              target='_blank'
              sx={{ display: 'block' }}
            >
              DeepCell
            </Button>
            <Button
              color='inherit'
              href='https://github.com/vanvalenlab'
              target='_blank'
              sx={{ display: 'block' }}
            >
              <FaGithub size={28} />
            </Button>
          </Div>
          <Div
            sx={{
              display: {
                xs: 'flex',
                sm: 'none',
              },
            }}
          >
            <IconButton
              aria-haspopup='true'
              color='inherit'
              onClick={(e) => setMobileMoreAnchorEl(e.currentTarget)}
              size='large'
            >
              <MoreIcon />
            </IconButton>
          </Div>
        </Toolbar>
      </AppBar>
      <MobileMenu />
    </div>
  );
}
