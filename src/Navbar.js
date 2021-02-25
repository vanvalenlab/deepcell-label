import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/core/Menu';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import MoreIcon from '@material-ui/icons/MoreVert';
import { FaGithub } from 'react-icons/fa';

const useStyles = makeStyles(theme => ({
  root: {
  },
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
    display: 'block'
  }
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
        <Button color='inherit' href='/predict' className={classes.mobileMenuItem}>
          Predict
        </Button>
        <Button color='inherit' href='/data' className={classes.mobileMenuItem}>
          Data
        </Button>
        <Button color='inherit' href='/about' className={classes.mobileMenuItem}>
          About
        </Button>
        <Button color='inherit' href='/faq' className={classes.mobileMenuItem}>
          FAQ
        </Button>
        <Button color='inherit' href='https://github.com/vanvalenlab' target='_blank' className={classes.mobileMenuItem}>
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
            <IconButton color='inherit' href='/'>
              DeepCell
            </IconButton>
          </Typography>
          <div className={classes.grow} />
          <div className={classes.sectionDesktop}>
            <Button color='inherit' href='/predict'>
              Predict
            </Button>
            <Button color='inherit' href='/data'>
              Data
            </Button>
            <Button color='inherit' href='/about'>
              About
            </Button>
            <Button color='inherit' href='/faq'>
              FAQ
            </Button>
            <Button color='inherit' href='https://github.com/vanvalenlab' target='_blank'>
              <FaGithub size={28} />
            </Button>
          </div>
          <div className={classes.sectionMobile}>
            <IconButton aria-haspopup='true' color='inherit' onClick={e => setMobileMoreAnchorEl(e.currentTarget)}>
              <MoreIcon />
            </IconButton>
          </div>
        </Toolbar>
      </AppBar>
      <MobileMenu />
    </div>
  );
}