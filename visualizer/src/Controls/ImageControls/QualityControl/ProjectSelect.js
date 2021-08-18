import { Select, Tooltip } from '@material-ui/core';
import { useSelector } from '@xstate/react';
import { useQualityControl } from '../../../QualityControl';

function ProjectSelect() {
  const qualityControl = useQualityControl();

  const projectId = useSelector(qualityControl, state => state.context.projectId);
  const projectIds = useSelector(qualityControl, state => state.context.projectIds);

  const onChange = e => {
    console.log(e.target.value, typeof e.target.value);
    qualityControl.send({ type: 'SET_PROJECT', projectId: e.target.value });
  };

  const tooltip = (
    <span>
      Cycle with <kbd>TODO</kbd> or <kbd>Shift</kbd> + <kbd>TODO</kbd>
    </span>
  );

  return (
    <Tooltip title={tooltip}>
      <Select native value={projectId} onChange={onChange}>
        {projectIds.map(projectId => (
          <option key={projectId} value={projectId}>
            {projectId}
          </option>
        ))}
      </Select>
    </Tooltip>
  );
}

export default ProjectSelect;
