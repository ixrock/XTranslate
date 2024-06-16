import webpack from 'webpack'
import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import { appEntry, serviceWorkerEntry, contentScriptEntry, isDevelopment } from "./src/common-vars";

const srcPath = path.resolve(__dirname, "src");
const distPath = path.resolve(__dirname, "dist");
const optionsPage = path.resolve(__dirname, "options.html");
const componentsDir = path.resolve(srcPath, "components");
const sassCommonVarsImport = `@import "mixins", "colors";`; // sass-constants & mixins only

const configEntries: webpack.EntryObject = {
  [appEntry]: path.resolve(componentsDir, "app/index.tsx"),
  [contentScriptEntry]: path.resolve(srcPath, "user-script/user-script.tsx"),
  [serviceWorkerEntry]: path.resolve(srcPath, "background/background.ts"),
};

function webpackBaseConfig(): webpack.Configuration {
  return {
    target: "web",
    devtool: isDevelopment ? "source-map" : false, // https://webpack.js.org/configuration/devtool/
    mode: isDevelopment ? "development" : "production",
    cache: isDevelopment ? { type: "filesystem" } : false,
    entry: {}, // to be defined on each config

    output: {
      libraryTarget: "global",
      globalObject: "globalThis",
      publicPath: "auto",
      path: distPath,
      filename: '[name].js',
      chunkFilename: 'chunks/[name].js',
      assetModuleFilename: `assets/[name][ext][query]`
    },

    experiments: {
      topLevelAwait: true,
    },

    optimization: {
      minimize: false,
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json', ".scss", ".css", ".txt", ".md"],
      fallback: {
        // ignore browser polyfill warnings
        crypto: false,
        path: false,
      }
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: false
            }
          }
        },

        /**
         * Import CSS or SASS styles with modules support (*.module.scss)
         * @param {string} styleLoader
         */
        {
          test: /\.s?css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: {
                sourceMap: isDevelopment,
                modules: {
                  auto: /\.module\./i, // https://github.com/webpack-contrib/css-loader#auto
                  mode: 'local', // :local(.selector) by default
                  localIdentName: '[name]__[local]--[hash:base64:5]'
                }
              }
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: isDevelopment,
                additionalData: sassCommonVarsImport,
                sassOptions: {
                  includePaths: [componentsDir]
                },
              }
            }
          ]
        },

        /**
         * Import icons and image files.
         * Read more about asset types: https://webpack.js.org/guides/asset-modules/
         */
        {
          test: /\.svg$/,
          type: "asset/inline" // data:image/svg+xml;base64,...
        },
        {
          test: /\.(jpg|png|ico)$/,
          type: "asset/resource" // path to bundled file, e.g. "/assets/*"
        },

        /**
         * Import custom fonts as URL.
         */
        {
          test: /\.(ttf|eot|woff2?)$/,
          type: "asset/resource"
        },

        /**
         * Import raw "plain/text" resources
         */
        {
          test: /\.(txt|md|ftl)$/,
          type: "asset/source"
        }
      ]
    },

    plugins: [
      new MiniCssExtractPlugin({ filename: '[name].css' }),

      // https://webpack.js.org/plugins/source-map-dev-tool-plugin/
      !isDevelopment && new webpack.SourceMapDevToolPlugin({
        exclude: ["mobx"],
      }),
    ].filter(Boolean),
  }
}

export default [
  // app.js (browser action window)
  function () {
    const webConfig = webpackBaseConfig();
    webConfig.target = "web"
    webConfig.entry = {
      [appEntry]: configEntries[appEntry],
    };

    webConfig.plugins.push(
      new HtmlWebpackPlugin({
        inject: true,
        chunks: ["app"],
        filename: path.basename(optionsPage),
        template: optionsPage,
      }),

      new CopyWebpackPlugin({
        patterns: [
          { from: "README.md" },
          { from: "privacy-policy.md" },
          { from: "manifest.json" },
          { from: "_locales", to: "_locales" },
          { from: "assets", to: "assets" },
        ]
      }),
    );

    return webConfig;
  },

  // user-script.js (content pages)
  function () {
    const webConfig = webpackBaseConfig();
    webConfig.target = "web"
    webConfig.entry = {
      [contentScriptEntry]: configEntries[contentScriptEntry]
    };
    return webConfig;
  },

  // background.js
  // service-worker must be compiled with appropriate `config.target` to load chunks via global `importScripts()` in manifest@v3
  function () {
    const webConfig = webpackBaseConfig();
    webConfig.target = "webworker";
    webConfig.entry = {
      [serviceWorkerEntry]: configEntries[serviceWorkerEntry]
    };
    return webConfig;
  }
];
