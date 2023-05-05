import DarkModeIcon from '@mui/icons-material/DarkMode';
import GitHubIcon from '@mui/icons-material/GitHub';
import LightModeIcon from '@mui/icons-material/LightMode';
import MoreIcon from '@mui/icons-material/MoreVert';
import { Box, createTheme } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/system';
import React, { useState } from 'react';

const Div = styled('div')``;

export default function NavBar({ theme, setTheme }) {
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
        <IconButton
          color='inherit'
          href='https://github.com/vanvalenlab'
          target='_blank'
          sx={{ display: 'block', borderRadius: 1 }}
        >
          <GitHubIcon sx={{ fontSize: 28 }} />
        </IconButton>
      </Menu>
    );
  };

  return (
    <div>
      <AppBar position='static'>
        <Toolbar>
          <Typography variant='subtitle1' color='inherit' sx={{ flexGrow: 1 }}>
            <IconButton color='inherit' href='/' size='large' sx={{ borderRadius: 3 }}>
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
              <Box sx={{ marginTop: 0.5 }}> DeepCell</Box>
            </Button>
            <IconButton
              color='inherit'
              href='https://github.com/vanvalenlab'
              target='_blank'
              sx={{ display: 'block', borderRadius: 1 }}
            >
              <GitHubIcon sx={{ fontSize: 28 }} />
            </IconButton>
            <IconButton
              onClick={() =>
                theme === 'light'
                  ? setTheme(createTheme({ palette: { mode: 'dark' } }))
                  : setTheme(createTheme({ palette: { mode: 'light' } }))
              }
              color='inherit'
              sx={{ display: 'block', borderRadius: 1 }}
            >
              {theme === 'light' ? (
                <DarkModeIcon sx={{ fontSize: 28 }} />
              ) : (
                <LightModeIcon sx={{ fontSize: 28 }} />
              )}
            </IconButton>
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
