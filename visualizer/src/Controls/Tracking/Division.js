import { Box, IconButton, makeStyles } from '@material-ui/core';
import Avatar from '@material-ui/core/Avatar';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import { useTheme } from '@material-ui/core/styles';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import { useSelector } from '@xstate/react';
import React from 'react';
import { ArcherContainer, ArcherElement } from 'react-archer';
import { useTracking } from '../../ServiceContext';

function useDaughters() {
  const tracking = useTracking();
  const daughters = useSelector(tracking, state => state.context.daughters);
  console.log(daughters);
  return daughters;
}

const useStyles = makeStyles(theme => ({
  division: {
    display: 'flex',
    alignItems: 'center',
  },
  daughters: {
    display: 'flex',
    flexDirection: 'column',
  },
  cell: {
    margin: theme.spacing(1),
  },
}));

function Parent() {
  const tracking = useTracking();
  const foreground = useSelector(tracking, state => state.context.foreground);

  const styles = useStyles();
  const theme = useTheme();
  const color = theme.palette.secondary.main;
  const daughters = useDaughters();
  const relations = daughters.map(label => ({
    targetId: `daughter${label}`,
    targetAnchor: 'left',
    sourceAnchor: 'right',
    style: { strokeColor: color, strokeWidth: 1, noCurves: true },
  }));
  return (
    <ArcherElement id='parent' relations={relations}>
      <Avatar className={styles.cell}>{foreground}</Avatar>
    </ArcherElement>
  );
}

function Daughter({ label }) {
  const styles = useStyles();

  const [anchorEl, setAnchorEl] = React.useState(null);
  const handleClick = event => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <ArcherElement id={`daughter${label}`}>
        <Avatar className={styles.cell} onClick={handleClick}>
          {label}
        </Avatar>
      </ArcherElement>
      <Menu
        id='simple-menu'
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleClose}>Remove</MenuItem>
        <MenuItem onClick={handleClose}>New Cell</MenuItem>
        <MenuItem onClick={handleClose}>Parent</MenuItem>
      </Menu>
    </>
  );
}

function AddDaughter() {
  return (
    <IconButton size='small'>
      <AddCircleOutlineIcon />
    </IconButton>
  );
}

function Daughters() {
  const daughters = useDaughters();

  const styles = useStyles();

  return (
    <Box className={styles.daughters}>
      {daughters.map(label => (
        <Daughter label={label} key={label} />
      ))}
      <AddDaughter />
    </Box>
  );
}

function Division() {
  const styles = useStyles();
  return (
    <ArcherContainer>
      <Box className={styles.division}>
        <Parent />
        <Daughters />
      </Box>
    </ArcherContainer>
  );
}

export default Division;
