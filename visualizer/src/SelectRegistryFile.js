import { Box, Button, LinearProgress, makeStyles, Select } from '@material-ui/core';
import axios from 'axios';
import { useEffect, useState } from 'react';

const useStyles = makeStyles(theme => ({
  selectRegistry: {
    margin: theme.spacing(1),
    maxWidth: '300px',
    boxSizing: 'border-box',
    display: 'flex',
  },
  loadButton: {
    width: '100%',
  },
}));

function SelectRegistryFile() {
  const styles = useStyles();
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/registry-files').then(res => {
      setFiles(res.data.files);
    });
  }, []);

  // TODO: create state machine that can receive PROJECT event
  useEffect(() => {
    const location = window.location;
    const search = new URLSearchParams(location.search);
    const projectId = search.get('projectId');
    axios.get(`/api/project/${projectId}`).then(res => {
      setFile(res.data.path);
    });
  }, []);

  const onClick = () => {
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    axios({
      method: 'post',
      url: '/api/project-from-registry',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(({ data }) => (window.location.href = `/project?projectId=${data.projectId}`));
  };

  return (
    <Box className={styles.selectRegistry}>
      <Select native value={file} onChange={event => setFile(event.target.value)}>
        {files.map(file => (
          <option key={file} value={file}>
            {file}
          </option>
        ))}
      </Select>
      <Button
        id='loadFromRegistry'
        variant='contained'
        color='primary'
        onClick={onClick}
        disabled={loading}
      >
        Load
      </Button>
      {loading && <LinearProgress />}
    </Box>
  );
}

export default SelectRegistryFile;
