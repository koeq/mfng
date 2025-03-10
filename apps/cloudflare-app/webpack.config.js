import {createRequire} from 'module';
import path from 'path';
import {
  WebpackRscClientPlugin,
  WebpackRscServerPlugin,
  createWebpackRscClientLoader,
  createWebpackRscServerLoader,
  createWebpackRscSsrLoader,
  webpackRscLayerName,
} from '@mfng/webpack-rsc';
import CopyPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import ResolveTypeScriptPlugin from 'resolve-typescript-plugin';
import {WebpackManifestPlugin} from 'webpack-manifest-plugin';

const require = createRequire(import.meta.url);

/**
 * @param {unknown} _env
 * @param {{readonly mode?: import('webpack').Configuration['mode']}} argv
 * @return {import('webpack').Configuration[]}
 */
export default function createConfigs(_env, argv) {
  const {mode} = argv;
  const dev = mode === `development`;

  /**
   * @type {import('webpack').StatsOptions}
   */
  const stats = {
    assets: true,
    builtAt: true,
    chunks: false,
    colors: true,
    groupAssetsByEmitStatus: false,
    groupAssetsByExtension: true,
    groupAssetsByInfo: false,
    groupAssetsByPath: false,
    hash: false,
    modules: false,
    version: false,
  };

  const cssRule = {
    test: /\.css$/,
    use: [
      MiniCssExtractPlugin.loader,
      {
        loader: `css-loader`,
        options: {
          modules: {
            localIdentName: dev
              ? `[local]__[hash:base64:5]`
              : `[hash:base64:7]`,
            auto: true,
          },
        },
      },
      {
        loader: `postcss-loader`,
        options: {
          postcssOptions: {
            plugins: [
              `tailwindcss`,
              `autoprefixer`,
              ...(dev ? [] : [`cssnano`]),
            ],
          },
        },
      },
    ],
  };

  /**
   * @type {import('@mfng/webpack-rsc').ClientReferencesMap}
   */
  const clientReferencesMap = new Map();
  const serverReferencesMap = new Map();
  const rscServerLoader = createWebpackRscServerLoader({clientReferencesMap});
  const rscSsrLoader = createWebpackRscSsrLoader();
  const rscClientLoader = createWebpackRscClientLoader({serverReferencesMap});

  /**
   * @type {import('webpack').Configuration}
   */
  const serverConfig = {
    name: `server`,
    entry: `./src/worker/index.ts`,
    target: `webworker`,
    output: {
      filename: `worker.js`,
      path: path.join(process.cwd(), `dist`),
      libraryTarget: `module`,
      chunkFormat: `module`,
    },
    resolve: {
      plugins: [new ResolveTypeScriptPlugin()],
      conditionNames: [`workerd`, `...`],
    },
    module: {
      rules: [
        {
          resource: (value) =>
            /core\/lib\/server\/rsc\.js$/.test(value) ||
            /create-rsc-app-options\.tsx$/.test(value),
          layer: webpackRscLayerName,
        },
        {
          issuerLayer: webpackRscLayerName,
          resolve: {conditionNames: [`react-server`, `...`]},
        },
        {
          oneOf: [
            {
              issuerLayer: webpackRscLayerName,
              test: /\.tsx?$/,
              use: [rscServerLoader, `swc-loader`],
              exclude: [/node_modules/],
            },
            {
              test: /\.tsx?$/,
              use: [rscSsrLoader, `swc-loader`],
              exclude: [/node_modules/],
            },
          ],
        },
        {
          oneOf: [
            {
              test: /\.js$/,
              issuerLayer: webpackRscLayerName,
              use: rscServerLoader,
            },
            {test: /\.js$/, use: rscSsrLoader},
          ],
        },
        cssRule,
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({filename: `server-main.css`, runtime: false}),
      new WebpackRscServerPlugin({clientReferencesMap, serverReferencesMap}),
    ],
    experiments: {outputModule: true, layers: true},
    performance: {maxAssetSize: 1_000_000, maxEntrypointSize: 1_000_000},
    externals: [`__STATIC_CONTENT_MANIFEST`],
    devtool: `source-map`,
    mode,
    stats,
  };

  /**
   * @type {import('webpack').Configuration}
   */
  const clientConfig = {
    name: `client`,
    dependencies: [`server`],
    entry: `./src/client.tsx`,
    output: {
      filename: dev ? `main.js` : `main.[contenthash:8].js`,
      path: path.join(process.cwd(), `dist/client`),
      clean: !dev,
      publicPath: `/client/`,
    },
    resolve: {
      plugins: [new ResolveTypeScriptPlugin()],
    },
    module: {
      rules: [
        {test: /\.js$/, loader: `source-map-loader`, enforce: `pre`},
        {test: /\.js$/, use: rscClientLoader},
        {
          test: /\.tsx?$/,
          use: [rscClientLoader, `swc-loader`],
          exclude: [/node_modules/],
        },
        cssRule,
      ],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: path.join(
              path.dirname(require.resolve(`@mfng/shared-app/package.json`)),
              `static`,
            ),
          },
        ],
      }),
      new MiniCssExtractPlugin({
        filename: dev ? `main.css` : `main.[contenthash:8].css`,
        runtime: false,
      }),
      new WebpackManifestPlugin({
        fileName: `css-manifest.json`,
        publicPath: `/client/`,
        filter: (file) => file.path.endsWith(`.css`),
      }),
      new WebpackManifestPlugin({
        fileName: `js-manifest.json`,
        publicPath: `/client/`,
        filter: (file) => file.path.endsWith(`.js`),
      }),
      new WebpackRscClientPlugin({clientReferencesMap}),
    ],
    devtool: `source-map`,
    mode,
    stats,
  };

  return [serverConfig, clientConfig];
}
