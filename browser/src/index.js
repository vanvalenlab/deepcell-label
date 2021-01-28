import M from 'materialize-css';
import Dropzone from 'dropzone';
import $ from 'jquery';

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
});

Dropzone.autoDiscover = false;

$(function() {
  var myDropzone = new Dropzone('#myDropzone', {
    timeout: 1000 * 60 * 5, // 5 minutes
  });
  myDropzone.on('success', function(file, payload) {
    // Called when file finishes uploading
    window.location = `project/${payload.projectId}`;
  });
})

// Enable submit button after selecting example file
const submitButton = document.getElementById('submitExample');
const exampleFiles = document.getElementById('exampleFiles');
exampleFiles.onchange = () => { submitButton.disabled = false };
