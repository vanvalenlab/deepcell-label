import React, { useState, useEffect } from 'react';
import { useService } from '@xstate/react';
import axios from 'axios';
import useCanvas from './useCanvas';
import { labelService } from './service';
// import { RateReviewRounded } from '@material-ui/icons';

const width = 160;
const height = 160;
const padding = 5;

  /**
   * Calculate available space and how much to scale x and y to fill it
   */
function setCanvasDimensions() {
    const maxWidth = this._calculateMaxWidth();
    const maxHeight = this._calculateMaxHeight();

    const scaleX = maxWidth / width;
    const scaleY = maxHeight / height;

    // pick scale that accomodates both dimensions; can be less than 1
    const scale = Math.min(scaleX, scaleY);
    const padding = padding;

    // this.model.canvas.zoom = 100;
    // this.model.canvas.scale = scale;
    // this.canvasView.setBorders();

    // set canvases size according to scale
    document.getElementById('canvas').width = width * scale + 2 * padding;
    document.getElementById('canvas').height = height * scale + 2 * padding;
  }

  /**
   * Calculate the maximum width of the canvas display area.
   * The canvas only shares width with the table display on its left.
   */
function calculateMaxWidth() {
  console.log(document.getElementById('canvas-grid-item'));
  return 300;
  const mainSection = window.getComputedStyle(
    document.getElementsByTagName('MuiGrid-root')[0]
  );
  const tableColumn = window.getComputedStyle(
    document.getElementById('control-panel')
  );
  const canvasColumn = window.getComputedStyle(
    document.getElementById('canvas')
  );
  const maxWidth = Math.floor(
    document.getElementsByTagName('MuiGrid-root')[0].clientWidth -
    parseInt(mainSection.marginTop) -
    parseInt(mainSection.marginBottom) -
    document.getElementById('table-col').clientWidth -
    parseFloat(tableColumn.paddingLeft) -
    parseFloat(tableColumn.paddingRight) -
    parseFloat(tableColumn.marginLeft) -
    parseFloat(tableColumn.marginRight) -
    parseFloat(canvasColumn.paddingLeft) -
    parseFloat(canvasColumn.paddingRight) -
    parseFloat(canvasColumn.marginLeft) -
    parseFloat(canvasColumn.marginRight)
  );
  return maxWidth;
}

  /**
   * Calculate the maximum height for the canvas display area,
   * leaving space for navbar, instructions pane, and footer.
   */
function calculateMaxHeight() {
  return 300;
  const mainSection = window.getComputedStyle(
    document.getElementsByTagName('MuiGrid-root')[0]
  );
  // leave space for navbar, instructions pane, and footer
  const maxHeight = Math.floor(
    (
      (
        window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight
      ) -
      parseInt(mainSection.marginTop) -
      parseInt(mainSection.marginBottom) -
      document.getElementsByClassName('page-footer')[0].clientHeight -
      document.getElementsByClassName('collapsible')[0].clientHeight -
      document.getElementsByClassName('navbar-fixed')[0].clientHeight
    )
  );
  return maxHeight;
}

function createBorders(width, height, padding) {
  // create paths for recoloring borders
  let topBorder = new Path2D();
  topBorder.moveTo(0, 0);
  topBorder.lineTo(padding, padding);
  topBorder.lineTo(width + padding, padding);
  topBorder.lineTo(width + 2 * padding, 0);
  topBorder.closePath();

  let bottomBorder = new Path2D();
  bottomBorder.moveTo(0, height + 2 * padding);
  bottomBorder.lineTo(padding, height + padding);
  bottomBorder.lineTo(width + padding, height + padding);
  bottomBorder.lineTo(width + 2 * padding, height + 2 * padding);
  bottomBorder.closePath();

  let leftBorder = new Path2D();
  leftBorder.moveTo(0, 0);
  leftBorder.lineTo(0, height + 2 * padding);
  leftBorder.lineTo(padding, height + padding);
  leftBorder.lineTo(padding, padding);
  leftBorder.closePath();

  let rightBorder = new Path2D();
  rightBorder.moveTo(width + 2 * padding, 0);
  rightBorder.lineTo(width + padding, padding);
  rightBorder.lineTo(width + padding, height + padding);
  rightBorder.lineTo(width + 2 * padding, height + 2 * padding);
  rightBorder.closePath();

  return [topBorder, bottomBorder, leftBorder, rightBorder];
}

function drawBorders(ctx, sx, sy, sWidth, sHeight, width, height, padding) {
  const [topBorder, bottomBorder, leftBorder, rightBorder] = createBorders(width, height, padding);
  ctx.save();
  // left border
  ctx.fillStyle = (Math.floor(sx) === 0) ? 'white' : 'black';
  ctx.fill(leftBorder);

  // right border
  ctx.fillStyle = (Math.ceil(sx + sWidth) === width) ? 'white' : 'black';
  ctx.fill(rightBorder);

  // top border
  ctx.fillStyle = (Math.floor(sy) === 0) ? 'white' : 'black';
  ctx.fill(topBorder);

  // bottom border
  ctx.fillStyle = (Math.ceil(sy + sHeight) === height) ? 'white' : 'black';
  ctx.fill(bottomBorder);

  ctx.restore();
}

function useScaledDimensions(width, height, padding) {
  const maxHeight = calculateMaxHeight();
  const maxWidth = calculateMaxWidth();

  const scaleX = maxWidth / width;
  const scaleY = maxHeight / height;

  // pick scale that accomodates both dimensions
  const scale = Math.min(scaleX, scaleY);
  const scaledHeight = height * scale + 2 * padding;
  const scaledWidth = width * scale + 2 * padding;
  return [scale, scaledHeight, scaledWidth];
}

const Canvas = props => {
  const [current, send] = useService(labelService);

  // TODO: dynamically pull from server response
  const width = 160;
  const height = 160;
  const padding = 5;
  
  // TODO: create initial state?
  const [data, setData] = useState(null);
  
  const [raw, setRaw] = useState(new Image());
  const [label, setLabel] = useState(new Image());
  const [labelArray, setLabelArray] = useState([]);
  const [scale, scaledHeight, scaledWidth] = useScaledDimensions(height, width, padding);

  const draw = (ctx) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(
      raw,
      0, 0,
      width, height,
      padding, padding,
      scaledWidth,
      scaledHeight
    );
    // drawBorders(ctx, 0, 0, width, height, width, height, 5);
  };
  
    const canvasRef = useCanvas(draw);


  useEffect(() => {
    const fetchData = async () => {
      const result = await axios(
        'http://0.0.0.0:5000/api/project/AVYPcw4jelru?bucket=caliban-output',
      );
      console.log(result.data);
      // canvasRef.height = result.data.dimensions[0];
      // canvasRef.width = result.data.dimensions[1];
      setData(result.data);
      const rawImage = new Image();
      rawImage.src = result.data.imgs.raw;
      setRaw(rawImage);
      const labelImage = new Image();
      labelImage.src = result.data.imgs.segmented;
      setLabel(labelImage);
    };
 
    fetchData();
  }, []);
  
  return <canvas id='canvas' ref={canvasRef} width={scaledWidth} height={scaledHeight} {...props} />;
};

export default Canvas;