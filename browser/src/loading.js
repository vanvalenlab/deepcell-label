document.getElementById('loading-bar').classList.add('active');
const createProject = fetch(
  `${document.location.origin}/api/project?source=s3&bucket=${inputBucket}&path=${path}`,
  { method: 'POST' }
).then(response => response.json());
createProject.then((data) => { window.location = `/project/${data.projectId}?bucket=${outputBucket}`; });