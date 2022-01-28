import MoreIcon from '@mui/icons-material/MoreVert';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import makeStyles from '@mui/styles/makeStyles';
import React, { useState } from 'react';
import { FaGithub } from 'react-icons/fa';

const useStyles = makeStyles((theme) => ({
  root: {},
  grow: {
    flexGrow: 1,
  },
  sectionDesktop: {
    display: 'none',
    [theme.breakpoints.up('sm')]: {
      display: 'flex',
    },
  },
  sectionMobile: {
    display: 'flex',
    [theme.breakpoints.up('sm')]: {
      display: 'none',
    },
  },
  mobileMenuItem: {
    display: 'block',
  },
}));

export default function NavBar() {
  // const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState(null);
  const classes = useStyles();

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
          className={classes.mobileMenuItem}
        >
          DeepCell
        </Button>
        <Button
          color='inherit'
          href='https://github.com/vanvalenlab'
          target='_blank'
          className={classes.mobileMenuItem}
        >
          <FaGithub size={28} />
        </Button>
      </Menu>
    );
  };

  return (
    <div className={classes.root}>
      <AppBar position='static'>
        <Toolbar>
          <Typography variant='subtitle1' color='inherit' className={classes.grow}>
            <IconButton color='inherit' href='/' size='large'>
              DeepCell Label
            </IconButton>
          </Typography>
          <div className={classes.grow} />
          <div className={classes.sectionDesktop}>
            <Button
              color='inherit'
              href='http://deepcell.org/'
              target='_blank'
              className={classes.mobileMenuItem}
            >
              DeepCell
            </Button>
            <Button
              color='inherit'
              href='https://github.com/vanvalenlab'
              target='_blank'
              className={classes.mobileMenuItem}
            >
              <FaGithub size={28} />
            </Button>
          </div>
          <div className={classes.sectionMobile}>
            <IconButton
              aria-haspopup='true'
              color='inherit'
              onClick={(e) => setMobileMoreAnchorEl(e.currentTarget)}
              size='large'
            >
              <MoreIcon />
            </IconButton>
          </div>
        </Toolbar>
      </AppBar>
      <MobileMenu />
    </div>
  );
}
