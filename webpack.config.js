const path = require('path');

module.exports = {
  entry: './ts/dragster.script.ts',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.ts', '.js'],
  },
  output: {
    filename: 'dragster.umd.js',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, '.'),
  },
};
