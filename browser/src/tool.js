import { Controller } from './controller.js';
import { inspect } from '@xstate/inspect';

inspect({
  // options
  // url: 'https://statecharts.io/inspect', // (default)
  iframe: false // open in new window
});

export function startDeepCellLabel(settings) {
  window.controller = new Controller(settings.token);
}
