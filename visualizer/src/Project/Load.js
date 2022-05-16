import { useInterpret, useSelector } from '@xstate/react';
import Display from './Display';
import ProjectContext from './ProjectContext';
import createProjectMachine from './service/projectMachine';

function Load({ id, spots }) {
  const project = useInterpret(createProjectMachine(id));
  window.dcl = project;
  const track = useSelector(project, (state) => state.context.track);

  return (
    <ProjectContext project={project}>
      <Display review={false} track={track} />
    </ProjectContext>
  );
}

export default Load;
