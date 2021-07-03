import { Box, IconButton, makeStyles } from '@material-ui/core';
import Avatar from '@material-ui/core/Avatar';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import { useTheme } from '@material-ui/core/styles';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import { useSelector } from '@xstate/react';
import React from 'react';
import { ArcherContainer, ArcherElement } from 'react-archer';
import { useFeature, useLabeled, useTracking } from '../../ServiceContext';

function useColors() {
  const labeled = useLabeled();
  const featureIndex = useSelector(labeled, state => state.context.feature);
  const feature = useFeature(featureIndex);
  const colors = useSelector(feature, state => state.context.colors);
  return colors;
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
    height: '40px',
    width: '40px',
  },
  addButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '100%',
  },
}));

function Parent({ label }) {
  const tracking = useTracking();
  const division = useSelector(tracking, state => state.context.labels[label]);
  const { daughters, frame_div } = division;
  const colors = useColors();
  const color = colors[label];

  const styles = useStyles();
  const theme = useTheme();

  const strokeColor = theme.palette.secondary.main;
  const relations = daughters.map(label => ({
    targetId: `daughter${label}`,
    targetAnchor: 'left',
    sourceAnchor: 'right',
    style: { strokeColor, strokeWidth: 1, noCurves: true },
  }));
  relations.push({
    targetId: 'addDaughter',
    targetAnchor: 'left',
    sourceAnchor: 'right',
    style: { strokeColor, strokeWidth: 1, noCurves: true },
  });
  return (
    <ArcherElement id='parent' relations={relations}>
      <Avatar className={styles.cell} style={{ backgroundColor: color }}>
        {label}
      </Avatar>
    </ArcherElement>
  );
}

function Daughter({ label, daughter, frame_div }) {
  const styles = useStyles();

  const tracking = useTracking();
  const { send } = tracking;

  const [anchorEl, setAnchorEl] = React.useState(null);
  const handleClick = event => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleRemove = () => {
    send({ type: 'REMOVE', daughter: daughter });
    handleClose();
  };

  const handleNewCell = () => {
    send({ type: 'REPLACE_WITH_NEW_CELL', daughter: daughter });
    handleClose();
  };

  const handleParent = () => {
    send({ type: 'REPLACE_WITH_PARENT', parent: label, daughter: daughter });
    handleClose();
  };

  return (
    <>
      <ArcherElement id={`daughter${daughter}`}>
        <Avatar
          className={styles.cell}
          onClick={handleClick}
          style={{ backgroundColor: color }}
        >
          {daughter}
        </Avatar>
      </ArcherElement>
      <Menu
        id='simple-menu'
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleRemove}>Remove from Division</MenuItem>
        <MenuItem onClick={handleNewCell}>Replace with New Cell</MenuItem>
        <MenuItem onClick={handleParent}>Replace with Parent</MenuItem>
      </Menu>
    </>
  );
}

function AddDaughter({ label }) {
  const styles = useStyles();

  const tracking = useTracking();
  const onClick = () => tracking.send({ type: 'ADD', parent: label });

  return (
    <Box style={{ position: 'relative' }}>
      <ArcherElement id='addDaughter'>
        <Avatar className={styles.cell} style={{ visibility: 'hidden' }} />
      </ArcherElement>
      <IconButton className={styles.addButton} onClick={onClick}>
        <AddCircleOutlineIcon />
      </IconButton>
    </Box>
  );
}

function Daughters({ label }) {
  const styles = useStyles();

  const tracking = useTracking();
  const division = useSelector(tracking, state => state.context.labels[label]);
  const { daughters, frame_div } = division;

  return (
    <Box className={styles.daughters}>
      {daughters.map(daughter => (
        <Daughter
          label={label}
          daughter={daughter}
          frame_div={frame_div}
          key={daughter}
        />
      ))}
      <AddDaughter label={label} />
    </Box>
  );
}

function Division({ label }) {
  const styles = useStyles();

  const tracking = useTracking();
  const division = useSelector(tracking, state => state.context.labels[label]);

  return (
    <ArcherContainer>
      <Box className={styles.division}>
        {division && <Parent label={label} />}
        {division && <Daughters label={label} />}
      </Box>
    </ArcherContainer>
  );
}

export default Division;
