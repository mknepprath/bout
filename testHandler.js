let handler = require("./index");

handler.handler(
  {}, //event
  {}, //content
  function (data, ss) {
    console.log(data);
  }
);
