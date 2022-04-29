import InvalidId from './InvalidId';
import LoadProject from './Load';
import LoadProjects from './LoadReview';

/** Checks if id is a 12 character URL-safe base64 string
  URL-safe base 64 uses - instead of + and _ instead of /
  @param {string} id
  @returns {boolean}
*/
function isProjectId(id) {
  const projectIdRegex = /^[\w-]{12}$/;
  return projectIdRegex.test(id);
}

/** Checks if ids is a comma separated list of valid project IDs
 */
function isReview(ids) {
  const idList = ids?.split(',');
  return idList?.every(isProjectId) && idList?.length > 1;
}

function Project() {
  const id = new URLSearchParams(window.location.search).get('projectId');
  const review = isReview(id);
  const invalid = !isProjectId(id) && !review;
  const track = new URLSearchParams(window.location.search).get('track');
  const spots = process.env.REACT_APP_SPOTS_VISUALIZER === 'true';
  const caliban = process.env.REACT_APP_CALIBAN_VISUALIZER === 'true';
  const edit = !spots && !caliban;

  if (invalid) {
    return <InvalidId id={id} />;
  }

  if (review) {
    return <LoadProjects ids={id} edit={edit} track={track} />;
  }

  return <LoadProject id={id} edit={edit} track={track} />;
}

export default Project;
