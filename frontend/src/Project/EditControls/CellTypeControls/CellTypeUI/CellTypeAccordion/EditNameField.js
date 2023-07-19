import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useEditCellTypes } from '../../../../ProjectContext';

const textStyle = {
  marginTop: 3,
  marginLeft: 15,
  marginBottom: 10,
};

function EditNameField(props) {
  const { id, cellName, typing, toggleType } = props;
  const [name, setName] = useState(null);
  const editCellTypesRef = useEditCellTypes();
  const focusRef = useRef(null);

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
      editCellTypesRef.send({ type: 'NAME', cellType: id, name: name });
    }
  };

  // Needed so that name updates on change and undo
  useEffect(() => {
    setName(cellName);
  }, [cellName]);

  return (
    <div style={textStyle}>
      {typing ? (
        <TextField
          sx={{ width: '80%' }}
          error={name.length === 0}
          inputProps={{ maxLength: 15 }}
          id='standard-basic'
          defaultValue={name}
          label='Cell Type'
          autoFocus={true}
          inputRef={focusRef}
          onChange={handleType}
          onKeyDown={handleKeyDown}
          onClick={handleKeyDown}
          onBlur={handleBlur}
          size='small'
        />
      ) : (
        <Typography>{name}</Typography>
      )}
    </div>
  );
}

export default EditNameField;
