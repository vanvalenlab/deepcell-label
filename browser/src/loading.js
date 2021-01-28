
const $ = require('jquery');

document.getElementById('loading-bar').classList.add('active');
$.ajax({
  type: 'POST',
  url: `${document.location.origin}/api/project?source=s3&bucket=${inputBucket}&path=${path}`,
  async: true
}).done((payload) => { window.location = `/project/${payload.projectId}?bucket=${outputBucket}`; });
