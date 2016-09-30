require('dotenv').config()
var request = require('request');

if (process.env.KEEPRUNNING) {
  console.log("willKeepRunning");
  //TO-DO
} else {
  console.log("onetime");
  getTogglUserData();
}

function getTogglUserData() {
  var options = {
    url: 'https://www.toggl.com/api/v8/me?with_related_data=true',
    method: 'GET',
    headers: {'Authorization': 'Basic ' + new Buffer(process.env.TOGGLKEY + ':api_token').toString('base64')}
  }

  request(options, function (error, response, body) {
    if (!error) {
      if (response.statusCode !== 200) {
        console.log("----------------------------------")
        console.log(response.statusCode)
        console.log("Response from Toggl API for User Data:");
        console.log(response)
        console.log("----------------------------------")
      }
      processTogglData(body);
    } else {
      console.error(error)
    }
  })
}


function processTogglData(body) {
  var togglData = JSON.parse(body)
  if (togglData === undefined || togglData.data === undefined || togglData.data.projects === undefined) {return};

  var togglProjects = togglData.data.projects.filter(function(data){
    return data.server_deleted_at ? false : true
  });

  togglProjects = togglProjects.map(function(data){
    return {"id":data.id,"name": data.name,"default_wid":togglData.data.default_wid,"wid":data.wid};
  })

  if (togglProjects.length === 0) {
    togglProjects = [{"default_wid":togglData.data.default_wid}]
  }

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
      if (response.statusCode !== 200) {
        console.log("----------------------------------")
        console.log(response.statusCode)
        console.log("Response from WakaTime API for User Durations:");
        console.log(response)
        console.log("----------------------------------")
      }
      processWakatimeData(body,togglProjects);
    } else {
      console.error(error)
    }
  })
}

function processWakatimeData(body,togglProjects) {
  var wakaData = JSON.parse(body)
  if (wakaData === undefined || wakaData.data === undefined) {return};
  var wakaProjects = wakaData.data.map(function(data){
    return {"duration":data.duration,"project": data.project.replace(" ",""),"time":data.time};
  }).filter(function(data){
    // Projects less than 5 mins are ignored
    if (data.duration < 300) {
      return false;
    }
    return true;
  });

  var defaultWID = togglProjects[0].default_wid;
  var wakaProjectNames = wakaProjects.map(function(data){
    return data.project;
  });

  wakaProjectNames = uniq(wakaProjectNames);

  for (var i = wakaProjectNames.length - 1; i >= 0; i--) {
    var entriesForProject = wakaProjects.filter(function(data){
      if (data.project === wakaProjectNames[i]) {
        return true;
      }
      return false;
    });

    for (var k = togglProjects.length - 1; k >= 0; k--) {
      if (togglProjects[k].name.toLowerCase() === wakaProjectNames[i].toLowerCase()) {
        console.log("Add %s entries to existing project '%s'", entriesForProject.length, togglProjects[k].name)
        addEntriesToProject(entriesForProject,togglProjects[k].id);
        break;
      }
      if (k === 0) {
        console.log("Add %s unfiled entries", entriesForProject.length)
        addUnfiledEntries(wakaProjectNames[i],entriesForProject,defaultWID);
      }
    }
  }
}

function addUnfiledEntries(name,entries,wid) {
  // Using setTimeout to rate-limit API calls. There is *definitely* a
  // better way to do this. Pull Requests welcome ;)

  for (var i=0, l=entries.length; i<l; i++) {
    (function(n,e,w){
      setTimeout(
        function(){addUnfiledTogglEntry(n,e,w)}, i*1000);
    })(name,entries[i],wid)
  }
}

function addUnfiledTogglEntry(name,entry,wid) {
  var startTime = new Date(entry.time * 1000).toISOString()
  var timeEntry = {
    "time_entry": {
      "description":"Dev/Coding for " + name,
      "tags":["wakaToToggl"],
      "duration":entry.duration,
      "start":startTime,
      "wid":wid,
      "created_with":"wakaToToggl"
    }
  }

  var options = {
      url: 'https://www.toggl.com/api/v8/time_entries',
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + new Buffer(process.env.TOGGLKEY + ":api_token").toString('base64'),
      },
      json: timeEntry
  }

  request(options, function (error, response, body) {
    if (!error) {
      if (response.statusCode !== 200) {
        console.log("----------------------------------")
        console.log(response.statusCode)
        console.log("Response For '%s': ",name);
        console.log(response)
        console.log("----------------------------------")
      }
    } else {
      console.error(error)
    }
  });
}

function addEntriesToProject(entries,projectID) {
  // Using setTimeout to rate-limit API calls. There is *definitely* a
  // better way to do this. Pull Requests welcome ;)

  for (var i=0, l=entries.length; i<l; i++) {
    (function(e,id){
      setTimeout(
        function(){addTogglEntry(e,id)}, i*1000);
    })(entries[i],projectID)
  }
}

function addTogglEntry(wProject,projectID) {
  var startTime = new Date(wProject.time * 1000).toISOString()
  var timeEntry = {
    "time_entry": {
      "description":"Dev/Coding for " + wProject.project,
      "tags":["wakaToToggl"],
      "duration":wProject.duration,
      "start":startTime,
      "pid":projectID,
      "created_with":"wakaToToggl"
    }
  }

  var options = {
      url: 'https://www.toggl.com/api/v8/time_entries',
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + new Buffer(process.env.TOGGLKEY + ":api_token").toString('base64'),
      },
      json: timeEntry
  }

  request(options, function (error, response, body) {
    if (!error) {
      if (response.statusCode !== 200) {
        console.log("----------------------------------")
        console.log(response.statusCode)
        console.log("Response For '%s' with ID %s",wProject.project,projectID);
        console.log(response)
        console.log("----------------------------------")
      }
    } else {
      console.error(error)
    }
  });
}

function uniq(a) {
  var seen = {};
  return a.filter(function(item) {
    return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });
}
