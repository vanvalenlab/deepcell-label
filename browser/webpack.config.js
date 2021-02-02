var webpack = require('webpack');
const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
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
  module: {
    rules: []
  },
  mode: 'development',
  resolve: {
    fallback: {
      path: require.resolve('path-browserify'),
      fs: false
    }
  },
  plugins: [
    new NodePolyfillPlugin(),
    new webpack.DefinePlugin({
      'process.browser': 'true'
    })
  ]
}
