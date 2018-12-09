import path = require('path');
import webpack = require('webpack');
import HtmlWebpackPlugin = require('html-webpack-plugin');
import CopyWebpackPlugin = require('copy-webpack-plugin');
import MiniCssExtractPlugin = require("mini-css-extract-plugin");

export = () => {
  var isProduction = process.env.NODE_ENV === "production";
  var srcPath = path.resolve(__dirname, 'src');
  var distPath = path.resolve(__dirname, 'dist');
  var optionsPage = path.resolve(__dirname, "options.html");
  var componentsDir = path.resolve(srcPath, 'components');
  var commonVars = path.resolve(componentsDir, "vars.scss");

  return {
    context: srcPath,
    entry: {
      app: path.resolve(componentsDir, "app/app.tsx"),
      background: path.resolve(srcPath, "background/background.ts"),
      page: path.resolve(srcPath, "user-script/user-script.tsx"),
    },
    output: {
      path: distPath,
      publicPath: './',
      filename: '[name].js'
    },

    mode: isProduction ? "production" : "development",
    devtool: isProduction ? "" : "cheap-module-source-map",

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json'],
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
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
                sourceMap: true,
                data: '@import "' + commonVars + '";',
                includePaths: [srcPath]
              }
            }
          ]
        },
        {
          test: /\.(txt|log)$/,
          use: 'raw-loader'
        },
        {
          test: /\.(jpg|png|svg)$/,
          use: "file-loader?name=assets/[name]-[hash:6].[ext]"
        },
        {
          test: /\.(ttf|eot|woff2?)$/,
          use: 'file-loader?name=fonts/[name].[ext]'
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
      new CopyWebpackPlugin([
        { from: "../manifest.json" },
        { from: "../_locales", to: "_locales" },
        { from: "../fonts", to: "fonts" },
        { from: path.resolve(componentsDir, "icons/*.png"), to: "icons", flatten: true },
      ]),
    ],
  };
};