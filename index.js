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


// user data "default_wid"

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

  //console.log(togglProjects);
  getWakatimeData(togglProjects);
}

function getWakatimeData(togglProjects) {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 5)
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
  var wakaProjects = wakaData.data.map(function(data){
    return {"duration":data.duration,"project": data.project.replace(" ",""),"time":data.time};
  }).filter(function(data){
    // Projects less than 5 mins
    if (data.duration < 300) {
      return false;
    }
    return true;
  });

  //console.log(wakaProjects);

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
    //console.log(entriesForProject);

    for (var k = togglProjects.length - 1; k >= 0; k--) {
      //console.log("%s <==> %s",togglProjects[k].name.toLowerCase(), wakaProjectNames[i].toLowerCase());
      if (togglProjects[k].name.toLowerCase() === wakaProjectNames[i].toLowerCase()) {
        //console.log("Add entries to existing project '%s'", togglProjects[k].name)
        addEntriesToProject(entriesForProject,togglProjects[k].id);
        break;
      }
      if (k === 0) {
        //console.log("Add unfiled entries", wakaProjectNames[i])
        addUnfiledEntries(wakaProjectNames[i],entriesForProject,defaultWID);
      }
    }
  }
}

// function createTogglProjectWithEntries(name,entries,wid) {
//   var options = {
//       url: 'https://www.toggl.com/api/v8/projects',
//       method: 'POST',
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": "Basic " + new Buffer(process.env.TOGGLKEY + ":api_token").toString('base64'),
//       },
//       json: {
//         "project":{
//           "name":name,
//           "wid":wid
//         }
//       }
//   }

//   // Start the request
//   request(options, function (error, response, body) {
//     if (!error) {
//       //console.log("Create project response for %s:", name)
//       //console.log(response.statusCode)
//       //console.log(body)
//       try {
//         var responseData = JSON.parse(body);
//         if (responseData.data === undefined) {
//           console.error("Error creating project");
//           return;
//         }
//         console.log("------------")
//         console.log(responseData.data)
//         var tProject = {
//           "id": responseData.data.id,
//           "name": responseData.data.name,
//           "default_wid": wid,
//           "wid": responseData.data.wid
//         }
//         console.log("new project")
//         console.log(tProject)
//         //console.log("created new project:")
//         //console.log(tProject)
//         //addTogglEntry(wProject,tProject)
//         addEntriesToProject(entries,tProject.id);
//       } catch(e) {
//         console.log("error parsing json response from createTogglProjectWithEntry(). Response:")
//         console.log(body)
//       }
//     } else {
//       console.error(error)
//     }
//   });
// }

function addUnfiledEntries(name,entries,wid) {
  for (var i=0, l=entries.length; i<l; i++) {
    (function(n,e,w){
      setTimeout(
        function(){addUnfiledTogglEntry(n,e,w)}, i*1000);
    })(name,entries[i],wid)
  }
}

function addUnfiledTogglEntry(name,entry,wid) {
  //console.log("ping - %s",name);

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


  //console.log(options)
  // Start the request
  request(options, function (error, response, body) {
    if (!error) {
      //console.log(response.statusCode)
      if (response.statusCode !== 200) {
        console.log("----------------------------------")
        console.log(response.statusCode)
        console.log("Response For '%s': ",name);
        console.log(response)
        console.log("----------------------------------")
      }
      //console.log(body)
    } else {
      console.error(error)
    }
  });
}

function addEntriesToProject(entries,projectID) {
  for (var i=0, l=entries.length; i<l; i++) {
    (function(e,id){
      setTimeout(
        function(){addTogglEntry(e,id)}, i*1000);
    })(entries[i],projectID)
  }
}

function addTogglEntry(wProject,projectID) {
  //console.log("ping - %s",wProject.project);

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

  // console.log(options)
  // return

  // Start the request
  request(options, function (error, response, body) {
    if (!error) {
      //console.log(response.statusCode)
      if (response.statusCode !== 200) {
        console.log("----------------------------------")
        console.log(response.statusCode)
        console.log("Response For '%s' with ID %s",wProject.project,projectID);
        console.log(response)
        console.log("----------------------------------")
      }

      //console.log(body)
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


//console.log(process.env.WAKAKEY);
//console.log(yesterday);
