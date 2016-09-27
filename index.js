require('dotenv').config()
var request = require('request');

//createTogglProjectWithEntry();
getTogglUserData();
//getWakatimeData();

function getTogglUserData() {
  var options = {
    url: 'https://www.toggl.com/api/v8/me?with_related_data=true',
    method: 'GET',
    headers: {'Authorization': 'Basic ' + new Buffer(process.env.TOGGLKEY + ':api_token').toString('base64')}
  }

  // Start the request
  request(options, function (error, response, body) {
    if (!error) {
      //console.log(response.statusCode)
      //console.log(body)
      processTogglData(body);
    } else {
      console.error(error)
    }
  })
}

function processTogglData(body) {
  var togglData = JSON.parse(body)
  if (togglData === undefined || togglData.data === undefined || togglData.data.projects === undefined) {return};
  var togglProjects = togglData.data.projects.map(function(data){
    return {"id":data.id,"name": data.name,"default_wid":togglData.data.default_wid,"wid":data.wid};
  })
  //console.log(togglProjects);
  getWakatimeData(togglProjects);
}

function getWakatimeData(togglProjects) {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday = yesterday.toISOString().split(/T/)[0];

  var options = {
    url: 'https://wakatime.com/api/v1/users/current/durations?date='+yesterday+'&api_key='+process.env.WAKAKEY,
    method: 'GET'
  }

  // Start the request
  request(options, function (error, response, body) {
    if (!error) {
      //console.log(response.statusCode)
      //console.log(body)
      processWakatimeData(body,togglProjects);
    } else {
      console.error(error)
    }
  })
}


function processWakatimeData(body,togglProjects) {
  var wakaData = JSON.parse(body)
  if (wakaData === undefined || wakaData.data === undefined) {return};
  //console.log(wakaData)
  var wakaProjects = wakaData.data;
  //console.log(togglProjects);
  for (var i = wakaProjects.length - 1; i >= 0; i--) {
    for (var k = togglProjects.length - 1; k >= 0; k--) {
      if (togglProjects[k].name === wakaProjects[i].project) {
        console.log("Project Found! - %s",wakaProjects[i].project);
        createTogglProjectWithEntry(wakaProjects[i],togglProjects[k])
        return;
      }
    }
  }
  console.log("Will Create Project");
}

function createTogglProjectWithEntry(wProject,tProject) {
  var options = {
      url: 'https://www.toggl.com/api/v8/projects',
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + new Buffer(process.env.TOGGLKEY + ":api_token").toString('base64'),
      },
      json: {
        "project":{
          "name":wProject.project,
          "wid":tProject.default_wid
        }
      }
  }

  // Start the request
  request(options, function (error, response, body) {
    if (!error) {
      //console.log(response.statusCode)
      console.log(body)
    } else {
      console.error(error)
    }
  });
}

function addTogglEntry(data,project) {

}



//console.log(process.env.WAKAKEY);
//console.log(yesterday);
