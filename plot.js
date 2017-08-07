var fs = require("fs");
var config = require("./config.js");
const dataDir = "archive";

var raw = fs
  .readdirSync(dataDir)
  .filter(f => f.endsWith(".json"))
  .map(f => JSON.parse(fs.readFileSync(dataDir + "/" + f)))
  .filter(x => x.response.status === "OK");

var arrays = raw.filter(x => x).reduce((a, b) => {
  return {
    matrix: a.matrix.concat(b.matrix),
    time: a.time.concat(
      b.response.rows
        .map(row =>
          row.elements.map(
            el => (el.duration_in_traffic ? el.duration_in_traffic.value : -1)
          )
        )
        .reduce((el1, el2) => el1.concat(el2))
    )
  };
}, { matrix: [], time: [] });

var data = arrays.matrix.map((v, i) => {
  return { lat: v.lat, lon: v.lon, time: arrays.time[i] };
});

var aggregate = data
  .reduce((a, b) => {
    if (!a.some(aa => aa.lat === b.lat && aa.lon === b.lon))
      a.push({ lat: b.lat, lon: b.lon, time: [] });
    var timesByLocation = a.find(aa => aa.lat === b.lat && aa.lon === b.lon);
    timesByLocation = timesByLocation || [];
    timesByLocation.time.push(b.time);
    return a;
  }, [])
  .map(a => {
    return {
      lat: a.lat,
      lon: a.lon,
      avg:
        a.time.filter(t => t > 0).reduce((sum, t) => sum + t, 0) /
        a.time.length,
      max: Math.max(...a.time)
    };
  });

var plotDataAvg = [
  {
    type: "scattermapbox",
    mode: "lines+markers",
    lon: aggregate.map(d => d.lon),
    lat: aggregate.map(d => d.lat),
    hovertext: aggregate.map(d => d.avg / 60),
    marker: {
      color: aggregate.map(d => d.avg / 60),
      colorscale: "Jet",
      colorbar: { title: "Время (мин)" }
    }
  }
];

var plotDataMax = [
  {
    type: "scattermapbox",
    mode: "lines+markers",
    lon: aggregate.map(d => d.lon),
    lat: aggregate.map(d => d.lat),
    hovertext: aggregate.map(d => d.max / 60),
    marker: {
      color: aggregate.map(d => d.max / 60),
      colorscale: "Jet",
      colorbar: { title: "Время (мин)" }
    }
  }
];

var layout = {
  mapbox: {
    zoom: 9,
    center: { lon: 37.65, lat: 55.75 }
  }
};

var plotly = require("plotly")(config.plotlyUsername, config.plotlyApiKey);
var graphOptions = {
  filename: "trafficAvg",
  fileopt: "overwrite",
  layout: layout
};
plotly.plot(plotDataAvg, graphOptions, function(err, msg) {
  if (err) console.log(err);
  console.log(msg);
});
var graphOptions = {
  filename: "trafficMax",
  fileopt: "overwrite",
  layout: layout
};
plotly.plot(plotDataMax, graphOptions, function(err, msg) {
  if (err) console.log(err);
  console.log(msg);
});
