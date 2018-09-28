# Sitka

[![NPM](https://nodei.co/npm/sitka.png?compact=true)](https://nodei.co/npm/sitka/)
[![Build Status](https://travis-ci.org/chriswells0/node-sitka.svg?branch=master)](https://travis-ci.org/chriswells0/node-sitka)
[![Coverage Status](https://coveralls.io/repos/github/chriswells0/node-sitka/badge.svg?branch=master)](https://coveralls.io/github/chriswells0/node-sitka?branch=master)
[![Dependencies Status](https://david-dm.org/chriswells0/node-sitka/status.svg)](https://david-dm.org/chriswells0/node-sitka)
[![DevDependencies Status](https://david-dm.org/chriswells0/node-sitka/dev-status.svg)](https://david-dm.org/chriswells0/node-sitka?type=dev)

An extremely lightweight but powerful Node.js logger that's great for modern cloud/serverless applications.

Sitka promotes the best practices of [twelve-factor apps](https://12factor.net/) through writing to stdout/stderr by default and allowing configuration of log level and format via environment variables.

## Contents

* [Installation](#installation)
* [Usage](#usage)
    * [Basic Example](#basic-example)
    * [Advanced Examples](#advanced-examples)
* [Configuration](#configuration)
    * [Global Configuration](#global-configuration)
    * [Instance Configuration](#instance-configuration)
    * [Log Level](#log-level)
    * [Log Format](#log-format)
    * [Environment Variables](#environment-variables)
* [Testimonials](#testimonials)
* [Contributing](#contributing)

## Installation

```bash
$ npm install sitka --save
```

## Usage

### Basic Example

For anyone needing to get started quickly:

```javascript
var logger = Logger.getLogger('MyLogger');
logger.debug('So far, so good.');
logger.fatal('Something went terribly wrong.');
```

Output:

> [2018-09-05T23:47:45.482Z] [DEBUG] [MyLogger] So far, so good.\
> [2018-09-05T23:47:45.827Z] [FATAL] [MyLogger] Something went terribly wrong.

### Advanced Examples

To specify additional configuration properties, pass an object to `Logger.getLogger()` consisting of any properties shown in the [Instance Configuration](#instance-configuration) section below.  For a description of supported variables, refer to the [Log Format](#log-format) section.

1) JSON example using the `AWS_REGION` and `AWS_LAMBDA_FUNCTION_NAME` environment variables, which are available in Lambda functions:

```javascript
var logger = Logger.getLogger({
				name: 'MyLogger',
				format: '{ "function": "${ENV:AWS_LAMBDA_FUNCTION_NAME}", "time": "${TIMESTAMP}" "level": "${LEVEL}", "name": "${NAME}", "message": "${MESSAGE}" }'
			});
logger.info('Executing in: ${ENV:AWS_REGION}');
logger.info('Someone should know about this.');
```

Output:

> { "function": "my-lambda", "time": "2018-09-05T23:47:45.482Z", level": "INFO", "name": "MyLogger", "message": "Executing in: us-west-1" }\
> { "function": "my-lambda", "time": "2018-09-05T23:47:45.827Z", level": "INFO", "name": "MyLogger", "message": "Someone should know about this." }

2) Example showing usage of the context property:

```javascript
var myObj = { myVar: 'initial value' };
var logger = Logger.getLogger({
                name: 'MyLogger',
                format: Logger.Format.TEXT_NO_TIME,
                level: Logger.Level.DEBUG,
                context: { myObj: myObj }
            });
// Escape the $ to prevent the first variable from being replaced.
logger.info('\\${CTX:myObj.myVar} = ${CTX:myObj.myVar}');
// Modify a property on an object in the context and log the updated value.
myObj.myVar = 'modified value';
logger.info('\\${CTX:myObj.myVar} = ${CTX:myObj.myVar}');
```

Output:

> [INFO] [MyLogger] ${CTX:myObj.myVar} = initial value\
> [INFO] [MyLogger] ${CTX:myObj.myVar} = modified value

## Configuration

### Global Configuration

Several properties can be configured at the global level using static methods, which affects all logger instances unless overridden at the instance level.

Use `Logger.setErrorWriter()` to provide a function to use when logging ERROR and FATAL level log entries or `Logger.setLogWriter()` to specify the function to use for lower level log entries.

To provide a global context that can be accessed by all logger instances, use `Logger.setGlobalContext(yourContextObject)`.  Additionally, individual properties can be added to the global context by using `Logger.setGlobalContext("varName", "varValue")`.  If the global context and an instance context are set, BOTH are used with values in the instance context taking precedence.

### Instance Configuration

The following configuration properties are available:

| Config Property  | Description                                                              | Default                                              | Set Via (ordered by precedence)     |
| ---------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------- |
| name             | Name of the logger instance                                              | 'Sitka'                                              | constructor                         |
| level            | Minimum level of log entries to be written                               | Logger.Level.ALL                                     | constructor, environment properties |
| format           | Structure to use for every log entry                                     | '[\${TIMESTAMP}] [\${LEVEL}] [\${NAME}] \${MESSAGE}' | constructor, environment properties |
| context          | Variables that can be referenced in log messages for a specific logger   | {}                                                   | instance method, constructor        |
| errorWriter      | Function for writing log messages at FATAL or ERROR levels               | console.error() \|\| process.stderr.write()          | constructor, static method          |
| logWriter        | Function for writing log messages at any level other than FATAL or ERROR | console.log() \|\| process.stdout.write()            | constructor, static method          |

Note that the timestamp is automatically omitted from the default log format when Sitka detects an AWS Lambda or Google Cloud environment since they add their own timestamp prefix.

### Log Level

The log level can be set to any of these values (in increasing order):

* Logger.Level.OFF
* Logger.Level.FATAL
* Logger.Level.ERROR
* Logger.Level.WARN
* Logger.Level.INFO
* Logger.Level.DEBUG
* Logger.Level.TRACE
* Logger.Level.ALL

### Log Format

Both the log format and log messages may contain the following variables using the syntax `${VAR_NAME}` or `%{VAR_NAME}`:

* `LEVEL`: The log level for this log entry
* `MESSAGE`: The provided log message
* `NAME`: The name of the current logger (only available in log format)
* `TIMESTAMP`: Date and time the entry was logged
* `CTX:VAR_NAME`: Value of the VAR_NAME property from the log context
* `ENV:VAR_NAME`: The value of the VAR_NAME environment variable

While you can always use a custom string for the format, several constants are provided for convenience:

* Logger.Format.JSON = `{ "timestamp": "${TIMESTAMP}", "level": "${LEVEL}", "name": "${NAME}", "message": "${MESSAGE}" }`
* Logger.Format.JSON_NO_TIME = `{ "level": "${LEVEL}", "name": "${NAME}", "message": "${MESSAGE}" }`
* Logger.Format.TEXT = `[${TIMESTAMP}] [${LEVEL}] [${NAME}] ${MESSAGE}`
* Logger.Format.TEXT_NO_TIME = `[${LEVEL}] [${NAME}] ${MESSAGE}`

### Environment Variables

The log level and format can be controlled globally as well as for individual loggers using environment variables:

```bash
# Only log ERROR and higher level messages:
export LOG_LEVEL=ERROR

# Specify a different log level for the logger named MyLogger:
export LOG_LEVEL_MyLogger=DEBUG

# Specify the default log format:
export LOG_FORMAT='[${TIMESTAMP}] [${LEVEL}] [${NAME}] ${MESSAGE}'

# Specify a different log format for the logger named MyLogger:
export LOG_FORMAT_MyLogger='[${TIMESTAMP}] [${LEVEL}] [${NAME}] [${ENV:AWS_REGION}] ${MESSAGE}'
```

While the `LOG_LEVEL` environment variable doesn't need the `Logger.Level.` prefix as used in code, it can be used if preferred. In either case, the value must be present in the `Logger.Level` enum for it to take effect.

## Testimonials

Read what people are saying about Sitka:

> "Finally: the perfect Node.js logger!"
> - Chris Wells, Creator of Sitka

> "Without a doubt, this free logger is worth every penny."
> - Chris Wells, Creator of Sitka

> "This could easily be the best logger I've ever written."
> - Chris Wells, Creator of Sitka

> "With less than 250 lines of code and 0 dependencies, I love how environmentally friendly this logger is."
> - Chris Wells, Creator of Sitka

## Contributing

Sitka aims to remain lightweight with a focus on simple flexibility over complex features.  PRs are very welcome for bug fixes. Before writing any code for an additional feature, please submit a PR describing the intended change to determine whether the feature would be considered.
