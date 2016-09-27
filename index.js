require('dotenv').config()
var https = require('https');


getTogglUserData();
//getWakatimeData();

function getTogglUserData() {
  var options = {
    host: 'www.toggl.com',
    port: 443,
    path: '/api/v8/me?with_related_data=true',
    method: 'GET',
    headers: { 'Authorization': 'Basic ' + new Buffer(process.env.TOGGLKEY + ':api_token').toString('base64') }
  };

  var req = https.request(options, function(res) {
    //console.log(res.statusCode);
    res.on('data', function(d) {
      //process.stdout.write(d);
      processTogglData(d);
    });
  });

  req.end();
  req.on('error', function(e) {
    console.error(e);
  });
}

function processTogglData(buffer) {
  var togglData = JSON.parse(buffer.toString())
  if (togglData === undefined || togglData.data === undefined || togglData.data.projects === undefined) {return};
  var togglProjects = togglData.data.projects.map(function(data){
    return {"id":data.id,"name": data.name,"default_wid":togglData.data.default_wid,"wid":data.wid};
  })
  getWakatimeData(togglProjects);
}

function getWakatimeData(togglProjects) {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday = yesterday.toISOString().split(/T/)[0];

  var options = {
    host: 'wakatime.com',
    port: 443,
    path: '/api/v1/users/current/durations?date='+yesterday+'&api_key='+process.env.WAKAKEY,
    method: 'GET'
  };

  //path: '/api/v1/users/current/summaries?start='+yesterday+'&end='+yesterday+'&api_key='+process.env.WAKAKEY,

  var req = https.request(options, function(res) {
    //console.log(res.statusCode);
    res.on('data', function(d) {
      //process.stdout.write(d);
      processWakatimeData(d,togglProjects);
    });
  });

  req.end();
  req.on('error', function(e) {
    console.error(e);
  });
}


function processWakatimeData(buffer,togglProjects) {
  var wakaData = JSON.parse(buffer.toString())
  if (wakaData === undefined || wakaData.data === undefined) {return};
  //console.log(wakaData)
  var projects = wakaData.data;
  console.log(togglProjects);
  for (var i = projects.length - 1; i >= 0; i--) {
    if (togglProjects.indexOf(projects[i].project) != -1) {
      console.log("Project Found!");
    } else {
      console.log("Will Create Project");
    }
  }
}

function createTogglProjectWithEntry(data,name) {

}

function addTogglEntry(data,name) {

}



//console.log(process.env.WAKAKEY);
//console.log(yesterday);
