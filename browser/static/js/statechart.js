/**
 * Defines the statechart for Label in XState.
 */

// TODO: 
// undo/redo with backend promises
// ChangeFrame/Feature/Channel

// KEYBINDS
// watershed
// replace/swap after current frame

const { Machine, actions, interpret, assign, send } = XState;

const panState = {
  initial: 'idle',
  states: {
    idle: {
      on: {'mousedown': 'panning'},
    },
    panning: {
      on: {
        'mouseup': 'idle',
        'mousemove': {
          actions: (_, event) => {
            const zoom = 100 / (model.canvas.zoom * model.canvas.scale);
            controller.history.addAction(new Pan(model, event.movementX * zoom, event.movementY * zoom));
          }
        },
      },
    },
  },
  on: {
    'keyup.space': {
      target: 'edit.hist',
    },
  }
};

const loadEditState = {
  invoke: {
    id: 'backend',
    src: (context, event) => {
      return $.ajax({
        type: 'POST',
        url: `${document.location.origin}/api/edit/${model.projectID}/${event.action}`,
        data: event.args,
        async: true
        })
    },
    onDone: {
      target: 'edit.hist',
      actions: [
        (_, event) => console.log(event),
        (_, event) => model.handlePayload(event.data),
        // () => controller.history.addFence(),
      ]
    },
    onError: {
      target: 'edit.hist',
      actions: [
        (_, event) => console.log(event.data),
      ]
    }
  }
};

const loadFrameState = {
  invoke: {
    id: 'backend',
    src: () => Promise.resolve(),
    // src: (context, event) => {
    //   $.ajax({
    //     type: 'POST',
    //     url: `${document.location.origin}/api/changedisplay/${model.projectID}/${event.displayAttr}/${event.value}`,
    //     async: true
    //   })
    // },
    onDone: {
      target: 'edit.hist',
      actions: [
        (_, event) => console.log(event),
        // (_, event) => handlePayload(event),
        // () => controller.history.addFence(),
      ]
    },
    onError: {
      target: 'edit.hist',
      actions: [
        (_, event) => console.log(event.data),
      ]
    }
  }
};

const paintState = {
  initial: 'idle',
  entry: {
    actions: assign({trace: []}),
  },
  states: {
    idle: {
      on: {
        'mousedown': {
          target: 'dragging',
          actions: [
            assign({trace: () => [[canvas.imgY, canvas.imgX]]}),
          ]
        }
      }
    },
    dragging: {
      on: {
        'mousemove': {
          actions: [
            assign({
              trace: context => [...context.trace, [canvas.imgY, canvas.imgX]]
            }),
          ]
        },
        'mouseup': {
          actions: [
            send((context, event) => ({
                type: 'EDIT',
                action: 'handle_draw',
                args: {
                  trace: JSON.stringify(context.trace),
                  brush_value: model.selected.label,
                  target_value: model.selected.secondLabel,
                  brush_size: model.brush.size,
                  frame: model.frame,
                  erase: false,
                }
              })
            )
          ]
        }
      }
    }
  }
};

const selectState = {
  on: {
    // select foreground label
    'click': {
      actions: () => { controller.history.addAction(new SelectForeground(model)); }
    },
    // select background label
    'shiftclick': {
      actions: () => { controller.history.addAction(new SelectBackground(model)); }
    },
  }
};

const thresholdState = {
  initial: 'idle',
  entry: {
    actions: assign({
      threshX: -10, // -2 * model.padding,
      threshY: -10, // -2 * model.padding,
    })
  },
  states: {
    idle: {
      on: {
        'mousedown': {
          target: 'dragging',
          actions: [
            assign({
              threshX: () => model.canvas.imgX,
              threshY: () => model.canvas.imgY,
            })
          ]
        }
      }
    },
    dragging: {
      on: {
        'mousemove': {
          target: 'dragging',
          // action to update threshold box? or can that be handled by a threshold CSS class for the brush?
        },
        'mouseup': {
          actions: [
            send((context, event) => ({
              type: 'EDIT',
              action: 'threshold',
              args: {
                y1: context.threshY,
                x1: context.threshX,
                y2: model.canvas.imgY,
                x2: model.canvas.imgX,
                frame: model.frame,
                label: model.selected.label,
              }
            }))
          ]
        }
      }
    }
  }
};

const floodState = {
  on: {
    'click': {
      actions: [
        send({
          type: 'EDIT',
          action: 'flood',
          args: {
            label: 1, // model.selected.label,
            background: 0, // model.canvas.label, 
            frame: 0, // model.frame,
            x_location: 0, // model.canvas.imgX,
            y_location: 0, // model.canvas.imgY
          }
        })
      ]
    }
  }
};

const trimState = {
  on: {
    'click': {
      actions: [
        send(() => ({
          type: 'EDIT',
          action: 'trim_pixels',
          args: {
            label: model.canvas.label,
            frame: model.frame,
            x_location: model.canvas.imgX,
            y_location: model.canvas.imgY
          }
        }))
      ]
    }
  }
};

// TODO: left click (or smthing else) to dilate
const erodeDilateState = {
  on: {
    'click': {
      actions: [
        send(() => ({
          type: 'EDIT',
          action: 'erode',
          args: {
            label: model.canvas.label,
          }
        }))
      ]
    }
  }
};

const autofitState = {
  on: {
    'click': {
      actions: [
        send(() => ({
          type: 'EDIT',
          action: 'active_contour',
          args: {
            label: model.canvas.label,
          }
        }))
      ]
    }
  }
};

const editState = {
  initial: 'paint',
  states: {
    paint: paintState,
    threshold: thresholdState,
    flood: floodState,
    trim: trimState,
    erodeDilate: erodeDilateState,
    autofit: autofitState,
    select: selectState,
    hist: { type: 'history' },
  },
  on: {
    // actions
    'keydown.p': {
      actions: send({
        type: 'EDIT', 
        action: 'predict_single', 
        args: {        
          frame: 0 // model.frame,
        }
      }),
    },
    'keydown.P': {
      type: 'EDIT', 
      action: 'predict', 
      args: {}
    },
    'keydown.s' : {
      // cond: () => true, // two different labels selected
      actions: send(() => ({
        type: 'EDIT', 
        action: 'swap_single_frame', 
        args: {        
          label_1: model.selected.label,
          label_2: model.selected.secondLabel,
          frame: model.frame,
        }
      })),
    },
    'keydown.S': {
      cond: () => true, // two different labels selected
      actions: send({
        type: 'EDIT', 
        action: 'swap_all_frame', 
        args: {        
          label_1: 1, // model.selected.label,
          label_2: 2, // model.selected.secondLabel
        }
      }),
    }, // swap on all frames
    // replace on one frame
    'keydown.r': {
      cond: () => true, // two different labels selected
      actions: send({
        type: 'EDIT', 
        action: 'replace_single', 
        args: {        
          label_1: 1, // model.selected.label,
          label_2: 2, // model.selected.secondLabel
          // frame: model.frame ???
        }
      }),
    },
    // replace on all frames
    'keydown.R': {
      cond: () => true, // two different labels selected
      actions: send({
        type: 'EDIT', 
        action: 'replace_all', 
        args: {        
          label_1: 1, // model.selected.label,
          label_2: 2, // model.selected.secondLabel
        }
      }),
    },
    // previous frame 
    'keydown.a': {
      actions: send({type: 'SETFRAME', dimension: 'frame', value: 0}), // model.frame - 1}),
    },
    'keydown.left': {
      actions: send({type: 'SETFRAME', dimension: 'frame', value: 0}), // model.frame - 1}),
    },
    // next frame
    'keydown.d': {
      actions: send({type: 'SETFRAME', dimension: 'frame', value: 0}), // model.frame + 1}),
    },
    'keydown.right': {
      actions: send({type: 'SETFRAME', dimension: 'frame', value: 0}), // model.frame + 1}),
    },
    // flip foreground backgroiund
    'keydown.x': {
      actions: () => controller.history.addAction(new SwapForegroundBackground(model))
    },
    'keydown.n': {
      actions: () => controller.history.addAction(new ResetLabels(model))
    },
    UNDO: { actions: () => controller.history.undo() },
    REDO: { actions: () => controller.history.redo() },
    // internal transitions
    'keydown.b': '.paint',
    'keydown.t': '.threshold',
    'keydown.f': '.flood',
    'keydown.k': '.trim',
    'keydown.q': '.erodeDilate',
    'keydown.m': '.autofit',
    'keydown.p': '.select',
    // external transitions
    'keydown.space': 'pan',
    EDIT: 'loadEdit',
    SETFRAME: 'loadFrame'
  }
};


const adjusterState = {
  on: {
    SCROLLCONTRAST: {
      actions: (context, event) => controller.history.addAction(new ChangeContrast(model, event.change))
    },
    SCROLLBRIGHTNESS: {
      actions: (context, event) => controller.history.addAction(new ChangeBrightness(model, event.change))
    },
    'keydown.h': {
      actions: () => controller.history.addAction(new ToggleHighlight(model)),
    },
    'keydown.0': {
      actions: () => controller.history.addAction(new ResetBrightnessContrast(model)),
    },
    'keydown.i': {
      actions: () => controller.history.addAction(new ToggleInvert(model)),
    }
  }
};

const canvasState = {
  on: {
    ZOOMIN: {
      actions: [
        () => controller.history.addAction(new Zoom(model, -1)),
      ]
    },
    ZOOMOUT: {
      actions: [
        () => controller.history.addAction(new Zoom(model, 1)),
      ]
    },
    'mousemove': {
      actions: [
        (context, event) => model.updateMousePos(event.offsetX, event.offsetY),
      ]
    }
  }
};

const brushState = {
  on: {
    SETSIZE: {
      actions: [
        (_, event) => {
          model.brush.size = event.size;
        }
      ],
    }
  }
};

const labelState = {
  initial: 'edit',
  states: {
    edit: editState,
    pan: panState,
    loadEdit: loadEditState,
    loadFrame: loadFrameState,
  },
};

const deepcellLabelMachine = Machine({
  id: 'deepcellLabel',
  type: 'parallel',
  context: {
    trace: [],
    threshX: -10, // -2 * model.padding,
    threshY: -10, // -2 * model.padding,
    frame: 0,
    channel: 0,
    feature: 0,
  },
  states: {
    label: labelState,
    adjuster: adjusterState,
    canvas: canvasState,
    brush: brushState,
  }
});