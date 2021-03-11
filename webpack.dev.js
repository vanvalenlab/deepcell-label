const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

module.exports = merge(common, {
  entry: {
    index: './src/index.js',
    loading: './src/loading.js',
    tool: './src/tool.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, './static/js'),
    libraryTarget: 'var',
    library: '[name]'
  },
  mode: 'development',
  devtool: 'inline-source-map',
  watch: true,
});
