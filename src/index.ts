'use strict';

type LogFunction = (...args: any[]) => any;

interface ILogContext { [key: string]: any; }

interface ILogConfig {
	context?: ILogContext;
	errorWriter?: LogFunction;
	format?: string;
	level?: Level;
	logWriter?: LogFunction;
	name?: string;
}

enum Format {
	JSON = '{ "timestamp": "${TIMESTAMP}", "level": "${LEVEL}", "name": "${NAME}", "message": "${MESSAGE}" }',
	JSON_NO_TIME = '{ "level": "${LEVEL}", "name": "${NAME}", "message": "${MESSAGE}" }',
	TEXT = '[${TIMESTAMP}] [${LEVEL}] [${NAME}] ${MESSAGE}',
	TEXT_NO_TIME = '[${LEVEL}] [${NAME}] ${MESSAGE}',
}

enum Level {
		OFF,
		FATAL,
		ERROR,
		WARN,
		INFO,
		DEBUG,
		TRACE,
		ALL,
}

export default class Logger {
	/* Public Static Fields */

	public static readonly Format = Format;
	public static readonly Level = Level;

	/* Public Static Methods */

	public static getLogger(config: ILogConfig | string = 'Sitka'): Logger {
		if (typeof config === 'string') {
			config = { name: config };
		}
		config.name = config.name || 'Sitka';
		if (!this._loggers.hasOwnProperty(config.name)) {
			this._loggers[config.name] = new Logger(config);
		}
		return this._loggers[config.name];
	}

	public static setErrorWriter(errorWriter: LogFunction) {
		this._errorWriter = errorWriter;
	}

	public static setGlobalContext(context: ILogContext | string, value?: string): void {
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
	private static _logWriter: LogFunction = (console && console.log) // tslint:disable-line:no-console
											|| (process && process.stdout && process.stdout.write);
	private static _errorWriter: LogFunction = (console && console.error) // tslint:disable-line:no-console
											|| (process && process.stderr && process.stderr.write);

	/* Private Instance Fields */

	private readonly _ctxVarTest: RegExp = /[$%]{CTX:([^}]+)}/;
	private readonly _envVarTest: RegExp = /[$%]{ENV:([^}]+)}/;
	private readonly _escapedVar: RegExp = /\\([$%]){/g;
	private _context: ILogContext;
	private _format: string;
	private _level: Level;
	private _name: string;
	private _logWriter: LogFunction | undefined;
	private _errorWriter: LogFunction | undefined;

	/* Constructor */

	private constructor(config: ILogConfig) {
		this._name = config.name || 'Sitka';
		this._context = config.context || {};
		const envLogLevel: string = this.getEnvVariable('LOG_LEVEL', true).replace('Logger.Level.', '');
		this._level = config.level
					|| (Level.hasOwnProperty(envLogLevel) && Level[envLogLevel as keyof typeof Level])
					|| Level.ALL;
		this._logWriter = config.logWriter || undefined;
		this._errorWriter = config.errorWriter || undefined;
		this._format = config.format
					|| this.getEnvVariable('LOG_FORMAT', true)
					|| (this.getEnvVariable('LAMBDA_TASK_ROOT') || this.getEnvVariable('GCP_PROJECT')
						? Logger.Format.TEXT_NO_TIME : Logger.Format.TEXT);
		// Perform static replacements now so fewer are needed for each log entry. -- cwells
		this._format = this._format.replace(this._escapedVar, '$1_SITKA_ESCAPED_VAR_{')
									.replace(/[$%]\{NAME\}/g, this._name);
	}

	/* Public Instance Methods */

	public debug(message: any, ...args: any[]): any {
		return (this._level >= Level.DEBUG ? this.log('DEBUG', message, ...args) : false);
	}

	public error(message: any, ...args: any[]): any {
		return (this._level >= Level.ERROR ? this.log('ERROR', message, ...args) : false);
	}

	public fatal(message: any, ...args: any[]): any {
		return (this._level >= Level.FATAL ? this.log('FATAL', message, ...args) : false);
	}

	public info(message: any, ...args: any[]): any {
		return (this._level >= Level.INFO ? this.log('INFO', message, ...args) : false);
	}

	public setContext(context: ILogContext | string, value?: string): void {
		if (typeof context === 'string') {
			this._context[context] = value;
		} else {
			this._context = context;
		}
	}

	public trace(message: any, ...args: any[]): any {
		return (this._level >= Level.TRACE ? this.log('TRACE', message, ...args) : false);
	}

	public warn(message: any, ...args: any[]): any {
		return (this._level >= Level.WARN ? this.log('WARN', message, ...args) : false);
	}

	/* Private Instance Methods */

	private convertToString(item: any): string {
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
				if (item.hasOwnProperty(property)) {
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

	private getEnvVariable(property: string, checkCustom: boolean = false): string {
		if (process && process.env) {
			if (checkCustom && process.env.hasOwnProperty(property + '_' + this._name)) {
				return process.env[property + '_' + this._name] as string;
			} else if (process.env.hasOwnProperty(property)) {
				return process.env[property] as string;
			}
		}
		return '';
	}

	private log(level: string, message: any, ...args: any[]): any {
		message = this._format.replace(/[$%]\{LEVEL\}/g, level)
					.replace(/[$%]\{TIMESTAMP\}/g, Date())
					.replace(/[$%]\{MESSAGE\}/g, this.convertToString(message).replace(this._escapedVar, '$1_SITKA_ESCAPED_VAR_{'));
		// Replace ${ENV:VAR} and %{ENV:VAR} with the value of the VAR environment variable. -- cwells
		let matches: RegExpMatchArray | null = message.match(this._envVarTest);
		while (matches && matches.length === 2) {
			message = message.replace(matches[0], this.getEnvVariable(matches[1]));
			matches = message.match(this._envVarTest);
		}
		// Replace ${CTX:VAR} and %{CTX:VAR} with the value of the VAR context variable. -- cwells
		const context: ILogContext = { ...Logger._globalContext, ...this._context };
		matches = message.match(this._ctxVarTest);
		while (matches && matches.length === 2) {
			let replacement: any;
			if (context.hasOwnProperty(matches[1])) {
				replacement = this.convertToString(context[matches[1]]);
			} else { // Attempt to convert dotted vars into object property references. -- cwells
				const propNames: string[] = matches[1].split('.');
				if (propNames.length !== 1) {
					let ctxVar: any = context;
					let i: number;
					for (i = 0; i < propNames.length; i++) {
						if (!ctxVar.hasOwnProperty(propNames[i])) {
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
			message = message.replace(matches[0], replacement || '');
			matches = message.match(this._ctxVarTest); // Repeat until no matches found. -- cwells
		}
		message = message.replace(/([$%])_SITKA_ESCAPED_VAR_{/g, '$1{');
		if (level === 'FATAL' || level === 'ERROR') {
			return (this._errorWriter || Logger._errorWriter)(message, ...args);
		} else {
			return (this._logWriter || Logger._logWriter)(message, ...args);
		}
	}
}
