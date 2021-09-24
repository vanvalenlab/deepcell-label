import { interpret } from 'xstate';
import createProjectMachine from './projectMachine';

const location = window.location;
const search = new URLSearchParams(location.search);
const projectId = search.get('projectId');
const bucket = search.has('bucket') ? search.get('bucket') : 'caliban-output';
const machine = createProjectMachine(projectId, bucket);
const service = interpret(machine); // , { devTools: true });
service.start();
window.dcl = service;

export default service;
