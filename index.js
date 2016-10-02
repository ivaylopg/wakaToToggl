var dotenv = require('dotenv');
var request = require('request');
var schedule = require('node-schedule');
var argv = require('argv');

// Define CLI flags
var argOptions = [
  {
    name: 'togglKey',
    short: 't',
    type: 'string',
    description: 'Define user\'s Toggl API key',
    example: "'wakaToToggl --togglKey=value' or 'wakaToToggl -t value'"
  },
  {
    name: 'wakaKey',
    short: 'w',
    type: 'string',
    description: 'Define user\'s Toggl API key',
    example: "'wakaToToggl --wakaKey=value' or 'wakaToToggl -w value'"
  },
  {
    name: 'keepRunning',
    short: 'k',
    type: 'boolean',
    description: 'If keepRunning is set to true, wakaToToggle will automatically run every 24h',
    example: "'wakaToToggl --keepRunning=true' or 'keepRunning -k true'"
  },
  {
    name: 'hour',
    short: 'h',
    type: 'int',
    description: 'Define hour at which wakaToToggl runs if keepRunning is true',
    example: "'wakaToToggl --hour=value' or 'wakaToToggl -h value'"
  },
  {
    name: 'daysBack',
    short: 'b',
    type: 'iny',
    description: 'Get data from how many days back (ie - \'1\' would be yesterday, \'4\' would be 4 days ago',
    example: "'wakaToToggl --daysBack=value' or 'keepRunning -b value'"
  },
  {
    name: 'dryRun',
    short: 'd',
    type: 'boolean',
    description: 'Pulls and processes project data, but does not write anything to Toggl. Automatically sets \'verbose\' to true',
    example: "'wakaToToggl --dryRun=value' or 'wakaToToggl -d value'"
  },
  {
    name: 'verbose',
    short: 'v',
    type: 'boolean',
    description: 'Print all log statements',
    example: "'wakaToToggl --dryRun=value' or 'wakaToToggl -d value'"
  }
]

// Look for .env file with config data
dotenv.config();

var today = new Date();
var args = argv.option( argOptions ).run();
var togglKey = args.options.togglKey || process.env.TOGGLKEY;
var wakaKey = args.options.wakaKey || process.env.WAKAKEY;
var keepRunning = args.options.keepRunning || process.env.KEEPRUNNING;
var daysBack = args.options.daysBack || parseInt(process.env.DAYS) || 1;
var time = args.options.hour || parseInt(process.env.HOUR) || 2;
var dryRun = args.options.dryRun;
var verbose = args.options.dryRun || args.options.verbose;
var activeSchedule;
checkOptionTypes();

//console.log("togglKey: %s, wakaKey: %s, keepRunning: %s, daysBack: %s, time: %s, dryRun: %s, verbose: %s",togglKey, wakaKey, keepRunning, daysBack, time, dryRun, verbose)


if (togglKey === undefined) {
  printOutput("Missing Toggl API Key", true);
} else if (wakaKey === undefined) {
  printOutput("Missing WakaTime API Key",true);
} else if (keepRunning) {
  printIfVerbose("----------------------------------")
  printIfVerbose("Will run every day at " + time + ":00");
  var activeSchedule = schedule.scheduleJob('00 ' + time + ' * * *', function(){
    getTogglUserData();
  });
} else {
  printIfVerbose("----------------------------------")
  printIfVerbose("Syncing once now and exiting");
  getTogglUserData();
}

///////////////////////////////////////////////////////////

function getTogglUserData() {
  console.log("Running wakaToToggl at %s with options - keepRunning: %s, daysBack: %s, time: %s, dryRun: %s, verbose: %s", today.toISOString(), keepRunning, daysBack, time, dryRun, verbose);
  if (dryRun) {
    printIfVerbose("Dry-run enabled (Will not POST data to Toggl)");
  }
  var options = {
    url: 'https://www.toggl.com/api/v8/me?with_related_data=true',
    method: 'GET',
    headers: {'Authorization': 'Basic ' + new Buffer(togglKey + ':api_token').toString('base64')}
  }

  request(options, function (error, response, body) {
    if (!error) {
      if (response.statusCode !== 200) {
        printIfVerbose("----------------------------------")
        printIfVerbose(response.statusCode)
        printIfVerbose("Response from Toggl API for User Data:");
        printIfVerbose(response)
        printIfVerbose("----------------------------------")
      }
      processTogglData(body);
    } else {
      printIfVerbose(error,true)
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
  var yesterday = today;
  yesterday.setDate(yesterday.getDate() - daysBack)
  yesterday = yesterday.toISOString().split(/T/)[0];

  var options = {
    url: 'https://wakatime.com/api/v1/users/current/durations?date='+yesterday+'&api_key='+wakaKey,
    method: 'GET'
  }

  // Start the request
  request(options, function (error, response, body) {
    if (!error) {
      if (response.statusCode !== 200) {
        printIfVerbose("----------------------------------")
        printIfVerbose(response.statusCode)
        printIfVerbose("Response from WakaTime API for User Durations:");
        printIfVerbose(response)
        printIfVerbose("----------------------------------")
      }
      processWakatimeData(body,togglProjects);
    } else {
      printIfVerbose(error,true)
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
  printIfVerbose("total projects to add: " + wakaProjects.length)

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
        printIfVerbose("Add " + entriesForProject.length + " entries to existing project '" + togglProjects[k].name + "'");
        if (!dryRun) {
          addEntriesToProject(entriesForProject,togglProjects[k].id);
        }
        break;
      }
      if (k === 0) {
        printIfVerbose("Add %s unfiled entries", entriesForProject.length)
        if (!dryRun) {
          addUnfiledEntries(wakaProjectNames[i],entriesForProject,defaultWID);
        }
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
        "Authorization": "Basic " + new Buffer(togglKey + ":api_token").toString('base64'),
      },
      json: timeEntry
  }

  request(options, function (error, response, body) {
    if (!error) {
      if (response.statusCode !== 200) {
        printIfVerbose("----------------------------------")
        printIfVerbose(response.statusCode)
        printIfVerbose("Response For '%s': ",name);
        printIfVerbose(response)
        printIfVerbose("----------------------------------")
      }
    } else {
      printIfVerbose(error,true)
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
        "Authorization": "Basic " + new Buffer(togglKey + ":api_token").toString('base64'),
      },
      json: timeEntry
  }

  request(options, function (error, response, body) {
    if (!error) {
      if (response.statusCode !== 200) {
        printIfVerbose("----------------------------------")
        printIfVerbose(response.statusCode)
        printIfVerbose("Response For '%s' with ID %s",wProject.project,projectID);
        printIfVerbose(response)
        printIfVerbose("----------------------------------")
      }
    } else {
      printIfVerbose(error,true)
    }
  });
}

function printOutput(text, isAlert) {
  var outText = text;
  if (isAlert) {
    outText = "ALERT: " + outText;
  }
  console.log(outText);
}

function printIfVerbose(text,isAlert) {
  if (!verbose) {return};
  var outText = text;
  if (isAlert) {
    outText = "ALERT: " + outText;
  }
  console.log(outText);
}

function checkOptionTypes() {
  if (typeof daysBack !== "number" || daysBack <= 0) {
    daysBack = 1;
  }

  if (typeof time !== "number" || time < 0 || time > 23) {
    time = 2;
  }

  if (typeof keepRunning !== "boolean") {
    if (keepRunning === undefined || (keepRunning.toLowerCase() !== "true" && keepRunning !=="1")) {
      keepRunning = false
    } else {
      keepRunning = true;
    }
  }
}

function uniq(a) {
  var seen = {};
  return a.filter(function(item) {
    return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });
}
