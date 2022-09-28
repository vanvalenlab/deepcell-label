/** Fetches data from the project storage API, including raw image data, label image data, and labels. */

import { loadOmeTiff } from '@hms-dbmi/viv';
import * as zip from '@zip.js/zip.js';
import { assign, createMachine, sendParent } from 'xstate';

type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];
type UnboxPromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

type OmeTiff = UnboxPromise<ReturnType<typeof loadOmeTiff>>;
type TiffPixelSource = PropType<OmeTiff, 'data'>[number];
type Spots = [number, number][];
type Divisions = { parent: number; daughters: number[]; t: number }[];
type Cells = { value: number; cell: number; t: number }[];
type Files = {
  [filename: string]: OmeTiff | Spots | Cells | Divisions;
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
      let spots: Spots = csv
        .split('\n')
        .map((row: string) => row.split(',').map(Number))
        .map(([x, y]: number[]) => [x, y]); // Use only x and y columns
      spots.shift(); // Remove header row
      spots.pop(); // Remove last empty row from final newline
      files[entry.filename] = spots;
    }
    if (entry.filename === 'divisions.json') {
      // @ts-ignore
      const json = await entry.getData(new zip.TextWriter());
      const divisions: Divisions = JSON.parse(json);
      files[entry.filename] = divisions;
    }
    if (entry.filename === 'cells.json') {
      // @ts-ignore
      const json = await entry.getData(new zip.TextWriter());
      const cells = JSON.parse(json);
      files[entry.filename] = cells;
    }
  }
  return { files };
}

function fetchZip(context: Context) {
  const { projectId } = context;
  const forceLoadOutput =
    new URLSearchParams(window.location.search).get('forceLoadOutput') === 'true';
  if (forceLoadOutput) {
    const params = new URLSearchParams({ bucket: 'deepcell-label-output' });
    return fetch(`/api/project/${projectId}?` + params).then(parseZip);
  }
  return fetch(`/api/project/${projectId}`).then(parseZip);
}

async function splitArrays(files: Files) {
  const rawFile = files['X.ome.tiff'] as OmeTiff;
  const labeledFile = files['y.ome.tiff'] as OmeTiff;
  const raw = await getRawRasters(rawFile.data[0]);
  const labeled = await getLabelRasters(labeledFile.data[0]);
  const rawOriginal = await getRawOriginalRasters(rawFile.data[0]);
  return { raw, labeled, rawOriginal };
}

async function getRawOriginalRasters(source: TiffPixelSource) {
  const { labels, shape } = source;
  const c = shape[labels.indexOf('c')];
  const z = shape[labels.indexOf('z')];
  const channels = [];
  for (let i = 0; i < c; i++) {
    const frames = [];
    for (let j = 0; j < z; j++) {
      const selection = { t: 0, c: i, z: j };
      const raster = (await source.getRaster({ selection })) as Raster;
      const frame = splitRows(raster);
      frames.push(frame);
    }
    channels.push(frames);
  }
  return channels;
}

async function getRawRasters(source: TiffPixelSource) {
  const { labels, shape } = source;
  const c = shape[labels.indexOf('c')];
  const z = shape[labels.indexOf('z')];
  const channels = [];
  var max = 0;
  var min = Infinity;
  for (let i = 0; i < c; i++) {
    const frames = [];
    for (let j = 0; j < z; j++) {
      const selection = { t: 0, c: i, z: j };
      const raster = (await source.getRaster({ selection })) as Raster;
      const frame = splitRows(raster);
      // Record max and min across frames
      for (let k = 0; k < frame.length; k++) {
        for (let l = 0; l < frame[k].length; l++) {
          if (frame[k][l] > max) {
            max = frame[k][l];
          }
          if (frame[k][l] < min) {
            min = frame[k][l];
          }
        }
      }
      frames.push(frame);
    }
    channels.push(frames);
  }
  const reshaped = reshapeRaw(channels, min, max) as Uint8Array[][][];
  return reshaped;
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

function reshapeRaw(channels: TypedArray[][][], min: number, max: number) {
  // Normalize each pixel to 0-255 for rendering
  for (let c = 0; c < channels.length; c++) {
    for (let z = 0; z < channels[c].length; z++) {
      for (let y = 0; y < channels[c][z].length; y++) {
        for (let x = 0; x < channels[c][z][y].length; x++) {
          channels[c][z][y][x] = Math.round(((channels[c][z][y][x] - min) / (max - min)) * 255);
        }
      }
    }
  }
  return channels;
}

type TypedArray =
  | Uint8Array
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array
  | Float32Array
  | Float64Array;

type Raster = { data: TypedArray; width: number; height: number };

function splitRows(raster: Raster) {
  const { data, width, height } = raster;
  const frame = [];
  for (let i = 0; i < height; i++) {
    const row =
      data instanceof Uint8Array || data instanceof Int8Array
        ? new Uint8Array(data.buffer, width * i, width)
        : data instanceof Uint16Array || data instanceof Int16Array
        ? new Uint16Array(data.buffer, width * i * 2, width)
        : data instanceof Uint32Array
        ? new Uint32Array(data.buffer, width * i * 4, width)
        : data instanceof Float32Array
        ? new Float32Array(data.buffer, width * i * 4, width)
        : data instanceof Float64Array
        ? new Float64Array(data.buffer, width * i * 8, width)
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
  t: number | null;
  numChannels: number | null;
  numFeatures: number | null;
  raw: Uint8Array[][][] | null;
  labeled: Int32Array[][][] | null;
  rawOriginal: TypedArray[][][] | null;
  labels: Cells | null;
  spots: Spots | null;
  divisions: Divisions | null;
  cells: Cells | null;
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
        t: null,
        numChannels: null,
        numFeatures: null,
        raw: null,
        labeled: null,
        rawOriginal: null,
        labels: null,
        spots: null,
        divisions: null,
        cells: null,
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
              raw: Uint8Array[][][];
              labeled: Int32Array[][][];
              rawOriginal: TypedArray[][][];
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
              actions: ['set spots', 'set divisions', 'set cells', 'set metadata'],
            },
            onError: {
              actions: 'send project not in output bucket',
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
          entry: 'send loaded',
        },
      },
    },
    {
      services: {
        'fetch project zip': fetchZip,
        'split arrays': (ctx, evt) => splitArrays(evt.data.files),
      },
      actions: {
        'send project not in output bucket': sendParent('PROJECT_NOT_IN_OUTPUT_BUCKET'),
        'set spots': assign({
          // @ts-ignore
          spots: (context, event) => event.data.files['spots.csv'] as Spots,
        }),
        'set divisions': assign({
          // @ts-ignore
          divisions: (context, event) => event.data.files['divisions.json'] as Divisions,
        }),
        'set cells': assign({
          // @ts-ignore
          cells: (context, event) => event.data.files['cells.json'] as Cells,
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
            t: SizeZ,
            // SizeT,
            numChannels: SizeC,
            numFeatures: labelSizeC,
          };
        }),
        'set arrays': assign({
          raw: (_, event) => event.data.raw,
          labeled: (_, event) => event.data.labeled,
          rawOriginal: (_, event) => event.data.rawOriginal,
        }),
        'send loaded': sendParent((ctx) => ({
          type: 'LOADED',
          raw: ctx.raw,
          labeled: ctx.labeled,
          rawOriginal: ctx.rawOriginal,
          spots: ctx.spots,
          divisions: ctx.divisions,
          cells: ctx.cells,
        })),
      },
    }
  );

export default createLoadMachine;
