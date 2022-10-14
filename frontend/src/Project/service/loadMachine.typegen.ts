// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true;
  eventsCausingActions: {
    'set spots': 'done.invoke.load.loading:invocation[0]';
    'set divisions': 'done.invoke.load.loading:invocation[0]';
    'set cells': 'done.invoke.load.loading:invocation[0]';
    'set cellTypes': 'done.invoke.load.loading:invocation[0]';
    'set metadata': 'done.invoke.load.loading:invocation[0]';
    'send project not in output bucket': 'error.platform.load.loading:invocation[0]';
    'set arrays': 'done.invoke.load.splitArrays:invocation[0]';
    'send loaded': 'done.invoke.load.splitArrays:invocation[0]';
  };
  internalEvents: {
    'done.invoke.load.loading:invocation[0]': {
      type: 'done.invoke.load.loading:invocation[0]';
      data: unknown;
      __tip: 'See the XState TS docs to learn how to strongly type this.';
    };
    'error.platform.load.loading:invocation[0]': {
      type: 'error.platform.load.loading:invocation[0]';
      data: unknown;
    };
    'done.invoke.load.splitArrays:invocation[0]': {
      type: 'done.invoke.load.splitArrays:invocation[0]';
      data: unknown;
      __tip: 'See the XState TS docs to learn how to strongly type this.';
    };
    'xstate.init': { type: 'xstate.init' };
  };
  invokeSrcNameMap: {
    'fetch project zip': 'done.invoke.load.loading:invocation[0]';
    'split arrays': 'done.invoke.load.splitArrays:invocation[0]';
  };
  missingImplementations: {
    actions: never;
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingServices: {
    'fetch project zip': 'xstate.init';
    'split arrays': 'done.invoke.load.loading:invocation[0]';
  };
  eventsCausingGuards: {};
  eventsCausingDelays: {};
  matchesStates: 'loading' | 'splitArrays' | 'loaded';
  tags: never;
}
