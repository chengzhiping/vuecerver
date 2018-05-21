const path = require('path')
const merge = require('webpack-merge') // 合并webpack配置文件的一个东东
// html-webpack-plugin作用
// 1.为html文件中引入的外部资源如script、link动态添加每次compile后的hash，防止引用缓存的外部文件问题
// 2.可以生成创建html入口文件，比如单页面可以生成一个html文件入口，配置N个html-webpack-plugin可以生成N个页面入口
// 原理就是： 将 webpack中`entry`配置的相关入口thunk  和 
// `extract-text-webpack-plugin`抽取的css样式   插入到该插件
// 提供的`template`或者`templateContent`配置项指定的内容基础上生成一个html文件，
// 具体插入方式是将样式`link`插入到`head`元素中，`script`插入到`head`或者`body`中。
const HTMLPlugin = require('html-webpack-plugin') // 就是可以创建个html文件，并将打包后的bundle.js自动引入
const webpack = require('webpack')

// 官方介绍：从捆绑包或捆绑包中提取文本到单独的文件中
// 将css拎出来单独打包（要区分环境来写配置）
const ExtractPlugin = require('extract-text-webpack-plugin')
const baseConfig = require('./webpack.config.base.js')
const devServer = {
  port: 8000,
  host: '0.0.0.0', // 可以让手机和远程域名可以访问到
  overlay: { // 配置这项可以让错误信息覆盖在浏览器页面上
    errors: true,
  },
  hot: true, // 使用热更新功能。 如果为false
  open: true // 配置这个可以让每次编译完webpack自动打开浏览器。这回比较麻烦
}
const isDev = process.env.NODE_ENV === 'development'

const defaultPlugin = [
  new webpack.DefinePlugin({ // webpack里面的插件。可以在js文件中引用判断环境
    'process.env': {
      NODE_ENV: isDev ? '"development"' : '"production"' // 
    }
  }), // 给webpack编译过程中和js书写引用过程中判断当前环境的东东，非常实用
  new HTMLPlugin() // 
]

let config
if (isDev) {
  config = merge(baseConfig, {
    devtool: '#cheap-module-eval-source-map',
    module: {
      rules: [
        {
          test: /\.styl/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: true,
              }
            },
            'stylus-loader'
          ]
        }
      ]
    },
    devServer,
    plugins: defaultPlugin.concat([
      new webpack.HotModuleReplacementPlugin(), // 模块热替换
      new webpack.NoEmitOnErrorsPlugin() // 不是特别重要，可以减少一些不必要的展示信息
    ])
  })
} else {
  config = merge(baseConfig, {
    //我们最终希望的是将像jQuery这样的类库代码与项目自身的代码分开打包，生成一个独立的打包文件，缩减单个文件体积，浏览器也不用每次都进行加载。
    entry: {
      app: path.join(__dirname, '../src/index.js'),
      vendor: ['vue'] // 这里配置这个的目的是将vue类库单独打包。
    },
    output: {
      filename: '[name].[chunkhash:8].js' // 生产环境类库单独打包务必用chunkhash
    },
    module: {
      rules: [
        {
          test: /\.styl/,
          use: ExtractPlugin.extract({
            fallback: 'style-loader', // 编译后用什么loader来提取css文件
            use: [
              'css-loader',
              {
                loader: 'postcss-loader',
                options: {
                  sourceMap: true,
                }
              },
              'stylus-loader'
            ]
          })
        }
      ]
    },
    plugins: defaultPlugin.concat([
      new ExtractPlugin('styles.[contentHash:8].css'),
      new webpack.optimize.CommonsChunkPlugin({
        name: ['vendor', 'manifest'] // 加manifest主要是为了不让vendor每次打包hash都变化，因为类库版本都是稳定的，不需要每次更新，这样有利于浏览器缓存
      }), // 下面的runtime在entry必须是没有的
      new webpack.optimize.CommonsChunkPlugin({
        name: 'runtime'
      })
    ])
  })
}

module.exports = config
