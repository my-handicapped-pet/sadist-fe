/**
 * Mock webscoket. Map test requests to the responses.
 * @param req {string} Incoming message (request)
 */
module.exports = function echo(req) {
  const obj = JSON.parse(req);
  if ('script' in obj) {
    // return script back to check it in the test
    return JSON.stringify({
      "type": "result",
      "result": [["script"], [obj.script]],
      "session": obj.session,
      "id": obj.id
    });
  }
  if ('method' in obj) {
    return JSON.stringify({
      "type": "result",
      "result": "",
      "session": obj.session,
      "id": obj.id
    });
  }
  return JSON.stringify({
    "type": "error",
    "error": "Unexpected payload: " + req,
    "session": obj.session,
    "id": obj.id
  });
}