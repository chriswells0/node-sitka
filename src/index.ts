'use strict';

export type LogFunction = (...args: any[]) => any; // eslint-disable-line @typescript-eslint/no-explicit-any

interface ILogContext { [key: string]: any; } // eslint-disable-line @typescript-eslint/no-explicit-any

interface ILogConfig {
	context?: ILogContext;
	errorWriter?: LogFunction;
	format?: string;
	level?: LogLevel;
	logWriter?: LogFunction;
	name?: string;
	useISO8601?: boolean;
}

interface ILogConfigWithName extends ILogConfig { name: string; }

export enum LogFormat {
	JSON = '{ "timestamp": "${TIMESTAMP}", "level": "${LEVEL}", "name": "${NAME}", "message": "${MESSAGE}" }',
	JSON_NO_TIME = '{ "level": "${LEVEL}", "name": "${NAME}", "message": "${MESSAGE}" }',
	TEXT = '[${TIMESTAMP}] [${LEVEL}] [${NAME}] ${MESSAGE}',
	TEXT_NO_TIME = '[${LEVEL}] [${NAME}] ${MESSAGE}',
}

export enum LogLevel {
	OFF = 1, // Start with 1 to simplify truthiness tests during initialization. -- cwells
	FATAL,
	ERROR,
	WARN,
	INFO,
	LOG = LogLevel.INFO,
	DEBUG,
	TRACE,
	VERBOSE = LogLevel.TRACE,
	ALL,
}

export class Logger {
	/* Public Static Fields */

	public static readonly Format = LogFormat;
	public static readonly Level = LogLevel;

	/* Public Static Methods */

	public static getLogger(config: ILogConfig | string = 'Sitka'): Logger {
		if (typeof config === 'string') {
			config = { name: config };
		}
		config.name = config.name || 'Sitka';
		if (!Object.prototype.hasOwnProperty.call(this._loggers, config.name)) {
			this._loggers[config.name] = new Logger(config as ILogConfigWithName);
		}
		return this._loggers[config.name];
	}

	public static setErrorWriter(errorWriter: LogFunction) {
		this._errorWriter = errorWriter;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public static setGlobalContext(context: ILogContext | string, value?: any): void {
		if (typeof context === 'string') {
			this._globalContext[context] = value;
		} else {
			this._globalContext = context;
		}
	}

	public static setLogWriter(logWriter: LogFunction) {
		this._logWriter = logWriter;
	}

	/* Private Static Fields */

	private static _globalContext: ILogContext = {};
	private static _loggers: { [name: string]: Logger } = {};
	private static _logWriter: LogFunction = console.log; // eslint-disable-line no-console
	private static _errorWriter: LogFunction = console.error; // eslint-disable-line no-console

	/* Private Instance Fields */

	private readonly _regexDoubleQuote: RegExp = /"/g;
	private readonly _regexNewLine: RegExp = /\n/g;
	private readonly _regexReturn: RegExp = /\r/g;
	private readonly _regexCtx: RegExp = /[$%]{CTX:([^}]+)}/;
	private readonly _regexEnv: RegExp = /[$%]{ENV:([^}]+)}/;
	private readonly _regexEscapedVar: RegExp = /\\([$%]){/g;
	private readonly _regexEscapedSitkaVar: RegExp = /([$%])_SITKA_ESCAPED_VAR_{/g;
	private readonly _regexLevel: RegExp = /[$%]\{LEVEL\}/g;
	private readonly _regexMessage: RegExp = /[$%]\{MESSAGE\}/g;
	private readonly _regexMessageQuoted: RegExp = /"[$%]\{MESSAGE\}"/;
	private readonly _regexTimestamp: RegExp = /[$%]\{TIMESTAMP\}/g;
	private _context: ILogContext;
	private _format: string;
	private _level: LogLevel;
	private _name: string;
	private _logWriter: LogFunction | undefined;
	private _errorWriter: LogFunction | undefined;
	private _useISO8601: boolean;

	/* Constructor */

	private constructor(config: ILogConfigWithName) {
		this._name = config.name;
		this._context = config.context || {};
		const envLogLevel: string = (this.getEnvVariable('SITKA_LEVEL', true)
									|| this.getEnvVariable('LOG_LEVEL', true)).replace(/Log(ger\.)?Level\./, '');
		this._level = config.level
					|| (Object.prototype.hasOwnProperty.call(LogLevel, envLogLevel) && LogLevel[envLogLevel as keyof typeof LogLevel])
					|| LogLevel.ALL;
		this._logWriter = config.logWriter || undefined;
		this._errorWriter = config.errorWriter || undefined;
		this._format = config.format
					|| this.getEnvVariable('SITKA_FORMAT', true)
					|| this.getEnvVariable('LOG_FORMAT', true)
					|| (this.getEnvVariable('LAMBDA_TASK_ROOT') || this.getEnvVariable('GCP_PROJECT')
						? LogFormat.TEXT_NO_TIME : LogFormat.TEXT);
		// Perform static replacements now so fewer are needed for each log entry. -- cwells
		this._format = this._format.replace(this._regexEscapedVar, '$1_SITKA_ESCAPED_VAR_{')
			.replace(/[$%]\{NAME\}/g, this._name);
		const envUseISO8601 = this.getEnvVariable('SITKA_ISO8601', true)
							|| this.getEnvVariable('USE_ISO8601', true);
		this._useISO8601 = envUseISO8601 !== 'false';
	}

	/* Public Instance Methods */

	public debug(message: any, ...args: any[]): any { // eslint-disable-line @typescript-eslint/no-explicit-any
		return (this._level >= LogLevel.DEBUG ? this.write('DEBUG', message, ...args) : false);
	}

	public error(message: any, ...args: any[]): any { // eslint-disable-line @typescript-eslint/no-explicit-any
		return (this._level >= LogLevel.ERROR ? this.write('ERROR', message, ...args) : false);
	}

	public fatal(message: any, ...args: any[]): any { // eslint-disable-line @typescript-eslint/no-explicit-any
		return (this._level >= LogLevel.FATAL ? this.write('FATAL', message, ...args) : false);
	}

	public info(message: any, ...args: any[]): any { // eslint-disable-line @typescript-eslint/no-explicit-any
		return (this._level >= LogLevel.INFO ? this.write('INFO', message, ...args) : false);
	}

	// Essentially the same as info(). -- cwells
	public log(message: any, ...args: any[]): any { // eslint-disable-line @typescript-eslint/no-explicit-any
		return (this._level >= LogLevel.LOG ? this.write('LOG', message, ...args) : false);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public setContext(context: ILogContext | string, value?: any): void {
		if (typeof context === 'string') {
			this._context[context] = value;
		} else {
			this._context = context;
		}
	}

	public trace(message: any, ...args: any[]): any { // eslint-disable-line @typescript-eslint/no-explicit-any
		return (this._level >= LogLevel.TRACE ? this.write('TRACE', message, ...args) : false);
	}

	// Essentially the same as trace(). -- cwells
	public verbose(message: any, ...args: any[]): any { // eslint-disable-line @typescript-eslint/no-explicit-any
		return (this._level >= LogLevel.VERBOSE ? this.write('VERBOSE', message, ...args) : false);
	}

	public warn(message: any, ...args: any[]): any { // eslint-disable-line @typescript-eslint/no-explicit-any
		return (this._level >= LogLevel.WARN ? this.write('WARN', message, ...args) : false);
	}

	/* Private Instance Methods */

	private convertToString(item: any): string { // eslint-disable-line @typescript-eslint/no-explicit-any
		if (typeof item === 'undefined') {
			return 'undefined';
		} else if (item === null) {
			return 'null';
		} else if (typeof item === 'string') {
			return item;
		} else if (Array.isArray(item)) {
			const elements: string[] = [];
			for (const element of item) {
				elements.push(this.convertToString(element));
			}
			return '[ ' + elements.join(', ') + ' ]';
		} else if (typeof item === 'object') {
			const properties: string[] = [];
			for (const property in item) {
				if (typeof item[property] === 'undefined') {
					properties.push(property + ': undefined');
				} else if (item[property] === null) {
					properties.push(property + ': null');
				} else if (typeof item[property] === 'string') {
					properties.push(property + ': "' + item[property] + '"');
				} else {
					properties.push(property + ': ' + this.convertToString(item[property]));
				}
			}
			return '{ ' + properties.join(', ') + ' }';
		} else if (typeof item === 'function') {
			return item.toString();
		} else {
			return JSON.stringify(item);
		}
	}

	private getEnvVariable(property: string, checkCustom = false): string {
		// The keys check allows unit tests to succeed with env overwritten. -- cwells
		if (process && process.env && Object.keys(process.env).length !== 0) {
			if (checkCustom && Object.prototype.hasOwnProperty.call(process.env, property + '_' + this._name)) {
				return process.env[property + '_' + this._name] as string;
			} else if (Object.prototype.hasOwnProperty.call(process.env, property)) {
				return process.env[property] as string;
			}
		}
		return '';
	}

	private write(level: string, message: any, ...args: any[]): any { // eslint-disable-line @typescript-eslint/no-explicit-any
		message = this.convertToString(message);
		if (this._regexMessageQuoted.test(this._format)) { // Message is inside quotes, so escape it. -- cwells
			message = message.replace(this._regexDoubleQuote, '\\"')
				.replace(this._regexNewLine, '\\n')
				.replace(this._regexReturn, '\\r');
		}
		const timestamp = this._useISO8601 ? new Date().toISOString() : Date();
		message = this._format.replace(this._regexLevel, level)
			.replace(this._regexTimestamp, timestamp)
			.replace(this._regexMessage, message.replace(this._regexEscapedVar, '$1_SITKA_ESCAPED_VAR_{'));
		// Replace ${ENV:VAR} and %{ENV:VAR} with the value of the VAR environment variable. -- cwells
		let matches: RegExpMatchArray | null = message.match(this._regexEnv);
		while (matches && matches.length === 2) {
			message = message.replace(matches[0], this.getEnvVariable(matches[1]));
			matches = message.match(this._regexEnv);
		}
		// Replace ${CTX:VAR} and %{CTX:VAR} with the value of the VAR context variable. -- cwells
		const context: ILogContext = { ...Logger._globalContext, ...this._context };
		matches = message.match(this._regexCtx);
		while (matches && matches.length === 2) {
			let replacement = '';
			if (Object.prototype.hasOwnProperty.call(context, matches[1])) {
				replacement = this.convertToString(context[matches[1]]);
			} else { // Attempt to convert dotted vars into object property references. -- cwells
				const propNames: string[] = matches[1].split('.');
				if (propNames.length !== 1) {
					let ctxVar: ILogContext = context;
					let i: number;
					for (i = 0; i < propNames.length; i++) {
						if (!Object.prototype.hasOwnProperty.call(ctxVar, propNames[i])) {
							i--; // Decrement i to the last successful match. -- cwells
							break;
						}
						ctxVar = ctxVar[propNames[i]];
					}
					if (i === propNames.length) { // Reached end of split, so use the value. -- cwells
						replacement = this.convertToString(ctxVar);
					}
				}
			}
			message = message.replace(matches[0], replacement);
			matches = message.match(this._regexCtx); // Repeat until no matches found. -- cwells
		}
		message = message.replace(this._regexEscapedSitkaVar, '$1{');
		if (level === 'FATAL' || level === 'ERROR') {
			return (this._errorWriter || Logger._errorWriter)(message, ...args);
		} else {
			return (this._logWriter || Logger._logWriter)(message, ...args);
		}
	}
}
