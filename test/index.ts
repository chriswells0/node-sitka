'use strict';

import { expect } from 'chai';
import * as testConsole from 'test-console';
import { LogFormat, LogFunction, Logger, LogLevel } from '../dist/index';

const stdout = testConsole.stdout;
const stderr = testConsole.stderr;

describe('Singleton method', () => {
	it('should return a default instance with no parameters', () => {
		const logger: Logger = Logger.getLogger();
		const output: string[] = stdout.inspectSync(() => {
			expect(logger, 'logger should exist').to.exist; // tslint:disable-line:no-unused-expression
			logger.debug('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.contain('Sitka', 'default name was in log entry');
	});
	it('should return a named instance from a string parameter', () => {
		const logger: Logger = Logger.getLogger('StringParameter');
		const output: string[] = stdout.inspectSync(() => {
			expect(logger, 'logger should exist').to.exist; // tslint:disable-line:no-unused-expression
			logger.debug('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.contain('StringParameter', 'specified name was in log entry');
	});
	it('should return a named instance from an object parameter', () => {
		const logger: Logger = Logger.getLogger({ name: 'ObjectParameter' });
		const output: string[] = stdout.inspectSync(() => {
			expect(logger, 'logger should exist').to.exist; // tslint:disable-line:no-unused-expression
			logger.debug('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.contain('ObjectParameter', 'specified name was in log entry');
	});
	it('should return a named instance from a null object parameter', () => {
		const logger: Logger = Logger.getLogger({ name: undefined });
		const output: string[] = stdout.inspectSync(() => {
			expect(logger, 'logger should exist').to.exist; // tslint:disable-line:no-unused-expression
			logger.debug('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.contain('Sitka', 'default name was in log entry');
	});
});

describe('Standard logger with a default config', () => {
	const logger: Logger = Logger.getLogger();
	forEveryLogMethod((level: keyof typeof LogLevel, method: LogFunction) => {
		it('should log multiple parameters for method ' + level.toLowerCase() + '()', () => {
			let errlog: string[] = [];
			const stdlog: string[] = stdout.inspectSync(() => {
				errlog = stderr.inspectSync(() => {
					method.call(logger, 'This', 'is', 'a', 'test', 'message.');
				});
			});
			const output: string[] = [...errlog, ...stdlog];
			expect(output).to.have.lengthOf(1, '1 line was logged');
			expect(output[0]).to.contain('This is a test message.', 'all parameters were in log entry');
		});
	});
});

describe('Log level passed to constructor', () => {
	forEveryLogLevel((level: keyof typeof LogLevel, method: LogFunction | null) => {
		it('should produce correct log entries when log level is ' + level, () => {
			const logName: string = 'ConstructorLogLevel' + LogLevel[level]; // Must be the number. -- cwells
			const logger: Logger = Logger.getLogger({ name: logName, level: LogLevel[level] });
			checkOutputAtLogLevel(logger, LogLevel[level]);
		});
	});
});

describe('Global log level set by environment variable', () => {
	forEveryLogLevel((level: keyof typeof LogLevel, method: LogFunction | null) => {
		it('should produce correct log entries when log level is ' + level, () => {
			const logName: string = 'GlobalEnvLogLevel' + LogLevel[level]; // Must be the number. -- cwells
			const oldLogLevel = process.env.LOG_LEVEL;
			process.env.LOG_LEVEL = level;
			const logger: Logger = Logger.getLogger({ name: logName });
			checkOutputAtLogLevel(logger, LogLevel[level]);
			if (oldLogLevel) {
				process.env.LOG_LEVEL = oldLogLevel;
			} else {
				delete process.env.LOG_LEVEL;
			}
		});
	});
});

describe('Instance log level set by environment variable', () => {
	forEveryLogLevel((level: keyof typeof LogLevel, method: LogFunction | null) => {
		it('should produce correct log entries when log level is ' + level, () => {
			const logName: string = 'InstanceEnvLogLevel' + LogLevel[level]; // Must be the number. -- cwells
			const oldLogLevel = process.env['LOG_LEVEL_' + logName];
			process.env['LOG_LEVEL_' + logName] = level;
			const logger: Logger = Logger.getLogger({ name: logName });
			checkOutputAtLogLevel(logger, LogLevel[level]);
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
		const beforeLogEntry = Date.now() - 1000;
		const logger: Logger = Logger.getLogger({ name: 'FormatJSON', format: LogFormat.JSON });
		const output: string[] = stdout.inspectSync(() => {
			logger.info('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		let jsonRecord;
		try {
			jsonRecord = JSON.parse(output[0]);
		} catch (ex) { /* Do nothing. */ }
		expect(jsonRecord, 'is valid JSON').to.exist; // tslint:disable-line:no-unused-expression
		expect(jsonRecord).to.have.property('level', 'INFO', 'includes the correct log level');
		expect(jsonRecord).to.have.property('message', 'Test message.', 'includes the correct log message');
		expect(jsonRecord).to.have.property('name', 'FormatJSON', 'includes the correct log name');
		expect(jsonRecord, 'has a timestamp property').to.have.property('timestamp');
		const logTime: Date = new Date(jsonRecord.timestamp);
		expect(logTime.getTime(),
			'timestamp is a valid date and time').to.not.be.NaN; // tslint:disable-line:no-unused-expression
		expect(logTime.getTime()).to.be.within(beforeLogEntry, Date.now(), 'timestamp is within this test execution period');
	});
	it('should produce correct log entries when set to JSON_NO_TIME', () => {
		const logger: Logger = Logger.getLogger({ name: 'FormatJSON_NO_TIME', format: LogFormat.JSON_NO_TIME });
		const output: string[] = stdout.inspectSync(() => {
			logger.info('Test with "quotes" in it.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		let jsonRecord;
		try {
			jsonRecord = JSON.parse(output[0]);
		} catch (ex) { /* Do nothing. */ }
		expect(jsonRecord, 'is valid JSON').to.exist; // tslint:disable-line:no-unused-expression
		expect(jsonRecord).to.have.property('level', 'INFO', 'includes the correct log level');
		expect(jsonRecord).to.have.property('message', 'Test with "quotes" in it.', 'includes the correct log message');
		expect(jsonRecord).to.have.property('name', 'FormatJSON_NO_TIME', 'includes the correct log name');
		expect(jsonRecord, 'does not have a timestamp property').to.not.have.property('timestamp');
	});
	it('should produce correct log entries when set to TEXT', () => {
		// Log message doesn't include milliseconds, so it's effectively rounded down.
		// Take off 1 second to ensure the rounding doesn't lead to failures. -- cwells
		const beforeLogEntry: number = Date.now() - 1000;
		const logger: Logger = Logger.getLogger({ name: 'FormatTEXT', format: LogFormat.TEXT });
		const output: string[] = stdout.inspectSync(() => {
			logger.info('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		const matches: RegExpMatchArray | null = output[0].match(/^\[([^\]]+)\]\s(.+)\n$/);
		expect(matches, 'has the correct format').to.exist; // tslint:disable-line:no-unused-expression
		expect(matches).to.have.lengthOf(3, 'has the correct format');
		if (matches) {
			const logTime: Date = new Date(matches[1]);
			expect(logTime.getTime(),
				'timestamp is a valid date and time').to.not.be.NaN; // tslint:disable-line:no-unused-expression
			expect(logTime.getTime()).to.be.within(beforeLogEntry, Date.now(), 'timestamp is within this test execution period');
			expect(matches[2]).to.equal('[INFO] [FormatTEXT] Test message.', 'created the correct log entry');
		}
	});
	it('should produce correct log entries when set to TEXT_NO_TIME', () => {
		const logger: Logger = Logger.getLogger({ name: 'FormatTEXT_NO_TIME', format: LogFormat.TEXT_NO_TIME });
		const output: string[] = stdout.inspectSync(() => {
			logger.info('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('[INFO] [FormatTEXT_NO_TIME] Test message.\n', 'created the correct log entry');
	});
});

describe('Log format', () => {
	it('should be modified by the config parameter', () => {
		const logger: Logger = Logger.getLogger({ name: 'FormatConfig', format: 'Config: ${MESSAGE}' });
		const output: string[] = stdout.inspectSync(() => {
			logger.info('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('Config: Test message.\n', 'created the correct log entry');
	});
	it('should be modified by a global environment variable', () => {
		const output: string[] = stdout.inspectSync(() => {
			const oldLogFormat = process.env.LOG_FORMAT;
			process.env.LOG_FORMAT = 'Global ENV: ${MESSAGE}';
			const logger: Logger = Logger.getLogger({ name: 'FormatGlobalEnv' });
			logger.info('Test message.');
			if (oldLogFormat) {
				process.env.LOG_FORMAT = oldLogFormat;
			} else {
				delete process.env.LOG_FORMAT;
			}
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('Global ENV: Test message.\n', 'created the correct log entry');
	});
	it('should be modified by an instance environment variable', () => {
		const output: string[] = stdout.inspectSync(() => {
			const oldLogFormat = process.env.LOG_FORMAT_FormatInstanceEnv;
			process.env.LOG_FORMAT_FormatInstanceEnv = 'Instance ENV: ${MESSAGE}';
			const logger: Logger = Logger.getLogger({ name: 'FormatInstanceEnv' });
			logger.info('Test message.');
			if (oldLogFormat) {
				process.env.LOG_FORMAT_FormatInstanceEnv = oldLogFormat;
			} else {
				delete process.env.LOG_FORMAT_FormatInstanceEnv;
			}
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('Instance ENV: Test message.\n', 'created the correct log entry');
	});
	it('should default to TEXT_NO_TIME on AWS Lambda', () => {
		const oldLambda = process.env.LAMBDA_TASK_ROOT;
		process.env.LAMBDA_TASK_ROOT = 'valueDoesNotMatter';
		const logger: Logger = Logger.getLogger({ name: 'FormatLambda' });
		const output: string[] = stdout.inspectSync(() => {
			logger.info('Test message.');
		});
		if (oldLambda) {
			process.env.LAMBDA_TASK_ROOT = oldLambda;
		} else {
			delete process.env.LAMBDA_TASK_ROOT;
		}
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('[INFO] [FormatLambda] Test message.\n', 'created the correct log entry');
	});
});

describe('Environment variables', () => {
	it('should be substituted in the log format', () => {
		const logger: Logger = Logger.getLogger({ name: 'ENVFormat', format: '${ENV:SitkaEnvTest} - %{ENV:SitkaEnvTest}' });
		const output: string[] = stdout.inspectSync(() => {
			process.env.SitkaEnvTest = 'SitkaEnvTestValue';
			logger.info('Test message.');
			delete process.env.SitkaEnvTest;
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('SitkaEnvTestValue - SitkaEnvTestValue\n', 'created the correct log entry');
	});
	it('should be escapable in the log format', () => {
		const logger: Logger = Logger.getLogger({
			format: '\\${ENV:SitkaEnvTest} - \\%{ENV:SitkaEnvTest}',
			name: 'ENVFormatEscaped',
		});
		const output: string[] = stdout.inspectSync(() => {
			process.env.SitkaEnvTest = 'SitkaEnvTestValue';
			logger.info('Test message.');
			delete process.env.SitkaEnvTest;
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('${ENV:SitkaEnvTest} - %{ENV:SitkaEnvTest}\n', 'created the correct log entry');
	});
	it('should be substituted in the log message', () => {
		const logger: Logger = Logger.getLogger({ name: 'ENVMessage', format: '${MESSAGE}' });
		const output: string[] = stdout.inspectSync(() => {
			process.env.SitkaEnvTest = 'SitkaEnvTestValue';
			logger.info('${ENV:SitkaEnvTest} - %{ENV:SitkaEnvTest}');
			delete process.env.SitkaEnvTest;
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('SitkaEnvTestValue - SitkaEnvTestValue\n', 'created the correct log entry');
	});
	it('should be escapable in the log message', () => {
		const logger: Logger = Logger.getLogger({ name: 'ENVMessageEscaped', format: '${MESSAGE}' });
		const output: string[] = stdout.inspectSync(() => {
			process.env.SitkaEnvTest = 'SitkaEnvTestValue';
			logger.info('\\${ENV:SitkaEnvTest} - \\%{ENV:SitkaEnvTest}');
			delete process.env.SitkaEnvTest;
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('${ENV:SitkaEnvTest} - %{ENV:SitkaEnvTest}\n', 'created the correct log entry');
	});
	it('should return empty values when process.env is not available', () => {
		const oldEnv = process && process.env;
		if (oldEnv) {
			process.env = {};
		}
		const logger: Logger = Logger.getLogger({ name: 'ENVNotAvailable', format: '${MESSAGE}' });
		const output: string[] = stdout.inspectSync(() => {
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
	const globalContext = {
			contextScopeTest: 'globalContextTestValue',
			global: {
				varOne: 'globalValueOne',
			},
		};
	const localContext = {
			arrayVar: [1, 2, 3],
			contextScopeTest: 'localContextTestValue',
			local: {
				nullVar: null,
				subObject: { testProp: true },
				undefVar: undefined,
				varOne: 'localValueOne',
			},
		};
	it('should be substituted in the log format', () => {
		const logger: Logger = Logger.getLogger({
			context: localContext,
			format: '${CTX:contextScopeTest}, %{CTX:contextScopeTest}, ${CTX:local.varOne}, %{CTX:local.varOne}',
			name: 'CTXFormat',
		});
		const output: string[] = stdout.inspectSync(() => {
			logger.info('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('localContextTestValue, localContextTestValue, localValueOne, localValueOne\n',
									'created the correct log entry');
	});
	it('should be escapable in the log format', () => {
		const logger: Logger = Logger.getLogger({
			context: localContext,
			format: '\\${CTX:contextScopeTest}, \\%{CTX:contextScopeTest}, \\${CTX:local.varOne}, \\%{CTX:local.varOne}',
			name: 'CTXFormatEscaped',
		});
		const output: string[] = stdout.inspectSync(() => {
			logger.info('Test message.');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal(
			'${CTX:contextScopeTest}, %{CTX:contextScopeTest}, ${CTX:local.varOne}, %{CTX:local.varOne}\n',
			'created the correct log entry');
	});
	it('should be substituted in the log message', () => {
		const logger: Logger = Logger.getLogger({
			context: localContext,
			format: '${MESSAGE}',
			name: 'CTXMessage',
		});
		const output: string[] = stdout.inspectSync(() => {
			logger.info('${CTX:contextScopeTest}, %{CTX:contextScopeTest}, ${CTX:local.varOne}, %{CTX:local.varOne}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('localContextTestValue, localContextTestValue, localValueOne, localValueOne\n',
									'created the correct log entry');
	});
	it('should be escapable in the log message', () => {
		const logger: Logger = Logger.getLogger({
			context: localContext,
			format: '${MESSAGE}',
			name: 'CTXMessageEscaped',
		});
		const output: string[] = stdout.inspectSync(() => {
			logger.info('\\${CTX:contextScopeTest}, \\%{CTX:contextScopeTest}, \\${CTX:local.varOne}, \\%{CTX:local.varOne}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal(
			'${CTX:contextScopeTest}, %{CTX:contextScopeTest}, ${CTX:local.varOne}, %{CTX:local.varOne}\n',
			'created the correct log entry');
	});
	it('should support logging null and undefined properties', () => {
		const logger: Logger = Logger.getLogger({
			context: localContext,
			format: '${MESSAGE}',
			name: 'CTXMessageNullUndefinedValues',
		});
		const output: string[] = stdout.inspectSync(() => {
			logger.info('${CTX:local.undefined}, %{CTX:local.undefined}, ${CTX:local.nullVar}, %{CTX:local.nullVar}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal(', , null, null\n', 'created the correct log entry');
	});
	it('should support logging undefined variables', () => {
		const logger: Logger = Logger.getLogger({
			format: '${MESSAGE}',
			name: 'CTXUndefinedVariables',
		});
		logger.setContext('undefinedVar', undefined);
		const output: string[] = stdout.inspectSync(() => {
			logger.info('${CTX:undefinedVar}, %{CTX:undefinedVar}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('undefined, undefined\n', 'created the correct log entry');
	});
	it('should support logging complete objects', () => {
		const logger: Logger = Logger.getLogger({
			context: localContext,
			format: '${MESSAGE}',
			name: 'CTXMessageObject',
		});
		const output: string[] = stdout.inspectSync(() => {
			logger.info('${CTX:local}, %{CTX:local}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal(
			'{ nullVar: null, subObject: { testProp: true }, undefVar: undefined,'
			+ ' varOne: "localValueOne" }, { nullVar: null, subObject: { testProp: true },'
			+ ' undefVar: undefined, varOne: "localValueOne" }\n',
			'created the correct log entry');
	});
	it('should support logging functions', () => {
		const logger: Logger = Logger.getLogger({
			format: '${MESSAGE}',
			name: 'CTXMessageFunction',
		});
		logger.setContext('myFunction', function myFunction() { const x = 1; return x; });
		const output: string[] = stdout.inspectSync(() => {
			logger.info('${CTX:myFunction}, %{CTX:myFunction}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal(
			'function myFunction() { var x = 1; return x; }, function myFunction() { var x = 1; return x; }\n',
			'created the correct log entry');
	});
	it('should support logging arrays', () => {
		const logger: Logger = Logger.getLogger({
			context: localContext,
			format: '${MESSAGE}',
			name: 'CTXMessageArray',
		});
		const output: string[] = stdout.inspectSync(() => {
			logger.info('${CTX:arrayVar}, %{CTX:arrayVar}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('[ 1, 2, 3 ], [ 1, 2, 3 ]\n', 'created the correct log entry');
	});
	it('should return an emtpy string for invalid context variables', () => {
		const logger: Logger = Logger.getLogger({
			context: localContext,
			format: '${MESSAGE}',
			name: 'CTXInvalidVariable',
		});
		const output: string[] = stdout.inspectSync(() => {
			logger.info('${CTX:invalidVariable}%{CTX:invalidVariable}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('\n', 'created the correct log entry');
	});
	it('should allow setting the context with static methods', () => {
		const logger: Logger = Logger.getLogger({
			format: '${MESSAGE}',
			name: 'CTXStaticSetterMethods',
		});
		Logger.setGlobalContext(globalContext);
		Logger.setGlobalContext('gVar', 'globalValue');
		Logger.setGlobalContext('obj', { val: 'value' });
		const output: string[] = stdout.inspectSync(() => {
			logger.info('${CTX:gVar}, %{CTX:gVar}, ${CTX:obj.val}, %{CTX:obj.val}, ${CTX:global.varOne}, %{CTX:global.varOne}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('globalValue, globalValue, value, value, globalValueOne, globalValueOne\n',
									'created the correct log entry');
	});
	it('should allow setting the context with instance methods', () => {
		const logger: Logger = Logger.getLogger({
			format: '${MESSAGE}',
			name: 'CTXInstanceSetterMethods',
		});
		logger.setContext(localContext);
		logger.setContext('localVar', 'localVarValue');
		const output: string[] = stdout.inspectSync(() => {
			logger.info('${CTX:localVar}, %{CTX:localVar}, ${CTX:local.varOne}, %{CTX:local.varOne}');
		});
		expect(output).to.have.lengthOf(1, '1 line was logged');
		expect(output[0]).to.equal('localVarValue, localVarValue, localValueOne, localValueOne\n',
									'created the correct log entry');
	});
	it('should overwrite the global context with the local context', () => {
		const logger: Logger = Logger.getLogger({
			context: localContext,
			format: '${MESSAGE}',
			name: 'CTXGlobal',
		});
		Logger.setGlobalContext(globalContext);
		const output: string[] = stdout.inspectSync(() => {
			logger.info('${CTX:contextScopeTest}, %{CTX:contextScopeTest}');
			logger.trace('${CTX:global.varOne}, %{CTX:global.varOne}');
		});
		expect(output).to.have.lengthOf(2, '2 lines were logged');
		expect(output[0]).to.equal('localContextTestValue, localContextTestValue\n', 'created the correct log entry');
		expect(output[1]).to.equal('globalValueOne, globalValueOne\n', 'created the correct log entry');
	});
});

describe('Custom log writer methods', () => {
	function logError(message: string) {
		console.log('Error: ' + message); // tslint:disable-line:no-console
	}
	function logStandard(message: string) {
		console.log('Standard: ' + message); // tslint:disable-line:no-console
	}
	forEveryLogMethod((level: keyof typeof LogLevel, method: LogFunction) => {
		it('should produce correct log entries when log level is ' + level, () => {
			const logName: string = 'CustomWriter' + LogLevel[level]; // Must be the number. -- cwells
			const logger: Logger = Logger.getLogger({ name: logName, format: '${MESSAGE}' });
			Logger.setErrorWriter(logError);
			Logger.setLogWriter(logStandard);
			let errlog: string[] = [];
			const stdlog: string[] = stdout.inspectSync(() => {
				errlog = stderr.inspectSync(() => {
					method.call(logger, 'Test message.');
				});
			});
			const output: string[] = [...errlog, ...stdlog];
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

type LogLevelCallback = (level: keyof typeof LogLevel, method: LogFunction | null) => void;

type LogMethodCallback = (level: keyof typeof LogLevel, method: LogFunction) => void;

function forEveryLogLevel(callback: LogLevelCallback) {
	for (const level in LogLevel) {
		if (isNaN(+level)) {
			const method = (typeof Logger.prototype[level.toLowerCase() as keyof Logger] === 'function'
				? Logger.prototype[level.toLowerCase() as keyof Logger] : null);
			callback(level as keyof typeof LogLevel, method);
		}
	}
}

function forEveryLogMethod(callback: LogMethodCallback) {
	forEveryLogLevel((level: keyof typeof LogLevel, method: LogFunction | null) => {
		if (method) {
			callback(level, method);
		}
	});
}

function checkOutputAtLogLevel(logger: Logger, logLevel: LogLevel) {
	const expectedLines = (logLevel === LogLevel.ALL ? LogLevel.ALL - 1 : logLevel) - 1;
	let errlog: string[] = [];
	const stdlog: string[] = stdout.inspectSync(() => {
		errlog = stderr.inspectSync(() => {
			forEveryLogMethod((level: keyof typeof LogLevel, method: LogFunction) => {
				method.call(logger, 'Test message.');
			});
		});
	});
	let output: string[] | string = [...errlog, ...stdlog];
	expect(output).to.have.lengthOf(expectedLines, expectedLines + ' line(s) were logged');
	output = output.join('');
	forEveryLogMethod((level: keyof typeof LogLevel, method: LogFunction) => {
		if (logLevel >= LogLevel[level]) {
			expect(output).to.contain(level, level + ' is logged when log level is ' + LogLevel[logLevel]);
		} else {
			expect(output).to.not.contain(level, level + ' is not logged when log level is ' + LogLevel[logLevel]);
		}
	});
}
