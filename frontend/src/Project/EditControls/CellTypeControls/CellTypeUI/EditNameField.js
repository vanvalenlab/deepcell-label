import TextField from '@mui/material/TextField';
import { useRef, useState } from 'react';
import { useEditCellTypes } from '../../../ProjectContext';

const textStyle = {
    marginTop: 5,
    marginLeft: -10,
};

function EditNameField(props) {
    const { id, cellName, typing, toggleType } = props;
    const [name, setName] = useState(cellName);
    const editCellTypesRef = useEditCellTypes();
    const focusRef = useRef(null)

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

    return (
        <div style={textStyle}> 
            {typing ? <TextField 
                        error={name.length === 0}
                        helperText={name.length === 0 ? 'Min 1 character' : ''}
                        inputProps={{ maxLength: 20 }}
                        id="standard-basic"
                        defaultValue={name}
                        label="Cell Type"
                        autoFocus={true}
                        inputRef={focusRef}
                        onChange={handleType}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                    />
                    : name} 
        </div>
    );
};

export default EditNameField;
