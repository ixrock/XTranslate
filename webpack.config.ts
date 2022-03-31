import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

export = () => {
  var isDevelopment = process.env.NODE_ENV !== "production";
  var srcPath = path.resolve(__dirname, "src");
  var distPath = path.resolve(__dirname, "dist");
  var optionsPage = path.resolve(__dirname, "options.html");
  var componentsDir = path.resolve(srcPath, "components");

  return {
    target: "web", // https://webpack.js.org/configuration/target/
    devtool: "source-map", // https://webpack.js.org/configuration/devtool/
    mode: isDevelopment ? 'development' : 'production',
    cache: isDevelopment,

    entry: {
      app: path.resolve(componentsDir, "app/index.tsx"),
      background: path.resolve(srcPath, "background/background.ts"),
      pageScript: path.resolve(srcPath, "user-script/user-script.tsx"),
      pageStyle: path.resolve(srcPath, "user-script/user-script.scss"),
    },

    output: {
      publicPath: "auto",
      path: distPath,
      filename: '[name].js',
      chunkFilename: 'chunks/[name].js',
      assetModuleFilename: `assets/[name][ext][query]`
    },

    optimization: {
      minimize: false
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json'],
      fallback: {
        crypto: false // ignore browser polyfill warnings from "crypto-js" package
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
                additionalData: `@import "vars";`, // TODO: move to css-vars only
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
          type: "asset/resource" // path to file, e.g. "/build/assets/*"
        },

        /**
         * Import custom fonts as URL.
         */
        {
          test: /\.(ttf|eot|woff2?)$/,
          type: "asset/resource"
        }
      ]
    },

    plugins: [
      new HtmlWebpackPlugin({
        inject: true,
        chunks: ["app"],
        filename: path.basename(optionsPage),
        template: optionsPage,
      }),

      new MiniCssExtractPlugin({
        filename: '[name].css'
      }),

      new CopyWebpackPlugin({
        patterns: [
          { from: "manifest.json" },
          { from: "_locales", to: "_locales" },
          { from: "assets", to: "assets" },
        ]
      })
    ]
  }
};