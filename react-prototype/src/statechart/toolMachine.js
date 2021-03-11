// tool states
const paintState = {
  initial: 'idle',
  entry: assign({ trace: [] }),
  states: {
    idle: {
      on: {
        mousedown: {
          // prevents select and paint at the same time
          cond: (_, event) => !event.shiftKey,
          target: 'dragging',
          actions: 'addToTrace'
        }
      }
    },
    dragging: {
      on: {
        mousemove: { actions: 'addToTrace' },
        mouseup: { target: 'idle', actions: 'draw' },
      }
    }
  }
};

const thresholdState = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        mousedown: {
          target: 'dragging',
          actions: 'storeClick'
        }
      }
    },
    dragging: {
      on: {
        mouseup: [
          {
            target: 'idle',
            cond: 'nonemptyBox',
            actions: 'threshold'
          },
          { target: 'idle' },
        ]
      }
    }
  },
  on: {
    TOGGLERGB: {
      target: 'paint',
      in: '#deepcellLabel.rgb.oneChannel'
    },
  }
};

const floodState = {
  on: {
    click: { actions: 'flood' }
  }
};

const trimState = {
  on: {
    click: { actions: 'trim' }
  }
};

const erodeDilateState = {
  on: {
    mousedown: {
      actions: choose([
        {
          cond: 'leftMouse',
          actions: 'erode'
        },
        {
          cond: 'rightMouse',
          actions: 'dilate'
        }
      ])
    }
  }
};

const autofitState = {
  on: {
    click: { actions: 'autofit' },
    TOGGLERGB: {
      target: 'paint',
      in: '#deepcellLabel.rgb.oneChannel'
    },
  }
};

const watershedState = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        click: {
          cond: 'validSeed',
          target: 'clicked',
          actions: 'storeClick'
        }
      }
    },
    clicked: {
      on: {
        click: {
          cond: 'validSecondSeed',
          actions: 'watershed'
        }
      }
    }
  },
  on: {
    TOGGLERGB: {
      target: 'paint',
      in: '#deepcellLabel.rgb.oneChannel'
    },
  }
};

const divideState = {
  entry: 'resetDaughters',
  initial: 'noDaughters',
  states: {
    noDaughters: {
      on: {
        click: {
          cond: 'validDaughter',
          target: 'daughters',
          actions: 'storeDaughter',
        }
      }
    },
    daughters: {
      on: {
        click: {
          cond: 'validDaughter',
          actions: 'storeDaughter',
        },
        'keydown.Enter': { actions: 'divide' }
      }
    }
  },
  on: {
    'keydown.Escape': {
      target: '.noDaughters',
      actions: 'resetDaughters'
    }
  }
};

const toolState = {
  initial: 'paint',
  states: {
    flood: floodState,
    trim: trimState,
    erodeDilate: erodeDilateState,
    autofit: autofitState,
    paint: paintState,
    threshold: thresholdState,
    watershed: watershedState,
    divide: divideState,
    hist: { type: 'history' },
  },
  on: {
    LOADING: 'loading',
    'keydown.b': '.paint',
    'keydown.g': '.flood',
    'keydown.k': '.trim',
    'keydown.q': '.erodeDilate',
    // tools not available in RGB mode
    'keydown.t': {
      target: '.threshold',
      in: '#deepcellLabel.rgb.oneChannel'
    },
    'keydown.m': {
      target: '.autofit',
      in: '#deepcellLabel.rgb.oneChannel'
    },
    'keydown.w': {
      target: '.watershed',
      in: '#deepcellLabel.rgb.oneChannel'
    },
    'keydown.p': {
      target: '.divide',
      // in: '#deepcellLabel.app.tracking'
    }
  }
};