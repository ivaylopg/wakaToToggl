# WakaToToggl

WakaToToggle is a utility to sync your WakaTime entries for a given day to your Toggl account.

# Why?

I love WakaTime's automated time tracking of dev time, but the time I spend working in an IDE is usually part of a larger context of time spent in a project. It seemed most useful to incorporate this data into Toggl, where I do my broader project time tracking.

Hopefully this is helpful for someone else.

Feedback and PRs always welcome.


# Usage

You can run `wakaToToggl` as a nodejs script...

`./wakaToToggl.js [options]` or `node wakaToToggl.js [options]`

...or as a self-contained CLI executable (does not require node on your system).
OS X executable here, or compile your own for other platforms.


# Scheduling

The default behavior is to run once, and sync yesterday's WakaTime data to Toggl. This can be sceduled on the system level with something like `cron` or `launchd`.

WakaToToggle can also be set to execute once every 24 hours as long as it's running by passing in the `--keepRunning` option. This is useful for running on a remote server with a process manager like `pm2`.

For example, to run the script every day at 5:00am:

`node wakaToToggle.js --keepRunning --hour=5`


# Options

All options are optional except for your WakaTime and Toggl API keys. Options can be passed in via Environment Variables or CLI Flags

## Environment Variables

These can be set in your shell environment or saved in a `.env` file in the same directory as the script. (See [dotenv](https://www.npmjs.com/package/dotenv))


```text

WakaToToggle looks for the following environment variables:

    TOGGLKEY="xxxxxxx"
      Define user's Toggl API key.

    WAKAKEY="xxxxxxx"
      Define user's WakaTime API key.

    KEEPRUNNING=true
      If keepRunning is set to true, wakaToToggle will automatically run every 24h. [default: false]

    HOUR=n [0 - 23]
      Define hour at which wakaToToggl runs if keepRunning is true. [default: 4]

    DAYS=n
      Get data from how many days back (ie - '1' would be yesterday, '4' would be 4 days ago. [default: 1]
```

## Command-Line Flags

NOTE: Arguments passed via the command line will override environment variables.


```text

Options:

    --help, -h
      Displays help information about this script
      'wakaToToggl -h' or 'wakaToToggl --help'

    --version
      Displays version info
      'wakaToToggl --version'

    --togglKey, -t
      Define user's Toggl API key.
      'wakaToToggl --togglKey=value' or 'wakaToToggl -t value'

    --wakaKey, -w
      Define user's WakaTime API key.
      'wakaToToggl --wakaKey=value' or 'wakaToToggl -w value'

    --keepRunning, -k
      If keepRunning is set to true, wakaToToggle will automatically run every 24h. [default: false]
      'wakaToToggl --keepRunning' or 'wakaToToggl -k'

    --hour, -r
      Define hour at which wakaToToggl runs if keepRunning is true. [default: 4]
      'wakaToToggl --hour=value' or 'wakaToToggl -r value'

    --daysBack, -b
      Get data from how many days back (ie - '1' would be yesterday, '4' would be 4 days ago. [default: 1]
      'wakaToToggl --daysBack=value' or 'wakaToToggl -b value'

    --dryRun, -d
      Pulls and processes project data, but does not write anything to Toggl. Automatically sets 'verbose' to true.
      'wakaToToggl --dryRun' or 'wakaToToggl -d'

    --verbose, -v
      Print all log statements.
      'wakaToToggl --verbose' or 'wakaToToggl -v'

```


# Compiling

WakaToToggl uses [nexe](https://github.com/jaredallard/nexe) to create standalone executables.


```text
  npm install && node run-script compile
```

