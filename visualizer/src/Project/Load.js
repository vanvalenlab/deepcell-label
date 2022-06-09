import { useInterpret, useSelector } from '@xstate/react';
import { useState } from 'react';
import Project from './Project';
import ProjectContext from './ProjectContext';
import createProjectMachine from './service/projectMachine';

function Load({ id }) {
  const [projectMachine] = useState(createProjectMachine(id));
  const project = useInterpret(projectMachine);
  window.dcl = project;
  const track = useSelector(project, (state) => state.context.track);

  return (
    <ProjectContext project={project}>
      <Project review={false} track={track} />
    </ProjectContext>
  );
}

export default Load;
