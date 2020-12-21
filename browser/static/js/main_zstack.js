
var adjuster; 

var controller;

function upload_file(cb) {
  $.ajax({
    type: 'POST',
    url: `${document.location.origin}/api/upload/${outputBucket}/${project_id}`,
    async: true
  }).done(cb);
}

function startDeepCellLabel(settings) {
  // outputBucket = settings.output_bucket;
  // rgb = settings.rgb;
  // display_labels = !settings.rgb;
  // edit_mode = !settings.label_only;

  controller = new Controller(settings.token);

  // getProject(settings.token, rgb, handleFirstPayload);
}
