module.exports = {
  entry: './src/index.js',
  output: {
    path: './build',
    filename: 'atmosphere.js'
  },
  module: {
    loaders: [
      {
        test: /\.js?$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel',
        query: {
          presets: ['es2015']
        }
      }
    ]
  }
};
