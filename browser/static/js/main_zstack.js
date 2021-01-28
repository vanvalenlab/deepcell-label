import { Controller } from './controller.js';

export function startDeepCellLabel(settings) {
  window.controller = new Controller(settings.token);
}
