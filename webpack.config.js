const path = require('path');
const HtmlWebPackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MonacoEditorWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
  entry: {
    root: ['./src/index.js'],
    labelling: ['./src/labelling.js'],
    demo: ['./src/component-demo.js'],
    policy: ['./src/privacy-policy.js'],
    tos: ['./src/tos.js'],
  },
  output: {
    filename: '[name].js',
    chunkFilename: "[name].bundle.js",
    publicPath: '/static/',
    assetModuleFilename: '[name]-[hash][ext]',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.html$/,
        use: {
          loader: "html-loader"
        }
      },
      {
        test: /\.(css|scss)$/,
        use: ["style-loader", "css-loader", "sass-loader"]
      },
      {
        test: /\.(ico|png|svg|jpg|gif|ttf)$/,
        type: "asset/resource",
      },
    ]
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: "./src/index.html",
      filename: "./index.html",
      chunks: ["root"]
    }),
    new MonacoEditorWebpackPlugin(),
    new HtmlWebPackPlugin({
      template: "./src/labelling.html",
      filename: "./labelling.html",
      chunks: ["labelling"]
    }),
    new HtmlWebPackPlugin({
      template: "./src/component-demo.html",
      filename: "./component-demo.html",
      chunks: ["demo"]
    }),
    new HtmlWebPackPlugin({
      template: "./src/privacy-policy.html",
      filename: "./privacy-policy.html",
      chunks: ["policy"]
    }),
    new HtmlWebPackPlugin({
      template: "./src/tos.html",
      filename: "./tos.html",
      chunks: ["tos"]
    }),
  ],
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"]
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        react: {
          test: /node_modules\/react.*/,
          name: "react",
          chunks: "all"
        },
        xlsx: {
          test: /node_modules\/xlsx.*/,
          name: "xlsx",
          chunks: "all"
        },
        // ace: {
        //   test: /node_modules\/ace.*/,
        //   name: "ace",
        //   chunks: "all"
        // },
      }
    }
  },
  // API mock
  devServer: {
    static: path.join(__dirname, 'dist'),
    onAfterSetupMiddleware: (devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      devServer.app.get('/user/whoami', function (req, res) {
        res.send({
          user: {
            type: 'google',
            name: 'Ilya L.',
            avatar: 'https://lh3.googleusercontent.com/a/AATXAJwje0PGgbSrqZp0L1U3HtI7AZwwabLNw7-xhz8f=s96-c'
          },
          success: true
        });
      });
      devServer.app.post('/user/login', function (req, res) {
        res.send({
          user: {
            type: 'google',
            name: 'Ilya L.',
            avatar: 'https://lh3.googleusercontent.com/a/AATXAJwje0PGgbSrqZp0L1U3HtI7AZwwabLNw7-xhz8f=s96-c'
          },
          success: true
        });
      });
      devServer.app.post('/user/logout', function (req, res) {
        res.send({
          user: {
            type: 'anon'
          },
          success: true
        });
      });
      devServer.app.post('/user/signup', async function (req, res) {
        // emulate lag
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const rawBody = await new Promise((resolve) => {
          let chunks = [];
          req.on("data", (d) => {
            chunks.push(d);
          });
          req.on('end', () => {
            resolve(Buffer.concat(chunks).toString('utf8'));
          });
        });
        const payload = JSON.parse(rawBody);
        res.send({
          user: payload.user,
          success: true,
        });
      });
      devServer.app.post('/user/forgot-password', function (req, res) {
        res.send({
          success: true,
        });
      });
      devServer.app.post('/image/avatar', function (req, res) {
        res.send({
          success: true,
          path: '/path/to/avatar',
        });
      });
      devServer.app.get('/ls', function (req, res) {
        res.send({
          list: [
            {
              id: '1111',
              name: 'Data Set 1111',
              type: 'GoogleSheet',
              cols: ['Fruit', 'On Counter', 'Sold Out'],
              classification: {
                status: 'finished'
              }
            },
            {
              id: '2222',
              name: 'Data Set 2222',
              type: 'GoogleSheet',
              cols: ['Location', 'Comment'],
              classification: {
                status: 'finished'
              },
              detailization: {
                Location: {
                  status: 'finished',
                  labels: ['city', 'country']
                }
              },
              visualization: {
                'Location': [
                  {
                    key: `Location country`,
                    type: 'globe',
                    props: {
                      action: 'group',
                      col: 'Location',
                      label: 'country',
                    },
                    stringrepr: 'Show countries',
                    labelselector: 'id.name'
                  },
                  {
                    key: `Location city`,
                    type: 'globe',
                    props: {
                      action: 'group',
                      col: 'Location',
                      label: 'city',
                    },
                    stringrepr: 'Show cities',
                    labelselector: 'id.name'
                  }
                ]
              },
              filtering: {
                'Location': [
                  {
                    type: 'multiselect',
                    col: 'Location',
                    label: 'country',
                    values: [
                      { id: 1, name: 'Moscow', },
                      { id: 2, name: 'Paris', },
                      { id: 3, name: 'New York', },
                    ],
                    selected: [],
                    labelselector: 'name',
                    valueselector: 'id',
                    valuefield: 'country.id'
                  },
                  {
                    type: 'multiselect',
                    col: 'Location',
                    label: 'city',
                    values: [
                      { id: 1, name: 'Moscow', },
                      { id: 2, name: 'Paris', },
                      { id: 3, name: 'New York', },
                    ],
                    selected: [],
                    labelselector: 'name',
                    valueselector: 'id',
                    valuefield: 'city.id'
                  }
                ]
              },
            }
          ],
          success: true
        });
      });
      devServer.app.get('/ds/1111', function (req, res) {
        res.send({
          list: [
            {
              id: '4uitbfq3',
              'Fruit': 'Banana',
              'On Counter': 100,
              'Sold Out': false
            },
            {
              id: 'ndisohfw',
              'Fruit': 'Mango',
              'On Counter': 300,
              'Sold Out': true
            }
          ],
          success: true
        });
      });
      devServer.app.get('/ds/2222', function (req, res) {
        res.send({
          list: [
            {
              id: '1313523',
              'Location': 'Moscow',
              'Comment': 'Capital of Russia'
            },
            {
              id: '1325235',
              'Location': 'Paris',
              'Comment': 'LAlala'
            },
            {
              id: '3211123',
              'Location': 'Moscow',
              'Comment': 'The 4th Reich'
            },
            {
              id: '1532535',
              'Location': 'New York',
              'Comment': ''
            }
          ],
          success: true
        });
      });
      devServer.app.get('/ds/3333', function (req, res) {
        res.send({
          list: [
            {
              id: '4uitbfq3',
              'Fruit': 'Banana',
              'On Counter': 100,
              'Sold Out': false
            },
            {
              id: 'ndisohfw',
              'Fruit': 'Mango',
              'On Counter': 300,
              'Sold Out': true
            }
          ],
          success: true
        });
      });
      devServer.app.get('/ds/2222/visualize', function (req, res) {
        res.send({
          list: [
            {
              id: {
                id: 1,
                name: 'Moscow',
                loc: { type: 'Point', coordinates: [37.61556, 55.75222] }
              },
              count: 2
            },
            {
              id: {
                id: 2,
                name: 'Paris',
                loc: { type: 'Point', coordinates: [2.3488, 48.85341] }
              },
              count: 1
            },
            {
              id: {
                id: 3,
                name: 'New York',
                loc: { type: 'Point', coordinates: [-74.00597, 40.71427] }
              },
              count: 1
            }
          ],
          success: true
        });
      });
      devServer.app.get('/ds/2222/filter', function (req, res) {
        res.send({
          list: [
            {
              id: '1313523',
              'Location': 'Moscow',
              'Comment': 'Capital of Russia'
            },
            {
              id: '3211123',
              'Location': 'Moscow',
              'Comment': 'The 4th Reich'
            }
          ],
          success: true
        });
      });
      devServer.app.put('/ds', function (req, res) {
        res.send({
          item: {
            id: '3333',
            name: 'Sheet 3333',
            type: 'GoogleSheet',
            cols: ['Fruit', 'On Counter', 'Sold Out'],
            classification: {
              status: 'in progress'
            }
          },
          success: true
        });
      });
      devServer.app.get('/dl/session/s1234', function (req, res) {
        res.send({
          text: 'slowo za slowo',
          sequence: [{token: 'slowo', label: 'word'}, {token: ' ', label: 'whitespace'},
            {token: 'za', label: 'word'}, {token: ' ', label: 'whitespace'}, {token: 'slowo', label: 'word'}],
          success: true
        });
      });
      devServer.app.post('/dl/session/s1234', function (req, res) {
        res.send({
          text: 'hue´m po stolu',
          success: true
        });
      });


      // devServer.app.post('/dl/session/s1234', function (req, res) {
      //   res.send({
      //     status: 'finished',
      //     success: true
      //   });
      // });
      // devServer.app.post('/dl/session/s1234/merge', function (req, res) {
      //   res.send({
      //     status: 'merging',
      //     conflicts: [
      //       {
      //         text: 'Washington, DC',
      //         diff: [
      //           {
      //             label: 'city',
      //             source:
      //               'master'
      //           },
      //           {
      //             label: 'trash',
      //             source: 'session'
      //           }
      //         ]
      //       },
      //       {
      //         text: 'Singapore',
      //         diff: [
      //           {
      //             label: 'city',
      //             source: 'both'
      //           },
      //           {
      //             label: 'country',
      //             source: 'master'
      //           }
      //         ]
      //       }
      //     ],
      //     success: true
      //   });
      // });
      // app.post('/dl/session/s1234/resolve-conflicts', function (req, res) {
      //   res.send({
      //     status: 'merged',
      //     success: true
      //   });
      // });

      devServer.app.put('/wc/template', function (req, res) {
        res.send({
          success: true
        });
      });
      devServer.app.get('/wc/template', function (req, res) {
        res.send(`[{"name":"simple single-page scrapper","text":"function scratch(page) {\\n  return page.goto(\u003C%url\\"http:\u002F\u002Flj.rossia.org\u002Fusers\u002Fdodjer\u002F18590.html\\"%\u003E)\\n      .then(async () =\u003E {\\n        const r = [[\u003C%title%\u003E]];\\n        await page.$$(\u003C%row%\u003E)\\n            .forEach((row, i) =\u003E {\u003C%fields%\u003E\\n              r.push([\u003C%values%\u003E]);\\n            });\\n        return r;\\n      });\\n}","$Use as row":function $UseAsRow(s) {
        this.__replace('row', JSON.stringify(s));
      },"$Use as field":function $UseAsField(s, name) {
        var varName = name.replace(/[^a-zA-Z0-9$]+/g, '_');
        this.__add('fields', "\\n              const ".concat(varName, " = row.querySelector(").concat(JSON.stringify(s), ")?.textContent?.trim();"));
        this.__add('title', " ".concat(JSON.stringify(name), ", "), true);
        this.__add('values', " ".concat(varName, ", "), true);
      },"getUrl":function getUrl() {
        return this.__url;
      },"setUrl":function setUrl(url) {
        this.__url = url;
        this.__replace('url', JSON.stringify(url));
      },"getScriptText":function getScriptText() {
        return this.__removeplaceholders();
      },"getScript":function getScript() {
        var text = this.getScriptText();
        var fn = new Function('page', text);
        return {
          execute: function execute(page) {
            return fn(page);
          }
        };
      },"__replace":function __replace(placeholder, value) {
        var lborder = "<%".concat(placeholder);
        var rborder = "%>";
        var start = this.text.indexOf(lborder);
        var stop = this.text.indexOf(rborder, start);
        if (start >= 0 && stop >= 0) {
          // we keep placeholders to make this script template editable
          // with parameters; but it means that values cannot contain
          // placeholder-like sequences
          this.text = this.text.substring(0, start) + lborder + value + this.text.substring(stop);
        }
      },"__add":function __add(placeholder, value) {
        var isTrimEnd = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        var lborder = "<%".concat(placeholder);
        var rborder = "%>";
        var start = this.text.indexOf(lborder);
        var stop = this.text.indexOf(rborder, start);
        if (start >= 0 && stop >= 0) {
          var prevText = this.text.substring(0, stop);
          if (isTrimEnd) {
            prevText = prevText.trimEnd();
          }
          this.text = prevText + value + this.text.substring(stop);
        }
      },"__removeplaceholders":function __removeplaceholders() {
        return this.text.replace(/<%\\w+/g, '').replace(/%>/g, '');
      }}]`)
      });

      // To mock sadist-proxy
      devServer.app.get('/proxy/session', function (req, res) {
        res.send({
          session: '1',
          endpoint: 'ws://localhost:8090',  // must run websokcet-mock.js to make it work
          success: true,
        });
      });
      devServer.app.delete('/proxy/1', function (req, res) {
        res.send({
          success: true,
        });
      });
      devServer.app.get('/proxy/1/visit/http%3A%2F%2Fexample.com%2F', function (req, res) {
        res.send(`<!--DOCTYPE html--><html lang="en_US"><head><title>Test Page</title></head><body>
<table style="width:100%">
  <tr>
    <th>Company</th>
    <th>Contact</th>
    <th>Country</th>
  </tr>
  <tr>
    <td>Alfreds Futterkiste</td>
    <td>Maria Anders</td>
    <td>Germany</td>
  </tr>
  <tr>
    <td>Centro comercial Moctezuma</td>
    <td>Francisco Chang</td>
    <td>Mexico</td>
  </tr>
</table>
</body></html>`);
      });
      devServer.app.get('/proxy/1/go-back', function (req, res) {
        res.send(`<!--DOCTYPE html--><html lang="en_US"><head><title>Test Page</title></head><body>
<p>Previous page.</p></body></html>`);
      });
      devServer.app.get('/proxy/1/go-forward', function (req, res) {
        res.send(`<!--DOCTYPE html--><html lang="en_US"><head><title>Test Page</title></head><body>
<p>Next page.</p></body></html>`);
      });
    },

    proxy: {
      // To use sadist-proxy
      // '/proxy': {
      //   target: 'http://localhost:8080',
      //   router: () => 'http://localhost:8090',
      // },
      // To use sadist-map
      '/map': {
        target: 'http://localhost:8080',
        router: () => 'http://localhost:3000',
      },
    },
  }
}
