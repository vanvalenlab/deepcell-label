/** Fetches data from the project storage API, including raw image data, label image data, and labels. */

import * as zip from '@zip.js/zip.js';
import { assign, createMachine } from 'xstate';
import { loadOmeTiff } from '@hms-dbmi/viv';

type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];
type UnboxPromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

type OmeTiff = UnboxPromise<ReturnType<typeof loadOmeTiff>>;
type TiffPixelSource = PropType<OmeTiff, 'data'>[number];
type Spots = number[][];
type Cells = {
  [feature: number]: {
    [cell: number]: {
      label: number;
      frames: number[];
    };
  };
};
type Lineage = {
  [cell: number]: {
    label: number;
    frames: number[];
    divisionFrame: number | null;
    parentDivisionFrame: number | null;
    daughters: number[];
    capped: boolean;
    parent: number | null;
  };
};
type Files = {
  [filename: string]: OmeTiff | Spots | Cells | Lineage;
};

async function parseZip(response: Response) {
  const blob = await response.blob();
  const reader = new zip.ZipReader(new zip.BlobReader(blob));
  const entries = await reader.getEntries();
  await reader.close();
  const files: Files = {};
  for (const entry of entries) {
    if (entry.filename.endsWith('.ome.tiff')) {
      // @ts-ignore
      const data = await entry.getData(new zip.BlobWriter());
      const omeTiff: OmeTiff = await loadOmeTiff(data);
      files[entry.filename] = omeTiff;
    }
    if (entry.filename === 'spots.csv') {
      // @ts-ignore
      const csv = await entry.getData(new zip.TextWriter());
      const spots: Spots = csv.split('\n').map((row: string) => row.split(',').map(Number));
      files[entry.filename] = spots;
    }
    if (entry.filename === 'cells.json') {
      // @ts-ignore
      const json = await entry.getData(new zip.TextWriter());
      const cells: Cells = JSON.parse(json);
      files[entry.filename] = cells;
    }
    if (entry.filename === 'lineage.json') {
      // @ts-ignore
      const json = await entry.getData(new zip.TextWriter());
      const lineage: Lineage = JSON.parse(json);
      files[entry.filename] = lineage;
    }
  }
  return { files };
}

function fetchZip(context: Context) {
  const { projectId } = context;
  return fetch(`/api/project/${projectId}`).then(parseZip);
}

async function splitArrays(files: Files) {
  const rawFile = files['X.ome.tiff'] as OmeTiff;
  const labeledFile = files['y.ome.tiff'] as OmeTiff;
  const rawArrays = await getRawRasters(rawFile.data[0]);
  const labeledArrays = await getLabelRasters(labeledFile.data[0]);
  return { rawArrays, labeledArrays };
}

async function getRawRasters(source: TiffPixelSource) {
  const { labels, shape } = source;
  const c = shape[labels.indexOf('c')];
  const z = shape[labels.indexOf('z')];
  const channels = [];
  for (let i = 0; i < c; i++) {
    const frames = [];
    for (let j = 0; j < z; j++) {
      const selection = { t: 0, c: i, z: j };
      const raster = (await source.getRaster({ selection })) as Raster;
      const frame = splitRows(raster) as Uint8Array[];
      frames.push(frame);
    }
    channels.push(frames);
  }
  return channels;
}

async function getLabelRasters(source: TiffPixelSource) {
  const { labels, shape } = source;
  const c = shape[labels.indexOf('c')];
  const z = shape[labels.indexOf('z')];
  const channels = [];
  for (let i = 0; i < c; i++) {
    const frames = [];
    for (let j = 0; j < z; j++) {
      const selection = { t: 0, c: i, z: j };
      const raster = (await source.getRaster({ selection })) as Raster;
      const frame = splitRows(raster) as Int32Array[];
      frames.push(frame);
    }
    channels.push(frames);
  }
  return channels;
}

type Raster = { data: Uint8Array | Int32Array; width: number; height: number };

function splitRows(raster: Raster) {
  const { data, width, height } = raster;
  const frame = [];
  for (let i = 0; i < height; i++) {
    const row =
      data instanceof Uint8Array
        ? new Uint8Array(data.buffer, width * i, width)
        : new Int32Array(data.buffer, width * i * 4, width);
    frame.push(row);
  }
  return frame;
}

interface Context {
  projectId: string;
  // dimensions: string | null;
  // shape: [number, number, number, number] | null;
  width: number | null;
  height: number | null;
  numFrames: number | null;
  numChannels: number | null;
  numFeatures: number | null;
  rawArrays: Uint8Array[][][] | null;
  labeledArrays: Int32Array[][][] | null;
  labels: Cells | null;
  spots: Spots | null;
  lineage: Lineage | null;
}

const createLoadMachine = (projectId: string) =>
  createMachine(
    {
      context: {
        projectId,
        // dimensions: null,
        // shape: null,
        width: null,
        height: null,
        numFrames: null,
        numChannels: null,
        numFeatures: null,
        rawArrays: null,
        labeledArrays: null,
        labels: null,
        spots: null,
        lineage: null,
      },
      tsTypes: {} as import('./loadMachine.typegen').Typegen0,
      schema: {
        context: {} as Context,
        services: {} as {
          'fetch project zip': {
            data: {
              files: Files;
            };
          };
          'split arrays': {
            data: {
              rawArrays: Uint8Array[][][];
              labeledArrays: Int32Array[][][];
            };
          };
        },
      },
      id: 'load',
      initial: 'loading',
      states: {
        loading: {
          invoke: {
            src: 'fetch project zip',
            onDone: {
              target: 'splitArrays',
              actions: ['set spots', 'set cells', 'set lineage', 'set metadata'],
            },
          },
        },
        splitArrays: {
          invoke: {
            src: 'split arrays',
            onDone: { target: 'loaded', actions: 'set arrays' },
          },
        },
        loaded: {
          type: 'final',
        },
      },
    },
    {
      services: {
        'fetch project zip': fetchZip,
        'split arrays': (ctx, evt) => splitArrays(evt.data.files),
      },
      actions: {
        'set spots': assign({
          // @ts-ignore
          spots: (context, event) => event.data.files['spots.csv'] as Spots,
        }),
        'set cells': assign({
          // @ts-ignore
          labels: (context, event) => event.data.files['cells.json'] as Cells,
        }),
        'set lineage': assign({
          // @ts-ignore
          lineage: (context, event) => event.data.files['lineage.json'] as Lineage,
        }),
        'set metadata': assign((ctx, evt) => {
          // @ts-ignore
          const { metadata } = evt.data.files['X.ome.tiff'];
          const { SizeX, SizeY, SizeZ, SizeT, SizeC } = metadata.Pixels;
          // @ts-ignore
          const { metadata: labelMetadata } = evt.data.files['y.ome.tiff'];
          const { SizeC: labelSizeC } = labelMetadata;
          return {
            width: SizeX,
            height: SizeY,
            numFrames: SizeZ,
            // SizeT,
            numChannels: SizeC,
            numFeatures: labelSizeC,
          };
        }),
        'set arrays': assign({
          rawArrays: (_, event) => event.data.rawArrays,
          labeledArrays: (_, event) => event.data.labeledArrays,
        }),
      },
    }
  );

export default createLoadMachine;
