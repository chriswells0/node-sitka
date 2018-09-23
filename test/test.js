'use strict';
var expect = require('chai').expect;
var stdout = require('test-console').stdout;
var stderr = require('test-console').stderr;
var Logger = require('../dist/index').default;

describe('Singleton method', () => {
	it('should return a default instance with no parameters', () => {
		var logger = Logger.getLogger();
		var output = stdout.inspectSync(function() {
			expect(logger, 'logger should exist').to.exist;
			logger.debug('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.contain('Sitka', 'default name was in log entry');
	});
	it('should return a named instance from a string parameter', () => {
		var logger = Logger.getLogger('StringParameter');
		var output = stdout.inspectSync(function() {
			expect(logger, 'logger should exist').to.exist;
			logger.debug('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.contain('StringParameter', 'specified name was in log entry');
	});
	it('should return a named instance from an object parameter', () => {
		var logger = Logger.getLogger({ name: 'ObjectParameter' });
		var output = stdout.inspectSync(function() {
			expect(logger, 'logger should exist').to.exist;
			logger.debug('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.contain('ObjectParameter', 'specified name was in log entry');
	});
	it('should return a named instance from a null object parameter', () => {
		var logger = Logger.getLogger({ name: null });
		var output = stdout.inspectSync(function() {
			expect(logger, 'logger should exist').to.exist;
			logger.debug('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.contain('Sitka', 'default name was in log entry');
	});
});

describe('Standard logger with a default config', () => {
	var logger = Logger.getLogger();
	forEveryLogMethod((level, methodName) => {
		it('should log multiple parameters for method ' + methodName + '()', () => {
			var errlog;
			var stdlog = stdout.inspectSync(function() {
				errlog = stderr.inspectSync(function() {
					logger[methodName]('This', 'is', 'a', 'test', 'message.');
				});
			});
			var output = [...errlog, ...stdlog];
			expect(output).to.have.lengthOf(1, '1 line was logged');
			expect(output[0]).to.contain('This is a test message.', 'all parameters were in log entry');
		});
	});
});

describe('Log level passed to constructor', () => {
	forEveryLogLevel((level, methodName) => {
		it('should produce correct log entries when log level is ' + level, () => {
			var logName = 'ConstructorLogLevel' + Logger.Level[level]; // Must be the number. -- cwells
			var logger = Logger.getLogger({ name: logName, level: Logger.Level[level] });
			checkOutputAtLogLevel(logger, Logger.Level[level]);
		});
	});
});

describe('Global log level set by environment variable', () => {
	forEveryLogLevel((level, methodName) => {
		it('should produce correct log entries when log level is ' + level, () => {
			var logName = 'GlobalEnvLogLevel' + Logger.Level[level]; // Must be the number. -- cwells
			var oldLogLevel = process.env['LOG_LEVEL'];
			process.env['LOG_LEVEL'] = level;
			var logger = Logger.getLogger({ name: logName });
			checkOutputAtLogLevel(logger, Logger.Level[level]);
			if (oldLogLevel) {
				process.env['LOG_LEVEL'] = oldLogLevel;
			} else {
				delete process.env['LOG_LEVEL'];
			}
		});
	});
});

describe('Instance log level set by environment variable', () => {
	forEveryLogLevel((level, methodName) => {
		it('should produce correct log entries when log level is ' + level, () => {
			var logName = 'InstanceEnvLogLevel' + Logger.Level[level]; // Must be the number. -- cwells
			var oldLogLevel = process.env['LOG_LEVEL_' + logName];
			process.env['LOG_LEVEL_' + logName] = level;
			var logger = Logger.getLogger({ name: logName });
			checkOutputAtLogLevel(logger, Logger.Level[level]);
			if (oldLogLevel) {
				process.env['LOG_LEVEL_' + logName] = oldLogLevel;
			} else {
				delete process.env['LOG_LEVEL_' + logName];
			}
		});
	});
});

describe('Predefined log formats', () => {
	it('should produce correct log entries when set to JSON', () => {
		// Log message doesn't include milliseconds, so it's effectively rounded down.
		// Take off 1 second to ensure the rounding doesn't lead to failures. -- cwells
		var beforeLogEntry = Date.now() - 1000;
		var logger = Logger.getLogger({ name: 'FormatJSON', format: Logger.Format.JSON });
		var output = stdout.inspectSync(function() {
			logger.info('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		var jsonRecord;
		try {
			jsonRecord = JSON.parse(output[0]);
		} catch (ex) {}
		expect(jsonRecord, 'is valid JSON').to.exist;
		expect(jsonRecord).to.have.property('level', 'INFO', 'includes the correct log level');
		expect(jsonRecord).to.have.property('message', 'Test message.', 'includes the correct log message');
		expect(jsonRecord).to.have.property('name', 'FormatJSON', 'includes the correct log name');
		expect(jsonRecord, 'has a timestamp property').to.have.property('timestamp');
		var logTime = new Date(jsonRecord.timestamp);
		expect(logTime.getTime(), 'timestamp is a valid date and time').to.not.be.NaN;
		expect(logTime.getTime()).to.be.within(beforeLogEntry, Date.now(), 'timestamp is within this test execution period');
	});
	it('should produce correct log entries when set to JSON_NO_TIME', () => {
		var logger = Logger.getLogger({ name: 'FormatJSON_NO_TIME', format: Logger.Format.JSON_NO_TIME });
		var output = stdout.inspectSync(function() {
			logger.info('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		var jsonRecord;
		try {
			jsonRecord = JSON.parse(output[0]);
		} catch (ex) {}
		expect(jsonRecord, 'is valid JSON').to.exist;
		expect(jsonRecord).to.have.property('level', 'INFO', 'includes the correct log level');
		expect(jsonRecord).to.have.property('message', 'Test message.', 'includes the correct log message');
		expect(jsonRecord).to.have.property('name', 'FormatJSON_NO_TIME', 'includes the correct log name');
		expect(jsonRecord, 'does not have a timestamp property').to.not.have.property('timestamp');
	});
	it('should produce correct log entries when set to TEXT', () => {
		// Log message doesn't include milliseconds, so it's effectively rounded down.
		// Take off 1 second to ensure the rounding doesn't lead to failures. -- cwells
		var beforeLogEntry = Date.now() - 1000;
		var logger = Logger.getLogger({ name: 'FormatTEXT', format: Logger.Format.TEXT });
		var output = stdout.inspectSync(function() {
			logger.info('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		var matches = output[0].match(/^\[([^\]]+)\]\s(.+)\n$/);
		expect(matches, 'has the correct format').to.exist;
		expect(matches).to.have.lengthOf(3, 'has the correct format');
		var logTime = new Date(matches[1]);
		expect(logTime.getTime(), 'timestamp is a valid date and time').to.not.be.NaN;
		expect(logTime.getTime()).to.be.within(beforeLogEntry, Date.now(), 'timestamp is within this test execution period');
		expect(matches[2]).to.equal('[INFO] [FormatTEXT] Test message.', 'created the correct log entry');
	});
	it('should produce correct log entries when set to TEXT_NO_TIME', () => {
		var logger = Logger.getLogger({ name: 'FormatTEXT_NO_TIME', format: Logger.Format.TEXT_NO_TIME });
		var output = stdout.inspectSync(function() {
			logger.info('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('[INFO] [FormatTEXT_NO_TIME] Test message.\n', 'created the correct log entry');
	});
});

describe('Log format', () => {
	it('should be modified by the config parameter', () => {
		var logger = Logger.getLogger({ name: 'FormatConfig', format: 'Config: ${MESSAGE}' });
		var output = stdout.inspectSync(function() {
			logger.info('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('Config: Test message.\n', 'created the correct log entry');
	});
	it('should be modified by a global environment variable', () => {
		var output = stdout.inspectSync(function() {
			var oldLogFormat = process.env['LOG_FORMAT'];
			process.env['LOG_FORMAT'] = 'Global ENV: ${MESSAGE}';
			var logger = Logger.getLogger({ name: 'FormatGlobalEnv' });
			logger.info('Test message.');
			if (oldLogFormat) {
				process.env['LOG_FORMAT'] = oldLogFormat;
			} else {
				delete process.env['LOG_FORMAT'];
			}
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('Global ENV: Test message.\n', 'created the correct log entry');
	});
	it('should be modified by an instance environment variable', () => {
		var output = stdout.inspectSync(function() {
			var oldLogFormat = process.env['LOG_FORMAT_FormatInstanceEnv'];
			process.env['LOG_FORMAT_FormatInstanceEnv'] = 'Instance ENV: ${MESSAGE}';
			var logger = Logger.getLogger({ name: 'FormatInstanceEnv' });
			logger.info('Test message.');
			if (oldLogFormat) {
				process.env['LOG_FORMAT_FormatInstanceEnv'] = oldLogFormat;
			} else {
				delete process.env['LOG_FORMAT_FormatInstanceEnv'];
			}
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('Instance ENV: Test message.\n', 'created the correct log entry');
	});
	it('should default to TEXT_NO_TIME on AWS Lambda', () => {
		var oldLambda = process.env['LAMBDA_TASK_ROOT'];
		process.env['LAMBDA_TASK_ROOT'] = 'valueDoesNotMatter';
		var logger = Logger.getLogger({ name: 'FormatLambda' });
		var output = stdout.inspectSync(function() {
			logger.info('Test message.');
		});
		if (oldLambda) {
			process.env['LAMBDA_TASK_ROOT'] = oldLambda;
		} else {
			delete process.env['LOG_FORMAT_FormatInstanceEnv'];
		}
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('[INFO] [FormatLambda] Test message.\n', 'created the correct log entry');
	});
});

describe('Environment variables', () => {
	it('should be substituted in the log format', () => {
		var logger = Logger.getLogger({ name: 'ENVFormat', format: '${ENV:SitkaEnvTest} - %{ENV:SitkaEnvTest}' });
		var output = stdout.inspectSync(function() {
			process.env['SitkaEnvTest'] = 'SitkaEnvTestValue';
			logger.info('Test message.');
			delete process.env['SitkaEnvTest'];
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('SitkaEnvTestValue - SitkaEnvTestValue\n', 'created the correct log entry');
	});
	it('should be escapable in the log format', () => {
		var logger = Logger.getLogger({ name: 'ENVFormatEscaped', format: '\\${ENV:SitkaEnvTest} - \\%{ENV:SitkaEnvTest}' });
		var output = stdout.inspectSync(function() {
			process.env['SitkaEnvTest'] = 'SitkaEnvTestValue';
			logger.info('Test message.');
			delete process.env['SitkaEnvTest'];
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('${ENV:SitkaEnvTest} - %{ENV:SitkaEnvTest}\n', 'created the correct log entry');
	});
	it('should be substituted in the log message', () => {
		var logger = Logger.getLogger({ name: 'ENVMessage', format: '${MESSAGE}' });
		var output = stdout.inspectSync(function() {
			process.env['SitkaEnvTest'] = 'SitkaEnvTestValue';
			logger.info('${ENV:SitkaEnvTest} - %{ENV:SitkaEnvTest}');
			delete process.env['SitkaEnvTest'];
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('SitkaEnvTestValue - SitkaEnvTestValue\n', 'created the correct log entry');
	});
	it('should be escapable in the log message', () => {
		var logger = Logger.getLogger({ name: 'ENVMessageEscaped', format: '${MESSAGE}' });
		var output = stdout.inspectSync(function() {
			process.env['SitkaEnvTest'] = 'SitkaEnvTestValue';
			logger.info('\\${ENV:SitkaEnvTest} - \\%{ENV:SitkaEnvTest}');
			delete process.env['SitkaEnvTest'];
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('${ENV:SitkaEnvTest} - %{ENV:SitkaEnvTest}\n', 'created the correct log entry');
	});
	it('should return empty values when process.env is not available', () => {
		var oldEnv = process && process.env;
		if (oldEnv) {
			process.env = null;
		}
		var logger = Logger.getLogger({ name: 'ENVNotAvailable', format: '${MESSAGE}' });
		var output = stdout.inspectSync(function() {
			logger.info('${ENV:SitkaEnvTest} - %{ENV:SitkaEnvTest}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal(' - \n', 'created the correct log entry');
		if (oldEnv) {
			process.env = oldEnv;
		}
	});
});

describe('Instance context variables', () => {
	var globalContext = {
			contextScopeTest: 'globalContextTestValue',
			global: {
				varOne: 'globalValueOne'
			}
		},
		localContext = {
			arrayVar: [1, 2, 3],
			contextScopeTest: 'localContextTestValue',
			local: {
				nullVar: null,
				varOne: 'localValueOne'
			}
		};
	it('should be substituted in the log format', () => {
		var logger = Logger.getLogger({
			name: 'CTXFormat',
			context: localContext,
			format: '${CTX:contextScopeTest}, %{CTX:contextScopeTest}, ${CTX:local.varOne}, %{CTX:local.varOne}'
		});
		var output = stdout.inspectSync(function() {
			logger.info('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('localContextTestValue, localContextTestValue, localValueOne, localValueOne\n', 'created the correct log entry');
	});
	it('should be escapable in the log format', () => {
		var logger = Logger.getLogger({
			name: 'CTXFormatEscaped',
			context: localContext,
			format: '\\${CTX:contextScopeTest}, \\%{CTX:contextScopeTest}, \\${CTX:local.varOne}, \\%{CTX:local.varOne}'
		});
		var output = stdout.inspectSync(function() {
			logger.info('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('${CTX:contextScopeTest}, %{CTX:contextScopeTest}, ${CTX:local.varOne}, %{CTX:local.varOne}\n', 'created the correct log entry');
	});
	it('should be substituted in the log message', () => {
		var logger = Logger.getLogger({
			name: 'CTXMessage',
			context: localContext,
			format: '${MESSAGE}'
		});
		var output = stdout.inspectSync(function() {
			logger.info('${CTX:contextScopeTest}, %{CTX:contextScopeTest}, ${CTX:local.varOne}, %{CTX:local.varOne}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('localContextTestValue, localContextTestValue, localValueOne, localValueOne\n', 'created the correct log entry');
	});
	it('should be escapable in the log message', () => {
		var logger = Logger.getLogger({
			name: 'CTXMessageEscaped',
			context: localContext,
			format: '${MESSAGE}'
		});
		var output = stdout.inspectSync(function() {
			logger.info('\\${CTX:contextScopeTest}, \\%{CTX:contextScopeTest}, \\${CTX:local.varOne}, \\%{CTX:local.varOne}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('${CTX:contextScopeTest}, %{CTX:contextScopeTest}, ${CTX:local.varOne}, %{CTX:local.varOne}\n', 'created the correct log entry');
	});
	it('should support logging null and undefined properties', () => {
		var logger = Logger.getLogger({
			name: 'CTXMessageNullUndefinedValues',
			context: localContext,
			format: '${MESSAGE}'
		});
		var output = stdout.inspectSync(function() {
			logger.info('${CTX:local.undefined}, %{CTX:local.undefined}, ${CTX:local.nullVar}, %{CTX:local.nullVar}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal(', , null, null\n', 'created the correct log entry');
	});
	it('should support logging undefined variables', () => {
		var logger = Logger.getLogger({
			name: 'CTXUndefinedVariables',
			format: '${MESSAGE}'
		});
		logger.setContext('undefinedVar', undefined);
		var output = stdout.inspectSync(function() {
			logger.info('${CTX:undefinedVar}, %{CTX:undefinedVar}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('undefined, undefined\n', 'created the correct log entry');
	});
	it('should support logging complete objects', () => {
		Object.prototype.invalidProperty = 'test';
		var logger = Logger.getLogger({
			name: 'CTXMessageObject',
			context: localContext,
			format: '${MESSAGE}'
		});
		var output = stdout.inspectSync(function() {
			logger.info('${CTX:local}, %{CTX:local}');
		});
		delete Object.prototype.invalidProperty;
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('{ nullVar: null, varOne: localValueOne }, { nullVar: null, varOne: localValueOne }\n', 'created the correct log entry');
	});
	it('should support logging functions', () => {
		var logger = Logger.getLogger({
			name: 'CTXMessageFunction',
			format: '${MESSAGE}'
		});
		logger.setContext('myFunction', function myFunction() { })
		var output = stdout.inspectSync(function() {
			logger.info('${CTX:myFunction}, %{CTX:myFunction}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('function myFunction() { }, function myFunction() { }\n', 'created the correct log entry');
	});
	it('should support logging arrays', () => {
		var logger = Logger.getLogger({
			name: 'CTXMessageArray',
			context: localContext,
			format: '${MESSAGE}'
		});
		var output = stdout.inspectSync(function() {
			logger.info('${CTX:arrayVar}, %{CTX:arrayVar}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('[ 1, 2, 3 ], [ 1, 2, 3 ]\n', 'created the correct log entry');
	});
	it('should return an emtpy string for invalid context variables', () => {
		var logger = Logger.getLogger({
			name: 'CTXInvalidVariable',
			context: localContext,
			format: '${MESSAGE}'
		});
		var output = stdout.inspectSync(function() {
			logger.info('${CTX:invalidVariable}%{CTX:invalidVariable}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('\n', 'created the correct log entry');
	});
	it('should allow setting the context with static methods', () => {
		var logger = Logger.getLogger({
			name: 'CTXStaticSetterMethods',
			format: '${MESSAGE}'
		});
		Logger.setGlobalContext(globalContext);
		Logger.setGlobalContext('globalVar', 'globalValue');
		var output = stdout.inspectSync(function() {
			logger.info('${CTX:globalVar}, %{CTX:globalVar}, ${CTX:global.varOne}, %{CTX:global.varOne}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('globalValue, globalValue, globalValueOne, globalValueOne\n', 'created the correct log entry');
	});
	it('should allow setting the context with instance methods', () => {
		var logger = Logger.getLogger({
			name: 'CTXInstanceSetterMethods',
			format: '${MESSAGE}'
		});
		logger.setContext(localContext);
		logger.setContext('localVar', 'localVarValue');
		var output = stdout.inspectSync(function() {
			logger.info('${CTX:localVar}, %{CTX:localVar}, ${CTX:local.varOne}, %{CTX:local.varOne}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('localVarValue, localVarValue, localValueOne, localValueOne\n', 'created the correct log entry');
	});
	it('should overwrite the global context with the local context', () => {
		var logger = Logger.getLogger({
			name: 'CTXGlobal',
			context: localContext,
			format: '${MESSAGE}'
		});
		Logger.setGlobalContext(globalContext);
		var output = stdout.inspectSync(function() {
			logger.info('${CTX:contextScopeTest}, %{CTX:contextScopeTest}, ${CTX:global.varOne}, %{CTX:global.varOne}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('localContextTestValue, localContextTestValue, globalValueOne, globalValueOne\n', 'created the correct log entry');
	});
	it('should use the correct context when using custom __assign()', () => {
		var oldAssign = Object.assign;
		Object.assign = null; // Force using custom assign(). -- cwells
		Object.prototype.invalidProperty = 'test';
		delete require.cache[require.resolve('../dist/index.js')]; // Invalidate cached file. -- cwells
		Logger = require('../dist/index').default;
		var logger = Logger.getLogger({
			name: 'CTXCustomAssign',
			context: localContext,
			format: '${MESSAGE}'
		});
		Logger.setGlobalContext(globalContext);
		var output = stdout.inspectSync(function() {
			logger.info('${CTX:contextScopeTest}, %{CTX:contextScopeTest}, ${CTX:global.varOne}, %{CTX:global.varOne}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('localContextTestValue, localContextTestValue, globalValueOne, globalValueOne\n', 'created the correct log entry');
		Object.assign = oldAssign;
		delete Object.prototype.invalidProperty;
		delete require.cache[require.resolve('../dist/index.js')]; // Invalidate cached file. -- cwells
		Logger = require('../dist/index').default;
	});
});

describe('Log writer methods when console is null', () => {
	var oldConsoleError = console.error;
	var oldConsoleLog = console.log;
	console.error = null;
	console.log = null;
	delete require.cache[require.resolve('../dist/index.js')]; // Invalidate cached file. -- cwells
	Logger = require('../dist/index').default;
	forEveryLogMethod((level, methodName) => {
		it('should produce correct log entries when log level is ' + level, () => {
			var logName = 'ProcessWriter' + Logger.Level[level]; // Must be the number. -- cwells
			var logger = Logger.getLogger({ name: logName, format: '${MESSAGE}' });
			var errlog;
			var stdlog = stdout.inspectSync(function() {
				errlog = stderr.inspectSync(function() {
					logger[methodName]('Test message.');
				});
			});
			var output = [...errlog, ...stdlog];
			expect(output).to.have.lengthOf(1, '1 line was logged');
			if (level === 'FATAL' || level === 'ERROR') {
				expect(output[0]).to.equal('Test message.\n', 'message was logged to the error writer');
			} else {
				expect(output[0]).to.equal('Test message.\n', 'message was logged to the log writer');
			}
		});
	});
	if (oldConsoleError) {
		console.error = oldConsoleError;
	}
	if (oldConsoleLog) {
		console.log = oldConsoleLog;
	}
	delete require.cache[require.resolve('../dist/index.js')]; // Invalidate cached file. -- cwells
	Logger = require('../dist/index').default;
});

describe('Custom log writer methods', () => {
	function logError(message) {
		console.log('Error: ' + message);
	}
	function logStandard(message) {
		console.log('Standard: ' + message);
	}
	forEveryLogMethod((level, methodName) => {
		it('should produce correct log entries when log level is ' + level, () => {
			var logName = 'CustomWriter' + Logger.Level[level]; // Must be the number. -- cwells
			var logger = Logger.getLogger({ name: logName, format: '${MESSAGE}' });
			Logger.setErrorWriter(logError);
			Logger.setLogWriter(logStandard);
			var errlog;
			var stdlog = stdout.inspectSync(function() {
				errlog = stderr.inspectSync(function() {
					logger[methodName]('Test message.');
				});
			});
			var output = [...errlog, ...stdlog];
			expect(output).to.have.lengthOf(1, '1 line was logged');
			if (level === 'FATAL' || level === 'ERROR') {
				expect(output[0]).to.equal('Error: Test message.\n', 'message was logged to the error writer');
			} else {
				expect(output[0]).to.equal('Standard: Test message.\n', 'message was logged to the log writer');
			}
		});
	});
});

/* Helper Functions */

function forEveryLogLevel(callback) {
	for (const level in Logger.Level) {
		if (isNaN(level)) {
			callback(level, (typeof Logger.prototype[level.toLowerCase()] === 'function' ? level.toLowerCase() : null));
		}
	}
}

function forEveryLogMethod(callback) {
	forEveryLogLevel((level, methodName) => {
		if (methodName) {
			callback(level, methodName);
		}
	});
}

function checkOutputAtLogLevel(logger, logLevel) {
	var expectedLines = (logLevel === Logger.Level.ALL ? Logger.Level.ALL - 1 : logLevel) - 1;
	var errlog;
	var stdlog = stdout.inspectSync(function() {
		errlog = stderr.inspectSync(function() {
			forEveryLogMethod((level, methodName) => {
				logger[methodName]('Test message.');
			});
		});
	});
	var output = [...errlog, ...stdlog];
	expect(output).to.have.lengthOf(expectedLines, expectedLines + ' line(s) were logged');
	output = output.join('');
	forEveryLogMethod((level, methodName) => {
		if (logLevel >= Logger.Level[level]) {
			expect(output).to.contain(level, level + ' is logged when log level is ' + Logger.Level[logLevel]);
		} else {
			expect(output).to.not.contain(level, level + ' is not logged when log level is ' + Logger.Level[logLevel]);
		}
	});
}
