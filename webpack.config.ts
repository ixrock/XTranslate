import webpack from 'webpack'
import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import { appEntry, contentScriptEntry, contentScriptInjectable, pdfViewerEntry, serviceWorkerEntry } from "@/config";

const srcPath = path.resolve(__dirname, "src");
const distPath = path.resolve(__dirname, "dist");
const componentsDir = path.resolve(srcPath, "components");

const configEntries: webpack.EntryObject = {
  [appEntry]: path.resolve(componentsDir, "app/index.tsx"),
  [contentScriptEntry]: path.resolve(srcPath, "user-script/content-script-entry.tsx"),
  [contentScriptInjectable]: path.resolve(srcPath, "user-script/content-script.tsx"),
  [serviceWorkerEntry]: path.resolve(srcPath, "background/background.ts"),
  [pdfViewerEntry]: path.resolve(srcPath, "pdf-viewer/pdf-viewer.tsx"),
};

interface WebpackConfigEnv {
  mode?: "development" | "production"; // must be provided inside `package.json` scripts
}

function webpackBaseConfig({ mode }: WebpackConfigEnv): webpack.Configuration {
  const isDevelopment = mode === "development";

  return {
    mode,
    target: "web",
    devtool: isDevelopment ? "source-map" : false, // https://webpack.js.org/configuration/devtool/
    cache: isDevelopment ? { type: "filesystem" } : false,
    entry: {}, // to be defined on each config

    output: {
      libraryTarget: "umd", // "umd": provide module as global variable, CommonJS and AMD
      globalObject: "globalThis",
      publicPath: "auto",
      path: distPath,
      filename: '[name].js',
      chunkFilename: 'chunks/[name].js',
      assetModuleFilename: `assets/[name][ext]`
    },

    experiments: {
      topLevelAwait: true,
    },

    optimization: {
      minimize: !isDevelopment,
    },

    ignoreWarnings: [
      // hide css-loader's warnings about empty classes within defined modules
      /export '.*?' \(imported as 'styles?'\) was not found in '.*?\.module\.s?css' .*/i
    ],

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.json'],
      alias: {
        "@": srcPath,
      },
      fallback: {
        // ignore browser polyfill warnings
        zlib: false,
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
                  auto: true, // https://github.com/webpack-contrib/css-loader#auto
                  mode: "local", // :local(.selector) by default
                  localIdentName: '[name]__[local]--[hash:base64:5]'
                }
              }
            },
            {
              loader: "sass-loader",
              options: {
                sourceMap: isDevelopment,
              }
            }
          ]
        },

        /**
         * SVG-icons (vector image)
         */
        {
          test: /\.svg$/i,
          resourceQuery: /url/, // *.svg?url
          type: "asset/resource", // path to `assets/icons/file.svg`
          generator: {
            filename: "assets/icons/[name][ext]"
          }
        },
        {
          test: /\.svg$/,
          resourceQuery: { not: [/url/] }, // import files as SVG-components (XML)
          type: "asset/inline" // data:image/svg+xml;base64,...
        },

        /**
         * Images
         */
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
      new MiniCssExtractPlugin({
        filename: '[name].css'
      }),
    ]
  }
}

export default [
  // build main app (options page), pdf-viewer and content-script
  function (env: WebpackConfigEnv) {
    const config = webpackBaseConfig(env);
    config.target = "web"

    config.entry = {
      [appEntry]: configEntries[appEntry],
      [pdfViewerEntry]: configEntries[pdfViewerEntry],
    };

    config.plugins.push(...[
      new HtmlWebpackPlugin({
        inject: true,
        chunks: [appEntry],
        filename: "options.html",
      }),

      new HtmlWebpackPlugin({
        inject: true,
        chunks: [pdfViewerEntry],
        filename: `${pdfViewerEntry}.html`,
      }),

      new CopyWebpackPlugin({
        patterns: [
          { from: "README.md" },
          { from: "privacy-policy.md" },
          { from: "manifest.json" },
          { from: "_locales", to: "_locales" },
          { from: "assets", to: "assets" },
          { from: "node_modules/pdf.js/build/generic", to: "assets/pdfjs" },
        ]
      }),
    ]);

    // exclude non-UI dependencies from final bundle
    config.externals = ["openai"];

    return config;
  },

  // user-script.js
  function (env: WebpackConfigEnv) {
    const config = webpackBaseConfig(env);

    config.target = "web"
    config.entry = {
      [contentScriptEntry]: configEntries[contentScriptEntry],
      [contentScriptInjectable]: configEntries[contentScriptInjectable],
    };

    config.externals = ["openai"];
    return config;
  },

  // background.js
  // service-worker must be compiled with appropriate `config.target` to load chunks via global `importScripts()` in manifest@v3
  function (env: WebpackConfigEnv) {
    const config = webpackBaseConfig(env);
    config.target = "webworker";

    config.entry = {
      [serviceWorkerEntry]: configEntries[serviceWorkerEntry]
    };

    return config;
  }
];
