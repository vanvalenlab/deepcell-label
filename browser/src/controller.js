import { interpret } from 'xstate';
import { inspect } from '@xstate/inspect';
import $ from 'jquery';

import { deepcellLabelMachine } from './statechart.js';
import { Model } from './model.js';
import { History } from './history.js';

export class Controller {
  /**
   * Retrives a Project, and sets up bindings to control Label.
   * @param {string} projectID 12 character base64 ID for Project in DeepCell Label database
   */
  constructor(projectID) {
    // Interpret the machine, and add a listener for whenever a transition occurs.
    const context = {
      ...deepcellLabelMachine.initialState.context,
      id: projectID,
    }
    const service = interpret(deepcellLabelMachine.withContext(context), { devTools: true });
    inspect({
      iframe: false, // () => document.querySelector('iframe[data-xstate]'),
      url: 'https://statecharts.io/inspect'
    });
    // Start the service
    service.start();
    this.service = service;

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

      window.model = this.model;
      window.view = this.view;

      this.history = new History();
      // TODO: fix initializeHistory to work with new Actions
      // this.history.initializeHistory(project.actionFrames);

      this.overrideScroll();
      this.addWindowBindings();
      this.addCanvasBindings();

      this.view.setCanvasDimensions();

      this.addUndoBindings();
      this.view.displayUndoRedo();
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
   * Disable scrolling with the wheel (on the canvas) or with arrows (everywhere)
   */
  overrideScroll() {
    document.addEventListener('wheel', (event) => {
      if (this.model.onCanvas) event.preventDefault();
    }, { passive: false });

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
        // this.view.canvasView.brushView.refresh();
        this.view.displayUndoRedo();
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
  }

  addUndoBindings() {
    const undoButton = document.getElementById('undo');
    const redoButton = document.getElementById('redo');

    undoButton.onclick = () => this.undo();
    redoButton.onclick = () => this.redo();
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
      this.service.send('REDO');
    } else if ((evt.ctrlKey || evt.metaKey) && (evt.key === 'Z' || evt.key === 'z')) {
      this.service.send('UNDO');
    } else if (evt.key === 'z') {
      this.service.send('keydown.z');
    } else if (evt.key === 'a') {
      this.service.send('keydown.a');
    } else if (evt.key === 'ArrowLeft') {
      this.service.send('keydown.left');
    } else if (evt.key === 'd') {
      this.service.send('keydown.d');
    } else if (evt.key === 'ArrowRight') {
      this.service.send('keydown.right');
    } else if (evt.key === '-') {
      this.service.send({ type: 'ZOOM', change: 1 });
    } else if (evt.key === '=') {
      this.service.send({ type: 'ZOOM', change: -1 });
    } else if (evt.key === '0') {
      this.service.send('keydown.0');
    } else if (evt.key === 'h') {
      this.service.send('keydown.h');
    } if (evt.key === 'ArrowDown') {
      this.service.send({ type: 'SETSIZE', size: this.model.brush.size - 1 });
    } else if (evt.key === 'ArrowUp') {
      this.service.send({ type: 'SETSIZE', size: this.model.brush.size + 1 });
    } else if (evt.key === 'i') {
      this.service.send('keydown.i');
    } else if (evt.key === 'n') {
      this.service.send('keydown.n');
    } else if (evt.key === 'c') {
      this.service.send('keydown.c');
    } else if (evt.key === 'C') {
      this.service.send('keydown.C');
    } else if (evt.key === 'f') {
      this.service.send('keydown.f');
    } else if (evt.key === 'F') {
      this.service.send('keydown.F');
    } else if (evt.key === ']') {
      this.service.send('keydown.]');
    } else if (evt.key === '[') {
      this.service.send('keydown.[');
    } else if (evt.key === '}') {
      this.service.send('keydown.}');
    } else if (evt.key === '{') {
      this.service.send('keydown.{');
    } else if (evt.key === 'x') {
      this.service.send('keydown.x');
    } else if (evt.key === 'p') {
      this.service.send('keydown.p');
    } else if (evt.key === 'r') {
      this.service.send('keydown.r');
    } else if (evt.key === 't') {
      this.service.send('keydown.t');
    } else if (evt.key === 'w') {
      this.service.send('keydown.w');
    } else if (evt.key === ' ') {
      this.service.send('keydown.space');
    } else if (evt.key === 'b') {
      this.service.send('keydown.b');
    } else if (evt.key === 'k') {
      this.service.send('keydown.k');
    } else if (evt.key === 'q') {
      this.service.send('keydown.q');
    } else if (evt.key === 'm') {
      this.service.send('keydown.m');
    } else if (evt.key === 's') {
      this.service.send('keydown.s');
    } else if (evt.key === 'S') {
      this.service.send('keydown.S')
    } else if (evt.key === 'r') {
      this.service.send('keydown.r')
    } else if (evt.key === 'R') {
      this.service.send('keydown.R')
    } else if (evt.key === 'o') {
      this.service.send('keydown.o')
    } else if (evt.key === 'O') {
      this.service.send('keydown.O')
    } else if (evt.key === 'g') {
      this.service.send('keydown.g')
    } else if (evt.key === 'Enter') {
      this.service.send('keydown.Enter')
    } else if (evt.key === 'Escape') {
      this.service.send('keydown.Escape')
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
