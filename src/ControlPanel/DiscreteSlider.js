import React, { useState, useEffect } from 'react';
import { Slider } from "@material-ui/core";
import Typography from '@material-ui/core/Typography';


function DiscreteSlider(props) {
  const { label, value, max, onChange } = props;
  const [display, setDisplay] = useState("on");

  // Display label for a second after the label changes
  useEffect(() => {
    setDisplay("on");
    const displayTimeout = setTimeout(() => setDisplay("auto"), 1000);
    return () => clearTimeout(displayTimeout);
  }, [value]);

  return <>
    <Typography gutterBottom>
      {label}
    </Typography>
    <Slider
      value={value}
      valueLabelDisplay={display}
      step={1}
      marks
      min={0}
      max={max}
      onChange={onChange}
    />
  </>;
}

export default DiscreteSlider;
