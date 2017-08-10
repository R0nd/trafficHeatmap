var fs = require("fs");
var fetch = require("node-fetch");
var config = require("./config.js");

function inside(point, vs) {
  var x = point[0],
    y = point[1];

  var inside = false;
  for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    var xi = vs[i][0],
      yi = vs[i][1];
    var xj = vs[j][0],
      yj = vs[j][1];

    var intersect =
      yi > y != yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

const latInt = 55;
const lonInt = 37;
const latBounds = { south: 55.58, north: 55.91 };
const lonBounds = { west: 37.37, east: 37.84 };
const mkad = [
  [55.913696, 37.562922],
  [55.891748, 37.706345],
  [55.822812, 37.84433],
  [55.651947, 37.838182],
  [55.554206, 37.674045],
  [55.598068, 37.506505],
  [55.662349, 37.421395],
  [55.747936, 37.36635],
  [55.778826, 37.368517],
  [55.866011, 37.397374]
];

var northFrac = Math.round(latBounds.north % 1 * 100);
var southFrac = Math.round(latBounds.south % 1 * 100);
var latArray = Array(northFrac - southFrac)
  .fill()
  .map((v, i) => 55 + (i + Math.round(latBounds.south % 1 * 100)) / 100);
var lonArray = Array(
  Math.round(lonBounds.east % 1 * 100) - Math.round(lonBounds.west % 1 * 100)
)
  .fill()
  .map((v, i) => 37 + (i + Math.round(lonBounds.west % 1 * 100)) / 100);

var points = latArray
  .map(lat =>
    lonArray.filter(lon => inside([lat, lon], mkad)).map(lon => {
      return { lat: lat, lon: lon };
    })
  )
  .reduce((prev, curr) => prev.concat(curr));

var requestSize = 25;

var i = 0;
var interval = setInterval(() => {
  var chunk = points.slice(i, i + requestSize);
  var matrix = chunk.map(p => p.lat + "," + p.lon).join("|");

  var { origins, destinations } =
    process.argv[2] == "back"
      ? { origins: config.targetLocation, destinations: matrix }
      : { origins: matrix, destinations: config.targetLocation };

  var url =
    "https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=" +
    origins +
    "&destinations=" +
    destinations +
    "&key="+config.googleApiKey+"&departure_time=now";

  fetch(url).then(response => response.json()).then(json => {
    fs.writeFileSync('archive/' +
      new Date().toISOString().slice(0, 13) +
        chunk[0].lat +
        ";" +
        chunk[0].lon +
        "-" +
        chunk[requestSize - 1].lat +
        ";" +
        chunk[requestSize - 1].lon +
        ".json",
      JSON.stringify({ matrix: chunk, response: json })
    );
  });
  i += requestSize;
  if (i >= points.length) clearInterval(interval);
}, 250);
