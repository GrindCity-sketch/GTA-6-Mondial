const { getStore } = require('@netlify/blobs');

function store(name) {
  return getStore(name);
}

function json(statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    },
    body: JSON.stringify(data)
  };
}

function options() {
  return json(200, {});
}

module.exports = { store, json, options };
