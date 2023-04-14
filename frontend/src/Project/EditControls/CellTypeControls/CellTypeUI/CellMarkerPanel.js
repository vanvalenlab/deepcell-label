export const markerPanel = [
  { names: ['B cell', 'B'], channels: ['CD19', 'CD20'] },
  { names: ['dendritic cell', 'DC', 'dendritic'], channels: ['CD11c', 'CSF1R'] },
  { names: ['endothelial'], channels: ['CD31', 'VIM'] },
  { names: ['fibroblast'], channels: ['FAP', 'VIM'] },
  {
    names: ['macrophage', 'macro', 'macs'],
    channels: ['CD11B', 'CD68', 'CD14', 'CD163', 'CD16', 'CSF1R'],
  },
  { names: ['mast cell', 'mast'], channels: ['Tryptase'] },
  { names: ['monocyte', 'mono'], channels: ['CD11b', 'CSF1R'] },
  {
    names: ['natural killer cell', 'NK'],
    channels: ['CD11B', 'NKG2D', 'CD56', 'CD161', 'CD16', 'CD94', 'CD57', 'LAG3/CD223'],
  },
  { names: ['neutrophil'], channels: ['MPO', 'CALPROTECTIN'] },
  {
    names: ['T cell', 'T', 'T regulatory', 'Treg', 'TCELL/TREG'],
    channels: ['CD3', 'CD4', 'CD8', 'FOXP3', 'CD103', 'ICOS', 'LAG3/CD223'],
  },
  { names: ['tumor', 'malignant'], channels: ['PanCK', 'GALECTIN9', 'HER2'] },
];
