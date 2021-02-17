import { interpret } from 'xstate';

import { deepcellLabelMachine } from './statechart';
import { Model } from './model';
import { History } from './history';
import keydownLookup from './keydownLookup';

export class Controller {
  /**
   * Retrives a Project, and sets up bindings to control Label.
   * @param {string} projectID 12 character base64 ID for Project in DeepCell Label database
   */
  constructor(projectID) {
    // Get Project from database
    const getProject = fetch(`${document.location.origin}/api/project/${projectID}`);

    // Create model and view for Project and setup bindings
    getProject.then(response => response.json()).then(project => {
      this.model = new Model(project);
      this.view = this.model.view;
      this.history = new History();

      // Interpret the statechart
      this.service = interpret(deepcellLabelMachine);
      // add a listener to update the info table whenever a transition occurs
      this.service.onTransition(() => { this.model.notifyInfoChange() });
      // Start the service
      this.service.start();

      // Enable global access
      window.model = this.model;
      window.view = this.view;
      window.service = this.service;

      this.history.initializeHistory(project.actionFrames);

      // Add bindings
      this.overrideScroll();
      this.addWindowBindings();
      this.addCanvasBindings();
      this.addUndoBindings();
    });
  }

  undo() {
    this.history.undo();
    this.model.updateMousePos(this.model.canvas.rawX, this.model.canvas.rawY);
  }

  redo() {
    this.history.redo();
    this.model.updateMousePos(this.model.canvas.rawX, this.model.canvas.rawY);
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

    // resize the canvas every time the window is resized
    window.addEventListener('resize', () => {
      waitForFinalEvent(() => {
        this.view.setCanvasDimensions();
        this.view.displayUndoRedo();
        this.view.canvasView.render();
      }, 500, 'canvasResize');
    });

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
    document.getElementById('undo').onclick = () => this.undo();
    document.getElementById('redo').onclick = () => this.redo();
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
      this.service.send('TOGGLERGB');
    } else if (keydownLookup[event.key]) {
      this.service.send(keydownLookup[event.key]);
    }
  }

  handleKeyup(event) {
    if (event.key === ' ') {
      this.service.send('keyup.space')
    }
  }
}

/**
 * Delays an event callback to prevent calling the callback too frequently.
 */
const waitForFinalEvent = (function () {
  var timers = {};
  return function (callback, ms, uniqueId) {
    if (!uniqueId) {
      uniqueId = "Don't call this twice without a uniqueId";
    }
    if (timers[uniqueId]) {
      clearTimeout(timers[uniqueId]);
    }
    timers[uniqueId] = setTimeout(callback, ms);
  };
})();
