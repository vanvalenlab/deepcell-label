import { useMachine } from '@xstate/react';
import { useEffect, useState } from 'react';
import { interpret } from 'xstate';
import Display from './Display';
import ProjectContext from './ProjectContext';
import createLoadMachine from './service/loadMachine';
import createProjectMachine from './service/projectMachine';

function Load({ id, spots }) {
  const [loadMachine] = useState(createLoadMachine(id));
  const [load] = useMachine(loadMachine);
  const [project] = useState(interpret(createProjectMachine(id)).start());
  window.dcl = project;
  window.loadMachine = load;
  const [track, setTrack] = useState(false);

  useEffect(() => {
    if (load.matches('loaded')) {
      const { raw, labeled, labels, spots, lineage, overlaps } = load.context;
      setTrack(lineage !== null && lineage !== undefined);
      project.send({
        type: 'LOADED',
        raw,
        labeled,
        labels,
        spots,
        lineage,
        overlaps,
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
