import React from 'react';
import Typography from '@material-ui/core/Typography';

const OverviewInstructions = () => {
  return <>
    <Typography>
      DeepCell Label is a tool for correcting labels on biological images.
      <br/>
      Label shows an Control Panel on the left 
      and an interactive Canvas on the right
      <br/>
      See the Control Panel and the Canvas tab for their controls.
      <br/>
      {/* We edit the labels by selecting them and then by clicking on the canvas, or pressing keybinds.
      See the Select Labels, Tools, and Actions tabs to learn more. */}
    </Typography>
  </>;
};

export default OverviewInstructions;