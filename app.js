var express = require('express');
var app = express();
var add_sc_blogs = require('./add_sc_blogs'); 

app.get('/', function (req, res) {
  res.send('Avibe Script Server');
});

app.listen(3000, function () {
  console.log(' Starting App on 3000!');
});

add_sc_blogs.start();
