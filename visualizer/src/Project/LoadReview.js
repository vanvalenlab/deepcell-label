import { useActor, useInterpret, useSelector } from '@xstate/react';
import { useEffect, useState } from 'react';
import Display from './Display';
import ProjectContext from './ProjectContext';
import ReviewContext from './ReviewContext';
import createReviewMachine from './service/reviewMachine';

function LoadReview({ ids, spots }) {
  const [reviewMachine] = useState(createReviewMachine(ids.split(',')));
  const review = useInterpret(reviewMachine);
  const project = useSelector(review, (state) => {
    const { projectId, projects } = state.context;
    return projects[projectId];
  });
  const loader = useSelector(review, (state) => {
    const { projectId, loaders } = state.context;
    return loaders[projectId];
  });
  const [load] = useActor(loader);

  const [track, setTrack] = useState(false);

  useEffect(() => {
    if (load.matches('loaded')) {
      const { rawArrays, labeledArrays, labels, spots, lineage, overlaps } = load.context;
      setTrack(lineage !== null);
      project.send({
        type: 'LOADED',
        rawArrays,
        labeledArrays,
        labels,
        spots,
        lineage,
        overlaps,
      });
    }
  }, [load, project]);

  return (
    <ReviewContext review={review}>
      <ProjectContext project={project}>
        <Display review={true} track={track} spots={spots} />
      </ProjectContext>
    </ReviewContext>
  );
}

export default LoadReview;
