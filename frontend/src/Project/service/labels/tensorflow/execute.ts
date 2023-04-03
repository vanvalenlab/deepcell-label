// Slightly modified version of https://github.com/tensorflow/tfjs/blob/tfjs-v4.2.0/tfjs-layers/src/engine/executor.ts
// Changed to return multiple outputs for our SNGP model

import { dispose, memory, SymbolicTensor, Tensor, util } from '@tensorflow/tfjs';
import {
  cachedRecipientCounts,
  cachedSorted,
  ExecutionProbe,
  FeedDict,
  getTopologicalSortAndRecipientCountsForOneFetch,
  RecipientMap,
} from '@tensorflow/tfjs-layers/dist/engine/executor';
import { InputLayer } from '@tensorflow/tfjs-layers/dist/engine/input_layer';
import { toList } from '@tensorflow/tfjs-layers/dist/utils/generic_utils';
import { Kwargs } from './spectralNormalizationLayer';

type RecipientCounts = {
  [fetchName: string]: number;
};

function recipientMap2Counts(recipientMap: RecipientMap): RecipientCounts {
  const recipientCounts: RecipientCounts = {};
  for (const name in recipientMap) {
    recipientCounts[name] = recipientMap[name].size;
  }
  return recipientCounts;
}

/**
 * Sort the `SymbolicTensor`s topologically, for an array of fetches.
 *
 * This function calls getTopologicalSortAndRecipientCountsForOneFetch and
 * merges their results.
 *
 * @param fetch The array of fetches requested. Must be a non-empty array.
 * @param feedDict The dictionary of fed values.
 * @returns sorted: Topologically-sorted array of SymbolicTensors.
 *   recipientCounts: Recipient counts for all SymbolicTensors in `sorted`.
 */
function getTopologicalSortAndRecipientCounts(
  fetches: SymbolicTensor[],
  feedDict: FeedDict
): { sorted: SymbolicTensor[]; recipientCounts: RecipientCounts } {
  util.assert(fetches != null && fetches.length > 0, () => `Expected at least one fetch, got none`);

  let finalSorted: SymbolicTensor[] = [];
  let finalRecipientMap: RecipientMap = {};
  if (fetches.length === 1) {
    // Special-casing 1 fetch for efficiency.
    const out = getTopologicalSortAndRecipientCountsForOneFetch(fetches[0], feedDict);
    finalSorted = out.sorted;
    finalRecipientMap = out.recipientMap;
  } else {
    const visited = new Set<string>();
    for (const fetch of fetches) {
      const { sorted, recipientMap } = getTopologicalSortAndRecipientCountsForOneFetch(
        fetch,
        feedDict
      );

      // Merge sorted SymbolicTensor Arrays.
      for (const symbolicTensor of sorted) {
        if (!visited.has(symbolicTensor.name)) {
          finalSorted.push(symbolicTensor);
          visited.add(symbolicTensor.name);
        }
      }

      // Merge recipient maps.
      for (const name in recipientMap) {
        if (finalRecipientMap[name] == null) {
          finalRecipientMap[name] = new Set<string>();
        }
        recipientMap[name].forEach((recipient) => finalRecipientMap[name].add(recipient));
      }
    }
  }
  return {
    sorted: finalSorted,
    recipientCounts: recipientMap2Counts(finalRecipientMap),
  };
}

/**
 * Execute a SymbolicTensor by using concrete feed values.
 *
 * A `SymbolicTensor` object is a node in a computation graph of TF.js
 * Layers. The object is backed by a source layer and input
 * `SymbolicTensor`s to the source layer. This method evaluates
 * the `call()` method of the source layer, using concrete values of the
 * inputs obtained from either
 * * `feedDict`, if the input key exists in `feedDict`, or else,
 * * a recursive call to `execute()` itself.
 *
 * @param x: The `SymbolicTensor` to execute.
 * @param feedDict: The feed values, as base condition of the recursion.
 *   execution.
 * @param kwargs: Optional keyword arguments.
 * @param probe: A probe object (of interface `ExecutionProbe`) used for
 *   testing memory footprint of `execute` calls.
 * @returns Result of the execution.
 * @throws ValueError: If any `SymbolicTensor`s from `InputLayer`s
 *   encountered during the execution lacks a feed value in `feedDict`.
 */
export function execute(
  fetches: SymbolicTensor | SymbolicTensor[],
  feedDict: FeedDict,
  kwargs?: Kwargs,
  probe?: ExecutionProbe
): Tensor | Tensor[] | [Tensor | Tensor[]] {
  const training: boolean = kwargs == null ? false : kwargs['training'];

  const arrayFetches = Array.isArray(fetches);
  const fetchArray: SymbolicTensor[] = arrayFetches ? fetches : [fetches];

  const outputNames = fetchArray.map((t) => t.name);
  const finalOutputs: Tensor[] = [];
  const feedNames = feedDict.names();
  for (const outputName of outputNames) {
    if (feedNames.indexOf(outputName) !== -1) {
      finalOutputs.push(feedDict.getValue(outputName));
    } else {
      // @ts-ignore
      finalOutputs.push(null);
    }
  }

  if (probe != null) {
    // For optional probing of memory footprint during execution.
    probe.maxNumTensors = -Infinity;
    probe.minNumTensors = Infinity;
  }

  // Check cache.
  const fetchAndFeedKey = outputNames.join(',') + '|' + feedDict.names().sort().join(',');
  let sorted: SymbolicTensor[] = cachedSorted.get(fetchAndFeedKey);
  let recipientCounts: { [fetchName: string]: number };
  if (sorted == null) {
    // Cache doesn't contain the desired combination of fetches. Compute
    // topological sort for the combination for the first time.
    const out = getTopologicalSortAndRecipientCounts(fetchArray, feedDict);
    sorted = out.sorted;
    recipientCounts = out.recipientCounts;

    // Store results in cache for future use.
    cachedSorted.put(fetchAndFeedKey, sorted);
    cachedRecipientCounts.put(fetchAndFeedKey, recipientCounts);
  }
  recipientCounts = {};
  if (!training) {
    Object.assign(recipientCounts, cachedRecipientCounts.get(fetchAndFeedKey));
  }

  const internalFeedDict = new FeedDict(feedDict);

  // Start iterative execution on the topologically-sorted SymbolicTensors.
  for (let i = 0; i < sorted.length; ++i) {
    if (probe != null) {
      // For optional probing of memory usage during execution.
      const numTensors = memory().numTensors;
      // @ts-ignore
      if (numTensors > probe.maxNumTensors) {
        probe.maxNumTensors = numTensors;
      }
      // @ts-ignore
      if (numTensors < probe.minNumTensors) {
        probe.minNumTensors = numTensors;
      }
    }

    const symbolic = sorted[i];
    const srcLayer = symbolic.sourceLayer;
    if (srcLayer instanceof InputLayer) {
      continue;
    }
    const inputValues: Tensor[] = [];
    const inputMasks: Tensor[] = [];
    const tensorsToDispose: Tensor[] = [];

    let maskExists = false;
    for (const input of symbolic.inputs) {
      const value = internalFeedDict.getValue(input);
      const mask = internalFeedDict.getMask(input);
      inputValues.push(value);
      inputMasks.push(mask);
      if (mask != null) {
        maskExists = true;
      }
      if (!training) {
        recipientCounts[input.name]--;
        if (
          recipientCounts[input.name] === 0 &&
          !feedDict.hasKey(input) &&
          outputNames.indexOf(input.name) === -1 &&
          !value.isDisposed &&
          input.sourceLayer.stateful !== true
        ) {
          tensorsToDispose.push(value);
        }
      }
    }

    if (maskExists) {
      kwargs = kwargs || {};
      kwargs['mask'] = inputMasks[0];
    }
    const outputTensors = toList(srcLayer.apply(inputValues, kwargs)) as Tensor[];
    let outputMask: Tensor | Tensor[] | undefined = undefined;
    if (srcLayer.supportsMasking) {
      outputMask = srcLayer.computeMask(inputValues, inputMasks);
    }
    const layerOutputs = getNodeOutputs(symbolic);

    const outputSymbolicTensors = Array.isArray(layerOutputs) ? layerOutputs : [layerOutputs];
    for (let i = 0; i < outputSymbolicTensors.length; ++i) {
      if (!internalFeedDict.hasKey(outputSymbolicTensors[i])) {
        internalFeedDict.add(
          outputSymbolicTensors[i],
          outputTensors[i],
          Array.isArray(outputMask) ? outputMask[0] : outputMask
        );
      }
      const index = outputNames.indexOf(outputSymbolicTensors[i].name);
      if (index !== -1) {
        finalOutputs[index] = outputTensors[i];
        finalOutputs[index + 1] = outputTensors[i + 1];
      }
    }

    if (!training) {
      // Clean up Tensors that are no longer needed.
      dispose(tensorsToDispose);
    }
  }
  // NOTE(cais): Unlike intermediate tensors, we don't discard mask
  // tensors as we go, because these tensors are sometimes passed over a
  // series of mutliple layers, i.e., not obeying the immediate input
  // relations in the graph. If this becomes a memory-usage concern,
  // we can improve this in the future.
  internalFeedDict.disposeMasks();

  return arrayFetches ? finalOutputs : finalOutputs[0];
}

/**
 * Get the symbolic output tensors of the node to which a given fetch belongs.
 * @param fetch The fetched symbolic tensor.
 * @returns The Array of symbolic tensors output by the node to which `fetch`
 *   belongs.
 */
function getNodeOutputs(fetch: SymbolicTensor): SymbolicTensor | SymbolicTensor[] {
  let layerOutputs: SymbolicTensor | SymbolicTensor[];
  if (fetch.sourceLayer.inboundNodes.length === 1) {
    layerOutputs = fetch.sourceLayer.output;
  } else {
    // @ts-ignore
    let nodeIndex: number = null;
    for (let i = 0; i < fetch.sourceLayer.inboundNodes.length; ++i) {
      for (const outputTensor of fetch.sourceLayer.inboundNodes[i].outputTensors) {
        if (outputTensor.id === fetch.id) {
          nodeIndex = i;
          break;
        }
      }
    }
    layerOutputs = fetch.sourceLayer.getOutputAt(nodeIndex);
  }
  return layerOutputs;
}
