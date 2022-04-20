import { useMachine } from '@xstate/react';
import { useEffect, useState } from 'react';
import { interpret } from 'xstate';
import createLoadMachine from '../service/loadMachine';
import createProjectMachine from '../service/projectMachine';
import Display from './Display';
import ProjectContext from './ProjectContext';

function Load({ id, track, spots }) {
  const [loadMachine] = useState(createLoadMachine(id));
  const [load] = useMachine(loadMachine);
  const [project] = useState(interpret(createProjectMachine(id)).start());
  window.dcl = project;
  window.loadMachine = load;

  useEffect(() => {
    if (load.matches('loaded')) {
      console.log('loaded');
      const { rawArrays, labeledArrays, labels, spots } = load.context;
      project.send({
        type: 'LOADED',
        rawArrays,
        labeledArrays,
        labels,
        spots,
      });
    }
  }, [load, project]);

  return (
    <ProjectContext project={project}>
      <Display review={false} track={track} spots={spots} />
    </ProjectContext>
  );
}

export default Load;
