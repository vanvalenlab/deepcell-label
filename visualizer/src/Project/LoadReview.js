import { useInterpret, useSelector } from '@xstate/react';
import { useState } from 'react';
import Project from './Project';
import ProjectContext from './ProjectContext';
import ReviewContext from './ReviewContext';
import createReviewMachine from './service/reviewMachine';

function LoadReview({ ids }) {
  const [reviewMachine] = useState(createReviewMachine(ids.split(',')));
  const review = useInterpret(reviewMachine);
  const project = useSelector(review, (state) => {
    const { projectId, projects } = state.context;
    return projects[projectId];
  });
  const track = useSelector(project, (state) => state.context.track);

  return (
    <ReviewContext review={review}>
      <ProjectContext project={project}>
        <Project review={true} track={track} />
      </ProjectContext>
    </ReviewContext>
  );
}

export default LoadReview;
