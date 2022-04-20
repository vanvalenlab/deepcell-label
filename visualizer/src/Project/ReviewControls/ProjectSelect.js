import { FormLabel, MenuItem, TextField } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import { useReview } from '../ReviewContext';

function ProjectSelect() {
  const review = useReview();

  const projectId = useSelector(review, (state) => state.context.projectId);
  const projectIds = useSelector(review, (state) => state.context.projectIds);

  // Adds mousetrap class so hotkeys work after using switch
  const inputRef = useRef();
  useEffect(() => {
    const select = inputRef.current;
    select.className = `${select.className}  mousetrap`;
  }, []);

  const onChange = (e) => {
    review.send({ type: 'SET_PROJECT', projectId: e.target.value });
  };

  return (
    <>
      <FormLabel>Project</FormLabel>
      <TextField select size='small' value={projectId} onChange={onChange} inputRef={inputRef}>
        {projectIds.map((projectId) => (
          <MenuItem key={projectId} value={projectId}>
            {projectId}
          </MenuItem>
        ))}
      </TextField>
    </>
  );
}

export default ProjectSelect;
