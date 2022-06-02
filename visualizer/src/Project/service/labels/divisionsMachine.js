/** Manages division labels. */

import { assign, Machine, send } from 'xstate';
import { pure } from 'xstate/lib/actions';
import { fromEventBus } from '../eventBus';
import { combine } from './utils';

// TODO? spawn children for updating divisions (from changes in cells) vs. editing divisions (from user interactions)
// currently running in two parallel states (update and edit) in loaded

/** Replaces cell b with cell a in the divisions. */
function replace(divisions, a, b) {
  return (
    divisions
      .map((division) => {
        if (division.parent === b) {
          return { ...division, parent: a };
        }
        if (division.daughters.includes(b)) {
          const daughters = division.daughters
            .map((daughter) => (daughter === b ? a : daughter))
            // remove duplicate daughters
            .reduce((prev, curr) => (prev.includes(curr) ? prev : [...prev, curr]), []);
          return { ...division, daughters };
        }
        return division;
      })
      // remove divisions with same cell as parent and daughters
      .filter((division) => !division.daughters.includes(division.parent))
  );
}

/** Removes cell from the divisions. */
function remove(divisions, cell) {
  return divisions
    .map((division) => {
      if (division.parent === cell) {
        return { ...division, parent: null };
      }
      if (division.daughters.includes(cell)) {
        return { ...division, daughters: division.daughters.filter((d) => d !== cell) };
      }
      return division;
    })
    .filter((d) => d.parent !== null && d.daughters.length !== 0);
}

/** Swaps cells a and b in the divisions. */
function swap(divisions, a, b) {
  return (
    divisions
      .map((division) => {
        let { parent, daughters } = division;
        if (parent === a) {
          parent = b;
        } else if (parent === b) {
          parent = a;
        }
        daughters = daughters
          .map((d) => (d === a ? b : d === b ? a : d))
          // remove duplicate daughters
          .reduce((prev, curr) => (prev.includes(curr) ? prev : [...prev, curr]), []);

        return { ...division, parent, daughters };
      })
      // remove divisions with same cell as parent and daughters
      .filter((division) => !division.daughters.includes(division.parent))
  );
}

function createDivisionsMachine({ eventBuses, undoRef }) {
  return Machine(
    {
      context: {
        divisions: null,
        undoRef,
        historyRef: null,
        edit: null,
      },
      entry: send('REGISTER_LABELS', { to: undoRef }),
      invoke: [
        { id: 'eventBus', src: fromEventBus('divisions', () => eventBuses.divisions) },
        { src: fromEventBus('divisions', () => eventBuses.load, 'LOADED') },
        { src: fromEventBus('divisions', () => eventBuses.cells) }, // listen for all edit events
      ],
      id: 'divisions',
      initial: 'loading',
      states: {
        loading: {
          type: 'parallel',
          states: {
            getDivisions: {
              initial: 'waiting',
              states: {
                waiting: {
                  on: {
                    LOADED: { actions: 'setDivisions', target: 'done' },
                  },
                },
                done: { type: 'final' },
              },
            },
            getHistoryRef: {
              initial: 'waiting',
              states: {
                waiting: {
                  on: {
                    LABEL_HISTORY: {
                      target: 'done',
                      actions: 'setHistoryRef',
                    },
                  },
                },
                done: { type: 'final' },
              },
            },
          },
          onDone: { target: 'loaded' },
        },
        loaded: {
          type: 'parallel',
          states: {
            edit: {
              initial: 'idle',
              states: {
                idle: {
                  on: {
                    // from UI
                    REMOVE_DAUGHTER: { actions: 'removeDaughter', target: 'editing' },
                    ADD_DAUGHTER: { actions: 'addDaughter', target: 'editing' },
                  },
                },
                editing: {
                  entry: 'setEditEvent',
                  type: 'parallel',
                  states: {
                    getEdit: {
                      entry: 'startEdit',
                      initial: 'idle',
                      states: {
                        idle: { on: { SAVE: { target: 'done', actions: 'setEdit' } } },
                        done: { type: 'final' },
                      },
                    },
                    getEdits: {
                      initial: 'editing',
                      states: {
                        editing: {
                          on: {
                            EDITED_DIVISIONS: { target: 'done', actions: 'setEditedDivisions' },
                          },
                        },
                        done: { type: 'final' },
                      },
                    },
                  },
                  onDone: {
                    target: 'idle',
                    actions: 'finishEditing',
                  },
                },
              },
            },
            update: {
              on: {
                // from CELLS event bus
                REPLACE: { actions: [(c, e) => console.log(c, e), 'replace'] },
                DELETE: { actions: 'delete' },
                SWAP: { actions: 'swap' },
              },
            },
          },
        },
      },
    },
    {
      actions: {
        setHistoryRef: assign({ historyRef: (_, __, meta) => meta._event.origin }),
        setDivisions: assign({ divisions: (ctx, evt) => evt.divisions }),
        setEditEvent: assign({ editEvent: (ctx, evt) => evt }),
        startEdit: send('SAVE', { to: (ctx) => ctx.undoRef }),
        setEdit: assign({ edit: (ctx, evt) => evt.edit }),
        setEditedDivisions: assign({ editedDivisions: (ctx, evt) => evt.divisions }),
        finishEditing: pure((ctx) => {
          return [
            assign({ divisions: (ctx) => ctx.editedDivisions }),
            send(
              {
                type: 'SNAPSHOT',
                before: { type: 'RESTORE', divisions: ctx.divisions },
                after: { type: 'RESTORE', divisions: ctx.editedDivisions },
                edit: ctx.edit,
              },
              { to: ctx.historyRef }
            ),
          ];
        }),
        addDaughter: send((ctx, evt) => {
          const index = ctx.divisions.findIndex((d) => d.parent === evt.parent);
          let divisions;
          if (index === -1) {
            divisions = [
              ...ctx.divisions,
              { parent: evt.parent, daughters: [evt.daughter], t: evt.t },
            ];
          } else {
            divisions = [...ctx.divisions];
            const division = divisions[index];
            divisions[index] = { ...division, daughters: [...division.daughters, evt.daughter] };
          }
          return { type: 'EDITED_DIVISIONS', divisions };
        }),
        removeDaughter: send((ctx, evt) => {
          const divisions = ctx.divisions
            .map((d) =>
              d.daughters.includes(evt.daughter)
                ? {
                    ...d,
                    daughters: d.daughters.filter((cell) => cell !== evt.daughter),
                  }
                : d
            )
            .filter((d) => d.daughters.length !== 0);
          return { type: 'EDITED_DIVISIONS', divisions };
        }),
        replace: pure((ctx, evt) => {
          let divisions = replace(ctx.divisions, evt.a, evt.b);
          divisions = combine(ctx.divisions, divisions, evt.t, evt.mode);
          const before = { type: 'RESTORE', divisions: ctx.divisions };
          const after = { type: 'RESTORE', divisions: divisions };
          return [assign({ divisions }), send({ type: 'SNAPSHOT', edit: evt.edit, before, after })];
        }),
        delete: pure((ctx, evt) => {
          let divisions = remove(ctx.divisions, evt.cell);
          divisions = combine(ctx.divisions, divisions, evt.t, evt.mode);
          const before = { type: 'RESTORE', divisions: ctx.divisions };
          const after = { type: 'RESTORE', divisions: divisions };
          return [assign({ divisions }), send({ type: 'SNAPSHOT', edit: evt.edit, before, after })];
        }),
        swap: pure((ctx, evt) => {
          let divisions = swap(ctx.divisions, evt.a, evt.b);
          divisions = combine(ctx.divisions, divisions, evt.t, evt.mode);
          const before = { type: 'RESTORE', divisions: ctx.divisions };
          const after = { type: 'RESTORE', divisions: divisions };
          return [assign({ divisions }), send({ type: 'SNAPSHOT', edit: evt.edit, before, after })];
        }),
      },
    }
  );
}

export default createDivisionsMachine;
