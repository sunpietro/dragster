const path = require('path');

module.exports = {
  entry: './ts/dragster.script.ts',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'dragster.umd.js',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, '.'),
  },
};
