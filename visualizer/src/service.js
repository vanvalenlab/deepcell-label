import { interpret } from 'xstate';
import createDeepcellLabelMachine from './statechart/deepcellLabelMachine';

const location = window.location;
const search = new URLSearchParams(location.search);
const projectId = search.get('projectId');
const machine = createDeepcellLabelMachine(projectId);
const service = interpret(machine); // , { devTools: true });
service.start();
window.dcl = service;

export default service;