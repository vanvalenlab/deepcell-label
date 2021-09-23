import { interpret } from 'xstate';
import createProjectMachine from './projectMachine';
import createQualityControlMachine from './qualityControlMachine';

function createProject() {
  const location = window.location;
  const search = new URLSearchParams(location.search);
  const projectId = search.get('projectId');
  if (!projectId) {
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
  const projectIds = search.get('projectIds');
  if (!projectIds) {
    return;
  }
  const bucket = search.has('bucket') ? search.get('bucket') : 'caliban-output';
  const machine = createQualityControlMachine(projectIds.split(','), bucket);
  const qualityControl = interpret(machine); // , { devTools: true });
  qualityControl.start();
  window.qc = qualityControl;
  return qualityControl;
}

export const qualityControl = createQualityControl();
