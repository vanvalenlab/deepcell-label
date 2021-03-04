import { interpret } from "xstate";
import labelMachine from './statechart';
import rawAdjustMachine from './rawAdjustMachine';

export const labelService = interpret(labelMachine);
labelService.start();

export const rawAdjustService = interpret(rawAdjustMachine);
rawAdjustService.start();