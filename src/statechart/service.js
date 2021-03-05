import { interpret } from "xstate";
import labelMachine from './statechart';
import rawAdjustMachine from './rawAdjustMachine';
import labelAdjustMachine from './labelAdjustMachine';


export const labelService = interpret(labelMachine);
labelService.start();

export const rawAdjustService = interpret(rawAdjustMachine);
rawAdjustService.start();

export const labelAdjustService = interpret(labelAdjustMachine);
labelAdjustService.start();