require('dotenv').config()
var https = require('https');


getTogglData();
//getWakatimeData();

function getTogglData() {
  var options = {
    host: 'www.toggl.com',
    port: 443,
    path: '/api/v8/me',
    method: 'GET',
    headers: { 'Authorization': 'Basic ' + new Buffer(process.env.TOGGLKEY + ':api_token').toString('base64') }
  };

  var req = https.request(options, function(res) {
    console.log(res.statusCode);
    res.on('data', function(d) {
      process.stdout.write(d);
      //console.log(d)
    });
  });

  req.end();
  req.on('error', function(e) {
    console.error(e);
  });
}



function getWakatimeData() {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 12)
  yesterday = yesterday.toISOString().split(/T/)[0];

  var options = {
    host: 'wakatime.com',
    port: 443,
    path: '/api/v1/users/current/summaries?start='+yesterday+'&end='+yesterday+'&api_key='+process.env.WAKAKEY,
    method: 'GET'
  };

  var req = https.request(options, function(res) {
    //console.log(res.statusCode);
    res.on('data', function(d) {
      //process.stdout.write(d);
      processWakatimeData(d);
    });
  });

  req.end();
  req.on('error', function(e) {
    console.error(e);
  });
}


function processWakatimeData(buffer) {
  var wakaData = JSON.parse(buffer.toString())
  if (wakaData === undefined || wakaData.data === undefined || wakaData.data[0].projects === undefined) {return};
  var projects = wakaData.data[0].projects;
  console.log(projects);
  for (var i = projects.length - 1; i >= 0; i--) {
    console.log(projects[i]);
  }
}



//console.log(process.env.WAKAKEY);
//console.log(yesterday);
