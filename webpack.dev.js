const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

module.exports = merge(common, {
  entry: {
    index: './deepcell_label/src/index.js',
    loading: './deepcell_label/src/loading.js',
    tool: './deepcell_label/src/tool.js',
  },
  mode: 'development',
  devtool: 'inline-source-map',
  watch: true,
});
