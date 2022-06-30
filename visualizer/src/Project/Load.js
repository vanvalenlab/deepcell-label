import { useInterpret } from '@xstate/react';
import { useState } from 'react';
import Project from './Project';
import ProjectContext from './ProjectContext';
import createProjectMachine from './service/projectMachine';

function Load({ id }) {
  const [projectMachine] = useState(createProjectMachine(id));
  const project = useInterpret(projectMachine);
  window.dcl = project;

  return (
    <ProjectContext project={project}>
      <Project review={false} />
    </ProjectContext>
  );
}

export default Load;
