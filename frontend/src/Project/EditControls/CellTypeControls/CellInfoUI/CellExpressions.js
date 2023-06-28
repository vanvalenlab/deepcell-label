import { useSelector } from '@xstate/react';
import Plot from 'react-plotly.js';
import { useRaw, useSelectedCell } from '../../../ProjectContext';

function CellExpressions({ calculations }) {
  const selected = useSelectedCell();
  const raw = useRaw();
  const channelNames = useSelector(raw, (state) => state.context.channelNames);
  const openChannels = useSelector(raw, (state) => state.context.layersOpen);
  // Make a colors array where open channels are lit up and closed channels are grayed out
  const colors = channelNames.map((name) =>
    openChannels.includes(name) ? 'rgba(33,150,243,0.8)' : '#d3d3d3'
  );
  const maxNameLength = Math.max(...channelNames.map((name) => name.length));
  // Specify custom max function that ignores NaNs
  const max = (arr) =>
    Math.max.apply(
      Math,
      arr.filter((num) => !isNaN(num))
    );
  const selectedExpressions = calculations.map(
    (calculation) => calculation[selected] / max(calculation)
  );

  return (
    <Plot
      data={[
        {
          x: selectedExpressions,
          y: channelNames,
          type: 'bar',
          marker: {
            color: colors,
            line: {
              width: 1,
            },
          },
          orientation: 'h',
        },
      ]}
      layout={{
        width: 345,
        height: channelNames.length * 13 + 100,
        margin: { l: maxNameLength * 5 + 50, r: 20, b: 30, t: 20, pad: 5 },
        xaxis: { automargin: true },
        yaxis: {
          autorange: 'reversed',
        },
        legend: {
          xanchor: 'right',
        },
      }}
      config={{
        staticPlot: true,
      }}
    />
  );
}

export default CellExpressions;
