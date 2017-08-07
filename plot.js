var fs = require('fs');
var config = require('./config.js');

var raw = fs
  .readdirSync('archive')
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(f)))
  .filter(x => x.response.status === 'OK');

var arrays = raw.filter(x => x).reduce((a, b) => {
  return {
    matrix: a.matrix.concat(b.matrix),
    time: a.time.concat(
      b.response.rows
        .map(row => row.elements.map(el => (el.duration_in_traffic ? el.duration_in_traffic.value : -1)))
        .reduce((el1, el2) => el1.concat(el2))
    ),
  };
}, { matrix: [], time: [] });

var data = arrays.matrix.map((v, i) => {
  return { lat: v.lat, lon: v.lon, time: arrays.time[i] };
});

var plotData = [
  {
    type: 'scattermapbox',
    mode: 'lines+markers',
    lon: data.map(d => d.lon),
    lat: data.map(d => d.lat),
    hovertext: data.map(d => d.time / 60),
    marker: {
      color: data.map(d => d.time / 60),
      colorscale: 'Jet',
      colorbar: { title: 'Время (мин)' },
    },
  },
];

var layout = {
  mapbox: {
    zoom: 9,
    center: { lon: 37.65, lat: 55.75 },
  },
};

var plotly = require('plotly')(config.plotlyUsername, config.plotlyApiKey);
var graphOptions = { filename: 'traffic', fileopt: 'overwrite', layout: layout };
plotly.plot(plotData, graphOptions, function(err, msg) {
  console.log(msg);
});
