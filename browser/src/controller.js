import { interpret } from 'xstate';
import { inspect } from '@xstate/inspect';
import $ from 'jquery';

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
    // Interpret the machine, and add a listener for whenever a transition occurs.
    const service = interpret(deepcellLabelMachine, { devTools: true });
    inspect({
      iframe: false,
      url: 'https://statecharts.io/inspect'
    });
    // Start the service
    service.start();
    this.service = service;
    // allow global access to service
    window.service = service;

    // Get Project from database
    const getProject = $.ajax({
      type: 'GET',
      url: `${document.location.origin}/api/project/${projectID}`,
      async: true
    });

    // Create model and view for Project and setup bindings
    getProject.done((project) => {
      this.model = new Model(project);
      this.view = this.model.view;
      this.history = new History();
      // TODO: fix initializeHistory to work with new Actions
      // this.history.initializeHistory(project.actionFrames);

      window.model = this.model;
      window.view = this.view;

      this.overrideScroll();
      this.addWindowBindings();
      this.addCanvasBindings();
      this.addUndoBindings();
    });
  }

  undo() {
    this.history.undo();
    this.model.updateMousePos(this.model.canvas.rawX, this.model.canvas.rawY);
    this.model.notifyImageChange();
  }

  redo() {
    this.history.redo();
    this.model.updateMousePos(this.model.canvas.rawX, this.model.canvas.rawY);
    this.model.notifyImageChange();
  }

  /**
   * Disable scrolling with the wheel (on the canvas) or with keys (everywhere)
   */
  overrideScroll() {
    const canvasElement = document.getElementById('canvas');
    canvasElement.onwheel = (event) => { event.preventDefault(); };
    canvasElement.onmousewheel = (event) => { event.preventDefault(); };

    // disable space and up/down keys from moving around on page
    document.addEventListener('keydown', (event) => {
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
    document.addEventListener('mouseup', (e) => this.service.send(e));

    // resize the canvas every time the window is resized
    window.addEventListener('resize', () => {
      waitForFinalEvent(() => {
        this.view.setCanvasDimensions();
        this.view.displayUndoRedo();
        this.view.canvasView.render();
      }, 500, 'canvasResize');
    });

    window.addEventListener('keydown', (evt) => {
      this.handleKeydown(evt);
    }, false);

    window.addEventListener('keyup', (evt) => {
      this.handleKeyup(evt);
    }, false);
  }

  /**
   * Adds bindings to the interactive canvas
   */
  addCanvasBindings() {
    const canvasElement = document.getElementById('canvas');
    canvasElement.addEventListener('click', (e) => this.service.send(e));
    canvasElement.addEventListener('mousedown', (e) => this.service.send(e));
    canvasElement.addEventListener('mousemove', (e) => this.service.send(e));

    canvasElement.addEventListener('wheel', (e) => this.handleScroll(e));
    canvasElement.addEventListener('contextmenu', (e) => e.preventDefault());
    canvasElement.addEventListener('selectstart', (e) => e.preventDefault());
  }

  addUndoBindings() {
    document.getElementById('undo').onclick = () => this.undo();
    document.getElementById('redo').onclick = () => this.redo();
  }

  /**
   * Handle mouse scroll to adjust contrast, brightness, or zoom
   * @param {WheelEvent} evt
   */
  handleScroll(evt) {
    if (evt.altKey) {
      this.service.send({ type: 'ZOOM', change: Math.sign(evt.deltaY) })
    } else if (evt.shiftKey) {
      // shift + scroll causes horizontal scroll on mice wheels, but not trackpads
      const change = evt.deltaY === 0 ? evt.deltaX : evt.deltaY;
      this.service.send({ type: 'SCROLLBRIGHTNESS', change: change })
    } else {
      this.service.send({ type: 'SCROLLCONTRAST', change: evt.deltaY })
    }
  }

  /**
   * Handle all keybinds
   * @param {KeyboardEvent} evt
   */
  handleKeydown(evt) {
    if ((evt.ctrlKey || evt.metaKey) && evt.shiftKey && (evt.key === 'Z' || evt.key === 'z')) {
      this.redo();
    } else if ((evt.ctrlKey || evt.metaKey) && (evt.key === 'Z' || evt.key === 'z')) {
      this.undo();
    } else if ((evt.ctrlKey || evt.metaKey) && evt.key === 'b') {
      this.service.send('TOGGLERGB');
    } else if (keydownLookup[evt.key]) {
      this.service.send(keydownLookup[evt.key]);
    }
  }

  handleKeyup(evt) {
    if (evt.key === ' ') {
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
