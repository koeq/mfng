import path from 'path';
import url from 'url';
import CopyPlugin from 'copy-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import ReactFlightWebpackPlugin from 'react-server-dom-webpack/plugin';
import ResolveTypeScriptPlugin from 'resolve-typescript-plugin';
import {WebpackManifestPlugin} from 'webpack-manifest-plugin';

const dev = process.env.MODE === `development`;
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/**
 * @type {import('webpack').RuleSetUseItem}
 */
export const cssLoader = {
  loader: `css-loader`,
  options: {
    modules: {
      localIdentName: dev ? `[local]__[hash:base64:5]` : `[hash:base64:7]`,
      auto: true,
    },
  },
};

/**
 * @type {import('webpack').Configuration}
 */
const serverConfig = {
  entry: `./src/workers/main/index.ts`,
  output: {
    filename: `main-worker.js`,
    path: path.join(__dirname, `dist`),
    libraryTarget: `module`,
    chunkFormat: `module`,
  },
  resolve: {
    plugins: [new ResolveTypeScriptPlugin()],
    conditionNames: [`workerd`, `node`, `import`, `require`],
  },
  module: {
    rules: [
      {test: /\.tsx?$/, loader: `swc-loader`, exclude: [/node_modules/]},
      {test: /\.md$/, type: `asset/source`},
      {test: /\.css$/, use: [MiniCssExtractPlugin.loader, cssLoader]},
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: dev ? `client/main.css` : `client/main.[contenthash:8].css`,
      runtime: false,
    }),
    new WebpackManifestPlugin({
      fileName: `client/css-manifest.json`,
      publicPath: `/`,
      filter: (file) => file.path.endsWith(`.css`),
      map: (file) => ({...file, path: file.path.replace(/^\/client/, ``)}),
    }),
  ],
  devtool: `source-map`,
  mode: dev ? `development` : `production`,
  experiments: {outputModule: true},
  performance: {
    maxAssetSize: 1_000_000,
    maxEntrypointSize: 1_000_000,
  },
  externals: [`__STATIC_CONTENT_MANIFEST`],
  optimization: dev
    ? undefined
    : {
        concatenateModules: false,
        usedExports: false,
        moduleIds: `named`,
        minimizer: [`...`, new CssMinimizerPlugin()],
      },
};

/**
 * @type {import('webpack').Configuration}
 */
const clientConfig = {
  entry: `./src/client.tsx`,
  output: {
    filename: dev ? `main.js` : `main.[contenthash:8].js`,
    path: path.join(__dirname, `dist/client`),
    clean: !dev,
  },
  resolve: {
    plugins: [new ResolveTypeScriptPlugin()],
  },
  module: {
    rules: [
      {test: /\.tsx?$/, loader: `swc-loader`, exclude: [/node_modules/]},
      {test: /\.css$/, use: [MiniCssExtractPlugin.loader, cssLoader]},
    ],
  },
  plugins: [
    new CopyPlugin({patterns: [{from: `static`}]}),
    new ReactFlightWebpackPlugin({
      isServer: false,
      clientReferences: {
        directory: `./src/components/client`,
        include: /\.tsx$/,
      },
      clientManifestFilename: `../react-client-manifest.json`,
      ssrManifestFilename: `../react-ssr-manifest.json`,
    }),
    new MiniCssExtractPlugin({filename: `main.css`, runtime: false}),
    new WebpackManifestPlugin({
      fileName: `js-manifest.json`,
      publicPath: `/`,
      filter: (file) => file.path.endsWith(`.js`),
    }),
  ],
  devtool: `source-map`,
  mode: dev ? `development` : `production`,
  optimization: dev ? undefined : {moduleIds: `named`},
};

export default [serverConfig, clientConfig];
