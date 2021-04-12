import { interpret } from 'xstate';

import createLabelMachine, { labelMachine } from './statechart';
// import { inspect } from '@xstate/inspect';
import { Model } from './model';
import { History } from './history';
import keydownLookup from './keydownLookup';

export class Controller {
  /**
   * Retrives a Project, and sets up bindings to control Label.
   * @param {string} projectID 12 character base64 ID for Project in DeepCell Label database
   */
  constructor(projectID) {

    // Interpret the statechart
    const labelMachine = createLabelMachine(projectID);
    this.service = interpret(labelMachine); // , { devTools: true });
    // add a listener to update the info table whenever a transition occurs
    this.service.onTransition(() => { window.model?.notifyInfoChange() });
    // Start the service
    this.service.start();
    window.service = this.service;

    // Add bindings
    this.overrideScroll();
    this.addWindowBindings();
    this.addCanvasBindings();
    this.addUndoBindings();
  }

  /**
   * Disable scrolling with the wheel (on the canvas) or with keys (everywhere)
   */
  overrideScroll() {
    const canvasElement = document.getElementById('canvas');
    canvasElement.onwheel = event => event.preventDefault();
    canvasElement.onmousewheel = event => event.preventDefault();

    document.addEventListener('keydown', event => {
      if (event.key === ' ') {
        event.preventDefault();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
      }
    });
  }

  /**
   * Adds bindings to the window
   */
  addWindowBindings() {
    // TODO: why is this bound to the document instead of the window
    document.addEventListener('mouseup', e => this.service.send(e));

    window.addEventListener('keydown', event => {
      this.handleKeydown(event);
    }, false);

    window.addEventListener('keyup', event => {
      this.handleKeyup(event);
    }, false);
  }

  /**
   * Adds bindings to the interactive canvas
   */
  addCanvasBindings() {
    const canvasElement = document.getElementById('canvas');
    canvasElement.addEventListener('click', e => this.service.send(e));

    canvasElement.addEventListener('mousedown', e => this.service.send(e));
    canvasElement.addEventListener('mousemove', e => this.service.send(e));

    canvasElement.addEventListener('wheel', e => this.handleScroll(e));
    canvasElement.addEventListener('contextmenu', e => e.preventDefault());
    canvasElement.addEventListener('selectstart', e => e.preventDefault());
  }

  addUndoBindings() {
    document.getElementById('undo').onclick = () => this.service.send('UNDO');
    document.getElementById('redo').onclick = () => this.service.send('REDO');
  }

  /**
   * Handle mouse scroll to adjust contrast, brightness, or zoom
   * @param {WheelEvent} event
   */
  handleScroll(event) {
    if (event.altKey) {
      this.service.send({ type: 'ZOOM', change: Math.sign(event.deltaY) })
    } else if (event.shiftKey) {
      // shift + scroll causes horizontal scroll on mice wheels, but not trackpads
      const change = event.deltaY === 0 ? event.deltaX : event.deltaY;
      this.service.send({ type: 'SCROLLBRIGHTNESS', change: change })
    } else {
      this.service.send({ type: 'SCROLLCONTRAST', change: event.deltaY })
    }
  }

  /**
   * Handle all keybinds
   * @param {KeyboardEvent} event
   */
  handleKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'Z' || event.key === 'z')) {
      this.redo();
    } else if ((event.ctrlKey || event.metaKey) && (event.key === 'Z' || event.key === 'z')) {
      this.undo();
    } else if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
      event.preventDefault();
      this.service.send('TOGGLERGB');
    } else if (keydownLookup[event.key]) {
      this.service.send(keydownLookup[event.key]);
    }
  }

  handleKeyup(event) {
    if (event.key === ' ') {
      this.service.send('keyup.Space');
    } else if (event.key === 'Shift') {
      this.service.send('keyup.Shift');
    }
  }
}
