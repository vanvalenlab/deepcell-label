import { Controller } from './controller.js';
import M from 'materialize-css';
import { inspect } from '@xstate/inspect';

inspect({
  // options
  // url: 'https://statecharts.io/inspect', // (default)
  iframe: false // open in new window
});

// Initialize Materialize elements
M.AutoInit();
document.addEventListener('DOMContentLoaded', function() {
  // Initialize forms
  var elems = document.querySelectorAll('select');
  var instances = M.FormSelect.init(elems, {});
  // Initialize collapsibles
  var elems = document.querySelectorAll('.collapsible');
  var instances = M.Collapsible.init(elems, {
    accordion: true,
    inDuration: 400,
    outDuration: 400,
  });

  // Initialize tabs
  var elems = document.querySelectorAll('.tabs');
  var instances = M.Tabs.init(elems, {});
});

export function startDeepCellLabel(settings) {
  window.controller = new Controller(settings.token);
}
