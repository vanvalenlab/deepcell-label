import Grid from '@mui/material/Grid';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import Plot from 'react-plotly.js';
import {
  useCellTypes,
  useChannelExpression,
  useEditCellTypes,
  useTraining,
} from '../../../ProjectContext';

function EmbeddingPlot({ embedding }) {
  const cellTypes = useCellTypes();
  const channelExpression = useChannelExpression();
  const editCellTypes = useEditCellTypes();
  const training = useTraining();
  const selection = useSelector(editCellTypes, (state) => state.context.multiSelected);
  const predUncertainties = useSelector(training, (state) => state.context.predUncertainties);
  const embeddingColorType = useSelector(
    channelExpression,
    (state) => state.context.embeddingColorType
  );
  const uncertainty = embeddingColorType === 'uncertainty';

  // Save the layout state so that zooming does not get reset on other changes
  const [layout, setLayout] = useState({
    width: 345,
    height: 350,
    margin: { l: 30, r: 20, b: 30, t: 20, pad: 5 },
  });

  // Create color map based on cell types and which cells are selected
  let colorMap = useSelector(cellTypes, (state) => state.context.colorMap);
  let uncertaintyColors = undefined;
  if (colorMap) {
    colorMap = colorMap.map((color, i) =>
      selection.includes(i)
        ? `rgba(255,255,255,1)`
        : color[3] === 0
        ? 'rgba(33,150,243,0.15)'
        : `rgba(${color[0]},${color[1]},${color[2]},1)`
    );
  }
  if (predUncertainties) {
    uncertaintyColors = predUncertainties.map((uncertainty) =>
      isNaN(uncertainty) ? 'rgb(230,230,230)' : uncertainty
    );
  }
  // Cells that are selected will have thicker markers
  const widthMap = [...colorMap].map((_, i) => (selection.includes(i) ? 1.3 : 0.5));
  // Color scale for uncertainty mapping
  const colorScale = [
    ['0', 'rgb(49,54,149)'],
    ['0.111111111111', 'rgb(69,117,180)'],
    ['0.222222222222', 'rgb(116,173,209)'],
    ['0.333333333333', 'rgb(171,217,233)'],
    ['0.444444444444', 'rgb(224,243,248)'],
    ['0.555555555556', 'rgb(254,224,144)'],
    ['0.666666666667', 'rgb(253,174,97)'],
    ['0.777777777778', 'rgb(244,109,67)'],
    ['0.888888888889', 'rgb(215,48,39)'],
    ['1.0', 'rgb(165,0,38)'],
  ];

  const handleSelection = (evt) => {
    if (evt.points.length > 0) {
      const selected = evt.points[0].data.selectedpoints;
      editCellTypes.send({ type: 'MULTISELECTION', selected: selected });
    } else {
      editCellTypes.send({ type: 'MULTISELECTION', selected: [] });
    }
  };

  const handleDeselect = () => {
    if (selection.length > 0) {
      editCellTypes.send({ type: 'MULTISELECTION', selected: [] });
    }
  };

  const handleClick = (evt) => {
    const cell = evt.points[0].pointNumber;
    editCellTypes.send({ type: 'MULTISELECTION', selected: [cell] });
  };

  return (
    <Grid item>
      <Plot
        data={[
          {
            x: embedding[0],
            y: embedding[1],
            type: 'scatter',
            mode: 'markers',
            hovertemplate: uncertainty ? '%{marker.color:.2f}<extra></extra>' : null,
            hoverinfo: uncertainty ? null : 'skip',
            marker: {
              color: uncertainty ? uncertaintyColors : colorMap,
              colorscale: colorScale,
              size: 6,
              colorbar: { thickness: 5, orientation: 'h', y: -0.18, ypad: 0 },
              showscale: uncertainty,
              line: {
                color: 'rgba(0,0,0,1)',
                width: widthMap,
              },
            },
          },
        ]}
        layout={layout}
        config={{
          displaylogo: false,
          modeBarButtonsToRemove: ['toImage', 'autoScale2d', 'zoomIn2d', 'zoomOut2d'],
        }}
        onSelected={handleSelection}
        onClick={handleClick}
        onDoubleClick={handleDeselect}
        onUpdate={({ layout }) => setLayout(layout)}
      />
    </Grid>
  );
}

export default EmbeddingPlot;
