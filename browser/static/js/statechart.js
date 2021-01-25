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
const { choose } = actions;

// guards
const leftMouse = (context, event) => event.button === 0;
const rightMouse = (context, event) => event.button === 2;
const shiftLeftMouse = (context, event) => event.button === 0 && event.shiftKey;
const shiftRightMouse = (context, event) => event.button === 2 && event.shiftKey;
const twoLabels = (context, event) => true;

// actions
const updateCanvas = (context, event) => {
  model.notifyImageChange();
};

const pan = (context, event) => {
  const zoom = 100 / (model.canvas.zoom * model.canvas.scale);
  controller.history.addAction(new Pan(model, event.movementX * zoom, event.movementY * zoom));
};

const editLabels = (context, event) => {
  return $.ajax({
    type: 'POST',
    url: `${document.location.origin}/api/edit/${model.projectID}/${event.action}`,
    data: event.args,
    async: true
    })
};

const addToTrace = assign({trace: context => [...context.trace, [canvas.imgY, canvas.imgX]]});

const resetTrace = assign({trace: []});

const draw = send((context, event) => ({
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
}));

const selectLabel = choose([
  {
    cond: (context, event) => event.shiftKey && event.button === 0,
    actions: () => controller.history.addAction(new SelectForeground(model)),
  },
  {
    cond: (context, event) => event.shiftKey && event.button === 2,
    actions: () => controller.history.addAction(new SelectBackground(model)),
  }
]);

const swapLabels = () => controller.history.addAction(new SwapForegroundBackground(model));

const setThreshold = assign({
  threshX: () => model.canvas.imgX,
  threshY: () => model.canvas.imgY,
});

const threshold = send((context, event) => ({
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
}));

const flood = send(() => ({
  type: 'EDIT',
  action: 'flood',
  args: {
    label: model.selected.label,
    x_location: model.canvas.imgX,
    y_location: model.canvas.imgY,
  }
}));

const trim = send(() => ({
  type: 'EDIT',
  action: 'trim_pixels',
  args: {
    label: model.canvas.label,
    frame: model.frame,
    x_location: model.canvas.imgX,
    y_location: model.canvas.imgY
  }
}));

const erode = send(() => ({
  type: 'EDIT',
  action: 'erode',
  args: {
    label: model.canvas.label,
  }
}));

const dilate = send(() => ({
  type: 'EDIT',
  action: 'dilate',
  args: {
    label: model.canvas.label,
  }
}));

const autofit = send(() => ({
  type: 'EDIT',
  action: 'active_contour',
  args: {
    label: model.canvas.label,
  }
}));

const predictFrame = send(() => ({
  type: 'EDIT',
  action: 'predict_single', 
  args: {
    frame: model.frame,
  }
}));

const predictAll = send({
  type: 'EDIT',
  action: 'predict_zstack',
  args: {}
});

const swapFrame = send(() => ({
  type: 'EDIT', 
  action: 'swap_single_frame', 
  args: {        
    label_1: model.selected.label,
    label_2: model.selected.secondLabel,
    frame: model.frame,
  }
}));

const replaceFrame = send(() => ({
  type: 'EDIT', 
  action: 'replace_single', 
  args: {        
    label_1: model.selected.label,
    label_2: model.selected.secondLabel,
    // frame: model.frame ???
  }
}));

const replaceAll = send(() => ({
  type: 'EDIT', 
  action: 'replace', 
  args: {        
    label_1: model.selected.label,
    label_2: model.selected.secondLabel,
  }
}));

const changeContrast = (context, event) => controller.history.addAction(new ChangeContrast(model, event.change));
const changeBrightness = (context, event) => controller.history.addAction(new ChangeBrightness(model, event.change));
const toggleHighlight = () => controller.history.addAction(new ToggleHighlight(model));
const resetBrightnessContrast = () => controller.history.addAction(new ResetBrightnessContrast(model));
const toggleInvert = () => controller.history.addAction(new ToggleInvert(model));

const zoomIn = () => controller.history.addAction(new Zoom(model, -1));
const zoomOut = () => controller.history.addAction(new Zoom(model, 1));
const updateMousePos  = (context, event) => model.updateMousePos(event.offsetX, event.offsetY);

const setBrushSize = (context, event) => model.brush.size = event.size;


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
          actions: 'pan',
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
    src: (context, event) => {
      controller.history.addAction(new ChangeFrame(model, event.value));
      return $.ajax({
        type: 'POST',
        url: `${document.location.origin}/api/changedisplay/${model.projectID}/${event.dimension}/${model.frame}`,
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

const paintState = {
  initial: 'idle',
  entry: 'resetTrace',
  states: {
    idle: {
      on: {
        'mousedown': {
          cond: (context, event) => event.button === 0 && !event.shiftKey,
          target: 'dragging',
          actions: 'addToTrace',
        }
      }
    },
    dragging: {
      on: {
        'mousemove': {
          actions: 'addToTrace',
        },
        'mouseup': {
          actions: 'draw',
        }
      }
    }
  }
};

const selectState = {
  on: {
    'mousedown': {
      actions: 'selectLabel'
    },
    'keydown.x': {
      actions: 'swapLabels',
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
          actions: 'setThreshold',
        }
      }
    },
    dragging: {
      on: {
        'mouseup': {
          actions: 'threshold',
        }
      }
    }
  }
};

const floodState = {
  on: {
    'click': {
      actions: 'flood'
    }
  }
};

const trimState = {
  on: {
    'click': {
      actions: 'trim',
    }
  }
};

const erodeDilateState = {
  on: {
    'mousedown': {
      actions: choose([
        {
          cond: (context, event) => event.button === 0,
          actions: 'erode',
        },
        {
          cond: (context, event) => event.button === 2,
          actions: 'dilate',
        },
      ])
    },
  }
};

const autofitState = {
  on: {
    'click': {
      actions: 'autofit',
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
    hist: { type: 'history' },
  },
  on: {
    'keydown.o': {
      actions: 'predictFrame',
    },
    'keydown.O': {
      actions: 'predictAll',
    },
    'keydown.s' : {
      // cond: () => true, // two different labels selected
      actions: 'swapFrame',
    },
    'keydown.r': {
      cond: () => true, // two different labels selected
      actions: 'replaceFrame',
    },
    'keydown.R': {
      cond: () => true, // two different labels selected
      actions: 'replaceAll',
    },
    'keydown.a': {
      actions: [
        send(() => ({type: 'SETFRAME', dimension: 'frame', value: model.frame - 1})),
      ],
    },
    'keydown.left': {
      actions: send(() => ({type: 'SETFRAME', dimension: 'frame', value: model.frame - 1})),
    },
    'keydown.d': {
      actions: send(() => ({type: 'SETFRAME', dimension: 'frame', value: model.frame + 1})),
    },
    'keydown.right': {
      actions: send(() => ({type: 'SETFRAME', dimension: 'frame', value: model.frame + 1})),
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
    // external transitions
    'keydown.space': 'pan',
    EDIT: 'loadEdit',
    SETFRAME: 'loadFrame'
  }
};

const adjusterState = {
  on: {
    SCROLLCONTRAST: {
      actions: 'changeContrast',
    },
    SCROLLBRIGHTNESS: {
      actions: 'changeBrightness',
    },
    'keydown.h': {
      actions: 'toggleHighlight',
    },
    'keydown.0': {
      actions: 'resetBrightnessContrast',
    },
    'keydown.i': {
      actions: 'toggleInvert',
    }
  }
};

const canvasState = {
  on: {
    ZOOMIN: {
      actions: 'zoomIn',
    },
    ZOOMOUT: {
      actions: 'zoomOut',
    },
    'mousemove': {
      actions: 'updateMousePos',
    }
  }
};

const brushState = {
  on: {
    SETSIZE: {
      actions: 'setBrushSize',
    }
  }
};

const displayState = {
  initial: 'overlay',
  states: {
    overlay: {
      on: {
        'keydown.z': {
          target: 'labels',
          actions: 'updateCanvas',
        }
      }
    },
    labels: {
      on: {
        'keydown.z': {
          target: 'raw',
          actions: 'updateCanvas',
        }
      }
    },
    raw: {
      on: {
        'keydown.z': {
          target: 'overlay',
          actions: 'updateCanvas',
        }
      }
    },
  }
}

const labelState = {
  initial: 'edit',
  states: {
    edit: editState,
    pan: panState,
    loadEdit: loadEditState,
    loadFrame: loadFrameState,
  },
};

const deepcellLabelMachine = Machine(
  {
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
      display: displayState,
      adjuster: adjusterState,
      canvas: canvasState,
      select: selectState,
      brush: brushState,
    }
  },
  {
    actions: {
      updateCanvas: updateCanvas,
      pan: pan,
      editLabels: editLabels,
      addToTrace: addToTrace,
      resetTrace: resetTrace,
      draw: draw,
      selectLabel: selectLabel,
      swapLabels: swapLabels,
      setThreshold: setThreshold,
      threshold: threshold,
      flood: flood,
      erode: erode,
      dilate: dilate,
      autofit: autofit,
      predictFrame: predictFrame,
      predictAll: predictAll,
      swapFrame: swapFrame,
      replaceFrame: replaceFrame,
      replaceAll: replaceAll,
      changeContrast: changeContrast,
      changeBrightness: changeBrightness,
      toggleHighlight: toggleHighlight,
      resetBrightnessContrast: resetBrightnessContrast,
      toggleInvert: toggleInvert,
      zoomIn: zoomIn,
      zoomOut: zoomOut,
      updateMousePos: updateMousePos,
      setBrushSize: setBrushSize,
    },
    guards: {
      leftMouse: leftMouse,
      rightMouse: rightMouse,
      shiftLeftMouse: shiftLeftMouse,
      shiftRightMouse: shiftRightMouse,
      twoLabels: twoLabels,
    },
  }
);
