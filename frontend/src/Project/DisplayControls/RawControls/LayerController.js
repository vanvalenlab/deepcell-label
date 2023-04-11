/** Modified from https://github.com/hms-dbmi/viv */
import DeleteIcon from '@mui/icons-material/Delete';
import { IconButton, MenuItem, TextField } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import { useSelector } from '@xstate/react';
import { useReducer, useRef, useState } from 'react';
import { useMousetrapRef, useRaw } from '../../ProjectContext';
import LayerOptions from './LayerOptions';

function LayerSelector({ layer, typing, toggleType }) {
  const channel = useSelector(layer, (state) => state.context.channel);
  const index = useSelector(layer, (state) => state.context.layer);

  const raw = useRaw();
  const names = useSelector(raw, (state) => state.context.channelNames);
  const [name, setName] = useState(names[channel]);
  const focusRef = useRef(null);

  const onChange = (e) => {
    layer.send({ type: 'SET_CHANNEL', channel: Number(e.target.value) });
    raw.send({ type: 'EDIT_CHANNEL', channel: Number(e.target.value), index: index });
  };

  // Handler to ensure hotkeys don't get used + Enter to finish typing
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      focusRef.current.blur();
    }
    event.stopPropagation();
  };

  // Handler for when text is being typed
  const handleType = (event) => {
    setName(event.target.value);
  };

  // Handler for when text is finished being typed (hit enter or click away)
  const handleBlur = (event) => {
    if (name.length > 0) {
      toggleType();
      raw.send({ type: 'EDIT_NAME', channel: channel, name: name });
    }
  };

  return typing ? (
    <TextField
      error={name.length === 0}
      helperText={name.length === 0 ? 'Min 1 character' : ''}
      inputProps={{ maxLength: 20 }}
      id='standard-basic'
      defaultValue={name}
      label='Channel Name'
      autoFocus={true}
      inputRef={focusRef}
      size='small'
      onChange={handleType}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  ) : (
    <TextField select size='small' value={channel} onChange={onChange} sx={{ width: 130 }}>
      {names.map((opt, index) => (
        <MenuItem key={index} value={index}>
          {opt}
        </MenuItem>
      ))}
    </TextField>
  );
}

function LayerCheckbox({ layer }) {
  const color = useSelector(layer, (state) => {
    const { color } = state.context;
    return color === '#FFFFFF' ? '#000000' : color;
  });
  const isOn = useSelector(layer, (state) => state.context.on);

  return (
    <Checkbox
      onChange={() => layer.send('TOGGLE_ON')}
      checked={isOn}
      sx={{
        color: color,
        '&.Mui-checked': {
          color: color,
        },
        p: 0,
      }}
    />
  );
}

function LayerRemove({ layer }) {
  const color = useSelector(layer, (state) => {
    const { color } = state.context;
    return color === '#FFFFFF' ? '#000000' : color;
  });
  const raw = useRaw();
  const index = useSelector(layer, (state) => state.context.layer);

  const handleRemove = () => {
    raw.send({ type: 'REMOVE_LAYER', layer, index });
  };

  return (
    <IconButton sx={{ marginLeft: 1.3 }} onClick={handleRemove}>
      <DeleteIcon sx={{ color: color, fontSize: 22 }} />
    </IconButton>
  );
}

function LayerSlider({ layer }) {
  const range = useSelector(layer, (state) => state.context.range);
  const color = useSelector(layer, (state) => {
    const { color } = state.context;
    return color === '#FFFFFF' ? '#000000' : color;
  });
  const inputRef = useMousetrapRef();

  const onChange = (_, value) => layer.send({ type: 'SET_RANGE', range: value });
  const onDoubleClick = () => layer.send({ type: 'SET_RANGE', range: [0, 255] });

  return (
    <Slider
      value={range}
      onChange={onChange}
      onDoubleClick={onDoubleClick}
      valueLabelDisplay='off'
      min={0}
      max={255}
      step={1}
      size='small'
      orientation='horizontal'
      sx={{ color: color, p: 0, '& .MuiSlider-thumb': { height: 15, width: 15 } }}
      componentsProps={{ input: { ref: inputRef } }}
    />
  );
}

function LayerController({ layer }) {
  const raw = useRaw();
  const numChannels = useSelector(raw, (state) => state.context.numChannels);
  const [typing, toggleType] = useReducer((v) => !v, false);

  return (
    <Grid container direction='column' justifyContent='center'>
      {numChannels > 1 && (
        <>
          <Grid container direction='row'>
            <Grid item xs={10.5}>
              {numChannels > 1 && (
                <LayerSelector layer={layer} typing={typing} toggleType={toggleType} />
              )}
            </Grid>
            <Grid item xs={1.5}>
              <LayerOptions layer={layer} toggleType={toggleType} />
            </Grid>
          </Grid>
        </>
      )}
      <Grid container direction='row' alignItems='center'>
        <Grid item xs={3}>
          <LayerCheckbox layer={layer} />
        </Grid>
        <Grid container item xs={6.5} alignItems='center'>
          <LayerSlider layer={layer} />
        </Grid>
        <Grid container item xs={2.5}>
          <LayerRemove layer={layer} />
        </Grid>
      </Grid>
    </Grid>
  );
}

export default LayerController;
