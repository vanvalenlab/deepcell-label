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

function Label() {
  const id = new URLSearchParams(window.location.search).get('projectId');
  const review = isReview(id);
  const invalid = !isProjectId(id) && !review;

  if (invalid) {
    return <InvalidId id={id} />;
  }

  if (review) {
    return <LoadProjects ids={id} />;
  }

  return <LoadProject id={id} />;
}

export default Label;
