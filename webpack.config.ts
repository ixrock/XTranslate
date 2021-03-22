import path from 'path'
import webpack from 'webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

export = () => {
  var isProduction = process.env.NODE_ENV === "production";
  var srcPath = path.resolve(__dirname, 'src');
  var distPath = path.resolve(__dirname, 'dist');
  var optionsPage = path.resolve(__dirname, "options.html");
  var componentsDir = path.resolve(srcPath, 'components');

  return {
    context: srcPath,
    entry: {
      app: path.resolve(componentsDir, "app/index.tsx"),
      background: path.resolve(srcPath, "background/background.ts"),
      pageScript: path.resolve(srcPath, "user-script/user-script.tsx"),
      pageStyle: path.resolve(srcPath, "user-script/user-script.scss"),
    },
    output: {
      path: distPath,
      publicPath: './',
      filename: '[name].js'
    },

    mode: isProduction ? "production" : "development",
    devtool: "eval-cheap-source-map",

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
          use: [
            {
              loader: 'ts-loader',
              options: {
                compilerOptions: {
                  // allow to use dynamic import(),
                  // https://webpack.js.org/guides/code-splitting/#dynamic-imports
                  module: "esnext"
                }
              }
            }
          ]
        },
        {
          test: /\.s?css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: {
                sourceMap: true
              }
            },
            {
              loader: "sass-loader",
              options: {
                additionalData: `@import "vars";`,
                sassOptions: {
                  includePaths: [componentsDir]
                },
              }
            },
          ]
        },
        {
          test: /\.(txt|log)$/,
          use: 'raw-loader'
        },
        {
          test: /\.(jpg|png|svg|map|ico)$/,
          use: {
            loader: 'file-loader',
            options: {
              name: "assets/[name]-[hash:6].[ext]",
              esModule: false,
            },
          }
        },
        {
          test: /\.(ttf|eot|woff2?)$/,
          use: {
            loader: 'file-loader',
            options: {
              name: "assets/[name].[ext]",
              esModule: false,
            },
          },
        },
      ]
    },

    plugins: [
      new HtmlWebpackPlugin({
        inject: true,
        hash: true,
        chunks: ["common", "app"],
        filename: path.basename(optionsPage),
        template: optionsPage
      }),
      new MiniCssExtractPlugin({
        filename: "[name].css",
      }),
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(isProduction ? "production" : "development"),
        }
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: "../manifest.json" },
          { from: "../_locales", to: "_locales" },
          { from: "../assets", to: "assets" },
        ]
      }),
    ],
  };
};