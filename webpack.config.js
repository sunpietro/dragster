const path = require('path');
const root = path.resolve(__dirname, '.');

module.exports = {
  mode: 'development',
  entry: './ts/dragster.script.ts',
  output: {
    filename: 'dragster.umd.js',
    path: path.join(root, 'dist'),
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
