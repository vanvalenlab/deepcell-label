import { useSelector } from '@xstate/react';
import { useEffect, useRef, useState } from 'react';
import { useSam, useCanvas } from '../../ProjectContext';
import "./styles/sam-canvas.css"

const SamCanvas = () => {
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

  const [widthRatio, setWidthRatio] = useState(0)
  const [heightRatio, setHeightRatio] = useState(0)

  useEffect(() => {
    setWidthRatio((ref.current.offsetWidth / width))
    setHeightRatio((ref.current.offsetHeight / height))
  }, [zoom])

  useEffect(() => {
    // User has selected a region for segmentation
    if (!isMouseDown && startX && startY && endX && endY) {
        sam.send({ type: 'SEND_TO_API' })
    }
  }, [isMouseDown])

  return <div style={{height: "100%", width: "100%", position: "relative", overflow: "hidden"}} ref={ref}>
    {isMouseDown ? (
    <div style={{
        position: "absolute", 
        top: (y - sy) > (startY - sy) ? (startY - sy) * heightRatio * zoom : (y - sy) * heightRatio * zoom, 
        left: (x - sx) < (startX - sx) ? (x - sx) * widthRatio * zoom : (startX - sx) * widthRatio * zoom, 
        border: "2px dashed red", 
        zIndex: 999, 
        width: Math.abs(x - startX) * widthRatio * zoom, 
        height: Math.abs(y - startY) * heightRatio * zoom,
    }}></div>
  ) : <div style={{
        display: !startX && !startY ? "none" : "flex",
        position: "absolute", 
        top: (endY - sy) < (startY - sy) ? (endY - sy) * heightRatio * zoom : (startY - sy) * heightRatio * zoom, 
        left: (endX - sx) < (startX - sx) ? (endX - sx) * widthRatio * zoom : (startX - sx) * widthRatio * zoom, 
        border: "2px solid red", 
        zIndex: 999, 
        width: Math.abs(endX - startX) * widthRatio * zoom, 
        height: Math.abs(endY - startY) * heightRatio * zoom,
        background: "rgba(255,0,0,0.2)",
        color: "white",
        justifyContent: "center",
        alignItems: "center",
        fontSize: 15,
        textAlign: "center"
    }}>
        <span className={"loader"}></span>
    </div>}
    </div>
};

export default SamCanvas;
