// Adapted from https://github.com/tensorflow/models/blob/master/official/nlp/modeling/layers/gaussian_process.py

import * as tf from '@tensorflow/tfjs';
import { LayerVariable, Shape, Tensor } from '@tensorflow/tfjs';
import { serialization } from '@tensorflow/tfjs-core';
import { Initializer, Zeros } from '@tensorflow/tfjs-layers/dist/initializers';
import { Dense } from '@tensorflow/tfjs-layers/dist/layers/core';
import { Cos } from './cos';
import { LaplaceRandomFeatureCovariance } from './laplaceRandomFeatureCovariance';
import { Kwargs } from './spectralNormalizationLayer';
import { diagPart } from './tfcUtils';

export class RandomFeatureGaussianProcess extends tf.layers.Layer {
  units: number;
  numInducing: number;
  gpKernelType: string;
  gpKernelScale: number;
  gpOutputBias: number;
  normalizeInput: boolean;
  gpInputScale: number;
  gpFeatureScale: number;
  gpKernelScaleTrainable: boolean;
  gpOutputBiasTrainable: boolean;
  gpCovMomentum: number;
  gpCovRidgePenalty: number;
  scaleRandomFeatures: boolean;
  useCustomRandomFeatures: boolean;
  randomFeaturesBiasInitializer: string | Initializer | undefined;
  customRandomFeaturesInitializer: string | Initializer | null;
  customRandomFeaturesActivation: string | CallableFunction | null;
  l2Regularization: number;
  gpCovLikelihood: string;
  returnGpCov: boolean;
  returnRandomFeatures: boolean;
  gpOutputKwargs: object;
  _inputNormLayer: tf.layers.Layer | undefined = undefined;
  _randomFeature: Dense | undefined = undefined;
  _gpCovLayer: tf.layers.Layer | undefined = undefined;
  _gpOutputLayer: tf.layers.Layer | undefined = undefined;
  _gpOutputBias: tf.LayerVariable | undefined = undefined;

  constructor(
    units: number,
    numInducing: number = 1024,
    gpKernelType: string = 'gaussian',
    gpKernelScale: number = 1,
    gpOutputBias: number = 0,
    normalizeInput: boolean = false,
    gpKernelScaleTrainable: boolean = false,
    gpOutputBiasTrainable: boolean = false,
    gpCovMomentum: number = -1,
    gpCovRidgePenalty: number = 1,
    scaleRandomFeatures: boolean = true,
    useCustomRandomFeatures: boolean = true,
    customRandomFeaturesInitializer: Initializer | null = null,
    customRandomFeaturesActivation: CallableFunction | null = null,
    l2Regularization: number = 0.000001,
    gpCovLikelihood: string = 'gaussian',
    returnGpCov: boolean = true,
    returnRandomFeatures: boolean = false,
    dtype: tf.DataType | null = null,
    name: string = 'randomFeatureGaussianProcess',
    config?: any
  ) {
    super({ name: name, dtype: dtype, ...config } || {});
    this.units = units;
    this.numInducing = numInducing;

    this.normalizeInput = normalizeInput;
    this.gpInputScale = 1 / tf.sqrt(tf.scalar(gpKernelScale)).arraySync();
    // @ts-ignore
    this.gpFeatureScale = tf.sqrt(tf.scalar(2).div(tf.scalar(numInducing))).arraySync();

    this.scaleRandomFeatures = scaleRandomFeatures;
    this.returnRandomFeatures = returnRandomFeatures;
    this.returnGpCov = returnGpCov;

    this.gpKernelType = gpKernelType;
    this.gpKernelScale = gpKernelScale;
    this.gpOutputBias = gpOutputBias;
    this.gpKernelScaleTrainable = gpKernelScaleTrainable;
    this.gpOutputBiasTrainable = gpOutputBiasTrainable;

    this.useCustomRandomFeatures = useCustomRandomFeatures;
    this.customRandomFeaturesInitializer = customRandomFeaturesInitializer;
    this.customRandomFeaturesActivation = customRandomFeaturesActivation;

    this.l2Regularization = l2Regularization;
    this.gpOutputKwargs = config;

    this.gpCovMomentum = gpCovMomentum;
    this.gpCovRidgePenalty = gpCovRidgePenalty;
    this.gpCovLikelihood = gpCovLikelihood;

    if (this.useCustomRandomFeatures) {
      this.randomFeaturesBiasInitializer = tf.initializers.randomUniform({
        minval: 0,
        maxval: 2 * Math.PI,
      });
      if (!this.customRandomFeaturesInitializer) {
        this.customRandomFeaturesInitializer = tf.initializers.randomNormal({ stddev: 1 });
      }
      if (!this.customRandomFeaturesActivation) {
        this.customRandomFeaturesActivation = tf.cos;
      }
    }
  }

  build(inputShape: Shape | Shape[]) {
    // Defines model layers
    let currInputShape = inputShape;
    if (this.normalizeInput) {
      this._inputNormLayer = tf.layers.layerNormalization({ name: 'gpInputNormalization' });
      this._inputNormLayer.build(inputShape);
      currInputShape = this._inputNormLayer.computeOutputShape(inputShape);
    }

    this._randomFeature = this.makeRandomFeatureLayer('gpRandomFeature');
    // @ts-ignore
    this._randomFeature.build(currInputShape);
    // @ts-ignore
    currInputShape = this._randomFeature.computeOutputShape(inputShape);

    if (this.returnGpCov) {
      this._gpCovLayer = new LaplaceRandomFeatureCovariance(
        this.gpCovMomentum,
        this.gpCovRidgePenalty,
        this.gpCovLikelihood,
        this.dtype,
        'gpCovariance'
      );
      // @ts-ignore
      this._gpCovLayer.build(currInputShape);
    }

    this._gpOutputLayer = tf.layers.dense({
      units: this.units,
      useBias: false,
      kernelRegularizer: tf.regularizers.l2({ l2: this.l2Regularization }),
      dtype: this.dtype,
      name: 'gpOutputWeights',
    });
    this._gpOutputLayer.build(currInputShape);

    this._gpOutputBias = this.addWeight(
      'gpOutputBias',
      [this.units],
      this.dtype,
      new Zeros(),
      undefined,
      this.gpOutputBiasTrainable
    );

    this.built = true;
  }

  makeRandomFeatureLayer(name: string) {
    // Defined random feature layer depending on kernel type
    let customRandomFeatureLayer;
    if (!this.useCustomRandomFeatures) {
      console.error('random fourier implemented');
    }

    if (this.gpKernelType === 'linear') {
      console.error('linear not implemented');
    } else {
      serialization.registerClass(Cos);
      customRandomFeatureLayer = tf.layers.dense({
        units: this.numInducing,
        useBias: true,
        // @ts-ignore
        activation: 'cos',
        // @ts-ignore
        kernelInitializer: this.customRandomFeaturesInitializer,
        biasInitializer: this.randomFeaturesBiasInitializer,
        trainable: false,
        name: name,
      });
    }

    return customRandomFeatureLayer;
  }

  resetCovarianceMatrix() {
    // Resets covariance matrix of GP layer
    // @ts-ignore
    this._gpCovLayer.resetPrecisionMatrix();
  }

  call(inputs: Tensor | Tensor[], kwargs: Kwargs) {
    return tf.tidy(() => {
      const training = kwargs['training'];
      // Computes random features
      let gpInputs = inputs;
      if (this.normalizeInput) {
        // @ts-ignore
        gpInputs = this._inputNormLayer.call(gpInputs);
      } else if (this.useCustomRandomFeatures) {
        // Supports lengthscale for custom random feature layer by directly rescaling the input.\
        // @ts-ignore
        const gpInputScale = tf.scalar(this.gpInputScale, inputs[0].dtype);
        // @ts-ignore
        gpInputs = gpInputs.map((input) => input.mul(gpInputScale));
      }

      // @ts-ignore
      let gpFeature = this._randomFeature.call(gpInputs, {});

      if (this.scaleRandomFeatures) {
        // Scale random feature by 2. / sqrt(numInducing)
        // @ts-ignore
        const gpFeatureScale = tf.scalar(this.gpFeatureScale, inputs[0].dtype);
        // @ts-ignore
        gpFeature = gpFeature.mul(gpFeatureScale);
      }

      // Computes posterior center (ie MAP estimate) and variance
      // @ts-ignore
      const gpOutput = tf.add(this._gpOutputLayer.call(gpFeature), this._gpOutputBias.read());

      let gpCovmat;
      if (this.returnGpCov) {
        // @ts-ignore
        gpCovmat = this._gpCovLayer.call(gpFeature, { gpOutput, training });
      }
      // Assembles model output
      const modelOutput = [gpOutput];
      if (this.returnGpCov && !training) {
        // @ts-ignore
        modelOutput.push(gpCovmat);
      }
      if (this.returnRandomFeatures) {
        // @ts-ignore
        modelOutput.push(gpFeature);
      }

      return modelOutput;
    });
  }

  get trainableWeights(): LayerVariable[] {
    // @ts-ignore
    const randomFeatureTrainable = this._randomFeature ? this._randomFeature.trainableWeights : [];
    // @ts-ignore
    const gpOutputLayerTrainable = this._gpOutputLayer ? this._gpOutputLayer.trainableWeights : [];
    // @ts-ignore
    const gpCovLayerTrainable = this._gpCovLayer ? this._gpCovLayer.trainableWeights : [];
    // @ts-ignore
    const gpNonTrainable = super.trainableWeights;
    return randomFeatureTrainable
      .concat(gpOutputLayerTrainable)
      .concat(gpCovLayerTrainable)
      .concat(gpNonTrainable);
  }

  get nonTrainableWeights(): LayerVariable[] {
    // @ts-ignore
    const randomFeatureNonTrainable = this._randomFeature
      ? this._randomFeature.nonTrainableWeights
      : [];
    // @ts-ignore
    const gpOutputLayerNonTrainable = this._gpOutputLayer
      ? this._gpOutputLayer.nonTrainableWeights
      : [];
    // @ts-ignore
    const gpCovLayerNonTrainable = this._gpCovLayer ? this._gpCovLayer.nonTrainableWeights : [];
    // @ts-ignore
    const gpNonTrainable = super.nonTrainableWeights;
    return randomFeatureNonTrainable
      .concat(gpOutputLayerNonTrainable)
      .concat(gpCovLayerNonTrainable)
      .concat(gpNonTrainable);
  }

  computeOutputShape(inputShape: Shape) {
    // @ts-ignore
    return this._gpOutputLayer.computeOutputShape(inputShape);
  }

  /**
   * The static className getter is required by the
   * registration step
   */
  static get className() {
    return 'RandomFeatureGaussianProcess';
  }
}

tf.serialization.registerClass(RandomFeatureGaussianProcess);

export function meanFieldLogits(
  logits: Tensor,
  covarianceMatrix: Tensor,
  meanFieldFactor: number = 1
): Tensor {
  return tf.tidy(() => {
    if (!meanFieldFactor || meanFieldFactor < 0) {
      return logits;
    }
    // Compute standard deviation
    const variances = diagPart(covarianceMatrix);

    // Compute scaling coefficient for mean-field approximation
    let logitsScale = tf.sqrt(tf.add(tf.scalar(1), tf.mul(variances, tf.scalar(meanFieldFactor))));

    if (logits.shape.length > 1) {
      // Cast logitsScale to compatible dimension
      logitsScale = tf.expandDims(logitsScale, -1);
    }
    return tf.div(logits, logitsScale);
  });
}
