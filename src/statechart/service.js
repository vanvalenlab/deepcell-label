import { interpret } from "xstate";
import labelMachine from './statechart';

export const labelService = interpret(labelMachine);
labelService.start();