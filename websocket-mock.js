const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8090 });
const echo = require('./websocket-echo');
wss.on('connection', function (ws) {
  ws.on('error', console.error);

  ws.on('message', function (message) {
    console.log(`received: %s`, message);
    ws.send(echo(message));
  });
});
