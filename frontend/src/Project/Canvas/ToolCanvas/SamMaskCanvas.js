import { InferenceSession, Tensor } from "onnxruntime-web";
import { useSelector } from '@xstate/react';
import { useEffect, useRef, useState } from 'react';
import { useSam, useCanvas } from '../../ProjectContext';
import "./styles/sam-canvas.css"
import { onnxMaskToImage } from "./utils/util";
import { modelData } from "./utils/onnxModelAPI";
import npyjs from "npyjs";
const ort = require("onnxruntime-web");

const SamMaskCanvas = ({runONNXCommand}) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);
  const zoom = useSelector(canvas, (state) => state.context.zoom);
  const sx = useSelector(canvas, (state) => state.context.sx);
  const sy = useSelector(canvas, (state) => state.context.sy);
  const ref = useRef(null);  

  const sam = useSam();

  const x = useSelector(sam, (state) => state.context.x);
  const y = useSelector(sam, (state) => state.context.y);
  const isMouseDown = useSelector(sam, (state) => state.context.isMouseDown);
  const startX = useSelector(sam, (state) => state.context.startX);
  const startY = useSelector(sam, (state) => state.context.startY);
  const endX = useSelector(sam, (state) => state.context.endX);
  const endY = useSelector(sam, (state) => state.context.endY);

  const clicks = [
    {x: 40, y: 60, clickType: 1}
  ]


  // SAM Code from github
  const [maskImg, setMaskImg] = useState(null)
  const [model, setModel] = useState(null); // ONNX model
  const [tensor, setTensor] = useState(null); // Image embedding tensor

  // The ONNX model expects the input to be rescaled to 1024. 
  // The modelScale state variable keeps track of the scale values.
  // TODO: Change this to be dynamic based on the image size
  const [modelScale, setModelScale] = useState({samScale: 0.5, height: 512, width: 512});

  // Initialize the ONNX model. load the image, and load the SAM
  // pre-computed image embedding
  useEffect(() => {
    console.log("INITTING")
    // Initialize the ONNX model
    const initModel = async () => {
        console.log("CALLING MODEL")
      try {
        const URL = "sam_onnx_quantized_example.onnx";
        console.log("THIS IS URL", URL)
        const model = await InferenceSession.create(URL, { executionProviders: ['wasm'] });
        console.log("MADE MODEL", model)
        setModel(model);
      } catch (e) {
        console.log("THIS IS ERR")
        console.log(e);
      }
    };
    initModel();

    // Load the Segment Anything pre-computed embedding
    Promise.resolve(loadNpyTensor("./tif_embedding.npy", "float32")).then(
      (embedding) => setTensor(embedding)
    );
  }, []);

  useEffect(() => {
    console.log("RUN ONNX COMMAND", runONNXCommand)
    if (runONNXCommand) {
        runONNX();
    }
  }, [runONNXCommand])

  // Decode a Numpy file into a tensor. 
  const loadNpyTensor = async (tensorFile, dType) => {
    let npLoader = new npyjs();
    const npArray = await npLoader.load(tensorFile);
    const tensor = new ort.Tensor(dType, npArray.data, npArray.shape);
    console.log("TENSOR", tensor)
    return tensor;
  };

  const runONNX = async () => {
    console.log("GOT HERE")
    console.log("MODEL", model)
    console.log("CLICKS", clicks)
    console.log("TENSOR", tensor)
    console.log("MODEL SCALE", modelScale)
    try {
      if (
        model === null ||
        clicks === null ||
        tensor === null ||
        modelScale === null
      ) 
        return;
      else {
        console.log("INSIDE MODEL")
        // Preapre the model input in the correct format for SAM. 
        // The modelData function is from onnxModelAPI.tsx.
        const feeds = modelData({
          clicks,
          tensor,
          modelScale,
        });
        if (feeds === undefined) return;
        // Run the SAM ONNX model with the feeds returned from modelData()
        const results = await model.run(feeds);
        const output = results[model.outputNames[0]];
        // The predicted mask returned from the ONNX model is an array which is 
        // rendered as an HTML image using onnxMaskToImage() from maskUtils.tsx.
        setMaskImg(onnxMaskToImage(output.data, output.dims[2], output.dims[3]));
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    console.log(maskImg)
    console.log(tensor)
  }, [maskImg, tensor])


  return <div style={{height: "100%", width: "100%", position: "relative", overflow: "hidden"}} ref={ref}>
    </div>
};

export default SamMaskCanvas;
