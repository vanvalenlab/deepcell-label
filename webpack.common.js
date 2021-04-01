const path = require('path');

module.exports = {
  entry: {
    index: './deepcell_label/src/index.js',
    loading: './deepcell_label/src/loading.js',
    tool: './deepcell_label/src/tool.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, './static/js'),
    libraryTarget: 'var',
    library: '[name]',
  },
};
