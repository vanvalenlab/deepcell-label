/** Defines how to fetch project data. */
export function fetchRaw(context) {
  const { projectId, numChannels, duration, height, width } = context;

  const splitBuffer = (buffer) => {
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      const frames = [];
      for (let j = 0; j < duration; j++) {
        const frame = [];
        for (let k = 0; k < height; k++) {
          const row = new Uint8Array(buffer, ((i * duration + j) * height + k) * width, width);
          frame.push(row);
          // const blob = new Blob([array], {type: 'application/octet-stream'});
        }
        frames.push(frame);
      }
      channels.push(frames);
    }
    return channels;
  };

  return fetch(`/api/raw/${projectId}`)
    .then((response) => response.arrayBuffer())
    .then(splitBuffer);
}

export function fetchLabeled(context) {
  const { projectId, numFeatures, duration, height, width } = context;
  const pathToLabeled = `/api/labeled/${projectId}`;

  const splitBuffer = (buffer) => {
    const features = [];
    for (let i = 0; i < numFeatures; i++) {
      const frames = [];
      for (let j = 0; j < duration; j++) {
        const frame = [];
        for (let k = 0; k < height; k++) {
          const row = new Int32Array(buffer, ((i * duration + j) * height + k) * width * 4, width);
          // const blob = new Blob([array], {type: 'application/octet-stream'});
          frame.push(row);
        }
        frames.push(frame);
      }
      features.push(frames);
    }

    return features;
  };

  return fetch(pathToLabeled)
    .then((response) => response.arrayBuffer())
    .then(splitBuffer);
}

export function fetchLabels(context) {
  const { projectId } = context;
  const pathToLabeled = `/api/labels/${projectId}`;

  return fetch(pathToLabeled).then((res) => res.json());
}
