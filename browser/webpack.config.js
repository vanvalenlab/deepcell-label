const path = require('path');

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
  mode: 'development',
}
