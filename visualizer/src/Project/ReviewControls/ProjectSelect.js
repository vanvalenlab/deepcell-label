import { FormLabel, MenuItem, TextField } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useMousetrapRef } from '../ProjectContext';
import { useReview } from '../ReviewContext';

function ProjectSelect() {
  const review = useReview();

  const projectId = useSelector(review, (state) => state.context.projectId);
  const projectIds = useSelector(review, (state) => state.context.projectIds);

  const inputRef = useMousetrapRef();

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
