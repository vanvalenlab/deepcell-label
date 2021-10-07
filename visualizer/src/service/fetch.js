/** Defines how to fetch project data. */
export function fetchRaw(context) {
  const { projectId, numChannels, numFrames } = context;
  const pathToRaw = `/dev/raw/${projectId}`;

  const splitBuffer = buffer => {
    const length = buffer.byteLength / numChannels / numFrames / 4; // 4 bytes per element in Float32Array
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      const frames = [];
      for (let j = 0; j < numFrames; j++) {
        const array = new Float32Array(buffer, (i * numFrames + j) * length * 4, length);
        // const blob = new Blob([array], {type: 'application/octet-stream'});
        frames.push(array);
      }
      channels.push(frames);
    }
    return channels;
  };

  return fetch(pathToRaw)
    .then(response => response.arrayBuffer())
    .then(splitBuffer);
}

export function fetchLabeled(context) {
  const { projectId, numFeatures, numFrames } = context;
  const pathToLabeled = `/dev/labeled/${projectId}`;

  const splitBuffer = buffer => {
    const length = buffer.byteLength / numFeatures / numFrames / 4; // 4 bytes for int32
    const features = [];
    for (let i = 0; i < numFeatures; i++) {
      const frames = [];
      for (let j = 0; j < numFrames; j++) {
        const array = new Int32Array(buffer, (i * numFrames + j) * length * 4, length);
        // const blob = new Blob([array], {type: 'application/octet-stream'});
        frames.push(array);
      }
      features.push(frames);
    }

    return features;
  };

  return fetch(pathToLabeled)
    .then(response => response.arrayBuffer())
    .then(splitBuffer);
}

export function fetchSemanticLabels(context) {
  const { projectId } = context;
  const pathToLabeled = `/dev/semantic-labels/${projectId}`;

  return fetch(pathToLabeled).then(res => res.json());
}
