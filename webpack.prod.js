var webpack = require('webpack');

module.exports = {

	entry: './src/index.js',

	debug: false,
	devtool: 'module-source-map',

	output: {
		filename: './dist/react-quill-es6.min.js',
		library: 'ReactQuillES6',
		libraryTarget: 'umd'
	},

	module: {
		// Shut off warnings about using pre-built javascript files
		// as Quill.js unfortunately ships one as its `main`.
		noParse: /node_modules\/quill\/dist/,

		loaders: [
			{
			  test :/\.js$/,
			  loader: 'babel-loader',
			  query: { presets: ['react', 'latest', 'stage-0'] }
			}
		],
	},


	resolve: {
	  extensions: ['', '.js', '.jsx']
	},

	// externals: {
	// 	'react': {
	// 		'commonjs': 'react',
	// 		'commonjs2': 'react',
	// 		'amd': 'react',
	// 		'root': 'React'
	// 	},
	// 	'react-dom': {
	// 		'commonjs': 'react-dom',
	// 		'commonjs2': 'react-dom',
	// 		'amd': 'react-dom',
	// 		'root': 'ReactDOM'
	// 	},
	// 	'react-dom/server': {
	// 		'commonjs': 'react-dom/server',
	// 		'commonjs2': 'react-dom/server',
	// 		'amd': 'react-dom/server',
	// 		'root': 'ReactDOMServer'
	// 	}
	// },

	plugins: [
		new webpack.optimize.UglifyJsPlugin(),
		new webpack.optimize.OccurenceOrderPlugin()
	]

};
