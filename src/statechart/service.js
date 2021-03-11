import { interpret } from "xstate";
import labelMachine from './statechart';
import rawAdjustMachine from './rawAdjustMachine';
import labelAdjustMachine from './labelAdjustMachine';
import canvasMachine from './canvasMachine';

export const labelService = interpret(labelMachine);
labelService.start();

export const rawAdjustService = interpret(rawAdjustMachine);
rawAdjustService.start();

export const labelAdjustService = interpret(labelAdjustMachine);
labelAdjustService.start();

export const canvasService = interpret(canvasMachine);
canvasService.start();
