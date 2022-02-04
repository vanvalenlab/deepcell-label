import { interpret } from 'xstate';
import createProjectMachine from './projectMachine';
import createQualityControlMachine from './qualityControlMachine';

export function isProjectId(id) {
  // Checks id is a 12 character URL-safe base64 string
  // URL-safe base 64 uses - instead of + and _ instead of /
  const projectIdRegex = /^[\w-]{12}$/;
  return projectIdRegex.test(id);
}

export function isQualityControl(ids) {
  // Checks ids is a comma separated list of project IDs
  return ids.split(',').every(isProjectId);
}

function createProject() {
  const location = window.location;
  const search = new URLSearchParams(location.search);
  const projectId = search.get('projectId');
  if (!projectId || projectId.split(',').length > 1) {
    return;
  }
  const bucket = search.has('bucket') ? search.get('bucket') : 'caliban-output';
  const machine = createProjectMachine(projectId, bucket);
  const service = interpret(machine); // , { devTools: true });
  service.start();
  window.dcl = service;
  return service;
}

export const project = createProject();

function createQualityControl() {
  const location = window.location;
  const search = new URLSearchParams(location.search);
  const projectId = search.get('projectId');
  if (!projectId || projectId.split(',').length <= 1) {
    return;
  }
  const bucket = search.has('bucket') ? search.get('bucket') : 'caliban-output';
  const machine = createQualityControlMachine(projectId.split(','), bucket);
  const qualityControl = interpret(machine); // , { devTools: true });
  qualityControl.start();
  window.qc = qualityControl;
  return qualityControl;
}

export const qualityControl = createQualityControl();
