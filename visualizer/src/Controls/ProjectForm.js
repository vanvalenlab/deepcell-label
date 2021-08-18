import { IconButton, TextField } from '@material-ui/core';
import RefreshIcon from '@material-ui/icons/Refresh';
import { useSelector } from '@xstate/react';
import * as React from 'react';
import { useProject } from '../ServiceContext';

function FetchProject() {
  return (
    <IconButton type='submit'>
      <RefreshIcon />
    </IconButton>
  );
}

function ProjectForm() {
  const project = useProject();
  const currentId = useSelector(project, state => state.context.projectId);
  const [id, setId] = React.useState(currentId);

  const handleSubmit = e => {
    e.preventDefault();
    project.send({
      type: 'SET_PROJECT',
      projectId: id,
    });
  };

  const [error, setError] = React.useState(false);
  const [errorText, setErrorText] = React.useState('');

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete='off'>
      <TextField
        label='Project ID'
        variant='outlined'
        value={id}
        fullWidth
        onChange={e => setId(e.target.value)}
        error={error}
        helperText={errorText}
        InputProps={{ endAdornment: <FetchProject /> }}
      />
    </form>
  );
}

export default ProjectForm;
