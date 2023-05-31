import proc from 'process';
import { fileURLToPath } from 'url';
import path$1 from 'path';

/**
 * Throw a given error.
 *
 * @param {Error|null|undefined} [error]
 *   Maybe error.
 * @returns {asserts error is null|undefined}
 */
function bail(error) {
  if (error) {
    throw error
  }
}

/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

var isBuffer = function isBuffer (obj) {
  return obj != null && obj.constructor != null &&
    typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
};

var hasOwn = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;
var defineProperty = Object.defineProperty;
var gOPD = Object.getOwnPropertyDescriptor;

var isArray = function isArray(arr) {
	if (typeof Array.isArray === 'function') {
		return Array.isArray(arr);
	}

	return toStr.call(arr) === '[object Array]';
};

var isPlainObject$1 = function isPlainObject(obj) {
	if (!obj || toStr.call(obj) !== '[object Object]') {
		return false;
	}

	var hasOwnConstructor = hasOwn.call(obj, 'constructor');
	var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) { /**/ }

	return typeof key === 'undefined' || hasOwn.call(obj, key);
};

// If name is '__proto__', and Object.defineProperty is available, define __proto__ as an own property on target
var setProperty = function setProperty(target, options) {
	if (defineProperty && options.name === '__proto__') {
		defineProperty(target, options.name, {
			enumerable: true,
			configurable: true,
			value: options.newValue,
			writable: true
		});
	} else {
		target[options.name] = options.newValue;
	}
};

// Return undefined instead of __proto__ if '__proto__' is not an own property
var getProperty = function getProperty(obj, name) {
	if (name === '__proto__') {
		if (!hasOwn.call(obj, name)) {
			return void 0;
		} else if (gOPD) {
			// In early versions of node, obj['__proto__'] is buggy when obj has
			// __proto__ as an own property. Object.getOwnPropertyDescriptor() works.
			return gOPD(obj, name).value;
		}
	}

	return obj[name];
};

var extend = function extend() {
	var options, name, src, copy, copyIsArray, clone;
	var target = arguments[0];
	var i = 1;
	var length = arguments.length;
	var deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}
	if (target == null || (typeof target !== 'object' && typeof target !== 'function')) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = getProperty(target, name);
				copy = getProperty(options, name);

				// Prevent never-ending loop
				if (target !== copy) {
					// Recurse if we're merging plain objects or arrays
					if (deep && copy && (isPlainObject$1(copy) || (copyIsArray = isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject$1(src) ? src : {};
						}

						// Never move original objects, clone them
						setProperty(target, { name: name, newValue: extend(deep, clone, copy) });

					// Don't bring in undefined values
					} else if (typeof copy !== 'undefined') {
						setProperty(target, { name: name, newValue: copy });
					}
				}
			}
		}
	}

	// Return the modified object
	return target;
};

function isPlainObject(value) {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in value) && !(Symbol.iterator in value);
}

/**
 * @typedef {(error?: Error|null|undefined, ...output: Array<any>) => void} Callback
 * @typedef {(...input: Array<any>) => any} Middleware
 *
 * @typedef {(...input: Array<any>) => void} Run
 *   Call all middleware.
 * @typedef {(fn: Middleware) => Pipeline} Use
 *   Add `fn` (middleware) to the list.
 * @typedef {{run: Run, use: Use}} Pipeline
 *   Middleware.
 */

/**
 * Create new middleware.
 *
 * @returns {Pipeline}
 */
function trough() {
  /** @type {Array<Middleware>} */
  const fns = [];
  /** @type {Pipeline} */
  const pipeline = {run, use};

  return pipeline

  /** @type {Run} */
  function run(...values) {
    let middlewareIndex = -1;
    /** @type {Callback} */
    const callback = values.pop();

    if (typeof callback !== 'function') {
      throw new TypeError('Expected function as last argument, not ' + callback)
    }

    next(null, ...values);

    /**
     * Run the next `fn`, or we’re done.
     *
     * @param {Error|null|undefined} error
     * @param {Array<any>} output
     */
    function next(error, ...output) {
      const fn = fns[++middlewareIndex];
      let index = -1;

      if (error) {
        callback(error);
        return
      }

      // Copy non-nullish input into values.
      while (++index < values.length) {
        if (output[index] === null || output[index] === undefined) {
          output[index] = values[index];
        }
      }

      // Save the newly created `output` for the next call.
      values = output;

      // Next or done.
      if (fn) {
        wrap$1(fn, next)(...output);
      } else {
        callback(null, ...output);
      }
    }
  }

  /** @type {Use} */
  function use(middelware) {
    if (typeof middelware !== 'function') {
      throw new TypeError(
        'Expected `middelware` to be a function, not ' + middelware
      )
    }

    fns.push(middelware);
    return pipeline
  }
}

/**
 * Wrap `middleware`.
 * Can be sync or async; return a promise, receive a callback, or return new
 * values and errors.
 *
 * @param {Middleware} middleware
 * @param {Callback} callback
 */
function wrap$1(middleware, callback) {
  /** @type {boolean} */
  let called;

  return wrapped

  /**
   * Call `middleware`.
   * @this {any}
   * @param {Array<any>} parameters
   * @returns {void}
   */
  function wrapped(...parameters) {
    const fnExpectsCallback = middleware.length > parameters.length;
    /** @type {any} */
    let result;

    if (fnExpectsCallback) {
      parameters.push(done);
    }

    try {
      result = middleware.apply(this, parameters);
    } catch (error) {
      const exception = /** @type {Error} */ (error);

      // Well, this is quite the pickle.
      // `middleware` received a callback and called it synchronously, but that
      // threw an error.
      // The only thing left to do is to throw the thing instead.
      if (fnExpectsCallback && called) {
        throw exception
      }

      return done(exception)
    }

    if (!fnExpectsCallback) {
      if (result instanceof Promise) {
        result.then(then, done);
      } else if (result instanceof Error) {
        done(result);
      } else {
        then(result);
      }
    }
  }

  /**
   * Call `callback`, only once.
   * @type {Callback}
   */
  function done(error, ...output) {
    if (!called) {
      called = true;
      callback(error, ...output);
    }
  }

  /**
   * Call `done` with one value.
   *
   * @param {any} [value]
   */
  function then(value) {
    done(null, value);
  }
}

/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('unist').Point} Point
 * @typedef {import('unist').Position} Position
 */

/**
 * @typedef NodeLike
 * @property {string} type
 * @property {PositionLike | null | undefined} [position]
 *
 * @typedef PositionLike
 * @property {PointLike | null | undefined} [start]
 * @property {PointLike | null | undefined} [end]
 *
 * @typedef PointLike
 * @property {number | null | undefined} [line]
 * @property {number | null | undefined} [column]
 * @property {number | null | undefined} [offset]
 */

/**
 * Serialize the positional info of a point, position (start and end points),
 * or node.
 *
 * @param {Node | NodeLike | Position | PositionLike | Point | PointLike | null | undefined} [value]
 *   Node, position, or point.
 * @returns {string}
 *   Pretty printed positional info of a node (`string`).
 *
 *   In the format of a range `ls:cs-le:ce` (when given `node` or `position`)
 *   or a point `l:c` (when given `point`), where `l` stands for line, `c` for
 *   column, `s` for `start`, and `e` for end.
 *   An empty string (`''`) is returned if the given value is neither `node`,
 *   `position`, nor `point`.
 */
function stringifyPosition(value) {
  // Nothing.
  if (!value || typeof value !== 'object') {
    return ''
  }

  // Node.
  if ('position' in value || 'type' in value) {
    return position$1(value.position)
  }

  // Position.
  if ('start' in value || 'end' in value) {
    return position$1(value)
  }

  // Point.
  if ('line' in value || 'column' in value) {
    return point$2(value)
  }

  // ?
  return ''
}

/**
 * @param {Point | PointLike | null | undefined} point
 * @returns {string}
 */
function point$2(point) {
  return index(point && point.line) + ':' + index(point && point.column)
}

/**
 * @param {Position | PositionLike | null | undefined} pos
 * @returns {string}
 */
function position$1(pos) {
  return point$2(pos && pos.start) + '-' + point$2(pos && pos.end)
}

/**
 * @param {number | null | undefined} value
 * @returns {number}
 */
function index(value) {
  return value && typeof value === 'number' ? value : 1
}

/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('unist').Position} Position
 * @typedef {import('unist').Point} Point
 * @typedef {object & {type: string, position?: Position | undefined}} NodeLike
 */

/**
 * Message.
 */
class VFileMessage extends Error {
  /**
   * Create a message for `reason` at `place` from `origin`.
   *
   * When an error is passed in as `reason`, the `stack` is copied.
   *
   * @param {string | Error | VFileMessage} reason
   *   Reason for message, uses the stack and message of the error if given.
   *
   *   > 👉 **Note**: you should use markdown.
   * @param {Node | NodeLike | Position | Point | null | undefined} [place]
   *   Place in file where the message occurred.
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns
   *   Instance of `VFileMessage`.
   */
  // To do: next major: expose `undefined` everywhere instead of `null`.
  constructor(reason, place, origin) {
    /** @type {[string | null, string | null]} */
    const parts = [null, null];
    /** @type {Position} */
    let position = {
      // @ts-expect-error: we always follows the structure of `position`.
      start: {line: null, column: null},
      // @ts-expect-error: "
      end: {line: null, column: null}
    };

    super();

    if (typeof place === 'string') {
      origin = place;
      place = undefined;
    }

    if (typeof origin === 'string') {
      const index = origin.indexOf(':');

      if (index === -1) {
        parts[1] = origin;
      } else {
        parts[0] = origin.slice(0, index);
        parts[1] = origin.slice(index + 1);
      }
    }

    if (place) {
      // Node.
      if ('type' in place || 'position' in place) {
        if (place.position) {
          // To do: next major: deep clone.
          // @ts-expect-error: looks like a position.
          position = place.position;
        }
      }
      // Position.
      else if ('start' in place || 'end' in place) {
        // @ts-expect-error: looks like a position.
        // To do: next major: deep clone.
        position = place;
      }
      // Point.
      else if ('line' in place || 'column' in place) {
        // To do: next major: deep clone.
        position.start = place;
      }
    }

    // Fields from `Error`.
    /**
     * Serialized positional info of error.
     *
     * On normal errors, this would be something like `ParseError`, buit in
     * `VFile` messages we use this space to show where an error happened.
     */
    this.name = stringifyPosition(place) || '1:1';

    /**
     * Reason for message.
     *
     * @type {string}
     */
    this.message = typeof reason === 'object' ? reason.message : reason;

    /**
     * Stack of message.
     *
     * This is used by normal errors to show where something happened in
     * programming code, irrelevant for `VFile` messages,
     *
     * @type {string}
     */
    this.stack = '';

    if (typeof reason === 'object' && reason.stack) {
      this.stack = reason.stack;
    }

    /**
     * Reason for message.
     *
     * > 👉 **Note**: you should use markdown.
     *
     * @type {string}
     */
    this.reason = this.message;

    /* eslint-disable no-unused-expressions */
    /**
     * State of problem.
     *
     * * `true` — marks associated file as no longer processable (error)
     * * `false` — necessitates a (potential) change (warning)
     * * `null | undefined` — for things that might not need changing (info)
     *
     * @type {boolean | null | undefined}
     */
    this.fatal;

    /**
     * Starting line of error.
     *
     * @type {number | null}
     */
    this.line = position.start.line;

    /**
     * Starting column of error.
     *
     * @type {number | null}
     */
    this.column = position.start.column;

    /**
     * Full unist position.
     *
     * @type {Position | null}
     */
    this.position = position;

    /**
     * Namespace of message (example: `'my-package'`).
     *
     * @type {string | null}
     */
    this.source = parts[0];

    /**
     * Category of message (example: `'my-rule'`).
     *
     * @type {string | null}
     */
    this.ruleId = parts[1];

    /**
     * Path of a file (used throughout the `VFile` ecosystem).
     *
     * @type {string | null}
     */
    this.file;

    // The following fields are “well known”.
    // Not standard.
    // Feel free to add other non-standard fields to your messages.

    /**
     * Specify the source value that’s being reported, which is deemed
     * incorrect.
     *
     * @type {string | null}
     */
    this.actual;

    /**
     * Suggest acceptable values that can be used instead of `actual`.
     *
     * @type {Array<string> | null}
     */
    this.expected;

    /**
     * Link to docs for the message.
     *
     * > 👉 **Note**: this must be an absolute URL that can be passed as `x`
     * > to `new URL(x)`.
     *
     * @type {string | null}
     */
    this.url;

    /**
     * Long form description of the message (you should use markdown).
     *
     * @type {string | null}
     */
    this.note;
    /* eslint-enable no-unused-expressions */
  }
}

VFileMessage.prototype.file = '';
VFileMessage.prototype.name = '';
VFileMessage.prototype.reason = '';
VFileMessage.prototype.message = '';
VFileMessage.prototype.stack = '';
VFileMessage.prototype.fatal = null;
VFileMessage.prototype.column = null;
VFileMessage.prototype.line = null;
VFileMessage.prototype.source = null;
VFileMessage.prototype.ruleId = null;
VFileMessage.prototype.position = null;

/**
 * @typedef URL
 * @property {string} hash
 * @property {string} host
 * @property {string} hostname
 * @property {string} href
 * @property {string} origin
 * @property {string} password
 * @property {string} pathname
 * @property {string} port
 * @property {string} protocol
 * @property {string} search
 * @property {any} searchParams
 * @property {string} username
 * @property {() => string} toString
 * @property {() => string} toJSON
 */

/**
 * Check if `fileUrlOrPath` looks like a URL.
 *
 * @param {unknown} fileUrlOrPath
 *   File path or URL.
 * @returns {fileUrlOrPath is URL}
 *   Whether it’s a URL.
 */
// From: <https://github.com/nodejs/node/blob/fcf8ba4/lib/internal/url.js#L1501>
function isUrl(fileUrlOrPath) {
  return (
    fileUrlOrPath !== null &&
    typeof fileUrlOrPath === 'object' &&
    // @ts-expect-error: indexable.
    fileUrlOrPath.href &&
    // @ts-expect-error: indexable.
    fileUrlOrPath.origin
  )
}

/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('unist').Position} Position
 * @typedef {import('unist').Point} Point
 * @typedef {import('./minurl.shared.js').URL} URL
 * @typedef {import('../index.js').Data} Data
 * @typedef {import('../index.js').Value} Value
 */

/**
 * Order of setting (least specific to most), we need this because otherwise
 * `{stem: 'a', path: '~/b.js'}` would throw, as a path is needed before a
 * stem can be set.
 *
 * @type {Array<'basename' | 'dirname' | 'extname' | 'history' | 'path' | 'stem'>}
 */
const order = ['history', 'path', 'basename', 'stem', 'extname', 'dirname'];

class VFile {
  /**
   * Create a new virtual file.
   *
   * `options` is treated as:
   *
   * *   `string` or `Buffer` — `{value: options}`
   * *   `URL` — `{path: options}`
   * *   `VFile` — shallow copies its data over to the new file
   * *   `object` — all fields are shallow copied over to the new file
   *
   * Path related fields are set in the following order (least specific to
   * most specific): `history`, `path`, `basename`, `stem`, `extname`,
   * `dirname`.
   *
   * You cannot set `dirname` or `extname` without setting either `history`,
   * `path`, `basename`, or `stem` too.
   *
   * @param {Compatible | null | undefined} [value]
   *   File value.
   * @returns
   *   New instance.
   */
  constructor(value) {
    /** @type {Options | VFile} */
    let options;

    if (!value) {
      options = {};
    } else if (typeof value === 'string' || buffer(value)) {
      options = {value};
    } else if (isUrl(value)) {
      options = {path: value};
    } else {
      options = value;
    }

    /**
     * Place to store custom information (default: `{}`).
     *
     * It’s OK to store custom data directly on the file but moving it to
     * `data` is recommended.
     *
     * @type {Data}
     */
    this.data = {};

    /**
     * List of messages associated with the file.
     *
     * @type {Array<VFileMessage>}
     */
    this.messages = [];

    /**
     * List of filepaths the file moved between.
     *
     * The first is the original path and the last is the current path.
     *
     * @type {Array<string>}
     */
    this.history = [];

    /**
     * Base of `path` (default: `process.cwd()` or `'/'` in browsers).
     *
     * @type {string}
     */
    this.cwd = proc.cwd();

    /* eslint-disable no-unused-expressions */
    /**
     * Raw value.
     *
     * @type {Value}
     */
    this.value;

    // The below are non-standard, they are “well-known”.
    // As in, used in several tools.

    /**
     * Whether a file was saved to disk.
     *
     * This is used by vfile reporters.
     *
     * @type {boolean}
     */
    this.stored;

    /**
     * Custom, non-string, compiled, representation.
     *
     * This is used by unified to store non-string results.
     * One example is when turning markdown into React nodes.
     *
     * @type {unknown}
     */
    this.result;

    /**
     * Source map.
     *
     * This type is equivalent to the `RawSourceMap` type from the `source-map`
     * module.
     *
     * @type {Map | null | undefined}
     */
    this.map;
    /* eslint-enable no-unused-expressions */

    // Set path related properties in the correct order.
    let index = -1;

    while (++index < order.length) {
      const prop = order[index];

      // Note: we specifically use `in` instead of `hasOwnProperty` to accept
      // `vfile`s too.
      if (
        prop in options &&
        options[prop] !== undefined &&
        options[prop] !== null
      ) {
        // @ts-expect-error: TS doesn’t understand basic reality.
        this[prop] = prop === 'history' ? [...options[prop]] : options[prop];
      }
    }

    /** @type {string} */
    let prop;

    // Set non-path related properties.
    for (prop in options) {
      // @ts-expect-error: fine to set other things.
      if (!order.includes(prop)) {
        // @ts-expect-error: fine to set other things.
        this[prop] = options[prop];
      }
    }
  }

  /**
   * Get the full path (example: `'~/index.min.js'`).
   *
   * @returns {string}
   */
  get path() {
    return this.history[this.history.length - 1]
  }

  /**
   * Set the full path (example: `'~/index.min.js'`).
   *
   * Cannot be nullified.
   * You can set a file URL (a `URL` object with a `file:` protocol) which will
   * be turned into a path with `url.fileURLToPath`.
   *
   * @param {string | URL} path
   */
  set path(path) {
    if (isUrl(path)) {
      path = fileURLToPath(path);
    }

    assertNonEmpty(path, 'path');

    if (this.path !== path) {
      this.history.push(path);
    }
  }

  /**
   * Get the parent path (example: `'~'`).
   */
  get dirname() {
    return typeof this.path === 'string' ? path$1.dirname(this.path) : undefined
  }

  /**
   * Set the parent path (example: `'~'`).
   *
   * Cannot be set if there’s no `path` yet.
   */
  set dirname(dirname) {
    assertPath(this.basename, 'dirname');
    this.path = path$1.join(dirname || '', this.basename);
  }

  /**
   * Get the basename (including extname) (example: `'index.min.js'`).
   */
  get basename() {
    return typeof this.path === 'string' ? path$1.basename(this.path) : undefined
  }

  /**
   * Set basename (including extname) (`'index.min.js'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be nullified (use `file.path = file.dirname` instead).
   */
  set basename(basename) {
    assertNonEmpty(basename, 'basename');
    assertPart(basename, 'basename');
    this.path = path$1.join(this.dirname || '', basename);
  }

  /**
   * Get the extname (including dot) (example: `'.js'`).
   */
  get extname() {
    return typeof this.path === 'string' ? path$1.extname(this.path) : undefined
  }

  /**
   * Set the extname (including dot) (example: `'.js'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be set if there’s no `path` yet.
   */
  set extname(extname) {
    assertPart(extname, 'extname');
    assertPath(this.dirname, 'extname');

    if (extname) {
      if (extname.charCodeAt(0) !== 46 /* `.` */) {
        throw new Error('`extname` must start with `.`')
      }

      if (extname.includes('.', 1)) {
        throw new Error('`extname` cannot contain multiple dots')
      }
    }

    this.path = path$1.join(this.dirname, this.stem + (extname || ''));
  }

  /**
   * Get the stem (basename w/o extname) (example: `'index.min'`).
   */
  get stem() {
    return typeof this.path === 'string'
      ? path$1.basename(this.path, this.extname)
      : undefined
  }

  /**
   * Set the stem (basename w/o extname) (example: `'index.min'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be nullified (use `file.path = file.dirname` instead).
   */
  set stem(stem) {
    assertNonEmpty(stem, 'stem');
    assertPart(stem, 'stem');
    this.path = path$1.join(this.dirname || '', stem + (this.extname || ''));
  }

  /**
   * Serialize the file.
   *
   * @param {BufferEncoding | null | undefined} [encoding='utf8']
   *   Character encoding to understand `value` as when it’s a `Buffer`
   *   (default: `'utf8'`).
   * @returns {string}
   *   Serialized file.
   */
  toString(encoding) {
    return (this.value || '').toString(encoding || undefined)
  }

  /**
   * Create a warning message associated with the file.
   *
   * Its `fatal` is set to `false` and `file` is set to the current file path.
   * Its added to `file.messages`.
   *
   * @param {string | Error | VFileMessage} reason
   *   Reason for message, uses the stack and message of the error if given.
   * @param {Node | NodeLike | Position | Point | null | undefined} [place]
   *   Place in file where the message occurred.
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {VFileMessage}
   *   Message.
   */
  message(reason, place, origin) {
    const message = new VFileMessage(reason, place, origin);

    if (this.path) {
      message.name = this.path + ':' + message.name;
      message.file = this.path;
    }

    message.fatal = false;

    this.messages.push(message);

    return message
  }

  /**
   * Create an info message associated with the file.
   *
   * Its `fatal` is set to `null` and `file` is set to the current file path.
   * Its added to `file.messages`.
   *
   * @param {string | Error | VFileMessage} reason
   *   Reason for message, uses the stack and message of the error if given.
   * @param {Node | NodeLike | Position | Point | null | undefined} [place]
   *   Place in file where the message occurred.
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {VFileMessage}
   *   Message.
   */
  info(reason, place, origin) {
    const message = this.message(reason, place, origin);

    message.fatal = null;

    return message
  }

  /**
   * Create a fatal error associated with the file.
   *
   * Its `fatal` is set to `true` and `file` is set to the current file path.
   * Its added to `file.messages`.
   *
   * > 👉 **Note**: a fatal error means that a file is no longer processable.
   *
   * @param {string | Error | VFileMessage} reason
   *   Reason for message, uses the stack and message of the error if given.
   * @param {Node | NodeLike | Position | Point | null | undefined} [place]
   *   Place in file where the message occurred.
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {never}
   *   Message.
   * @throws {VFileMessage}
   *   Message.
   */
  fail(reason, place, origin) {
    const message = this.message(reason, place, origin);

    message.fatal = true;

    throw message
  }
}

/**
 * Assert that `part` is not a path (as in, does not contain `path.sep`).
 *
 * @param {string | null | undefined} part
 *   File path part.
 * @param {string} name
 *   Part name.
 * @returns {void}
 *   Nothing.
 */
function assertPart(part, name) {
  if (part && part.includes(path$1.sep)) {
    throw new Error(
      '`' + name + '` cannot be a path: did not expect `' + path$1.sep + '`'
    )
  }
}

/**
 * Assert that `part` is not empty.
 *
 * @param {string | undefined} part
 *   Thing.
 * @param {string} name
 *   Part name.
 * @returns {asserts part is string}
 *   Nothing.
 */
function assertNonEmpty(part, name) {
  if (!part) {
    throw new Error('`' + name + '` cannot be empty')
  }
}

/**
 * Assert `path` exists.
 *
 * @param {string | undefined} path
 *   Path.
 * @param {string} name
 *   Dependency name.
 * @returns {asserts path is string}
 *   Nothing.
 */
function assertPath(path, name) {
  if (!path) {
    throw new Error('Setting `' + name + '` requires `path` to be set too')
  }
}

/**
 * Assert `value` is a buffer.
 *
 * @param {unknown} value
 *   thing.
 * @returns {value is Buffer}
 *   Whether `value` is a Node.js buffer.
 */
function buffer(value) {
  return isBuffer(value)
}

/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('vfile').VFileCompatible} VFileCompatible
 * @typedef {import('vfile').VFileValue} VFileValue
 * @typedef {import('..').Processor} Processor
 * @typedef {import('..').Plugin} Plugin
 * @typedef {import('..').Preset} Preset
 * @typedef {import('..').Pluggable} Pluggable
 * @typedef {import('..').PluggableList} PluggableList
 * @typedef {import('..').Transformer} Transformer
 * @typedef {import('..').Parser} Parser
 * @typedef {import('..').Compiler} Compiler
 * @typedef {import('..').RunCallback} RunCallback
 * @typedef {import('..').ProcessCallback} ProcessCallback
 *
 * @typedef Context
 * @property {Node} tree
 * @property {VFile} file
 */

// Expose a frozen processor.
const unified = base().freeze();

const own$7 = {}.hasOwnProperty;

// Function to create the first processor.
/**
 * @returns {Processor}
 */
function base() {
  const transformers = trough();
  /** @type {Processor['attachers']} */
  const attachers = [];
  /** @type {Record<string, unknown>} */
  let namespace = {};
  /** @type {boolean|undefined} */
  let frozen;
  let freezeIndex = -1;

  // Data management.
  // @ts-expect-error: overloads are handled.
  processor.data = data;
  processor.Parser = undefined;
  processor.Compiler = undefined;

  // Lock.
  processor.freeze = freeze;

  // Plugins.
  processor.attachers = attachers;
  // @ts-expect-error: overloads are handled.
  processor.use = use;

  // API.
  processor.parse = parse;
  processor.stringify = stringify;
  // @ts-expect-error: overloads are handled.
  processor.run = run;
  processor.runSync = runSync;
  // @ts-expect-error: overloads are handled.
  processor.process = process;
  processor.processSync = processSync;

  // Expose.
  return processor

  // Create a new processor based on the processor in the current scope.
  /** @type {Processor} */
  function processor() {
    const destination = base();
    let index = -1;

    while (++index < attachers.length) {
      destination.use(...attachers[index]);
    }

    destination.data(extend(true, {}, namespace));

    return destination
  }

  /**
   * @param {string|Record<string, unknown>} [key]
   * @param {unknown} [value]
   * @returns {unknown}
   */
  function data(key, value) {
    if (typeof key === 'string') {
      // Set `key`.
      if (arguments.length === 2) {
        assertUnfrozen('data', frozen);
        namespace[key] = value;
        return processor
      }

      // Get `key`.
      return (own$7.call(namespace, key) && namespace[key]) || null
    }

    // Set space.
    if (key) {
      assertUnfrozen('data', frozen);
      namespace = key;
      return processor
    }

    // Get space.
    return namespace
  }

  /** @type {Processor['freeze']} */
  function freeze() {
    if (frozen) {
      return processor
    }

    while (++freezeIndex < attachers.length) {
      const [attacher, ...options] = attachers[freezeIndex];

      if (options[0] === false) {
        continue
      }

      if (options[0] === true) {
        options[0] = undefined;
      }

      /** @type {Transformer|void} */
      const transformer = attacher.call(processor, ...options);

      if (typeof transformer === 'function') {
        transformers.use(transformer);
      }
    }

    frozen = true;
    freezeIndex = Number.POSITIVE_INFINITY;

    return processor
  }

  /**
   * @param {Pluggable|null|undefined} [value]
   * @param {...unknown} options
   * @returns {Processor}
   */
  function use(value, ...options) {
    /** @type {Record<string, unknown>|undefined} */
    let settings;

    assertUnfrozen('use', frozen);

    if (value === null || value === undefined) ; else if (typeof value === 'function') {
      addPlugin(value, ...options);
    } else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        addList(value);
      } else {
        addPreset(value);
      }
    } else {
      throw new TypeError('Expected usable value, not `' + value + '`')
    }

    if (settings) {
      namespace.settings = Object.assign(namespace.settings || {}, settings);
    }

    return processor

    /**
     * @param {import('..').Pluggable<unknown[]>} value
     * @returns {void}
     */
    function add(value) {
      if (typeof value === 'function') {
        addPlugin(value);
      } else if (typeof value === 'object') {
        if (Array.isArray(value)) {
          const [plugin, ...options] = value;
          addPlugin(plugin, ...options);
        } else {
          addPreset(value);
        }
      } else {
        throw new TypeError('Expected usable value, not `' + value + '`')
      }
    }

    /**
     * @param {Preset} result
     * @returns {void}
     */
    function addPreset(result) {
      addList(result.plugins);

      if (result.settings) {
        settings = Object.assign(settings || {}, result.settings);
      }
    }

    /**
     * @param {PluggableList|null|undefined} [plugins]
     * @returns {void}
     */
    function addList(plugins) {
      let index = -1;

      if (plugins === null || plugins === undefined) ; else if (Array.isArray(plugins)) {
        while (++index < plugins.length) {
          const thing = plugins[index];
          add(thing);
        }
      } else {
        throw new TypeError('Expected a list of plugins, not `' + plugins + '`')
      }
    }

    /**
     * @param {Plugin} plugin
     * @param {...unknown} [value]
     * @returns {void}
     */
    function addPlugin(plugin, value) {
      let index = -1;
      /** @type {Processor['attachers'][number]|undefined} */
      let entry;

      while (++index < attachers.length) {
        if (attachers[index][0] === plugin) {
          entry = attachers[index];
          break
        }
      }

      if (entry) {
        if (isPlainObject(entry[1]) && isPlainObject(value)) {
          value = extend(true, entry[1], value);
        }

        entry[1] = value;
      } else {
        // @ts-expect-error: fine.
        attachers.push([...arguments]);
      }
    }
  }

  /** @type {Processor['parse']} */
  function parse(doc) {
    processor.freeze();
    const file = vfile(doc);
    const Parser = processor.Parser;
    assertParser('parse', Parser);

    if (newable(Parser, 'parse')) {
      // @ts-expect-error: `newable` checks this.
      return new Parser(String(file), file).parse()
    }

    // @ts-expect-error: `newable` checks this.
    return Parser(String(file), file) // eslint-disable-line new-cap
  }

  /** @type {Processor['stringify']} */
  function stringify(node, doc) {
    processor.freeze();
    const file = vfile(doc);
    const Compiler = processor.Compiler;
    assertCompiler('stringify', Compiler);
    assertNode(node);

    if (newable(Compiler, 'compile')) {
      // @ts-expect-error: `newable` checks this.
      return new Compiler(node, file).compile()
    }

    // @ts-expect-error: `newable` checks this.
    return Compiler(node, file) // eslint-disable-line new-cap
  }

  /**
   * @param {Node} node
   * @param {VFileCompatible|RunCallback} [doc]
   * @param {RunCallback} [callback]
   * @returns {Promise<Node>|void}
   */
  function run(node, doc, callback) {
    assertNode(node);
    processor.freeze();

    if (!callback && typeof doc === 'function') {
      callback = doc;
      doc = undefined;
    }

    if (!callback) {
      return new Promise(executor)
    }

    executor(null, callback);

    /**
     * @param {null|((node: Node) => void)} resolve
     * @param {(error: Error) => void} reject
     * @returns {void}
     */
    function executor(resolve, reject) {
      // @ts-expect-error: `doc` can’t be a callback anymore, we checked.
      transformers.run(node, vfile(doc), done);

      /**
       * @param {Error|null} error
       * @param {Node} tree
       * @param {VFile} file
       * @returns {void}
       */
      function done(error, tree, file) {
        tree = tree || node;
        if (error) {
          reject(error);
        } else if (resolve) {
          resolve(tree);
        } else {
          // @ts-expect-error: `callback` is defined if `resolve` is not.
          callback(null, tree, file);
        }
      }
    }
  }

  /** @type {Processor['runSync']} */
  function runSync(node, file) {
    /** @type {Node|undefined} */
    let result;
    /** @type {boolean|undefined} */
    let complete;

    processor.run(node, file, done);

    assertDone('runSync', 'run', complete);

    // @ts-expect-error: we either bailed on an error or have a tree.
    return result

    /**
     * @param {Error|null} [error]
     * @param {Node} [tree]
     * @returns {void}
     */
    function done(error, tree) {
      bail(error);
      result = tree;
      complete = true;
    }
  }

  /**
   * @param {VFileCompatible} doc
   * @param {ProcessCallback} [callback]
   * @returns {Promise<VFile>|undefined}
   */
  function process(doc, callback) {
    processor.freeze();
    assertParser('process', processor.Parser);
    assertCompiler('process', processor.Compiler);

    if (!callback) {
      return new Promise(executor)
    }

    executor(null, callback);

    /**
     * @param {null|((file: VFile) => void)} resolve
     * @param {(error?: Error|null|undefined) => void} reject
     * @returns {void}
     */
    function executor(resolve, reject) {
      const file = vfile(doc);

      processor.run(processor.parse(file), file, (error, tree, file) => {
        if (error || !tree || !file) {
          done(error);
        } else {
          /** @type {unknown} */
          const result = processor.stringify(tree, file);

          if (result === undefined || result === null) ; else if (looksLikeAVFileValue(result)) {
            file.value = result;
          } else {
            file.result = result;
          }

          done(error, file);
        }
      });

      /**
       * @param {Error|null|undefined} [error]
       * @param {VFile|undefined} [file]
       * @returns {void}
       */
      function done(error, file) {
        if (error || !file) {
          reject(error);
        } else if (resolve) {
          resolve(file);
        } else {
          // @ts-expect-error: `callback` is defined if `resolve` is not.
          callback(null, file);
        }
      }
    }
  }

  /** @type {Processor['processSync']} */
  function processSync(doc) {
    /** @type {boolean|undefined} */
    let complete;

    processor.freeze();
    assertParser('processSync', processor.Parser);
    assertCompiler('processSync', processor.Compiler);

    const file = vfile(doc);

    processor.process(file, done);

    assertDone('processSync', 'process', complete);

    return file

    /**
     * @param {Error|null|undefined} [error]
     * @returns {void}
     */
    function done(error) {
      complete = true;
      bail(error);
    }
  }
}

/**
 * Check if `value` is a constructor.
 *
 * @param {unknown} value
 * @param {string} name
 * @returns {boolean}
 */
function newable(value, name) {
  return (
    typeof value === 'function' &&
    // Prototypes do exist.
    // type-coverage:ignore-next-line
    value.prototype &&
    // A function with keys in its prototype is probably a constructor.
    // Classes’ prototype methods are not enumerable, so we check if some value
    // exists in the prototype.
    // type-coverage:ignore-next-line
    (keys(value.prototype) || name in value.prototype)
  )
}

/**
 * Check if `value` is an object with keys.
 *
 * @param {Record<string, unknown>} value
 * @returns {boolean}
 */
function keys(value) {
  /** @type {string} */
  let key;

  for (key in value) {
    if (own$7.call(value, key)) {
      return true
    }
  }

  return false
}

/**
 * Assert a parser is available.
 *
 * @param {string} name
 * @param {unknown} value
 * @returns {asserts value is Parser}
 */
function assertParser(name, value) {
  if (typeof value !== 'function') {
    throw new TypeError('Cannot `' + name + '` without `Parser`')
  }
}

/**
 * Assert a compiler is available.
 *
 * @param {string} name
 * @param {unknown} value
 * @returns {asserts value is Compiler}
 */
function assertCompiler(name, value) {
  if (typeof value !== 'function') {
    throw new TypeError('Cannot `' + name + '` without `Compiler`')
  }
}

/**
 * Assert the processor is not frozen.
 *
 * @param {string} name
 * @param {unknown} frozen
 * @returns {asserts frozen is false}
 */
function assertUnfrozen(name, frozen) {
  if (frozen) {
    throw new Error(
      'Cannot call `' +
        name +
        '` on a frozen processor.\nCreate a new processor first, by calling it: use `processor()` instead of `processor`.'
    )
  }
}

/**
 * Assert `node` is a unist node.
 *
 * @param {unknown} node
 * @returns {asserts node is Node}
 */
function assertNode(node) {
  // `isPlainObj` unfortunately uses `any` instead of `unknown`.
  // type-coverage:ignore-next-line
  if (!isPlainObject(node) || typeof node.type !== 'string') {
    throw new TypeError('Expected node, got `' + node + '`')
    // Fine.
  }
}

/**
 * Assert that `complete` is `true`.
 *
 * @param {string} name
 * @param {string} asyncName
 * @param {unknown} complete
 * @returns {asserts complete is true}
 */
function assertDone(name, asyncName, complete) {
  if (!complete) {
    throw new Error(
      '`' + name + '` finished async. Use `' + asyncName + '` instead'
    )
  }
}

/**
 * @param {VFileCompatible} [value]
 * @returns {VFile}
 */
function vfile(value) {
  return looksLikeAVFile(value) ? value : new VFile(value)
}

/**
 * @param {VFileCompatible} [value]
 * @returns {value is VFile}
 */
function looksLikeAVFile(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'message' in value &&
      'messages' in value
  )
}

/**
 * @param {unknown} [value]
 * @returns {value is VFileValue}
 */
function looksLikeAVFileValue(value) {
  return typeof value === 'string' || isBuffer(value)
}

/**
 * @typedef {import('mdast').Root|import('mdast').Content} Node
 *
 * @typedef Options
 *   Configuration (optional).
 * @property {boolean | null | undefined} [includeImageAlt=true]
 *   Whether to use `alt` for `image`s.
 */

/**
 * Get the text content of a node or list of nodes.
 *
 * Prefers the node’s plain-text fields, otherwise serializes its children,
 * and if the given value is an array, serialize the nodes in it.
 *
 * @param {unknown} value
 *   Thing to serialize, typically `Node`.
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {string}
 *   Serialized `value`.
 */
function toString(value, options) {
  const includeImageAlt = (options || {}).includeImageAlt;
  return one$1(
    value,
    typeof includeImageAlt === 'boolean' ? includeImageAlt : true
  )
}

/**
 * One node or several nodes.
 *
 * @param {unknown} value
 *   Thing to serialize.
 * @param {boolean} includeImageAlt
 *   Include image `alt`s.
 * @returns {string}
 *   Serialized node.
 */
function one$1(value, includeImageAlt) {
  return (
    (node(value) &&
      (('value' in value && value.value) ||
        (includeImageAlt && 'alt' in value && value.alt) ||
        ('children' in value && all$1(value.children, includeImageAlt)))) ||
    (Array.isArray(value) && all$1(value, includeImageAlt)) ||
    ''
  )
}

/**
 * Serialize a list of nodes.
 *
 * @param {Array<unknown>} values
 *   Thing to serialize.
 * @param {boolean} includeImageAlt
 *   Include image `alt`s.
 * @returns {string}
 *   Serialized nodes.
 */
function all$1(values, includeImageAlt) {
  /** @type {Array<string>} */
  const result = [];
  let index = -1;

  while (++index < values.length) {
    result[index] = one$1(values[index], includeImageAlt);
  }

  return result.join('')
}

/**
 * Check if `value` looks like a node.
 *
 * @param {unknown} value
 *   Thing.
 * @returns {value is Node}
 *   Whether `value` is a node.
 */
function node(value) {
  return Boolean(value && typeof value === 'object')
}

/**
 * Like `Array#splice`, but smarter for giant arrays.
 *
 * `Array#splice` takes all items to be inserted as individual argument which
 * causes a stack overflow in V8 when trying to insert 100k items for instance.
 *
 * Otherwise, this does not return the removed items, and takes `items` as an
 * array instead of rest parameters.
 *
 * @template {unknown} T
 * @param {T[]} list
 * @param {number} start
 * @param {number} remove
 * @param {T[]} items
 * @returns {void}
 */
function splice(list, start, remove, items) {
  const end = list.length;
  let chunkStart = 0;
  /** @type {unknown[]} */

  let parameters; // Make start between zero and `end` (included).

  if (start < 0) {
    start = -start > end ? 0 : end + start;
  } else {
    start = start > end ? end : start;
  }

  remove = remove > 0 ? remove : 0; // No need to chunk the items if there’s only a couple (10k) items.

  if (items.length < 10000) {
    parameters = Array.from(items);
    parameters.unshift(start, remove) // @ts-expect-error Hush, it’s fine.
    ;[].splice.apply(list, parameters);
  } else {
    // Delete `remove` items starting from `start`
    if (remove) [].splice.apply(list, [start, remove]); // Insert the items in chunks to not cause stack overflows.

    while (chunkStart < items.length) {
      parameters = items.slice(chunkStart, chunkStart + 10000);
      parameters.unshift(start, 0) // @ts-expect-error Hush, it’s fine.
      ;[].splice.apply(list, parameters);
      chunkStart += 10000;
      start += 10000;
    }
  }
}
/**
 * Append `items` (an array) at the end of `list` (another array).
 * When `list` was empty, returns `items` instead.
 *
 * This prevents a potentially expensive operation when `list` is empty,
 * and adds items in batches to prevent V8 from hanging.
 *
 * @template {unknown} T
 * @param {T[]} list
 * @param {T[]} items
 * @returns {T[]}
 */

function push(list, items) {
  if (list.length > 0) {
    splice(list, list.length, 0, items);
    return list
  }

  return items
}

/**
 * @typedef {import('micromark-util-types').NormalizedExtension} NormalizedExtension
 * @typedef {import('micromark-util-types').Extension} Extension
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').HtmlExtension} HtmlExtension
 */

const hasOwnProperty = {}.hasOwnProperty;

/**
 * Combine several syntax extensions into one.
 *
 * @param {Extension[]} extensions List of syntax extensions.
 * @returns {NormalizedExtension} A single combined extension.
 */
function combineExtensions(extensions) {
  /** @type {NormalizedExtension} */
  const all = {};
  let index = -1;

  while (++index < extensions.length) {
    syntaxExtension(all, extensions[index]);
  }

  return all
}

/**
 * Merge `extension` into `all`.
 *
 * @param {NormalizedExtension} all Extension to merge into.
 * @param {Extension} extension Extension to merge.
 * @returns {void}
 */
function syntaxExtension(all, extension) {
  /** @type {string} */
  let hook;

  for (hook in extension) {
    const maybe = hasOwnProperty.call(all, hook) ? all[hook] : undefined;
    const left = maybe || (all[hook] = {});
    const right = extension[hook];
    /** @type {string} */
    let code;

    for (code in right) {
      if (!hasOwnProperty.call(left, code)) left[code] = [];
      const value = right[code];
      constructs(
        // @ts-expect-error Looks like a list.
        left[code],
        Array.isArray(value) ? value : value ? [value] : []
      );
    }
  }
}

/**
 * Merge `list` into `existing` (both lists of constructs).
 * Mutates `existing`.
 *
 * @param {unknown[]} existing
 * @param {unknown[]} list
 * @returns {void}
 */
function constructs(existing, list) {
  let index = -1;
  /** @type {unknown[]} */
  const before = [];

  while (++index < list.length) {
(list[index].add === 'after' ? existing : before).push(list[index]);
  }

  splice(existing, 0, 0, before);
}

// This module is generated by `script/`.
//
// CommonMark handles attention (emphasis, strong) markers based on what comes
// before or after them.
// One such difference is if those characters are Unicode punctuation.
// This script is generated from the Unicode data.
const unicodePunctuationRegex =
  /[!-/:-@[-`{-~\u00A1\u00A7\u00AB\u00B6\u00B7\u00BB\u00BF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]/;

/**
 * @typedef {import('micromark-util-types').Code} Code
 */
/**
 * Check whether the character code represents an ASCII alpha (`a` through `z`,
 * case insensitive).
 *
 * An **ASCII alpha** is an ASCII upper alpha or ASCII lower alpha.
 *
 * An **ASCII upper alpha** is a character in the inclusive range U+0041 (`A`)
 * to U+005A (`Z`).
 *
 * An **ASCII lower alpha** is a character in the inclusive range U+0061 (`a`)
 * to U+007A (`z`).
 */

const asciiAlpha = regexCheck(/[A-Za-z]/);
/**
 * Check whether the character code represents an ASCII digit (`0` through `9`).
 *
 * An **ASCII digit** is a character in the inclusive range U+0030 (`0`) to
 * U+0039 (`9`).
 */

const asciiDigit = regexCheck(/\d/);
/**
 * Check whether the character code represents an ASCII hex digit (`a` through
 * `f`, case insensitive, or `0` through `9`).
 *
 * An **ASCII hex digit** is an ASCII digit (see `asciiDigit`), ASCII upper hex
 * digit, or an ASCII lower hex digit.
 *
 * An **ASCII upper hex digit** is a character in the inclusive range U+0041
 * (`A`) to U+0046 (`F`).
 *
 * An **ASCII lower hex digit** is a character in the inclusive range U+0061
 * (`a`) to U+0066 (`f`).
 */

const asciiHexDigit = regexCheck(/[\dA-Fa-f]/);
/**
 * Check whether the character code represents an ASCII alphanumeric (`a`
 * through `z`, case insensitive, or `0` through `9`).
 *
 * An **ASCII alphanumeric** is an ASCII digit (see `asciiDigit`) or ASCII alpha
 * (see `asciiAlpha`).
 */

const asciiAlphanumeric = regexCheck(/[\dA-Za-z]/);
/**
 * Check whether the character code represents ASCII punctuation.
 *
 * An **ASCII punctuation** is a character in the inclusive ranges U+0021
 * EXCLAMATION MARK (`!`) to U+002F SLASH (`/`), U+003A COLON (`:`) to U+0040 AT
 * SIGN (`@`), U+005B LEFT SQUARE BRACKET (`[`) to U+0060 GRAVE ACCENT
 * (`` ` ``), or U+007B LEFT CURLY BRACE (`{`) to U+007E TILDE (`~`).
 */

const asciiPunctuation = regexCheck(/[!-/:-@[-`{-~]/);
/**
 * Check whether the character code represents an ASCII atext.
 *
 * atext is an ASCII alphanumeric (see `asciiAlphanumeric`), or a character in
 * the inclusive ranges U+0023 NUMBER SIGN (`#`) to U+0027 APOSTROPHE (`'`),
 * U+002A ASTERISK (`*`), U+002B PLUS SIGN (`+`), U+002D DASH (`-`), U+002F
 * SLASH (`/`), U+003D EQUALS TO (`=`), U+003F QUESTION MARK (`?`), U+005E
 * CARET (`^`) to U+0060 GRAVE ACCENT (`` ` ``), or U+007B LEFT CURLY BRACE
 * (`{`) to U+007E TILDE (`~`).
 *
 * See:
 * **\[RFC5322]**:
 * [Internet Message Format](https://tools.ietf.org/html/rfc5322).
 * P. Resnick.
 * IETF.
 */

const asciiAtext = regexCheck(/[#-'*+\--9=?A-Z^-~]/);
/**
 * Check whether a character code is an ASCII control character.
 *
 * An **ASCII control** is a character in the inclusive range U+0000 NULL (NUL)
 * to U+001F (US), or U+007F (DEL).
 *
 * @param {Code} code
 * @returns {code is number}
 */

function asciiControl(code) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    code !== null && (code < 32 || code === 127)
  )
}
/**
 * Check whether a character code is a markdown line ending (see
 * `markdownLineEnding`) or markdown space (see `markdownSpace`).
 *
 * @param {Code} code
 * @returns {code is number}
 */

function markdownLineEndingOrSpace(code) {
  return code !== null && (code < 0 || code === 32)
}
/**
 * Check whether a character code is a markdown line ending.
 *
 * A **markdown line ending** is the virtual characters M-0003 CARRIAGE RETURN
 * LINE FEED (CRLF), M-0004 LINE FEED (LF) and M-0005 CARRIAGE RETURN (CR).
 *
 * In micromark, the actual character U+000A LINE FEED (LF) and U+000D CARRIAGE
 * RETURN (CR) are replaced by these virtual characters depending on whether
 * they occurred together.
 *
 * @param {Code} code
 * @returns {code is number}
 */

function markdownLineEnding(code) {
  return code !== null && code < -2
}
/**
 * Check whether a character code is a markdown space.
 *
 * A **markdown space** is the concrete character U+0020 SPACE (SP) and the
 * virtual characters M-0001 VIRTUAL SPACE (VS) and M-0002 HORIZONTAL TAB (HT).
 *
 * In micromark, the actual character U+0009 CHARACTER TABULATION (HT) is
 * replaced by one M-0002 HORIZONTAL TAB (HT) and between 0 and 3 M-0001 VIRTUAL
 * SPACE (VS) characters, depending on the column at which the tab occurred.
 *
 * @param {Code} code
 * @returns {code is number}
 */

function markdownSpace(code) {
  return code === -2 || code === -1 || code === 32
}
/**
 * Check whether the character code represents Unicode whitespace.
 *
 * Note that this does handle micromark specific markdown whitespace characters.
 * See `markdownLineEndingOrSpace` to check that.
 *
 * A **Unicode whitespace** is a character in the Unicode `Zs` (Separator,
 * Space) category, or U+0009 CHARACTER TABULATION (HT), U+000A LINE FEED (LF),
 * U+000C (FF), or U+000D CARRIAGE RETURN (CR) (**\[UNICODE]**).
 *
 * See:
 * **\[UNICODE]**:
 * [The Unicode Standard](https://www.unicode.org/versions/).
 * Unicode Consortium.
 */

const unicodeWhitespace = regexCheck(/\s/);
/**
 * Check whether the character code represents Unicode punctuation.
 *
 * A **Unicode punctuation** is a character in the Unicode `Pc` (Punctuation,
 * Connector), `Pd` (Punctuation, Dash), `Pe` (Punctuation, Close), `Pf`
 * (Punctuation, Final quote), `Pi` (Punctuation, Initial quote), `Po`
 * (Punctuation, Other), or `Ps` (Punctuation, Open) categories, or an ASCII
 * punctuation (see `asciiPunctuation`).
 *
 * See:
 * **\[UNICODE]**:
 * [The Unicode Standard](https://www.unicode.org/versions/).
 * Unicode Consortium.
 */
// Size note: removing ASCII from the regex and using `asciiPunctuation` here
// In fact adds to the bundle size.

const unicodePunctuation = regexCheck(unicodePunctuationRegex);
/**
 * Create a code check from a regex.
 *
 * @param {RegExp} regex
 * @returns {(code: Code) => code is number}
 */

function regexCheck(regex) {
  return check
  /**
   * Check whether a code matches the bound regex.
   *
   * @param {Code} code Character code
   * @returns {code is number} Whether the character code matches the bound regex
   */

  function check(code) {
    return code !== null && regex.test(String.fromCharCode(code))
  }
}

/**
 * @typedef {import('micromark-util-types').Effects} Effects
 * @typedef {import('micromark-util-types').State} State
 */
/**
 * @param {Effects} effects
 * @param {State} ok
 * @param {string} type
 * @param {number} [max=Infinity]
 * @returns {State}
 */

function factorySpace(effects, ok, type, max) {
  const limit = max ? max - 1 : Number.POSITIVE_INFINITY;
  let size = 0;
  return start
  /** @type {State} */

  function start(code) {
    if (markdownSpace(code)) {
      effects.enter(type);
      return prefix(code)
    }

    return ok(code)
  }
  /** @type {State} */

  function prefix(code) {
    if (markdownSpace(code) && size++ < limit) {
      effects.consume(code);
      return prefix
    }

    effects.exit(type);
    return ok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').InitialConstruct} InitialConstruct
 * @typedef {import('micromark-util-types').Initializer} Initializer
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').State} State
 */

/** @type {InitialConstruct} */
const content$1 = {
  tokenize: initializeContent
};
/** @type {Initializer} */

function initializeContent(effects) {
  const contentStart = effects.attempt(
    this.parser.constructs.contentInitial,
    afterContentStartConstruct,
    paragraphInitial
  );
  /** @type {Token} */

  let previous;
  return contentStart
  /** @type {State} */

  function afterContentStartConstruct(code) {
    if (code === null) {
      effects.consume(code);
      return
    }

    effects.enter('lineEnding');
    effects.consume(code);
    effects.exit('lineEnding');
    return factorySpace(effects, contentStart, 'linePrefix')
  }
  /** @type {State} */

  function paragraphInitial(code) {
    effects.enter('paragraph');
    return lineStart(code)
  }
  /** @type {State} */

  function lineStart(code) {
    const token = effects.enter('chunkText', {
      contentType: 'text',
      previous
    });

    if (previous) {
      previous.next = token;
    }

    previous = token;
    return data(code)
  }
  /** @type {State} */

  function data(code) {
    if (code === null) {
      effects.exit('chunkText');
      effects.exit('paragraph');
      effects.consume(code);
      return
    }

    if (markdownLineEnding(code)) {
      effects.consume(code);
      effects.exit('chunkText');
      return lineStart
    } // Data.

    effects.consume(code);
    return data
  }
}

/**
 * @typedef {import('micromark-util-types').InitialConstruct} InitialConstruct
 * @typedef {import('micromark-util-types').Initializer} Initializer
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').TokenizeContext} TokenizeContext
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Point} Point
 */
/** @type {InitialConstruct} */

const document$1 = {
  tokenize: initializeDocument
};
/** @type {Construct} */

const containerConstruct = {
  tokenize: tokenizeContainer
};
/** @type {Initializer} */

function initializeDocument(effects) {
  const self = this;
  /** @type {Array<StackItem>} */

  const stack = [];
  let continued = 0;
  /** @type {TokenizeContext|undefined} */

  let childFlow;
  /** @type {Token|undefined} */

  let childToken;
  /** @type {number} */

  let lineStartOffset;
  return start
  /** @type {State} */

  function start(code) {
    // First we iterate through the open blocks, starting with the root
    // document, and descending through last children down to the last open
    // block.
    // Each block imposes a condition that the line must satisfy if the block is
    // to remain open.
    // For example, a block quote requires a `>` character.
    // A paragraph requires a non-blank line.
    // In this phase we may match all or just some of the open blocks.
    // But we cannot close unmatched blocks yet, because we may have a lazy
    // continuation line.
    if (continued < stack.length) {
      const item = stack[continued];
      self.containerState = item[1];
      return effects.attempt(
        item[0].continuation,
        documentContinue,
        checkNewContainers
      )(code)
    } // Done.

    return checkNewContainers(code)
  }
  /** @type {State} */

  function documentContinue(code) {
    continued++; // Note: this field is called `_closeFlow` but it also closes containers.
    // Perhaps a good idea to rename it but it’s already used in the wild by
    // extensions.

    if (self.containerState._closeFlow) {
      self.containerState._closeFlow = undefined;

      if (childFlow) {
        closeFlow();
      } // Note: this algorithm for moving events around is similar to the
      // algorithm when dealing with lazy lines in `writeToChild`.

      const indexBeforeExits = self.events.length;
      let indexBeforeFlow = indexBeforeExits;
      /** @type {Point|undefined} */

      let point; // Find the flow chunk.

      while (indexBeforeFlow--) {
        if (
          self.events[indexBeforeFlow][0] === 'exit' &&
          self.events[indexBeforeFlow][1].type === 'chunkFlow'
        ) {
          point = self.events[indexBeforeFlow][1].end;
          break
        }
      }

      exitContainers(continued); // Fix positions.

      let index = indexBeforeExits;

      while (index < self.events.length) {
        self.events[index][1].end = Object.assign({}, point);
        index++;
      } // Inject the exits earlier (they’re still also at the end).

      splice(
        self.events,
        indexBeforeFlow + 1,
        0,
        self.events.slice(indexBeforeExits)
      ); // Discard the duplicate exits.

      self.events.length = index;
      return checkNewContainers(code)
    }

    return start(code)
  }
  /** @type {State} */

  function checkNewContainers(code) {
    // Next, after consuming the continuation markers for existing blocks, we
    // look for new block starts (e.g. `>` for a block quote).
    // If we encounter a new block start, we close any blocks unmatched in
    // step 1 before creating the new block as a child of the last matched
    // block.
    if (continued === stack.length) {
      // No need to `check` whether there’s a container, of `exitContainers`
      // would be moot.
      // We can instead immediately `attempt` to parse one.
      if (!childFlow) {
        return documentContinued(code)
      } // If we have concrete content, such as block HTML or fenced code,
      // we can’t have containers “pierce” into them, so we can immediately
      // start.

      if (childFlow.currentConstruct && childFlow.currentConstruct.concrete) {
        return flowStart(code)
      } // If we do have flow, it could still be a blank line,
      // but we’d be interrupting it w/ a new container if there’s a current
      // construct.

      self.interrupt = Boolean(
        childFlow.currentConstruct && !childFlow._gfmTableDynamicInterruptHack
      );
    } // Check if there is a new container.

    self.containerState = {};
    return effects.check(
      containerConstruct,
      thereIsANewContainer,
      thereIsNoNewContainer
    )(code)
  }
  /** @type {State} */

  function thereIsANewContainer(code) {
    if (childFlow) closeFlow();
    exitContainers(continued);
    return documentContinued(code)
  }
  /** @type {State} */

  function thereIsNoNewContainer(code) {
    self.parser.lazy[self.now().line] = continued !== stack.length;
    lineStartOffset = self.now().offset;
    return flowStart(code)
  }
  /** @type {State} */

  function documentContinued(code) {
    // Try new containers.
    self.containerState = {};
    return effects.attempt(
      containerConstruct,
      containerContinue,
      flowStart
    )(code)
  }
  /** @type {State} */

  function containerContinue(code) {
    continued++;
    stack.push([self.currentConstruct, self.containerState]); // Try another.

    return documentContinued(code)
  }
  /** @type {State} */

  function flowStart(code) {
    if (code === null) {
      if (childFlow) closeFlow();
      exitContainers(0);
      effects.consume(code);
      return
    }

    childFlow = childFlow || self.parser.flow(self.now());
    effects.enter('chunkFlow', {
      contentType: 'flow',
      previous: childToken,
      _tokenizer: childFlow
    });
    return flowContinue(code)
  }
  /** @type {State} */

  function flowContinue(code) {
    if (code === null) {
      writeToChild(effects.exit('chunkFlow'), true);
      exitContainers(0);
      effects.consume(code);
      return
    }

    if (markdownLineEnding(code)) {
      effects.consume(code);
      writeToChild(effects.exit('chunkFlow')); // Get ready for the next line.

      continued = 0;
      self.interrupt = undefined;
      return start
    }

    effects.consume(code);
    return flowContinue
  }
  /**
   * @param {Token} token
   * @param {boolean} [eof]
   * @returns {void}
   */

  function writeToChild(token, eof) {
    const stream = self.sliceStream(token);
    if (eof) stream.push(null);
    token.previous = childToken;
    if (childToken) childToken.next = token;
    childToken = token;
    childFlow.defineSkip(token.start);
    childFlow.write(stream); // Alright, so we just added a lazy line:
    //
    // ```markdown
    // > a
    // b.
    //
    // Or:
    //
    // > ~~~c
    // d
    //
    // Or:
    //
    // > | e |
    // f
    // ```
    //
    // The construct in the second example (fenced code) does not accept lazy
    // lines, so it marked itself as done at the end of its first line, and
    // then the content construct parses `d`.
    // Most constructs in markdown match on the first line: if the first line
    // forms a construct, a non-lazy line can’t “unmake” it.
    //
    // The construct in the third example is potentially a GFM table, and
    // those are *weird*.
    // It *could* be a table, from the first line, if the following line
    // matches a condition.
    // In this case, that second line is lazy, which “unmakes” the first line
    // and turns the whole into one content block.
    //
    // We’ve now parsed the non-lazy and the lazy line, and can figure out
    // whether the lazy line started a new flow block.
    // If it did, we exit the current containers between the two flow blocks.

    if (self.parser.lazy[token.start.line]) {
      let index = childFlow.events.length;

      while (index--) {
        if (
          // The token starts before the line ending…
          childFlow.events[index][1].start.offset < lineStartOffset && // …and either is not ended yet…
          (!childFlow.events[index][1].end || // …or ends after it.
            childFlow.events[index][1].end.offset > lineStartOffset)
        ) {
          // Exit: there’s still something open, which means it’s a lazy line
          // part of something.
          return
        }
      } // Note: this algorithm for moving events around is similar to the
      // algorithm when closing flow in `documentContinue`.

      const indexBeforeExits = self.events.length;
      let indexBeforeFlow = indexBeforeExits;
      /** @type {boolean|undefined} */

      let seen;
      /** @type {Point|undefined} */

      let point; // Find the previous chunk (the one before the lazy line).

      while (indexBeforeFlow--) {
        if (
          self.events[indexBeforeFlow][0] === 'exit' &&
          self.events[indexBeforeFlow][1].type === 'chunkFlow'
        ) {
          if (seen) {
            point = self.events[indexBeforeFlow][1].end;
            break
          }

          seen = true;
        }
      }

      exitContainers(continued); // Fix positions.

      index = indexBeforeExits;

      while (index < self.events.length) {
        self.events[index][1].end = Object.assign({}, point);
        index++;
      } // Inject the exits earlier (they’re still also at the end).

      splice(
        self.events,
        indexBeforeFlow + 1,
        0,
        self.events.slice(indexBeforeExits)
      ); // Discard the duplicate exits.

      self.events.length = index;
    }
  }
  /**
   * @param {number} size
   * @returns {void}
   */

  function exitContainers(size) {
    let index = stack.length; // Exit open containers.

    while (index-- > size) {
      const entry = stack[index];
      self.containerState = entry[1];
      entry[0].exit.call(self, effects);
    }

    stack.length = size;
  }

  function closeFlow() {
    childFlow.write([null]);
    childToken = undefined;
    childFlow = undefined;
    self.containerState._closeFlow = undefined;
  }
}
/** @type {Tokenizer} */

function tokenizeContainer(effects, ok, nok) {
  return factorySpace(
    effects,
    effects.attempt(this.parser.constructs.document, ok, nok),
    'linePrefix',
    this.parser.constructs.disable.null.includes('codeIndented') ? undefined : 4
  )
}

/**
 * @typedef {import('micromark-util-types').Code} Code
 */

/**
 * Classify whether a character code represents whitespace, punctuation, or
 * something else.
 *
 * Used for attention (emphasis, strong), whose sequences can open or close
 * based on the class of surrounding characters.
 *
 * Note that eof (`null`) is seen as whitespace.
 *
 * @param {Code} code
 * @returns {number|undefined}
 */
function classifyCharacter(code) {
  if (
    code === null ||
    markdownLineEndingOrSpace(code) ||
    unicodeWhitespace(code)
  ) {
    return 1
  }

  if (unicodePunctuation(code)) {
    return 2
  }
}

/**
 * @typedef {import('micromark-util-types').TokenizeContext} TokenizeContext
 * @typedef {import('micromark-util-types').Event} Event
 * @typedef {import('micromark-util-types').Resolver} Resolver
 */

/**
 * Call all `resolveAll`s.
 *
 * @param {{resolveAll?: Resolver}[]} constructs
 * @param {Event[]} events
 * @param {TokenizeContext} context
 * @returns {Event[]}
 */
function resolveAll(constructs, events, context) {
  /** @type {Resolver[]} */
  const called = [];
  let index = -1;

  while (++index < constructs.length) {
    const resolve = constructs[index].resolveAll;

    if (resolve && !called.includes(resolve)) {
      events = resolve(events, context);
      called.push(resolve);
    }
  }

  return events
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').Event} Event
 * @typedef {import('micromark-util-types').Code} Code
 * @typedef {import('micromark-util-types').Point} Point
 */

/** @type {Construct} */
const attention = {
  name: 'attention',
  tokenize: tokenizeAttention,
  resolveAll: resolveAllAttention
};
/**
 * Take all events and resolve attention to emphasis or strong.
 *
 * @type {Resolver}
 */

function resolveAllAttention(events, context) {
  let index = -1;
  /** @type {number} */

  let open;
  /** @type {Token} */

  let group;
  /** @type {Token} */

  let text;
  /** @type {Token} */

  let openingSequence;
  /** @type {Token} */

  let closingSequence;
  /** @type {number} */

  let use;
  /** @type {Event[]} */

  let nextEvents;
  /** @type {number} */

  let offset; // Walk through all events.
  //
  // Note: performance of this is fine on an mb of normal markdown, but it’s
  // a bottleneck for malicious stuff.

  while (++index < events.length) {
    // Find a token that can close.
    if (
      events[index][0] === 'enter' &&
      events[index][1].type === 'attentionSequence' &&
      events[index][1]._close
    ) {
      open = index; // Now walk back to find an opener.

      while (open--) {
        // Find a token that can open the closer.
        if (
          events[open][0] === 'exit' &&
          events[open][1].type === 'attentionSequence' &&
          events[open][1]._open && // If the markers are the same:
          context.sliceSerialize(events[open][1]).charCodeAt(0) ===
            context.sliceSerialize(events[index][1]).charCodeAt(0)
        ) {
          // If the opening can close or the closing can open,
          // and the close size *is not* a multiple of three,
          // but the sum of the opening and closing size *is* multiple of three,
          // then don’t match.
          if (
            (events[open][1]._close || events[index][1]._open) &&
            (events[index][1].end.offset - events[index][1].start.offset) % 3 &&
            !(
              (events[open][1].end.offset -
                events[open][1].start.offset +
                events[index][1].end.offset -
                events[index][1].start.offset) %
              3
            )
          ) {
            continue
          } // Number of markers to use from the sequence.

          use =
            events[open][1].end.offset - events[open][1].start.offset > 1 &&
            events[index][1].end.offset - events[index][1].start.offset > 1
              ? 2
              : 1;
          const start = Object.assign({}, events[open][1].end);
          const end = Object.assign({}, events[index][1].start);
          movePoint(start, -use);
          movePoint(end, use);
          openingSequence = {
            type: use > 1 ? 'strongSequence' : 'emphasisSequence',
            start,
            end: Object.assign({}, events[open][1].end)
          };
          closingSequence = {
            type: use > 1 ? 'strongSequence' : 'emphasisSequence',
            start: Object.assign({}, events[index][1].start),
            end
          };
          text = {
            type: use > 1 ? 'strongText' : 'emphasisText',
            start: Object.assign({}, events[open][1].end),
            end: Object.assign({}, events[index][1].start)
          };
          group = {
            type: use > 1 ? 'strong' : 'emphasis',
            start: Object.assign({}, openingSequence.start),
            end: Object.assign({}, closingSequence.end)
          };
          events[open][1].end = Object.assign({}, openingSequence.start);
          events[index][1].start = Object.assign({}, closingSequence.end);
          nextEvents = []; // If there are more markers in the opening, add them before.

          if (events[open][1].end.offset - events[open][1].start.offset) {
            nextEvents = push(nextEvents, [
              ['enter', events[open][1], context],
              ['exit', events[open][1], context]
            ]);
          } // Opening.

          nextEvents = push(nextEvents, [
            ['enter', group, context],
            ['enter', openingSequence, context],
            ['exit', openingSequence, context],
            ['enter', text, context]
          ]); // Between.

          nextEvents = push(
            nextEvents,
            resolveAll(
              context.parser.constructs.insideSpan.null,
              events.slice(open + 1, index),
              context
            )
          ); // Closing.

          nextEvents = push(nextEvents, [
            ['exit', text, context],
            ['enter', closingSequence, context],
            ['exit', closingSequence, context],
            ['exit', group, context]
          ]); // If there are more markers in the closing, add them after.

          if (events[index][1].end.offset - events[index][1].start.offset) {
            offset = 2;
            nextEvents = push(nextEvents, [
              ['enter', events[index][1], context],
              ['exit', events[index][1], context]
            ]);
          } else {
            offset = 0;
          }

          splice(events, open - 1, index - open + 3, nextEvents);
          index = open + nextEvents.length - offset - 2;
          break
        }
      }
    }
  } // Remove remaining sequences.

  index = -1;

  while (++index < events.length) {
    if (events[index][1].type === 'attentionSequence') {
      events[index][1].type = 'data';
    }
  }

  return events
}
/** @type {Tokenizer} */

function tokenizeAttention(effects, ok) {
  const attentionMarkers = this.parser.constructs.attentionMarkers.null;
  const previous = this.previous;
  const before = classifyCharacter(previous);
  /** @type {NonNullable<Code>} */

  let marker;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('attentionSequence');
    marker = code;
    return sequence(code)
  }
  /** @type {State} */

  function sequence(code) {
    if (code === marker) {
      effects.consume(code);
      return sequence
    }

    const token = effects.exit('attentionSequence');
    const after = classifyCharacter(code);
    const open =
      !after || (after === 2 && before) || attentionMarkers.includes(code);
    const close =
      !before || (before === 2 && after) || attentionMarkers.includes(previous);
    token._open = Boolean(marker === 42 ? open : open && (before || !close));
    token._close = Boolean(marker === 42 ? close : close && (after || !open));
    return ok(code)
  }
}
/**
 * Move a point a bit.
 *
 * Note: `move` only works inside lines! It’s not possible to move past other
 * chunks (replacement characters, tabs, or line endings).
 *
 * @param {Point} point
 * @param {number} offset
 * @returns {void}
 */

function movePoint(point, offset) {
  point.column += offset;
  point.offset += offset;
  point._bufferIndex += offset;
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 */

/** @type {Construct} */
const autolink = {
  name: 'autolink',
  tokenize: tokenizeAutolink
};
/** @type {Tokenizer} */

function tokenizeAutolink(effects, ok, nok) {
  let size = 1;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('autolink');
    effects.enter('autolinkMarker');
    effects.consume(code);
    effects.exit('autolinkMarker');
    effects.enter('autolinkProtocol');
    return open
  }
  /** @type {State} */

  function open(code) {
    if (asciiAlpha(code)) {
      effects.consume(code);
      return schemeOrEmailAtext
    }

    return asciiAtext(code) ? emailAtext(code) : nok(code)
  }
  /** @type {State} */

  function schemeOrEmailAtext(code) {
    return code === 43 || code === 45 || code === 46 || asciiAlphanumeric(code)
      ? schemeInsideOrEmailAtext(code)
      : emailAtext(code)
  }
  /** @type {State} */

  function schemeInsideOrEmailAtext(code) {
    if (code === 58) {
      effects.consume(code);
      return urlInside
    }

    if (
      (code === 43 || code === 45 || code === 46 || asciiAlphanumeric(code)) &&
      size++ < 32
    ) {
      effects.consume(code);
      return schemeInsideOrEmailAtext
    }

    return emailAtext(code)
  }
  /** @type {State} */

  function urlInside(code) {
    if (code === 62) {
      effects.exit('autolinkProtocol');
      return end(code)
    }

    if (code === null || code === 32 || code === 60 || asciiControl(code)) {
      return nok(code)
    }

    effects.consume(code);
    return urlInside
  }
  /** @type {State} */

  function emailAtext(code) {
    if (code === 64) {
      effects.consume(code);
      size = 0;
      return emailAtSignOrDot
    }

    if (asciiAtext(code)) {
      effects.consume(code);
      return emailAtext
    }

    return nok(code)
  }
  /** @type {State} */

  function emailAtSignOrDot(code) {
    return asciiAlphanumeric(code) ? emailLabel(code) : nok(code)
  }
  /** @type {State} */

  function emailLabel(code) {
    if (code === 46) {
      effects.consume(code);
      size = 0;
      return emailAtSignOrDot
    }

    if (code === 62) {
      // Exit, then change the type.
      effects.exit('autolinkProtocol').type = 'autolinkEmail';
      return end(code)
    }

    return emailValue(code)
  }
  /** @type {State} */

  function emailValue(code) {
    if ((code === 45 || asciiAlphanumeric(code)) && size++ < 63) {
      effects.consume(code);
      return code === 45 ? emailValue : emailLabel
    }

    return nok(code)
  }
  /** @type {State} */

  function end(code) {
    effects.enter('autolinkMarker');
    effects.consume(code);
    effects.exit('autolinkMarker');
    effects.exit('autolink');
    return ok
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 */

/** @type {Construct} */
const blankLine = {
  tokenize: tokenizeBlankLine,
  partial: true
};
/** @type {Tokenizer} */

function tokenizeBlankLine(effects, ok, nok) {
  return factorySpace(effects, afterWhitespace, 'linePrefix')
  /** @type {State} */

  function afterWhitespace(code) {
    return code === null || markdownLineEnding(code) ? ok(code) : nok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').Exiter} Exiter
 * @typedef {import('micromark-util-types').State} State
 */

/** @type {Construct} */
const blockQuote = {
  name: 'blockQuote',
  tokenize: tokenizeBlockQuoteStart,
  continuation: {
    tokenize: tokenizeBlockQuoteContinuation
  },
  exit: exit$1
};
/** @type {Tokenizer} */

function tokenizeBlockQuoteStart(effects, ok, nok) {
  const self = this;
  return start
  /** @type {State} */

  function start(code) {
    if (code === 62) {
      const state = self.containerState;

      if (!state.open) {
        effects.enter('blockQuote', {
          _container: true
        });
        state.open = true;
      }

      effects.enter('blockQuotePrefix');
      effects.enter('blockQuoteMarker');
      effects.consume(code);
      effects.exit('blockQuoteMarker');
      return after
    }

    return nok(code)
  }
  /** @type {State} */

  function after(code) {
    if (markdownSpace(code)) {
      effects.enter('blockQuotePrefixWhitespace');
      effects.consume(code);
      effects.exit('blockQuotePrefixWhitespace');
      effects.exit('blockQuotePrefix');
      return ok
    }

    effects.exit('blockQuotePrefix');
    return ok(code)
  }
}
/** @type {Tokenizer} */

function tokenizeBlockQuoteContinuation(effects, ok, nok) {
  return factorySpace(
    effects,
    effects.attempt(blockQuote, ok, nok),
    'linePrefix',
    this.parser.constructs.disable.null.includes('codeIndented') ? undefined : 4
  )
}
/** @type {Exiter} */

function exit$1(effects) {
  effects.exit('blockQuote');
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 */

/** @type {Construct} */
const characterEscape = {
  name: 'characterEscape',
  tokenize: tokenizeCharacterEscape
};
/** @type {Tokenizer} */

function tokenizeCharacterEscape(effects, ok, nok) {
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('characterEscape');
    effects.enter('escapeMarker');
    effects.consume(code);
    effects.exit('escapeMarker');
    return open
  }
  /** @type {State} */

  function open(code) {
    if (asciiPunctuation(code)) {
      effects.enter('characterEscapeValue');
      effects.consume(code);
      effects.exit('characterEscapeValue');
      effects.exit('characterEscape');
      return ok
    }

    return nok(code)
  }
}

/**
 * Map of named character references.
 *
 * @type {Record<string, string>}
 */
const characterEntities = {
  AElig: 'Æ',
  AMP: '&',
  Aacute: 'Á',
  Abreve: 'Ă',
  Acirc: 'Â',
  Acy: 'А',
  Afr: '𝔄',
  Agrave: 'À',
  Alpha: 'Α',
  Amacr: 'Ā',
  And: '⩓',
  Aogon: 'Ą',
  Aopf: '𝔸',
  ApplyFunction: '⁡',
  Aring: 'Å',
  Ascr: '𝒜',
  Assign: '≔',
  Atilde: 'Ã',
  Auml: 'Ä',
  Backslash: '∖',
  Barv: '⫧',
  Barwed: '⌆',
  Bcy: 'Б',
  Because: '∵',
  Bernoullis: 'ℬ',
  Beta: 'Β',
  Bfr: '𝔅',
  Bopf: '𝔹',
  Breve: '˘',
  Bscr: 'ℬ',
  Bumpeq: '≎',
  CHcy: 'Ч',
  COPY: '©',
  Cacute: 'Ć',
  Cap: '⋒',
  CapitalDifferentialD: 'ⅅ',
  Cayleys: 'ℭ',
  Ccaron: 'Č',
  Ccedil: 'Ç',
  Ccirc: 'Ĉ',
  Cconint: '∰',
  Cdot: 'Ċ',
  Cedilla: '¸',
  CenterDot: '·',
  Cfr: 'ℭ',
  Chi: 'Χ',
  CircleDot: '⊙',
  CircleMinus: '⊖',
  CirclePlus: '⊕',
  CircleTimes: '⊗',
  ClockwiseContourIntegral: '∲',
  CloseCurlyDoubleQuote: '”',
  CloseCurlyQuote: '’',
  Colon: '∷',
  Colone: '⩴',
  Congruent: '≡',
  Conint: '∯',
  ContourIntegral: '∮',
  Copf: 'ℂ',
  Coproduct: '∐',
  CounterClockwiseContourIntegral: '∳',
  Cross: '⨯',
  Cscr: '𝒞',
  Cup: '⋓',
  CupCap: '≍',
  DD: 'ⅅ',
  DDotrahd: '⤑',
  DJcy: 'Ђ',
  DScy: 'Ѕ',
  DZcy: 'Џ',
  Dagger: '‡',
  Darr: '↡',
  Dashv: '⫤',
  Dcaron: 'Ď',
  Dcy: 'Д',
  Del: '∇',
  Delta: 'Δ',
  Dfr: '𝔇',
  DiacriticalAcute: '´',
  DiacriticalDot: '˙',
  DiacriticalDoubleAcute: '˝',
  DiacriticalGrave: '`',
  DiacriticalTilde: '˜',
  Diamond: '⋄',
  DifferentialD: 'ⅆ',
  Dopf: '𝔻',
  Dot: '¨',
  DotDot: '⃜',
  DotEqual: '≐',
  DoubleContourIntegral: '∯',
  DoubleDot: '¨',
  DoubleDownArrow: '⇓',
  DoubleLeftArrow: '⇐',
  DoubleLeftRightArrow: '⇔',
  DoubleLeftTee: '⫤',
  DoubleLongLeftArrow: '⟸',
  DoubleLongLeftRightArrow: '⟺',
  DoubleLongRightArrow: '⟹',
  DoubleRightArrow: '⇒',
  DoubleRightTee: '⊨',
  DoubleUpArrow: '⇑',
  DoubleUpDownArrow: '⇕',
  DoubleVerticalBar: '∥',
  DownArrow: '↓',
  DownArrowBar: '⤓',
  DownArrowUpArrow: '⇵',
  DownBreve: '̑',
  DownLeftRightVector: '⥐',
  DownLeftTeeVector: '⥞',
  DownLeftVector: '↽',
  DownLeftVectorBar: '⥖',
  DownRightTeeVector: '⥟',
  DownRightVector: '⇁',
  DownRightVectorBar: '⥗',
  DownTee: '⊤',
  DownTeeArrow: '↧',
  Downarrow: '⇓',
  Dscr: '𝒟',
  Dstrok: 'Đ',
  ENG: 'Ŋ',
  ETH: 'Ð',
  Eacute: 'É',
  Ecaron: 'Ě',
  Ecirc: 'Ê',
  Ecy: 'Э',
  Edot: 'Ė',
  Efr: '𝔈',
  Egrave: 'È',
  Element: '∈',
  Emacr: 'Ē',
  EmptySmallSquare: '◻',
  EmptyVerySmallSquare: '▫',
  Eogon: 'Ę',
  Eopf: '𝔼',
  Epsilon: 'Ε',
  Equal: '⩵',
  EqualTilde: '≂',
  Equilibrium: '⇌',
  Escr: 'ℰ',
  Esim: '⩳',
  Eta: 'Η',
  Euml: 'Ë',
  Exists: '∃',
  ExponentialE: 'ⅇ',
  Fcy: 'Ф',
  Ffr: '𝔉',
  FilledSmallSquare: '◼',
  FilledVerySmallSquare: '▪',
  Fopf: '𝔽',
  ForAll: '∀',
  Fouriertrf: 'ℱ',
  Fscr: 'ℱ',
  GJcy: 'Ѓ',
  GT: '>',
  Gamma: 'Γ',
  Gammad: 'Ϝ',
  Gbreve: 'Ğ',
  Gcedil: 'Ģ',
  Gcirc: 'Ĝ',
  Gcy: 'Г',
  Gdot: 'Ġ',
  Gfr: '𝔊',
  Gg: '⋙',
  Gopf: '𝔾',
  GreaterEqual: '≥',
  GreaterEqualLess: '⋛',
  GreaterFullEqual: '≧',
  GreaterGreater: '⪢',
  GreaterLess: '≷',
  GreaterSlantEqual: '⩾',
  GreaterTilde: '≳',
  Gscr: '𝒢',
  Gt: '≫',
  HARDcy: 'Ъ',
  Hacek: 'ˇ',
  Hat: '^',
  Hcirc: 'Ĥ',
  Hfr: 'ℌ',
  HilbertSpace: 'ℋ',
  Hopf: 'ℍ',
  HorizontalLine: '─',
  Hscr: 'ℋ',
  Hstrok: 'Ħ',
  HumpDownHump: '≎',
  HumpEqual: '≏',
  IEcy: 'Е',
  IJlig: 'Ĳ',
  IOcy: 'Ё',
  Iacute: 'Í',
  Icirc: 'Î',
  Icy: 'И',
  Idot: 'İ',
  Ifr: 'ℑ',
  Igrave: 'Ì',
  Im: 'ℑ',
  Imacr: 'Ī',
  ImaginaryI: 'ⅈ',
  Implies: '⇒',
  Int: '∬',
  Integral: '∫',
  Intersection: '⋂',
  InvisibleComma: '⁣',
  InvisibleTimes: '⁢',
  Iogon: 'Į',
  Iopf: '𝕀',
  Iota: 'Ι',
  Iscr: 'ℐ',
  Itilde: 'Ĩ',
  Iukcy: 'І',
  Iuml: 'Ï',
  Jcirc: 'Ĵ',
  Jcy: 'Й',
  Jfr: '𝔍',
  Jopf: '𝕁',
  Jscr: '𝒥',
  Jsercy: 'Ј',
  Jukcy: 'Є',
  KHcy: 'Х',
  KJcy: 'Ќ',
  Kappa: 'Κ',
  Kcedil: 'Ķ',
  Kcy: 'К',
  Kfr: '𝔎',
  Kopf: '𝕂',
  Kscr: '𝒦',
  LJcy: 'Љ',
  LT: '<',
  Lacute: 'Ĺ',
  Lambda: 'Λ',
  Lang: '⟪',
  Laplacetrf: 'ℒ',
  Larr: '↞',
  Lcaron: 'Ľ',
  Lcedil: 'Ļ',
  Lcy: 'Л',
  LeftAngleBracket: '⟨',
  LeftArrow: '←',
  LeftArrowBar: '⇤',
  LeftArrowRightArrow: '⇆',
  LeftCeiling: '⌈',
  LeftDoubleBracket: '⟦',
  LeftDownTeeVector: '⥡',
  LeftDownVector: '⇃',
  LeftDownVectorBar: '⥙',
  LeftFloor: '⌊',
  LeftRightArrow: '↔',
  LeftRightVector: '⥎',
  LeftTee: '⊣',
  LeftTeeArrow: '↤',
  LeftTeeVector: '⥚',
  LeftTriangle: '⊲',
  LeftTriangleBar: '⧏',
  LeftTriangleEqual: '⊴',
  LeftUpDownVector: '⥑',
  LeftUpTeeVector: '⥠',
  LeftUpVector: '↿',
  LeftUpVectorBar: '⥘',
  LeftVector: '↼',
  LeftVectorBar: '⥒',
  Leftarrow: '⇐',
  Leftrightarrow: '⇔',
  LessEqualGreater: '⋚',
  LessFullEqual: '≦',
  LessGreater: '≶',
  LessLess: '⪡',
  LessSlantEqual: '⩽',
  LessTilde: '≲',
  Lfr: '𝔏',
  Ll: '⋘',
  Lleftarrow: '⇚',
  Lmidot: 'Ŀ',
  LongLeftArrow: '⟵',
  LongLeftRightArrow: '⟷',
  LongRightArrow: '⟶',
  Longleftarrow: '⟸',
  Longleftrightarrow: '⟺',
  Longrightarrow: '⟹',
  Lopf: '𝕃',
  LowerLeftArrow: '↙',
  LowerRightArrow: '↘',
  Lscr: 'ℒ',
  Lsh: '↰',
  Lstrok: 'Ł',
  Lt: '≪',
  Map: '⤅',
  Mcy: 'М',
  MediumSpace: ' ',
  Mellintrf: 'ℳ',
  Mfr: '𝔐',
  MinusPlus: '∓',
  Mopf: '𝕄',
  Mscr: 'ℳ',
  Mu: 'Μ',
  NJcy: 'Њ',
  Nacute: 'Ń',
  Ncaron: 'Ň',
  Ncedil: 'Ņ',
  Ncy: 'Н',
  NegativeMediumSpace: '​',
  NegativeThickSpace: '​',
  NegativeThinSpace: '​',
  NegativeVeryThinSpace: '​',
  NestedGreaterGreater: '≫',
  NestedLessLess: '≪',
  NewLine: '\n',
  Nfr: '𝔑',
  NoBreak: '⁠',
  NonBreakingSpace: ' ',
  Nopf: 'ℕ',
  Not: '⫬',
  NotCongruent: '≢',
  NotCupCap: '≭',
  NotDoubleVerticalBar: '∦',
  NotElement: '∉',
  NotEqual: '≠',
  NotEqualTilde: '≂̸',
  NotExists: '∄',
  NotGreater: '≯',
  NotGreaterEqual: '≱',
  NotGreaterFullEqual: '≧̸',
  NotGreaterGreater: '≫̸',
  NotGreaterLess: '≹',
  NotGreaterSlantEqual: '⩾̸',
  NotGreaterTilde: '≵',
  NotHumpDownHump: '≎̸',
  NotHumpEqual: '≏̸',
  NotLeftTriangle: '⋪',
  NotLeftTriangleBar: '⧏̸',
  NotLeftTriangleEqual: '⋬',
  NotLess: '≮',
  NotLessEqual: '≰',
  NotLessGreater: '≸',
  NotLessLess: '≪̸',
  NotLessSlantEqual: '⩽̸',
  NotLessTilde: '≴',
  NotNestedGreaterGreater: '⪢̸',
  NotNestedLessLess: '⪡̸',
  NotPrecedes: '⊀',
  NotPrecedesEqual: '⪯̸',
  NotPrecedesSlantEqual: '⋠',
  NotReverseElement: '∌',
  NotRightTriangle: '⋫',
  NotRightTriangleBar: '⧐̸',
  NotRightTriangleEqual: '⋭',
  NotSquareSubset: '⊏̸',
  NotSquareSubsetEqual: '⋢',
  NotSquareSuperset: '⊐̸',
  NotSquareSupersetEqual: '⋣',
  NotSubset: '⊂⃒',
  NotSubsetEqual: '⊈',
  NotSucceeds: '⊁',
  NotSucceedsEqual: '⪰̸',
  NotSucceedsSlantEqual: '⋡',
  NotSucceedsTilde: '≿̸',
  NotSuperset: '⊃⃒',
  NotSupersetEqual: '⊉',
  NotTilde: '≁',
  NotTildeEqual: '≄',
  NotTildeFullEqual: '≇',
  NotTildeTilde: '≉',
  NotVerticalBar: '∤',
  Nscr: '𝒩',
  Ntilde: 'Ñ',
  Nu: 'Ν',
  OElig: 'Œ',
  Oacute: 'Ó',
  Ocirc: 'Ô',
  Ocy: 'О',
  Odblac: 'Ő',
  Ofr: '𝔒',
  Ograve: 'Ò',
  Omacr: 'Ō',
  Omega: 'Ω',
  Omicron: 'Ο',
  Oopf: '𝕆',
  OpenCurlyDoubleQuote: '“',
  OpenCurlyQuote: '‘',
  Or: '⩔',
  Oscr: '𝒪',
  Oslash: 'Ø',
  Otilde: 'Õ',
  Otimes: '⨷',
  Ouml: 'Ö',
  OverBar: '‾',
  OverBrace: '⏞',
  OverBracket: '⎴',
  OverParenthesis: '⏜',
  PartialD: '∂',
  Pcy: 'П',
  Pfr: '𝔓',
  Phi: 'Φ',
  Pi: 'Π',
  PlusMinus: '±',
  Poincareplane: 'ℌ',
  Popf: 'ℙ',
  Pr: '⪻',
  Precedes: '≺',
  PrecedesEqual: '⪯',
  PrecedesSlantEqual: '≼',
  PrecedesTilde: '≾',
  Prime: '″',
  Product: '∏',
  Proportion: '∷',
  Proportional: '∝',
  Pscr: '𝒫',
  Psi: 'Ψ',
  QUOT: '"',
  Qfr: '𝔔',
  Qopf: 'ℚ',
  Qscr: '𝒬',
  RBarr: '⤐',
  REG: '®',
  Racute: 'Ŕ',
  Rang: '⟫',
  Rarr: '↠',
  Rarrtl: '⤖',
  Rcaron: 'Ř',
  Rcedil: 'Ŗ',
  Rcy: 'Р',
  Re: 'ℜ',
  ReverseElement: '∋',
  ReverseEquilibrium: '⇋',
  ReverseUpEquilibrium: '⥯',
  Rfr: 'ℜ',
  Rho: 'Ρ',
  RightAngleBracket: '⟩',
  RightArrow: '→',
  RightArrowBar: '⇥',
  RightArrowLeftArrow: '⇄',
  RightCeiling: '⌉',
  RightDoubleBracket: '⟧',
  RightDownTeeVector: '⥝',
  RightDownVector: '⇂',
  RightDownVectorBar: '⥕',
  RightFloor: '⌋',
  RightTee: '⊢',
  RightTeeArrow: '↦',
  RightTeeVector: '⥛',
  RightTriangle: '⊳',
  RightTriangleBar: '⧐',
  RightTriangleEqual: '⊵',
  RightUpDownVector: '⥏',
  RightUpTeeVector: '⥜',
  RightUpVector: '↾',
  RightUpVectorBar: '⥔',
  RightVector: '⇀',
  RightVectorBar: '⥓',
  Rightarrow: '⇒',
  Ropf: 'ℝ',
  RoundImplies: '⥰',
  Rrightarrow: '⇛',
  Rscr: 'ℛ',
  Rsh: '↱',
  RuleDelayed: '⧴',
  SHCHcy: 'Щ',
  SHcy: 'Ш',
  SOFTcy: 'Ь',
  Sacute: 'Ś',
  Sc: '⪼',
  Scaron: 'Š',
  Scedil: 'Ş',
  Scirc: 'Ŝ',
  Scy: 'С',
  Sfr: '𝔖',
  ShortDownArrow: '↓',
  ShortLeftArrow: '←',
  ShortRightArrow: '→',
  ShortUpArrow: '↑',
  Sigma: 'Σ',
  SmallCircle: '∘',
  Sopf: '𝕊',
  Sqrt: '√',
  Square: '□',
  SquareIntersection: '⊓',
  SquareSubset: '⊏',
  SquareSubsetEqual: '⊑',
  SquareSuperset: '⊐',
  SquareSupersetEqual: '⊒',
  SquareUnion: '⊔',
  Sscr: '𝒮',
  Star: '⋆',
  Sub: '⋐',
  Subset: '⋐',
  SubsetEqual: '⊆',
  Succeeds: '≻',
  SucceedsEqual: '⪰',
  SucceedsSlantEqual: '≽',
  SucceedsTilde: '≿',
  SuchThat: '∋',
  Sum: '∑',
  Sup: '⋑',
  Superset: '⊃',
  SupersetEqual: '⊇',
  Supset: '⋑',
  THORN: 'Þ',
  TRADE: '™',
  TSHcy: 'Ћ',
  TScy: 'Ц',
  Tab: '\t',
  Tau: 'Τ',
  Tcaron: 'Ť',
  Tcedil: 'Ţ',
  Tcy: 'Т',
  Tfr: '𝔗',
  Therefore: '∴',
  Theta: 'Θ',
  ThickSpace: '  ',
  ThinSpace: ' ',
  Tilde: '∼',
  TildeEqual: '≃',
  TildeFullEqual: '≅',
  TildeTilde: '≈',
  Topf: '𝕋',
  TripleDot: '⃛',
  Tscr: '𝒯',
  Tstrok: 'Ŧ',
  Uacute: 'Ú',
  Uarr: '↟',
  Uarrocir: '⥉',
  Ubrcy: 'Ў',
  Ubreve: 'Ŭ',
  Ucirc: 'Û',
  Ucy: 'У',
  Udblac: 'Ű',
  Ufr: '𝔘',
  Ugrave: 'Ù',
  Umacr: 'Ū',
  UnderBar: '_',
  UnderBrace: '⏟',
  UnderBracket: '⎵',
  UnderParenthesis: '⏝',
  Union: '⋃',
  UnionPlus: '⊎',
  Uogon: 'Ų',
  Uopf: '𝕌',
  UpArrow: '↑',
  UpArrowBar: '⤒',
  UpArrowDownArrow: '⇅',
  UpDownArrow: '↕',
  UpEquilibrium: '⥮',
  UpTee: '⊥',
  UpTeeArrow: '↥',
  Uparrow: '⇑',
  Updownarrow: '⇕',
  UpperLeftArrow: '↖',
  UpperRightArrow: '↗',
  Upsi: 'ϒ',
  Upsilon: 'Υ',
  Uring: 'Ů',
  Uscr: '𝒰',
  Utilde: 'Ũ',
  Uuml: 'Ü',
  VDash: '⊫',
  Vbar: '⫫',
  Vcy: 'В',
  Vdash: '⊩',
  Vdashl: '⫦',
  Vee: '⋁',
  Verbar: '‖',
  Vert: '‖',
  VerticalBar: '∣',
  VerticalLine: '|',
  VerticalSeparator: '❘',
  VerticalTilde: '≀',
  VeryThinSpace: ' ',
  Vfr: '𝔙',
  Vopf: '𝕍',
  Vscr: '𝒱',
  Vvdash: '⊪',
  Wcirc: 'Ŵ',
  Wedge: '⋀',
  Wfr: '𝔚',
  Wopf: '𝕎',
  Wscr: '𝒲',
  Xfr: '𝔛',
  Xi: 'Ξ',
  Xopf: '𝕏',
  Xscr: '𝒳',
  YAcy: 'Я',
  YIcy: 'Ї',
  YUcy: 'Ю',
  Yacute: 'Ý',
  Ycirc: 'Ŷ',
  Ycy: 'Ы',
  Yfr: '𝔜',
  Yopf: '𝕐',
  Yscr: '𝒴',
  Yuml: 'Ÿ',
  ZHcy: 'Ж',
  Zacute: 'Ź',
  Zcaron: 'Ž',
  Zcy: 'З',
  Zdot: 'Ż',
  ZeroWidthSpace: '​',
  Zeta: 'Ζ',
  Zfr: 'ℨ',
  Zopf: 'ℤ',
  Zscr: '𝒵',
  aacute: 'á',
  abreve: 'ă',
  ac: '∾',
  acE: '∾̳',
  acd: '∿',
  acirc: 'â',
  acute: '´',
  acy: 'а',
  aelig: 'æ',
  af: '⁡',
  afr: '𝔞',
  agrave: 'à',
  alefsym: 'ℵ',
  aleph: 'ℵ',
  alpha: 'α',
  amacr: 'ā',
  amalg: '⨿',
  amp: '&',
  and: '∧',
  andand: '⩕',
  andd: '⩜',
  andslope: '⩘',
  andv: '⩚',
  ang: '∠',
  ange: '⦤',
  angle: '∠',
  angmsd: '∡',
  angmsdaa: '⦨',
  angmsdab: '⦩',
  angmsdac: '⦪',
  angmsdad: '⦫',
  angmsdae: '⦬',
  angmsdaf: '⦭',
  angmsdag: '⦮',
  angmsdah: '⦯',
  angrt: '∟',
  angrtvb: '⊾',
  angrtvbd: '⦝',
  angsph: '∢',
  angst: 'Å',
  angzarr: '⍼',
  aogon: 'ą',
  aopf: '𝕒',
  ap: '≈',
  apE: '⩰',
  apacir: '⩯',
  ape: '≊',
  apid: '≋',
  apos: "'",
  approx: '≈',
  approxeq: '≊',
  aring: 'å',
  ascr: '𝒶',
  ast: '*',
  asymp: '≈',
  asympeq: '≍',
  atilde: 'ã',
  auml: 'ä',
  awconint: '∳',
  awint: '⨑',
  bNot: '⫭',
  backcong: '≌',
  backepsilon: '϶',
  backprime: '‵',
  backsim: '∽',
  backsimeq: '⋍',
  barvee: '⊽',
  barwed: '⌅',
  barwedge: '⌅',
  bbrk: '⎵',
  bbrktbrk: '⎶',
  bcong: '≌',
  bcy: 'б',
  bdquo: '„',
  becaus: '∵',
  because: '∵',
  bemptyv: '⦰',
  bepsi: '϶',
  bernou: 'ℬ',
  beta: 'β',
  beth: 'ℶ',
  between: '≬',
  bfr: '𝔟',
  bigcap: '⋂',
  bigcirc: '◯',
  bigcup: '⋃',
  bigodot: '⨀',
  bigoplus: '⨁',
  bigotimes: '⨂',
  bigsqcup: '⨆',
  bigstar: '★',
  bigtriangledown: '▽',
  bigtriangleup: '△',
  biguplus: '⨄',
  bigvee: '⋁',
  bigwedge: '⋀',
  bkarow: '⤍',
  blacklozenge: '⧫',
  blacksquare: '▪',
  blacktriangle: '▴',
  blacktriangledown: '▾',
  blacktriangleleft: '◂',
  blacktriangleright: '▸',
  blank: '␣',
  blk12: '▒',
  blk14: '░',
  blk34: '▓',
  block: '█',
  bne: '=⃥',
  bnequiv: '≡⃥',
  bnot: '⌐',
  bopf: '𝕓',
  bot: '⊥',
  bottom: '⊥',
  bowtie: '⋈',
  boxDL: '╗',
  boxDR: '╔',
  boxDl: '╖',
  boxDr: '╓',
  boxH: '═',
  boxHD: '╦',
  boxHU: '╩',
  boxHd: '╤',
  boxHu: '╧',
  boxUL: '╝',
  boxUR: '╚',
  boxUl: '╜',
  boxUr: '╙',
  boxV: '║',
  boxVH: '╬',
  boxVL: '╣',
  boxVR: '╠',
  boxVh: '╫',
  boxVl: '╢',
  boxVr: '╟',
  boxbox: '⧉',
  boxdL: '╕',
  boxdR: '╒',
  boxdl: '┐',
  boxdr: '┌',
  boxh: '─',
  boxhD: '╥',
  boxhU: '╨',
  boxhd: '┬',
  boxhu: '┴',
  boxminus: '⊟',
  boxplus: '⊞',
  boxtimes: '⊠',
  boxuL: '╛',
  boxuR: '╘',
  boxul: '┘',
  boxur: '└',
  boxv: '│',
  boxvH: '╪',
  boxvL: '╡',
  boxvR: '╞',
  boxvh: '┼',
  boxvl: '┤',
  boxvr: '├',
  bprime: '‵',
  breve: '˘',
  brvbar: '¦',
  bscr: '𝒷',
  bsemi: '⁏',
  bsim: '∽',
  bsime: '⋍',
  bsol: '\\',
  bsolb: '⧅',
  bsolhsub: '⟈',
  bull: '•',
  bullet: '•',
  bump: '≎',
  bumpE: '⪮',
  bumpe: '≏',
  bumpeq: '≏',
  cacute: 'ć',
  cap: '∩',
  capand: '⩄',
  capbrcup: '⩉',
  capcap: '⩋',
  capcup: '⩇',
  capdot: '⩀',
  caps: '∩︀',
  caret: '⁁',
  caron: 'ˇ',
  ccaps: '⩍',
  ccaron: 'č',
  ccedil: 'ç',
  ccirc: 'ĉ',
  ccups: '⩌',
  ccupssm: '⩐',
  cdot: 'ċ',
  cedil: '¸',
  cemptyv: '⦲',
  cent: '¢',
  centerdot: '·',
  cfr: '𝔠',
  chcy: 'ч',
  check: '✓',
  checkmark: '✓',
  chi: 'χ',
  cir: '○',
  cirE: '⧃',
  circ: 'ˆ',
  circeq: '≗',
  circlearrowleft: '↺',
  circlearrowright: '↻',
  circledR: '®',
  circledS: 'Ⓢ',
  circledast: '⊛',
  circledcirc: '⊚',
  circleddash: '⊝',
  cire: '≗',
  cirfnint: '⨐',
  cirmid: '⫯',
  cirscir: '⧂',
  clubs: '♣',
  clubsuit: '♣',
  colon: ':',
  colone: '≔',
  coloneq: '≔',
  comma: ',',
  commat: '@',
  comp: '∁',
  compfn: '∘',
  complement: '∁',
  complexes: 'ℂ',
  cong: '≅',
  congdot: '⩭',
  conint: '∮',
  copf: '𝕔',
  coprod: '∐',
  copy: '©',
  copysr: '℗',
  crarr: '↵',
  cross: '✗',
  cscr: '𝒸',
  csub: '⫏',
  csube: '⫑',
  csup: '⫐',
  csupe: '⫒',
  ctdot: '⋯',
  cudarrl: '⤸',
  cudarrr: '⤵',
  cuepr: '⋞',
  cuesc: '⋟',
  cularr: '↶',
  cularrp: '⤽',
  cup: '∪',
  cupbrcap: '⩈',
  cupcap: '⩆',
  cupcup: '⩊',
  cupdot: '⊍',
  cupor: '⩅',
  cups: '∪︀',
  curarr: '↷',
  curarrm: '⤼',
  curlyeqprec: '⋞',
  curlyeqsucc: '⋟',
  curlyvee: '⋎',
  curlywedge: '⋏',
  curren: '¤',
  curvearrowleft: '↶',
  curvearrowright: '↷',
  cuvee: '⋎',
  cuwed: '⋏',
  cwconint: '∲',
  cwint: '∱',
  cylcty: '⌭',
  dArr: '⇓',
  dHar: '⥥',
  dagger: '†',
  daleth: 'ℸ',
  darr: '↓',
  dash: '‐',
  dashv: '⊣',
  dbkarow: '⤏',
  dblac: '˝',
  dcaron: 'ď',
  dcy: 'д',
  dd: 'ⅆ',
  ddagger: '‡',
  ddarr: '⇊',
  ddotseq: '⩷',
  deg: '°',
  delta: 'δ',
  demptyv: '⦱',
  dfisht: '⥿',
  dfr: '𝔡',
  dharl: '⇃',
  dharr: '⇂',
  diam: '⋄',
  diamond: '⋄',
  diamondsuit: '♦',
  diams: '♦',
  die: '¨',
  digamma: 'ϝ',
  disin: '⋲',
  div: '÷',
  divide: '÷',
  divideontimes: '⋇',
  divonx: '⋇',
  djcy: 'ђ',
  dlcorn: '⌞',
  dlcrop: '⌍',
  dollar: '$',
  dopf: '𝕕',
  dot: '˙',
  doteq: '≐',
  doteqdot: '≑',
  dotminus: '∸',
  dotplus: '∔',
  dotsquare: '⊡',
  doublebarwedge: '⌆',
  downarrow: '↓',
  downdownarrows: '⇊',
  downharpoonleft: '⇃',
  downharpoonright: '⇂',
  drbkarow: '⤐',
  drcorn: '⌟',
  drcrop: '⌌',
  dscr: '𝒹',
  dscy: 'ѕ',
  dsol: '⧶',
  dstrok: 'đ',
  dtdot: '⋱',
  dtri: '▿',
  dtrif: '▾',
  duarr: '⇵',
  duhar: '⥯',
  dwangle: '⦦',
  dzcy: 'џ',
  dzigrarr: '⟿',
  eDDot: '⩷',
  eDot: '≑',
  eacute: 'é',
  easter: '⩮',
  ecaron: 'ě',
  ecir: '≖',
  ecirc: 'ê',
  ecolon: '≕',
  ecy: 'э',
  edot: 'ė',
  ee: 'ⅇ',
  efDot: '≒',
  efr: '𝔢',
  eg: '⪚',
  egrave: 'è',
  egs: '⪖',
  egsdot: '⪘',
  el: '⪙',
  elinters: '⏧',
  ell: 'ℓ',
  els: '⪕',
  elsdot: '⪗',
  emacr: 'ē',
  empty: '∅',
  emptyset: '∅',
  emptyv: '∅',
  emsp13: ' ',
  emsp14: ' ',
  emsp: ' ',
  eng: 'ŋ',
  ensp: ' ',
  eogon: 'ę',
  eopf: '𝕖',
  epar: '⋕',
  eparsl: '⧣',
  eplus: '⩱',
  epsi: 'ε',
  epsilon: 'ε',
  epsiv: 'ϵ',
  eqcirc: '≖',
  eqcolon: '≕',
  eqsim: '≂',
  eqslantgtr: '⪖',
  eqslantless: '⪕',
  equals: '=',
  equest: '≟',
  equiv: '≡',
  equivDD: '⩸',
  eqvparsl: '⧥',
  erDot: '≓',
  erarr: '⥱',
  escr: 'ℯ',
  esdot: '≐',
  esim: '≂',
  eta: 'η',
  eth: 'ð',
  euml: 'ë',
  euro: '€',
  excl: '!',
  exist: '∃',
  expectation: 'ℰ',
  exponentiale: 'ⅇ',
  fallingdotseq: '≒',
  fcy: 'ф',
  female: '♀',
  ffilig: 'ﬃ',
  fflig: 'ﬀ',
  ffllig: 'ﬄ',
  ffr: '𝔣',
  filig: 'ﬁ',
  fjlig: 'fj',
  flat: '♭',
  fllig: 'ﬂ',
  fltns: '▱',
  fnof: 'ƒ',
  fopf: '𝕗',
  forall: '∀',
  fork: '⋔',
  forkv: '⫙',
  fpartint: '⨍',
  frac12: '½',
  frac13: '⅓',
  frac14: '¼',
  frac15: '⅕',
  frac16: '⅙',
  frac18: '⅛',
  frac23: '⅔',
  frac25: '⅖',
  frac34: '¾',
  frac35: '⅗',
  frac38: '⅜',
  frac45: '⅘',
  frac56: '⅚',
  frac58: '⅝',
  frac78: '⅞',
  frasl: '⁄',
  frown: '⌢',
  fscr: '𝒻',
  gE: '≧',
  gEl: '⪌',
  gacute: 'ǵ',
  gamma: 'γ',
  gammad: 'ϝ',
  gap: '⪆',
  gbreve: 'ğ',
  gcirc: 'ĝ',
  gcy: 'г',
  gdot: 'ġ',
  ge: '≥',
  gel: '⋛',
  geq: '≥',
  geqq: '≧',
  geqslant: '⩾',
  ges: '⩾',
  gescc: '⪩',
  gesdot: '⪀',
  gesdoto: '⪂',
  gesdotol: '⪄',
  gesl: '⋛︀',
  gesles: '⪔',
  gfr: '𝔤',
  gg: '≫',
  ggg: '⋙',
  gimel: 'ℷ',
  gjcy: 'ѓ',
  gl: '≷',
  glE: '⪒',
  gla: '⪥',
  glj: '⪤',
  gnE: '≩',
  gnap: '⪊',
  gnapprox: '⪊',
  gne: '⪈',
  gneq: '⪈',
  gneqq: '≩',
  gnsim: '⋧',
  gopf: '𝕘',
  grave: '`',
  gscr: 'ℊ',
  gsim: '≳',
  gsime: '⪎',
  gsiml: '⪐',
  gt: '>',
  gtcc: '⪧',
  gtcir: '⩺',
  gtdot: '⋗',
  gtlPar: '⦕',
  gtquest: '⩼',
  gtrapprox: '⪆',
  gtrarr: '⥸',
  gtrdot: '⋗',
  gtreqless: '⋛',
  gtreqqless: '⪌',
  gtrless: '≷',
  gtrsim: '≳',
  gvertneqq: '≩︀',
  gvnE: '≩︀',
  hArr: '⇔',
  hairsp: ' ',
  half: '½',
  hamilt: 'ℋ',
  hardcy: 'ъ',
  harr: '↔',
  harrcir: '⥈',
  harrw: '↭',
  hbar: 'ℏ',
  hcirc: 'ĥ',
  hearts: '♥',
  heartsuit: '♥',
  hellip: '…',
  hercon: '⊹',
  hfr: '𝔥',
  hksearow: '⤥',
  hkswarow: '⤦',
  hoarr: '⇿',
  homtht: '∻',
  hookleftarrow: '↩',
  hookrightarrow: '↪',
  hopf: '𝕙',
  horbar: '―',
  hscr: '𝒽',
  hslash: 'ℏ',
  hstrok: 'ħ',
  hybull: '⁃',
  hyphen: '‐',
  iacute: 'í',
  ic: '⁣',
  icirc: 'î',
  icy: 'и',
  iecy: 'е',
  iexcl: '¡',
  iff: '⇔',
  ifr: '𝔦',
  igrave: 'ì',
  ii: 'ⅈ',
  iiiint: '⨌',
  iiint: '∭',
  iinfin: '⧜',
  iiota: '℩',
  ijlig: 'ĳ',
  imacr: 'ī',
  image: 'ℑ',
  imagline: 'ℐ',
  imagpart: 'ℑ',
  imath: 'ı',
  imof: '⊷',
  imped: 'Ƶ',
  in: '∈',
  incare: '℅',
  infin: '∞',
  infintie: '⧝',
  inodot: 'ı',
  int: '∫',
  intcal: '⊺',
  integers: 'ℤ',
  intercal: '⊺',
  intlarhk: '⨗',
  intprod: '⨼',
  iocy: 'ё',
  iogon: 'į',
  iopf: '𝕚',
  iota: 'ι',
  iprod: '⨼',
  iquest: '¿',
  iscr: '𝒾',
  isin: '∈',
  isinE: '⋹',
  isindot: '⋵',
  isins: '⋴',
  isinsv: '⋳',
  isinv: '∈',
  it: '⁢',
  itilde: 'ĩ',
  iukcy: 'і',
  iuml: 'ï',
  jcirc: 'ĵ',
  jcy: 'й',
  jfr: '𝔧',
  jmath: 'ȷ',
  jopf: '𝕛',
  jscr: '𝒿',
  jsercy: 'ј',
  jukcy: 'є',
  kappa: 'κ',
  kappav: 'ϰ',
  kcedil: 'ķ',
  kcy: 'к',
  kfr: '𝔨',
  kgreen: 'ĸ',
  khcy: 'х',
  kjcy: 'ќ',
  kopf: '𝕜',
  kscr: '𝓀',
  lAarr: '⇚',
  lArr: '⇐',
  lAtail: '⤛',
  lBarr: '⤎',
  lE: '≦',
  lEg: '⪋',
  lHar: '⥢',
  lacute: 'ĺ',
  laemptyv: '⦴',
  lagran: 'ℒ',
  lambda: 'λ',
  lang: '⟨',
  langd: '⦑',
  langle: '⟨',
  lap: '⪅',
  laquo: '«',
  larr: '←',
  larrb: '⇤',
  larrbfs: '⤟',
  larrfs: '⤝',
  larrhk: '↩',
  larrlp: '↫',
  larrpl: '⤹',
  larrsim: '⥳',
  larrtl: '↢',
  lat: '⪫',
  latail: '⤙',
  late: '⪭',
  lates: '⪭︀',
  lbarr: '⤌',
  lbbrk: '❲',
  lbrace: '{',
  lbrack: '[',
  lbrke: '⦋',
  lbrksld: '⦏',
  lbrkslu: '⦍',
  lcaron: 'ľ',
  lcedil: 'ļ',
  lceil: '⌈',
  lcub: '{',
  lcy: 'л',
  ldca: '⤶',
  ldquo: '“',
  ldquor: '„',
  ldrdhar: '⥧',
  ldrushar: '⥋',
  ldsh: '↲',
  le: '≤',
  leftarrow: '←',
  leftarrowtail: '↢',
  leftharpoondown: '↽',
  leftharpoonup: '↼',
  leftleftarrows: '⇇',
  leftrightarrow: '↔',
  leftrightarrows: '⇆',
  leftrightharpoons: '⇋',
  leftrightsquigarrow: '↭',
  leftthreetimes: '⋋',
  leg: '⋚',
  leq: '≤',
  leqq: '≦',
  leqslant: '⩽',
  les: '⩽',
  lescc: '⪨',
  lesdot: '⩿',
  lesdoto: '⪁',
  lesdotor: '⪃',
  lesg: '⋚︀',
  lesges: '⪓',
  lessapprox: '⪅',
  lessdot: '⋖',
  lesseqgtr: '⋚',
  lesseqqgtr: '⪋',
  lessgtr: '≶',
  lesssim: '≲',
  lfisht: '⥼',
  lfloor: '⌊',
  lfr: '𝔩',
  lg: '≶',
  lgE: '⪑',
  lhard: '↽',
  lharu: '↼',
  lharul: '⥪',
  lhblk: '▄',
  ljcy: 'љ',
  ll: '≪',
  llarr: '⇇',
  llcorner: '⌞',
  llhard: '⥫',
  lltri: '◺',
  lmidot: 'ŀ',
  lmoust: '⎰',
  lmoustache: '⎰',
  lnE: '≨',
  lnap: '⪉',
  lnapprox: '⪉',
  lne: '⪇',
  lneq: '⪇',
  lneqq: '≨',
  lnsim: '⋦',
  loang: '⟬',
  loarr: '⇽',
  lobrk: '⟦',
  longleftarrow: '⟵',
  longleftrightarrow: '⟷',
  longmapsto: '⟼',
  longrightarrow: '⟶',
  looparrowleft: '↫',
  looparrowright: '↬',
  lopar: '⦅',
  lopf: '𝕝',
  loplus: '⨭',
  lotimes: '⨴',
  lowast: '∗',
  lowbar: '_',
  loz: '◊',
  lozenge: '◊',
  lozf: '⧫',
  lpar: '(',
  lparlt: '⦓',
  lrarr: '⇆',
  lrcorner: '⌟',
  lrhar: '⇋',
  lrhard: '⥭',
  lrm: '‎',
  lrtri: '⊿',
  lsaquo: '‹',
  lscr: '𝓁',
  lsh: '↰',
  lsim: '≲',
  lsime: '⪍',
  lsimg: '⪏',
  lsqb: '[',
  lsquo: '‘',
  lsquor: '‚',
  lstrok: 'ł',
  lt: '<',
  ltcc: '⪦',
  ltcir: '⩹',
  ltdot: '⋖',
  lthree: '⋋',
  ltimes: '⋉',
  ltlarr: '⥶',
  ltquest: '⩻',
  ltrPar: '⦖',
  ltri: '◃',
  ltrie: '⊴',
  ltrif: '◂',
  lurdshar: '⥊',
  luruhar: '⥦',
  lvertneqq: '≨︀',
  lvnE: '≨︀',
  mDDot: '∺',
  macr: '¯',
  male: '♂',
  malt: '✠',
  maltese: '✠',
  map: '↦',
  mapsto: '↦',
  mapstodown: '↧',
  mapstoleft: '↤',
  mapstoup: '↥',
  marker: '▮',
  mcomma: '⨩',
  mcy: 'м',
  mdash: '—',
  measuredangle: '∡',
  mfr: '𝔪',
  mho: '℧',
  micro: 'µ',
  mid: '∣',
  midast: '*',
  midcir: '⫰',
  middot: '·',
  minus: '−',
  minusb: '⊟',
  minusd: '∸',
  minusdu: '⨪',
  mlcp: '⫛',
  mldr: '…',
  mnplus: '∓',
  models: '⊧',
  mopf: '𝕞',
  mp: '∓',
  mscr: '𝓂',
  mstpos: '∾',
  mu: 'μ',
  multimap: '⊸',
  mumap: '⊸',
  nGg: '⋙̸',
  nGt: '≫⃒',
  nGtv: '≫̸',
  nLeftarrow: '⇍',
  nLeftrightarrow: '⇎',
  nLl: '⋘̸',
  nLt: '≪⃒',
  nLtv: '≪̸',
  nRightarrow: '⇏',
  nVDash: '⊯',
  nVdash: '⊮',
  nabla: '∇',
  nacute: 'ń',
  nang: '∠⃒',
  nap: '≉',
  napE: '⩰̸',
  napid: '≋̸',
  napos: 'ŉ',
  napprox: '≉',
  natur: '♮',
  natural: '♮',
  naturals: 'ℕ',
  nbsp: ' ',
  nbump: '≎̸',
  nbumpe: '≏̸',
  ncap: '⩃',
  ncaron: 'ň',
  ncedil: 'ņ',
  ncong: '≇',
  ncongdot: '⩭̸',
  ncup: '⩂',
  ncy: 'н',
  ndash: '–',
  ne: '≠',
  neArr: '⇗',
  nearhk: '⤤',
  nearr: '↗',
  nearrow: '↗',
  nedot: '≐̸',
  nequiv: '≢',
  nesear: '⤨',
  nesim: '≂̸',
  nexist: '∄',
  nexists: '∄',
  nfr: '𝔫',
  ngE: '≧̸',
  nge: '≱',
  ngeq: '≱',
  ngeqq: '≧̸',
  ngeqslant: '⩾̸',
  nges: '⩾̸',
  ngsim: '≵',
  ngt: '≯',
  ngtr: '≯',
  nhArr: '⇎',
  nharr: '↮',
  nhpar: '⫲',
  ni: '∋',
  nis: '⋼',
  nisd: '⋺',
  niv: '∋',
  njcy: 'њ',
  nlArr: '⇍',
  nlE: '≦̸',
  nlarr: '↚',
  nldr: '‥',
  nle: '≰',
  nleftarrow: '↚',
  nleftrightarrow: '↮',
  nleq: '≰',
  nleqq: '≦̸',
  nleqslant: '⩽̸',
  nles: '⩽̸',
  nless: '≮',
  nlsim: '≴',
  nlt: '≮',
  nltri: '⋪',
  nltrie: '⋬',
  nmid: '∤',
  nopf: '𝕟',
  not: '¬',
  notin: '∉',
  notinE: '⋹̸',
  notindot: '⋵̸',
  notinva: '∉',
  notinvb: '⋷',
  notinvc: '⋶',
  notni: '∌',
  notniva: '∌',
  notnivb: '⋾',
  notnivc: '⋽',
  npar: '∦',
  nparallel: '∦',
  nparsl: '⫽⃥',
  npart: '∂̸',
  npolint: '⨔',
  npr: '⊀',
  nprcue: '⋠',
  npre: '⪯̸',
  nprec: '⊀',
  npreceq: '⪯̸',
  nrArr: '⇏',
  nrarr: '↛',
  nrarrc: '⤳̸',
  nrarrw: '↝̸',
  nrightarrow: '↛',
  nrtri: '⋫',
  nrtrie: '⋭',
  nsc: '⊁',
  nsccue: '⋡',
  nsce: '⪰̸',
  nscr: '𝓃',
  nshortmid: '∤',
  nshortparallel: '∦',
  nsim: '≁',
  nsime: '≄',
  nsimeq: '≄',
  nsmid: '∤',
  nspar: '∦',
  nsqsube: '⋢',
  nsqsupe: '⋣',
  nsub: '⊄',
  nsubE: '⫅̸',
  nsube: '⊈',
  nsubset: '⊂⃒',
  nsubseteq: '⊈',
  nsubseteqq: '⫅̸',
  nsucc: '⊁',
  nsucceq: '⪰̸',
  nsup: '⊅',
  nsupE: '⫆̸',
  nsupe: '⊉',
  nsupset: '⊃⃒',
  nsupseteq: '⊉',
  nsupseteqq: '⫆̸',
  ntgl: '≹',
  ntilde: 'ñ',
  ntlg: '≸',
  ntriangleleft: '⋪',
  ntrianglelefteq: '⋬',
  ntriangleright: '⋫',
  ntrianglerighteq: '⋭',
  nu: 'ν',
  num: '#',
  numero: '№',
  numsp: ' ',
  nvDash: '⊭',
  nvHarr: '⤄',
  nvap: '≍⃒',
  nvdash: '⊬',
  nvge: '≥⃒',
  nvgt: '>⃒',
  nvinfin: '⧞',
  nvlArr: '⤂',
  nvle: '≤⃒',
  nvlt: '<⃒',
  nvltrie: '⊴⃒',
  nvrArr: '⤃',
  nvrtrie: '⊵⃒',
  nvsim: '∼⃒',
  nwArr: '⇖',
  nwarhk: '⤣',
  nwarr: '↖',
  nwarrow: '↖',
  nwnear: '⤧',
  oS: 'Ⓢ',
  oacute: 'ó',
  oast: '⊛',
  ocir: '⊚',
  ocirc: 'ô',
  ocy: 'о',
  odash: '⊝',
  odblac: 'ő',
  odiv: '⨸',
  odot: '⊙',
  odsold: '⦼',
  oelig: 'œ',
  ofcir: '⦿',
  ofr: '𝔬',
  ogon: '˛',
  ograve: 'ò',
  ogt: '⧁',
  ohbar: '⦵',
  ohm: 'Ω',
  oint: '∮',
  olarr: '↺',
  olcir: '⦾',
  olcross: '⦻',
  oline: '‾',
  olt: '⧀',
  omacr: 'ō',
  omega: 'ω',
  omicron: 'ο',
  omid: '⦶',
  ominus: '⊖',
  oopf: '𝕠',
  opar: '⦷',
  operp: '⦹',
  oplus: '⊕',
  or: '∨',
  orarr: '↻',
  ord: '⩝',
  order: 'ℴ',
  orderof: 'ℴ',
  ordf: 'ª',
  ordm: 'º',
  origof: '⊶',
  oror: '⩖',
  orslope: '⩗',
  orv: '⩛',
  oscr: 'ℴ',
  oslash: 'ø',
  osol: '⊘',
  otilde: 'õ',
  otimes: '⊗',
  otimesas: '⨶',
  ouml: 'ö',
  ovbar: '⌽',
  par: '∥',
  para: '¶',
  parallel: '∥',
  parsim: '⫳',
  parsl: '⫽',
  part: '∂',
  pcy: 'п',
  percnt: '%',
  period: '.',
  permil: '‰',
  perp: '⊥',
  pertenk: '‱',
  pfr: '𝔭',
  phi: 'φ',
  phiv: 'ϕ',
  phmmat: 'ℳ',
  phone: '☎',
  pi: 'π',
  pitchfork: '⋔',
  piv: 'ϖ',
  planck: 'ℏ',
  planckh: 'ℎ',
  plankv: 'ℏ',
  plus: '+',
  plusacir: '⨣',
  plusb: '⊞',
  pluscir: '⨢',
  plusdo: '∔',
  plusdu: '⨥',
  pluse: '⩲',
  plusmn: '±',
  plussim: '⨦',
  plustwo: '⨧',
  pm: '±',
  pointint: '⨕',
  popf: '𝕡',
  pound: '£',
  pr: '≺',
  prE: '⪳',
  prap: '⪷',
  prcue: '≼',
  pre: '⪯',
  prec: '≺',
  precapprox: '⪷',
  preccurlyeq: '≼',
  preceq: '⪯',
  precnapprox: '⪹',
  precneqq: '⪵',
  precnsim: '⋨',
  precsim: '≾',
  prime: '′',
  primes: 'ℙ',
  prnE: '⪵',
  prnap: '⪹',
  prnsim: '⋨',
  prod: '∏',
  profalar: '⌮',
  profline: '⌒',
  profsurf: '⌓',
  prop: '∝',
  propto: '∝',
  prsim: '≾',
  prurel: '⊰',
  pscr: '𝓅',
  psi: 'ψ',
  puncsp: ' ',
  qfr: '𝔮',
  qint: '⨌',
  qopf: '𝕢',
  qprime: '⁗',
  qscr: '𝓆',
  quaternions: 'ℍ',
  quatint: '⨖',
  quest: '?',
  questeq: '≟',
  quot: '"',
  rAarr: '⇛',
  rArr: '⇒',
  rAtail: '⤜',
  rBarr: '⤏',
  rHar: '⥤',
  race: '∽̱',
  racute: 'ŕ',
  radic: '√',
  raemptyv: '⦳',
  rang: '⟩',
  rangd: '⦒',
  range: '⦥',
  rangle: '⟩',
  raquo: '»',
  rarr: '→',
  rarrap: '⥵',
  rarrb: '⇥',
  rarrbfs: '⤠',
  rarrc: '⤳',
  rarrfs: '⤞',
  rarrhk: '↪',
  rarrlp: '↬',
  rarrpl: '⥅',
  rarrsim: '⥴',
  rarrtl: '↣',
  rarrw: '↝',
  ratail: '⤚',
  ratio: '∶',
  rationals: 'ℚ',
  rbarr: '⤍',
  rbbrk: '❳',
  rbrace: '}',
  rbrack: ']',
  rbrke: '⦌',
  rbrksld: '⦎',
  rbrkslu: '⦐',
  rcaron: 'ř',
  rcedil: 'ŗ',
  rceil: '⌉',
  rcub: '}',
  rcy: 'р',
  rdca: '⤷',
  rdldhar: '⥩',
  rdquo: '”',
  rdquor: '”',
  rdsh: '↳',
  real: 'ℜ',
  realine: 'ℛ',
  realpart: 'ℜ',
  reals: 'ℝ',
  rect: '▭',
  reg: '®',
  rfisht: '⥽',
  rfloor: '⌋',
  rfr: '𝔯',
  rhard: '⇁',
  rharu: '⇀',
  rharul: '⥬',
  rho: 'ρ',
  rhov: 'ϱ',
  rightarrow: '→',
  rightarrowtail: '↣',
  rightharpoondown: '⇁',
  rightharpoonup: '⇀',
  rightleftarrows: '⇄',
  rightleftharpoons: '⇌',
  rightrightarrows: '⇉',
  rightsquigarrow: '↝',
  rightthreetimes: '⋌',
  ring: '˚',
  risingdotseq: '≓',
  rlarr: '⇄',
  rlhar: '⇌',
  rlm: '‏',
  rmoust: '⎱',
  rmoustache: '⎱',
  rnmid: '⫮',
  roang: '⟭',
  roarr: '⇾',
  robrk: '⟧',
  ropar: '⦆',
  ropf: '𝕣',
  roplus: '⨮',
  rotimes: '⨵',
  rpar: ')',
  rpargt: '⦔',
  rppolint: '⨒',
  rrarr: '⇉',
  rsaquo: '›',
  rscr: '𝓇',
  rsh: '↱',
  rsqb: ']',
  rsquo: '’',
  rsquor: '’',
  rthree: '⋌',
  rtimes: '⋊',
  rtri: '▹',
  rtrie: '⊵',
  rtrif: '▸',
  rtriltri: '⧎',
  ruluhar: '⥨',
  rx: '℞',
  sacute: 'ś',
  sbquo: '‚',
  sc: '≻',
  scE: '⪴',
  scap: '⪸',
  scaron: 'š',
  sccue: '≽',
  sce: '⪰',
  scedil: 'ş',
  scirc: 'ŝ',
  scnE: '⪶',
  scnap: '⪺',
  scnsim: '⋩',
  scpolint: '⨓',
  scsim: '≿',
  scy: 'с',
  sdot: '⋅',
  sdotb: '⊡',
  sdote: '⩦',
  seArr: '⇘',
  searhk: '⤥',
  searr: '↘',
  searrow: '↘',
  sect: '§',
  semi: ';',
  seswar: '⤩',
  setminus: '∖',
  setmn: '∖',
  sext: '✶',
  sfr: '𝔰',
  sfrown: '⌢',
  sharp: '♯',
  shchcy: 'щ',
  shcy: 'ш',
  shortmid: '∣',
  shortparallel: '∥',
  shy: '­',
  sigma: 'σ',
  sigmaf: 'ς',
  sigmav: 'ς',
  sim: '∼',
  simdot: '⩪',
  sime: '≃',
  simeq: '≃',
  simg: '⪞',
  simgE: '⪠',
  siml: '⪝',
  simlE: '⪟',
  simne: '≆',
  simplus: '⨤',
  simrarr: '⥲',
  slarr: '←',
  smallsetminus: '∖',
  smashp: '⨳',
  smeparsl: '⧤',
  smid: '∣',
  smile: '⌣',
  smt: '⪪',
  smte: '⪬',
  smtes: '⪬︀',
  softcy: 'ь',
  sol: '/',
  solb: '⧄',
  solbar: '⌿',
  sopf: '𝕤',
  spades: '♠',
  spadesuit: '♠',
  spar: '∥',
  sqcap: '⊓',
  sqcaps: '⊓︀',
  sqcup: '⊔',
  sqcups: '⊔︀',
  sqsub: '⊏',
  sqsube: '⊑',
  sqsubset: '⊏',
  sqsubseteq: '⊑',
  sqsup: '⊐',
  sqsupe: '⊒',
  sqsupset: '⊐',
  sqsupseteq: '⊒',
  squ: '□',
  square: '□',
  squarf: '▪',
  squf: '▪',
  srarr: '→',
  sscr: '𝓈',
  ssetmn: '∖',
  ssmile: '⌣',
  sstarf: '⋆',
  star: '☆',
  starf: '★',
  straightepsilon: 'ϵ',
  straightphi: 'ϕ',
  strns: '¯',
  sub: '⊂',
  subE: '⫅',
  subdot: '⪽',
  sube: '⊆',
  subedot: '⫃',
  submult: '⫁',
  subnE: '⫋',
  subne: '⊊',
  subplus: '⪿',
  subrarr: '⥹',
  subset: '⊂',
  subseteq: '⊆',
  subseteqq: '⫅',
  subsetneq: '⊊',
  subsetneqq: '⫋',
  subsim: '⫇',
  subsub: '⫕',
  subsup: '⫓',
  succ: '≻',
  succapprox: '⪸',
  succcurlyeq: '≽',
  succeq: '⪰',
  succnapprox: '⪺',
  succneqq: '⪶',
  succnsim: '⋩',
  succsim: '≿',
  sum: '∑',
  sung: '♪',
  sup1: '¹',
  sup2: '²',
  sup3: '³',
  sup: '⊃',
  supE: '⫆',
  supdot: '⪾',
  supdsub: '⫘',
  supe: '⊇',
  supedot: '⫄',
  suphsol: '⟉',
  suphsub: '⫗',
  suplarr: '⥻',
  supmult: '⫂',
  supnE: '⫌',
  supne: '⊋',
  supplus: '⫀',
  supset: '⊃',
  supseteq: '⊇',
  supseteqq: '⫆',
  supsetneq: '⊋',
  supsetneqq: '⫌',
  supsim: '⫈',
  supsub: '⫔',
  supsup: '⫖',
  swArr: '⇙',
  swarhk: '⤦',
  swarr: '↙',
  swarrow: '↙',
  swnwar: '⤪',
  szlig: 'ß',
  target: '⌖',
  tau: 'τ',
  tbrk: '⎴',
  tcaron: 'ť',
  tcedil: 'ţ',
  tcy: 'т',
  tdot: '⃛',
  telrec: '⌕',
  tfr: '𝔱',
  there4: '∴',
  therefore: '∴',
  theta: 'θ',
  thetasym: 'ϑ',
  thetav: 'ϑ',
  thickapprox: '≈',
  thicksim: '∼',
  thinsp: ' ',
  thkap: '≈',
  thksim: '∼',
  thorn: 'þ',
  tilde: '˜',
  times: '×',
  timesb: '⊠',
  timesbar: '⨱',
  timesd: '⨰',
  tint: '∭',
  toea: '⤨',
  top: '⊤',
  topbot: '⌶',
  topcir: '⫱',
  topf: '𝕥',
  topfork: '⫚',
  tosa: '⤩',
  tprime: '‴',
  trade: '™',
  triangle: '▵',
  triangledown: '▿',
  triangleleft: '◃',
  trianglelefteq: '⊴',
  triangleq: '≜',
  triangleright: '▹',
  trianglerighteq: '⊵',
  tridot: '◬',
  trie: '≜',
  triminus: '⨺',
  triplus: '⨹',
  trisb: '⧍',
  tritime: '⨻',
  trpezium: '⏢',
  tscr: '𝓉',
  tscy: 'ц',
  tshcy: 'ћ',
  tstrok: 'ŧ',
  twixt: '≬',
  twoheadleftarrow: '↞',
  twoheadrightarrow: '↠',
  uArr: '⇑',
  uHar: '⥣',
  uacute: 'ú',
  uarr: '↑',
  ubrcy: 'ў',
  ubreve: 'ŭ',
  ucirc: 'û',
  ucy: 'у',
  udarr: '⇅',
  udblac: 'ű',
  udhar: '⥮',
  ufisht: '⥾',
  ufr: '𝔲',
  ugrave: 'ù',
  uharl: '↿',
  uharr: '↾',
  uhblk: '▀',
  ulcorn: '⌜',
  ulcorner: '⌜',
  ulcrop: '⌏',
  ultri: '◸',
  umacr: 'ū',
  uml: '¨',
  uogon: 'ų',
  uopf: '𝕦',
  uparrow: '↑',
  updownarrow: '↕',
  upharpoonleft: '↿',
  upharpoonright: '↾',
  uplus: '⊎',
  upsi: 'υ',
  upsih: 'ϒ',
  upsilon: 'υ',
  upuparrows: '⇈',
  urcorn: '⌝',
  urcorner: '⌝',
  urcrop: '⌎',
  uring: 'ů',
  urtri: '◹',
  uscr: '𝓊',
  utdot: '⋰',
  utilde: 'ũ',
  utri: '▵',
  utrif: '▴',
  uuarr: '⇈',
  uuml: 'ü',
  uwangle: '⦧',
  vArr: '⇕',
  vBar: '⫨',
  vBarv: '⫩',
  vDash: '⊨',
  vangrt: '⦜',
  varepsilon: 'ϵ',
  varkappa: 'ϰ',
  varnothing: '∅',
  varphi: 'ϕ',
  varpi: 'ϖ',
  varpropto: '∝',
  varr: '↕',
  varrho: 'ϱ',
  varsigma: 'ς',
  varsubsetneq: '⊊︀',
  varsubsetneqq: '⫋︀',
  varsupsetneq: '⊋︀',
  varsupsetneqq: '⫌︀',
  vartheta: 'ϑ',
  vartriangleleft: '⊲',
  vartriangleright: '⊳',
  vcy: 'в',
  vdash: '⊢',
  vee: '∨',
  veebar: '⊻',
  veeeq: '≚',
  vellip: '⋮',
  verbar: '|',
  vert: '|',
  vfr: '𝔳',
  vltri: '⊲',
  vnsub: '⊂⃒',
  vnsup: '⊃⃒',
  vopf: '𝕧',
  vprop: '∝',
  vrtri: '⊳',
  vscr: '𝓋',
  vsubnE: '⫋︀',
  vsubne: '⊊︀',
  vsupnE: '⫌︀',
  vsupne: '⊋︀',
  vzigzag: '⦚',
  wcirc: 'ŵ',
  wedbar: '⩟',
  wedge: '∧',
  wedgeq: '≙',
  weierp: '℘',
  wfr: '𝔴',
  wopf: '𝕨',
  wp: '℘',
  wr: '≀',
  wreath: '≀',
  wscr: '𝓌',
  xcap: '⋂',
  xcirc: '◯',
  xcup: '⋃',
  xdtri: '▽',
  xfr: '𝔵',
  xhArr: '⟺',
  xharr: '⟷',
  xi: 'ξ',
  xlArr: '⟸',
  xlarr: '⟵',
  xmap: '⟼',
  xnis: '⋻',
  xodot: '⨀',
  xopf: '𝕩',
  xoplus: '⨁',
  xotime: '⨂',
  xrArr: '⟹',
  xrarr: '⟶',
  xscr: '𝓍',
  xsqcup: '⨆',
  xuplus: '⨄',
  xutri: '△',
  xvee: '⋁',
  xwedge: '⋀',
  yacute: 'ý',
  yacy: 'я',
  ycirc: 'ŷ',
  ycy: 'ы',
  yen: '¥',
  yfr: '𝔶',
  yicy: 'ї',
  yopf: '𝕪',
  yscr: '𝓎',
  yucy: 'ю',
  yuml: 'ÿ',
  zacute: 'ź',
  zcaron: 'ž',
  zcy: 'з',
  zdot: 'ż',
  zeetrf: 'ℨ',
  zeta: 'ζ',
  zfr: '𝔷',
  zhcy: 'ж',
  zigrarr: '⇝',
  zopf: '𝕫',
  zscr: '𝓏',
  zwj: '‍',
  zwnj: '‌'
};

const own$6 = {}.hasOwnProperty;

/**
 * Decode a single character reference (without the `&` or `;`).
 * You probably only need this when you’re building parsers yourself that follow
 * different rules compared to HTML.
 * This is optimized to be tiny in browsers.
 *
 * @param {string} value
 *   `notin` (named), `#123` (deci), `#x123` (hexa).
 * @returns {string|false}
 *   Decoded reference.
 */
function decodeNamedCharacterReference(value) {
  return own$6.call(characterEntities, value) ? characterEntities[value] : false
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Code} Code
 */

/** @type {Construct} */
const characterReference = {
  name: 'characterReference',
  tokenize: tokenizeCharacterReference
};
/** @type {Tokenizer} */

function tokenizeCharacterReference(effects, ok, nok) {
  const self = this;
  let size = 0;
  /** @type {number} */

  let max;
  /** @type {(code: Code) => code is number} */

  let test;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('characterReference');
    effects.enter('characterReferenceMarker');
    effects.consume(code);
    effects.exit('characterReferenceMarker');
    return open
  }
  /** @type {State} */

  function open(code) {
    if (code === 35) {
      effects.enter('characterReferenceMarkerNumeric');
      effects.consume(code);
      effects.exit('characterReferenceMarkerNumeric');
      return numeric
    }

    effects.enter('characterReferenceValue');
    max = 31;
    test = asciiAlphanumeric;
    return value(code)
  }
  /** @type {State} */

  function numeric(code) {
    if (code === 88 || code === 120) {
      effects.enter('characterReferenceMarkerHexadecimal');
      effects.consume(code);
      effects.exit('characterReferenceMarkerHexadecimal');
      effects.enter('characterReferenceValue');
      max = 6;
      test = asciiHexDigit;
      return value
    }

    effects.enter('characterReferenceValue');
    max = 7;
    test = asciiDigit;
    return value(code)
  }
  /** @type {State} */

  function value(code) {
    /** @type {Token} */
    let token;

    if (code === 59 && size) {
      token = effects.exit('characterReferenceValue');

      if (
        test === asciiAlphanumeric &&
        !decodeNamedCharacterReference(self.sliceSerialize(token))
      ) {
        return nok(code)
      }

      effects.enter('characterReferenceMarker');
      effects.consume(code);
      effects.exit('characterReferenceMarker');
      effects.exit('characterReference');
      return ok
    }

    if (test(code) && size++ < max) {
      effects.consume(code);
      return value
    }

    return nok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Code} Code
 */

/** @type {Construct} */
const codeFenced = {
  name: 'codeFenced',
  tokenize: tokenizeCodeFenced,
  concrete: true
};
/** @type {Tokenizer} */

function tokenizeCodeFenced(effects, ok, nok) {
  const self = this;
  /** @type {Construct} */

  const closingFenceConstruct = {
    tokenize: tokenizeClosingFence,
    partial: true
  };
  /** @type {Construct} */

  const nonLazyLine = {
    tokenize: tokenizeNonLazyLine,
    partial: true
  };
  const tail = this.events[this.events.length - 1];
  const initialPrefix =
    tail && tail[1].type === 'linePrefix'
      ? tail[2].sliceSerialize(tail[1], true).length
      : 0;
  let sizeOpen = 0;
  /** @type {NonNullable<Code>} */

  let marker;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('codeFenced');
    effects.enter('codeFencedFence');
    effects.enter('codeFencedFenceSequence');
    marker = code;
    return sequenceOpen(code)
  }
  /** @type {State} */

  function sequenceOpen(code) {
    if (code === marker) {
      effects.consume(code);
      sizeOpen++;
      return sequenceOpen
    }

    effects.exit('codeFencedFenceSequence');
    return sizeOpen < 3
      ? nok(code)
      : factorySpace(effects, infoOpen, 'whitespace')(code)
  }
  /** @type {State} */

  function infoOpen(code) {
    if (code === null || markdownLineEnding(code)) {
      return openAfter(code)
    }

    effects.enter('codeFencedFenceInfo');
    effects.enter('chunkString', {
      contentType: 'string'
    });
    return info(code)
  }
  /** @type {State} */

  function info(code) {
    if (code === null || markdownLineEndingOrSpace(code)) {
      effects.exit('chunkString');
      effects.exit('codeFencedFenceInfo');
      return factorySpace(effects, infoAfter, 'whitespace')(code)
    }

    if (code === 96 && code === marker) return nok(code)
    effects.consume(code);
    return info
  }
  /** @type {State} */

  function infoAfter(code) {
    if (code === null || markdownLineEnding(code)) {
      return openAfter(code)
    }

    effects.enter('codeFencedFenceMeta');
    effects.enter('chunkString', {
      contentType: 'string'
    });
    return meta(code)
  }
  /** @type {State} */

  function meta(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('chunkString');
      effects.exit('codeFencedFenceMeta');
      return openAfter(code)
    }

    if (code === 96 && code === marker) return nok(code)
    effects.consume(code);
    return meta
  }
  /** @type {State} */

  function openAfter(code) {
    effects.exit('codeFencedFence');
    return self.interrupt ? ok(code) : contentStart(code)
  }
  /** @type {State} */

  function contentStart(code) {
    if (code === null) {
      return after(code)
    }

    if (markdownLineEnding(code)) {
      return effects.attempt(
        nonLazyLine,
        effects.attempt(
          closingFenceConstruct,
          after,
          initialPrefix
            ? factorySpace(
                effects,
                contentStart,
                'linePrefix',
                initialPrefix + 1
              )
            : contentStart
        ),
        after
      )(code)
    }

    effects.enter('codeFlowValue');
    return contentContinue(code)
  }
  /** @type {State} */

  function contentContinue(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('codeFlowValue');
      return contentStart(code)
    }

    effects.consume(code);
    return contentContinue
  }
  /** @type {State} */

  function after(code) {
    effects.exit('codeFenced');
    return ok(code)
  }
  /** @type {Tokenizer} */

  function tokenizeNonLazyLine(effects, ok, nok) {
    const self = this;
    return start
    /** @type {State} */

    function start(code) {
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      return lineStart
    }
    /** @type {State} */

    function lineStart(code) {
      return self.parser.lazy[self.now().line] ? nok(code) : ok(code)
    }
  }
  /** @type {Tokenizer} */

  function tokenizeClosingFence(effects, ok, nok) {
    let size = 0;
    return factorySpace(
      effects,
      closingSequenceStart,
      'linePrefix',
      this.parser.constructs.disable.null.includes('codeIndented')
        ? undefined
        : 4
    )
    /** @type {State} */

    function closingSequenceStart(code) {
      effects.enter('codeFencedFence');
      effects.enter('codeFencedFenceSequence');
      return closingSequence(code)
    }
    /** @type {State} */

    function closingSequence(code) {
      if (code === marker) {
        effects.consume(code);
        size++;
        return closingSequence
      }

      if (size < sizeOpen) return nok(code)
      effects.exit('codeFencedFenceSequence');
      return factorySpace(effects, closingSequenceEnd, 'whitespace')(code)
    }
    /** @type {State} */

    function closingSequenceEnd(code) {
      if (code === null || markdownLineEnding(code)) {
        effects.exit('codeFencedFence');
        return ok(code)
      }

      return nok(code)
    }
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').State} State
 */

/** @type {Construct} */
const codeIndented = {
  name: 'codeIndented',
  tokenize: tokenizeCodeIndented
};
/** @type {Construct} */

const indentedContent = {
  tokenize: tokenizeIndentedContent,
  partial: true
};
/** @type {Tokenizer} */

function tokenizeCodeIndented(effects, ok, nok) {
  const self = this;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('codeIndented');
    return factorySpace(effects, afterStartPrefix, 'linePrefix', 4 + 1)(code)
  }
  /** @type {State} */

  function afterStartPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return tail &&
      tail[1].type === 'linePrefix' &&
      tail[2].sliceSerialize(tail[1], true).length >= 4
      ? afterPrefix(code)
      : nok(code)
  }
  /** @type {State} */

  function afterPrefix(code) {
    if (code === null) {
      return after(code)
    }

    if (markdownLineEnding(code)) {
      return effects.attempt(indentedContent, afterPrefix, after)(code)
    }

    effects.enter('codeFlowValue');
    return content(code)
  }
  /** @type {State} */

  function content(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('codeFlowValue');
      return afterPrefix(code)
    }

    effects.consume(code);
    return content
  }
  /** @type {State} */

  function after(code) {
    effects.exit('codeIndented');
    return ok(code)
  }
}
/** @type {Tokenizer} */

function tokenizeIndentedContent(effects, ok, nok) {
  const self = this;
  return start
  /** @type {State} */

  function start(code) {
    // If this is a lazy line, it can’t be code.
    if (self.parser.lazy[self.now().line]) {
      return nok(code)
    }

    if (markdownLineEnding(code)) {
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      return start
    }

    return factorySpace(effects, afterPrefix, 'linePrefix', 4 + 1)(code)
  }
  /** @type {State} */

  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return tail &&
      tail[1].type === 'linePrefix' &&
      tail[2].sliceSerialize(tail[1], true).length >= 4
      ? ok(code)
      : markdownLineEnding(code)
      ? start(code)
      : nok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').Previous} Previous
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').State} State
 */

/** @type {Construct} */
const codeText = {
  name: 'codeText',
  tokenize: tokenizeCodeText,
  resolve: resolveCodeText,
  previous: previous$2
};
/** @type {Resolver} */

function resolveCodeText(events) {
  let tailExitIndex = events.length - 4;
  let headEnterIndex = 3;
  /** @type {number} */

  let index;
  /** @type {number|undefined} */

  let enter; // If we start and end with an EOL or a space.

  if (
    (events[headEnterIndex][1].type === 'lineEnding' ||
      events[headEnterIndex][1].type === 'space') &&
    (events[tailExitIndex][1].type === 'lineEnding' ||
      events[tailExitIndex][1].type === 'space')
  ) {
    index = headEnterIndex; // And we have data.

    while (++index < tailExitIndex) {
      if (events[index][1].type === 'codeTextData') {
        // Then we have padding.
        events[headEnterIndex][1].type = 'codeTextPadding';
        events[tailExitIndex][1].type = 'codeTextPadding';
        headEnterIndex += 2;
        tailExitIndex -= 2;
        break
      }
    }
  } // Merge adjacent spaces and data.

  index = headEnterIndex - 1;
  tailExitIndex++;

  while (++index <= tailExitIndex) {
    if (enter === undefined) {
      if (index !== tailExitIndex && events[index][1].type !== 'lineEnding') {
        enter = index;
      }
    } else if (
      index === tailExitIndex ||
      events[index][1].type === 'lineEnding'
    ) {
      events[enter][1].type = 'codeTextData';

      if (index !== enter + 2) {
        events[enter][1].end = events[index - 1][1].end;
        events.splice(enter + 2, index - enter - 2);
        tailExitIndex -= index - enter - 2;
        index = enter + 2;
      }

      enter = undefined;
    }
  }

  return events
}
/** @type {Previous} */

function previous$2(code) {
  // If there is a previous code, there will always be a tail.
  return (
    code !== 96 ||
    this.events[this.events.length - 1][1].type === 'characterEscape'
  )
}
/** @type {Tokenizer} */

function tokenizeCodeText(effects, ok, nok) {
  let sizeOpen = 0;
  /** @type {number} */

  let size;
  /** @type {Token} */

  let token;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('codeText');
    effects.enter('codeTextSequence');
    return openingSequence(code)
  }
  /** @type {State} */

  function openingSequence(code) {
    if (code === 96) {
      effects.consume(code);
      sizeOpen++;
      return openingSequence
    }

    effects.exit('codeTextSequence');
    return gap(code)
  }
  /** @type {State} */

  function gap(code) {
    // EOF.
    if (code === null) {
      return nok(code)
    } // Closing fence?
    // Could also be data.

    if (code === 96) {
      token = effects.enter('codeTextSequence');
      size = 0;
      return closingSequence(code)
    } // Tabs don’t work, and virtual spaces don’t make sense.

    if (code === 32) {
      effects.enter('space');
      effects.consume(code);
      effects.exit('space');
      return gap
    }

    if (markdownLineEnding(code)) {
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      return gap
    } // Data.

    effects.enter('codeTextData');
    return data(code)
  } // In code.

  /** @type {State} */

  function data(code) {
    if (
      code === null ||
      code === 32 ||
      code === 96 ||
      markdownLineEnding(code)
    ) {
      effects.exit('codeTextData');
      return gap(code)
    }

    effects.consume(code);
    return data
  } // Closing fence.

  /** @type {State} */

  function closingSequence(code) {
    // More.
    if (code === 96) {
      effects.consume(code);
      size++;
      return closingSequence
    } // Done!

    if (size === sizeOpen) {
      effects.exit('codeTextSequence');
      effects.exit('codeText');
      return ok(code)
    } // More or less accents: mark as data.

    token.type = 'codeTextData';
    return data(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').Chunk} Chunk
 * @typedef {import('micromark-util-types').Event} Event
 */

/**
 * Tokenize subcontent.
 *
 * @param {Event[]} events
 * @returns {boolean}
 */
function subtokenize(events) {
  /** @type {Record<string, number>} */
  const jumps = {};
  let index = -1;
  /** @type {Event} */

  let event;
  /** @type {number|undefined} */

  let lineIndex;
  /** @type {number} */

  let otherIndex;
  /** @type {Event} */

  let otherEvent;
  /** @type {Event[]} */

  let parameters;
  /** @type {Event[]} */

  let subevents;
  /** @type {boolean|undefined} */

  let more;

  while (++index < events.length) {
    while (index in jumps) {
      index = jumps[index];
    }

    event = events[index]; // Add a hook for the GFM tasklist extension, which needs to know if text
    // is in the first content of a list item.

    if (
      index &&
      event[1].type === 'chunkFlow' &&
      events[index - 1][1].type === 'listItemPrefix'
    ) {
      subevents = event[1]._tokenizer.events;
      otherIndex = 0;

      if (
        otherIndex < subevents.length &&
        subevents[otherIndex][1].type === 'lineEndingBlank'
      ) {
        otherIndex += 2;
      }

      if (
        otherIndex < subevents.length &&
        subevents[otherIndex][1].type === 'content'
      ) {
        while (++otherIndex < subevents.length) {
          if (subevents[otherIndex][1].type === 'content') {
            break
          }

          if (subevents[otherIndex][1].type === 'chunkText') {
            subevents[otherIndex][1]._isInFirstContentOfListItem = true;
            otherIndex++;
          }
        }
      }
    } // Enter.

    if (event[0] === 'enter') {
      if (event[1].contentType) {
        Object.assign(jumps, subcontent(events, index));
        index = jumps[index];
        more = true;
      }
    } // Exit.
    else if (event[1]._container) {
      otherIndex = index;
      lineIndex = undefined;

      while (otherIndex--) {
        otherEvent = events[otherIndex];

        if (
          otherEvent[1].type === 'lineEnding' ||
          otherEvent[1].type === 'lineEndingBlank'
        ) {
          if (otherEvent[0] === 'enter') {
            if (lineIndex) {
              events[lineIndex][1].type = 'lineEndingBlank';
            }

            otherEvent[1].type = 'lineEnding';
            lineIndex = otherIndex;
          }
        } else {
          break
        }
      }

      if (lineIndex) {
        // Fix position.
        event[1].end = Object.assign({}, events[lineIndex][1].start); // Switch container exit w/ line endings.

        parameters = events.slice(lineIndex, index);
        parameters.unshift(event);
        splice(events, lineIndex, index - lineIndex + 1, parameters);
      }
    }
  }

  return !more
}
/**
 * Tokenize embedded tokens.
 *
 * @param {Event[]} events
 * @param {number} eventIndex
 * @returns {Record<string, number>}
 */

function subcontent(events, eventIndex) {
  const token = events[eventIndex][1];
  const context = events[eventIndex][2];
  let startPosition = eventIndex - 1;
  /** @type {number[]} */

  const startPositions = [];
  const tokenizer =
    token._tokenizer || context.parser[token.contentType](token.start);
  const childEvents = tokenizer.events;
  /** @type {[number, number][]} */

  const jumps = [];
  /** @type {Record<string, number>} */

  const gaps = {};
  /** @type {Chunk[]} */

  let stream;
  /** @type {Token|undefined} */

  let previous;
  let index = -1;
  /** @type {Token|undefined} */

  let current = token;
  let adjust = 0;
  let start = 0;
  const breaks = [start]; // Loop forward through the linked tokens to pass them in order to the
  // subtokenizer.

  while (current) {
    // Find the position of the event for this token.
    while (events[++startPosition][1] !== current) {
      // Empty.
    }

    startPositions.push(startPosition);

    if (!current._tokenizer) {
      stream = context.sliceStream(current);

      if (!current.next) {
        stream.push(null);
      }

      if (previous) {
        tokenizer.defineSkip(current.start);
      }

      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = true;
      }

      tokenizer.write(stream);

      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = undefined;
      }
    } // Unravel the next token.

    previous = current;
    current = current.next;
  } // Now, loop back through all events (and linked tokens), to figure out which
  // parts belong where.

  current = token;

  while (++index < childEvents.length) {
    if (
      // Find a void token that includes a break.
      childEvents[index][0] === 'exit' &&
      childEvents[index - 1][0] === 'enter' &&
      childEvents[index][1].type === childEvents[index - 1][1].type &&
      childEvents[index][1].start.line !== childEvents[index][1].end.line
    ) {
      start = index + 1;
      breaks.push(start); // Help GC.

      current._tokenizer = undefined;
      current.previous = undefined;
      current = current.next;
    }
  } // Help GC.

  tokenizer.events = []; // If there’s one more token (which is the cases for lines that end in an
  // EOF), that’s perfect: the last point we found starts it.
  // If there isn’t then make sure any remaining content is added to it.

  if (current) {
    // Help GC.
    current._tokenizer = undefined;
    current.previous = undefined;
  } else {
    breaks.pop();
  } // Now splice the events from the subtokenizer into the current events,
  // moving back to front so that splice indices aren’t affected.

  index = breaks.length;

  while (index--) {
    const slice = childEvents.slice(breaks[index], breaks[index + 1]);
    const start = startPositions.pop();
    jumps.unshift([start, start + slice.length - 1]);
    splice(events, start, 2, slice);
  }

  index = -1;

  while (++index < jumps.length) {
    gaps[adjust + jumps[index][0]] = adjust + jumps[index][1];
    adjust += jumps[index][1] - jumps[index][0] - 1;
  }

  return gaps
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').State} State
 */

/**
 * No name because it must not be turned off.
 * @type {Construct}
 */
const content = {
  tokenize: tokenizeContent,
  resolve: resolveContent
};
/** @type {Construct} */

const continuationConstruct = {
  tokenize: tokenizeContinuation,
  partial: true
};
/**
 * Content is transparent: it’s parsed right now. That way, definitions are also
 * parsed right now: before text in paragraphs (specifically, media) are parsed.
 *
 * @type {Resolver}
 */

function resolveContent(events) {
  subtokenize(events);
  return events
}
/** @type {Tokenizer} */

function tokenizeContent(effects, ok) {
  /** @type {Token} */
  let previous;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('content');
    previous = effects.enter('chunkContent', {
      contentType: 'content'
    });
    return data(code)
  }
  /** @type {State} */

  function data(code) {
    if (code === null) {
      return contentEnd(code)
    }

    if (markdownLineEnding(code)) {
      return effects.check(
        continuationConstruct,
        contentContinue,
        contentEnd
      )(code)
    } // Data.

    effects.consume(code);
    return data
  }
  /** @type {State} */

  function contentEnd(code) {
    effects.exit('chunkContent');
    effects.exit('content');
    return ok(code)
  }
  /** @type {State} */

  function contentContinue(code) {
    effects.consume(code);
    effects.exit('chunkContent');
    previous.next = effects.enter('chunkContent', {
      contentType: 'content',
      previous
    });
    previous = previous.next;
    return data
  }
}
/** @type {Tokenizer} */

function tokenizeContinuation(effects, ok, nok) {
  const self = this;
  return startLookahead
  /** @type {State} */

  function startLookahead(code) {
    effects.exit('chunkContent');
    effects.enter('lineEnding');
    effects.consume(code);
    effects.exit('lineEnding');
    return factorySpace(effects, prefixed, 'linePrefix')
  }
  /** @type {State} */

  function prefixed(code) {
    if (code === null || markdownLineEnding(code)) {
      return nok(code)
    }

    const tail = self.events[self.events.length - 1];

    if (
      !self.parser.constructs.disable.null.includes('codeIndented') &&
      tail &&
      tail[1].type === 'linePrefix' &&
      tail[2].sliceSerialize(tail[1], true).length >= 4
    ) {
      return ok(code)
    }

    return effects.interrupt(self.parser.constructs.flow, nok, ok)(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Effects} Effects
 * @typedef {import('micromark-util-types').State} State
 */

/**
 * @param {Effects} effects
 * @param {State} ok
 * @param {State} nok
 * @param {string} type
 * @param {string} literalType
 * @param {string} literalMarkerType
 * @param {string} rawType
 * @param {string} stringType
 * @param {number} [max=Infinity]
 * @returns {State}
 */
// eslint-disable-next-line max-params
function factoryDestination(
  effects,
  ok,
  nok,
  type,
  literalType,
  literalMarkerType,
  rawType,
  stringType,
  max
) {
  const limit = max || Number.POSITIVE_INFINITY;
  let balance = 0;
  return start
  /** @type {State} */

  function start(code) {
    if (code === 60) {
      effects.enter(type);
      effects.enter(literalType);
      effects.enter(literalMarkerType);
      effects.consume(code);
      effects.exit(literalMarkerType);
      return destinationEnclosedBefore
    }

    if (code === null || code === 41 || asciiControl(code)) {
      return nok(code)
    }

    effects.enter(type);
    effects.enter(rawType);
    effects.enter(stringType);
    effects.enter('chunkString', {
      contentType: 'string'
    });
    return destinationRaw(code)
  }
  /** @type {State} */

  function destinationEnclosedBefore(code) {
    if (code === 62) {
      effects.enter(literalMarkerType);
      effects.consume(code);
      effects.exit(literalMarkerType);
      effects.exit(literalType);
      effects.exit(type);
      return ok
    }

    effects.enter(stringType);
    effects.enter('chunkString', {
      contentType: 'string'
    });
    return destinationEnclosed(code)
  }
  /** @type {State} */

  function destinationEnclosed(code) {
    if (code === 62) {
      effects.exit('chunkString');
      effects.exit(stringType);
      return destinationEnclosedBefore(code)
    }

    if (code === null || code === 60 || markdownLineEnding(code)) {
      return nok(code)
    }

    effects.consume(code);
    return code === 92 ? destinationEnclosedEscape : destinationEnclosed
  }
  /** @type {State} */

  function destinationEnclosedEscape(code) {
    if (code === 60 || code === 62 || code === 92) {
      effects.consume(code);
      return destinationEnclosed
    }

    return destinationEnclosed(code)
  }
  /** @type {State} */

  function destinationRaw(code) {
    if (code === 40) {
      if (++balance > limit) return nok(code)
      effects.consume(code);
      return destinationRaw
    }

    if (code === 41) {
      if (!balance--) {
        effects.exit('chunkString');
        effects.exit(stringType);
        effects.exit(rawType);
        effects.exit(type);
        return ok(code)
      }

      effects.consume(code);
      return destinationRaw
    }

    if (code === null || markdownLineEndingOrSpace(code)) {
      if (balance) return nok(code)
      effects.exit('chunkString');
      effects.exit(stringType);
      effects.exit(rawType);
      effects.exit(type);
      return ok(code)
    }

    if (asciiControl(code)) return nok(code)
    effects.consume(code);
    return code === 92 ? destinationRawEscape : destinationRaw
  }
  /** @type {State} */

  function destinationRawEscape(code) {
    if (code === 40 || code === 41 || code === 92) {
      effects.consume(code);
      return destinationRaw
    }

    return destinationRaw(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Effects} Effects
 * @typedef {import('micromark-util-types').TokenizeContext} TokenizeContext
 * @typedef {import('micromark-util-types').State} State
 */

/**
 * @this {TokenizeContext}
 * @param {Effects} effects
 * @param {State} ok
 * @param {State} nok
 * @param {string} type
 * @param {string} markerType
 * @param {string} stringType
 * @returns {State}
 */
// eslint-disable-next-line max-params
function factoryLabel(effects, ok, nok, type, markerType, stringType) {
  const self = this;
  let size = 0;
  /** @type {boolean} */

  let data;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter(type);
    effects.enter(markerType);
    effects.consume(code);
    effects.exit(markerType);
    effects.enter(stringType);
    return atBreak
  }
  /** @type {State} */

  function atBreak(code) {
    if (
      code === null ||
      code === 91 ||
      (code === 93 && !data) ||
      /* To do: remove in the future once we’ve switched from
       * `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
       * which doesn’t need this */

      /* Hidden footnotes hook */

      /* c8 ignore next 3 */
      (code === 94 &&
        !size &&
        '_hiddenFootnoteSupport' in self.parser.constructs) ||
      size > 999
    ) {
      return nok(code)
    }

    if (code === 93) {
      effects.exit(stringType);
      effects.enter(markerType);
      effects.consume(code);
      effects.exit(markerType);
      effects.exit(type);
      return ok
    }

    if (markdownLineEnding(code)) {
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      return atBreak
    }

    effects.enter('chunkString', {
      contentType: 'string'
    });
    return label(code)
  }
  /** @type {State} */

  function label(code) {
    if (
      code === null ||
      code === 91 ||
      code === 93 ||
      markdownLineEnding(code) ||
      size++ > 999
    ) {
      effects.exit('chunkString');
      return atBreak(code)
    }

    effects.consume(code);
    data = data || !markdownSpace(code);
    return code === 92 ? labelEscape : label
  }
  /** @type {State} */

  function labelEscape(code) {
    if (code === 91 || code === 92 || code === 93) {
      effects.consume(code);
      size++;
      return label
    }

    return label(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Effects} Effects
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Code} Code
 */

/**
 * @param {Effects} effects
 * @param {State} ok
 * @param {State} nok
 * @param {string} type
 * @param {string} markerType
 * @param {string} stringType
 * @returns {State}
 */
// eslint-disable-next-line max-params
function factoryTitle(effects, ok, nok, type, markerType, stringType) {
  /** @type {NonNullable<Code>} */
  let marker;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter(type);
    effects.enter(markerType);
    effects.consume(code);
    effects.exit(markerType);
    marker = code === 40 ? 41 : code;
    return atFirstTitleBreak
  }
  /** @type {State} */

  function atFirstTitleBreak(code) {
    if (code === marker) {
      effects.enter(markerType);
      effects.consume(code);
      effects.exit(markerType);
      effects.exit(type);
      return ok
    }

    effects.enter(stringType);
    return atTitleBreak(code)
  }
  /** @type {State} */

  function atTitleBreak(code) {
    if (code === marker) {
      effects.exit(stringType);
      return atFirstTitleBreak(marker)
    }

    if (code === null) {
      return nok(code)
    } // Note: blank lines can’t exist in content.

    if (markdownLineEnding(code)) {
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      return factorySpace(effects, atTitleBreak, 'linePrefix')
    }

    effects.enter('chunkString', {
      contentType: 'string'
    });
    return title(code)
  }
  /** @type {State} */

  function title(code) {
    if (code === marker || code === null || markdownLineEnding(code)) {
      effects.exit('chunkString');
      return atTitleBreak(code)
    }

    effects.consume(code);
    return code === 92 ? titleEscape : title
  }
  /** @type {State} */

  function titleEscape(code) {
    if (code === marker || code === 92) {
      effects.consume(code);
      return title
    }

    return title(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Effects} Effects
 * @typedef {import('micromark-util-types').State} State
 */

/**
 * @param {Effects} effects
 * @param {State} ok
 */
function factoryWhitespace(effects, ok) {
  /** @type {boolean} */
  let seen;
  return start
  /** @type {State} */

  function start(code) {
    if (markdownLineEnding(code)) {
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      seen = true;
      return start
    }

    if (markdownSpace(code)) {
      return factorySpace(
        effects,
        start,
        seen ? 'linePrefix' : 'lineSuffix'
      )(code)
    }

    return ok(code)
  }
}

/**
 * Normalize an identifier (such as used in definitions).
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeIdentifier(value) {
  return (
    value // Collapse Markdown whitespace.
      .replace(/[\t\n\r ]+/g, ' ') // Trim.
      .replace(/^ | $/g, '') // Some characters are considered “uppercase”, but if their lowercase
      // counterpart is uppercased will result in a different uppercase
      // character.
      // Hence, to get that form, we perform both lower- and uppercase.
      // Upper case makes sure keys will not interact with default prototypal
      // methods: no method is uppercase.
      .toLowerCase()
      .toUpperCase()
  )
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 */

/** @type {Construct} */
const definition = {
  name: 'definition',
  tokenize: tokenizeDefinition
};
/** @type {Construct} */

const titleConstruct = {
  tokenize: tokenizeTitle,
  partial: true
};
/** @type {Tokenizer} */

function tokenizeDefinition(effects, ok, nok) {
  const self = this;
  /** @type {string} */

  let identifier;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('definition');
    return factoryLabel.call(
      self,
      effects,
      labelAfter,
      nok,
      'definitionLabel',
      'definitionLabelMarker',
      'definitionLabelString'
    )(code)
  }
  /** @type {State} */

  function labelAfter(code) {
    identifier = normalizeIdentifier(
      self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1)
    );

    if (code === 58) {
      effects.enter('definitionMarker');
      effects.consume(code);
      effects.exit('definitionMarker'); // Note: blank lines can’t exist in content.

      return factoryWhitespace(
        effects,
        factoryDestination(
          effects,
          effects.attempt(
            titleConstruct,
            factorySpace(effects, after, 'whitespace'),
            factorySpace(effects, after, 'whitespace')
          ),
          nok,
          'definitionDestination',
          'definitionDestinationLiteral',
          'definitionDestinationLiteralMarker',
          'definitionDestinationRaw',
          'definitionDestinationString'
        )
      )
    }

    return nok(code)
  }
  /** @type {State} */

  function after(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('definition');

      if (!self.parser.defined.includes(identifier)) {
        self.parser.defined.push(identifier);
      }

      return ok(code)
    }

    return nok(code)
  }
}
/** @type {Tokenizer} */

function tokenizeTitle(effects, ok, nok) {
  return start
  /** @type {State} */

  function start(code) {
    return markdownLineEndingOrSpace(code)
      ? factoryWhitespace(effects, before)(code)
      : nok(code)
  }
  /** @type {State} */

  function before(code) {
    if (code === 34 || code === 39 || code === 40) {
      return factoryTitle(
        effects,
        factorySpace(effects, after, 'whitespace'),
        nok,
        'definitionTitle',
        'definitionTitleMarker',
        'definitionTitleString'
      )(code)
    }

    return nok(code)
  }
  /** @type {State} */

  function after(code) {
    return code === null || markdownLineEnding(code) ? ok(code) : nok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 */

/** @type {Construct} */
const hardBreakEscape = {
  name: 'hardBreakEscape',
  tokenize: tokenizeHardBreakEscape
};
/** @type {Tokenizer} */

function tokenizeHardBreakEscape(effects, ok, nok) {
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('hardBreakEscape');
    effects.enter('escapeMarker');
    effects.consume(code);
    return open
  }
  /** @type {State} */

  function open(code) {
    if (markdownLineEnding(code)) {
      effects.exit('escapeMarker');
      effects.exit('hardBreakEscape');
      return ok(code)
    }

    return nok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').State} State
 */

/** @type {Construct} */
const headingAtx = {
  name: 'headingAtx',
  tokenize: tokenizeHeadingAtx,
  resolve: resolveHeadingAtx
};
/** @type {Resolver} */

function resolveHeadingAtx(events, context) {
  let contentEnd = events.length - 2;
  let contentStart = 3;
  /** @type {Token} */

  let content;
  /** @type {Token} */

  let text; // Prefix whitespace, part of the opening.

  if (events[contentStart][1].type === 'whitespace') {
    contentStart += 2;
  } // Suffix whitespace, part of the closing.

  if (
    contentEnd - 2 > contentStart &&
    events[contentEnd][1].type === 'whitespace'
  ) {
    contentEnd -= 2;
  }

  if (
    events[contentEnd][1].type === 'atxHeadingSequence' &&
    (contentStart === contentEnd - 1 ||
      (contentEnd - 4 > contentStart &&
        events[contentEnd - 2][1].type === 'whitespace'))
  ) {
    contentEnd -= contentStart + 1 === contentEnd ? 2 : 4;
  }

  if (contentEnd > contentStart) {
    content = {
      type: 'atxHeadingText',
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end
    };
    text = {
      type: 'chunkText',
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end,
      // @ts-expect-error Constants are fine to assign.
      contentType: 'text'
    };
    splice(events, contentStart, contentEnd - contentStart + 1, [
      ['enter', content, context],
      ['enter', text, context],
      ['exit', text, context],
      ['exit', content, context]
    ]);
  }

  return events
}
/** @type {Tokenizer} */

function tokenizeHeadingAtx(effects, ok, nok) {
  const self = this;
  let size = 0;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('atxHeading');
    effects.enter('atxHeadingSequence');
    return fenceOpenInside(code)
  }
  /** @type {State} */

  function fenceOpenInside(code) {
    if (code === 35 && size++ < 6) {
      effects.consume(code);
      return fenceOpenInside
    }

    if (code === null || markdownLineEndingOrSpace(code)) {
      effects.exit('atxHeadingSequence');
      return self.interrupt ? ok(code) : headingBreak(code)
    }

    return nok(code)
  }
  /** @type {State} */

  function headingBreak(code) {
    if (code === 35) {
      effects.enter('atxHeadingSequence');
      return sequence(code)
    }

    if (code === null || markdownLineEnding(code)) {
      effects.exit('atxHeading');
      return ok(code)
    }

    if (markdownSpace(code)) {
      return factorySpace(effects, headingBreak, 'whitespace')(code)
    }

    effects.enter('atxHeadingText');
    return data(code)
  }
  /** @type {State} */

  function sequence(code) {
    if (code === 35) {
      effects.consume(code);
      return sequence
    }

    effects.exit('atxHeadingSequence');
    return headingBreak(code)
  }
  /** @type {State} */

  function data(code) {
    if (code === null || code === 35 || markdownLineEndingOrSpace(code)) {
      effects.exit('atxHeadingText');
      return headingBreak(code)
    }

    effects.consume(code);
    return data
  }
}

/**
 * List of lowercase HTML tag names which when parsing HTML (flow), result
 * in more relaxed rules (condition 6): because they are known blocks, the
 * HTML-like syntax doesn’t have to be strictly parsed.
 * For tag names not in this list, a more strict algorithm (condition 7) is used
 * to detect whether the HTML-like syntax is seen as HTML (flow) or not.
 *
 * This is copied from:
 * <https://spec.commonmark.org/0.30/#html-blocks>.
 */
const htmlBlockNames = [
  'address',
  'article',
  'aside',
  'base',
  'basefont',
  'blockquote',
  'body',
  'caption',
  'center',
  'col',
  'colgroup',
  'dd',
  'details',
  'dialog',
  'dir',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'frame',
  'frameset',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hr',
  'html',
  'iframe',
  'legend',
  'li',
  'link',
  'main',
  'menu',
  'menuitem',
  'nav',
  'noframes',
  'ol',
  'optgroup',
  'option',
  'p',
  'param',
  'section',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'title',
  'tr',
  'track',
  'ul'
];

/**
 * List of lowercase HTML tag names which when parsing HTML (flow), result in
 * HTML that can include lines w/o exiting, until a closing tag also in this
 * list is found (condition 1).
 *
 * This module is copied from:
 * <https://spec.commonmark.org/0.30/#html-blocks>.
 *
 * Note that `textarea` was added in `CommonMark@0.30`.
 */
const htmlRawNames = ['pre', 'script', 'style', 'textarea'];

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Code} Code
 */
/** @type {Construct} */

const htmlFlow = {
  name: 'htmlFlow',
  tokenize: tokenizeHtmlFlow,
  resolveTo: resolveToHtmlFlow,
  concrete: true
};
/** @type {Construct} */

const nextBlankConstruct = {
  tokenize: tokenizeNextBlank,
  partial: true
};
/** @type {Resolver} */

function resolveToHtmlFlow(events) {
  let index = events.length;

  while (index--) {
    if (events[index][0] === 'enter' && events[index][1].type === 'htmlFlow') {
      break
    }
  }

  if (index > 1 && events[index - 2][1].type === 'linePrefix') {
    // Add the prefix start to the HTML token.
    events[index][1].start = events[index - 2][1].start; // Add the prefix start to the HTML line token.

    events[index + 1][1].start = events[index - 2][1].start; // Remove the line prefix.

    events.splice(index - 2, 2);
  }

  return events
}
/** @type {Tokenizer} */

function tokenizeHtmlFlow(effects, ok, nok) {
  const self = this;
  /** @type {number} */

  let kind;
  /** @type {boolean} */

  let startTag;
  /** @type {string} */

  let buffer;
  /** @type {number} */

  let index;
  /** @type {Code} */

  let marker;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('htmlFlow');
    effects.enter('htmlFlowData');
    effects.consume(code);
    return open
  }
  /** @type {State} */

  function open(code) {
    if (code === 33) {
      effects.consume(code);
      return declarationStart
    }

    if (code === 47) {
      effects.consume(code);
      return tagCloseStart
    }

    if (code === 63) {
      effects.consume(code);
      kind = 3; // While we’re in an instruction instead of a declaration, we’re on a `?`
      // right now, so we do need to search for `>`, similar to declarations.

      return self.interrupt ? ok : continuationDeclarationInside
    }

    if (asciiAlpha(code)) {
      effects.consume(code);
      buffer = String.fromCharCode(code);
      startTag = true;
      return tagName
    }

    return nok(code)
  }
  /** @type {State} */

  function declarationStart(code) {
    if (code === 45) {
      effects.consume(code);
      kind = 2;
      return commentOpenInside
    }

    if (code === 91) {
      effects.consume(code);
      kind = 5;
      buffer = 'CDATA[';
      index = 0;
      return cdataOpenInside
    }

    if (asciiAlpha(code)) {
      effects.consume(code);
      kind = 4;
      return self.interrupt ? ok : continuationDeclarationInside
    }

    return nok(code)
  }
  /** @type {State} */

  function commentOpenInside(code) {
    if (code === 45) {
      effects.consume(code);
      return self.interrupt ? ok : continuationDeclarationInside
    }

    return nok(code)
  }
  /** @type {State} */

  function cdataOpenInside(code) {
    if (code === buffer.charCodeAt(index++)) {
      effects.consume(code);
      return index === buffer.length
        ? self.interrupt
          ? ok
          : continuation
        : cdataOpenInside
    }

    return nok(code)
  }
  /** @type {State} */

  function tagCloseStart(code) {
    if (asciiAlpha(code)) {
      effects.consume(code);
      buffer = String.fromCharCode(code);
      return tagName
    }

    return nok(code)
  }
  /** @type {State} */

  function tagName(code) {
    if (
      code === null ||
      code === 47 ||
      code === 62 ||
      markdownLineEndingOrSpace(code)
    ) {
      if (
        code !== 47 &&
        startTag &&
        htmlRawNames.includes(buffer.toLowerCase())
      ) {
        kind = 1;
        return self.interrupt ? ok(code) : continuation(code)
      }

      if (htmlBlockNames.includes(buffer.toLowerCase())) {
        kind = 6;

        if (code === 47) {
          effects.consume(code);
          return basicSelfClosing
        }

        return self.interrupt ? ok(code) : continuation(code)
      }

      kind = 7; // Do not support complete HTML when interrupting

      return self.interrupt && !self.parser.lazy[self.now().line]
        ? nok(code)
        : startTag
        ? completeAttributeNameBefore(code)
        : completeClosingTagAfter(code)
    }

    if (code === 45 || asciiAlphanumeric(code)) {
      effects.consume(code);
      buffer += String.fromCharCode(code);
      return tagName
    }

    return nok(code)
  }
  /** @type {State} */

  function basicSelfClosing(code) {
    if (code === 62) {
      effects.consume(code);
      return self.interrupt ? ok : continuation
    }

    return nok(code)
  }
  /** @type {State} */

  function completeClosingTagAfter(code) {
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeClosingTagAfter
    }

    return completeEnd(code)
  }
  /** @type {State} */

  function completeAttributeNameBefore(code) {
    if (code === 47) {
      effects.consume(code);
      return completeEnd
    }

    if (code === 58 || code === 95 || asciiAlpha(code)) {
      effects.consume(code);
      return completeAttributeName
    }

    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAttributeNameBefore
    }

    return completeEnd(code)
  }
  /** @type {State} */

  function completeAttributeName(code) {
    if (
      code === 45 ||
      code === 46 ||
      code === 58 ||
      code === 95 ||
      asciiAlphanumeric(code)
    ) {
      effects.consume(code);
      return completeAttributeName
    }

    return completeAttributeNameAfter(code)
  }
  /** @type {State} */

  function completeAttributeNameAfter(code) {
    if (code === 61) {
      effects.consume(code);
      return completeAttributeValueBefore
    }

    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAttributeNameAfter
    }

    return completeAttributeNameBefore(code)
  }
  /** @type {State} */

  function completeAttributeValueBefore(code) {
    if (
      code === null ||
      code === 60 ||
      code === 61 ||
      code === 62 ||
      code === 96
    ) {
      return nok(code)
    }

    if (code === 34 || code === 39) {
      effects.consume(code);
      marker = code;
      return completeAttributeValueQuoted
    }

    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAttributeValueBefore
    }

    marker = null;
    return completeAttributeValueUnquoted(code)
  }
  /** @type {State} */

  function completeAttributeValueQuoted(code) {
    if (code === null || markdownLineEnding(code)) {
      return nok(code)
    }

    if (code === marker) {
      effects.consume(code);
      return completeAttributeValueQuotedAfter
    }

    effects.consume(code);
    return completeAttributeValueQuoted
  }
  /** @type {State} */

  function completeAttributeValueUnquoted(code) {
    if (
      code === null ||
      code === 34 ||
      code === 39 ||
      code === 60 ||
      code === 61 ||
      code === 62 ||
      code === 96 ||
      markdownLineEndingOrSpace(code)
    ) {
      return completeAttributeNameAfter(code)
    }

    effects.consume(code);
    return completeAttributeValueUnquoted
  }
  /** @type {State} */

  function completeAttributeValueQuotedAfter(code) {
    if (code === 47 || code === 62 || markdownSpace(code)) {
      return completeAttributeNameBefore(code)
    }

    return nok(code)
  }
  /** @type {State} */

  function completeEnd(code) {
    if (code === 62) {
      effects.consume(code);
      return completeAfter
    }

    return nok(code)
  }
  /** @type {State} */

  function completeAfter(code) {
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAfter
    }

    return code === null || markdownLineEnding(code)
      ? continuation(code)
      : nok(code)
  }
  /** @type {State} */

  function continuation(code) {
    if (code === 45 && kind === 2) {
      effects.consume(code);
      return continuationCommentInside
    }

    if (code === 60 && kind === 1) {
      effects.consume(code);
      return continuationRawTagOpen
    }

    if (code === 62 && kind === 4) {
      effects.consume(code);
      return continuationClose
    }

    if (code === 63 && kind === 3) {
      effects.consume(code);
      return continuationDeclarationInside
    }

    if (code === 93 && kind === 5) {
      effects.consume(code);
      return continuationCharacterDataInside
    }

    if (markdownLineEnding(code) && (kind === 6 || kind === 7)) {
      return effects.check(
        nextBlankConstruct,
        continuationClose,
        continuationAtLineEnding
      )(code)
    }

    if (code === null || markdownLineEnding(code)) {
      return continuationAtLineEnding(code)
    }

    effects.consume(code);
    return continuation
  }
  /** @type {State} */

  function continuationAtLineEnding(code) {
    effects.exit('htmlFlowData');
    return htmlContinueStart(code)
  }
  /** @type {State} */

  function htmlContinueStart(code) {
    if (code === null) {
      return done(code)
    }

    if (markdownLineEnding(code)) {
      return effects.attempt(
        {
          tokenize: htmlLineEnd,
          partial: true
        },
        htmlContinueStart,
        done
      )(code)
    }

    effects.enter('htmlFlowData');
    return continuation(code)
  }
  /** @type {Tokenizer} */

  function htmlLineEnd(effects, ok, nok) {
    return start
    /** @type {State} */

    function start(code) {
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      return lineStart
    }
    /** @type {State} */

    function lineStart(code) {
      return self.parser.lazy[self.now().line] ? nok(code) : ok(code)
    }
  }
  /** @type {State} */

  function continuationCommentInside(code) {
    if (code === 45) {
      effects.consume(code);
      return continuationDeclarationInside
    }

    return continuation(code)
  }
  /** @type {State} */

  function continuationRawTagOpen(code) {
    if (code === 47) {
      effects.consume(code);
      buffer = '';
      return continuationRawEndTag
    }

    return continuation(code)
  }
  /** @type {State} */

  function continuationRawEndTag(code) {
    if (code === 62 && htmlRawNames.includes(buffer.toLowerCase())) {
      effects.consume(code);
      return continuationClose
    }

    if (asciiAlpha(code) && buffer.length < 8) {
      effects.consume(code);
      buffer += String.fromCharCode(code);
      return continuationRawEndTag
    }

    return continuation(code)
  }
  /** @type {State} */

  function continuationCharacterDataInside(code) {
    if (code === 93) {
      effects.consume(code);
      return continuationDeclarationInside
    }

    return continuation(code)
  }
  /** @type {State} */

  function continuationDeclarationInside(code) {
    if (code === 62) {
      effects.consume(code);
      return continuationClose
    } // More dashes.

    if (code === 45 && kind === 2) {
      effects.consume(code);
      return continuationDeclarationInside
    }

    return continuation(code)
  }
  /** @type {State} */

  function continuationClose(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('htmlFlowData');
      return done(code)
    }

    effects.consume(code);
    return continuationClose
  }
  /** @type {State} */

  function done(code) {
    effects.exit('htmlFlow');
    return ok(code)
  }
}
/** @type {Tokenizer} */

function tokenizeNextBlank(effects, ok, nok) {
  return start
  /** @type {State} */

  function start(code) {
    effects.exit('htmlFlowData');
    effects.enter('lineEndingBlank');
    effects.consume(code);
    effects.exit('lineEndingBlank');
    return effects.attempt(blankLine, ok, nok)
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Code} Code
 */

/** @type {Construct} */
const htmlText = {
  name: 'htmlText',
  tokenize: tokenizeHtmlText
};
/** @type {Tokenizer} */

function tokenizeHtmlText(effects, ok, nok) {
  const self = this;
  /** @type {NonNullable<Code>|undefined} */

  let marker;
  /** @type {string} */

  let buffer;
  /** @type {number} */

  let index;
  /** @type {State} */

  let returnState;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('htmlText');
    effects.enter('htmlTextData');
    effects.consume(code);
    return open
  }
  /** @type {State} */

  function open(code) {
    if (code === 33) {
      effects.consume(code);
      return declarationOpen
    }

    if (code === 47) {
      effects.consume(code);
      return tagCloseStart
    }

    if (code === 63) {
      effects.consume(code);
      return instruction
    }

    if (asciiAlpha(code)) {
      effects.consume(code);
      return tagOpen
    }

    return nok(code)
  }
  /** @type {State} */

  function declarationOpen(code) {
    if (code === 45) {
      effects.consume(code);
      return commentOpen
    }

    if (code === 91) {
      effects.consume(code);
      buffer = 'CDATA[';
      index = 0;
      return cdataOpen
    }

    if (asciiAlpha(code)) {
      effects.consume(code);
      return declaration
    }

    return nok(code)
  }
  /** @type {State} */

  function commentOpen(code) {
    if (code === 45) {
      effects.consume(code);
      return commentStart
    }

    return nok(code)
  }
  /** @type {State} */

  function commentStart(code) {
    if (code === null || code === 62) {
      return nok(code)
    }

    if (code === 45) {
      effects.consume(code);
      return commentStartDash
    }

    return comment(code)
  }
  /** @type {State} */

  function commentStartDash(code) {
    if (code === null || code === 62) {
      return nok(code)
    }

    return comment(code)
  }
  /** @type {State} */

  function comment(code) {
    if (code === null) {
      return nok(code)
    }

    if (code === 45) {
      effects.consume(code);
      return commentClose
    }

    if (markdownLineEnding(code)) {
      returnState = comment;
      return atLineEnding(code)
    }

    effects.consume(code);
    return comment
  }
  /** @type {State} */

  function commentClose(code) {
    if (code === 45) {
      effects.consume(code);
      return end
    }

    return comment(code)
  }
  /** @type {State} */

  function cdataOpen(code) {
    if (code === buffer.charCodeAt(index++)) {
      effects.consume(code);
      return index === buffer.length ? cdata : cdataOpen
    }

    return nok(code)
  }
  /** @type {State} */

  function cdata(code) {
    if (code === null) {
      return nok(code)
    }

    if (code === 93) {
      effects.consume(code);
      return cdataClose
    }

    if (markdownLineEnding(code)) {
      returnState = cdata;
      return atLineEnding(code)
    }

    effects.consume(code);
    return cdata
  }
  /** @type {State} */

  function cdataClose(code) {
    if (code === 93) {
      effects.consume(code);
      return cdataEnd
    }

    return cdata(code)
  }
  /** @type {State} */

  function cdataEnd(code) {
    if (code === 62) {
      return end(code)
    }

    if (code === 93) {
      effects.consume(code);
      return cdataEnd
    }

    return cdata(code)
  }
  /** @type {State} */

  function declaration(code) {
    if (code === null || code === 62) {
      return end(code)
    }

    if (markdownLineEnding(code)) {
      returnState = declaration;
      return atLineEnding(code)
    }

    effects.consume(code);
    return declaration
  }
  /** @type {State} */

  function instruction(code) {
    if (code === null) {
      return nok(code)
    }

    if (code === 63) {
      effects.consume(code);
      return instructionClose
    }

    if (markdownLineEnding(code)) {
      returnState = instruction;
      return atLineEnding(code)
    }

    effects.consume(code);
    return instruction
  }
  /** @type {State} */

  function instructionClose(code) {
    return code === 62 ? end(code) : instruction(code)
  }
  /** @type {State} */

  function tagCloseStart(code) {
    if (asciiAlpha(code)) {
      effects.consume(code);
      return tagClose
    }

    return nok(code)
  }
  /** @type {State} */

  function tagClose(code) {
    if (code === 45 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return tagClose
    }

    return tagCloseBetween(code)
  }
  /** @type {State} */

  function tagCloseBetween(code) {
    if (markdownLineEnding(code)) {
      returnState = tagCloseBetween;
      return atLineEnding(code)
    }

    if (markdownSpace(code)) {
      effects.consume(code);
      return tagCloseBetween
    }

    return end(code)
  }
  /** @type {State} */

  function tagOpen(code) {
    if (code === 45 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return tagOpen
    }

    if (code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
      return tagOpenBetween(code)
    }

    return nok(code)
  }
  /** @type {State} */

  function tagOpenBetween(code) {
    if (code === 47) {
      effects.consume(code);
      return end
    }

    if (code === 58 || code === 95 || asciiAlpha(code)) {
      effects.consume(code);
      return tagOpenAttributeName
    }

    if (markdownLineEnding(code)) {
      returnState = tagOpenBetween;
      return atLineEnding(code)
    }

    if (markdownSpace(code)) {
      effects.consume(code);
      return tagOpenBetween
    }

    return end(code)
  }
  /** @type {State} */

  function tagOpenAttributeName(code) {
    if (
      code === 45 ||
      code === 46 ||
      code === 58 ||
      code === 95 ||
      asciiAlphanumeric(code)
    ) {
      effects.consume(code);
      return tagOpenAttributeName
    }

    return tagOpenAttributeNameAfter(code)
  }
  /** @type {State} */

  function tagOpenAttributeNameAfter(code) {
    if (code === 61) {
      effects.consume(code);
      return tagOpenAttributeValueBefore
    }

    if (markdownLineEnding(code)) {
      returnState = tagOpenAttributeNameAfter;
      return atLineEnding(code)
    }

    if (markdownSpace(code)) {
      effects.consume(code);
      return tagOpenAttributeNameAfter
    }

    return tagOpenBetween(code)
  }
  /** @type {State} */

  function tagOpenAttributeValueBefore(code) {
    if (
      code === null ||
      code === 60 ||
      code === 61 ||
      code === 62 ||
      code === 96
    ) {
      return nok(code)
    }

    if (code === 34 || code === 39) {
      effects.consume(code);
      marker = code;
      return tagOpenAttributeValueQuoted
    }

    if (markdownLineEnding(code)) {
      returnState = tagOpenAttributeValueBefore;
      return atLineEnding(code)
    }

    if (markdownSpace(code)) {
      effects.consume(code);
      return tagOpenAttributeValueBefore
    }

    effects.consume(code);
    marker = undefined;
    return tagOpenAttributeValueUnquoted
  }
  /** @type {State} */

  function tagOpenAttributeValueQuoted(code) {
    if (code === marker) {
      effects.consume(code);
      return tagOpenAttributeValueQuotedAfter
    }

    if (code === null) {
      return nok(code)
    }

    if (markdownLineEnding(code)) {
      returnState = tagOpenAttributeValueQuoted;
      return atLineEnding(code)
    }

    effects.consume(code);
    return tagOpenAttributeValueQuoted
  }
  /** @type {State} */

  function tagOpenAttributeValueQuotedAfter(code) {
    if (code === 62 || code === 47 || markdownLineEndingOrSpace(code)) {
      return tagOpenBetween(code)
    }

    return nok(code)
  }
  /** @type {State} */

  function tagOpenAttributeValueUnquoted(code) {
    if (
      code === null ||
      code === 34 ||
      code === 39 ||
      code === 60 ||
      code === 61 ||
      code === 96
    ) {
      return nok(code)
    }

    if (code === 62 || markdownLineEndingOrSpace(code)) {
      return tagOpenBetween(code)
    }

    effects.consume(code);
    return tagOpenAttributeValueUnquoted
  } // We can’t have blank lines in content, so no need to worry about empty
  // tokens.

  /** @type {State} */

  function atLineEnding(code) {
    effects.exit('htmlTextData');
    effects.enter('lineEnding');
    effects.consume(code);
    effects.exit('lineEnding');
    return factorySpace(
      effects,
      afterPrefix,
      'linePrefix',
      self.parser.constructs.disable.null.includes('codeIndented')
        ? undefined
        : 4
    )
  }
  /** @type {State} */

  function afterPrefix(code) {
    effects.enter('htmlTextData');
    return returnState(code)
  }
  /** @type {State} */

  function end(code) {
    if (code === 62) {
      effects.consume(code);
      effects.exit('htmlTextData');
      effects.exit('htmlText');
      return ok
    }

    return nok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').Event} Event
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Code} Code
 */

/** @type {Construct} */
const labelEnd = {
  name: 'labelEnd',
  tokenize: tokenizeLabelEnd,
  resolveTo: resolveToLabelEnd,
  resolveAll: resolveAllLabelEnd
};
/** @type {Construct} */

const resourceConstruct = {
  tokenize: tokenizeResource
};
/** @type {Construct} */

const fullReferenceConstruct = {
  tokenize: tokenizeFullReference
};
/** @type {Construct} */

const collapsedReferenceConstruct = {
  tokenize: tokenizeCollapsedReference
};
/** @type {Resolver} */

function resolveAllLabelEnd(events) {
  let index = -1;
  /** @type {Token} */

  let token;

  while (++index < events.length) {
    token = events[index][1];

    if (
      token.type === 'labelImage' ||
      token.type === 'labelLink' ||
      token.type === 'labelEnd'
    ) {
      // Remove the marker.
      events.splice(index + 1, token.type === 'labelImage' ? 4 : 2);
      token.type = 'data';
      index++;
    }
  }

  return events
}
/** @type {Resolver} */

function resolveToLabelEnd(events, context) {
  let index = events.length;
  let offset = 0;
  /** @type {Token} */

  let token;
  /** @type {number|undefined} */

  let open;
  /** @type {number|undefined} */

  let close;
  /** @type {Event[]} */

  let media; // Find an opening.

  while (index--) {
    token = events[index][1];

    if (open) {
      // If we see another link, or inactive link label, we’ve been here before.
      if (
        token.type === 'link' ||
        (token.type === 'labelLink' && token._inactive)
      ) {
        break
      } // Mark other link openings as inactive, as we can’t have links in
      // links.

      if (events[index][0] === 'enter' && token.type === 'labelLink') {
        token._inactive = true;
      }
    } else if (close) {
      if (
        events[index][0] === 'enter' &&
        (token.type === 'labelImage' || token.type === 'labelLink') &&
        !token._balanced
      ) {
        open = index;

        if (token.type !== 'labelLink') {
          offset = 2;
          break
        }
      }
    } else if (token.type === 'labelEnd') {
      close = index;
    }
  }

  const group = {
    type: events[open][1].type === 'labelLink' ? 'link' : 'image',
    start: Object.assign({}, events[open][1].start),
    end: Object.assign({}, events[events.length - 1][1].end)
  };
  const label = {
    type: 'label',
    start: Object.assign({}, events[open][1].start),
    end: Object.assign({}, events[close][1].end)
  };
  const text = {
    type: 'labelText',
    start: Object.assign({}, events[open + offset + 2][1].end),
    end: Object.assign({}, events[close - 2][1].start)
  };
  media = [
    ['enter', group, context],
    ['enter', label, context]
  ]; // Opening marker.

  media = push(media, events.slice(open + 1, open + offset + 3)); // Text open.

  media = push(media, [['enter', text, context]]); // Between.

  media = push(
    media,
    resolveAll(
      context.parser.constructs.insideSpan.null,
      events.slice(open + offset + 4, close - 3),
      context
    )
  ); // Text close, marker close, label close.

  media = push(media, [
    ['exit', text, context],
    events[close - 2],
    events[close - 1],
    ['exit', label, context]
  ]); // Reference, resource, or so.

  media = push(media, events.slice(close + 1)); // Media close.

  media = push(media, [['exit', group, context]]);
  splice(events, open, events.length, media);
  return events
}
/** @type {Tokenizer} */

function tokenizeLabelEnd(effects, ok, nok) {
  const self = this;
  let index = self.events.length;
  /** @type {Token} */

  let labelStart;
  /** @type {boolean} */

  let defined; // Find an opening.

  while (index--) {
    if (
      (self.events[index][1].type === 'labelImage' ||
        self.events[index][1].type === 'labelLink') &&
      !self.events[index][1]._balanced
    ) {
      labelStart = self.events[index][1];
      break
    }
  }

  return start
  /** @type {State} */

  function start(code) {
    if (!labelStart) {
      return nok(code)
    } // It’s a balanced bracket, but contains a link.

    if (labelStart._inactive) return balanced(code)
    defined = self.parser.defined.includes(
      normalizeIdentifier(
        self.sliceSerialize({
          start: labelStart.end,
          end: self.now()
        })
      )
    );
    effects.enter('labelEnd');
    effects.enter('labelMarker');
    effects.consume(code);
    effects.exit('labelMarker');
    effects.exit('labelEnd');
    return afterLabelEnd
  }
  /** @type {State} */

  function afterLabelEnd(code) {
    // Resource: `[asd](fgh)`.
    if (code === 40) {
      return effects.attempt(
        resourceConstruct,
        ok,
        defined ? ok : balanced
      )(code)
    } // Collapsed (`[asd][]`) or full (`[asd][fgh]`) reference?

    if (code === 91) {
      return effects.attempt(
        fullReferenceConstruct,
        ok,
        defined
          ? effects.attempt(collapsedReferenceConstruct, ok, balanced)
          : balanced
      )(code)
    } // Shortcut reference: `[asd]`?

    return defined ? ok(code) : balanced(code)
  }
  /** @type {State} */

  function balanced(code) {
    labelStart._balanced = true;
    return nok(code)
  }
}
/** @type {Tokenizer} */

function tokenizeResource(effects, ok, nok) {
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('resource');
    effects.enter('resourceMarker');
    effects.consume(code);
    effects.exit('resourceMarker');
    return factoryWhitespace(effects, open)
  }
  /** @type {State} */

  function open(code) {
    if (code === 41) {
      return end(code)
    }

    return factoryDestination(
      effects,
      destinationAfter,
      nok,
      'resourceDestination',
      'resourceDestinationLiteral',
      'resourceDestinationLiteralMarker',
      'resourceDestinationRaw',
      'resourceDestinationString',
      32
    )(code)
  }
  /** @type {State} */

  function destinationAfter(code) {
    return markdownLineEndingOrSpace(code)
      ? factoryWhitespace(effects, between)(code)
      : end(code)
  }
  /** @type {State} */

  function between(code) {
    if (code === 34 || code === 39 || code === 40) {
      return factoryTitle(
        effects,
        factoryWhitespace(effects, end),
        nok,
        'resourceTitle',
        'resourceTitleMarker',
        'resourceTitleString'
      )(code)
    }

    return end(code)
  }
  /** @type {State} */

  function end(code) {
    if (code === 41) {
      effects.enter('resourceMarker');
      effects.consume(code);
      effects.exit('resourceMarker');
      effects.exit('resource');
      return ok
    }

    return nok(code)
  }
}
/** @type {Tokenizer} */

function tokenizeFullReference(effects, ok, nok) {
  const self = this;
  return start
  /** @type {State} */

  function start(code) {
    return factoryLabel.call(
      self,
      effects,
      afterLabel,
      nok,
      'reference',
      'referenceMarker',
      'referenceString'
    )(code)
  }
  /** @type {State} */

  function afterLabel(code) {
    return self.parser.defined.includes(
      normalizeIdentifier(
        self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1)
      )
    )
      ? ok(code)
      : nok(code)
  }
}
/** @type {Tokenizer} */

function tokenizeCollapsedReference(effects, ok, nok) {
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('reference');
    effects.enter('referenceMarker');
    effects.consume(code);
    effects.exit('referenceMarker');
    return open
  }
  /** @type {State} */

  function open(code) {
    if (code === 93) {
      effects.enter('referenceMarker');
      effects.consume(code);
      effects.exit('referenceMarker');
      effects.exit('reference');
      return ok
    }

    return nok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 */
/** @type {Construct} */

const labelStartImage = {
  name: 'labelStartImage',
  tokenize: tokenizeLabelStartImage,
  resolveAll: labelEnd.resolveAll
};
/** @type {Tokenizer} */

function tokenizeLabelStartImage(effects, ok, nok) {
  const self = this;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('labelImage');
    effects.enter('labelImageMarker');
    effects.consume(code);
    effects.exit('labelImageMarker');
    return open
  }
  /** @type {State} */

  function open(code) {
    if (code === 91) {
      effects.enter('labelMarker');
      effects.consume(code);
      effects.exit('labelMarker');
      effects.exit('labelImage');
      return after
    }

    return nok(code)
  }
  /** @type {State} */

  function after(code) {
    /* To do: remove in the future once we’ve switched from
     * `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
     * which doesn’t need this */

    /* Hidden footnotes hook */

    /* c8 ignore next 3 */
    return code === 94 && '_hiddenFootnoteSupport' in self.parser.constructs
      ? nok(code)
      : ok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 */
/** @type {Construct} */

const labelStartLink = {
  name: 'labelStartLink',
  tokenize: tokenizeLabelStartLink,
  resolveAll: labelEnd.resolveAll
};
/** @type {Tokenizer} */

function tokenizeLabelStartLink(effects, ok, nok) {
  const self = this;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('labelLink');
    effects.enter('labelMarker');
    effects.consume(code);
    effects.exit('labelMarker');
    effects.exit('labelLink');
    return after
  }
  /** @type {State} */

  function after(code) {
    /* To do: remove in the future once we’ve switched from
     * `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
     * which doesn’t need this */

    /* Hidden footnotes hook. */

    /* c8 ignore next 3 */
    return code === 94 && '_hiddenFootnoteSupport' in self.parser.constructs
      ? nok(code)
      : ok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 */

/** @type {Construct} */
const lineEnding = {
  name: 'lineEnding',
  tokenize: tokenizeLineEnding
};
/** @type {Tokenizer} */

function tokenizeLineEnding(effects, ok) {
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('lineEnding');
    effects.consume(code);
    effects.exit('lineEnding');
    return factorySpace(effects, ok, 'linePrefix')
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Code} Code
 */

/** @type {Construct} */
const thematicBreak$1 = {
  name: 'thematicBreak',
  tokenize: tokenizeThematicBreak
};
/** @type {Tokenizer} */

function tokenizeThematicBreak(effects, ok, nok) {
  let size = 0;
  /** @type {NonNullable<Code>} */

  let marker;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('thematicBreak');
    marker = code;
    return atBreak(code)
  }
  /** @type {State} */

  function atBreak(code) {
    if (code === marker) {
      effects.enter('thematicBreakSequence');
      return sequence(code)
    }

    if (markdownSpace(code)) {
      return factorySpace(effects, atBreak, 'whitespace')(code)
    }

    if (size < 3 || (code !== null && !markdownLineEnding(code))) {
      return nok(code)
    }

    effects.exit('thematicBreak');
    return ok(code)
  }
  /** @type {State} */

  function sequence(code) {
    if (code === marker) {
      effects.consume(code);
      size++;
      return sequence
    }

    effects.exit('thematicBreakSequence');
    return atBreak(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').TokenizeContext} TokenizeContext
 * @typedef {import('micromark-util-types').Exiter} Exiter
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Code} Code
 */
/** @type {Construct} */

const list$1 = {
  name: 'list',
  tokenize: tokenizeListStart,
  continuation: {
    tokenize: tokenizeListContinuation
  },
  exit: tokenizeListEnd
};
/** @type {Construct} */

const listItemPrefixWhitespaceConstruct = {
  tokenize: tokenizeListItemPrefixWhitespace,
  partial: true
};
/** @type {Construct} */

const indentConstruct = {
  tokenize: tokenizeIndent$1,
  partial: true
};
/**
 * @type {Tokenizer}
 * @this {TokenizeContextWithState}
 */

function tokenizeListStart(effects, ok, nok) {
  const self = this;
  const tail = self.events[self.events.length - 1];
  let initialSize =
    tail && tail[1].type === 'linePrefix'
      ? tail[2].sliceSerialize(tail[1], true).length
      : 0;
  let size = 0;
  return start
  /** @type {State} */

  function start(code) {
    const kind =
      self.containerState.type ||
      (code === 42 || code === 43 || code === 45
        ? 'listUnordered'
        : 'listOrdered');

    if (
      kind === 'listUnordered'
        ? !self.containerState.marker || code === self.containerState.marker
        : asciiDigit(code)
    ) {
      if (!self.containerState.type) {
        self.containerState.type = kind;
        effects.enter(kind, {
          _container: true
        });
      }

      if (kind === 'listUnordered') {
        effects.enter('listItemPrefix');
        return code === 42 || code === 45
          ? effects.check(thematicBreak$1, nok, atMarker)(code)
          : atMarker(code)
      }

      if (!self.interrupt || code === 49) {
        effects.enter('listItemPrefix');
        effects.enter('listItemValue');
        return inside(code)
      }
    }

    return nok(code)
  }
  /** @type {State} */

  function inside(code) {
    if (asciiDigit(code) && ++size < 10) {
      effects.consume(code);
      return inside
    }

    if (
      (!self.interrupt || size < 2) &&
      (self.containerState.marker
        ? code === self.containerState.marker
        : code === 41 || code === 46)
    ) {
      effects.exit('listItemValue');
      return atMarker(code)
    }

    return nok(code)
  }
  /**
   * @type {State}
   **/

  function atMarker(code) {
    effects.enter('listItemMarker');
    effects.consume(code);
    effects.exit('listItemMarker');
    self.containerState.marker = self.containerState.marker || code;
    return effects.check(
      blankLine, // Can’t be empty when interrupting.
      self.interrupt ? nok : onBlank,
      effects.attempt(
        listItemPrefixWhitespaceConstruct,
        endOfPrefix,
        otherPrefix
      )
    )
  }
  /** @type {State} */

  function onBlank(code) {
    self.containerState.initialBlankLine = true;
    initialSize++;
    return endOfPrefix(code)
  }
  /** @type {State} */

  function otherPrefix(code) {
    if (markdownSpace(code)) {
      effects.enter('listItemPrefixWhitespace');
      effects.consume(code);
      effects.exit('listItemPrefixWhitespace');
      return endOfPrefix
    }

    return nok(code)
  }
  /** @type {State} */

  function endOfPrefix(code) {
    self.containerState.size =
      initialSize +
      self.sliceSerialize(effects.exit('listItemPrefix'), true).length;
    return ok(code)
  }
}
/**
 * @type {Tokenizer}
 * @this {TokenizeContextWithState}
 */

function tokenizeListContinuation(effects, ok, nok) {
  const self = this;
  self.containerState._closeFlow = undefined;
  return effects.check(blankLine, onBlank, notBlank)
  /** @type {State} */

  function onBlank(code) {
    self.containerState.furtherBlankLines =
      self.containerState.furtherBlankLines ||
      self.containerState.initialBlankLine; // We have a blank line.
    // Still, try to consume at most the items size.

    return factorySpace(
      effects,
      ok,
      'listItemIndent',
      self.containerState.size + 1
    )(code)
  }
  /** @type {State} */

  function notBlank(code) {
    if (self.containerState.furtherBlankLines || !markdownSpace(code)) {
      self.containerState.furtherBlankLines = undefined;
      self.containerState.initialBlankLine = undefined;
      return notInCurrentItem(code)
    }

    self.containerState.furtherBlankLines = undefined;
    self.containerState.initialBlankLine = undefined;
    return effects.attempt(indentConstruct, ok, notInCurrentItem)(code)
  }
  /** @type {State} */

  function notInCurrentItem(code) {
    // While we do continue, we signal that the flow should be closed.
    self.containerState._closeFlow = true; // As we’re closing flow, we’re no longer interrupting.

    self.interrupt = undefined;
    return factorySpace(
      effects,
      effects.attempt(list$1, ok, nok),
      'linePrefix',
      self.parser.constructs.disable.null.includes('codeIndented')
        ? undefined
        : 4
    )(code)
  }
}
/**
 * @type {Tokenizer}
 * @this {TokenizeContextWithState}
 */

function tokenizeIndent$1(effects, ok, nok) {
  const self = this;
  return factorySpace(
    effects,
    afterPrefix,
    'listItemIndent',
    self.containerState.size + 1
  )
  /** @type {State} */

  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return tail &&
      tail[1].type === 'listItemIndent' &&
      tail[2].sliceSerialize(tail[1], true).length === self.containerState.size
      ? ok(code)
      : nok(code)
  }
}
/**
 * @type {Exiter}
 * @this {TokenizeContextWithState}
 */

function tokenizeListEnd(effects) {
  effects.exit(this.containerState.type);
}
/**
 * @type {Tokenizer}
 * @this {TokenizeContextWithState}
 */

function tokenizeListItemPrefixWhitespace(effects, ok, nok) {
  const self = this;
  return factorySpace(
    effects,
    afterPrefix,
    'listItemPrefixWhitespace',
    self.parser.constructs.disable.null.includes('codeIndented')
      ? undefined
      : 4 + 1
  )
  /** @type {State} */

  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return !markdownSpace(code) &&
      tail &&
      tail[1].type === 'listItemPrefixWhitespace'
      ? ok(code)
      : nok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Code} Code
 */

/** @type {Construct} */
const setextUnderline = {
  name: 'setextUnderline',
  tokenize: tokenizeSetextUnderline,
  resolveTo: resolveToSetextUnderline
};
/** @type {Resolver} */

function resolveToSetextUnderline(events, context) {
  let index = events.length;
  /** @type {number|undefined} */

  let content;
  /** @type {number|undefined} */

  let text;
  /** @type {number|undefined} */

  let definition; // Find the opening of the content.
  // It’ll always exist: we don’t tokenize if it isn’t there.

  while (index--) {
    if (events[index][0] === 'enter') {
      if (events[index][1].type === 'content') {
        content = index;
        break
      }

      if (events[index][1].type === 'paragraph') {
        text = index;
      }
    } // Exit
    else {
      if (events[index][1].type === 'content') {
        // Remove the content end (if needed we’ll add it later)
        events.splice(index, 1);
      }

      if (!definition && events[index][1].type === 'definition') {
        definition = index;
      }
    }
  }

  const heading = {
    type: 'setextHeading',
    start: Object.assign({}, events[text][1].start),
    end: Object.assign({}, events[events.length - 1][1].end)
  }; // Change the paragraph to setext heading text.

  events[text][1].type = 'setextHeadingText'; // If we have definitions in the content, we’ll keep on having content,
  // but we need move it.

  if (definition) {
    events.splice(text, 0, ['enter', heading, context]);
    events.splice(definition + 1, 0, ['exit', events[content][1], context]);
    events[content][1].end = Object.assign({}, events[definition][1].end);
  } else {
    events[content][1] = heading;
  } // Add the heading exit at the end.

  events.push(['exit', heading, context]);
  return events
}
/** @type {Tokenizer} */

function tokenizeSetextUnderline(effects, ok, nok) {
  const self = this;
  let index = self.events.length;
  /** @type {NonNullable<Code>} */

  let marker;
  /** @type {boolean} */

  let paragraph; // Find an opening.

  while (index--) {
    // Skip enter/exit of line ending, line prefix, and content.
    // We can now either have a definition or a paragraph.
    if (
      self.events[index][1].type !== 'lineEnding' &&
      self.events[index][1].type !== 'linePrefix' &&
      self.events[index][1].type !== 'content'
    ) {
      paragraph = self.events[index][1].type === 'paragraph';
      break
    }
  }

  return start
  /** @type {State} */

  function start(code) {
    if (!self.parser.lazy[self.now().line] && (self.interrupt || paragraph)) {
      effects.enter('setextHeadingLine');
      effects.enter('setextHeadingLineSequence');
      marker = code;
      return closingSequence(code)
    }

    return nok(code)
  }
  /** @type {State} */

  function closingSequence(code) {
    if (code === marker) {
      effects.consume(code);
      return closingSequence
    }

    effects.exit('setextHeadingLineSequence');
    return factorySpace(effects, closingSequenceEnd, 'lineSuffix')(code)
  }
  /** @type {State} */

  function closingSequenceEnd(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('setextHeadingLine');
      return ok(code)
    }

    return nok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').InitialConstruct} InitialConstruct
 * @typedef {import('micromark-util-types').Initializer} Initializer
 * @typedef {import('micromark-util-types').State} State
 */

/** @type {InitialConstruct} */
const flow$1 = {
  tokenize: initializeFlow
};
/** @type {Initializer} */

function initializeFlow(effects) {
  const self = this;
  const initial = effects.attempt(
    // Try to parse a blank line.
    blankLine,
    atBlankEnding, // Try to parse initial flow (essentially, only code).
    effects.attempt(
      this.parser.constructs.flowInitial,
      afterConstruct,
      factorySpace(
        effects,
        effects.attempt(
          this.parser.constructs.flow,
          afterConstruct,
          effects.attempt(content, afterConstruct)
        ),
        'linePrefix'
      )
    )
  );
  return initial
  /** @type {State} */

  function atBlankEnding(code) {
    if (code === null) {
      effects.consume(code);
      return
    }

    effects.enter('lineEndingBlank');
    effects.consume(code);
    effects.exit('lineEndingBlank');
    self.currentConstruct = undefined;
    return initial
  }
  /** @type {State} */

  function afterConstruct(code) {
    if (code === null) {
      effects.consume(code);
      return
    }

    effects.enter('lineEnding');
    effects.consume(code);
    effects.exit('lineEnding');
    self.currentConstruct = undefined;
    return initial
  }
}

/**
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').Initializer} Initializer
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').InitialConstruct} InitialConstruct
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Code} Code
 */
const resolver = {
  resolveAll: createResolver()
};
const string$1 = initializeFactory('string');
const text$3 = initializeFactory('text');
/**
 * @param {'string'|'text'} field
 * @returns {InitialConstruct}
 */

function initializeFactory(field) {
  return {
    tokenize: initializeText,
    resolveAll: createResolver(
      field === 'text' ? resolveAllLineSuffixes : undefined
    )
  }
  /** @type {Initializer} */

  function initializeText(effects) {
    const self = this;
    const constructs = this.parser.constructs[field];
    const text = effects.attempt(constructs, start, notText);
    return start
    /** @type {State} */

    function start(code) {
      return atBreak(code) ? text(code) : notText(code)
    }
    /** @type {State} */

    function notText(code) {
      if (code === null) {
        effects.consume(code);
        return
      }

      effects.enter('data');
      effects.consume(code);
      return data
    }
    /** @type {State} */

    function data(code) {
      if (atBreak(code)) {
        effects.exit('data');
        return text(code)
      } // Data.

      effects.consume(code);
      return data
    }
    /**
     * @param {Code} code
     * @returns {boolean}
     */

    function atBreak(code) {
      if (code === null) {
        return true
      }

      const list = constructs[code];
      let index = -1;

      if (list) {
        while (++index < list.length) {
          const item = list[index];

          if (!item.previous || item.previous.call(self, self.previous)) {
            return true
          }
        }
      }

      return false
    }
  }
}
/**
 * @param {Resolver} [extraResolver]
 * @returns {Resolver}
 */

function createResolver(extraResolver) {
  return resolveAllText
  /** @type {Resolver} */

  function resolveAllText(events, context) {
    let index = -1;
    /** @type {number|undefined} */

    let enter; // A rather boring computation (to merge adjacent `data` events) which
    // improves mm performance by 29%.

    while (++index <= events.length) {
      if (enter === undefined) {
        if (events[index] && events[index][1].type === 'data') {
          enter = index;
          index++;
        }
      } else if (!events[index] || events[index][1].type !== 'data') {
        // Don’t do anything if there is one data token.
        if (index !== enter + 2) {
          events[enter][1].end = events[index - 1][1].end;
          events.splice(enter + 2, index - enter - 2);
          index = enter + 2;
        }

        enter = undefined;
      }
    }

    return extraResolver ? extraResolver(events, context) : events
  }
}
/**
 * A rather ugly set of instructions which again looks at chunks in the input
 * stream.
 * The reason to do this here is that it is *much* faster to parse in reverse.
 * And that we can’t hook into `null` to split the line suffix before an EOF.
 * To do: figure out if we can make this into a clean utility, or even in core.
 * As it will be useful for GFMs literal autolink extension (and maybe even
 * tables?)
 *
 * @type {Resolver}
 */

function resolveAllLineSuffixes(events, context) {
  let eventIndex = 0; // Skip first.

  while (++eventIndex <= events.length) {
    if (
      (eventIndex === events.length ||
        events[eventIndex][1].type === 'lineEnding') &&
      events[eventIndex - 1][1].type === 'data'
    ) {
      const data = events[eventIndex - 1][1];
      const chunks = context.sliceStream(data);
      let index = chunks.length;
      let bufferIndex = -1;
      let size = 0;
      /** @type {boolean|undefined} */

      let tabs;

      while (index--) {
        const chunk = chunks[index];

        if (typeof chunk === 'string') {
          bufferIndex = chunk.length;

          while (chunk.charCodeAt(bufferIndex - 1) === 32) {
            size++;
            bufferIndex--;
          }

          if (bufferIndex) break
          bufferIndex = -1;
        } // Number
        else if (chunk === -2) {
          tabs = true;
          size++;
        } else if (chunk === -1) ; else {
          // Replacement character, exit.
          index++;
          break
        }
      }

      if (size) {
        const token = {
          type:
            eventIndex === events.length || tabs || size < 2
              ? 'lineSuffix'
              : 'hardBreakTrailing',
          start: {
            line: data.end.line,
            column: data.end.column - size,
            offset: data.end.offset - size,
            _index: data.start._index + index,
            _bufferIndex: index
              ? bufferIndex
              : data.start._bufferIndex + bufferIndex
          },
          end: Object.assign({}, data.end)
        };
        data.end = Object.assign({}, token.start);

        if (data.start.offset === data.end.offset) {
          Object.assign(data, token);
        } else {
          events.splice(
            eventIndex,
            0,
            ['enter', token, context],
            ['exit', token, context]
          );
          eventIndex += 2;
        }
      }

      eventIndex++;
    }
  }

  return events
}

/**
 * @typedef {import('micromark-util-types').Code} Code
 * @typedef {import('micromark-util-types').Chunk} Chunk
 * @typedef {import('micromark-util-types').Point} Point
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').Effects} Effects
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').InitialConstruct} InitialConstruct
 * @typedef {import('micromark-util-types').ConstructRecord} ConstructRecord
 * @typedef {import('micromark-util-types').TokenizeContext} TokenizeContext
 * @typedef {import('micromark-util-types').ParseContext} ParseContext
 */

/**
 * Create a tokenizer.
 * Tokenizers deal with one type of data (e.g., containers, flow, text).
 * The parser is the object dealing with it all.
 * `initialize` works like other constructs, except that only its `tokenize`
 * function is used, in which case it doesn’t receive an `ok` or `nok`.
 * `from` can be given to set the point before the first character, although
 * when further lines are indented, they must be set with `defineSkip`.
 *
 * @param {ParseContext} parser
 * @param {InitialConstruct} initialize
 * @param {Omit<Point, '_index'|'_bufferIndex'>} [from]
 * @returns {TokenizeContext}
 */
function createTokenizer(parser, initialize, from) {
  /** @type {Point} */
  let point = Object.assign(
    from
      ? Object.assign({}, from)
      : {
          line: 1,
          column: 1,
          offset: 0
        },
    {
      _index: 0,
      _bufferIndex: -1
    }
  );
  /** @type {Record<string, number>} */

  const columnStart = {};
  /** @type {Array<Construct>} */

  const resolveAllConstructs = [];
  /** @type {Array<Chunk>} */

  let chunks = [];
  /** @type {Array<Token>} */

  let stack = [];
  /**
   * Tools used for tokenizing.
   *
   * @type {Effects}
   */

  const effects = {
    consume,
    enter,
    exit,
    attempt: constructFactory(onsuccessfulconstruct),
    check: constructFactory(onsuccessfulcheck),
    interrupt: constructFactory(onsuccessfulcheck, {
      interrupt: true
    })
  };
  /**
   * State and tools for resolving and serializing.
   *
   * @type {TokenizeContext}
   */

  const context = {
    previous: null,
    code: null,
    containerState: {},
    events: [],
    parser,
    sliceStream,
    sliceSerialize,
    now,
    defineSkip,
    write
  };
  /**
   * The state function.
   *
   * @type {State|void}
   */

  let state = initialize.tokenize.call(context, effects);

  if (initialize.resolveAll) {
    resolveAllConstructs.push(initialize);
  }

  return context
  /** @type {TokenizeContext['write']} */

  function write(slice) {
    chunks = push(chunks, slice);
    main(); // Exit if we’re not done, resolve might change stuff.

    if (chunks[chunks.length - 1] !== null) {
      return []
    }

    addResult(initialize, 0); // Otherwise, resolve, and exit.

    context.events = resolveAll(resolveAllConstructs, context.events, context);
    return context.events
  } //
  // Tools.
  //

  /** @type {TokenizeContext['sliceSerialize']} */

  function sliceSerialize(token, expandTabs) {
    return serializeChunks(sliceStream(token), expandTabs)
  }
  /** @type {TokenizeContext['sliceStream']} */

  function sliceStream(token) {
    return sliceChunks(chunks, token)
  }
  /** @type {TokenizeContext['now']} */

  function now() {
    return Object.assign({}, point)
  }
  /** @type {TokenizeContext['defineSkip']} */

  function defineSkip(value) {
    columnStart[value.line] = value.column;
    accountForPotentialSkip();
  } //
  // State management.
  //

  /**
   * Main loop (note that `_index` and `_bufferIndex` in `point` are modified by
   * `consume`).
   * Here is where we walk through the chunks, which either include strings of
   * several characters, or numerical character codes.
   * The reason to do this in a loop instead of a call is so the stack can
   * drain.
   *
   * @returns {void}
   */

  function main() {
    /** @type {number} */
    let chunkIndex;

    while (point._index < chunks.length) {
      const chunk = chunks[point._index]; // If we’re in a buffer chunk, loop through it.

      if (typeof chunk === 'string') {
        chunkIndex = point._index;

        if (point._bufferIndex < 0) {
          point._bufferIndex = 0;
        }

        while (
          point._index === chunkIndex &&
          point._bufferIndex < chunk.length
        ) {
          go(chunk.charCodeAt(point._bufferIndex));
        }
      } else {
        go(chunk);
      }
    }
  }
  /**
   * Deal with one code.
   *
   * @param {Code} code
   * @returns {void}
   */

  function go(code) {
    state = state(code);
  }
  /** @type {Effects['consume']} */

  function consume(code) {
    if (markdownLineEnding(code)) {
      point.line++;
      point.column = 1;
      point.offset += code === -3 ? 2 : 1;
      accountForPotentialSkip();
    } else if (code !== -1) {
      point.column++;
      point.offset++;
    } // Not in a string chunk.

    if (point._bufferIndex < 0) {
      point._index++;
    } else {
      point._bufferIndex++; // At end of string chunk.
      // @ts-expect-error Points w/ non-negative `_bufferIndex` reference
      // strings.

      if (point._bufferIndex === chunks[point._index].length) {
        point._bufferIndex = -1;
        point._index++;
      }
    } // Expose the previous character.

    context.previous = code; // Mark as consumed.
  }
  /** @type {Effects['enter']} */

  function enter(type, fields) {
    /** @type {Token} */
    // @ts-expect-error Patch instead of assign required fields to help GC.
    const token = fields || {};
    token.type = type;
    token.start = now();
    context.events.push(['enter', token, context]);
    stack.push(token);
    return token
  }
  /** @type {Effects['exit']} */

  function exit(type) {
    const token = stack.pop();
    token.end = now();
    context.events.push(['exit', token, context]);
    return token
  }
  /**
   * Use results.
   *
   * @type {ReturnHandle}
   */

  function onsuccessfulconstruct(construct, info) {
    addResult(construct, info.from);
  }
  /**
   * Discard results.
   *
   * @type {ReturnHandle}
   */

  function onsuccessfulcheck(_, info) {
    info.restore();
  }
  /**
   * Factory to attempt/check/interrupt.
   *
   * @param {ReturnHandle} onreturn
   * @param {Record<string, unknown>} [fields]
   */

  function constructFactory(onreturn, fields) {
    return hook
    /**
     * Handle either an object mapping codes to constructs, a list of
     * constructs, or a single construct.
     *
     * @param {Construct|Array<Construct>|ConstructRecord} constructs
     * @param {State} returnState
     * @param {State} [bogusState]
     * @returns {State}
     */

    function hook(constructs, returnState, bogusState) {
      /** @type {Array<Construct>} */
      let listOfConstructs;
      /** @type {number} */

      let constructIndex;
      /** @type {Construct} */

      let currentConstruct;
      /** @type {Info} */

      let info;
      return Array.isArray(constructs)
        ? /* c8 ignore next 1 */
          handleListOfConstructs(constructs)
        : 'tokenize' in constructs // @ts-expect-error Looks like a construct.
        ? handleListOfConstructs([constructs])
        : handleMapOfConstructs(constructs)
      /**
       * Handle a list of construct.
       *
       * @param {ConstructRecord} map
       * @returns {State}
       */

      function handleMapOfConstructs(map) {
        return start
        /** @type {State} */

        function start(code) {
          const def = code !== null && map[code];
          const all = code !== null && map.null;
          const list = [
            // To do: add more extension tests.

            /* c8 ignore next 2 */
            ...(Array.isArray(def) ? def : def ? [def] : []),
            ...(Array.isArray(all) ? all : all ? [all] : [])
          ];
          return handleListOfConstructs(list)(code)
        }
      }
      /**
       * Handle a list of construct.
       *
       * @param {Array<Construct>} list
       * @returns {State}
       */

      function handleListOfConstructs(list) {
        listOfConstructs = list;
        constructIndex = 0;

        if (list.length === 0) {
          return bogusState
        }

        return handleConstruct(list[constructIndex])
      }
      /**
       * Handle a single construct.
       *
       * @param {Construct} construct
       * @returns {State}
       */

      function handleConstruct(construct) {
        return start
        /** @type {State} */

        function start(code) {
          // To do: not needed to store if there is no bogus state, probably?
          // Currently doesn’t work because `inspect` in document does a check
          // w/o a bogus, which doesn’t make sense. But it does seem to help perf
          // by not storing.
          info = store();
          currentConstruct = construct;

          if (!construct.partial) {
            context.currentConstruct = construct;
          }

          if (
            construct.name &&
            context.parser.constructs.disable.null.includes(construct.name)
          ) {
            return nok()
          }

          return construct.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            fields ? Object.assign(Object.create(context), fields) : context,
            effects,
            ok,
            nok
          )(code)
        }
      }
      /** @type {State} */

      function ok(code) {
        onreturn(currentConstruct, info);
        return returnState
      }
      /** @type {State} */

      function nok(code) {
        info.restore();

        if (++constructIndex < listOfConstructs.length) {
          return handleConstruct(listOfConstructs[constructIndex])
        }

        return bogusState
      }
    }
  }
  /**
   * @param {Construct} construct
   * @param {number} from
   * @returns {void}
   */

  function addResult(construct, from) {
    if (construct.resolveAll && !resolveAllConstructs.includes(construct)) {
      resolveAllConstructs.push(construct);
    }

    if (construct.resolve) {
      splice(
        context.events,
        from,
        context.events.length - from,
        construct.resolve(context.events.slice(from), context)
      );
    }

    if (construct.resolveTo) {
      context.events = construct.resolveTo(context.events, context);
    }
  }
  /**
   * Store state.
   *
   * @returns {Info}
   */

  function store() {
    const startPoint = now();
    const startPrevious = context.previous;
    const startCurrentConstruct = context.currentConstruct;
    const startEventsIndex = context.events.length;
    const startStack = Array.from(stack);
    return {
      restore,
      from: startEventsIndex
    }
    /**
     * Restore state.
     *
     * @returns {void}
     */

    function restore() {
      point = startPoint;
      context.previous = startPrevious;
      context.currentConstruct = startCurrentConstruct;
      context.events.length = startEventsIndex;
      stack = startStack;
      accountForPotentialSkip();
    }
  }
  /**
   * Move the current point a bit forward in the line when it’s on a column
   * skip.
   *
   * @returns {void}
   */

  function accountForPotentialSkip() {
    if (point.line in columnStart && point.column < 2) {
      point.column = columnStart[point.line];
      point.offset += columnStart[point.line] - 1;
    }
  }
}
/**
 * Get the chunks from a slice of chunks in the range of a token.
 *
 * @param {Array<Chunk>} chunks
 * @param {Pick<Token, 'start'|'end'>} token
 * @returns {Array<Chunk>}
 */

function sliceChunks(chunks, token) {
  const startIndex = token.start._index;
  const startBufferIndex = token.start._bufferIndex;
  const endIndex = token.end._index;
  const endBufferIndex = token.end._bufferIndex;
  /** @type {Array<Chunk>} */

  let view;

  if (startIndex === endIndex) {
    // @ts-expect-error `_bufferIndex` is used on string chunks.
    view = [chunks[startIndex].slice(startBufferIndex, endBufferIndex)];
  } else {
    view = chunks.slice(startIndex, endIndex);

    if (startBufferIndex > -1) {
      // @ts-expect-error `_bufferIndex` is used on string chunks.
      view[0] = view[0].slice(startBufferIndex);
    }

    if (endBufferIndex > 0) {
      // @ts-expect-error `_bufferIndex` is used on string chunks.
      view.push(chunks[endIndex].slice(0, endBufferIndex));
    }
  }

  return view
}
/**
 * Get the string value of a slice of chunks.
 *
 * @param {Array<Chunk>} chunks
 * @param {boolean} [expandTabs=false]
 * @returns {string}
 */

function serializeChunks(chunks, expandTabs) {
  let index = -1;
  /** @type {Array<string>} */

  const result = [];
  /** @type {boolean|undefined} */

  let atTab;

  while (++index < chunks.length) {
    const chunk = chunks[index];
    /** @type {string} */

    let value;

    if (typeof chunk === 'string') {
      value = chunk;
    } else
      switch (chunk) {
        case -5: {
          value = '\r';
          break
        }

        case -4: {
          value = '\n';
          break
        }

        case -3: {
          value = '\r' + '\n';
          break
        }

        case -2: {
          value = expandTabs ? ' ' : '\t';
          break
        }

        case -1: {
          if (!expandTabs && atTab) continue
          value = ' ';
          break
        }

        default: {
          // Currently only replacement character.
          value = String.fromCharCode(chunk);
        }
      }

    atTab = chunk === -2;
    result.push(value);
  }

  return result.join('')
}

/**
 * @typedef {import('micromark-util-types').Extension} Extension
 */
/** @type {Extension['document']} */

const document = {
  [42]: list$1,
  [43]: list$1,
  [45]: list$1,
  [48]: list$1,
  [49]: list$1,
  [50]: list$1,
  [51]: list$1,
  [52]: list$1,
  [53]: list$1,
  [54]: list$1,
  [55]: list$1,
  [56]: list$1,
  [57]: list$1,
  [62]: blockQuote
};
/** @type {Extension['contentInitial']} */

const contentInitial = {
  [91]: definition
};
/** @type {Extension['flowInitial']} */

const flowInitial = {
  [-2]: codeIndented,
  [-1]: codeIndented,
  [32]: codeIndented
};
/** @type {Extension['flow']} */

const flow = {
  [35]: headingAtx,
  [42]: thematicBreak$1,
  [45]: [setextUnderline, thematicBreak$1],
  [60]: htmlFlow,
  [61]: setextUnderline,
  [95]: thematicBreak$1,
  [96]: codeFenced,
  [126]: codeFenced
};
/** @type {Extension['string']} */

const string = {
  [38]: characterReference,
  [92]: characterEscape
};
/** @type {Extension['text']} */

const text$2 = {
  [-5]: lineEnding,
  [-4]: lineEnding,
  [-3]: lineEnding,
  [33]: labelStartImage,
  [38]: characterReference,
  [42]: attention,
  [60]: [autolink, htmlText],
  [91]: labelStartLink,
  [92]: [hardBreakEscape, characterEscape],
  [93]: labelEnd,
  [95]: attention,
  [96]: codeText
};
/** @type {Extension['insideSpan']} */

const insideSpan = {
  null: [attention, resolver]
};
/** @type {Extension['attentionMarkers']} */

const attentionMarkers = {
  null: [42, 95]
};
/** @type {Extension['disable']} */

const disable = {
  null: []
};

var defaultConstructs = /*#__PURE__*/Object.freeze({
  __proto__: null,
  attentionMarkers: attentionMarkers,
  contentInitial: contentInitial,
  disable: disable,
  document: document,
  flow: flow,
  flowInitial: flowInitial,
  insideSpan: insideSpan,
  string: string,
  text: text$2
});

/**
 * @typedef {import('micromark-util-types').InitialConstruct} InitialConstruct
 * @typedef {import('micromark-util-types').FullNormalizedExtension} FullNormalizedExtension
 * @typedef {import('micromark-util-types').ParseOptions} ParseOptions
 * @typedef {import('micromark-util-types').ParseContext} ParseContext
 * @typedef {import('micromark-util-types').Create} Create
 */
/**
 * @param {ParseOptions} [options]
 * @returns {ParseContext}
 */

function parse$1(options = {}) {
  /** @type {FullNormalizedExtension} */
  // @ts-expect-error `defaultConstructs` is full, so the result will be too.
  const constructs = combineExtensions(
    // @ts-expect-error Same as above.
    [defaultConstructs].concat(options.extensions || [])
  );
  /** @type {ParseContext} */

  const parser = {
    defined: [],
    lazy: {},
    constructs,
    content: create(content$1),
    document: create(document$1),
    flow: create(flow$1),
    string: create(string$1),
    text: create(text$3)
  };
  return parser
  /**
   * @param {InitialConstruct} initial
   */

  function create(initial) {
    return creator
    /** @type {Create} */

    function creator(from) {
      return createTokenizer(parser, initial, from)
    }
  }
}

/**
 * @typedef {import('micromark-util-types').Encoding} Encoding
 * @typedef {import('micromark-util-types').Value} Value
 * @typedef {import('micromark-util-types').Chunk} Chunk
 * @typedef {import('micromark-util-types').Code} Code
 */

/**
 * @callback Preprocessor
 * @param {Value} value
 * @param {Encoding} [encoding]
 * @param {boolean} [end=false]
 * @returns {Array<Chunk>}
 */
const search = /[\0\t\n\r]/g;
/**
 * @returns {Preprocessor}
 */

function preprocess() {
  let column = 1;
  let buffer = '';
  /** @type {boolean|undefined} */

  let start = true;
  /** @type {boolean|undefined} */

  let atCarriageReturn;
  return preprocessor
  /** @type {Preprocessor} */

  function preprocessor(value, encoding, end) {
    /** @type {Array<Chunk>} */
    const chunks = [];
    /** @type {RegExpMatchArray|null} */

    let match;
    /** @type {number} */

    let next;
    /** @type {number} */

    let startPosition;
    /** @type {number} */

    let endPosition;
    /** @type {Code} */

    let code; // @ts-expect-error `Buffer` does allow an encoding.

    value = buffer + value.toString(encoding);
    startPosition = 0;
    buffer = '';

    if (start) {
      if (value.charCodeAt(0) === 65279) {
        startPosition++;
      }

      start = undefined;
    }

    while (startPosition < value.length) {
      search.lastIndex = startPosition;
      match = search.exec(value);
      endPosition =
        match && match.index !== undefined ? match.index : value.length;
      code = value.charCodeAt(endPosition);

      if (!match) {
        buffer = value.slice(startPosition);
        break
      }

      if (code === 10 && startPosition === endPosition && atCarriageReturn) {
        chunks.push(-3);
        atCarriageReturn = undefined;
      } else {
        if (atCarriageReturn) {
          chunks.push(-5);
          atCarriageReturn = undefined;
        }

        if (startPosition < endPosition) {
          chunks.push(value.slice(startPosition, endPosition));
          column += endPosition - startPosition;
        }

        switch (code) {
          case 0: {
            chunks.push(65533);
            column++;
            break
          }

          case 9: {
            next = Math.ceil(column / 4) * 4;
            chunks.push(-2);

            while (column++ < next) chunks.push(-1);

            break
          }

          case 10: {
            chunks.push(-4);
            column = 1;
            break
          }

          default: {
            atCarriageReturn = true;
            column = 1;
          }
        }
      }

      startPosition = endPosition + 1;
    }

    if (end) {
      if (atCarriageReturn) chunks.push(-5);
      if (buffer) chunks.push(buffer);
      chunks.push(null);
    }

    return chunks
  }
}

/**
 * @typedef {import('micromark-util-types').Event} Event
 */
/**
 * @param {Array<Event>} events
 * @returns {Array<Event>}
 */

function postprocess(events) {
  while (!subtokenize(events)) {
    // Empty
  }

  return events
}

/**
 * Turn the number (in string form as either hexa- or plain decimal) coming from
 * a numeric character reference into a character.
 *
 * @param {string} value
 *   Value to decode.
 * @param {number} base
 *   Numeric base.
 * @returns {string}
 */
function decodeNumericCharacterReference(value, base) {
  const code = Number.parseInt(value, base);

  if (
    // C0 except for HT, LF, FF, CR, space
    code < 9 ||
    code === 11 ||
    (code > 13 && code < 32) || // Control character (DEL) of the basic block and C1 controls.
    (code > 126 && code < 160) || // Lone high surrogates and low surrogates.
    (code > 55295 && code < 57344) || // Noncharacters.
    (code > 64975 && code < 65008) ||
    (code & 65535) === 65535 ||
    (code & 65535) === 65534 || // Out of range
    code > 1114111
  ) {
    return '\uFFFD'
  }

  return String.fromCharCode(code)
}

const characterEscapeOrReference =
  /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
/**
 * Utility to decode markdown strings (which occur in places such as fenced
 * code info strings, destinations, labels, and titles).
 * The “string” content type allows character escapes and -references.
 * This decodes those.
 *
 * @param {string} value
 * @returns {string}
 */

function decodeString(value) {
  return value.replace(characterEscapeOrReference, decode)
}
/**
 * @param {string} $0
 * @param {string} $1
 * @param {string} $2
 * @returns {string}
 */

function decode($0, $1, $2) {
  if ($1) {
    // Escape.
    return $1
  } // Reference.

  const head = $2.charCodeAt(0);

  if (head === 35) {
    const head = $2.charCodeAt(1);
    const hex = head === 120 || head === 88;
    return decodeNumericCharacterReference($2.slice(hex ? 2 : 1), hex ? 16 : 10)
  }

  return decodeNamedCharacterReference($2) || $0
}

/**
 * @typedef {import('micromark-util-types').Encoding} Encoding
 * @typedef {import('micromark-util-types').Event} Event
 * @typedef {import('micromark-util-types').ParseOptions} ParseOptions
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').TokenizeContext} TokenizeContext
 * @typedef {import('micromark-util-types').Value} Value
 *
 * @typedef {import('unist').Parent} UnistParent
 * @typedef {import('unist').Point} Point
 *
 * @typedef {import('mdast').PhrasingContent} PhrasingContent
 * @typedef {import('mdast').StaticPhrasingContent} StaticPhrasingContent
 * @typedef {import('mdast').Content} Content
 * @typedef {import('mdast').Break} Break
 * @typedef {import('mdast').Blockquote} Blockquote
 * @typedef {import('mdast').Code} Code
 * @typedef {import('mdast').Definition} Definition
 * @typedef {import('mdast').Emphasis} Emphasis
 * @typedef {import('mdast').Heading} Heading
 * @typedef {import('mdast').HTML} HTML
 * @typedef {import('mdast').Image} Image
 * @typedef {import('mdast').ImageReference} ImageReference
 * @typedef {import('mdast').InlineCode} InlineCode
 * @typedef {import('mdast').Link} Link
 * @typedef {import('mdast').LinkReference} LinkReference
 * @typedef {import('mdast').List} List
 * @typedef {import('mdast').ListItem} ListItem
 * @typedef {import('mdast').Paragraph} Paragraph
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast').Strong} Strong
 * @typedef {import('mdast').Text} Text
 * @typedef {import('mdast').ThematicBreak} ThematicBreak
 * @typedef {import('mdast').ReferenceType} ReferenceType
 * @typedef {import('../index.js').CompileData} CompileData
 */
const own$5 = {}.hasOwnProperty;

/**
 * @param value
 *   Markdown to parse.
 * @param encoding
 *   Character encoding for when `value` is `Buffer`.
 * @param options
 *   Configuration.
 * @returns
 *   mdast tree.
 */
const fromMarkdown =
  /**
   * @type {(
   *   ((value: Value, encoding: Encoding, options?: Options | null | undefined) => Root) &
   *   ((value: Value, options?: Options | null | undefined) => Root)
   * )}
   */

  /**
   * @param {Value} value
   * @param {Encoding | Options | null | undefined} [encoding]
   * @param {Options | null | undefined} [options]
   * @returns {Root}
   */
  function (value, encoding, options) {
    if (typeof encoding !== 'string') {
      options = encoding;
      encoding = undefined;
    }
    return compiler(options)(
      postprocess(
        // @ts-expect-error: micromark types need to accept `null`.
        parse$1(options).document().write(preprocess()(value, encoding, true))
      )
    )
  };

/**
 * Note this compiler only understand complete buffering, not streaming.
 *
 * @param {Options | null | undefined} [options]
 */
function compiler(options) {
  /** @type {Config} */
  const config = {
    transforms: [],
    canContainEols: ['emphasis', 'fragment', 'heading', 'paragraph', 'strong'],
    enter: {
      autolink: opener(link),
      autolinkProtocol: onenterdata,
      autolinkEmail: onenterdata,
      atxHeading: opener(heading),
      blockQuote: opener(blockQuote),
      characterEscape: onenterdata,
      characterReference: onenterdata,
      codeFenced: opener(codeFlow),
      codeFencedFenceInfo: buffer,
      codeFencedFenceMeta: buffer,
      codeIndented: opener(codeFlow, buffer),
      codeText: opener(codeText, buffer),
      codeTextData: onenterdata,
      data: onenterdata,
      codeFlowValue: onenterdata,
      definition: opener(definition),
      definitionDestinationString: buffer,
      definitionLabelString: buffer,
      definitionTitleString: buffer,
      emphasis: opener(emphasis),
      hardBreakEscape: opener(hardBreak),
      hardBreakTrailing: opener(hardBreak),
      htmlFlow: opener(html, buffer),
      htmlFlowData: onenterdata,
      htmlText: opener(html, buffer),
      htmlTextData: onenterdata,
      image: opener(image),
      label: buffer,
      link: opener(link),
      listItem: opener(listItem),
      listItemValue: onenterlistitemvalue,
      listOrdered: opener(list, onenterlistordered),
      listUnordered: opener(list),
      paragraph: opener(paragraph),
      reference: onenterreference,
      referenceString: buffer,
      resourceDestinationString: buffer,
      resourceTitleString: buffer,
      setextHeading: opener(heading),
      strong: opener(strong),
      thematicBreak: opener(thematicBreak)
    },
    exit: {
      atxHeading: closer(),
      atxHeadingSequence: onexitatxheadingsequence,
      autolink: closer(),
      autolinkEmail: onexitautolinkemail,
      autolinkProtocol: onexitautolinkprotocol,
      blockQuote: closer(),
      characterEscapeValue: onexitdata,
      characterReferenceMarkerHexadecimal: onexitcharacterreferencemarker,
      characterReferenceMarkerNumeric: onexitcharacterreferencemarker,
      characterReferenceValue: onexitcharacterreferencevalue,
      codeFenced: closer(onexitcodefenced),
      codeFencedFence: onexitcodefencedfence,
      codeFencedFenceInfo: onexitcodefencedfenceinfo,
      codeFencedFenceMeta: onexitcodefencedfencemeta,
      codeFlowValue: onexitdata,
      codeIndented: closer(onexitcodeindented),
      codeText: closer(onexitcodetext),
      codeTextData: onexitdata,
      data: onexitdata,
      definition: closer(),
      definitionDestinationString: onexitdefinitiondestinationstring,
      definitionLabelString: onexitdefinitionlabelstring,
      definitionTitleString: onexitdefinitiontitlestring,
      emphasis: closer(),
      hardBreakEscape: closer(onexithardbreak),
      hardBreakTrailing: closer(onexithardbreak),
      htmlFlow: closer(onexithtmlflow),
      htmlFlowData: onexitdata,
      htmlText: closer(onexithtmltext),
      htmlTextData: onexitdata,
      image: closer(onexitimage),
      label: onexitlabel,
      labelText: onexitlabeltext,
      lineEnding: onexitlineending,
      link: closer(onexitlink),
      listItem: closer(),
      listOrdered: closer(),
      listUnordered: closer(),
      paragraph: closer(),
      referenceString: onexitreferencestring,
      resourceDestinationString: onexitresourcedestinationstring,
      resourceTitleString: onexitresourcetitlestring,
      resource: onexitresource,
      setextHeading: closer(onexitsetextheading),
      setextHeadingLineSequence: onexitsetextheadinglinesequence,
      setextHeadingText: onexitsetextheadingtext,
      strong: closer(),
      thematicBreak: closer()
    }
  };
  configure(config, (options || {}).mdastExtensions || []);

  /** @type {CompileData} */
  const data = {};
  return compile

  /**
   * Turn micromark events into an mdast tree.
   *
   * @param {Array<Event>} events
   *   Events.
   * @returns {Root}
   *   mdast tree.
   */
  function compile(events) {
    /** @type {Root} */
    let tree = {
      type: 'root',
      children: []
    };
    /** @type {Omit<CompileContext, 'sliceSerialize'>} */
    const context = {
      stack: [tree],
      tokenStack: [],
      config,
      enter,
      exit,
      buffer,
      resume,
      setData,
      getData
    };
    /** @type {Array<number>} */
    const listStack = [];
    let index = -1;
    while (++index < events.length) {
      // We preprocess lists to add `listItem` tokens, and to infer whether
      // items the list itself are spread out.
      if (
        events[index][1].type === 'listOrdered' ||
        events[index][1].type === 'listUnordered'
      ) {
        if (events[index][0] === 'enter') {
          listStack.push(index);
        } else {
          const tail = listStack.pop();
          index = prepareList(events, tail, index);
        }
      }
    }
    index = -1;
    while (++index < events.length) {
      const handler = config[events[index][0]];
      if (own$5.call(handler, events[index][1].type)) {
        handler[events[index][1].type].call(
          Object.assign(
            {
              sliceSerialize: events[index][2].sliceSerialize
            },
            context
          ),
          events[index][1]
        );
      }
    }

    // Handle tokens still being open.
    if (context.tokenStack.length > 0) {
      const tail = context.tokenStack[context.tokenStack.length - 1];
      const handler = tail[1] || defaultOnError;
      handler.call(context, undefined, tail[0]);
    }

    // Figure out `root` position.
    tree.position = {
      start: point$1(
        events.length > 0
          ? events[0][1].start
          : {
              line: 1,
              column: 1,
              offset: 0
            }
      ),
      end: point$1(
        events.length > 0
          ? events[events.length - 2][1].end
          : {
              line: 1,
              column: 1,
              offset: 0
            }
      )
    };

    // Call transforms.
    index = -1;
    while (++index < config.transforms.length) {
      tree = config.transforms[index](tree) || tree;
    }
    return tree
  }

  /**
   * @param {Array<Event>} events
   * @param {number} start
   * @param {number} length
   * @returns {number}
   */
  function prepareList(events, start, length) {
    let index = start - 1;
    let containerBalance = -1;
    let listSpread = false;
    /** @type {Token | undefined} */
    let listItem;
    /** @type {number | undefined} */
    let lineIndex;
    /** @type {number | undefined} */
    let firstBlankLineIndex;
    /** @type {boolean | undefined} */
    let atMarker;
    while (++index <= length) {
      const event = events[index];
      if (
        event[1].type === 'listUnordered' ||
        event[1].type === 'listOrdered' ||
        event[1].type === 'blockQuote'
      ) {
        if (event[0] === 'enter') {
          containerBalance++;
        } else {
          containerBalance--;
        }
        atMarker = undefined;
      } else if (event[1].type === 'lineEndingBlank') {
        if (event[0] === 'enter') {
          if (
            listItem &&
            !atMarker &&
            !containerBalance &&
            !firstBlankLineIndex
          ) {
            firstBlankLineIndex = index;
          }
          atMarker = undefined;
        }
      } else if (
        event[1].type === 'linePrefix' ||
        event[1].type === 'listItemValue' ||
        event[1].type === 'listItemMarker' ||
        event[1].type === 'listItemPrefix' ||
        event[1].type === 'listItemPrefixWhitespace'
      ) ; else {
        atMarker = undefined;
      }
      if (
        (!containerBalance &&
          event[0] === 'enter' &&
          event[1].type === 'listItemPrefix') ||
        (containerBalance === -1 &&
          event[0] === 'exit' &&
          (event[1].type === 'listUnordered' ||
            event[1].type === 'listOrdered'))
      ) {
        if (listItem) {
          let tailIndex = index;
          lineIndex = undefined;
          while (tailIndex--) {
            const tailEvent = events[tailIndex];
            if (
              tailEvent[1].type === 'lineEnding' ||
              tailEvent[1].type === 'lineEndingBlank'
            ) {
              if (tailEvent[0] === 'exit') continue
              if (lineIndex) {
                events[lineIndex][1].type = 'lineEndingBlank';
                listSpread = true;
              }
              tailEvent[1].type = 'lineEnding';
              lineIndex = tailIndex;
            } else if (
              tailEvent[1].type === 'linePrefix' ||
              tailEvent[1].type === 'blockQuotePrefix' ||
              tailEvent[1].type === 'blockQuotePrefixWhitespace' ||
              tailEvent[1].type === 'blockQuoteMarker' ||
              tailEvent[1].type === 'listItemIndent'
            ) ; else {
              break
            }
          }
          if (
            firstBlankLineIndex &&
            (!lineIndex || firstBlankLineIndex < lineIndex)
          ) {
            // @ts-expect-error Patched.
            listItem._spread = true;
          }

          // Fix position.
          listItem.end = Object.assign(
            {},
            lineIndex ? events[lineIndex][1].start : event[1].end
          );
          events.splice(lineIndex || index, 0, ['exit', listItem, event[2]]);
          index++;
          length++;
        }

        // Create a new list item.
        if (event[1].type === 'listItemPrefix') {
          listItem = {
            type: 'listItem',
            // @ts-expect-error Patched
            _spread: false,
            start: Object.assign({}, event[1].start)
          };
          // @ts-expect-error: `listItem` is most definitely defined, TS...
          events.splice(index, 0, ['enter', listItem, event[2]]);
          index++;
          length++;
          firstBlankLineIndex = undefined;
          atMarker = true;
        }
      }
    }

    // @ts-expect-error Patched.
    events[start][1]._spread = listSpread;
    return length
  }

  /**
   * Set data.
   *
   * @template {keyof CompileData} Key
   *   Field type.
   * @param {Key} key
   *   Key of field.
   * @param {CompileData[Key]} [value]
   *   New value.
   * @returns {void}
   *   Nothing.
   */
  function setData(key, value) {
    data[key] = value;
  }

  /**
   * Get data.
   *
   * @template {keyof CompileData} Key
   *   Field type.
   * @param {Key} key
   *   Key of field.
   * @returns {CompileData[Key]}
   *   Value.
   */
  function getData(key) {
    return data[key]
  }

  /**
   * Create an opener handle.
   *
   * @param {(token: Token) => Node} create
   *   Create a node.
   * @param {Handle} [and]
   *   Optional function to also run.
   * @returns {Handle}
   *   Handle.
   */
  function opener(create, and) {
    return open

    /**
     * @this {CompileContext}
     * @param {Token} token
     * @returns {void}
     */
    function open(token) {
      enter.call(this, create(token), token);
      if (and) and.call(this, token);
    }
  }

  /**
   * @this {CompileContext}
   * @returns {void}
   */
  function buffer() {
    this.stack.push({
      type: 'fragment',
      children: []
    });
  }

  /**
   * @template {Node} Kind
   *   Node type.
   * @this {CompileContext}
   *   Context.
   * @param {Kind} node
   *   Node to enter.
   * @param {Token} token
   *   Corresponding token.
   * @param {OnEnterError | undefined} [errorHandler]
   *   Handle the case where this token is open, but it is closed by something else.
   * @returns {Kind}
   *   The given node.
   */
  function enter(node, token, errorHandler) {
    const parent = this.stack[this.stack.length - 1];
    // @ts-expect-error: Assume `Node` can exist as a child of `parent`.
    parent.children.push(node);
    this.stack.push(node);
    this.tokenStack.push([token, errorHandler]);
    // @ts-expect-error: `end` will be patched later.
    node.position = {
      start: point$1(token.start)
    };
    return node
  }

  /**
   * Create a closer handle.
   *
   * @param {Handle} [and]
   *   Optional function to also run.
   * @returns {Handle}
   *   Handle.
   */
  function closer(and) {
    return close

    /**
     * @this {CompileContext}
     * @param {Token} token
     * @returns {void}
     */
    function close(token) {
      if (and) and.call(this, token);
      exit.call(this, token);
    }
  }

  /**
   * @this {CompileContext}
   *   Context.
   * @param {Token} token
   *   Corresponding token.
   * @param {OnExitError | undefined} [onExitError]
   *   Handle the case where another token is open.
   * @returns {Node}
   *   The closed node.
   */
  function exit(token, onExitError) {
    const node = this.stack.pop();
    const open = this.tokenStack.pop();
    if (!open) {
      throw new Error(
        'Cannot close `' +
          token.type +
          '` (' +
          stringifyPosition({
            start: token.start,
            end: token.end
          }) +
          '): it’s not open'
      )
    } else if (open[0].type !== token.type) {
      if (onExitError) {
        onExitError.call(this, token, open[0]);
      } else {
        const handler = open[1] || defaultOnError;
        handler.call(this, token, open[0]);
      }
    }
    node.position.end = point$1(token.end);
    return node
  }

  /**
   * @this {CompileContext}
   * @returns {string}
   */
  function resume() {
    return toString(this.stack.pop())
  }

  //
  // Handlers.
  //

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onenterlistordered() {
    setData('expectingFirstListItemValue', true);
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onenterlistitemvalue(token) {
    if (getData('expectingFirstListItemValue')) {
      const ancestor = this.stack[this.stack.length - 2];
      ancestor.start = Number.parseInt(this.sliceSerialize(token), 10);
      setData('expectingFirstListItemValue');
    }
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitcodefencedfenceinfo() {
    const data = this.resume();
    const node = this.stack[this.stack.length - 1];
    node.lang = data;
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitcodefencedfencemeta() {
    const data = this.resume();
    const node = this.stack[this.stack.length - 1];
    node.meta = data;
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitcodefencedfence() {
    // Exit if this is the closing fence.
    if (getData('flowCodeInside')) return
    this.buffer();
    setData('flowCodeInside', true);
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitcodefenced() {
    const data = this.resume();
    const node = this.stack[this.stack.length - 1];
    node.value = data.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, '');
    setData('flowCodeInside');
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitcodeindented() {
    const data = this.resume();
    const node = this.stack[this.stack.length - 1];
    node.value = data.replace(/(\r?\n|\r)$/g, '');
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitdefinitionlabelstring(token) {
    const label = this.resume();
    const node = this.stack[this.stack.length - 1];
    node.label = label;
    node.identifier = normalizeIdentifier(
      this.sliceSerialize(token)
    ).toLowerCase();
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitdefinitiontitlestring() {
    const data = this.resume();
    const node = this.stack[this.stack.length - 1];
    node.title = data;
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitdefinitiondestinationstring() {
    const data = this.resume();
    const node = this.stack[this.stack.length - 1];
    node.url = data;
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitatxheadingsequence(token) {
    const node = this.stack[this.stack.length - 1];
    if (!node.depth) {
      const depth = this.sliceSerialize(token).length;
      node.depth = depth;
    }
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitsetextheadingtext() {
    setData('setextHeadingSlurpLineEnding', true);
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitsetextheadinglinesequence(token) {
    const node = this.stack[this.stack.length - 1];
    node.depth = this.sliceSerialize(token).charCodeAt(0) === 61 ? 1 : 2;
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitsetextheading() {
    setData('setextHeadingSlurpLineEnding');
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onenterdata(token) {
    const node = this.stack[this.stack.length - 1];
    let tail = node.children[node.children.length - 1];
    if (!tail || tail.type !== 'text') {
      // Add a new text node.
      tail = text();
      // @ts-expect-error: we’ll add `end` later.
      tail.position = {
        start: point$1(token.start)
      };
      // @ts-expect-error: Assume `parent` accepts `text`.
      node.children.push(tail);
    }
    this.stack.push(tail);
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexitdata(token) {
    const tail = this.stack.pop();
    tail.value += this.sliceSerialize(token);
    tail.position.end = point$1(token.end);
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexitlineending(token) {
    const context = this.stack[this.stack.length - 1];
    // If we’re at a hard break, include the line ending in there.
    if (getData('atHardBreak')) {
      const tail = context.children[context.children.length - 1];
      tail.position.end = point$1(token.end);
      setData('atHardBreak');
      return
    }
    if (
      !getData('setextHeadingSlurpLineEnding') &&
      config.canContainEols.includes(context.type)
    ) {
      onenterdata.call(this, token);
      onexitdata.call(this, token);
    }
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexithardbreak() {
    setData('atHardBreak', true);
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexithtmlflow() {
    const data = this.resume();
    const node = this.stack[this.stack.length - 1];
    node.value = data;
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexithtmltext() {
    const data = this.resume();
    const node = this.stack[this.stack.length - 1];
    node.value = data;
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexitcodetext() {
    const data = this.resume();
    const node = this.stack[this.stack.length - 1];
    node.value = data;
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexitlink() {
    const node = this.stack[this.stack.length - 1];
    // Note: there are also `identifier` and `label` fields on this link node!
    // These are used / cleaned here.

    // To do: clean.
    if (getData('inReference')) {
      /** @type {ReferenceType} */
      const referenceType = getData('referenceType') || 'shortcut';
      node.type += 'Reference';
      // @ts-expect-error: mutate.
      node.referenceType = referenceType;
      // @ts-expect-error: mutate.
      delete node.url;
      delete node.title;
    } else {
      // @ts-expect-error: mutate.
      delete node.identifier;
      // @ts-expect-error: mutate.
      delete node.label;
    }
    setData('referenceType');
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexitimage() {
    const node = this.stack[this.stack.length - 1];
    // Note: there are also `identifier` and `label` fields on this link node!
    // These are used / cleaned here.

    // To do: clean.
    if (getData('inReference')) {
      /** @type {ReferenceType} */
      const referenceType = getData('referenceType') || 'shortcut';
      node.type += 'Reference';
      // @ts-expect-error: mutate.
      node.referenceType = referenceType;
      // @ts-expect-error: mutate.
      delete node.url;
      delete node.title;
    } else {
      // @ts-expect-error: mutate.
      delete node.identifier;
      // @ts-expect-error: mutate.
      delete node.label;
    }
    setData('referenceType');
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexitlabeltext(token) {
    const string = this.sliceSerialize(token);
    const ancestor = this.stack[this.stack.length - 2];
    // @ts-expect-error: stash this on the node, as it might become a reference
    // later.
    ancestor.label = decodeString(string);
    // @ts-expect-error: same as above.
    ancestor.identifier = normalizeIdentifier(string).toLowerCase();
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexitlabel() {
    const fragment = this.stack[this.stack.length - 1];
    const value = this.resume();
    const node = this.stack[this.stack.length - 1];
    // Assume a reference.
    setData('inReference', true);
    if (node.type === 'link') {
      /** @type {Array<StaticPhrasingContent>} */
      // @ts-expect-error: Assume static phrasing content.
      const children = fragment.children;
      node.children = children;
    } else {
      node.alt = value;
    }
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexitresourcedestinationstring() {
    const data = this.resume();
    const node = this.stack[this.stack.length - 1];
    node.url = data;
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexitresourcetitlestring() {
    const data = this.resume();
    const node = this.stack[this.stack.length - 1];
    node.title = data;
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexitresource() {
    setData('inReference');
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onenterreference() {
    setData('referenceType', 'collapsed');
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexitreferencestring(token) {
    const label = this.resume();
    const node = this.stack[this.stack.length - 1];
    // @ts-expect-error: stash this on the node, as it might become a reference
    // later.
    node.label = label;
    // @ts-expect-error: same as above.
    node.identifier = normalizeIdentifier(
      this.sliceSerialize(token)
    ).toLowerCase();
    setData('referenceType', 'full');
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */

  function onexitcharacterreferencemarker(token) {
    setData('characterReferenceType', token.type);
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitcharacterreferencevalue(token) {
    const data = this.sliceSerialize(token);
    const type = getData('characterReferenceType');
    /** @type {string} */
    let value;
    if (type) {
      value = decodeNumericCharacterReference(
        data,
        type === 'characterReferenceMarkerNumeric' ? 10 : 16
      );
      setData('characterReferenceType');
    } else {
      const result = decodeNamedCharacterReference(data);
      value = result;
    }
    const tail = this.stack.pop();
    tail.value += value;
    tail.position.end = point$1(token.end);
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitautolinkprotocol(token) {
    onexitdata.call(this, token);
    const node = this.stack[this.stack.length - 1];
    node.url = this.sliceSerialize(token);
  }

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function onexitautolinkemail(token) {
    onexitdata.call(this, token);
    const node = this.stack[this.stack.length - 1];
    node.url = 'mailto:' + this.sliceSerialize(token);
  }

  //
  // Creaters.
  //

  /** @returns {Blockquote} */
  function blockQuote() {
    return {
      type: 'blockquote',
      children: []
    }
  }

  /** @returns {Code} */
  function codeFlow() {
    return {
      type: 'code',
      lang: null,
      meta: null,
      value: ''
    }
  }

  /** @returns {InlineCode} */
  function codeText() {
    return {
      type: 'inlineCode',
      value: ''
    }
  }

  /** @returns {Definition} */
  function definition() {
    return {
      type: 'definition',
      identifier: '',
      label: null,
      title: null,
      url: ''
    }
  }

  /** @returns {Emphasis} */
  function emphasis() {
    return {
      type: 'emphasis',
      children: []
    }
  }

  /** @returns {Heading} */
  function heading() {
    // @ts-expect-error `depth` will be set later.
    return {
      type: 'heading',
      depth: undefined,
      children: []
    }
  }

  /** @returns {Break} */
  function hardBreak() {
    return {
      type: 'break'
    }
  }

  /** @returns {HTML} */
  function html() {
    return {
      type: 'html',
      value: ''
    }
  }

  /** @returns {Image} */
  function image() {
    return {
      type: 'image',
      title: null,
      url: '',
      alt: null
    }
  }

  /** @returns {Link} */
  function link() {
    return {
      type: 'link',
      title: null,
      url: '',
      children: []
    }
  }

  /**
   * @param {Token} token
   * @returns {List}
   */
  function list(token) {
    return {
      type: 'list',
      ordered: token.type === 'listOrdered',
      start: null,
      // @ts-expect-error Patched.
      spread: token._spread,
      children: []
    }
  }

  /**
   * @param {Token} token
   * @returns {ListItem}
   */
  function listItem(token) {
    return {
      type: 'listItem',
      // @ts-expect-error Patched.
      spread: token._spread,
      checked: null,
      children: []
    }
  }

  /** @returns {Paragraph} */
  function paragraph() {
    return {
      type: 'paragraph',
      children: []
    }
  }

  /** @returns {Strong} */
  function strong() {
    return {
      type: 'strong',
      children: []
    }
  }

  /** @returns {Text} */
  function text() {
    return {
      type: 'text',
      value: ''
    }
  }

  /** @returns {ThematicBreak} */
  function thematicBreak() {
    return {
      type: 'thematicBreak'
    }
  }
}

/**
 * Copy a point-like value.
 *
 * @param {Point} d
 *   Point-like value.
 * @returns {Point}
 *   unist point.
 */
function point$1(d) {
  return {
    line: d.line,
    column: d.column,
    offset: d.offset
  }
}

/**
 * @param {Config} combined
 * @param {Array<Extension | Array<Extension>>} extensions
 * @returns {void}
 */
function configure(combined, extensions) {
  let index = -1;
  while (++index < extensions.length) {
    const value = extensions[index];
    if (Array.isArray(value)) {
      configure(combined, value);
    } else {
      extension(combined, value);
    }
  }
}

/**
 * @param {Config} combined
 * @param {Extension} extension
 * @returns {void}
 */
function extension(combined, extension) {
  /** @type {keyof Extension} */
  let key;
  for (key in extension) {
    if (own$5.call(extension, key)) {
      if (key === 'canContainEols') {
        const right = extension[key];
        if (right) {
          combined[key].push(...right);
        }
      } else if (key === 'transforms') {
        const right = extension[key];
        if (right) {
          combined[key].push(...right);
        }
      } else if (key === 'enter' || key === 'exit') {
        const right = extension[key];
        if (right) {
          Object.assign(combined[key], right);
        }
      }
    }
  }
}

/** @type {OnEnterError} */
function defaultOnError(left, right) {
  if (left) {
    throw new Error(
      'Cannot close `' +
        left.type +
        '` (' +
        stringifyPosition({
          start: left.start,
          end: left.end
        }) +
        '): a different token (`' +
        right.type +
        '`, ' +
        stringifyPosition({
          start: right.start,
          end: right.end
        }) +
        ') is open'
    )
  } else {
    throw new Error(
      'Cannot close document, a token (`' +
        right.type +
        '`, ' +
        stringifyPosition({
          start: right.start,
          end: right.end
        }) +
        ') is still open'
    )
  }
}

/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast-util-from-markdown').Options} Options
 */

/** @type {import('unified').Plugin<[Options?] | void[], string, Root>} */
function remarkParse(options) {
  /** @type {import('unified').ParserFunction<Root>} */
  const parser = (doc) => {
    // Assume options.
    const settings = /** @type {Options} */ (this.data('settings'));

    return fromMarkdown(
      doc,
      Object.assign({}, settings, options, {
        // Note: these options are not in the readme.
        // The goal is for them to be set by plugins on `data` instead of being
        // passed by users.
        extensions: this.data('micromarkExtensions') || [],
        mdastExtensions: this.data('fromMarkdownExtensions') || []
      })
    )
  };

  Object.assign(this, {Parser: parser});
}

/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('unist').Parent} Parent
 */

/**
 * Generate an assertion from a test.
 *
 * Useful if you’re going to test many nodes, for example when creating a
 * utility where something else passes a compatible test.
 *
 * The created function is a bit faster because it expects valid input only:
 * a `node`, `index`, and `parent`.
 *
 * @param test
 *   *   when nullish, checks if `node` is a `Node`.
 *   *   when `string`, works like passing `(node) => node.type === test`.
 *   *   when `function` checks if function passed the node is true.
 *   *   when `object`, checks that all keys in test are in node, and that they have (strictly) equal values.
 *   *   when `array`, checks if any one of the subtests pass.
 * @returns
 *   An assertion.
 */
const convert =
  /**
   * @type {(
   *   (<Kind extends Node>(test: PredicateTest<Kind>) => AssertPredicate<Kind>) &
   *   ((test?: Test) => AssertAnything)
   * )}
   */
  (
    /**
     * @param {Test} [test]
     * @returns {AssertAnything}
     */
    function (test) {
      if (test === undefined || test === null) {
        return ok
      }

      if (typeof test === 'string') {
        return typeFactory(test)
      }

      if (typeof test === 'object') {
        return Array.isArray(test) ? anyFactory(test) : propsFactory(test)
      }

      if (typeof test === 'function') {
        return castFactory(test)
      }

      throw new Error('Expected function, string, or object as test')
    }
  );

/**
 * @param {Array<string | Props | TestFunctionAnything>} tests
 * @returns {AssertAnything}
 */
function anyFactory(tests) {
  /** @type {Array<AssertAnything>} */
  const checks = [];
  let index = -1;

  while (++index < tests.length) {
    checks[index] = convert(tests[index]);
  }

  return castFactory(any)

  /**
   * @this {unknown}
   * @param {Array<unknown>} parameters
   * @returns {boolean}
   */
  function any(...parameters) {
    let index = -1;

    while (++index < checks.length) {
      if (checks[index].call(this, ...parameters)) return true
    }

    return false
  }
}

/**
 * Turn an object into a test for a node with a certain fields.
 *
 * @param {Props} check
 * @returns {AssertAnything}
 */
function propsFactory(check) {
  return castFactory(all)

  /**
   * @param {Node} node
   * @returns {boolean}
   */
  function all(node) {
    /** @type {string} */
    let key;

    for (key in check) {
      // @ts-expect-error: hush, it sure works as an index.
      if (node[key] !== check[key]) return false
    }

    return true
  }
}

/**
 * Turn a string into a test for a node with a certain type.
 *
 * @param {string} check
 * @returns {AssertAnything}
 */
function typeFactory(check) {
  return castFactory(type)

  /**
   * @param {Node} node
   */
  function type(node) {
    return node && node.type === check
  }
}

/**
 * Turn a custom test into a test for a node that passes that test.
 *
 * @param {TestFunctionAnything} check
 * @returns {AssertAnything}
 */
function castFactory(check) {
  return assertion

  /**
   * @this {unknown}
   * @param {unknown} node
   * @param {Array<unknown>} parameters
   * @returns {boolean}
   */
  function assertion(node, ...parameters) {
    return Boolean(
      node &&
        typeof node === 'object' &&
        'type' in node &&
        // @ts-expect-error: fine.
        Boolean(check.call(this, node, ...parameters))
    )
  }
}

function ok() {
  return true
}

/**
 * @param {string} d
 * @returns {string}
 */
function color(d) {
  return '\u001B[33m' + d + '\u001B[39m'
}

/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('unist').Parent} Parent
 * @typedef {import('unist-util-is').Test} Test
 */

/**
 * Continue traversing as normal.
 */
const CONTINUE = true;

/**
 * Stop traversing immediately.
 */
const EXIT = false;

/**
 * Do not traverse this node’s children.
 */
const SKIP = 'skip';

/**
 * Visit nodes, with ancestral information.
 *
 * This algorithm performs *depth-first* *tree traversal* in *preorder*
 * (**NLR**) or if `reverse` is given, in *reverse preorder* (**NRL**).
 *
 * You can choose for which nodes `visitor` is called by passing a `test`.
 * For complex tests, you should test yourself in `visitor`, as it will be
 * faster and will have improved type information.
 *
 * Walking the tree is an intensive task.
 * Make use of the return values of the visitor when possible.
 * Instead of walking a tree multiple times, walk it once, use `unist-util-is`
 * to check if a node matches, and then perform different operations.
 *
 * You can change the tree.
 * See `Visitor` for more info.
 *
 * @param tree
 *   Tree to traverse.
 * @param test
 *   `unist-util-is`-compatible test
 * @param visitor
 *   Handle each node.
 * @param reverse
 *   Traverse in reverse preorder (NRL) instead of the default preorder (NLR).
 * @returns
 *   Nothing.
 */
const visitParents =
  /**
   * @type {(
   *   (<Tree extends Node, Check extends Test>(tree: Tree, test: Check, visitor: BuildVisitor<Tree, Check>, reverse?: boolean | null | undefined) => void) &
   *   (<Tree extends Node>(tree: Tree, visitor: BuildVisitor<Tree>, reverse?: boolean | null | undefined) => void)
   * )}
   */
  (
    /**
     * @param {Node} tree
     * @param {Test} test
     * @param {Visitor<Node>} visitor
     * @param {boolean | null | undefined} [reverse]
     * @returns {void}
     */
    function (tree, test, visitor, reverse) {
      if (typeof test === 'function' && typeof visitor !== 'function') {
        reverse = visitor;
        // @ts-expect-error no visitor given, so `visitor` is test.
        visitor = test;
        test = null;
      }

      const is = convert(test);
      const step = reverse ? -1 : 1;

      factory(tree, undefined, [])();

      /**
       * @param {Node} node
       * @param {number | undefined} index
       * @param {Array<Parent>} parents
       */
      function factory(node, index, parents) {
        /** @type {Record<string, unknown>} */
        // @ts-expect-error: hush
        const value = node && typeof node === 'object' ? node : {};

        if (typeof value.type === 'string') {
          const name =
            // `hast`
            typeof value.tagName === 'string'
              ? value.tagName
              : // `xast`
              typeof value.name === 'string'
              ? value.name
              : undefined;

          Object.defineProperty(visit, 'name', {
            value:
              'node (' + color(node.type + (name ? '<' + name + '>' : '')) + ')'
          });
        }

        return visit

        function visit() {
          /** @type {ActionTuple} */
          let result = [];
          /** @type {ActionTuple} */
          let subresult;
          /** @type {number} */
          let offset;
          /** @type {Array<Parent>} */
          let grandparents;

          if (!test || is(node, index, parents[parents.length - 1] || null)) {
            result = toResult(visitor(node, parents));

            if (result[0] === EXIT) {
              return result
            }
          }

          // @ts-expect-error looks like a parent.
          if (node.children && result[0] !== SKIP) {
            // @ts-expect-error looks like a parent.
            offset = (reverse ? node.children.length : -1) + step;
            // @ts-expect-error looks like a parent.
            grandparents = parents.concat(node);

            // @ts-expect-error looks like a parent.
            while (offset > -1 && offset < node.children.length) {
              // @ts-expect-error looks like a parent.
              subresult = factory(node.children[offset], offset, grandparents)();

              if (subresult[0] === EXIT) {
                return subresult
              }

              offset =
                typeof subresult[1] === 'number' ? subresult[1] : offset + step;
            }
          }

          return result
        }
      }
    }
  );

/**
 * Turn a return value into a clean result.
 *
 * @param {VisitorResult} value
 *   Valid return values from visitors.
 * @returns {ActionTuple}
 *   Clean result.
 */
function toResult(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'number') {
    return [CONTINUE, value]
  }

  return [value]
}

/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('unist').Parent} Parent
 * @typedef {import('unist-util-is').Test} Test
 * @typedef {import('unist-util-visit-parents').VisitorResult} VisitorResult
 */

/**
 * Visit nodes.
 *
 * This algorithm performs *depth-first* *tree traversal* in *preorder*
 * (**NLR**) or if `reverse` is given, in *reverse preorder* (**NRL**).
 *
 * You can choose for which nodes `visitor` is called by passing a `test`.
 * For complex tests, you should test yourself in `visitor`, as it will be
 * faster and will have improved type information.
 *
 * Walking the tree is an intensive task.
 * Make use of the return values of the visitor when possible.
 * Instead of walking a tree multiple times, walk it once, use `unist-util-is`
 * to check if a node matches, and then perform different operations.
 *
 * You can change the tree.
 * See `Visitor` for more info.
 *
 * @param tree
 *   Tree to traverse.
 * @param test
 *   `unist-util-is`-compatible test
 * @param visitor
 *   Handle each node.
 * @param reverse
 *   Traverse in reverse preorder (NRL) instead of the default preorder (NLR).
 * @returns
 *   Nothing.
 */
const visit =
  /**
   * @type {(
   *   (<Tree extends Node, Check extends Test>(tree: Tree, test: Check, visitor: BuildVisitor<Tree, Check>, reverse?: boolean | null | undefined) => void) &
   *   (<Tree extends Node>(tree: Tree, visitor: BuildVisitor<Tree>, reverse?: boolean | null | undefined) => void)
   * )}
   */
  (
    /**
     * @param {Node} tree
     * @param {Test} test
     * @param {Visitor} visitor
     * @param {boolean | null | undefined} [reverse]
     * @returns {void}
     */
    function (tree, test, visitor, reverse) {
      if (typeof test === 'function' && typeof visitor !== 'function') {
        reverse = visitor;
        visitor = test;
        test = null;
      }

      visitParents(tree, test, overload, reverse);

      /**
       * @param {Node} node
       * @param {Array<Parent>} parents
       */
      function overload(node, parents) {
        const parent = parents[parents.length - 1];
        return visitor(
          node,
          parent ? parent.children.indexOf(node) : null,
          parent
        )
      }
    }
  );

/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast').PhrasingContent} PhrasingContent
 */

const find$1 = /[\t ]*(?:\r?\n|\r)/g;

/**
 * Plugin to support hard breaks without needing spaces or escapes (turns enters
 * into `<br>`s).
 *
 * @type {import('unified').Plugin<void[], Root>}
 */
function remarkBreaks() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      /** @type {PhrasingContent[]} */
      const result = [];
      let start = 0;

      find$1.lastIndex = 0;

      let match = find$1.exec(node.value);

      while (match) {
        const position = match.index;

        if (start !== position) {
          result.push({type: 'text', value: node.value.slice(start, position)});
        }

        result.push({type: 'break'});
        start = position + match[0].length;
        match = find$1.exec(node.value);
      }

      if (result.length > 0 && parent && typeof index === 'number') {
        if (start < node.value.length) {
          result.push({type: 'text', value: node.value.slice(start)});
        }

        parent.children.splice(index, 1, ...result);
        return index + result.length
      }
    });
  }
}

var formatExports = {};
var format = {
  get exports(){ return formatExports; },
  set exports(v){ formatExports = v; },
};

(function (module) {
(function() {

	  //// Export the API
	  var namespace;

	  // CommonJS / Node module
	  {
	    namespace = module.exports = format;
	  }

	  namespace.format = format;
	  namespace.vsprintf = vsprintf;

	  if (typeof console !== 'undefined' && typeof console.log === 'function') {
	    namespace.printf = printf;
	  }

	  function printf(/* ... */) {
	    console.log(format.apply(null, arguments));
	  }

	  function vsprintf(fmt, replacements) {
	    return format.apply(null, [fmt].concat(replacements));
	  }

	  function format(fmt) {
	    var argIndex = 1 // skip initial format argument
	      , args = [].slice.call(arguments)
	      , i = 0
	      , n = fmt.length
	      , result = ''
	      , c
	      , escaped = false
	      , arg
	      , tmp
	      , leadingZero = false
	      , precision
	      , nextArg = function() { return args[argIndex++]; }
	      , slurpNumber = function() {
	          var digits = '';
	          while (/\d/.test(fmt[i])) {
	            digits += fmt[i++];
	            c = fmt[i];
	          }
	          return digits.length > 0 ? parseInt(digits) : null;
	        }
	      ;
	    for (; i < n; ++i) {
	      c = fmt[i];
	      if (escaped) {
	        escaped = false;
	        if (c == '.') {
	          leadingZero = false;
	          c = fmt[++i];
	        }
	        else if (c == '0' && fmt[i + 1] == '.') {
	          leadingZero = true;
	          i += 2;
	          c = fmt[i];
	        }
	        else {
	          leadingZero = true;
	        }
	        precision = slurpNumber();
	        switch (c) {
	        case 'b': // number in binary
	          result += parseInt(nextArg(), 10).toString(2);
	          break;
	        case 'c': // character
	          arg = nextArg();
	          if (typeof arg === 'string' || arg instanceof String)
	            result += arg;
	          else
	            result += String.fromCharCode(parseInt(arg, 10));
	          break;
	        case 'd': // number in decimal
	          result += parseInt(nextArg(), 10);
	          break;
	        case 'f': // floating point number
	          tmp = String(parseFloat(nextArg()).toFixed(precision || 6));
	          result += leadingZero ? tmp : tmp.replace(/^0/, '');
	          break;
	        case 'j': // JSON
	          result += JSON.stringify(nextArg());
	          break;
	        case 'o': // number in octal
	          result += '0' + parseInt(nextArg(), 10).toString(8);
	          break;
	        case 's': // string
	          result += nextArg();
	          break;
	        case 'x': // lowercase hexadecimal
	          result += '0x' + parseInt(nextArg(), 10).toString(16);
	          break;
	        case 'X': // uppercase hexadecimal
	          result += '0x' + parseInt(nextArg(), 10).toString(16).toUpperCase();
	          break;
	        default:
	          result += c;
	          break;
	        }
	      } else if (c === '%') {
	        escaped = true;
	      } else {
	        result += c;
	      }
	    }
	    return result;
	  }

	}());
} (format));

var formatter = formatExports;

// @ts-expect-error

const fault = Object.assign(create(Error), {
  eval: create(EvalError),
  range: create(RangeError),
  reference: create(ReferenceError),
  syntax: create(SyntaxError),
  type: create(TypeError),
  uri: create(URIError)
});

/**
 * Create a new `EConstructor`, with the formatted `format` as a first argument.
 *
 * @template {Error} Fault
 * @template {new (reason: string) => Fault} Class
 * @param {Class} Constructor
 */
function create(Constructor) {
  /** @type {string} */
  // @ts-expect-error
  FormattedError.displayName = Constructor.displayName || Constructor.name;

  return FormattedError

  /**
   * Create an error with a printf-like formatted message.
   *
   * @param {string|null} [format]
   *   Template string.
   * @param {...unknown} values
   *   Values to render in `format`.
   * @returns {Fault}
   */
  function FormattedError(format, ...values) {
    /** @type {string} */
    const reason = format ? formatter(format, ...values) : format;
    return new Constructor(reason)
  }
}

/**
 * @typedef {'yaml'|'toml'} Preset
 *   Either `'yaml'` or `'toml'`.
 *
 * @typedef Info
 * @property {string} open
 * @property {string} close
 *
 * @typedef MatterProps
 * @property {string} type
 *   Type to tokenize as.
 * @property {boolean} [anywhere=false]
 *   If `true`, matter can be found anywhere in the document.
 *   If `false` (default), only matter at the start of the document is
 *   recognized.
 *
 * @typedef MarkerProps
 *   Marker configuration.
 * @property {string|Info} marker
 *   Character used to construct fences.
 *   By providing an object with `open` and `close` different characters can be
 *   used for opening and closing fences.
 *   For example the character `'-'` will result in `'---'` being used as the
 *   fence
 * @property {never} [fence]
 *   If `marker` is set, `fence` must not be set.
 *
 * @typedef FenceProps
 *   Fence configuration.
 * @property {string|Info} fence
 *   String used as the complete fence.
 *   By providing an object with `open` and `close` different values can be used
 *   for opening and closing fences.
 *   This can be used too if fences contain different characters or lengths
 *   other than 3.
 * @property {never} [marker]
 *   If `fence` is set, `marker` must not be set.
 *
 * @typedef {(MatterProps & FenceProps)|(MatterProps & MarkerProps)} Matter
 *   Matter object describing frontmatter.
 *
 * @typedef {Preset|Matter|Array<Preset|Matter>} Options
 *   Matter object or preset, or many.
 */
const own$4 = {}.hasOwnProperty;
const markers = {
  yaml: '-',
  toml: '+'
};

/**
 * @param {Options} [options='yaml']
 * @returns {Array<Matter>}
 */
function matters(options = 'yaml') {
  /** @type {Array<Matter>} */
  const results = [];
  let index = -1;

  // One preset or matter.
  if (!Array.isArray(options)) {
    options = [options];
  }
  while (++index < options.length) {
    results[index] = matter(options[index]);
  }
  return results
}

/**
 * @param {Preset|Matter} option
 * @returns {Matter}
 */
function matter(option) {
  let result = option;
  if (typeof result === 'string') {
    if (!own$4.call(markers, result)) {
      throw fault('Missing matter definition for `%s`', result)
    }
    result = {
      type: result,
      marker: markers[result]
    };
  } else if (typeof result !== 'object') {
    throw fault('Expected matter to be an object, not `%j`', result)
  }
  if (!own$4.call(result, 'type')) {
    throw fault('Missing `type` in matter `%j`', result)
  }
  if (!own$4.call(result, 'fence') && !own$4.call(result, 'marker')) {
    throw fault('Missing `marker` or `fence` in matter `%j`', result)
  }
  return result
}

/**
 * @typedef {import('micromark-util-types').Extension} Extension
 * @typedef {import('micromark-util-types').ConstructRecord} ConstructRecord
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').TokenizeContext} TokenizeContext
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('../matters.js').Options} Options
 * @typedef {import('../matters.js').Matter} Matter
 * @typedef {import('../matters.js').Info} Info
 */

/**
 * Add support for parsing frontmatter in markdown.
 *
 * Function that can be called to get a syntax extension for micromark (passed
 * in `extensions`).
 *
 * Supports YAML by default.
 * Can be configured to support TOML and more.
 *
 * @param {Options} [options='yaml']
 *   Configuration (optional).
 * @returns {Extension}
 *   Syntax extension for micromark (passed in `extensions`).
 */
function frontmatter(options) {
  const settings = matters(options);
  /** @type {ConstructRecord} */
  const flow = {};
  let index = -1;
  while (++index < settings.length) {
    const matter = settings[index];
    const code = fence$1(matter, 'open').charCodeAt(0);
    if (code in flow) {
      // @ts-expect-error it clearly does exist.
      flow[code].push(parse(matter));
    } else {
      flow[code] = [parse(matter)];
    }
  }
  return {
    flow
  }
}

/**
 * @param {Matter} matter
 * @returns {Construct}
 */
function parse(matter) {
  const name = matter.type;
  const anywhere = matter.anywhere;
  const valueType = name + 'Value';
  const fenceType = name + 'Fence';
  const sequenceType = fenceType + 'Sequence';
  const fenceConstruct = {
    tokenize: tokenizeFence,
    partial: true
  };
  /** @type {string} */
  let buffer;
  return {
    tokenize: tokenizeFrontmatter,
    concrete: true
  }

  /**
   * @this {TokenizeContext}
   * @type {Tokenizer}
   */
  function tokenizeFrontmatter(effects, ok, nok) {
    const self = this;
    return start

    /** @type {State} */
    function start(code) {
      const position = self.now();
      if (position.column !== 1 || (!anywhere && position.line !== 1)) {
        return nok(code)
      }
      effects.enter(name);
      buffer = fence$1(matter, 'open');
      return effects.attempt(fenceConstruct, afterOpeningFence, nok)(code)
    }

    /** @type {State} */
    function afterOpeningFence(code) {
      buffer = fence$1(matter, 'close');
      return lineEnd(code)
    }

    /** @type {State} */
    function lineStart(code) {
      if (code === null || markdownLineEnding(code)) {
        return lineEnd(code)
      }
      effects.enter(valueType);
      return lineData(code)
    }

    /** @type {State} */
    function lineData(code) {
      if (code === null || markdownLineEnding(code)) {
        effects.exit(valueType);
        return lineEnd(code)
      }
      effects.consume(code);
      return lineData
    }

    /** @type {State} */
    function lineEnd(code) {
      // Require a closing fence.
      if (code === null) {
        return nok(code)
      }

      // Can only be an eol.
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      return effects.attempt(fenceConstruct, after, lineStart)
    }

    /** @type {State} */
    function after(code) {
      effects.exit(name);
      return ok(code)
    }
  }

  /** @type {Tokenizer} */
  function tokenizeFence(effects, ok, nok) {
    let bufferIndex = 0;
    return start

    /** @type {State} */
    function start(code) {
      if (code === buffer.charCodeAt(bufferIndex)) {
        effects.enter(fenceType);
        effects.enter(sequenceType);
        return insideSequence(code)
      }
      return nok(code)
    }

    /** @type {State} */
    function insideSequence(code) {
      if (bufferIndex === buffer.length) {
        effects.exit(sequenceType);
        if (markdownSpace(code)) {
          effects.enter('whitespace');
          return insideWhitespace(code)
        }
        return fenceEnd(code)
      }
      if (code === buffer.charCodeAt(bufferIndex++)) {
        effects.consume(code);
        return insideSequence
      }
      return nok(code)
    }

    /** @type {State} */
    function insideWhitespace(code) {
      if (markdownSpace(code)) {
        effects.consume(code);
        return insideWhitespace
      }
      effects.exit('whitespace');
      return fenceEnd(code)
    }

    /** @type {State} */
    function fenceEnd(code) {
      if (code === null || markdownLineEnding(code)) {
        effects.exit(fenceType);
        return ok(code)
      }
      return nok(code)
    }
  }
}

/**
 * @param {Matter} matter
 * @param {'open'|'close'} prop
 * @returns {string}
 */
function fence$1(matter, prop) {
  return matter.marker
    ? pick$1(matter.marker, prop).repeat(3)
    : // @ts-expect-error: They’re mutually exclusive.
      pick$1(matter.fence, prop)
}

/**
 * @param {Info|string} schema
 * @param {'open'|'close'} prop
 * @returns {string}
 */
function pick$1(schema, prop) {
  return typeof schema === 'string' ? schema : schema[prop]
}

/**
 * @typedef {import('mdast').Literal} Literal
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-from-markdown').CompileContext} CompileContext
 * @typedef {import('mdast-util-from-markdown').Handle} FromMarkdownHandle
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownExtension
 *
 * @typedef {import('micromark-extension-frontmatter').Options} Options
 * @typedef {import('micromark-extension-frontmatter/matters.js').Matter} Matter
 * @typedef {import('micromark-extension-frontmatter/matters.js').Info} Info
 */

/**
 * Create an extension for `mdast-util-from-markdown`.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration.
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown`.
 */
function frontmatterFromMarkdown(options) {
  // @ts-expect-error: `micromark-extension-frontmatter` should fix types to
  // accept `null` as options.
  const settings = matters(options);
  /** @type {FromMarkdownExtension['enter']} */
  const enter = {};
  /** @type {FromMarkdownExtension['exit']} */
  const exit = {};
  let index = -1;

  while (++index < settings.length) {
    const matter = settings[index];
    enter[matter.type] = opener(matter);
    exit[matter.type] = close;
    exit[matter.type + 'Value'] = value;
  }

  return {enter, exit}
}

/**
 * @param {Matter} matter
 * @returns {FromMarkdownHandle} enter
 */
function opener(matter) {
  return open

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function open(token) {
    // @ts-expect-error: custom.
    this.enter({type: matter.type, value: ''}, token);
    this.buffer();
  }
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function close(token) {
  const data = this.resume();
  const node = /** @type {Literal} */ (this.exit(token));
  // Remove the initial and final eol.
  node.value = data.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, '');
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function value(token) {
  this.config.enter.data.call(this, token);
  this.config.exit.data.call(this, token);
}

/**
 * Create an extension for `mdast-util-to-markdown`.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration.
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown`.
 */
function frontmatterToMarkdown(options) {
  // To do: use an extension object with `satisfies` later.
  /** @type {ToMarkdownExtension['unsafe']} */
  const unsafe = [];
  /** @type {ToMarkdownExtension['handlers']} */
  const handlers = {};
  // @ts-expect-error: `micromark-extension-frontmatter` should fix types to
  // accept `null` as options.
  const settings = matters(options);
  let index = -1;

  while (++index < settings.length) {
    const matter = settings[index];

    // @ts-expect-error: this can add custom frontmatter nodes.
    // Typing those is the responsibility of the end user.
    handlers[matter.type] = handler(matter);

    // To do: idea: perhaps make this smarter, with an `after` of the second char?
    unsafe.push({atBreak: true, character: fence(matter, 'open').charAt(0)});
  }

  return {unsafe, handlers}
}

/**
 * Create a handle that can serialize a frontmatter node as markdown.
 *
 * @param {Matter} matter
 *   Structure.
 * @returns {(node: Literal) => string} enter
 *   Handler.
 */
function handler(matter) {
  const open = fence(matter, 'open');
  const close = fence(matter, 'close');

  return handle

  /**
   * Serialize a frontmatter node as markdown.
   *
   * @param {Literal} node
   *   Node to serialize.
   * @returns {string}
   *   Serialized node.
   */
  function handle(node) {
    return open + (node.value ? '\n' + node.value : '') + '\n' + close
  }
}

/**
 * Get an `open` or `close` fence.
 *
 * @param {Matter} matter
 *   Structure.
 * @param {'open' | 'close'} prop
 *   Field to get.
 * @returns {string}
 *   Fence.
 */
function fence(matter, prop) {
  return matter.marker
    ? pick(matter.marker, prop).repeat(3)
    : // @ts-expect-error: They’re mutually exclusive.
      pick(matter.fence, prop)
}

/**
 * Take `open` or `close` fields when schema is an info object, or use the
 * given value when it is a string.
 *
 * @param {Info | string} schema
 *   Info object or value.
 * @param {'open' | 'close'} prop
 *   Field to get.
 * @returns {string}
 *   Thing to use for the opening or closing.
 */
function pick(schema, prop) {
  return typeof schema === 'string' ? schema : schema[prop]
}

/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('micromark-extension-frontmatter').Options} Options
 */

/**
 * Plugin to add support for frontmatter.
 *
 * @type {import('unified').Plugin<[Options?]|void[], Root>}
 */
function remarkFrontmatter(options = 'yaml') {
  const data = this.data();

  add('micromarkExtensions', frontmatter(options));
  add('fromMarkdownExtensions', frontmatterFromMarkdown(options));
  add('toMarkdownExtensions', frontmatterToMarkdown(options));

  /**
   * @param {string} field
   * @param {unknown} value
   */
  function add(field, value) {
    const list = /** @type {unknown[]} */ (
      // Other extensions
      /* c8 ignore next 2 */
      data[field] ? data[field] : (data[field] = [])
    );

    list.push(value);
  }
}

/**
 * @typedef Gemoji
 * @property {string} emoji
 *   Example: `'😀'`.
 * @property {Array<string>} names
 *   Example: `['grinning']`.
 * @property {Array<string>} tags
 *   Example: `['smile', 'happy']`.
 * @property {string} description
 *   Example: `'grinning face'`.
 * @property {string} category
 *   Example: `'Smileys & Emotion'`.
 */

/**
 * Map of names to emoji.
 *
 * @type {Record<string, string>}
 */
const nameToEmoji = {
  100: '💯',
  1234: '🔢',
  grinning: '😀',
  smiley: '😃',
  smile: '😄',
  grin: '😁',
  laughing: '😆',
  satisfied: '😆',
  sweat_smile: '😅',
  rofl: '🤣',
  joy: '😂',
  slightly_smiling_face: '🙂',
  upside_down_face: '🙃',
  wink: '😉',
  blush: '😊',
  innocent: '😇',
  smiling_face_with_three_hearts: '🥰',
  heart_eyes: '😍',
  star_struck: '🤩',
  kissing_heart: '😘',
  kissing: '😗',
  relaxed: '☺️',
  kissing_closed_eyes: '😚',
  kissing_smiling_eyes: '😙',
  smiling_face_with_tear: '🥲',
  yum: '😋',
  stuck_out_tongue: '😛',
  stuck_out_tongue_winking_eye: '😜',
  zany_face: '🤪',
  stuck_out_tongue_closed_eyes: '😝',
  money_mouth_face: '🤑',
  hugs: '🤗',
  hand_over_mouth: '🤭',
  shushing_face: '🤫',
  thinking: '🤔',
  zipper_mouth_face: '🤐',
  raised_eyebrow: '🤨',
  neutral_face: '😐',
  expressionless: '😑',
  no_mouth: '😶',
  face_in_clouds: '😶‍🌫️',
  smirk: '😏',
  unamused: '😒',
  roll_eyes: '🙄',
  grimacing: '😬',
  face_exhaling: '😮‍💨',
  lying_face: '🤥',
  relieved: '😌',
  pensive: '😔',
  sleepy: '😪',
  drooling_face: '🤤',
  sleeping: '😴',
  mask: '😷',
  face_with_thermometer: '🤒',
  face_with_head_bandage: '🤕',
  nauseated_face: '🤢',
  vomiting_face: '🤮',
  sneezing_face: '🤧',
  hot_face: '🥵',
  cold_face: '🥶',
  woozy_face: '🥴',
  dizzy_face: '😵',
  face_with_spiral_eyes: '😵‍💫',
  exploding_head: '🤯',
  cowboy_hat_face: '🤠',
  partying_face: '🥳',
  disguised_face: '🥸',
  sunglasses: '😎',
  nerd_face: '🤓',
  monocle_face: '🧐',
  confused: '😕',
  worried: '😟',
  slightly_frowning_face: '🙁',
  frowning_face: '☹️',
  open_mouth: '😮',
  hushed: '😯',
  astonished: '😲',
  flushed: '😳',
  pleading_face: '🥺',
  frowning: '😦',
  anguished: '😧',
  fearful: '😨',
  cold_sweat: '😰',
  disappointed_relieved: '😥',
  cry: '😢',
  sob: '😭',
  scream: '😱',
  confounded: '😖',
  persevere: '😣',
  disappointed: '😞',
  sweat: '😓',
  weary: '😩',
  tired_face: '😫',
  yawning_face: '🥱',
  triumph: '😤',
  rage: '😡',
  pout: '😡',
  angry: '😠',
  cursing_face: '🤬',
  smiling_imp: '😈',
  imp: '👿',
  skull: '💀',
  skull_and_crossbones: '☠️',
  hankey: '💩',
  poop: '💩',
  shit: '💩',
  clown_face: '🤡',
  japanese_ogre: '👹',
  japanese_goblin: '👺',
  ghost: '👻',
  alien: '👽',
  space_invader: '👾',
  robot: '🤖',
  smiley_cat: '😺',
  smile_cat: '😸',
  joy_cat: '😹',
  heart_eyes_cat: '😻',
  smirk_cat: '😼',
  kissing_cat: '😽',
  scream_cat: '🙀',
  crying_cat_face: '😿',
  pouting_cat: '😾',
  see_no_evil: '🙈',
  hear_no_evil: '🙉',
  speak_no_evil: '🙊',
  kiss: '💋',
  love_letter: '💌',
  cupid: '💘',
  gift_heart: '💝',
  sparkling_heart: '💖',
  heartpulse: '💗',
  heartbeat: '💓',
  revolving_hearts: '💞',
  two_hearts: '💕',
  heart_decoration: '💟',
  heavy_heart_exclamation: '❣️',
  broken_heart: '💔',
  heart_on_fire: '❤️‍🔥',
  mending_heart: '❤️‍🩹',
  heart: '❤️',
  orange_heart: '🧡',
  yellow_heart: '💛',
  green_heart: '💚',
  blue_heart: '💙',
  purple_heart: '💜',
  brown_heart: '🤎',
  black_heart: '🖤',
  white_heart: '🤍',
  anger: '💢',
  boom: '💥',
  collision: '💥',
  dizzy: '💫',
  sweat_drops: '💦',
  dash: '💨',
  hole: '🕳️',
  bomb: '💣',
  speech_balloon: '💬',
  eye_speech_bubble: '👁️‍🗨️',
  left_speech_bubble: '🗨️',
  right_anger_bubble: '🗯️',
  thought_balloon: '💭',
  zzz: '💤',
  wave: '👋',
  raised_back_of_hand: '🤚',
  raised_hand_with_fingers_splayed: '🖐️',
  hand: '✋',
  raised_hand: '✋',
  vulcan_salute: '🖖',
  ok_hand: '👌',
  pinched_fingers: '🤌',
  pinching_hand: '🤏',
  v: '✌️',
  crossed_fingers: '🤞',
  love_you_gesture: '🤟',
  metal: '🤘',
  call_me_hand: '🤙',
  point_left: '👈',
  point_right: '👉',
  point_up_2: '👆',
  middle_finger: '🖕',
  fu: '🖕',
  point_down: '👇',
  point_up: '☝️',
  '+1': '👍',
  thumbsup: '👍',
  '-1': '👎',
  thumbsdown: '👎',
  fist_raised: '✊',
  fist: '✊',
  fist_oncoming: '👊',
  facepunch: '👊',
  punch: '👊',
  fist_left: '🤛',
  fist_right: '🤜',
  clap: '👏',
  raised_hands: '🙌',
  open_hands: '👐',
  palms_up_together: '🤲',
  handshake: '🤝',
  pray: '🙏',
  writing_hand: '✍️',
  nail_care: '💅',
  selfie: '🤳',
  muscle: '💪',
  mechanical_arm: '🦾',
  mechanical_leg: '🦿',
  leg: '🦵',
  foot: '🦶',
  ear: '👂',
  ear_with_hearing_aid: '🦻',
  nose: '👃',
  brain: '🧠',
  anatomical_heart: '🫀',
  lungs: '🫁',
  tooth: '🦷',
  bone: '🦴',
  eyes: '👀',
  eye: '👁️',
  tongue: '👅',
  lips: '👄',
  baby: '👶',
  child: '🧒',
  boy: '👦',
  girl: '👧',
  adult: '🧑',
  blond_haired_person: '👱',
  man: '👨',
  bearded_person: '🧔',
  man_beard: '🧔‍♂️',
  woman_beard: '🧔‍♀️',
  red_haired_man: '👨‍🦰',
  curly_haired_man: '👨‍🦱',
  white_haired_man: '👨‍🦳',
  bald_man: '👨‍🦲',
  woman: '👩',
  red_haired_woman: '👩‍🦰',
  person_red_hair: '🧑‍🦰',
  curly_haired_woman: '👩‍🦱',
  person_curly_hair: '🧑‍🦱',
  white_haired_woman: '👩‍🦳',
  person_white_hair: '🧑‍🦳',
  bald_woman: '👩‍🦲',
  person_bald: '🧑‍🦲',
  blond_haired_woman: '👱‍♀️',
  blonde_woman: '👱‍♀️',
  blond_haired_man: '👱‍♂️',
  older_adult: '🧓',
  older_man: '👴',
  older_woman: '👵',
  frowning_person: '🙍',
  frowning_man: '🙍‍♂️',
  frowning_woman: '🙍‍♀️',
  pouting_face: '🙎',
  pouting_man: '🙎‍♂️',
  pouting_woman: '🙎‍♀️',
  no_good: '🙅',
  no_good_man: '🙅‍♂️',
  ng_man: '🙅‍♂️',
  no_good_woman: '🙅‍♀️',
  ng_woman: '🙅‍♀️',
  ok_person: '🙆',
  ok_man: '🙆‍♂️',
  ok_woman: '🙆‍♀️',
  tipping_hand_person: '💁',
  information_desk_person: '💁',
  tipping_hand_man: '💁‍♂️',
  sassy_man: '💁‍♂️',
  tipping_hand_woman: '💁‍♀️',
  sassy_woman: '💁‍♀️',
  raising_hand: '🙋',
  raising_hand_man: '🙋‍♂️',
  raising_hand_woman: '🙋‍♀️',
  deaf_person: '🧏',
  deaf_man: '🧏‍♂️',
  deaf_woman: '🧏‍♀️',
  bow: '🙇',
  bowing_man: '🙇‍♂️',
  bowing_woman: '🙇‍♀️',
  facepalm: '🤦',
  man_facepalming: '🤦‍♂️',
  woman_facepalming: '🤦‍♀️',
  shrug: '🤷',
  man_shrugging: '🤷‍♂️',
  woman_shrugging: '🤷‍♀️',
  health_worker: '🧑‍⚕️',
  man_health_worker: '👨‍⚕️',
  woman_health_worker: '👩‍⚕️',
  student: '🧑‍🎓',
  man_student: '👨‍🎓',
  woman_student: '👩‍🎓',
  teacher: '🧑‍🏫',
  man_teacher: '👨‍🏫',
  woman_teacher: '👩‍🏫',
  judge: '🧑‍⚖️',
  man_judge: '👨‍⚖️',
  woman_judge: '👩‍⚖️',
  farmer: '🧑‍🌾',
  man_farmer: '👨‍🌾',
  woman_farmer: '👩‍🌾',
  cook: '🧑‍🍳',
  man_cook: '👨‍🍳',
  woman_cook: '👩‍🍳',
  mechanic: '🧑‍🔧',
  man_mechanic: '👨‍🔧',
  woman_mechanic: '👩‍🔧',
  factory_worker: '🧑‍🏭',
  man_factory_worker: '👨‍🏭',
  woman_factory_worker: '👩‍🏭',
  office_worker: '🧑‍💼',
  man_office_worker: '👨‍💼',
  woman_office_worker: '👩‍💼',
  scientist: '🧑‍🔬',
  man_scientist: '👨‍🔬',
  woman_scientist: '👩‍🔬',
  technologist: '🧑‍💻',
  man_technologist: '👨‍💻',
  woman_technologist: '👩‍💻',
  singer: '🧑‍🎤',
  man_singer: '👨‍🎤',
  woman_singer: '👩‍🎤',
  artist: '🧑‍🎨',
  man_artist: '👨‍🎨',
  woman_artist: '👩‍🎨',
  pilot: '🧑‍✈️',
  man_pilot: '👨‍✈️',
  woman_pilot: '👩‍✈️',
  astronaut: '🧑‍🚀',
  man_astronaut: '👨‍🚀',
  woman_astronaut: '👩‍🚀',
  firefighter: '🧑‍🚒',
  man_firefighter: '👨‍🚒',
  woman_firefighter: '👩‍🚒',
  police_officer: '👮',
  cop: '👮',
  policeman: '👮‍♂️',
  policewoman: '👮‍♀️',
  detective: '🕵️',
  male_detective: '🕵️‍♂️',
  female_detective: '🕵️‍♀️',
  guard: '💂',
  guardsman: '💂‍♂️',
  guardswoman: '💂‍♀️',
  ninja: '🥷',
  construction_worker: '👷',
  construction_worker_man: '👷‍♂️',
  construction_worker_woman: '👷‍♀️',
  prince: '🤴',
  princess: '👸',
  person_with_turban: '👳',
  man_with_turban: '👳‍♂️',
  woman_with_turban: '👳‍♀️',
  man_with_gua_pi_mao: '👲',
  woman_with_headscarf: '🧕',
  person_in_tuxedo: '🤵',
  man_in_tuxedo: '🤵‍♂️',
  woman_in_tuxedo: '🤵‍♀️',
  person_with_veil: '👰',
  man_with_veil: '👰‍♂️',
  woman_with_veil: '👰‍♀️',
  bride_with_veil: '👰‍♀️',
  pregnant_woman: '🤰',
  breast_feeding: '🤱',
  woman_feeding_baby: '👩‍🍼',
  man_feeding_baby: '👨‍🍼',
  person_feeding_baby: '🧑‍🍼',
  angel: '👼',
  santa: '🎅',
  mrs_claus: '🤶',
  mx_claus: '🧑‍🎄',
  superhero: '🦸',
  superhero_man: '🦸‍♂️',
  superhero_woman: '🦸‍♀️',
  supervillain: '🦹',
  supervillain_man: '🦹‍♂️',
  supervillain_woman: '🦹‍♀️',
  mage: '🧙',
  mage_man: '🧙‍♂️',
  mage_woman: '🧙‍♀️',
  fairy: '🧚',
  fairy_man: '🧚‍♂️',
  fairy_woman: '🧚‍♀️',
  vampire: '🧛',
  vampire_man: '🧛‍♂️',
  vampire_woman: '🧛‍♀️',
  merperson: '🧜',
  merman: '🧜‍♂️',
  mermaid: '🧜‍♀️',
  elf: '🧝',
  elf_man: '🧝‍♂️',
  elf_woman: '🧝‍♀️',
  genie: '🧞',
  genie_man: '🧞‍♂️',
  genie_woman: '🧞‍♀️',
  zombie: '🧟',
  zombie_man: '🧟‍♂️',
  zombie_woman: '🧟‍♀️',
  massage: '💆',
  massage_man: '💆‍♂️',
  massage_woman: '💆‍♀️',
  haircut: '💇',
  haircut_man: '💇‍♂️',
  haircut_woman: '💇‍♀️',
  walking: '🚶',
  walking_man: '🚶‍♂️',
  walking_woman: '🚶‍♀️',
  standing_person: '🧍',
  standing_man: '🧍‍♂️',
  standing_woman: '🧍‍♀️',
  kneeling_person: '🧎',
  kneeling_man: '🧎‍♂️',
  kneeling_woman: '🧎‍♀️',
  person_with_probing_cane: '🧑‍🦯',
  man_with_probing_cane: '👨‍🦯',
  woman_with_probing_cane: '👩‍🦯',
  person_in_motorized_wheelchair: '🧑‍🦼',
  man_in_motorized_wheelchair: '👨‍🦼',
  woman_in_motorized_wheelchair: '👩‍🦼',
  person_in_manual_wheelchair: '🧑‍🦽',
  man_in_manual_wheelchair: '👨‍🦽',
  woman_in_manual_wheelchair: '👩‍🦽',
  runner: '🏃',
  running: '🏃',
  running_man: '🏃‍♂️',
  running_woman: '🏃‍♀️',
  woman_dancing: '💃',
  dancer: '💃',
  man_dancing: '🕺',
  business_suit_levitating: '🕴️',
  dancers: '👯',
  dancing_men: '👯‍♂️',
  dancing_women: '👯‍♀️',
  sauna_person: '🧖',
  sauna_man: '🧖‍♂️',
  sauna_woman: '🧖‍♀️',
  climbing: '🧗',
  climbing_man: '🧗‍♂️',
  climbing_woman: '🧗‍♀️',
  person_fencing: '🤺',
  horse_racing: '🏇',
  skier: '⛷️',
  snowboarder: '🏂',
  golfing: '🏌️',
  golfing_man: '🏌️‍♂️',
  golfing_woman: '🏌️‍♀️',
  surfer: '🏄',
  surfing_man: '🏄‍♂️',
  surfing_woman: '🏄‍♀️',
  rowboat: '🚣',
  rowing_man: '🚣‍♂️',
  rowing_woman: '🚣‍♀️',
  swimmer: '🏊',
  swimming_man: '🏊‍♂️',
  swimming_woman: '🏊‍♀️',
  bouncing_ball_person: '⛹️',
  bouncing_ball_man: '⛹️‍♂️',
  basketball_man: '⛹️‍♂️',
  bouncing_ball_woman: '⛹️‍♀️',
  basketball_woman: '⛹️‍♀️',
  weight_lifting: '🏋️',
  weight_lifting_man: '🏋️‍♂️',
  weight_lifting_woman: '🏋️‍♀️',
  bicyclist: '🚴',
  biking_man: '🚴‍♂️',
  biking_woman: '🚴‍♀️',
  mountain_bicyclist: '🚵',
  mountain_biking_man: '🚵‍♂️',
  mountain_biking_woman: '🚵‍♀️',
  cartwheeling: '🤸',
  man_cartwheeling: '🤸‍♂️',
  woman_cartwheeling: '🤸‍♀️',
  wrestling: '🤼',
  men_wrestling: '🤼‍♂️',
  women_wrestling: '🤼‍♀️',
  water_polo: '🤽',
  man_playing_water_polo: '🤽‍♂️',
  woman_playing_water_polo: '🤽‍♀️',
  handball_person: '🤾',
  man_playing_handball: '🤾‍♂️',
  woman_playing_handball: '🤾‍♀️',
  juggling_person: '🤹',
  man_juggling: '🤹‍♂️',
  woman_juggling: '🤹‍♀️',
  lotus_position: '🧘',
  lotus_position_man: '🧘‍♂️',
  lotus_position_woman: '🧘‍♀️',
  bath: '🛀',
  sleeping_bed: '🛌',
  people_holding_hands: '🧑‍🤝‍🧑',
  two_women_holding_hands: '👭',
  couple: '👫',
  two_men_holding_hands: '👬',
  couplekiss: '💏',
  couplekiss_man_woman: '👩‍❤️‍💋‍👨',
  couplekiss_man_man: '👨‍❤️‍💋‍👨',
  couplekiss_woman_woman: '👩‍❤️‍💋‍👩',
  couple_with_heart: '💑',
  couple_with_heart_woman_man: '👩‍❤️‍👨',
  couple_with_heart_man_man: '👨‍❤️‍👨',
  couple_with_heart_woman_woman: '👩‍❤️‍👩',
  family: '👪',
  family_man_woman_boy: '👨‍👩‍👦',
  family_man_woman_girl: '👨‍👩‍👧',
  family_man_woman_girl_boy: '👨‍👩‍👧‍👦',
  family_man_woman_boy_boy: '👨‍👩‍👦‍👦',
  family_man_woman_girl_girl: '👨‍👩‍👧‍👧',
  family_man_man_boy: '👨‍👨‍👦',
  family_man_man_girl: '👨‍👨‍👧',
  family_man_man_girl_boy: '👨‍👨‍👧‍👦',
  family_man_man_boy_boy: '👨‍👨‍👦‍👦',
  family_man_man_girl_girl: '👨‍👨‍👧‍👧',
  family_woman_woman_boy: '👩‍👩‍👦',
  family_woman_woman_girl: '👩‍👩‍👧',
  family_woman_woman_girl_boy: '👩‍👩‍👧‍👦',
  family_woman_woman_boy_boy: '👩‍👩‍👦‍👦',
  family_woman_woman_girl_girl: '👩‍👩‍👧‍👧',
  family_man_boy: '👨‍👦',
  family_man_boy_boy: '👨‍👦‍👦',
  family_man_girl: '👨‍👧',
  family_man_girl_boy: '👨‍👧‍👦',
  family_man_girl_girl: '👨‍👧‍👧',
  family_woman_boy: '👩‍👦',
  family_woman_boy_boy: '👩‍👦‍👦',
  family_woman_girl: '👩‍👧',
  family_woman_girl_boy: '👩‍👧‍👦',
  family_woman_girl_girl: '👩‍👧‍👧',
  speaking_head: '🗣️',
  bust_in_silhouette: '👤',
  busts_in_silhouette: '👥',
  people_hugging: '🫂',
  footprints: '👣',
  monkey_face: '🐵',
  monkey: '🐒',
  gorilla: '🦍',
  orangutan: '🦧',
  dog: '🐶',
  dog2: '🐕',
  guide_dog: '🦮',
  service_dog: '🐕‍🦺',
  poodle: '🐩',
  wolf: '🐺',
  fox_face: '🦊',
  raccoon: '🦝',
  cat: '🐱',
  cat2: '🐈',
  black_cat: '🐈‍⬛',
  lion: '🦁',
  tiger: '🐯',
  tiger2: '🐅',
  leopard: '🐆',
  horse: '🐴',
  racehorse: '🐎',
  unicorn: '🦄',
  zebra: '🦓',
  deer: '🦌',
  bison: '🦬',
  cow: '🐮',
  ox: '🐂',
  water_buffalo: '🐃',
  cow2: '🐄',
  pig: '🐷',
  pig2: '🐖',
  boar: '🐗',
  pig_nose: '🐽',
  ram: '🐏',
  sheep: '🐑',
  goat: '🐐',
  dromedary_camel: '🐪',
  camel: '🐫',
  llama: '🦙',
  giraffe: '🦒',
  elephant: '🐘',
  mammoth: '🦣',
  rhinoceros: '🦏',
  hippopotamus: '🦛',
  mouse: '🐭',
  mouse2: '🐁',
  rat: '🐀',
  hamster: '🐹',
  rabbit: '🐰',
  rabbit2: '🐇',
  chipmunk: '🐿️',
  beaver: '🦫',
  hedgehog: '🦔',
  bat: '🦇',
  bear: '🐻',
  polar_bear: '🐻‍❄️',
  koala: '🐨',
  panda_face: '🐼',
  sloth: '🦥',
  otter: '🦦',
  skunk: '🦨',
  kangaroo: '🦘',
  badger: '🦡',
  feet: '🐾',
  paw_prints: '🐾',
  turkey: '🦃',
  chicken: '🐔',
  rooster: '🐓',
  hatching_chick: '🐣',
  baby_chick: '🐤',
  hatched_chick: '🐥',
  bird: '🐦',
  penguin: '🐧',
  dove: '🕊️',
  eagle: '🦅',
  duck: '🦆',
  swan: '🦢',
  owl: '🦉',
  dodo: '🦤',
  feather: '🪶',
  flamingo: '🦩',
  peacock: '🦚',
  parrot: '🦜',
  frog: '🐸',
  crocodile: '🐊',
  turtle: '🐢',
  lizard: '🦎',
  snake: '🐍',
  dragon_face: '🐲',
  dragon: '🐉',
  sauropod: '🦕',
  't-rex': '🦖',
  whale: '🐳',
  whale2: '🐋',
  dolphin: '🐬',
  flipper: '🐬',
  seal: '🦭',
  fish: '🐟',
  tropical_fish: '🐠',
  blowfish: '🐡',
  shark: '🦈',
  octopus: '🐙',
  shell: '🐚',
  snail: '🐌',
  butterfly: '🦋',
  bug: '🐛',
  ant: '🐜',
  bee: '🐝',
  honeybee: '🐝',
  beetle: '🪲',
  lady_beetle: '🐞',
  cricket: '🦗',
  cockroach: '🪳',
  spider: '🕷️',
  spider_web: '🕸️',
  scorpion: '🦂',
  mosquito: '🦟',
  fly: '🪰',
  worm: '🪱',
  microbe: '🦠',
  bouquet: '💐',
  cherry_blossom: '🌸',
  white_flower: '💮',
  rosette: '🏵️',
  rose: '🌹',
  wilted_flower: '🥀',
  hibiscus: '🌺',
  sunflower: '🌻',
  blossom: '🌼',
  tulip: '🌷',
  seedling: '🌱',
  potted_plant: '🪴',
  evergreen_tree: '🌲',
  deciduous_tree: '🌳',
  palm_tree: '🌴',
  cactus: '🌵',
  ear_of_rice: '🌾',
  herb: '🌿',
  shamrock: '☘️',
  four_leaf_clover: '🍀',
  maple_leaf: '🍁',
  fallen_leaf: '🍂',
  leaves: '🍃',
  grapes: '🍇',
  melon: '🍈',
  watermelon: '🍉',
  tangerine: '🍊',
  orange: '🍊',
  mandarin: '🍊',
  lemon: '🍋',
  banana: '🍌',
  pineapple: '🍍',
  mango: '🥭',
  apple: '🍎',
  green_apple: '🍏',
  pear: '🍐',
  peach: '🍑',
  cherries: '🍒',
  strawberry: '🍓',
  blueberries: '🫐',
  kiwi_fruit: '🥝',
  tomato: '🍅',
  olive: '🫒',
  coconut: '🥥',
  avocado: '🥑',
  eggplant: '🍆',
  potato: '🥔',
  carrot: '🥕',
  corn: '🌽',
  hot_pepper: '🌶️',
  bell_pepper: '🫑',
  cucumber: '🥒',
  leafy_green: '🥬',
  broccoli: '🥦',
  garlic: '🧄',
  onion: '🧅',
  mushroom: '🍄',
  peanuts: '🥜',
  chestnut: '🌰',
  bread: '🍞',
  croissant: '🥐',
  baguette_bread: '🥖',
  flatbread: '🫓',
  pretzel: '🥨',
  bagel: '🥯',
  pancakes: '🥞',
  waffle: '🧇',
  cheese: '🧀',
  meat_on_bone: '🍖',
  poultry_leg: '🍗',
  cut_of_meat: '🥩',
  bacon: '🥓',
  hamburger: '🍔',
  fries: '🍟',
  pizza: '🍕',
  hotdog: '🌭',
  sandwich: '🥪',
  taco: '🌮',
  burrito: '🌯',
  tamale: '🫔',
  stuffed_flatbread: '🥙',
  falafel: '🧆',
  egg: '🥚',
  fried_egg: '🍳',
  shallow_pan_of_food: '🥘',
  stew: '🍲',
  fondue: '🫕',
  bowl_with_spoon: '🥣',
  green_salad: '🥗',
  popcorn: '🍿',
  butter: '🧈',
  salt: '🧂',
  canned_food: '🥫',
  bento: '🍱',
  rice_cracker: '🍘',
  rice_ball: '🍙',
  rice: '🍚',
  curry: '🍛',
  ramen: '🍜',
  spaghetti: '🍝',
  sweet_potato: '🍠',
  oden: '🍢',
  sushi: '🍣',
  fried_shrimp: '🍤',
  fish_cake: '🍥',
  moon_cake: '🥮',
  dango: '🍡',
  dumpling: '🥟',
  fortune_cookie: '🥠',
  takeout_box: '🥡',
  crab: '🦀',
  lobster: '🦞',
  shrimp: '🦐',
  squid: '🦑',
  oyster: '🦪',
  icecream: '🍦',
  shaved_ice: '🍧',
  ice_cream: '🍨',
  doughnut: '🍩',
  cookie: '🍪',
  birthday: '🎂',
  cake: '🍰',
  cupcake: '🧁',
  pie: '🥧',
  chocolate_bar: '🍫',
  candy: '🍬',
  lollipop: '🍭',
  custard: '🍮',
  honey_pot: '🍯',
  baby_bottle: '🍼',
  milk_glass: '🥛',
  coffee: '☕',
  teapot: '🫖',
  tea: '🍵',
  sake: '🍶',
  champagne: '🍾',
  wine_glass: '🍷',
  cocktail: '🍸',
  tropical_drink: '🍹',
  beer: '🍺',
  beers: '🍻',
  clinking_glasses: '🥂',
  tumbler_glass: '🥃',
  cup_with_straw: '🥤',
  bubble_tea: '🧋',
  beverage_box: '🧃',
  mate: '🧉',
  ice_cube: '🧊',
  chopsticks: '🥢',
  plate_with_cutlery: '🍽️',
  fork_and_knife: '🍴',
  spoon: '🥄',
  hocho: '🔪',
  knife: '🔪',
  amphora: '🏺',
  earth_africa: '🌍',
  earth_americas: '🌎',
  earth_asia: '🌏',
  globe_with_meridians: '🌐',
  world_map: '🗺️',
  japan: '🗾',
  compass: '🧭',
  mountain_snow: '🏔️',
  mountain: '⛰️',
  volcano: '🌋',
  mount_fuji: '🗻',
  camping: '🏕️',
  beach_umbrella: '🏖️',
  desert: '🏜️',
  desert_island: '🏝️',
  national_park: '🏞️',
  stadium: '🏟️',
  classical_building: '🏛️',
  building_construction: '🏗️',
  bricks: '🧱',
  rock: '🪨',
  wood: '🪵',
  hut: '🛖',
  houses: '🏘️',
  derelict_house: '🏚️',
  house: '🏠',
  house_with_garden: '🏡',
  office: '🏢',
  post_office: '🏣',
  european_post_office: '🏤',
  hospital: '🏥',
  bank: '🏦',
  hotel: '🏨',
  love_hotel: '🏩',
  convenience_store: '🏪',
  school: '🏫',
  department_store: '🏬',
  factory: '🏭',
  japanese_castle: '🏯',
  european_castle: '🏰',
  wedding: '💒',
  tokyo_tower: '🗼',
  statue_of_liberty: '🗽',
  church: '⛪',
  mosque: '🕌',
  hindu_temple: '🛕',
  synagogue: '🕍',
  shinto_shrine: '⛩️',
  kaaba: '🕋',
  fountain: '⛲',
  tent: '⛺',
  foggy: '🌁',
  night_with_stars: '🌃',
  cityscape: '🏙️',
  sunrise_over_mountains: '🌄',
  sunrise: '🌅',
  city_sunset: '🌆',
  city_sunrise: '🌇',
  bridge_at_night: '🌉',
  hotsprings: '♨️',
  carousel_horse: '🎠',
  ferris_wheel: '🎡',
  roller_coaster: '🎢',
  barber: '💈',
  circus_tent: '🎪',
  steam_locomotive: '🚂',
  railway_car: '🚃',
  bullettrain_side: '🚄',
  bullettrain_front: '🚅',
  train2: '🚆',
  metro: '🚇',
  light_rail: '🚈',
  station: '🚉',
  tram: '🚊',
  monorail: '🚝',
  mountain_railway: '🚞',
  train: '🚋',
  bus: '🚌',
  oncoming_bus: '🚍',
  trolleybus: '🚎',
  minibus: '🚐',
  ambulance: '🚑',
  fire_engine: '🚒',
  police_car: '🚓',
  oncoming_police_car: '🚔',
  taxi: '🚕',
  oncoming_taxi: '🚖',
  car: '🚗',
  red_car: '🚗',
  oncoming_automobile: '🚘',
  blue_car: '🚙',
  pickup_truck: '🛻',
  truck: '🚚',
  articulated_lorry: '🚛',
  tractor: '🚜',
  racing_car: '🏎️',
  motorcycle: '🏍️',
  motor_scooter: '🛵',
  manual_wheelchair: '🦽',
  motorized_wheelchair: '🦼',
  auto_rickshaw: '🛺',
  bike: '🚲',
  kick_scooter: '🛴',
  skateboard: '🛹',
  roller_skate: '🛼',
  busstop: '🚏',
  motorway: '🛣️',
  railway_track: '🛤️',
  oil_drum: '🛢️',
  fuelpump: '⛽',
  rotating_light: '🚨',
  traffic_light: '🚥',
  vertical_traffic_light: '🚦',
  stop_sign: '🛑',
  construction: '🚧',
  anchor: '⚓',
  boat: '⛵',
  sailboat: '⛵',
  canoe: '🛶',
  speedboat: '🚤',
  passenger_ship: '🛳️',
  ferry: '⛴️',
  motor_boat: '🛥️',
  ship: '🚢',
  airplane: '✈️',
  small_airplane: '🛩️',
  flight_departure: '🛫',
  flight_arrival: '🛬',
  parachute: '🪂',
  seat: '💺',
  helicopter: '🚁',
  suspension_railway: '🚟',
  mountain_cableway: '🚠',
  aerial_tramway: '🚡',
  artificial_satellite: '🛰️',
  rocket: '🚀',
  flying_saucer: '🛸',
  bellhop_bell: '🛎️',
  luggage: '🧳',
  hourglass: '⌛',
  hourglass_flowing_sand: '⏳',
  watch: '⌚',
  alarm_clock: '⏰',
  stopwatch: '⏱️',
  timer_clock: '⏲️',
  mantelpiece_clock: '🕰️',
  clock12: '🕛',
  clock1230: '🕧',
  clock1: '🕐',
  clock130: '🕜',
  clock2: '🕑',
  clock230: '🕝',
  clock3: '🕒',
  clock330: '🕞',
  clock4: '🕓',
  clock430: '🕟',
  clock5: '🕔',
  clock530: '🕠',
  clock6: '🕕',
  clock630: '🕡',
  clock7: '🕖',
  clock730: '🕢',
  clock8: '🕗',
  clock830: '🕣',
  clock9: '🕘',
  clock930: '🕤',
  clock10: '🕙',
  clock1030: '🕥',
  clock11: '🕚',
  clock1130: '🕦',
  new_moon: '🌑',
  waxing_crescent_moon: '🌒',
  first_quarter_moon: '🌓',
  moon: '🌔',
  waxing_gibbous_moon: '🌔',
  full_moon: '🌕',
  waning_gibbous_moon: '🌖',
  last_quarter_moon: '🌗',
  waning_crescent_moon: '🌘',
  crescent_moon: '🌙',
  new_moon_with_face: '🌚',
  first_quarter_moon_with_face: '🌛',
  last_quarter_moon_with_face: '🌜',
  thermometer: '🌡️',
  sunny: '☀️',
  full_moon_with_face: '🌝',
  sun_with_face: '🌞',
  ringed_planet: '🪐',
  star: '⭐',
  star2: '🌟',
  stars: '🌠',
  milky_way: '🌌',
  cloud: '☁️',
  partly_sunny: '⛅',
  cloud_with_lightning_and_rain: '⛈️',
  sun_behind_small_cloud: '🌤️',
  sun_behind_large_cloud: '🌥️',
  sun_behind_rain_cloud: '🌦️',
  cloud_with_rain: '🌧️',
  cloud_with_snow: '🌨️',
  cloud_with_lightning: '🌩️',
  tornado: '🌪️',
  fog: '🌫️',
  wind_face: '🌬️',
  cyclone: '🌀',
  rainbow: '🌈',
  closed_umbrella: '🌂',
  open_umbrella: '☂️',
  umbrella: '☔',
  parasol_on_ground: '⛱️',
  zap: '⚡',
  snowflake: '❄️',
  snowman_with_snow: '☃️',
  snowman: '⛄',
  comet: '☄️',
  fire: '🔥',
  droplet: '💧',
  ocean: '🌊',
  jack_o_lantern: '🎃',
  christmas_tree: '🎄',
  fireworks: '🎆',
  sparkler: '🎇',
  firecracker: '🧨',
  sparkles: '✨',
  balloon: '🎈',
  tada: '🎉',
  confetti_ball: '🎊',
  tanabata_tree: '🎋',
  bamboo: '🎍',
  dolls: '🎎',
  flags: '🎏',
  wind_chime: '🎐',
  rice_scene: '🎑',
  red_envelope: '🧧',
  ribbon: '🎀',
  gift: '🎁',
  reminder_ribbon: '🎗️',
  tickets: '🎟️',
  ticket: '🎫',
  medal_military: '🎖️',
  trophy: '🏆',
  medal_sports: '🏅',
  '1st_place_medal': '🥇',
  '2nd_place_medal': '🥈',
  '3rd_place_medal': '🥉',
  soccer: '⚽',
  baseball: '⚾',
  softball: '🥎',
  basketball: '🏀',
  volleyball: '🏐',
  football: '🏈',
  rugby_football: '🏉',
  tennis: '🎾',
  flying_disc: '🥏',
  bowling: '🎳',
  cricket_game: '🏏',
  field_hockey: '🏑',
  ice_hockey: '🏒',
  lacrosse: '🥍',
  ping_pong: '🏓',
  badminton: '🏸',
  boxing_glove: '🥊',
  martial_arts_uniform: '🥋',
  goal_net: '🥅',
  golf: '⛳',
  ice_skate: '⛸️',
  fishing_pole_and_fish: '🎣',
  diving_mask: '🤿',
  running_shirt_with_sash: '🎽',
  ski: '🎿',
  sled: '🛷',
  curling_stone: '🥌',
  dart: '🎯',
  yo_yo: '🪀',
  kite: '🪁',
  '8ball': '🎱',
  crystal_ball: '🔮',
  magic_wand: '🪄',
  nazar_amulet: '🧿',
  video_game: '🎮',
  joystick: '🕹️',
  slot_machine: '🎰',
  game_die: '🎲',
  jigsaw: '🧩',
  teddy_bear: '🧸',
  pinata: '🪅',
  nesting_dolls: '🪆',
  spades: '♠️',
  hearts: '♥️',
  diamonds: '♦️',
  clubs: '♣️',
  chess_pawn: '♟️',
  black_joker: '🃏',
  mahjong: '🀄',
  flower_playing_cards: '🎴',
  performing_arts: '🎭',
  framed_picture: '🖼️',
  art: '🎨',
  thread: '🧵',
  sewing_needle: '🪡',
  yarn: '🧶',
  knot: '🪢',
  eyeglasses: '👓',
  dark_sunglasses: '🕶️',
  goggles: '🥽',
  lab_coat: '🥼',
  safety_vest: '🦺',
  necktie: '👔',
  shirt: '👕',
  tshirt: '👕',
  jeans: '👖',
  scarf: '🧣',
  gloves: '🧤',
  coat: '🧥',
  socks: '🧦',
  dress: '👗',
  kimono: '👘',
  sari: '🥻',
  one_piece_swimsuit: '🩱',
  swim_brief: '🩲',
  shorts: '🩳',
  bikini: '👙',
  womans_clothes: '👚',
  purse: '👛',
  handbag: '👜',
  pouch: '👝',
  shopping: '🛍️',
  school_satchel: '🎒',
  thong_sandal: '🩴',
  mans_shoe: '👞',
  shoe: '👞',
  athletic_shoe: '👟',
  hiking_boot: '🥾',
  flat_shoe: '🥿',
  high_heel: '👠',
  sandal: '👡',
  ballet_shoes: '🩰',
  boot: '👢',
  crown: '👑',
  womans_hat: '👒',
  tophat: '🎩',
  mortar_board: '🎓',
  billed_cap: '🧢',
  military_helmet: '🪖',
  rescue_worker_helmet: '⛑️',
  prayer_beads: '📿',
  lipstick: '💄',
  ring: '💍',
  gem: '💎',
  mute: '🔇',
  speaker: '🔈',
  sound: '🔉',
  loud_sound: '🔊',
  loudspeaker: '📢',
  mega: '📣',
  postal_horn: '📯',
  bell: '🔔',
  no_bell: '🔕',
  musical_score: '🎼',
  musical_note: '🎵',
  notes: '🎶',
  studio_microphone: '🎙️',
  level_slider: '🎚️',
  control_knobs: '🎛️',
  microphone: '🎤',
  headphones: '🎧',
  radio: '📻',
  saxophone: '🎷',
  accordion: '🪗',
  guitar: '🎸',
  musical_keyboard: '🎹',
  trumpet: '🎺',
  violin: '🎻',
  banjo: '🪕',
  drum: '🥁',
  long_drum: '🪘',
  iphone: '📱',
  calling: '📲',
  phone: '☎️',
  telephone: '☎️',
  telephone_receiver: '📞',
  pager: '📟',
  fax: '📠',
  battery: '🔋',
  electric_plug: '🔌',
  computer: '💻',
  desktop_computer: '🖥️',
  printer: '🖨️',
  keyboard: '⌨️',
  computer_mouse: '🖱️',
  trackball: '🖲️',
  minidisc: '💽',
  floppy_disk: '💾',
  cd: '💿',
  dvd: '📀',
  abacus: '🧮',
  movie_camera: '🎥',
  film_strip: '🎞️',
  film_projector: '📽️',
  clapper: '🎬',
  tv: '📺',
  camera: '📷',
  camera_flash: '📸',
  video_camera: '📹',
  vhs: '📼',
  mag: '🔍',
  mag_right: '🔎',
  candle: '🕯️',
  bulb: '💡',
  flashlight: '🔦',
  izakaya_lantern: '🏮',
  lantern: '🏮',
  diya_lamp: '🪔',
  notebook_with_decorative_cover: '📔',
  closed_book: '📕',
  book: '📖',
  open_book: '📖',
  green_book: '📗',
  blue_book: '📘',
  orange_book: '📙',
  books: '📚',
  notebook: '📓',
  ledger: '📒',
  page_with_curl: '📃',
  scroll: '📜',
  page_facing_up: '📄',
  newspaper: '📰',
  newspaper_roll: '🗞️',
  bookmark_tabs: '📑',
  bookmark: '🔖',
  label: '🏷️',
  moneybag: '💰',
  coin: '🪙',
  yen: '💴',
  dollar: '💵',
  euro: '💶',
  pound: '💷',
  money_with_wings: '💸',
  credit_card: '💳',
  receipt: '🧾',
  chart: '💹',
  envelope: '✉️',
  email: '📧',
  'e-mail': '📧',
  incoming_envelope: '📨',
  envelope_with_arrow: '📩',
  outbox_tray: '📤',
  inbox_tray: '📥',
  package: '📦',
  mailbox: '📫',
  mailbox_closed: '📪',
  mailbox_with_mail: '📬',
  mailbox_with_no_mail: '📭',
  postbox: '📮',
  ballot_box: '🗳️',
  pencil2: '✏️',
  black_nib: '✒️',
  fountain_pen: '🖋️',
  pen: '🖊️',
  paintbrush: '🖌️',
  crayon: '🖍️',
  memo: '📝',
  pencil: '📝',
  briefcase: '💼',
  file_folder: '📁',
  open_file_folder: '📂',
  card_index_dividers: '🗂️',
  date: '📅',
  calendar: '📆',
  spiral_notepad: '🗒️',
  spiral_calendar: '🗓️',
  card_index: '📇',
  chart_with_upwards_trend: '📈',
  chart_with_downwards_trend: '📉',
  bar_chart: '📊',
  clipboard: '📋',
  pushpin: '📌',
  round_pushpin: '📍',
  paperclip: '📎',
  paperclips: '🖇️',
  straight_ruler: '📏',
  triangular_ruler: '📐',
  scissors: '✂️',
  card_file_box: '🗃️',
  file_cabinet: '🗄️',
  wastebasket: '🗑️',
  lock: '🔒',
  unlock: '🔓',
  lock_with_ink_pen: '🔏',
  closed_lock_with_key: '🔐',
  key: '🔑',
  old_key: '🗝️',
  hammer: '🔨',
  axe: '🪓',
  pick: '⛏️',
  hammer_and_pick: '⚒️',
  hammer_and_wrench: '🛠️',
  dagger: '🗡️',
  crossed_swords: '⚔️',
  gun: '🔫',
  boomerang: '🪃',
  bow_and_arrow: '🏹',
  shield: '🛡️',
  carpentry_saw: '🪚',
  wrench: '🔧',
  screwdriver: '🪛',
  nut_and_bolt: '🔩',
  gear: '⚙️',
  clamp: '🗜️',
  balance_scale: '⚖️',
  probing_cane: '🦯',
  link: '🔗',
  chains: '⛓️',
  hook: '🪝',
  toolbox: '🧰',
  magnet: '🧲',
  ladder: '🪜',
  alembic: '⚗️',
  test_tube: '🧪',
  petri_dish: '🧫',
  dna: '🧬',
  microscope: '🔬',
  telescope: '🔭',
  satellite: '📡',
  syringe: '💉',
  drop_of_blood: '🩸',
  pill: '💊',
  adhesive_bandage: '🩹',
  stethoscope: '🩺',
  door: '🚪',
  elevator: '🛗',
  mirror: '🪞',
  window: '🪟',
  bed: '🛏️',
  couch_and_lamp: '🛋️',
  chair: '🪑',
  toilet: '🚽',
  plunger: '🪠',
  shower: '🚿',
  bathtub: '🛁',
  mouse_trap: '🪤',
  razor: '🪒',
  lotion_bottle: '🧴',
  safety_pin: '🧷',
  broom: '🧹',
  basket: '🧺',
  roll_of_paper: '🧻',
  bucket: '🪣',
  soap: '🧼',
  toothbrush: '🪥',
  sponge: '🧽',
  fire_extinguisher: '🧯',
  shopping_cart: '🛒',
  smoking: '🚬',
  coffin: '⚰️',
  headstone: '🪦',
  funeral_urn: '⚱️',
  moyai: '🗿',
  placard: '🪧',
  atm: '🏧',
  put_litter_in_its_place: '🚮',
  potable_water: '🚰',
  wheelchair: '♿',
  mens: '🚹',
  womens: '🚺',
  restroom: '🚻',
  baby_symbol: '🚼',
  wc: '🚾',
  passport_control: '🛂',
  customs: '🛃',
  baggage_claim: '🛄',
  left_luggage: '🛅',
  warning: '⚠️',
  children_crossing: '🚸',
  no_entry: '⛔',
  no_entry_sign: '🚫',
  no_bicycles: '🚳',
  no_smoking: '🚭',
  do_not_litter: '🚯',
  'non-potable_water': '🚱',
  no_pedestrians: '🚷',
  no_mobile_phones: '📵',
  underage: '🔞',
  radioactive: '☢️',
  biohazard: '☣️',
  arrow_up: '⬆️',
  arrow_upper_right: '↗️',
  arrow_right: '➡️',
  arrow_lower_right: '↘️',
  arrow_down: '⬇️',
  arrow_lower_left: '↙️',
  arrow_left: '⬅️',
  arrow_upper_left: '↖️',
  arrow_up_down: '↕️',
  left_right_arrow: '↔️',
  leftwards_arrow_with_hook: '↩️',
  arrow_right_hook: '↪️',
  arrow_heading_up: '⤴️',
  arrow_heading_down: '⤵️',
  arrows_clockwise: '🔃',
  arrows_counterclockwise: '🔄',
  back: '🔙',
  end: '🔚',
  on: '🔛',
  soon: '🔜',
  top: '🔝',
  place_of_worship: '🛐',
  atom_symbol: '⚛️',
  om: '🕉️',
  star_of_david: '✡️',
  wheel_of_dharma: '☸️',
  yin_yang: '☯️',
  latin_cross: '✝️',
  orthodox_cross: '☦️',
  star_and_crescent: '☪️',
  peace_symbol: '☮️',
  menorah: '🕎',
  six_pointed_star: '🔯',
  aries: '♈',
  taurus: '♉',
  gemini: '♊',
  cancer: '♋',
  leo: '♌',
  virgo: '♍',
  libra: '♎',
  scorpius: '♏',
  sagittarius: '♐',
  capricorn: '♑',
  aquarius: '♒',
  pisces: '♓',
  ophiuchus: '⛎',
  twisted_rightwards_arrows: '🔀',
  repeat: '🔁',
  repeat_one: '🔂',
  arrow_forward: '▶️',
  fast_forward: '⏩',
  next_track_button: '⏭️',
  play_or_pause_button: '⏯️',
  arrow_backward: '◀️',
  rewind: '⏪',
  previous_track_button: '⏮️',
  arrow_up_small: '🔼',
  arrow_double_up: '⏫',
  arrow_down_small: '🔽',
  arrow_double_down: '⏬',
  pause_button: '⏸️',
  stop_button: '⏹️',
  record_button: '⏺️',
  eject_button: '⏏️',
  cinema: '🎦',
  low_brightness: '🔅',
  high_brightness: '🔆',
  signal_strength: '📶',
  vibration_mode: '📳',
  mobile_phone_off: '📴',
  female_sign: '♀️',
  male_sign: '♂️',
  transgender_symbol: '⚧️',
  heavy_multiplication_x: '✖️',
  heavy_plus_sign: '➕',
  heavy_minus_sign: '➖',
  heavy_division_sign: '➗',
  infinity: '♾️',
  bangbang: '‼️',
  interrobang: '⁉️',
  question: '❓',
  grey_question: '❔',
  grey_exclamation: '❕',
  exclamation: '❗',
  heavy_exclamation_mark: '❗',
  wavy_dash: '〰️',
  currency_exchange: '💱',
  heavy_dollar_sign: '💲',
  medical_symbol: '⚕️',
  recycle: '♻️',
  fleur_de_lis: '⚜️',
  trident: '🔱',
  name_badge: '📛',
  beginner: '🔰',
  o: '⭕',
  white_check_mark: '✅',
  ballot_box_with_check: '☑️',
  heavy_check_mark: '✔️',
  x: '❌',
  negative_squared_cross_mark: '❎',
  curly_loop: '➰',
  loop: '➿',
  part_alternation_mark: '〽️',
  eight_spoked_asterisk: '✳️',
  eight_pointed_black_star: '✴️',
  sparkle: '❇️',
  copyright: '©️',
  registered: '®️',
  tm: '™️',
  hash: '#️⃣',
  asterisk: '*️⃣',
  zero: '0️⃣',
  one: '1️⃣',
  two: '2️⃣',
  three: '3️⃣',
  four: '4️⃣',
  five: '5️⃣',
  six: '6️⃣',
  seven: '7️⃣',
  eight: '8️⃣',
  nine: '9️⃣',
  keycap_ten: '🔟',
  capital_abcd: '🔠',
  abcd: '🔡',
  symbols: '🔣',
  abc: '🔤',
  a: '🅰️',
  ab: '🆎',
  b: '🅱️',
  cl: '🆑',
  cool: '🆒',
  free: '🆓',
  information_source: 'ℹ️',
  id: '🆔',
  m: 'Ⓜ️',
  new: '🆕',
  ng: '🆖',
  o2: '🅾️',
  ok: '🆗',
  parking: '🅿️',
  sos: '🆘',
  up: '🆙',
  vs: '🆚',
  koko: '🈁',
  sa: '🈂️',
  u6708: '🈷️',
  u6709: '🈶',
  u6307: '🈯',
  ideograph_advantage: '🉐',
  u5272: '🈹',
  u7121: '🈚',
  u7981: '🈲',
  accept: '🉑',
  u7533: '🈸',
  u5408: '🈴',
  u7a7a: '🈳',
  congratulations: '㊗️',
  secret: '㊙️',
  u55b6: '🈺',
  u6e80: '🈵',
  red_circle: '🔴',
  orange_circle: '🟠',
  yellow_circle: '🟡',
  green_circle: '🟢',
  large_blue_circle: '🔵',
  purple_circle: '🟣',
  brown_circle: '🟤',
  black_circle: '⚫',
  white_circle: '⚪',
  red_square: '🟥',
  orange_square: '🟧',
  yellow_square: '🟨',
  green_square: '🟩',
  blue_square: '🟦',
  purple_square: '🟪',
  brown_square: '🟫',
  black_large_square: '⬛',
  white_large_square: '⬜',
  black_medium_square: '◼️',
  white_medium_square: '◻️',
  black_medium_small_square: '◾',
  white_medium_small_square: '◽',
  black_small_square: '▪️',
  white_small_square: '▫️',
  large_orange_diamond: '🔶',
  large_blue_diamond: '🔷',
  small_orange_diamond: '🔸',
  small_blue_diamond: '🔹',
  small_red_triangle: '🔺',
  small_red_triangle_down: '🔻',
  diamond_shape_with_a_dot_inside: '💠',
  radio_button: '🔘',
  white_square_button: '🔳',
  black_square_button: '🔲',
  checkered_flag: '🏁',
  triangular_flag_on_post: '🚩',
  crossed_flags: '🎌',
  black_flag: '🏴',
  white_flag: '🏳️',
  rainbow_flag: '🏳️‍🌈',
  transgender_flag: '🏳️‍⚧️',
  pirate_flag: '🏴‍☠️',
  ascension_island: '🇦🇨',
  andorra: '🇦🇩',
  united_arab_emirates: '🇦🇪',
  afghanistan: '🇦🇫',
  antigua_barbuda: '🇦🇬',
  anguilla: '🇦🇮',
  albania: '🇦🇱',
  armenia: '🇦🇲',
  angola: '🇦🇴',
  antarctica: '🇦🇶',
  argentina: '🇦🇷',
  american_samoa: '🇦🇸',
  austria: '🇦🇹',
  australia: '🇦🇺',
  aruba: '🇦🇼',
  aland_islands: '🇦🇽',
  azerbaijan: '🇦🇿',
  bosnia_herzegovina: '🇧🇦',
  barbados: '🇧🇧',
  bangladesh: '🇧🇩',
  belgium: '🇧🇪',
  burkina_faso: '🇧🇫',
  bulgaria: '🇧🇬',
  bahrain: '🇧🇭',
  burundi: '🇧🇮',
  benin: '🇧🇯',
  st_barthelemy: '🇧🇱',
  bermuda: '🇧🇲',
  brunei: '🇧🇳',
  bolivia: '🇧🇴',
  caribbean_netherlands: '🇧🇶',
  brazil: '🇧🇷',
  bahamas: '🇧🇸',
  bhutan: '🇧🇹',
  bouvet_island: '🇧🇻',
  botswana: '🇧🇼',
  belarus: '🇧🇾',
  belize: '🇧🇿',
  canada: '🇨🇦',
  cocos_islands: '🇨🇨',
  congo_kinshasa: '🇨🇩',
  central_african_republic: '🇨🇫',
  congo_brazzaville: '🇨🇬',
  switzerland: '🇨🇭',
  cote_divoire: '🇨🇮',
  cook_islands: '🇨🇰',
  chile: '🇨🇱',
  cameroon: '🇨🇲',
  cn: '🇨🇳',
  colombia: '🇨🇴',
  clipperton_island: '🇨🇵',
  costa_rica: '🇨🇷',
  cuba: '🇨🇺',
  cape_verde: '🇨🇻',
  curacao: '🇨🇼',
  christmas_island: '🇨🇽',
  cyprus: '🇨🇾',
  czech_republic: '🇨🇿',
  de: '🇩🇪',
  diego_garcia: '🇩🇬',
  djibouti: '🇩🇯',
  denmark: '🇩🇰',
  dominica: '🇩🇲',
  dominican_republic: '🇩🇴',
  algeria: '🇩🇿',
  ceuta_melilla: '🇪🇦',
  ecuador: '🇪🇨',
  estonia: '🇪🇪',
  egypt: '🇪🇬',
  western_sahara: '🇪🇭',
  eritrea: '🇪🇷',
  es: '🇪🇸',
  ethiopia: '🇪🇹',
  eu: '🇪🇺',
  european_union: '🇪🇺',
  finland: '🇫🇮',
  fiji: '🇫🇯',
  falkland_islands: '🇫🇰',
  micronesia: '🇫🇲',
  faroe_islands: '🇫🇴',
  fr: '🇫🇷',
  gabon: '🇬🇦',
  gb: '🇬🇧',
  uk: '🇬🇧',
  grenada: '🇬🇩',
  georgia: '🇬🇪',
  french_guiana: '🇬🇫',
  guernsey: '🇬🇬',
  ghana: '🇬🇭',
  gibraltar: '🇬🇮',
  greenland: '🇬🇱',
  gambia: '🇬🇲',
  guinea: '🇬🇳',
  guadeloupe: '🇬🇵',
  equatorial_guinea: '🇬🇶',
  greece: '🇬🇷',
  south_georgia_south_sandwich_islands: '🇬🇸',
  guatemala: '🇬🇹',
  guam: '🇬🇺',
  guinea_bissau: '🇬🇼',
  guyana: '🇬🇾',
  hong_kong: '🇭🇰',
  heard_mcdonald_islands: '🇭🇲',
  honduras: '🇭🇳',
  croatia: '🇭🇷',
  haiti: '🇭🇹',
  hungary: '🇭🇺',
  canary_islands: '🇮🇨',
  indonesia: '🇮🇩',
  ireland: '🇮🇪',
  israel: '🇮🇱',
  isle_of_man: '🇮🇲',
  india: '🇮🇳',
  british_indian_ocean_territory: '🇮🇴',
  iraq: '🇮🇶',
  iran: '🇮🇷',
  iceland: '🇮🇸',
  it: '🇮🇹',
  jersey: '🇯🇪',
  jamaica: '🇯🇲',
  jordan: '🇯🇴',
  jp: '🇯🇵',
  kenya: '🇰🇪',
  kyrgyzstan: '🇰🇬',
  cambodia: '🇰🇭',
  kiribati: '🇰🇮',
  comoros: '🇰🇲',
  st_kitts_nevis: '🇰🇳',
  north_korea: '🇰🇵',
  kr: '🇰🇷',
  kuwait: '🇰🇼',
  cayman_islands: '🇰🇾',
  kazakhstan: '🇰🇿',
  laos: '🇱🇦',
  lebanon: '🇱🇧',
  st_lucia: '🇱🇨',
  liechtenstein: '🇱🇮',
  sri_lanka: '🇱🇰',
  liberia: '🇱🇷',
  lesotho: '🇱🇸',
  lithuania: '🇱🇹',
  luxembourg: '🇱🇺',
  latvia: '🇱🇻',
  libya: '🇱🇾',
  morocco: '🇲🇦',
  monaco: '🇲🇨',
  moldova: '🇲🇩',
  montenegro: '🇲🇪',
  st_martin: '🇲🇫',
  madagascar: '🇲🇬',
  marshall_islands: '🇲🇭',
  macedonia: '🇲🇰',
  mali: '🇲🇱',
  myanmar: '🇲🇲',
  mongolia: '🇲🇳',
  macau: '🇲🇴',
  northern_mariana_islands: '🇲🇵',
  martinique: '🇲🇶',
  mauritania: '🇲🇷',
  montserrat: '🇲🇸',
  malta: '🇲🇹',
  mauritius: '🇲🇺',
  maldives: '🇲🇻',
  malawi: '🇲🇼',
  mexico: '🇲🇽',
  malaysia: '🇲🇾',
  mozambique: '🇲🇿',
  namibia: '🇳🇦',
  new_caledonia: '🇳🇨',
  niger: '🇳🇪',
  norfolk_island: '🇳🇫',
  nigeria: '🇳🇬',
  nicaragua: '🇳🇮',
  netherlands: '🇳🇱',
  norway: '🇳🇴',
  nepal: '🇳🇵',
  nauru: '🇳🇷',
  niue: '🇳🇺',
  new_zealand: '🇳🇿',
  oman: '🇴🇲',
  panama: '🇵🇦',
  peru: '🇵🇪',
  french_polynesia: '🇵🇫',
  papua_new_guinea: '🇵🇬',
  philippines: '🇵🇭',
  pakistan: '🇵🇰',
  poland: '🇵🇱',
  st_pierre_miquelon: '🇵🇲',
  pitcairn_islands: '🇵🇳',
  puerto_rico: '🇵🇷',
  palestinian_territories: '🇵🇸',
  portugal: '🇵🇹',
  palau: '🇵🇼',
  paraguay: '🇵🇾',
  qatar: '🇶🇦',
  reunion: '🇷🇪',
  romania: '🇷🇴',
  serbia: '🇷🇸',
  ru: '🇷🇺',
  rwanda: '🇷🇼',
  saudi_arabia: '🇸🇦',
  solomon_islands: '🇸🇧',
  seychelles: '🇸🇨',
  sudan: '🇸🇩',
  sweden: '🇸🇪',
  singapore: '🇸🇬',
  st_helena: '🇸🇭',
  slovenia: '🇸🇮',
  svalbard_jan_mayen: '🇸🇯',
  slovakia: '🇸🇰',
  sierra_leone: '🇸🇱',
  san_marino: '🇸🇲',
  senegal: '🇸🇳',
  somalia: '🇸🇴',
  suriname: '🇸🇷',
  south_sudan: '🇸🇸',
  sao_tome_principe: '🇸🇹',
  el_salvador: '🇸🇻',
  sint_maarten: '🇸🇽',
  syria: '🇸🇾',
  swaziland: '🇸🇿',
  tristan_da_cunha: '🇹🇦',
  turks_caicos_islands: '🇹🇨',
  chad: '🇹🇩',
  french_southern_territories: '🇹🇫',
  togo: '🇹🇬',
  thailand: '🇹🇭',
  tajikistan: '🇹🇯',
  tokelau: '🇹🇰',
  timor_leste: '🇹🇱',
  turkmenistan: '🇹🇲',
  tunisia: '🇹🇳',
  tonga: '🇹🇴',
  tr: '🇹🇷',
  trinidad_tobago: '🇹🇹',
  tuvalu: '🇹🇻',
  taiwan: '🇹🇼',
  tanzania: '🇹🇿',
  ukraine: '🇺🇦',
  uganda: '🇺🇬',
  us_outlying_islands: '🇺🇲',
  united_nations: '🇺🇳',
  us: '🇺🇸',
  uruguay: '🇺🇾',
  uzbekistan: '🇺🇿',
  vatican_city: '🇻🇦',
  st_vincent_grenadines: '🇻🇨',
  venezuela: '🇻🇪',
  british_virgin_islands: '🇻🇬',
  us_virgin_islands: '🇻🇮',
  vietnam: '🇻🇳',
  vanuatu: '🇻🇺',
  wallis_futuna: '🇼🇫',
  samoa: '🇼🇸',
  kosovo: '🇽🇰',
  yemen: '🇾🇪',
  mayotte: '🇾🇹',
  south_africa: '🇿🇦',
  zambia: '🇿🇲',
  zimbabwe: '🇿🇼',
  england: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿'
};

/**
 * @typedef {import('mdast').Root} Root
 */

const find = /:(\+1|[-\w]+):/g;

const own$3 = {}.hasOwnProperty;

/**
 * Plugin to turn gemoji shortcodes (`:+1:`) into emoji (`👍`).
 *
 * @type {import('unified').Plugin<void[], Root>}
 */
function remarkGemoji() {
  return (tree) => {
    visit(tree, 'text', (node) => {
      const value = node.value;
      /** @type {string[]} */
      const slices = [];
      find.lastIndex = 0;
      let match = find.exec(value);
      let start = 0;

      while (match) {
        const emoji = /** @type {keyof nameToEmoji} */ (match[1]);
        const position = match.index;

        if (own$3.call(nameToEmoji, emoji)) {
          if (start !== position) {
            slices.push(value.slice(start, position));
          }

          slices.push(nameToEmoji[emoji]);
          start = position + match[0].length;
        } else {
          find.lastIndex = position + 1;
        }

        match = find.exec(value);
      }

      if (slices.length > 0) {
        slices.push(value.slice(start));
        node.value = slices.join('');
      }
    });
  }
}

/**
 * @typedef {import('micromark-util-types').Extension} Extension
 * @typedef {import('micromark-util-types').ConstructRecord} ConstructRecord
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').Previous} Previous
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Event} Event
 * @typedef {import('micromark-util-types').Code} Code
 */
const www = {
  tokenize: tokenizeWww,
  partial: true
};
const domain = {
  tokenize: tokenizeDomain,
  partial: true
};
const path = {
  tokenize: tokenizePath,
  partial: true
};
const punctuation = {
  tokenize: tokenizePunctuation,
  partial: true
};
const namedCharacterReference = {
  tokenize: tokenizeNamedCharacterReference,
  partial: true
};
const wwwAutolink = {
  tokenize: tokenizeWwwAutolink,
  previous: previousWww
};
const httpAutolink = {
  tokenize: tokenizeHttpAutolink,
  previous: previousHttp
};
const emailAutolink = {
  tokenize: tokenizeEmailAutolink,
  previous: previousEmail
};
/** @type {ConstructRecord} */

const text$1 = {};
/** @type {Extension} */

const gfmAutolinkLiteral = {
  text: text$1
};
let code$1 = 48; // Add alphanumerics.

while (code$1 < 123) {
  text$1[code$1] = emailAutolink;
  code$1++;
  if (code$1 === 58) code$1 = 65;
  else if (code$1 === 91) code$1 = 97;
}

text$1[43] = emailAutolink;
text$1[45] = emailAutolink;
text$1[46] = emailAutolink;
text$1[95] = emailAutolink;
text$1[72] = [emailAutolink, httpAutolink];
text$1[104] = [emailAutolink, httpAutolink];
text$1[87] = [emailAutolink, wwwAutolink];
text$1[119] = [emailAutolink, wwwAutolink];
/** @type {Tokenizer} */

function tokenizeEmailAutolink(effects, ok, nok) {
  const self = this;
  /** @type {boolean} */

  let hasDot;
  /** @type {boolean|undefined} */

  let hasDigitInLastSegment;
  return start
  /** @type {State} */

  function start(code) {
    if (
      !gfmAtext(code) ||
      !previousEmail(self.previous) ||
      previousUnbalanced(self.events)
    ) {
      return nok(code)
    }

    effects.enter('literalAutolink');
    effects.enter('literalAutolinkEmail');
    return atext(code)
  }
  /** @type {State} */

  function atext(code) {
    if (gfmAtext(code)) {
      effects.consume(code);
      return atext
    }

    if (code === 64) {
      effects.consume(code);
      return label
    }

    return nok(code)
  }
  /** @type {State} */

  function label(code) {
    if (code === 46) {
      return effects.check(punctuation, done, dotContinuation)(code)
    }

    if (code === 45 || code === 95) {
      return effects.check(punctuation, nok, dashOrUnderscoreContinuation)(code)
    }

    if (asciiAlphanumeric(code)) {
      if (!hasDigitInLastSegment && asciiDigit(code)) {
        hasDigitInLastSegment = true;
      }

      effects.consume(code);
      return label
    }

    return done(code)
  }
  /** @type {State} */

  function dotContinuation(code) {
    effects.consume(code);
    hasDot = true;
    hasDigitInLastSegment = undefined;
    return label
  }
  /** @type {State} */

  function dashOrUnderscoreContinuation(code) {
    effects.consume(code);
    return afterDashOrUnderscore
  }
  /** @type {State} */

  function afterDashOrUnderscore(code) {
    if (code === 46) {
      return effects.check(punctuation, nok, dotContinuation)(code)
    }

    return label(code)
  }
  /** @type {State} */

  function done(code) {
    if (hasDot && !hasDigitInLastSegment) {
      effects.exit('literalAutolinkEmail');
      effects.exit('literalAutolink');
      return ok(code)
    }

    return nok(code)
  }
}
/** @type {Tokenizer} */

function tokenizeWwwAutolink(effects, ok, nok) {
  const self = this;
  return start
  /** @type {State} */

  function start(code) {
    if (
      (code !== 87 && code !== 119) ||
      !previousWww(self.previous) ||
      previousUnbalanced(self.events)
    ) {
      return nok(code)
    }

    effects.enter('literalAutolink');
    effects.enter('literalAutolinkWww'); // For `www.` we check instead of attempt, because when it matches, GH
    // treats it as part of a domain (yes, it says a valid domain must come
    // after `www.`, but that’s not how it’s implemented by them).

    return effects.check(
      www,
      effects.attempt(domain, effects.attempt(path, done), nok),
      nok
    )(code)
  }
  /** @type {State} */

  function done(code) {
    effects.exit('literalAutolinkWww');
    effects.exit('literalAutolink');
    return ok(code)
  }
}
/** @type {Tokenizer} */

function tokenizeHttpAutolink(effects, ok, nok) {
  const self = this;
  return start
  /** @type {State} */

  function start(code) {
    if (
      (code !== 72 && code !== 104) ||
      !previousHttp(self.previous) ||
      previousUnbalanced(self.events)
    ) {
      return nok(code)
    }

    effects.enter('literalAutolink');
    effects.enter('literalAutolinkHttp');
    effects.consume(code);
    return t1
  }
  /** @type {State} */

  function t1(code) {
    if (code === 84 || code === 116) {
      effects.consume(code);
      return t2
    }

    return nok(code)
  }
  /** @type {State} */

  function t2(code) {
    if (code === 84 || code === 116) {
      effects.consume(code);
      return p
    }

    return nok(code)
  }
  /** @type {State} */

  function p(code) {
    if (code === 80 || code === 112) {
      effects.consume(code);
      return s
    }

    return nok(code)
  }
  /** @type {State} */

  function s(code) {
    if (code === 83 || code === 115) {
      effects.consume(code);
      return colon
    }

    return colon(code)
  }
  /** @type {State} */

  function colon(code) {
    if (code === 58) {
      effects.consume(code);
      return slash1
    }

    return nok(code)
  }
  /** @type {State} */

  function slash1(code) {
    if (code === 47) {
      effects.consume(code);
      return slash2
    }

    return nok(code)
  }
  /** @type {State} */

  function slash2(code) {
    if (code === 47) {
      effects.consume(code);
      return after
    }

    return nok(code)
  }
  /** @type {State} */

  function after(code) {
    return code === null ||
      asciiControl(code) ||
      unicodeWhitespace(code) ||
      unicodePunctuation(code)
      ? nok(code)
      : effects.attempt(domain, effects.attempt(path, done), nok)(code)
  }
  /** @type {State} */

  function done(code) {
    effects.exit('literalAutolinkHttp');
    effects.exit('literalAutolink');
    return ok(code)
  }
}
/** @type {Tokenizer} */

function tokenizeWww(effects, ok, nok) {
  return start
  /** @type {State} */

  function start(code) {
    effects.consume(code);
    return w2
  }
  /** @type {State} */

  function w2(code) {
    if (code === 87 || code === 119) {
      effects.consume(code);
      return w3
    }

    return nok(code)
  }
  /** @type {State} */

  function w3(code) {
    if (code === 87 || code === 119) {
      effects.consume(code);
      return dot
    }

    return nok(code)
  }
  /** @type {State} */

  function dot(code) {
    if (code === 46) {
      effects.consume(code);
      return after
    }

    return nok(code)
  }
  /** @type {State} */

  function after(code) {
    return code === null || markdownLineEnding(code) ? nok(code) : ok(code)
  }
}
/** @type {Tokenizer} */

function tokenizeDomain(effects, ok, nok) {
  /** @type {boolean|undefined} */
  let hasUnderscoreInLastSegment;
  /** @type {boolean|undefined} */

  let hasUnderscoreInLastLastSegment;
  return domain
  /** @type {State} */

  function domain(code) {
    if (code === 38) {
      return effects.check(
        namedCharacterReference,
        done,
        punctuationContinuation
      )(code)
    }

    if (code === 46 || code === 95) {
      return effects.check(punctuation, done, punctuationContinuation)(code)
    } // GH documents that only alphanumerics (other than `-`, `.`, and `_`) can
    // occur, which sounds like ASCII only, but they also support `www.點看.com`,
    // so that’s Unicode.
    // Instead of some new production for Unicode alphanumerics, markdown
    // already has that for Unicode punctuation and whitespace, so use those.

    if (
      code === null ||
      asciiControl(code) ||
      unicodeWhitespace(code) ||
      (code !== 45 && unicodePunctuation(code))
    ) {
      return done(code)
    }

    effects.consume(code);
    return domain
  }
  /** @type {State} */

  function punctuationContinuation(code) {
    if (code === 46) {
      hasUnderscoreInLastLastSegment = hasUnderscoreInLastSegment;
      hasUnderscoreInLastSegment = undefined;
      effects.consume(code);
      return domain
    }

    if (code === 95) hasUnderscoreInLastSegment = true;
    effects.consume(code);
    return domain
  }
  /** @type {State} */

  function done(code) {
    if (!hasUnderscoreInLastLastSegment && !hasUnderscoreInLastSegment) {
      return ok(code)
    }

    return nok(code)
  }
}
/** @type {Tokenizer} */

function tokenizePath(effects, ok) {
  let balance = 0;
  return inPath
  /** @type {State} */

  function inPath(code) {
    if (code === 38) {
      return effects.check(
        namedCharacterReference,
        ok,
        continuedPunctuation
      )(code)
    }

    if (code === 40) {
      balance++;
    }

    if (code === 41) {
      return effects.check(
        punctuation,
        parenAtPathEnd,
        continuedPunctuation
      )(code)
    }

    if (pathEnd(code)) {
      return ok(code)
    }

    if (trailingPunctuation(code)) {
      return effects.check(punctuation, ok, continuedPunctuation)(code)
    }

    effects.consume(code);
    return inPath
  }
  /** @type {State} */

  function continuedPunctuation(code) {
    effects.consume(code);
    return inPath
  }
  /** @type {State} */

  function parenAtPathEnd(code) {
    balance--;
    return balance < 0 ? ok(code) : continuedPunctuation(code)
  }
}
/** @type {Tokenizer} */

function tokenizeNamedCharacterReference(effects, ok, nok) {
  return start
  /** @type {State} */

  function start(code) {
    effects.consume(code);
    return inside
  }
  /** @type {State} */

  function inside(code) {
    if (asciiAlpha(code)) {
      effects.consume(code);
      return inside
    }

    if (code === 59) {
      effects.consume(code);
      return after
    }

    return nok(code)
  }
  /** @type {State} */

  function after(code) {
    // If the named character reference is followed by the end of the path, it’s
    // not continued punctuation.
    return pathEnd(code) ? ok(code) : nok(code)
  }
}
/** @type {Tokenizer} */

function tokenizePunctuation(effects, ok, nok) {
  return start
  /** @type {State} */

  function start(code) {
    effects.consume(code);
    return after
  }
  /** @type {State} */

  function after(code) {
    // Check the next.
    if (trailingPunctuation(code)) {
      effects.consume(code);
      return after
    } // If the punctuation marker is followed by the end of the path, it’s not
    // continued punctuation.

    return pathEnd(code) ? ok(code) : nok(code)
  }
}
/**
 * @param {Code} code
 * @returns {boolean}
 */

function trailingPunctuation(code) {
  return (
    code === 33 ||
    code === 34 ||
    code === 39 ||
    code === 41 ||
    code === 42 ||
    code === 44 ||
    code === 46 ||
    code === 58 ||
    code === 59 ||
    code === 60 ||
    code === 63 ||
    code === 95 ||
    code === 126
  )
}
/**
 * @param {Code} code
 * @returns {boolean}
 */

function pathEnd(code) {
  return code === null || code === 60 || markdownLineEndingOrSpace(code)
}
/**
 * @param {Code} code
 * @returns {boolean}
 */

function gfmAtext(code) {
  return (
    code === 43 ||
    code === 45 ||
    code === 46 ||
    code === 95 ||
    asciiAlphanumeric(code)
  )
}
/** @type {Previous} */

function previousWww(code) {
  return (
    code === null ||
    code === 40 ||
    code === 42 ||
    code === 95 ||
    code === 126 ||
    markdownLineEndingOrSpace(code)
  )
}
/** @type {Previous} */

function previousHttp(code) {
  return code === null || !asciiAlpha(code)
}
/** @type {Previous} */

function previousEmail(code) {
  return code !== 47 && previousHttp(code)
}
/**
 * @param {Array<Event>} events
 * @returns {boolean}
 */

function previousUnbalanced(events) {
  let index = events.length;
  let result = false;

  while (index--) {
    const token = events[index][1];

    if (
      (token.type === 'labelLink' || token.type === 'labelImage') &&
      !token._balanced
    ) {
      result = true;
      break
    } // @ts-expect-error If we’ve seen this token, and it was marked as not
    // having any unbalanced bracket before it, we can exit.

    if (token._gfmAutolinkLiteralWalkedInto) {
      result = false;
      break
    }
  }

  if (events.length > 0 && !result) {
    // @ts-expect-error Mark the last token as “walked into” w/o finding
    // anything.
    events[events.length - 1][1]._gfmAutolinkLiteralWalkedInto = true;
  }

  return result
}

/**
 * Normalize a URL (such as used in definitions).
 *
 * Encode unsafe characters with percent-encoding, skipping already encoded
 * sequences.
 *
 * @param {string} value
 * @returns {string}
 */

function normalizeUri(value) {
  /** @type {Array<string>} */
  const result = [];
  let index = -1;
  let start = 0;
  let skip = 0;

  while (++index < value.length) {
    const code = value.charCodeAt(index);
    /** @type {string} */

    let replace = ''; // A correct percent encoded value.

    if (
      code === 37 &&
      asciiAlphanumeric(value.charCodeAt(index + 1)) &&
      asciiAlphanumeric(value.charCodeAt(index + 2))
    ) {
      skip = 2;
    } // ASCII.
    else if (code < 128) {
      if (!/[!#$&-;=?-Z_a-z~]/.test(String.fromCharCode(code))) {
        replace = String.fromCharCode(code);
      }
    } // Astral.
    else if (code > 55295 && code < 57344) {
      const next = value.charCodeAt(index + 1); // A correct surrogate pair.

      if (code < 56320 && next > 56319 && next < 57344) {
        replace = String.fromCharCode(code, next);
        skip = 1;
      } // Lone surrogate.
      else {
        replace = '\uFFFD';
      }
    } // Unicode.
    else {
      replace = String.fromCharCode(code);
    }

    if (replace) {
      result.push(value.slice(start, index), encodeURIComponent(replace));
      start = index + skip + 1;
      replace = '';
    }

    if (skip) {
      index += skip;
      skip = 0;
    }
  }

  return result.join('') + value.slice(start)
}

/**
 * @typedef {import('micromark-util-types').Extension} Extension
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').Exiter} Exiter
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Event} Event
 */
const indent = {
  tokenize: tokenizeIndent,
  partial: true
};
/**
 * @returns {Extension}
 */

function gfmFootnote() {
  /** @type {Extension} */
  return {
    document: {
      [91]: {
        tokenize: tokenizeDefinitionStart,
        continuation: {
          tokenize: tokenizeDefinitionContinuation
        },
        exit: gfmFootnoteDefinitionEnd
      }
    },
    text: {
      [91]: {
        tokenize: tokenizeGfmFootnoteCall
      },
      [93]: {
        add: 'after',
        tokenize: tokenizePotentialGfmFootnoteCall,
        resolveTo: resolveToPotentialGfmFootnoteCall
      }
    }
  }
}
/** @type {Tokenizer} */

function tokenizePotentialGfmFootnoteCall(effects, ok, nok) {
  const self = this;
  let index = self.events.length;
  /** @type {Array<string>} */
  // @ts-expect-error It’s fine!

  const defined = self.parser.gfmFootnotes || (self.parser.gfmFootnotes = []);
  /** @type {Token} */

  let labelStart; // Find an opening.

  while (index--) {
    const token = self.events[index][1];

    if (token.type === 'labelImage') {
      labelStart = token;
      break
    } // Exit if we’ve walked far enough.

    if (
      token.type === 'gfmFootnoteCall' ||
      token.type === 'labelLink' ||
      token.type === 'label' ||
      token.type === 'image' ||
      token.type === 'link'
    ) {
      break
    }
  }

  return start
  /** @type {State} */

  function start(code) {
    if (!labelStart || !labelStart._balanced) {
      return nok(code)
    }

    const id = normalizeIdentifier(
      self.sliceSerialize({
        start: labelStart.end,
        end: self.now()
      })
    );

    if (id.charCodeAt(0) !== 94 || !defined.includes(id.slice(1))) {
      return nok(code)
    }

    effects.enter('gfmFootnoteCallLabelMarker');
    effects.consume(code);
    effects.exit('gfmFootnoteCallLabelMarker');
    return ok(code)
  }
}
/** @type {Resolver} */

function resolveToPotentialGfmFootnoteCall(events, context) {
  let index = events.length;

  while (index--) {
    if (
      events[index][1].type === 'labelImage' &&
      events[index][0] === 'enter'
    ) {
      events[index][1];
      break
    }
  }

  // Change the `labelImageMarker` to a `data`.
  events[index + 1][1].type = 'data';
  events[index + 3][1].type = 'gfmFootnoteCallLabelMarker'; // The whole (without `!`):

  const call = {
    type: 'gfmFootnoteCall',
    start: Object.assign({}, events[index + 3][1].start),
    end: Object.assign({}, events[events.length - 1][1].end)
  }; // The `^` marker

  const marker = {
    type: 'gfmFootnoteCallMarker',
    start: Object.assign({}, events[index + 3][1].end),
    end: Object.assign({}, events[index + 3][1].end)
  }; // Increment the end 1 character.

  marker.end.column++;
  marker.end.offset++;
  marker.end._bufferIndex++;
  const string = {
    type: 'gfmFootnoteCallString',
    start: Object.assign({}, marker.end),
    end: Object.assign({}, events[events.length - 1][1].start)
  };
  const chunk = {
    type: 'chunkString',
    contentType: 'string',
    start: Object.assign({}, string.start),
    end: Object.assign({}, string.end)
  };
  /** @type {Array<Event>} */

  const replacement = [
    // Take the `labelImageMarker` (now `data`, the `!`)
    events[index + 1],
    events[index + 2],
    ['enter', call, context], // The `[`
    events[index + 3],
    events[index + 4], // The `^`.
    ['enter', marker, context],
    ['exit', marker, context], // Everything in between.
    ['enter', string, context],
    ['enter', chunk, context],
    ['exit', chunk, context],
    ['exit', string, context], // The ending (`]`, properly parsed and labelled).
    events[events.length - 2],
    events[events.length - 1],
    ['exit', call, context]
  ];
  events.splice(index, events.length - index + 1, ...replacement);
  return events
}
/** @type {Tokenizer} */

function tokenizeGfmFootnoteCall(effects, ok, nok) {
  const self = this;
  /** @type {Array<string>} */
  // @ts-expect-error It’s fine!

  const defined = self.parser.gfmFootnotes || (self.parser.gfmFootnotes = []);
  let size = 0;
  /** @type {boolean} */

  let data;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('gfmFootnoteCall');
    effects.enter('gfmFootnoteCallLabelMarker');
    effects.consume(code);
    effects.exit('gfmFootnoteCallLabelMarker');
    return callStart
  }
  /** @type {State} */

  function callStart(code) {
    if (code !== 94) return nok(code)
    effects.enter('gfmFootnoteCallMarker');
    effects.consume(code);
    effects.exit('gfmFootnoteCallMarker');
    effects.enter('gfmFootnoteCallString');
    effects.enter('chunkString').contentType = 'string';
    return callData
  }
  /** @type {State} */

  function callData(code) {
    /** @type {Token} */
    let token;

    if (code === null || code === 91 || size++ > 999) {
      return nok(code)
    }

    if (code === 93) {
      if (!data) {
        return nok(code)
      }

      effects.exit('chunkString');
      token = effects.exit('gfmFootnoteCallString');
      return defined.includes(normalizeIdentifier(self.sliceSerialize(token)))
        ? end(code)
        : nok(code)
    }

    effects.consume(code);

    if (!markdownLineEndingOrSpace(code)) {
      data = true;
    }

    return code === 92 ? callEscape : callData
  }
  /** @type {State} */

  function callEscape(code) {
    if (code === 91 || code === 92 || code === 93) {
      effects.consume(code);
      size++;
      return callData
    }

    return callData(code)
  }
  /** @type {State} */

  function end(code) {
    effects.enter('gfmFootnoteCallLabelMarker');
    effects.consume(code);
    effects.exit('gfmFootnoteCallLabelMarker');
    effects.exit('gfmFootnoteCall');
    return ok
  }
}
/** @type {Tokenizer} */

function tokenizeDefinitionStart(effects, ok, nok) {
  const self = this;
  /** @type {Array<string>} */
  // @ts-expect-error It’s fine!

  const defined = self.parser.gfmFootnotes || (self.parser.gfmFootnotes = []);
  /** @type {string} */

  let identifier;
  let size = 0;
  /** @type {boolean|undefined} */

  let data;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('gfmFootnoteDefinition')._container = true;
    effects.enter('gfmFootnoteDefinitionLabel');
    effects.enter('gfmFootnoteDefinitionLabelMarker');
    effects.consume(code);
    effects.exit('gfmFootnoteDefinitionLabelMarker');
    return labelStart
  }
  /** @type {State} */

  function labelStart(code) {
    if (code === 94) {
      effects.enter('gfmFootnoteDefinitionMarker');
      effects.consume(code);
      effects.exit('gfmFootnoteDefinitionMarker');
      effects.enter('gfmFootnoteDefinitionLabelString');
      return atBreak
    }

    return nok(code)
  }
  /** @type {State} */

  function atBreak(code) {
    /** @type {Token} */
    let token;

    if (code === null || code === 91 || size > 999) {
      return nok(code)
    }

    if (code === 93) {
      if (!data) {
        return nok(code)
      }

      token = effects.exit('gfmFootnoteDefinitionLabelString');
      identifier = normalizeIdentifier(self.sliceSerialize(token));
      effects.enter('gfmFootnoteDefinitionLabelMarker');
      effects.consume(code);
      effects.exit('gfmFootnoteDefinitionLabelMarker');
      effects.exit('gfmFootnoteDefinitionLabel');
      return labelAfter
    }

    if (markdownLineEnding(code)) {
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      size++;
      return atBreak
    }

    effects.enter('chunkString').contentType = 'string';
    return label(code)
  }
  /** @type {State} */

  function label(code) {
    if (
      code === null ||
      markdownLineEnding(code) ||
      code === 91 ||
      code === 93 ||
      size > 999
    ) {
      effects.exit('chunkString');
      return atBreak(code)
    }

    if (!markdownLineEndingOrSpace(code)) {
      data = true;
    }

    size++;
    effects.consume(code);
    return code === 92 ? labelEscape : label
  }
  /** @type {State} */

  function labelEscape(code) {
    if (code === 91 || code === 92 || code === 93) {
      effects.consume(code);
      size++;
      return label
    }

    return label(code)
  }
  /** @type {State} */

  function labelAfter(code) {
    if (code === 58) {
      effects.enter('definitionMarker');
      effects.consume(code);
      effects.exit('definitionMarker'); // Any whitespace after the marker is eaten, forming indented code
      // is not possible.
      // No space is also fine, just like a block quote marker.

      return factorySpace(effects, done, 'gfmFootnoteDefinitionWhitespace')
    }

    return nok(code)
  }
  /** @type {State} */

  function done(code) {
    if (!defined.includes(identifier)) {
      defined.push(identifier);
    }

    return ok(code)
  }
}
/** @type {Tokenizer} */

function tokenizeDefinitionContinuation(effects, ok, nok) {
  // Either a blank line, which is okay, or an indented thing.
  return effects.check(blankLine, ok, effects.attempt(indent, ok, nok))
}
/** @type {Exiter} */

function gfmFootnoteDefinitionEnd(effects) {
  effects.exit('gfmFootnoteDefinition');
}
/** @type {Tokenizer} */

function tokenizeIndent(effects, ok, nok) {
  const self = this;
  return factorySpace(
    effects,
    afterPrefix,
    'gfmFootnoteDefinitionIndent',
    4 + 1
  )
  /** @type {State} */

  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return tail &&
      tail[1].type === 'gfmFootnoteDefinitionIndent' &&
      tail[2].sliceSerialize(tail[1], true).length === 4
      ? ok(code)
      : nok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Extension} Extension
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').Event} Event
 */

/**
 * @param {Options} [options]
 * @returns {Extension}
 */
function gfmStrikethrough(options = {}) {
  let single = options.singleTilde;
  const tokenizer = {
    tokenize: tokenizeStrikethrough,
    resolveAll: resolveAllStrikethrough
  };

  if (single === null || single === undefined) {
    single = true;
  }

  return {
    text: {
      [126]: tokenizer
    },
    insideSpan: {
      null: [tokenizer]
    },
    attentionMarkers: {
      null: [126]
    }
  }
  /**
   * Take events and resolve strikethrough.
   *
   * @type {Resolver}
   */

  function resolveAllStrikethrough(events, context) {
    let index = -1; // Walk through all events.

    while (++index < events.length) {
      // Find a token that can close.
      if (
        events[index][0] === 'enter' &&
        events[index][1].type === 'strikethroughSequenceTemporary' &&
        events[index][1]._close
      ) {
        let open = index; // Now walk back to find an opener.

        while (open--) {
          // Find a token that can open the closer.
          if (
            events[open][0] === 'exit' &&
            events[open][1].type === 'strikethroughSequenceTemporary' &&
            events[open][1]._open && // If the sizes are the same:
            events[index][1].end.offset - events[index][1].start.offset ===
              events[open][1].end.offset - events[open][1].start.offset
          ) {
            events[index][1].type = 'strikethroughSequence';
            events[open][1].type = 'strikethroughSequence';
            const strikethrough = {
              type: 'strikethrough',
              start: Object.assign({}, events[open][1].start),
              end: Object.assign({}, events[index][1].end)
            };
            const text = {
              type: 'strikethroughText',
              start: Object.assign({}, events[open][1].end),
              end: Object.assign({}, events[index][1].start)
            }; // Opening.

            const nextEvents = [
              ['enter', strikethrough, context],
              ['enter', events[open][1], context],
              ['exit', events[open][1], context],
              ['enter', text, context]
            ]; // Between.

            splice(
              nextEvents,
              nextEvents.length,
              0,
              resolveAll(
                context.parser.constructs.insideSpan.null,
                events.slice(open + 1, index),
                context
              )
            ); // Closing.

            splice(nextEvents, nextEvents.length, 0, [
              ['exit', text, context],
              ['enter', events[index][1], context],
              ['exit', events[index][1], context],
              ['exit', strikethrough, context]
            ]);
            splice(events, open - 1, index - open + 3, nextEvents);
            index = open + nextEvents.length - 2;
            break
          }
        }
      }
    }

    index = -1;

    while (++index < events.length) {
      if (events[index][1].type === 'strikethroughSequenceTemporary') {
        events[index][1].type = 'data';
      }
    }

    return events
  }
  /** @type {Tokenizer} */

  function tokenizeStrikethrough(effects, ok, nok) {
    const previous = this.previous;
    const events = this.events;
    let size = 0;
    return start
    /** @type {State} */

    function start(code) {
      if (
        previous === 126 &&
        events[events.length - 1][1].type !== 'characterEscape'
      ) {
        return nok(code)
      }

      effects.enter('strikethroughSequenceTemporary');
      return more(code)
    }
    /** @type {State} */

    function more(code) {
      const before = classifyCharacter(previous);

      if (code === 126) {
        // If this is the third marker, exit.
        if (size > 1) return nok(code)
        effects.consume(code);
        size++;
        return more
      }

      if (size < 2 && !single) return nok(code)
      const token = effects.exit('strikethroughSequenceTemporary');
      const after = classifyCharacter(code);
      token._open = !after || (after === 2 && Boolean(before));
      token._close = !before || (before === 2 && Boolean(after));
      return ok(code)
    }
  }
}

/**
 * @typedef {import('micromark-util-types').Extension} Extension
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Token} Token
 */

/** @type {Extension} */
const gfmTable = {
  flow: {
    null: {
      tokenize: tokenizeTable,
      resolve: resolveTable
    }
  }
};
const nextPrefixedOrBlank = {
  tokenize: tokenizeNextPrefixedOrBlank,
  partial: true
};
/** @type {Resolver} */

function resolveTable(events, context) {
  let index = -1;
  /** @type {boolean|undefined} */

  let inHead;
  /** @type {boolean|undefined} */

  let inDelimiterRow;
  /** @type {boolean|undefined} */

  let inRow;
  /** @type {number|undefined} */

  let contentStart;
  /** @type {number|undefined} */

  let contentEnd;
  /** @type {number|undefined} */

  let cellStart;
  /** @type {boolean|undefined} */

  let seenCellInRow;

  while (++index < events.length) {
    const token = events[index][1];

    if (inRow) {
      if (token.type === 'temporaryTableCellContent') {
        contentStart = contentStart || index;
        contentEnd = index;
      }

      if (
        // Combine separate content parts into one.
        (token.type === 'tableCellDivider' || token.type === 'tableRow') &&
        contentEnd
      ) {
        const content = {
          type: 'tableContent',
          start: events[contentStart][1].start,
          end: events[contentEnd][1].end
        };
        /** @type {Token} */

        const text = {
          type: 'chunkText',
          start: content.start,
          end: content.end,
          // @ts-expect-error It’s fine.
          contentType: 'text'
        };
        events.splice(
          contentStart,
          contentEnd - contentStart + 1,
          ['enter', content, context],
          ['enter', text, context],
          ['exit', text, context],
          ['exit', content, context]
        );
        index -= contentEnd - contentStart - 3;
        contentStart = undefined;
        contentEnd = undefined;
      }
    }

    if (
      events[index][0] === 'exit' &&
      cellStart !== undefined &&
      cellStart + (seenCellInRow ? 0 : 1) < index &&
      (token.type === 'tableCellDivider' ||
        (token.type === 'tableRow' &&
          (cellStart + 3 < index ||
            events[cellStart][1].type !== 'whitespace')))
    ) {
      const cell = {
        type: inDelimiterRow
          ? 'tableDelimiter'
          : inHead
          ? 'tableHeader'
          : 'tableData',
        start: events[cellStart][1].start,
        end: events[index][1].end
      };
      events.splice(index + (token.type === 'tableCellDivider' ? 1 : 0), 0, [
        'exit',
        cell,
        context
      ]);
      events.splice(cellStart, 0, ['enter', cell, context]);
      index += 2;
      cellStart = index + 1;
      seenCellInRow = true;
    }

    if (token.type === 'tableRow') {
      inRow = events[index][0] === 'enter';

      if (inRow) {
        cellStart = index + 1;
        seenCellInRow = false;
      }
    }

    if (token.type === 'tableDelimiterRow') {
      inDelimiterRow = events[index][0] === 'enter';

      if (inDelimiterRow) {
        cellStart = index + 1;
        seenCellInRow = false;
      }
    }

    if (token.type === 'tableHead') {
      inHead = events[index][0] === 'enter';
    }
  }

  return events
}
/** @type {Tokenizer} */

function tokenizeTable(effects, ok, nok) {
  const self = this;
  /** @type {Array<Align>} */

  const align = [];
  let tableHeaderCount = 0;
  /** @type {boolean|undefined} */

  let seenDelimiter;
  /** @type {boolean|undefined} */

  let hasDash;
  return start
  /** @type {State} */

  function start(code) {
    // @ts-expect-error Custom.
    effects.enter('table')._align = align;
    effects.enter('tableHead');
    effects.enter('tableRow'); // If we start with a pipe, we open a cell marker.

    if (code === 124) {
      return cellDividerHead(code)
    }

    tableHeaderCount++;
    effects.enter('temporaryTableCellContent'); // Can’t be space or eols at the start of a construct, so we’re in a cell.

    return inCellContentHead(code)
  }
  /** @type {State} */

  function cellDividerHead(code) {
    effects.enter('tableCellDivider');
    effects.consume(code);
    effects.exit('tableCellDivider');
    seenDelimiter = true;
    return cellBreakHead
  }
  /** @type {State} */

  function cellBreakHead(code) {
    if (code === null || markdownLineEnding(code)) {
      return atRowEndHead(code)
    }

    if (markdownSpace(code)) {
      effects.enter('whitespace');
      effects.consume(code);
      return inWhitespaceHead
    }

    if (seenDelimiter) {
      seenDelimiter = undefined;
      tableHeaderCount++;
    }

    if (code === 124) {
      return cellDividerHead(code)
    } // Anything else is cell content.

    effects.enter('temporaryTableCellContent');
    return inCellContentHead(code)
  }
  /** @type {State} */

  function inWhitespaceHead(code) {
    if (markdownSpace(code)) {
      effects.consume(code);
      return inWhitespaceHead
    }

    effects.exit('whitespace');
    return cellBreakHead(code)
  }
  /** @type {State} */

  function inCellContentHead(code) {
    // EOF, whitespace, pipe
    if (code === null || code === 124 || markdownLineEndingOrSpace(code)) {
      effects.exit('temporaryTableCellContent');
      return cellBreakHead(code)
    }

    effects.consume(code);
    return code === 92 ? inCellContentEscapeHead : inCellContentHead
  }
  /** @type {State} */

  function inCellContentEscapeHead(code) {
    if (code === 92 || code === 124) {
      effects.consume(code);
      return inCellContentHead
    } // Anything else.

    return inCellContentHead(code)
  }
  /** @type {State} */

  function atRowEndHead(code) {
    if (code === null) {
      return nok(code)
    }

    effects.exit('tableRow');
    effects.exit('tableHead');
    const originalInterrupt = self.interrupt;
    self.interrupt = true;
    return effects.attempt(
      {
        tokenize: tokenizeRowEnd,
        partial: true
      },
      function (code) {
        self.interrupt = originalInterrupt;
        effects.enter('tableDelimiterRow');
        return atDelimiterRowBreak(code)
      },
      function (code) {
        self.interrupt = originalInterrupt;
        return nok(code)
      }
    )(code)
  }
  /** @type {State} */

  function atDelimiterRowBreak(code) {
    if (code === null || markdownLineEnding(code)) {
      return rowEndDelimiter(code)
    }

    if (markdownSpace(code)) {
      effects.enter('whitespace');
      effects.consume(code);
      return inWhitespaceDelimiter
    }

    if (code === 45) {
      effects.enter('tableDelimiterFiller');
      effects.consume(code);
      hasDash = true;
      align.push('none');
      return inFillerDelimiter
    }

    if (code === 58) {
      effects.enter('tableDelimiterAlignment');
      effects.consume(code);
      effects.exit('tableDelimiterAlignment');
      align.push('left');
      return afterLeftAlignment
    } // If we start with a pipe, we open a cell marker.

    if (code === 124) {
      effects.enter('tableCellDivider');
      effects.consume(code);
      effects.exit('tableCellDivider');
      return atDelimiterRowBreak
    }

    return nok(code)
  }
  /** @type {State} */

  function inWhitespaceDelimiter(code) {
    if (markdownSpace(code)) {
      effects.consume(code);
      return inWhitespaceDelimiter
    }

    effects.exit('whitespace');
    return atDelimiterRowBreak(code)
  }
  /** @type {State} */

  function inFillerDelimiter(code) {
    if (code === 45) {
      effects.consume(code);
      return inFillerDelimiter
    }

    effects.exit('tableDelimiterFiller');

    if (code === 58) {
      effects.enter('tableDelimiterAlignment');
      effects.consume(code);
      effects.exit('tableDelimiterAlignment');
      align[align.length - 1] =
        align[align.length - 1] === 'left' ? 'center' : 'right';
      return afterRightAlignment
    }

    return atDelimiterRowBreak(code)
  }
  /** @type {State} */

  function afterLeftAlignment(code) {
    if (code === 45) {
      effects.enter('tableDelimiterFiller');
      effects.consume(code);
      hasDash = true;
      return inFillerDelimiter
    } // Anything else is not ok.

    return nok(code)
  }
  /** @type {State} */

  function afterRightAlignment(code) {
    if (code === null || markdownLineEnding(code)) {
      return rowEndDelimiter(code)
    }

    if (markdownSpace(code)) {
      effects.enter('whitespace');
      effects.consume(code);
      return inWhitespaceDelimiter
    } // `|`

    if (code === 124) {
      effects.enter('tableCellDivider');
      effects.consume(code);
      effects.exit('tableCellDivider');
      return atDelimiterRowBreak
    }

    return nok(code)
  }
  /** @type {State} */

  function rowEndDelimiter(code) {
    effects.exit('tableDelimiterRow'); // Exit if there was no dash at all, or if the header cell count is not the
    // delimiter cell count.

    if (!hasDash || tableHeaderCount !== align.length) {
      return nok(code)
    }

    if (code === null) {
      return tableClose(code)
    }

    return effects.check(
      nextPrefixedOrBlank,
      tableClose,
      effects.attempt(
        {
          tokenize: tokenizeRowEnd,
          partial: true
        },
        factorySpace(effects, bodyStart, 'linePrefix', 4),
        tableClose
      )
    )(code)
  }
  /** @type {State} */

  function tableClose(code) {
    effects.exit('table');
    return ok(code)
  }
  /** @type {State} */

  function bodyStart(code) {
    effects.enter('tableBody');
    return rowStartBody(code)
  }
  /** @type {State} */

  function rowStartBody(code) {
    effects.enter('tableRow'); // If we start with a pipe, we open a cell marker.

    if (code === 124) {
      return cellDividerBody(code)
    }

    effects.enter('temporaryTableCellContent'); // Can’t be space or eols at the start of a construct, so we’re in a cell.

    return inCellContentBody(code)
  }
  /** @type {State} */

  function cellDividerBody(code) {
    effects.enter('tableCellDivider');
    effects.consume(code);
    effects.exit('tableCellDivider');
    return cellBreakBody
  }
  /** @type {State} */

  function cellBreakBody(code) {
    if (code === null || markdownLineEnding(code)) {
      return atRowEndBody(code)
    }

    if (markdownSpace(code)) {
      effects.enter('whitespace');
      effects.consume(code);
      return inWhitespaceBody
    } // `|`

    if (code === 124) {
      return cellDividerBody(code)
    } // Anything else is cell content.

    effects.enter('temporaryTableCellContent');
    return inCellContentBody(code)
  }
  /** @type {State} */

  function inWhitespaceBody(code) {
    if (markdownSpace(code)) {
      effects.consume(code);
      return inWhitespaceBody
    }

    effects.exit('whitespace');
    return cellBreakBody(code)
  }
  /** @type {State} */

  function inCellContentBody(code) {
    // EOF, whitespace, pipe
    if (code === null || code === 124 || markdownLineEndingOrSpace(code)) {
      effects.exit('temporaryTableCellContent');
      return cellBreakBody(code)
    }

    effects.consume(code);
    return code === 92 ? inCellContentEscapeBody : inCellContentBody
  }
  /** @type {State} */

  function inCellContentEscapeBody(code) {
    if (code === 92 || code === 124) {
      effects.consume(code);
      return inCellContentBody
    } // Anything else.

    return inCellContentBody(code)
  }
  /** @type {State} */

  function atRowEndBody(code) {
    effects.exit('tableRow');

    if (code === null) {
      return tableBodyClose(code)
    }

    return effects.check(
      nextPrefixedOrBlank,
      tableBodyClose,
      effects.attempt(
        {
          tokenize: tokenizeRowEnd,
          partial: true
        },
        factorySpace(effects, rowStartBody, 'linePrefix', 4),
        tableBodyClose
      )
    )(code)
  }
  /** @type {State} */

  function tableBodyClose(code) {
    effects.exit('tableBody');
    return tableClose(code)
  }
  /** @type {Tokenizer} */

  function tokenizeRowEnd(effects, ok, nok) {
    return start
    /** @type {State} */

    function start(code) {
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      return factorySpace(effects, prefixed, 'linePrefix')
    }
    /** @type {State} */

    function prefixed(code) {
      // Blank or interrupting line.
      if (
        self.parser.lazy[self.now().line] ||
        code === null ||
        markdownLineEnding(code)
      ) {
        return nok(code)
      }

      const tail = self.events[self.events.length - 1]; // Indented code can interrupt delimiter and body rows.

      if (
        !self.parser.constructs.disable.null.includes('codeIndented') &&
        tail &&
        tail[1].type === 'linePrefix' &&
        tail[2].sliceSerialize(tail[1], true).length >= 4
      ) {
        return nok(code)
      }

      self._gfmTableDynamicInterruptHack = true;
      return effects.check(
        self.parser.constructs.flow,
        function (code) {
          self._gfmTableDynamicInterruptHack = false;
          return nok(code)
        },
        function (code) {
          self._gfmTableDynamicInterruptHack = false;
          return ok(code)
        }
      )(code)
    }
  }
}
/** @type {Tokenizer} */

function tokenizeNextPrefixedOrBlank(effects, ok, nok) {
  let size = 0;
  return start
  /** @type {State} */

  function start(code) {
    // This is a check, so we don’t care about tokens, but we open a bogus one
    // so we’re valid.
    effects.enter('check'); // EOL.

    effects.consume(code);
    return whitespace
  }
  /** @type {State} */

  function whitespace(code) {
    if (code === -1 || code === 32) {
      effects.consume(code);
      size++;
      return size === 4 ? ok : whitespace
    } // EOF or whitespace

    if (code === null || markdownLineEndingOrSpace(code)) {
      return ok(code)
    } // Anything else.

    return nok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Extension} Extension
 * @typedef {import('micromark-util-types').ConstructRecord} ConstructRecord
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').Previous} Previous
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Event} Event
 * @typedef {import('micromark-util-types').Code} Code
 */
const tasklistCheck = {
  tokenize: tokenizeTasklistCheck
};
const gfmTaskListItem = {
  text: {
    [91]: tasklistCheck
  }
};
/** @type {Tokenizer} */

function tokenizeTasklistCheck(effects, ok, nok) {
  const self = this;
  return open
  /** @type {State} */

  function open(code) {
    if (
      // Exit if there’s stuff before.
      self.previous !== null || // Exit if not in the first content that is the first child of a list
      // item.
      !self._gfmTasklistFirstContentOfListItem
    ) {
      return nok(code)
    }

    effects.enter('taskListCheck');
    effects.enter('taskListCheckMarker');
    effects.consume(code);
    effects.exit('taskListCheckMarker');
    return inside
  }
  /** @type {State} */

  function inside(code) {
    // To match how GH works in comments, use `markdownSpace` (`[ \t]`) instead
    // of `markdownLineEndingOrSpace` (`[ \t\r\n]`).
    if (markdownLineEndingOrSpace(code)) {
      effects.enter('taskListCheckValueUnchecked');
      effects.consume(code);
      effects.exit('taskListCheckValueUnchecked');
      return close
    }

    if (code === 88 || code === 120) {
      effects.enter('taskListCheckValueChecked');
      effects.consume(code);
      effects.exit('taskListCheckValueChecked');
      return close
    }

    return nok(code)
  }
  /** @type {State} */

  function close(code) {
    if (code === 93) {
      effects.enter('taskListCheckMarker');
      effects.consume(code);
      effects.exit('taskListCheckMarker');
      effects.exit('taskListCheck');
      return effects.check(
        {
          tokenize: spaceThenNonSpace
        },
        ok,
        nok
      )
    }

    return nok(code)
  }
}
/** @type {Tokenizer} */

function spaceThenNonSpace(effects, ok, nok) {
  const self = this;
  return factorySpace(effects, after, 'whitespace')
  /** @type {State} */

  function after(code) {
    const tail = self.events[self.events.length - 1];
    return (
      // We either found spaces…
      ((tail && tail[1].type === 'whitespace') || // …or it was followed by a line ending, in which case, there has to be
        // non-whitespace after that line ending, because otherwise we’d get an
        // EOF as the content is closed with blank lines.
        markdownLineEnding(code)) &&
        code !== null
        ? ok(code)
        : nok(code)
    )
  }
}

/**
 * @typedef {import('micromark-util-types').Extension} Extension
 * @typedef {import('micromark-util-types').HtmlExtension} HtmlExtension
 * @typedef {import('micromark-extension-gfm-strikethrough').Options} Options
 * @typedef {import('micromark-extension-gfm-footnote').HtmlOptions} HtmlOptions
 */

/**
 * Support GFM or markdown on github.com.
 *
 * @param {Options} [options]
 * @returns {Extension}
 */
function gfm(options) {
  return combineExtensions([
    gfmAutolinkLiteral,
    gfmFootnote(),
    gfmStrikethrough(options),
    gfmTable,
    gfmTaskListItem
  ])
}

/**
 * Count how often a character (or substring) is used in a string.
 *
 * @param {string} value
 *   Value to search in.
 * @param {string} character
 *   Character (or substring) to look for.
 * @return {number}
 *   Number of times `character` occurred in `value`.
 */
function ccount(value, character) {
  const source = String(value);

  if (typeof character !== 'string') {
    throw new TypeError('Expected character')
  }

  let count = 0;
  let index = source.indexOf(character);

  while (index !== -1) {
    count++;
    index = source.indexOf(character, index + character.length);
  }

  return count
}

function escapeStringRegexp(string) {
	if (typeof string !== 'string') {
		throw new TypeError('Expected a string');
	}

	// Escape characters with special meaning either inside or outside character sets.
	// Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
	return string
		.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
		.replace(/-/g, '\\x2d');
}

/**
 * @typedef {import('mdast').Parent} MdastParent
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast').Content} Content
 * @typedef {import('mdast').PhrasingContent} PhrasingContent
 * @typedef {import('mdast').Text} Text
 * @typedef {import('unist-util-visit-parents').Test} Test
 * @typedef {import('unist-util-visit-parents').VisitorResult} VisitorResult
 */

const own$2 = {}.hasOwnProperty;

/**
 * Find patterns in a tree and replace them.
 *
 * The algorithm searches the tree in *preorder* for complete values in `Text`
 * nodes.
 * Partial matches are not supported.
 *
 * @param tree
 *   Tree to change.
 * @param find
 *   Patterns to find.
 * @param replace
 *   Things to replace with (when `find` is `Find`) or configuration.
 * @param options
 *   Configuration (when `find` is not `Find`).
 * @returns
 *   Given, modified, tree.
 */
// To do: next major: remove `find` & `replace` combo, remove schema.
const findAndReplace =
  /**
   * @type {(
   *   (<Tree extends Node>(tree: Tree, find: Find, replace?: Replace | null | undefined, options?: Options | null | undefined) => Tree) &
   *   (<Tree extends Node>(tree: Tree, schema: FindAndReplaceSchema | FindAndReplaceList, options?: Options | null | undefined) => Tree)
   * )}
   **/
  (
    /**
     * @template {Node} Tree
     * @param {Tree} tree
     * @param {Find | FindAndReplaceSchema | FindAndReplaceList} find
     * @param {Replace | Options | null | undefined} [replace]
     * @param {Options | null | undefined} [options]
     * @returns {Tree}
     */
    function (tree, find, replace, options) {
      /** @type {Options | null | undefined} */
      let settings;
      /** @type {FindAndReplaceSchema|FindAndReplaceList} */
      let schema;

      if (typeof find === 'string' || find instanceof RegExp) {
        // @ts-expect-error don’t expect options twice.
        schema = [[find, replace]];
        settings = options;
      } else {
        schema = find;
        // @ts-expect-error don’t expect replace twice.
        settings = replace;
      }

      if (!settings) {
        settings = {};
      }

      const ignored = convert(settings.ignore || []);
      const pairs = toPairs(schema);
      let pairIndex = -1;

      while (++pairIndex < pairs.length) {
        visitParents(tree, 'text', visitor);
      }

      // To do next major: don’t return the given tree.
      return tree

      /** @type {import('unist-util-visit-parents/complex-types.js').BuildVisitor<Root, 'text'>} */
      function visitor(node, parents) {
        let index = -1;
        /** @type {Parent | undefined} */
        let grandparent;

        while (++index < parents.length) {
          const parent = parents[index];

          if (
            ignored(
              parent,
              // @ts-expect-error: TS doesn’t understand but it’s perfect.
              grandparent ? grandparent.children.indexOf(parent) : undefined,
              grandparent
            )
          ) {
            return
          }

          grandparent = parent;
        }

        if (grandparent) {
          return handler(node, parents)
        }
      }

      /**
       * Handle a text node which is not in an ignored parent.
       *
       * @param {Text} node
       *   Text node.
       * @param {Array<Parent>} parents
       *   Parents.
       * @returns {VisitorResult}
       *   Result.
       */
      function handler(node, parents) {
        const parent = parents[parents.length - 1];
        const find = pairs[pairIndex][0];
        const replace = pairs[pairIndex][1];
        let start = 0;
        // @ts-expect-error: TS is wrong, some of these children can be text.
        const index = parent.children.indexOf(node);
        let change = false;
        /** @type {Array<PhrasingContent>} */
        let nodes = [];

        find.lastIndex = 0;

        let match = find.exec(node.value);

        while (match) {
          const position = match.index;
          /** @type {RegExpMatchObject} */
          const matchObject = {
            index: match.index,
            input: match.input,
            // @ts-expect-error: stack is fine.
            stack: [...parents, node]
          };
          let value = replace(...match, matchObject);

          if (typeof value === 'string') {
            value = value.length > 0 ? {type: 'text', value} : undefined;
          }

          // It wasn’t a match after all.
          if (value !== false) {
            if (start !== position) {
              nodes.push({
                type: 'text',
                value: node.value.slice(start, position)
              });
            }

            if (Array.isArray(value)) {
              nodes.push(...value);
            } else if (value) {
              nodes.push(value);
            }

            start = position + match[0].length;
            change = true;
          }

          if (!find.global) {
            break
          }

          match = find.exec(node.value);
        }

        if (change) {
          if (start < node.value.length) {
            nodes.push({type: 'text', value: node.value.slice(start)});
          }

          parent.children.splice(index, 1, ...nodes);
        } else {
          nodes = [node];
        }

        return index + nodes.length
      }
    }
  );

/**
 * Turn a schema into pairs.
 *
 * @param {FindAndReplaceSchema | FindAndReplaceList} schema
 *   Schema.
 * @returns {Pairs}
 *   Clean pairs.
 */
function toPairs(schema) {
  /** @type {Pairs} */
  const result = [];

  if (typeof schema !== 'object') {
    throw new TypeError('Expected array or object as schema')
  }

  if (Array.isArray(schema)) {
    let index = -1;

    while (++index < schema.length) {
      result.push([
        toExpression(schema[index][0]),
        toFunction(schema[index][1])
      ]);
    }
  } else {
    /** @type {string} */
    let key;

    for (key in schema) {
      if (own$2.call(schema, key)) {
        result.push([toExpression(key), toFunction(schema[key])]);
      }
    }
  }

  return result
}

/**
 * Turn a find into an expression.
 *
 * @param {Find} find
 *   Find.
 * @returns {RegExp}
 *   Expression.
 */
function toExpression(find) {
  return typeof find === 'string' ? new RegExp(escapeStringRegexp(find), 'g') : find
}

/**
 * Turn a replace into a function.
 *
 * @param {Replace} replace
 *   Replace.
 * @returns {ReplaceFunction}
 *   Function.
 */
function toFunction(replace) {
  return typeof replace === 'function' ? replace : () => replace
}

/**
 * @typedef {import('mdast').Link} Link
 * @typedef {import('mdast').PhrasingContent} PhrasingContent
 *
 * @typedef {import('mdast-util-from-markdown').CompileContext} CompileContext
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-from-markdown').Handle} FromMarkdownHandle
 * @typedef {import('mdast-util-from-markdown').Transform} FromMarkdownTransform
 *
 * @typedef {import('mdast-util-to-markdown').ConstructName} ConstructName
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownExtension
 *
 * @typedef {import('mdast-util-find-and-replace').ReplaceFunction} ReplaceFunction
 * @typedef {import('mdast-util-find-and-replace').RegExpMatchObject} RegExpMatchObject
 */

/** @type {ConstructName} */
const inConstruct = 'phrasing';
/** @type {Array<ConstructName>} */
const notInConstruct = ['autolink', 'link', 'image', 'label'];

// To do: next major: expose functions instead of extensions.

/**
 * Extension for `mdast-util-from-markdown` to enable GFM autolink literals.
 *
 * @type {FromMarkdownExtension}
 */
const gfmAutolinkLiteralFromMarkdown = {
  transforms: [transformGfmAutolinkLiterals],
  enter: {
    literalAutolink: enterLiteralAutolink,
    literalAutolinkEmail: enterLiteralAutolinkValue,
    literalAutolinkHttp: enterLiteralAutolinkValue,
    literalAutolinkWww: enterLiteralAutolinkValue
  },
  exit: {
    literalAutolink: exitLiteralAutolink,
    literalAutolinkEmail: exitLiteralAutolinkEmail,
    literalAutolinkHttp: exitLiteralAutolinkHttp,
    literalAutolinkWww: exitLiteralAutolinkWww
  }
};

/**
 * Extension for `mdast-util-to-markdown` to enable GFM autolink literals.
 *
 * @type {ToMarkdownExtension}
 */
const gfmAutolinkLiteralToMarkdown = {
  unsafe: [
    {
      character: '@',
      before: '[+\\-.\\w]',
      after: '[\\-.\\w]',
      inConstruct,
      notInConstruct
    },
    {
      character: '.',
      before: '[Ww]',
      after: '[\\-.\\w]',
      inConstruct,
      notInConstruct
    },
    {character: ':', before: '[ps]', after: '\\/', inConstruct, notInConstruct}
  ]
};

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterLiteralAutolink(token) {
  this.enter({type: 'link', title: null, url: '', children: []}, token);
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterLiteralAutolinkValue(token) {
  this.config.enter.autolinkProtocol.call(this, token);
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitLiteralAutolinkHttp(token) {
  this.config.exit.autolinkProtocol.call(this, token);
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitLiteralAutolinkWww(token) {
  this.config.exit.data.call(this, token);
  const node = /** @type {Link} */ (this.stack[this.stack.length - 1]);
  node.url = 'http://' + this.sliceSerialize(token);
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitLiteralAutolinkEmail(token) {
  this.config.exit.autolinkEmail.call(this, token);
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitLiteralAutolink(token) {
  this.exit(token);
}

/** @type {FromMarkdownTransform} */
function transformGfmAutolinkLiterals(tree) {
  findAndReplace(
    tree,
    [
      [/(https?:\/\/|www(?=\.))([-.\w]+)([^ \t\r\n]*)/gi, findUrl],
      [/([-.\w+]+)@([-\w]+(?:\.[-\w]+)+)/g, findEmail]
    ],
    {ignore: ['link', 'linkReference']}
  );
}

/**
 * @type {ReplaceFunction}
 * @param {string} _
 * @param {string} protocol
 * @param {string} domain
 * @param {string} path
 * @param {RegExpMatchObject} match
 * @returns {Link | Array<PhrasingContent> | false}
 */
// eslint-disable-next-line max-params
function findUrl(_, protocol, domain, path, match) {
  let prefix = '';

  // Not an expected previous character.
  if (!previous$1(match)) {
    return false
  }

  // Treat `www` as part of the domain.
  if (/^w/i.test(protocol)) {
    domain = protocol + domain;
    protocol = '';
    prefix = 'http://';
  }

  if (!isCorrectDomain(domain)) {
    return false
  }

  const parts = splitUrl(domain + path);

  if (!parts[0]) return false

  /** @type {Link} */
  const result = {
    type: 'link',
    title: null,
    url: prefix + protocol + parts[0],
    children: [{type: 'text', value: protocol + parts[0]}]
  };

  if (parts[1]) {
    return [result, {type: 'text', value: parts[1]}]
  }

  return result
}

/**
 * @type {ReplaceFunction}
 * @param {string} _
 * @param {string} atext
 * @param {string} label
 * @param {RegExpMatchObject} match
 * @returns {Link | false}
 */
function findEmail(_, atext, label, match) {
  if (
    // Not an expected previous character.
    !previous$1(match, true) ||
    // Label ends in not allowed character.
    /[-\d_]$/.test(label)
  ) {
    return false
  }

  return {
    type: 'link',
    title: null,
    url: 'mailto:' + atext + '@' + label,
    children: [{type: 'text', value: atext + '@' + label}]
  }
}

/**
 * @param {string} domain
 * @returns {boolean}
 */
function isCorrectDomain(domain) {
  const parts = domain.split('.');

  if (
    parts.length < 2 ||
    (parts[parts.length - 1] &&
      (/_/.test(parts[parts.length - 1]) ||
        !/[a-zA-Z\d]/.test(parts[parts.length - 1]))) ||
    (parts[parts.length - 2] &&
      (/_/.test(parts[parts.length - 2]) ||
        !/[a-zA-Z\d]/.test(parts[parts.length - 2])))
  ) {
    return false
  }

  return true
}

/**
 * @param {string} url
 * @returns {[string, string | undefined]}
 */
function splitUrl(url) {
  const trailExec = /[!"&'),.:;<>?\]}]+$/.exec(url);

  if (!trailExec) {
    return [url, undefined]
  }

  url = url.slice(0, trailExec.index);

  let trail = trailExec[0];
  let closingParenIndex = trail.indexOf(')');
  const openingParens = ccount(url, '(');
  let closingParens = ccount(url, ')');

  while (closingParenIndex !== -1 && openingParens > closingParens) {
    url += trail.slice(0, closingParenIndex + 1);
    trail = trail.slice(closingParenIndex + 1);
    closingParenIndex = trail.indexOf(')');
    closingParens++;
  }

  return [url, trail]
}

/**
 * @param {RegExpMatchObject} match
 * @param {boolean | null | undefined} [email=false]
 * @returns {boolean}
 */
function previous$1(match, email) {
  const code = match.input.charCodeAt(match.index - 1);

  return (
    (match.index === 0 ||
      unicodeWhitespace(code) ||
      unicodePunctuation(code)) &&
    (!email || code !== 47)
  )
}

/**
 * @typedef {import('../types.js').AssociationId} AssociationId
 */

/**
 * Get an identifier from an association to match it to others.
 *
 * Associations are nodes that match to something else through an ID:
 * <https://github.com/syntax-tree/mdast#association>.
 *
 * The `label` of an association is the string value: character escapes and
 * references work, and casing is intact.
 * The `identifier` is used to match one association to another:
 * controversially, character escapes and references don’t work in this
 * matching: `&copy;` does not match `©`, and `\+` does not match `+`.
 *
 * But casing is ignored (and whitespace) is trimmed and collapsed: ` A\nb`
 * matches `a b`.
 * So, we do prefer the label when figuring out how we’re going to serialize:
 * it has whitespace, casing, and we can ignore most useless character
 * escapes and all character references.
 *
 * @type {AssociationId}
 */
function association(node) {
  if (node.label || !node.identifier) {
    return node.label || ''
  }

  return decodeString(node.identifier)
}

/**
 * @typedef {import('../types.js').FlowContent} FlowContent
 * @typedef {import('../types.js').Node} Node
 * @typedef {import('../types.js').Parent} Parent
 * @typedef {import('../types.js').State} State
 * @typedef {import('../types.js').TrackFields} TrackFields
 */

/**
 * @param {Parent & {children: Array<FlowContent>}} parent
 *   Parent of flow nodes.
 * @param {State} state
 *   Info passed around about the current state.
 * @param {TrackFields} info
 *   Info on where we are in the document we are generating.
 * @returns {string}
 *   Serialized children, joined by (blank) lines.
 */
function containerFlow(parent, state, info) {
  const indexStack = state.indexStack;
  const children = parent.children || [];
  const tracker = state.createTracker(info);
  /** @type {Array<string>} */
  const results = [];
  let index = -1;

  indexStack.push(-1);

  while (++index < children.length) {
    const child = children[index];

    indexStack[indexStack.length - 1] = index;

    results.push(
      tracker.move(
        state.handle(child, parent, state, {
          before: '\n',
          after: '\n',
          ...tracker.current()
        })
      )
    );

    if (child.type !== 'list') {
      state.bulletLastUsed = undefined;
    }

    if (index < children.length - 1) {
      results.push(
        tracker.move(between(child, children[index + 1], parent, state))
      );
    }
  }

  indexStack.pop();

  return results.join('')
}

/**
 * @param {Node} left
 * @param {Node} right
 * @param {Parent} parent
 * @param {State} state
 * @returns {string}
 */
function between(left, right, parent, state) {
  let index = state.join.length;

  while (index--) {
    const result = state.join[index](left, right, parent, state);

    if (result === true || result === 1) {
      break
    }

    if (typeof result === 'number') {
      return '\n'.repeat(1 + result)
    }

    if (result === false) {
      return '\n\n<!---->\n\n'
    }
  }

  return '\n\n'
}

/**
 * @typedef {import('../types.js').IndentLines} IndentLines
 */

const eol = /\r?\n|\r/g;

/**
 * @type {IndentLines}
 */
function indentLines(value, map) {
  /** @type {Array<string>} */
  const result = [];
  let start = 0;
  let line = 0;
  /** @type {RegExpExecArray | null} */
  let match;

  while ((match = eol.exec(value))) {
    one(value.slice(start, match.index));
    result.push(match[0]);
    start = match.index + match[0].length;
    line++;
  }

  one(value.slice(start));

  return result.join('')

  /**
   * @param {string} value
   */
  function one(value) {
    result.push(map(value, line, !value));
  }
}

/**
 * @typedef {import('../types.js').Unsafe} Unsafe
 */

/**
 * @param {Unsafe} pattern
 * @returns {RegExp}
 */
function patternCompile(pattern) {
  if (!pattern._compiled) {
    const before =
      (pattern.atBreak ? '[\\r\\n][\\t ]*' : '') +
      (pattern.before ? '(?:' + pattern.before + ')' : '');

    pattern._compiled = new RegExp(
      (before ? '(' + before + ')' : '') +
        (/[|\\{}()[\]^$+*?.-]/.test(pattern.character) ? '\\' : '') +
        pattern.character +
        (pattern.after ? '(?:' + pattern.after + ')' : ''),
      'g'
    );
  }

  return pattern._compiled
}

/**
 * @typedef {import('../types.js').Unsafe} Unsafe
 * @typedef {import('../types.js').ConstructName} ConstructName
 */

/**
 * @param {Array<ConstructName>} stack
 * @param {Unsafe} pattern
 * @returns {boolean}
 */
function patternInScope(stack, pattern) {
  return (
    listInScope(stack, pattern.inConstruct, true) &&
    !listInScope(stack, pattern.notInConstruct, false)
  )
}

/**
 * @param {Array<ConstructName>} stack
 * @param {Unsafe['inConstruct']} list
 * @param {boolean} none
 * @returns {boolean}
 */
function listInScope(stack, list, none) {
  if (typeof list === 'string') {
    list = [list];
  }

  if (!list || list.length === 0) {
    return none
  }

  let index = -1;

  while (++index < list.length) {
    if (stack.includes(list[index])) {
      return true
    }
  }

  return false
}

/**
 * @typedef {import('../types.js').State} State
 * @typedef {import('../types.js').SafeConfig} SafeConfig
 */

/**
 * Make a string safe for embedding in markdown constructs.
 *
 * In markdown, almost all punctuation characters can, in certain cases,
 * result in something.
 * Whether they do is highly subjective to where they happen and in what
 * they happen.
 *
 * To solve this, `mdast-util-to-markdown` tracks:
 *
 * * Characters before and after something;
 * * What “constructs” we are in.
 *
 * This information is then used by this function to escape or encode
 * special characters.
 *
 * @param {State} state
 *   Info passed around about the current state.
 * @param {string | null | undefined} input
 *   Raw value to make safe.
 * @param {SafeConfig} config
 *   Configuration.
 * @returns {string}
 *   Serialized markdown safe for embedding.
 */
function safe(state, input, config) {
  const value = (config.before || '') + (input || '') + (config.after || '');
  /** @type {Array<number>} */
  const positions = [];
  /** @type {Array<string>} */
  const result = [];
  /** @type {Record<number, {before: boolean, after: boolean}>} */
  const infos = {};
  let index = -1;

  while (++index < state.unsafe.length) {
    const pattern = state.unsafe[index];

    if (!patternInScope(state.stack, pattern)) {
      continue
    }

    const expression = patternCompile(pattern);
    /** @type {RegExpExecArray | null} */
    let match;

    while ((match = expression.exec(value))) {
      const before = 'before' in pattern || Boolean(pattern.atBreak);
      const after = 'after' in pattern;
      const position = match.index + (before ? match[1].length : 0);

      if (positions.includes(position)) {
        if (infos[position].before && !before) {
          infos[position].before = false;
        }

        if (infos[position].after && !after) {
          infos[position].after = false;
        }
      } else {
        positions.push(position);
        infos[position] = {before, after};
      }
    }
  }

  positions.sort(numerical);

  let start = config.before ? config.before.length : 0;
  const end = value.length - (config.after ? config.after.length : 0);
  index = -1;

  while (++index < positions.length) {
    const position = positions[index];

    // Character before or after matched:
    if (position < start || position >= end) {
      continue
    }

    // If this character is supposed to be escaped because it has a condition on
    // the next character, and the next character is definitly being escaped,
    // then skip this escape.
    if (
      (position + 1 < end &&
        positions[index + 1] === position + 1 &&
        infos[position].after &&
        !infos[position + 1].before &&
        !infos[position + 1].after) ||
      (positions[index - 1] === position - 1 &&
        infos[position].before &&
        !infos[position - 1].before &&
        !infos[position - 1].after)
    ) {
      continue
    }

    if (start !== position) {
      // If we have to use a character reference, an ampersand would be more
      // correct, but as backslashes only care about punctuation, either will
      // do the trick
      result.push(escapeBackslashes(value.slice(start, position), '\\'));
    }

    start = position;

    if (
      /[!-/:-@[-`{-~]/.test(value.charAt(position)) &&
      (!config.encode || !config.encode.includes(value.charAt(position)))
    ) {
      // Character escape.
      result.push('\\');
    } else {
      // Character reference.
      result.push(
        '&#x' + value.charCodeAt(position).toString(16).toUpperCase() + ';'
      );
      start++;
    }
  }

  result.push(escapeBackslashes(value.slice(start, end), config.after));

  return result.join('')
}

/**
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function numerical(a, b) {
  return a - b
}

/**
 * @param {string} value
 * @param {string} after
 * @returns {string}
 */
function escapeBackslashes(value, after) {
  const expression = /\\(?=[!-/:-@[-`{-~])/g;
  /** @type {Array<number>} */
  const positions = [];
  /** @type {Array<string>} */
  const results = [];
  const whole = value + after;
  let index = -1;
  let start = 0;
  /** @type {RegExpExecArray | null} */
  let match;

  while ((match = expression.exec(whole))) {
    positions.push(match.index);
  }

  while (++index < positions.length) {
    if (start !== positions[index]) {
      results.push(value.slice(start, positions[index]));
    }

    results.push('\\');
    start = positions[index];
  }

  results.push(value.slice(start));

  return results.join('')
}

/**
 * @typedef {import('../types.js').CreateTracker} CreateTracker
 * @typedef {import('../types.js').TrackCurrent} TrackCurrent
 * @typedef {import('../types.js').TrackMove} TrackMove
 * @typedef {import('../types.js').TrackShift} TrackShift
 */

/**
 * Track positional info in the output.
 *
 * @type {CreateTracker}
 */
function track(config) {
  // Defaults are used to prevent crashes when older utilities somehow activate
  // this code.
  /* c8 ignore next 5 */
  const options = config || {};
  const now = options.now || {};
  let lineShift = options.lineShift || 0;
  let line = now.line || 1;
  let column = now.column || 1;

  return {move, current, shift}

  /**
   * Get the current tracked info.
   *
   * @type {TrackCurrent}
   */
  function current() {
    return {now: {line, column}, lineShift}
  }

  /**
   * Define an increased line shift (the typical indent for lines).
   *
   * @type {TrackShift}
   */
  function shift(value) {
    lineShift += value;
  }

  /**
   * Move past some generated markdown.
   *
   * @type {TrackMove}
   */
  function move(input) {
    // eslint-disable-next-line unicorn/prefer-default-parameters
    const value = input || '';
    const chunks = value.split(/\r?\n|\r/g);
    const tail = chunks[chunks.length - 1];
    line += chunks.length - 1;
    column =
      chunks.length === 1 ? column + tail.length : 1 + tail.length + lineShift;
    return value
  }
}

/**
 * @typedef {import('mdast').FootnoteReference} FootnoteReference
 * @typedef {import('mdast').FootnoteDefinition} FootnoteDefinition
 * @typedef {import('mdast-util-from-markdown').CompileContext} CompileContext
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-from-markdown').Handle} FromMarkdownHandle
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownExtension
 * @typedef {import('mdast-util-to-markdown').Handle} ToMarkdownHandle
 * @typedef {import('mdast-util-to-markdown').Map} Map
 */

footnoteReference$1.peek = footnoteReferencePeek;

// To do: next major: rename `context` -> `state`, `safeOptions` to `info`, use
// utilities on `state`.

/**
 * Create an extension for `mdast-util-from-markdown` to enable GFM footnotes
 * in markdown.
 *
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown`.
 */
function gfmFootnoteFromMarkdown() {
  return {
    enter: {
      gfmFootnoteDefinition: enterFootnoteDefinition,
      gfmFootnoteDefinitionLabelString: enterFootnoteDefinitionLabelString,
      gfmFootnoteCall: enterFootnoteCall,
      gfmFootnoteCallString: enterFootnoteCallString
    },
    exit: {
      gfmFootnoteDefinition: exitFootnoteDefinition,
      gfmFootnoteDefinitionLabelString: exitFootnoteDefinitionLabelString,
      gfmFootnoteCall: exitFootnoteCall,
      gfmFootnoteCallString: exitFootnoteCallString
    }
  }
}

/**
 * Create an extension for `mdast-util-to-markdown` to enable GFM footnotes
 * in markdown.
 *
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown`.
 */
function gfmFootnoteToMarkdown() {
  return {
    // This is on by default already.
    unsafe: [{character: '[', inConstruct: ['phrasing', 'label', 'reference']}],
    handlers: {footnoteDefinition, footnoteReference: footnoteReference$1}
  }
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterFootnoteDefinition(token) {
  this.enter(
    {type: 'footnoteDefinition', identifier: '', label: '', children: []},
    token
  );
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterFootnoteDefinitionLabelString() {
  this.buffer();
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitFootnoteDefinitionLabelString(token) {
  const label = this.resume();
  const node = /** @type {FootnoteDefinition} */ (
    this.stack[this.stack.length - 1]
  );
  node.label = label;
  node.identifier = normalizeIdentifier(
    this.sliceSerialize(token)
  ).toLowerCase();
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitFootnoteDefinition(token) {
  this.exit(token);
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterFootnoteCall(token) {
  this.enter({type: 'footnoteReference', identifier: '', label: ''}, token);
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterFootnoteCallString() {
  this.buffer();
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitFootnoteCallString(token) {
  const label = this.resume();
  const node = /** @type {FootnoteDefinition} */ (
    this.stack[this.stack.length - 1]
  );
  node.label = label;
  node.identifier = normalizeIdentifier(
    this.sliceSerialize(token)
  ).toLowerCase();
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitFootnoteCall(token) {
  this.exit(token);
}

/**
 * @type {ToMarkdownHandle}
 * @param {FootnoteReference} node
 */
function footnoteReference$1(node, _, context, safeOptions) {
  const tracker = track(safeOptions);
  let value = tracker.move('[^');
  const exit = context.enter('footnoteReference');
  const subexit = context.enter('reference');
  value += tracker.move(
    safe(context, association(node), {
      ...tracker.current(),
      before: value,
      after: ']'
    })
  );
  subexit();
  exit();
  value += tracker.move(']');
  return value
}

/** @type {ToMarkdownHandle} */
function footnoteReferencePeek() {
  return '['
}

/**
 * @type {ToMarkdownHandle}
 * @param {FootnoteDefinition} node
 */
function footnoteDefinition(node, _, context, safeOptions) {
  const tracker = track(safeOptions);
  let value = tracker.move('[^');
  const exit = context.enter('footnoteDefinition');
  const subexit = context.enter('label');
  value += tracker.move(
    safe(context, association(node), {
      ...tracker.current(),
      before: value,
      after: ']'
    })
  );
  subexit();
  value += tracker.move(
    ']:' + (node.children && node.children.length > 0 ? ' ' : '')
  );
  tracker.shift(4);
  value += tracker.move(
    indentLines(containerFlow(node, context, tracker.current()), map)
  );
  exit();

  return value
}

/** @type {Map} */
function map(line, index, blank) {
  if (index === 0) {
    return line
  }

  return (blank ? '' : '    ') + line
}

/**
 * @typedef {import('../types.js').Handle} Handle
 * @typedef {import('../types.js').Info} Info
 * @typedef {import('../types.js').Parent} Parent
 * @typedef {import('../types.js').PhrasingContent} PhrasingContent
 * @typedef {import('../types.js').State} State
 */

/**
 * Serialize the children of a parent that contains phrasing children.
 *
 * These children will be joined flush together.
 *
 * @param {Parent & {children: Array<PhrasingContent>}} parent
 *   Parent of flow nodes.
 * @param {State} state
 *   Info passed around about the current state.
 * @param {Info} info
 *   Info on where we are in the document we are generating.
 * @returns {string}
 *   Serialized children, joined together.
 */
function containerPhrasing(parent, state, info) {
  const indexStack = state.indexStack;
  const children = parent.children || [];
  /** @type {Array<string>} */
  const results = [];
  let index = -1;
  let before = info.before;

  indexStack.push(-1);
  let tracker = state.createTracker(info);

  while (++index < children.length) {
    const child = children[index];
    /** @type {string} */
    let after;

    indexStack[indexStack.length - 1] = index;

    if (index + 1 < children.length) {
      /** @type {Handle} */
      // @ts-expect-error: hush, it’s actually a `zwitch`.
      let handle = state.handle.handlers[children[index + 1].type];
      /** @type {Handle} */
      // @ts-expect-error: hush, it’s actually a `zwitch`.
      if (handle && handle.peek) handle = handle.peek;
      after = handle
        ? handle(children[index + 1], parent, state, {
            before: '',
            after: '',
            ...tracker.current()
          }).charAt(0)
        : '';
    } else {
      after = info.after;
    }

    // In some cases, html (text) can be found in phrasing right after an eol.
    // When we’d serialize that, in most cases that would be seen as html
    // (flow).
    // As we can’t escape or so to prevent it from happening, we take a somewhat
    // reasonable approach: replace that eol with a space.
    // See: <https://github.com/syntax-tree/mdast-util-to-markdown/issues/15>
    if (
      results.length > 0 &&
      (before === '\r' || before === '\n') &&
      child.type === 'html'
    ) {
      results[results.length - 1] = results[results.length - 1].replace(
        /(\r?\n|\r)$/,
        ' '
      );
      before = ' ';

      // To do: does this work to reset tracker?
      tracker = state.createTracker(info);
      tracker.move(results.join(''));
    }

    results.push(
      tracker.move(
        state.handle(child, parent, state, {
          ...tracker.current(),
          before,
          after
        })
      )
    );

    before = results[results.length - 1].slice(-1);
  }

  indexStack.pop();

  return results.join('')
}

/**
 * @typedef {import('mdast').Delete} Delete
 *
 * @typedef {import('mdast-util-from-markdown').CompileContext} CompileContext
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-from-markdown').Handle} FromMarkdownHandle
 *
 * @typedef {import('mdast-util-to-markdown').ConstructName} ConstructName
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownExtension
 * @typedef {import('mdast-util-to-markdown').Handle} ToMarkdownHandle
 */

// To do: next major: expose functions.
// To do: next major: use `state`, state utilities.

/**
 * List of constructs that occur in phrasing (paragraphs, headings), but cannot
 * contain strikethrough.
 * So they sort of cancel each other out.
 * Note: could use a better name.
 *
 * Note: keep in sync with: <https://github.com/syntax-tree/mdast-util-to-markdown/blob/8ce8dbf/lib/unsafe.js#L14>
 *
 * @type {Array<ConstructName>}
 */
const constructsWithoutStrikethrough = [
  'autolink',
  'destinationLiteral',
  'destinationRaw',
  'reference',
  'titleQuote',
  'titleApostrophe'
];

handleDelete.peek = peekDelete;

/**
 * Extension for `mdast-util-from-markdown` to enable GFM strikethrough.
 *
 * @type {FromMarkdownExtension}
 */
const gfmStrikethroughFromMarkdown = {
  canContainEols: ['delete'],
  enter: {strikethrough: enterStrikethrough},
  exit: {strikethrough: exitStrikethrough}
};

/**
 * Extension for `mdast-util-to-markdown` to enable GFM strikethrough.
 *
 * @type {ToMarkdownExtension}
 */
const gfmStrikethroughToMarkdown = {
  unsafe: [
    {
      character: '~',
      inConstruct: 'phrasing',
      notInConstruct: constructsWithoutStrikethrough
    }
  ],
  handlers: {delete: handleDelete}
};

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterStrikethrough(token) {
  this.enter({type: 'delete', children: []}, token);
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitStrikethrough(token) {
  this.exit(token);
}

/**
 * @type {ToMarkdownHandle}
 * @param {Delete} node
 */
function handleDelete(node, _, context, safeOptions) {
  const tracker = track(safeOptions);
  const exit = context.enter('strikethrough');
  let value = tracker.move('~~');
  value += containerPhrasing(node, context, {
    ...tracker.current(),
    before: value,
    after: '~'
  });
  value += tracker.move('~~');
  exit();
  return value
}

/** @type {ToMarkdownHandle} */
function peekDelete() {
  return '~'
}

/**
 * @typedef {import('mdast').InlineCode} InlineCode
 * @typedef {import('../types.js').Parent} Parent
 * @typedef {import('../types.js').State} State
 */

inlineCode$1.peek = inlineCodePeek;

/**
 * @param {InlineCode} node
 * @param {Parent | undefined} _
 * @param {State} state
 * @returns {string}
 */
function inlineCode$1(node, _, state) {
  let value = node.value || '';
  let sequence = '`';
  let index = -1;

  // If there is a single grave accent on its own in the code, use a fence of
  // two.
  // If there are two in a row, use one.
  while (new RegExp('(^|[^`])' + sequence + '([^`]|$)').test(value)) {
    sequence += '`';
  }

  // If this is not just spaces or eols (tabs don’t count), and either the
  // first or last character are a space, eol, or tick, then pad with spaces.
  if (
    /[^ \r\n]/.test(value) &&
    ((/^[ \r\n]/.test(value) && /[ \r\n]$/.test(value)) || /^`|`$/.test(value))
  ) {
    value = ' ' + value + ' ';
  }

  // We have a potential problem: certain characters after eols could result in
  // blocks being seen.
  // For example, if someone injected the string `'\n# b'`, then that would
  // result in an ATX heading.
  // We can’t escape characters in `inlineCode`, but because eols are
  // transformed to spaces when going from markdown to HTML anyway, we can swap
  // them out.
  while (++index < state.unsafe.length) {
    const pattern = state.unsafe[index];
    const expression = patternCompile(pattern);
    /** @type {RegExpExecArray | null} */
    let match;

    // Only look for `atBreak`s.
    // Btw: note that `atBreak` patterns will always start the regex at LF or
    // CR.
    if (!pattern.atBreak) continue

    while ((match = expression.exec(value))) {
      let position = match.index;

      // Support CRLF (patterns only look for one of the characters).
      if (
        value.charCodeAt(position) === 10 /* `\n` */ &&
        value.charCodeAt(position - 1) === 13 /* `\r` */
      ) {
        position--;
      }

      value = value.slice(0, position) + ' ' + value.slice(match.index + 1);
    }
  }

  return sequence + value + sequence
}

/**
 * @returns {string}
 */
function inlineCodePeek() {
  return '`'
}

/**
 * @typedef Options
 *   Configuration (optional).
 * @property {string|null|ReadonlyArray<string|null|undefined>} [align]
 *   One style for all columns, or styles for their respective columns.
 *   Each style is either `'l'` (left), `'r'` (right), or `'c'` (center).
 *   Other values are treated as `''`, which doesn’t place the colon in the
 *   alignment row but does align left.
 *   *Only the lowercased first character is used, so `Right` is fine.*
 * @property {boolean} [padding=true]
 *   Whether to add a space of padding between delimiters and cells.
 *
 *   When `true`, there is padding:
 *
 *   ```markdown
 *   | Alpha | B     |
 *   | ----- | ----- |
 *   | C     | Delta |
 *   ```
 *
 *   When `false`, there is no padding:
 *
 *   ```markdown
 *   |Alpha|B    |
 *   |-----|-----|
 *   |C    |Delta|
 *   ```
 * @property {boolean} [delimiterStart=true]
 *   Whether to begin each row with the delimiter.
 *
 *   > 👉 **Note**: please don’t use this: it could create fragile structures
 *   > that aren’t understandable to some markdown parsers.
 *
 *   When `true`, there are starting delimiters:
 *
 *   ```markdown
 *   | Alpha | B     |
 *   | ----- | ----- |
 *   | C     | Delta |
 *   ```
 *
 *   When `false`, there are no starting delimiters:
 *
 *   ```markdown
 *   Alpha | B     |
 *   ----- | ----- |
 *   C     | Delta |
 *   ```
 * @property {boolean} [delimiterEnd=true]
 *   Whether to end each row with the delimiter.
 *
 *   > 👉 **Note**: please don’t use this: it could create fragile structures
 *   > that aren’t understandable to some markdown parsers.
 *
 *   When `true`, there are ending delimiters:
 *
 *   ```markdown
 *   | Alpha | B     |
 *   | ----- | ----- |
 *   | C     | Delta |
 *   ```
 *
 *   When `false`, there are no ending delimiters:
 *
 *   ```markdown
 *   | Alpha | B
 *   | ----- | -----
 *   | C     | Delta
 *   ```
 * @property {boolean} [alignDelimiters=true]
 *   Whether to align the delimiters.
 *   By default, they are aligned:
 *
 *   ```markdown
 *   | Alpha | B     |
 *   | ----- | ----- |
 *   | C     | Delta |
 *   ```
 *
 *   Pass `false` to make them staggered:
 *
 *   ```markdown
 *   | Alpha | B |
 *   | - | - |
 *   | C | Delta |
 *   ```
 * @property {(value: string) => number} [stringLength]
 *   Function to detect the length of table cell content.
 *   This is used when aligning the delimiters (`|`) between table cells.
 *   Full-width characters and emoji mess up delimiter alignment when viewing
 *   the markdown source.
 *   To fix this, you can pass this function, which receives the cell content
 *   and returns its “visible” size.
 *   Note that what is and isn’t visible depends on where the text is displayed.
 *
 *   Without such a function, the following:
 *
 *   ```js
 *   markdownTable([
 *     ['Alpha', 'Bravo'],
 *     ['中文', 'Charlie'],
 *     ['👩‍❤️‍👩', 'Delta']
 *   ])
 *   ```
 *
 *   Yields:
 *
 *   ```markdown
 *   | Alpha | Bravo |
 *   | - | - |
 *   | 中文 | Charlie |
 *   | 👩‍❤️‍👩 | Delta |
 *   ```
 *
 *   With [`string-width`](https://github.com/sindresorhus/string-width):
 *
 *   ```js
 *   import stringWidth from 'string-width'
 *
 *   markdownTable(
 *     [
 *       ['Alpha', 'Bravo'],
 *       ['中文', 'Charlie'],
 *       ['👩‍❤️‍👩', 'Delta']
 *     ],
 *     {stringLength: stringWidth}
 *   )
 *   ```
 *
 *   Yields:
 *
 *   ```markdown
 *   | Alpha | Bravo   |
 *   | ----- | ------- |
 *   | 中文  | Charlie |
 *   | 👩‍❤️‍👩    | Delta   |
 *   ```
 */

/**
 * @typedef {Options} MarkdownTableOptions
 * @todo
 *   Remove next major.
 */

/**
 * Generate a markdown ([GFM](https://docs.github.com/en/github/writing-on-github/working-with-advanced-formatting/organizing-information-with-tables)) table..
 *
 * @param {ReadonlyArray<ReadonlyArray<string|null|undefined>>} table
 *   Table data (matrix of strings).
 * @param {Options} [options]
 *   Configuration (optional).
 * @returns {string}
 */
function markdownTable(table, options = {}) {
  const align = (options.align || []).concat();
  const stringLength = options.stringLength || defaultStringLength;
  /** @type {Array<number>} Character codes as symbols for alignment per column. */
  const alignments = [];
  /** @type {Array<Array<string>>} Cells per row. */
  const cellMatrix = [];
  /** @type {Array<Array<number>>} Sizes of each cell per row. */
  const sizeMatrix = [];
  /** @type {Array<number>} */
  const longestCellByColumn = [];
  let mostCellsPerRow = 0;
  let rowIndex = -1;

  // This is a superfluous loop if we don’t align delimiters, but otherwise we’d
  // do superfluous work when aligning, so optimize for aligning.
  while (++rowIndex < table.length) {
    /** @type {Array<string>} */
    const row = [];
    /** @type {Array<number>} */
    const sizes = [];
    let columnIndex = -1;

    if (table[rowIndex].length > mostCellsPerRow) {
      mostCellsPerRow = table[rowIndex].length;
    }

    while (++columnIndex < table[rowIndex].length) {
      const cell = serialize(table[rowIndex][columnIndex]);

      if (options.alignDelimiters !== false) {
        const size = stringLength(cell);
        sizes[columnIndex] = size;

        if (
          longestCellByColumn[columnIndex] === undefined ||
          size > longestCellByColumn[columnIndex]
        ) {
          longestCellByColumn[columnIndex] = size;
        }
      }

      row.push(cell);
    }

    cellMatrix[rowIndex] = row;
    sizeMatrix[rowIndex] = sizes;
  }

  // Figure out which alignments to use.
  let columnIndex = -1;

  if (typeof align === 'object' && 'length' in align) {
    while (++columnIndex < mostCellsPerRow) {
      alignments[columnIndex] = toAlignment(align[columnIndex]);
    }
  } else {
    const code = toAlignment(align);

    while (++columnIndex < mostCellsPerRow) {
      alignments[columnIndex] = code;
    }
  }

  // Inject the alignment row.
  columnIndex = -1;
  /** @type {Array<string>} */
  const row = [];
  /** @type {Array<number>} */
  const sizes = [];

  while (++columnIndex < mostCellsPerRow) {
    const code = alignments[columnIndex];
    let before = '';
    let after = '';

    if (code === 99 /* `c` */) {
      before = ':';
      after = ':';
    } else if (code === 108 /* `l` */) {
      before = ':';
    } else if (code === 114 /* `r` */) {
      after = ':';
    }

    // There *must* be at least one hyphen-minus in each alignment cell.
    let size =
      options.alignDelimiters === false
        ? 1
        : Math.max(
            1,
            longestCellByColumn[columnIndex] - before.length - after.length
          );

    const cell = before + '-'.repeat(size) + after;

    if (options.alignDelimiters !== false) {
      size = before.length + size + after.length;

      if (size > longestCellByColumn[columnIndex]) {
        longestCellByColumn[columnIndex] = size;
      }

      sizes[columnIndex] = size;
    }

    row[columnIndex] = cell;
  }

  // Inject the alignment row.
  cellMatrix.splice(1, 0, row);
  sizeMatrix.splice(1, 0, sizes);

  rowIndex = -1;
  /** @type {Array<string>} */
  const lines = [];

  while (++rowIndex < cellMatrix.length) {
    const row = cellMatrix[rowIndex];
    const sizes = sizeMatrix[rowIndex];
    columnIndex = -1;
    /** @type {Array<string>} */
    const line = [];

    while (++columnIndex < mostCellsPerRow) {
      const cell = row[columnIndex] || '';
      let before = '';
      let after = '';

      if (options.alignDelimiters !== false) {
        const size =
          longestCellByColumn[columnIndex] - (sizes[columnIndex] || 0);
        const code = alignments[columnIndex];

        if (code === 114 /* `r` */) {
          before = ' '.repeat(size);
        } else if (code === 99 /* `c` */) {
          if (size % 2) {
            before = ' '.repeat(size / 2 + 0.5);
            after = ' '.repeat(size / 2 - 0.5);
          } else {
            before = ' '.repeat(size / 2);
            after = before;
          }
        } else {
          after = ' '.repeat(size);
        }
      }

      if (options.delimiterStart !== false && !columnIndex) {
        line.push('|');
      }

      if (
        options.padding !== false &&
        // Don’t add the opening space if we’re not aligning and the cell is
        // empty: there will be a closing space.
        !(options.alignDelimiters === false && cell === '') &&
        (options.delimiterStart !== false || columnIndex)
      ) {
        line.push(' ');
      }

      if (options.alignDelimiters !== false) {
        line.push(before);
      }

      line.push(cell);

      if (options.alignDelimiters !== false) {
        line.push(after);
      }

      if (options.padding !== false) {
        line.push(' ');
      }

      if (
        options.delimiterEnd !== false ||
        columnIndex !== mostCellsPerRow - 1
      ) {
        line.push('|');
      }
    }

    lines.push(
      options.delimiterEnd === false
        ? line.join('').replace(/ +$/, '')
        : line.join('')
    );
  }

  return lines.join('\n')
}

/**
 * @param {string|null|undefined} [value]
 * @returns {string}
 */
function serialize(value) {
  return value === null || value === undefined ? '' : String(value)
}

/**
 * @param {string} value
 * @returns {number}
 */
function defaultStringLength(value) {
  return value.length
}

/**
 * @param {string|null|undefined} value
 * @returns {number}
 */
function toAlignment(value) {
  const code = typeof value === 'string' ? value.codePointAt(0) : 0;

  return code === 67 /* `C` */ || code === 99 /* `c` */
    ? 99 /* `c` */
    : code === 76 /* `L` */ || code === 108 /* `l` */
    ? 108 /* `l` */
    : code === 82 /* `R` */ || code === 114 /* `r` */
    ? 114 /* `r` */
    : 0
}

/**
 * @typedef {import('mdast').Table} Table
 * @typedef {import('mdast').TableRow} TableRow
 * @typedef {import('mdast').TableCell} TableCell
 * @typedef {import('mdast').InlineCode} InlineCode
 *
 * @typedef {import('markdown-table').MarkdownTableOptions} MarkdownTableOptions
 *
 * @typedef {import('mdast-util-from-markdown').CompileContext} CompileContext
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-from-markdown').Handle} FromMarkdownHandle
 *
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownExtension
 * @typedef {import('mdast-util-to-markdown').Handle} ToMarkdownHandle
 * @typedef {import('mdast-util-to-markdown').Context} ToMarkdownContext
 * @typedef {import('mdast-util-to-markdown').SafeOptions} SafeOptions
 */

// To do: next major: use `state` and `state` utilities from `mdast-util-to-markdown`.
// To do: next major: use `defaultHandlers.inlineCode`.
// To do: next major: expose functions.

/**
 * Extension for `mdast-util-from-markdown` to enable GFM tables.
 *
 * @type {FromMarkdownExtension}
 */
const gfmTableFromMarkdown = {
  enter: {
    table: enterTable,
    tableData: enterCell,
    tableHeader: enterCell,
    tableRow: enterRow
  },
  exit: {
    codeText: exitCodeText,
    table: exitTable,
    tableData: exit,
    tableHeader: exit,
    tableRow: exit
  }
};

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterTable(token) {
  /** @type {Array<'left' | 'right' | 'center' | 'none'>} */
  // @ts-expect-error: `align` is custom.
  const align = token._align;
  this.enter(
    {
      type: 'table',
      align: align.map((d) => (d === 'none' ? null : d)),
      children: []
    },
    token
  );
  this.setData('inTable', true);
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitTable(token) {
  this.exit(token);
  this.setData('inTable');
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterRow(token) {
  this.enter({type: 'tableRow', children: []}, token);
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exit(token) {
  this.exit(token);
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterCell(token) {
  this.enter({type: 'tableCell', children: []}, token);
}

// Overwrite the default code text data handler to unescape escaped pipes when
// they are in tables.
/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitCodeText(token) {
  let value = this.resume();

  if (this.getData('inTable')) {
    value = value.replace(/\\([\\|])/g, replace);
  }

  const node = /** @type {InlineCode} */ (this.stack[this.stack.length - 1]);
  node.value = value;
  this.exit(token);
}

/**
 * @param {string} $0
 * @param {string} $1
 * @returns {string}
 */
function replace($0, $1) {
  // Pipes work, backslashes don’t (but can’t escape pipes).
  return $1 === '|' ? $1 : $0
}

/**
 * Create an extension for `mdast-util-to-markdown` to enable GFM tables in
 * markdown.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration.
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown` to enable GFM tables.
 */
function gfmTableToMarkdown(options) {
  const settings = options || {};
  const padding = settings.tableCellPadding;
  const alignDelimiters = settings.tablePipeAlign;
  const stringLength = settings.stringLength;
  const around = padding ? ' ' : '|';

  return {
    unsafe: [
      {character: '\r', inConstruct: 'tableCell'},
      {character: '\n', inConstruct: 'tableCell'},
      // A pipe, when followed by a tab or space (padding), or a dash or colon
      // (unpadded delimiter row), could result in a table.
      {atBreak: true, character: '|', after: '[\t :-]'},
      // A pipe in a cell must be encoded.
      {character: '|', inConstruct: 'tableCell'},
      // A colon must be followed by a dash, in which case it could start a
      // delimiter row.
      {atBreak: true, character: ':', after: '-'},
      // A delimiter row can also start with a dash, when followed by more
      // dashes, a colon, or a pipe.
      // This is a stricter version than the built in check for lists, thematic
      // breaks, and setex heading underlines though:
      // <https://github.com/syntax-tree/mdast-util-to-markdown/blob/51a2038/lib/unsafe.js#L57>
      {atBreak: true, character: '-', after: '[:|-]'}
    ],
    handlers: {
      table: handleTable,
      tableRow: handleTableRow,
      tableCell: handleTableCell,
      inlineCode: inlineCodeWithTable
    }
  }

  /**
   * @type {ToMarkdownHandle}
   * @param {Table} node
   */
  function handleTable(node, _, context, safeOptions) {
    return serializeData(
      handleTableAsData(node, context, safeOptions),
      node.align
    )
  }

  /**
   * This function isn’t really used normally, because we handle rows at the
   * table level.
   * But, if someone passes in a table row, this ensures we make somewhat sense.
   *
   * @type {ToMarkdownHandle}
   * @param {TableRow} node
   */
  function handleTableRow(node, _, context, safeOptions) {
    const row = handleTableRowAsData(node, context, safeOptions);
    const value = serializeData([row]);
    // `markdown-table` will always add an align row
    return value.slice(0, value.indexOf('\n'))
  }

  /**
   * @type {ToMarkdownHandle}
   * @param {TableCell} node
   */
  function handleTableCell(node, _, context, safeOptions) {
    const exit = context.enter('tableCell');
    const subexit = context.enter('phrasing');
    const value = containerPhrasing(node, context, {
      ...safeOptions,
      before: around,
      after: around
    });
    subexit();
    exit();
    return value
  }

  /**
   * @param {Array<Array<string>>} matrix
   * @param {Array<string | null | undefined> | null | undefined} [align]
   */
  function serializeData(matrix, align) {
    return markdownTable(matrix, {
      align,
      // @ts-expect-error: `markdown-table` types should support `null`.
      alignDelimiters,
      // @ts-expect-error: `markdown-table` types should support `null`.
      padding,
      // @ts-expect-error: `markdown-table` types should support `null`.
      stringLength
    })
  }

  /**
   * @param {Table} node
   * @param {ToMarkdownContext} context
   * @param {SafeOptions} safeOptions
   */
  function handleTableAsData(node, context, safeOptions) {
    const children = node.children;
    let index = -1;
    /** @type {Array<Array<string>>} */
    const result = [];
    const subexit = context.enter('table');

    while (++index < children.length) {
      result[index] = handleTableRowAsData(
        children[index],
        context,
        safeOptions
      );
    }

    subexit();

    return result
  }

  /**
   * @param {TableRow} node
   * @param {ToMarkdownContext} context
   * @param {SafeOptions} safeOptions
   */
  function handleTableRowAsData(node, context, safeOptions) {
    const children = node.children;
    let index = -1;
    /** @type {Array<string>} */
    const result = [];
    const subexit = context.enter('tableRow');

    while (++index < children.length) {
      // Note: the positional info as used here is incorrect.
      // Making it correct would be impossible due to aligning cells?
      // And it would need copy/pasting `markdown-table` into this project.
      result[index] = handleTableCell(
        children[index],
        node,
        context,
        safeOptions
      );
    }

    subexit();

    return result
  }

  /**
   * @type {ToMarkdownHandle}
   * @param {InlineCode} node
   */
  function inlineCodeWithTable(node, parent, context) {
    let value = inlineCode$1(node, parent, context);

    if (context.stack.includes('tableCell')) {
      value = value.replace(/\|/g, '\\$&');
    }

    return value
  }
}

/**
 * @typedef {import('../types.js').State} State
 * @typedef {import('../types.js').Options} Options
 */

/**
 * @param {State} state
 * @returns {Exclude<Options['bullet'], null | undefined>}
 */
function checkBullet(state) {
  const marker = state.options.bullet || '*';

  if (marker !== '*' && marker !== '+' && marker !== '-') {
    throw new Error(
      'Cannot serialize items with `' +
        marker +
        '` for `options.bullet`, expected `*`, `+`, or `-`'
    )
  }

  return marker
}

/**
 * @typedef {import('../types.js').State} State
 * @typedef {import('../types.js').Options} Options
 */

/**
 * @param {State} state
 * @returns {Exclude<Options['listItemIndent'], null | undefined>}
 */
function checkListItemIndent(state) {
  const style = state.options.listItemIndent || 'tab';

  // To do: remove in a major.
  // @ts-expect-error: deprecated.
  if (style === 1 || style === '1') {
    return 'one'
  }

  if (style !== 'tab' && style !== 'one' && style !== 'mixed') {
    throw new Error(
      'Cannot serialize items with `' +
        style +
        '` for `options.listItemIndent`, expected `tab`, `one`, or `mixed`'
    )
  }

  return style
}

/**
 * @typedef {import('mdast').ListItem} ListItem
 * @typedef {import('../types.js').Map} Map
 * @typedef {import('../types.js').Parent} Parent
 * @typedef {import('../types.js').State} State
 * @typedef {import('../types.js').Info} Info
 */

/**
 * @param {ListItem} node
 * @param {Parent | undefined} parent
 * @param {State} state
 * @param {Info} info
 * @returns {string}
 */
function listItem$1(node, parent, state, info) {
  const listItemIndent = checkListItemIndent(state);
  let bullet = state.bulletCurrent || checkBullet(state);

  // Add the marker value for ordered lists.
  if (parent && parent.type === 'list' && parent.ordered) {
    bullet =
      (typeof parent.start === 'number' && parent.start > -1
        ? parent.start
        : 1) +
      (state.options.incrementListMarker === false
        ? 0
        : parent.children.indexOf(node)) +
      bullet;
  }

  let size = bullet.length + 1;

  if (
    listItemIndent === 'tab' ||
    (listItemIndent === 'mixed' &&
      ((parent && parent.type === 'list' && parent.spread) || node.spread))
  ) {
    size = Math.ceil(size / 4) * 4;
  }

  const tracker = state.createTracker(info);
  tracker.move(bullet + ' '.repeat(size - bullet.length));
  tracker.shift(size);
  const exit = state.enter('listItem');
  const value = state.indentLines(
    state.containerFlow(node, tracker.current()),
    map
  );
  exit();

  return value

  /** @type {Map} */
  function map(line, index, blank) {
    if (index) {
      return (blank ? '' : ' '.repeat(size)) + line
    }

    return (blank ? bullet : bullet + ' '.repeat(size - bullet.length)) + line
  }
}

/**
 * @typedef {import('mdast').Content} Content
 * @typedef {import('mdast').ListItem} ListItem
 * @typedef {import('mdast').Paragraph} Paragraph
 * @typedef {import('mdast').Parent} Parent
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast-util-from-markdown').CompileContext} CompileContext
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-from-markdown').Handle} FromMarkdownHandle
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownExtension
 * @typedef {import('mdast-util-to-markdown').Handle} ToMarkdownHandle
 */

// To do: next major: rename `context` -> `state`, `safeOptions` -> `info`, use
// `track` from `state`.
// To do: next major: replace exports with functions.
// To do: next major: use `defaulthandlers.listItem`.

/**
 * Extension for `mdast-util-from-markdown` to enable GFM task list items.
 *
 * @type {FromMarkdownExtension}
 */
const gfmTaskListItemFromMarkdown = {
  exit: {
    taskListCheckValueChecked: exitCheck,
    taskListCheckValueUnchecked: exitCheck,
    paragraph: exitParagraphWithTaskListItem
  }
};

/**
 * Extension for `mdast-util-to-markdown` to enable GFM task list items.
 *
 * @type {ToMarkdownExtension}
 */
const gfmTaskListItemToMarkdown = {
  unsafe: [{atBreak: true, character: '-', after: '[:|-]'}],
  handlers: {listItem: listItemWithTaskListItem}
};

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitCheck(token) {
  const node = /** @type {ListItem} */ (this.stack[this.stack.length - 2]);
  // We’re always in a paragraph, in a list item.
  node.checked = token.type === 'taskListCheckValueChecked';
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitParagraphWithTaskListItem(token) {
  const parent = /** @type {Parents} */ (this.stack[this.stack.length - 2]);

  if (
    parent &&
    parent.type === 'listItem' &&
    typeof parent.checked === 'boolean'
  ) {
    const node = /** @type {Paragraph} */ (this.stack[this.stack.length - 1]);
    const head = node.children[0];

    if (head && head.type === 'text') {
      const siblings = parent.children;
      let index = -1;
      /** @type {Paragraph | undefined} */
      let firstParaghraph;

      while (++index < siblings.length) {
        const sibling = siblings[index];
        if (sibling.type === 'paragraph') {
          firstParaghraph = sibling;
          break
        }
      }

      if (firstParaghraph === node) {
        // Must start with a space or a tab.
        head.value = head.value.slice(1);

        if (head.value.length === 0) {
          node.children.shift();
        } else if (
          node.position &&
          head.position &&
          typeof head.position.start.offset === 'number'
        ) {
          head.position.start.column++;
          head.position.start.offset++;
          node.position.start = Object.assign({}, head.position.start);
        }
      }
    }
  }

  this.exit(token);
}

/**
 * @type {ToMarkdownHandle}
 * @param {ListItem} node
 */
function listItemWithTaskListItem(node, parent, context, safeOptions) {
  const head = node.children[0];
  const checkable =
    typeof node.checked === 'boolean' && head && head.type === 'paragraph';
  const checkbox = '[' + (node.checked ? 'x' : ' ') + '] ';
  const tracker = track(safeOptions);

  if (checkable) {
    tracker.move(checkbox);
  }

  let value = listItem$1(node, parent, context, {
    ...safeOptions,
    ...tracker.current()
  });

  if (checkable) {
    value = value.replace(/^(?:[*+-]|\d+\.)([\r\n]| {1,3})/, check);
  }

  return value

  /**
   * @param {string} $0
   * @returns {string}
   */
  function check($0) {
    return $0 + checkbox
  }
}

/**
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownExtension
 */

/**
 * Create an extension for `mdast-util-from-markdown` to enable GFM (autolink
 * literals, footnotes, strikethrough, tables, tasklists).
 *
 * @returns {Array<FromMarkdownExtension>}
 *   Extension for `mdast-util-from-markdown` to enable GFM (autolink literals,
 *   footnotes, strikethrough, tables, tasklists).
 */
function gfmFromMarkdown() {
  return [
    gfmAutolinkLiteralFromMarkdown,
    gfmFootnoteFromMarkdown(),
    gfmStrikethroughFromMarkdown,
    gfmTableFromMarkdown,
    gfmTaskListItemFromMarkdown
  ]
}

/**
 * Create an extension for `mdast-util-to-markdown` to enable GFM (autolink
 * literals, footnotes, strikethrough, tables, tasklists).
 *
 * @param {Options | null | undefined} [options]
 *   Configuration.
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown` to enable GFM (autolink literals,
 *   footnotes, strikethrough, tables, tasklists).
 */
function gfmToMarkdown(options) {
  return {
    extensions: [
      gfmAutolinkLiteralToMarkdown,
      gfmFootnoteToMarkdown(),
      gfmStrikethroughToMarkdown,
      gfmTableToMarkdown(options),
      gfmTaskListItemToMarkdown
    ]
  }
}

/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('micromark-extension-gfm').Options & import('mdast-util-gfm').Options} Options
 */

/**
 * Plugin to support GFM (autolink literals, footnotes, strikethrough, tables, tasklists).
 *
 * @type {import('unified').Plugin<[Options?]|void[], Root>}
 */
function remarkGfm(options = {}) {
  const data = this.data();

  add('micromarkExtensions', gfm(options));
  add('fromMarkdownExtensions', gfmFromMarkdown());
  add('toMarkdownExtensions', gfmToMarkdown(options));

  /**
   * @param {string} field
   * @param {unknown} value
   */
  function add(field, value) {
    const list = /** @type {unknown[]} */ (
      // Other extensions
      /* c8 ignore next 2 */
      data[field] ? data[field] : (data[field] = [])
    );

    list.push(value);
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 */

/** @type {Construct} */
const mathFlow = {
  tokenize: tokenizeMathFenced,
  concrete: true
};
/** @type {Construct} */

const nonLazyLine = {
  tokenize: tokenizeNonLazyLine,
  partial: true
};
/** @type {Tokenizer} */

function tokenizeMathFenced(effects, ok, nok) {
  const self = this;
  const tail = self.events[self.events.length - 1];
  const initialSize =
    tail && tail[1].type === 'linePrefix'
      ? tail[2].sliceSerialize(tail[1], true).length
      : 0;
  let sizeOpen = 0;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('mathFlow');
    effects.enter('mathFlowFence');
    effects.enter('mathFlowFenceSequence');
    return sequenceOpen(code)
  }
  /** @type {State} */

  function sequenceOpen(code) {
    if (code === 36) {
      effects.consume(code);
      sizeOpen++;
      return sequenceOpen
    }

    effects.exit('mathFlowFenceSequence');
    return sizeOpen < 2
      ? nok(code)
      : factorySpace(effects, metaOpen, 'whitespace')(code)
  }
  /** @type {State} */

  function metaOpen(code) {
    if (code === null || markdownLineEnding(code)) {
      return openAfter(code)
    }

    effects.enter('mathFlowFenceMeta');
    effects.enter('chunkString', {
      contentType: 'string'
    });
    return meta(code)
  }
  /** @type {State} */

  function meta(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('chunkString');
      effects.exit('mathFlowFenceMeta');
      return openAfter(code)
    }

    if (code === 36) return nok(code)
    effects.consume(code);
    return meta
  }
  /** @type {State} */

  function openAfter(code) {
    effects.exit('mathFlowFence');
    return self.interrupt ? ok(code) : contentStart(code)
  }
  /** @type {State} */

  function contentStart(code) {
    if (code === null) {
      return after(code)
    }

    if (markdownLineEnding(code)) {
      return effects.attempt(
        nonLazyLine,
        effects.attempt(
          {
            tokenize: tokenizeClosingFence,
            partial: true
          },
          after,
          initialSize
            ? factorySpace(effects, contentStart, 'linePrefix', initialSize + 1)
            : contentStart
        ),
        after
      )(code)
    }

    effects.enter('mathFlowValue');
    return contentContinue(code)
  }
  /** @type {State} */

  function contentContinue(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('mathFlowValue');
      return contentStart(code)
    }

    effects.consume(code);
    return contentContinue
  }
  /** @type {State} */

  function after(code) {
    effects.exit('mathFlow');
    return ok(code)
  }
  /** @type {Tokenizer} */

  function tokenizeClosingFence(effects, ok, nok) {
    let size = 0;
    return factorySpace(effects, closingPrefixAfter, 'linePrefix', 4)
    /** @type {State} */

    function closingPrefixAfter(code) {
      effects.enter('mathFlowFence');
      effects.enter('mathFlowFenceSequence');
      return closingSequence(code)
    }
    /** @type {State} */

    function closingSequence(code) {
      if (code === 36) {
        effects.consume(code);
        size++;
        return closingSequence
      }

      if (size < sizeOpen) return nok(code)
      effects.exit('mathFlowFenceSequence');
      return factorySpace(effects, closingSequenceEnd, 'whitespace')(code)
    }
    /** @type {State} */

    function closingSequenceEnd(code) {
      if (code === null || markdownLineEnding(code)) {
        effects.exit('mathFlowFence');
        return ok(code)
      }

      return nok(code)
    }
  }
}
/** @type {Tokenizer} */

function tokenizeNonLazyLine(effects, ok, nok) {
  const self = this;
  return start
  /** @type {State} */

  function start(code) {
    effects.enter('lineEnding');
    effects.consume(code);
    effects.exit('lineEnding');
    return lineStart
  }
  /** @type {State} */

  function lineStart(code) {
    return self.parser.lazy[self.now().line] ? nok(code) : ok(code)
  }
}

/**
 * @typedef {import('micromark-util-types').Construct} Construct
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').Previous} Previous
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Token} Token
 *
 * @typedef Options
 * @property {boolean} [singleDollarTextMath=true]
 *   Whether to support math (text) with a single dollar (`boolean`, default:
 *   `true`).
 *   Single dollars work in Pandoc and many other places, but often interfere
 *   with “normal” dollars in text.
 */

/**
 * @param {Options} [options]
 * @returns {Construct}
 */
function mathText(options = {}) {
  let single = options.singleDollarTextMath;

  if (single === null || single === undefined) {
    single = true;
  }

  return {
    tokenize: tokenizeMathText,
    resolve: resolveMathText,
    previous
  }
  /** @type {Tokenizer} */

  function tokenizeMathText(effects, ok, nok) {
    let sizeOpen = 0;
    /** @type {number} */

    let size;
    /** @type {Token} */

    let token;
    return start
    /** @type {State} */

    function start(code) {
      effects.enter('mathText');
      effects.enter('mathTextSequence');
      return openingSequence(code)
    }
    /** @type {State} */

    function openingSequence(code) {
      if (code === 36) {
        effects.consume(code);
        sizeOpen++;
        return openingSequence
      }

      if (sizeOpen < 2 && !single) return nok(code)
      effects.exit('mathTextSequence');
      return gap(code)
    }
    /** @type {State} */

    function gap(code) {
      if (code === null) {
        return nok(code)
      } // Closing fence?
      // Could also be data.

      if (code === 36) {
        token = effects.enter('mathTextSequence');
        size = 0;
        return closingSequence(code)
      } // Tabs don’t work, and virtual spaces don’t make sense.

      if (code === 32) {
        effects.enter('space');
        effects.consume(code);
        effects.exit('space');
        return gap
      }

      if (markdownLineEnding(code)) {
        effects.enter('lineEnding');
        effects.consume(code);
        effects.exit('lineEnding');
        return gap
      } // Data.

      effects.enter('mathTextData');
      return data(code)
    } // In math.

    /** @type {State} */

    function data(code) {
      if (
        code === null ||
        code === 32 ||
        code === 36 ||
        markdownLineEnding(code)
      ) {
        effects.exit('mathTextData');
        return gap(code)
      }

      effects.consume(code);
      return data
    } // Closing fence.

    /** @type {State} */

    function closingSequence(code) {
      // More.
      if (code === 36) {
        effects.consume(code);
        size++;
        return closingSequence
      } // Done!

      if (size === sizeOpen) {
        effects.exit('mathTextSequence');
        effects.exit('mathText');
        return ok(code)
      } // More or less accents: mark as data.

      token.type = 'mathTextData';
      return data(code)
    }
  }
}
/** @type {Resolver} */

function resolveMathText(events) {
  let tailExitIndex = events.length - 4;
  let headEnterIndex = 3;
  /** @type {number} */

  let index;
  /** @type {number|undefined} */

  let enter; // If we start and end with an EOL or a space.

  if (
    (events[headEnterIndex][1].type === 'lineEnding' ||
      events[headEnterIndex][1].type === 'space') &&
    (events[tailExitIndex][1].type === 'lineEnding' ||
      events[tailExitIndex][1].type === 'space')
  ) {
    index = headEnterIndex; // And we have data.

    while (++index < tailExitIndex) {
      if (events[index][1].type === 'mathTextData') {
        // Then we have padding.
        events[tailExitIndex][1].type = 'mathTextPadding';
        events[headEnterIndex][1].type = 'mathTextPadding';
        headEnterIndex += 2;
        tailExitIndex -= 2;
        break
      }
    }
  } // Merge adjacent spaces and data.

  index = headEnterIndex - 1;
  tailExitIndex++;

  while (++index <= tailExitIndex) {
    if (enter === undefined) {
      if (index !== tailExitIndex && events[index][1].type !== 'lineEnding') {
        enter = index;
      }
    } else if (
      index === tailExitIndex ||
      events[index][1].type === 'lineEnding'
    ) {
      events[enter][1].type = 'mathTextData';

      if (index !== enter + 2) {
        events[enter][1].end = events[index - 1][1].end;
        events.splice(enter + 2, index - enter - 2);
        tailExitIndex -= index - enter - 2;
        index = enter + 2;
      }

      enter = undefined;
    }
  }

  return events
}
/** @type {Previous} */

function previous(code) {
  // If there is a previous code, there will always be a tail.
  return (
    code !== 36 ||
    this.events[this.events.length - 1][1].type === 'characterEscape'
  )
}

/**
 * @typedef {import('micromark-util-types').Extension} Extension
 * @typedef {import('./math-text').Options} Options
 */
/**
 * @param {Options} [options]
 * @returns {Extension}
 */

function math(options) {
  return {
    flow: {
      [36]: mathFlow
    },
    text: {
      [36]: mathText(options)
    }
  }
}

/**
 * Get the count of the longest repeating streak of `substring` in `value`.
 *
 * @param {string} value
 *   Content to search in.
 * @param {string} substring
 *   Substring to look for, typically one character.
 * @returns {number}
 *   Count of most frequent adjacent `substring`s in `value`.
 */
function longestStreak(value, substring) {
  const source = String(value);
  let index = source.indexOf(substring);
  let expected = index;
  let count = 0;
  let max = 0;

  if (typeof substring !== 'string') {
    throw new TypeError('Expected substring')
  }

  while (index !== -1) {
    if (index === expected) {
      if (++count > max) {
        max = count;
      }
    } else {
      count = 1;
    }

    expected = index + substring.length;
    index = source.indexOf(substring, expected);
  }

  return max
}

/**
 * @typedef {import('mdast-util-from-markdown').CompileContext} CompileContext
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-from-markdown').Handle} FromMarkdownHandle
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownExtension
 * @typedef {import('mdast-util-to-markdown').Handle} ToMarkdownHandle
 * @typedef {import('../index.js').Math} Math
 * @typedef {import('../index.js').InlineMath} InlineMath
 *
 * @typedef ToOptions
 *   Configuration.
 * @property {boolean | null | undefined} [singleDollarTextMath=true]
 *   Whether to support math (text) with a single dollar.
 *
 *   Single dollars work in Pandoc and many other places, but often interfere
 *   with “normal” dollars in text.
 *   If you turn this off, you can still use two or more dollars for text math.
 */

/**
 * Create an extension for `mdast-util-from-markdown`.
 *
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown`.
 */
function mathFromMarkdown() {
  return {
    enter: {
      mathFlow: enterMathFlow,
      mathFlowFenceMeta: enterMathFlowMeta,
      mathText: enterMathText
    },
    exit: {
      mathFlow: exitMathFlow,
      mathFlowFence: exitMathFlowFence,
      mathFlowFenceMeta: exitMathFlowMeta,
      mathFlowValue: exitMathData,
      mathText: exitMathText,
      mathTextData: exitMathData
    }
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function enterMathFlow(token) {
    this.enter(
      {
        type: 'math',
        meta: null,
        value: '',
        data: {
          hName: 'div',
          hProperties: {className: ['math', 'math-display']},
          hChildren: [{type: 'text', value: ''}]
        }
      },
      token
    );
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function enterMathFlowMeta() {
    this.buffer();
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMathFlowMeta() {
    const data = this.resume();
    const node = /** @type {Math} */ (this.stack[this.stack.length - 1]);
    node.meta = data;
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMathFlowFence() {
    // Exit if this is the closing fence.
    if (this.getData('mathFlowInside')) return
    this.buffer();
    this.setData('mathFlowInside', true);
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMathFlow(token) {
    const data = this.resume().replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, '');
    const node = /** @type {Math} */ (this.exit(token));
    node.value = data;
    // @ts-expect-error: we defined it.
    node.data.hChildren[0].value = data;
    this.setData('mathFlowInside');
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function enterMathText(token) {
    this.enter(
      {
        type: 'inlineMath',
        value: '',
        data: {
          hName: 'span',
          hProperties: {className: ['math', 'math-inline']},
          hChildren: [{type: 'text', value: ''}]
        }
      },
      token
    );
    this.buffer();
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMathText(token) {
    const data = this.resume();
    const node = /** @type {Math} */ (this.exit(token));
    node.value = data;
    // @ts-expect-error: we defined it.
    node.data.hChildren[0].value = data;
  }

  /**
   * @this {CompileContext}
   * @type {FromMarkdownHandle}
   */
  function exitMathData(token) {
    this.config.enter.data.call(this, token);
    this.config.exit.data.call(this, token);
  }
}

/**
 * Create an extension for `mdast-util-to-markdown`.
 *
 * @param {ToOptions | null | undefined} [options]
 *   Configuration.
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown`.
 */
function mathToMarkdown(options) {
  let single = (options || {}).singleDollarTextMath;

  if (single === null || single === undefined) {
    single = true;
  }

  inlineMath.peek = inlineMathPeek;

  return {
    unsafe: [
      {character: '\r', inConstruct: 'mathFlowMeta'},
      {character: '\n', inConstruct: 'mathFlowMeta'},
      {
        character: '$',
        after: single ? undefined : '\\$',
        inConstruct: 'phrasing'
      },
      {character: '$', inConstruct: 'mathFlowMeta'},
      {atBreak: true, character: '$', after: '\\$'}
    ],
    handlers: {math, inlineMath}
  }

  /**
   * @type {ToMarkdownHandle}
   * @param {Math} node
   */
  // To do: next major: rename `context` to state, `safeOptions` to info.
  // Note: fixing this code? Please also fix the similar code for code:
  // <https://github.com/syntax-tree/mdast-util-to-markdown/blob/main/lib/handle/code.js>
  function math(node, _, context, safeOptions) {
    const raw = node.value || '';
    const tracker = track(safeOptions);
    const sequence = '$'.repeat(Math.max(longestStreak(raw, '$') + 1, 2));
    const exit = context.enter('mathFlow');
    let value = tracker.move(sequence);

    if (node.meta) {
      const subexit = context.enter('mathFlowMeta');
      value += tracker.move(
        safe(context, node.meta, {
          before: value,
          after: '\n',
          encode: ['$'],
          ...tracker.current()
        })
      );
      subexit();
    }

    value += tracker.move('\n');

    if (raw) {
      value += tracker.move(raw + '\n');
    }

    value += tracker.move(sequence);
    exit();
    return value
  }

  /**
   * @type {ToMarkdownHandle}
   * @param {InlineMath} node
   */
  // Note: fixing this code? Please also fix the similar code for inline code:
  // <https://github.com/syntax-tree/mdast-util-to-markdown/blob/main/lib/handle/inline-code.js>
  //
  // To do: next major: rename `context` to state.
  // To do: next major: use `state` (`safe`, `track`, `patternCompile`).
  function inlineMath(node, _, context) {
    let value = node.value || '';
    let size = 1;

    if (!single) size++;

    // If there is a single dollar sign on its own in the math, use a fence of
    // two.
    // If there are two in a row, use one.
    while (
      new RegExp('(^|[^$])' + '\\$'.repeat(size) + '([^$]|$)').test(value)
    ) {
      size++;
    }

    const sequence = '$'.repeat(size);

    // If this is not just spaces or eols (tabs don’t count), and either the
    // first and last character are a space or eol, or the first or last
    // character are dollar signs, then pad with spaces.
    if (
      // Contains non-space.
      /[^ \r\n]/.test(value) &&
      // Starts with space and ends with space.
      ((/^[ \r\n]/.test(value) && /[ \r\n]$/.test(value)) ||
        // Starts or ends with dollar.
        /^\$|\$$/.test(value))
    ) {
      value = ' ' + value + ' ';
    }

    let index = -1;

    // We have a potential problem: certain characters after eols could result in
    // blocks being seen.
    // For example, if someone injected the string `'\n# b'`, then that would
    // result in an ATX heading.
    // We can’t escape characters in `inlineMath`, but because eols are
    // transformed to spaces when going from markdown to HTML anyway, we can swap
    // them out.
    while (++index < context.unsafe.length) {
      const pattern = context.unsafe[index];
      const expression = patternCompile(pattern);
      /** @type {RegExpExecArray | null} */
      let match;

      // Only look for `atBreak`s.
      // Btw: note that `atBreak` patterns will always start the regex at LF or
      // CR.
      if (!pattern.atBreak) continue

      while ((match = expression.exec(value))) {
        let position = match.index;

        // Support CRLF (patterns only look for one of the characters).
        if (
          value.codePointAt(position) === 10 /* `\n` */ &&
          value.codePointAt(position - 1) === 13 /* `\r` */
        ) {
          position--;
        }

        value = value.slice(0, position) + ' ' + value.slice(match.index + 1);
      }
    }

    return sequence + value + sequence
  }

  /**
   * @returns {string}
   */
  function inlineMathPeek() {
    return '$'
  }
}

/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast-util-math').ToOptions} Options
 *
 * @typedef {import('mdast-util-math')} DoNotTouchAsThisImportIncludesMathInTree
 */

/**
 * Plugin to support math.
 *
 * @type {import('unified').Plugin<[Options?] | void[], Root, Root>}
 */
function remarkMath(options = {}) {
  const data = this.data();

  add('micromarkExtensions', math(options));
  add('fromMarkdownExtensions', mathFromMarkdown());
  add('toMarkdownExtensions', mathToMarkdown(options));

  /**
   * @param {string} field
   * @param {unknown} value
   */
  function add(field, value) {
    const list = /** @type {unknown[]} */ (
      // Other extensions
      /* c8 ignore next 2 */
      data[field] ? data[field] : (data[field] = [])
    );

    list.push(value);
  }
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('mdast').Blockquote} Blockquote
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `blockquote` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Blockquote} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function blockquote(state, node) {
  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: 'blockquote',
    properties: {},
    children: state.wrap(state.all(node), true)
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Text} Text
 * @typedef {import('mdast').Break} Break
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `break` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Break} node
 *   mdast node.
 * @returns {Array<Element | Text>}
 *   hast element content.
 */
function hardBreak(state, node) {
  /** @type {Element} */
  const result = {type: 'element', tagName: 'br', properties: {}, children: []};
  state.patch(node, result);
  return [state.applyData(node, result), {type: 'text', value: '\n'}]
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Properties} Properties
 * @typedef {import('mdast').Code} Code
 * @typedef {import('../state.js').State} State

 */

/**
 * Turn an mdast `code` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Code} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function code(state, node) {
  const value = node.value ? node.value + '\n' : '';
  // To do: next major, use `node.lang` w/o regex, the splitting’s been going
  // on for years in remark now.
  const lang = node.lang ? node.lang.match(/^[^ \t]+(?=[ \t]|$)/) : null;
  /** @type {Properties} */
  const properties = {};

  if (lang) {
    properties.className = ['language-' + lang];
  }

  // Create `<code>`.
  /** @type {Element} */
  let result = {
    type: 'element',
    tagName: 'code',
    properties,
    children: [{type: 'text', value}]
  };

  if (node.meta) {
    result.data = {meta: node.meta};
  }

  state.patch(node, result);
  result = state.applyData(node, result);

  // Create `<pre>`.
  result = {type: 'element', tagName: 'pre', properties: {}, children: [result]};
  state.patch(node, result);
  return result
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('mdast').Delete} Delete
 * @typedef {import('../state.js').State} State

 */

/**
 * Turn an mdast `delete` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Delete} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function strikethrough(state, node) {
  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: 'del',
    properties: {},
    children: state.all(node)
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('mdast').Emphasis} Emphasis
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `emphasis` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Emphasis} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function emphasis(state, node) {
  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: 'em',
    properties: {},
    children: state.all(node)
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('mdast').FootnoteReference} FootnoteReference
 * @typedef {import('hast').Element} Element
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `footnoteReference` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {FootnoteReference} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function footnoteReference(state, node) {
  const id = String(node.identifier).toUpperCase();
  const safeId = normalizeUri(id.toLowerCase());
  const index = state.footnoteOrder.indexOf(id);
  /** @type {number} */
  let counter;

  if (index === -1) {
    state.footnoteOrder.push(id);
    state.footnoteCounts[id] = 1;
    counter = state.footnoteOrder.length;
  } else {
    state.footnoteCounts[id]++;
    counter = index + 1;
  }

  const reuseCounter = state.footnoteCounts[id];

  /** @type {Element} */
  const link = {
    type: 'element',
    tagName: 'a',
    properties: {
      href: '#' + state.clobberPrefix + 'fn-' + safeId,
      id:
        state.clobberPrefix +
        'fnref-' +
        safeId +
        (reuseCounter > 1 ? '-' + reuseCounter : ''),
      dataFootnoteRef: true,
      ariaDescribedBy: ['footnote-label']
    },
    children: [{type: 'text', value: String(counter)}]
  };
  state.patch(node, link);

  /** @type {Element} */
  const sup = {
    type: 'element',
    tagName: 'sup',
    properties: {},
    children: [link]
  };
  state.patch(node, sup);
  return state.applyData(node, sup)
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('mdast').Footnote} Footnote
 * @typedef {import('../state.js').State} State
 */

// To do: when both:
// * <https://github.com/micromark/micromark-extension-footnote>
// * <https://github.com/syntax-tree/mdast-util-footnote>
// …are archived, remove this (also from mdast).
// These inline notes are not used in GFM.

/**
 * Turn an mdast `footnote` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Footnote} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function footnote(state, node) {
  const footnoteById = state.footnoteById;
  let no = 1;

  while (no in footnoteById) no++;

  const identifier = String(no);

  footnoteById[identifier] = {
    type: 'footnoteDefinition',
    identifier,
    children: [{type: 'paragraph', children: node.children}],
    position: node.position
  };

  return footnoteReference(state, {
    type: 'footnoteReference',
    identifier,
    position: node.position
  })
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('mdast').Heading} Heading
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `heading` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Heading} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function heading(state, node) {
  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: 'h' + node.depth,
    properties: {},
    children: state.all(node)
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('mdast').HTML} Html
 * @typedef {import('../state.js').State} State
 * @typedef {import('../../index.js').Raw} Raw
 */

/**
 * Turn an mdast `html` node into hast (`raw` node in dangerous mode, otherwise
 * nothing).
 *
 * @param {State} state
 *   Info passed around.
 * @param {Html} node
 *   mdast node.
 * @returns {Raw | Element | null}
 *   hast node.
 */
function html(state, node) {
  if (state.dangerous) {
    /** @type {Raw} */
    const result = {type: 'raw', value: node.value};
    state.patch(node, result);
    return state.applyData(node, result)
  }

  // To do: next major: return `undefined`.
  return null
}

/**
 * @typedef {import('hast').ElementContent} ElementContent
 *
 * @typedef {import('mdast').Content} Content
 * @typedef {import('mdast').Reference} Reference
 * @typedef {import('mdast').Root} Root
 *
 * @typedef {import('./state.js').State} State
 */

/**
 * @typedef {Root | Content} Nodes
 * @typedef {Extract<Nodes, Reference>} References
 */

// To do: next major: always return array.

/**
 * Return the content of a reference without definition as plain text.
 *
 * @param {State} state
 *   Info passed around.
 * @param {References} node
 *   Reference node (image, link).
 * @returns {ElementContent | Array<ElementContent>}
 *   hast content.
 */
function revert(state, node) {
  const subtype = node.referenceType;
  let suffix = ']';

  if (subtype === 'collapsed') {
    suffix += '[]';
  } else if (subtype === 'full') {
    suffix += '[' + (node.label || node.identifier) + ']';
  }

  if (node.type === 'imageReference') {
    return {type: 'text', value: '![' + node.alt + suffix}
  }

  const contents = state.all(node);
  const head = contents[0];

  if (head && head.type === 'text') {
    head.value = '[' + head.value;
  } else {
    contents.unshift({type: 'text', value: '['});
  }

  const tail = contents[contents.length - 1];

  if (tail && tail.type === 'text') {
    tail.value += suffix;
  } else {
    contents.push({type: 'text', value: suffix});
  }

  return contents
}

/**
 * @typedef {import('hast').ElementContent} ElementContent
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Properties} Properties
 * @typedef {import('mdast').ImageReference} ImageReference
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `imageReference` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {ImageReference} node
 *   mdast node.
 * @returns {ElementContent | Array<ElementContent>}
 *   hast node.
 */
function imageReference(state, node) {
  const def = state.definition(node.identifier);

  if (!def) {
    return revert(state, node)
  }

  /** @type {Properties} */
  const properties = {src: normalizeUri(def.url || ''), alt: node.alt};

  if (def.title !== null && def.title !== undefined) {
    properties.title = def.title;
  }

  /** @type {Element} */
  const result = {type: 'element', tagName: 'img', properties, children: []};
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Properties} Properties
 * @typedef {import('mdast').Image} Image
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `image` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Image} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function image(state, node) {
  /** @type {Properties} */
  const properties = {src: normalizeUri(node.url)};

  if (node.alt !== null && node.alt !== undefined) {
    properties.alt = node.alt;
  }

  if (node.title !== null && node.title !== undefined) {
    properties.title = node.title;
  }

  /** @type {Element} */
  const result = {type: 'element', tagName: 'img', properties, children: []};
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Text} Text
 * @typedef {import('mdast').InlineCode} InlineCode
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `inlineCode` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {InlineCode} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function inlineCode(state, node) {
  /** @type {Text} */
  const text = {type: 'text', value: node.value.replace(/\r?\n|\r/g, ' ')};
  state.patch(node, text);

  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: 'code',
    properties: {},
    children: [text]
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').ElementContent} ElementContent
 * @typedef {import('hast').Properties} Properties
 * @typedef {import('mdast').LinkReference} LinkReference
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `linkReference` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {LinkReference} node
 *   mdast node.
 * @returns {ElementContent | Array<ElementContent>}
 *   hast node.
 */
function linkReference(state, node) {
  const def = state.definition(node.identifier);

  if (!def) {
    return revert(state, node)
  }

  /** @type {Properties} */
  const properties = {href: normalizeUri(def.url || '')};

  if (def.title !== null && def.title !== undefined) {
    properties.title = def.title;
  }

  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: 'a',
    properties,
    children: state.all(node)
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Properties} Properties
 * @typedef {import('mdast').Link} Link
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `link` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Link} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function link(state, node) {
  /** @type {Properties} */
  const properties = {href: normalizeUri(node.url)};

  if (node.title !== null && node.title !== undefined) {
    properties.title = node.title;
  }

  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: 'a',
    properties,
    children: state.all(node)
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').ElementContent} ElementContent
 * @typedef {import('hast').Properties} Properties
 * @typedef {import('mdast').Content} Content
 * @typedef {import('mdast').ListItem} ListItem
 * @typedef {import('mdast').Parent} Parent
 * @typedef {import('mdast').Root} Root
 * @typedef {import('../state.js').State} State
 */

/**
 * @typedef {Root | Content} Nodes
 * @typedef {Extract<Nodes, Parent>} Parents
 */

/**
 * Turn an mdast `listItem` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {ListItem} node
 *   mdast node.
 * @param {Parents | null | undefined} parent
 *   Parent of `node`.
 * @returns {Element}
 *   hast node.
 */
function listItem(state, node, parent) {
  const results = state.all(node);
  const loose = parent ? listLoose(parent) : listItemLoose(node);
  /** @type {Properties} */
  const properties = {};
  /** @type {Array<ElementContent>} */
  const children = [];

  if (typeof node.checked === 'boolean') {
    const head = results[0];
    /** @type {Element} */
    let paragraph;

    if (head && head.type === 'element' && head.tagName === 'p') {
      paragraph = head;
    } else {
      paragraph = {type: 'element', tagName: 'p', properties: {}, children: []};
      results.unshift(paragraph);
    }

    if (paragraph.children.length > 0) {
      paragraph.children.unshift({type: 'text', value: ' '});
    }

    paragraph.children.unshift({
      type: 'element',
      tagName: 'input',
      properties: {type: 'checkbox', checked: node.checked, disabled: true},
      children: []
    });

    // According to github-markdown-css, this class hides bullet.
    // See: <https://github.com/sindresorhus/github-markdown-css>.
    properties.className = ['task-list-item'];
  }

  let index = -1;

  while (++index < results.length) {
    const child = results[index];

    // Add eols before nodes, except if this is a loose, first paragraph.
    if (
      loose ||
      index !== 0 ||
      child.type !== 'element' ||
      child.tagName !== 'p'
    ) {
      children.push({type: 'text', value: '\n'});
    }

    if (child.type === 'element' && child.tagName === 'p' && !loose) {
      children.push(...child.children);
    } else {
      children.push(child);
    }
  }

  const tail = results[results.length - 1];

  // Add a final eol.
  if (tail && (loose || tail.type !== 'element' || tail.tagName !== 'p')) {
    children.push({type: 'text', value: '\n'});
  }

  /** @type {Element} */
  const result = {type: 'element', tagName: 'li', properties, children};
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @param {Parents} node
 * @return {Boolean}
 */
function listLoose(node) {
  let loose = false;
  if (node.type === 'list') {
    loose = node.spread || false;
    const children = node.children;
    let index = -1;

    while (!loose && ++index < children.length) {
      loose = listItemLoose(children[index]);
    }
  }

  return loose
}

/**
 * @param {ListItem} node
 * @return {Boolean}
 */
function listItemLoose(node) {
  const spread = node.spread;

  return spread === undefined || spread === null
    ? node.children.length > 1
    : spread
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Properties} Properties
 * @typedef {import('mdast').List} List
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `list` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {List} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function list(state, node) {
  /** @type {Properties} */
  const properties = {};
  const results = state.all(node);
  let index = -1;

  if (typeof node.start === 'number' && node.start !== 1) {
    properties.start = node.start;
  }

  // Like GitHub, add a class for custom styling.
  while (++index < results.length) {
    const child = results[index];

    if (
      child.type === 'element' &&
      child.tagName === 'li' &&
      child.properties &&
      Array.isArray(child.properties.className) &&
      child.properties.className.includes('task-list-item')
    ) {
      properties.className = ['contains-task-list'];
      break
    }
  }

  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: node.ordered ? 'ol' : 'ul',
    properties,
    children: state.wrap(results, true)
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('mdast').Paragraph} Paragraph
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `paragraph` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Paragraph} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function paragraph(state, node) {
  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: 'p',
    properties: {},
    children: state.all(node)
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('hast').Element} HastElement
 * @typedef {import('mdast').Root} MdastRoot
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `root` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {MdastRoot} node
 *   mdast node.
 * @returns {HastRoot | HastElement}
 *   hast node.
 */
function root(state, node) {
  /** @type {HastRoot} */
  const result = {type: 'root', children: state.wrap(state.all(node))};
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('mdast').Strong} Strong
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `strong` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Strong} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function strong(state, node) {
  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: 'strong',
    properties: {},
    children: state.all(node)
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('unist').Position} Position
 * @typedef {import('unist').Node} Node
 * @typedef {import('unist').Point} Point
 */

/**
 * @typedef NodeLike
 * @property {string} type
 * @property {PositionLike | null | undefined} [position]
 *
 * @typedef PositionLike
 * @property {PointLike | null | undefined} [start]
 * @property {PointLike | null | undefined} [end]
 *
 * @typedef PointLike
 * @property {number | null | undefined} [line]
 * @property {number | null | undefined} [column]
 * @property {number | null | undefined} [offset]
 */

/**
 * Get the starting point of `node`.
 *
 * @param node
 *   Node.
 * @returns
 *   Point.
 */
const pointStart = point('start');

/**
 * Get the ending point of `node`.
 *
 * @param node
 *   Node.
 * @returns
 *   Point.
 */
const pointEnd = point('end');

/**
 * Get the positional info of `node`.
 *
 * @param {NodeLike | Node | null | undefined} [node]
 *   Node.
 * @returns {Position}
 *   Position.
 */
function position(node) {
  return {start: pointStart(node), end: pointEnd(node)}
}

/**
 * Get the positional info of `node`.
 *
 * @param {'start' | 'end'} type
 *   Side.
 * @returns
 *   Getter.
 */
function point(type) {
  return point

  /**
   * Get the point info of `node` at a bound side.
   *
   * @param {NodeLike | Node | null | undefined} [node]
   * @returns {Point}
   */
  function point(node) {
    const point = (node && node.position && node.position[type]) || {};

    // To do: next major: don’t return points when invalid.
    return {
      // @ts-expect-error: in practice, null is allowed.
      line: point.line || null,
      // @ts-expect-error: in practice, null is allowed.
      column: point.column || null,
      // @ts-expect-error: in practice, null is allowed.
      offset: point.offset > -1 ? point.offset : null
    }
  }
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('mdast').Table} Table
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `table` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Table} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function table(state, node) {
  const rows = state.all(node);
  const firstRow = rows.shift();
  /** @type {Array<Element>} */
  const tableContent = [];

  if (firstRow) {
    /** @type {Element} */
    const head = {
      type: 'element',
      tagName: 'thead',
      properties: {},
      children: state.wrap([firstRow], true)
    };
    state.patch(node.children[0], head);
    tableContent.push(head);
  }

  if (rows.length > 0) {
    /** @type {Element} */
    const body = {
      type: 'element',
      tagName: 'tbody',
      properties: {},
      children: state.wrap(rows, true)
    };

    const start = pointStart(node.children[1]);
    const end = pointEnd(node.children[node.children.length - 1]);
    if (start.line && end.line) body.position = {start, end};
    tableContent.push(body);
  }

  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: 'table',
    properties: {},
    children: state.wrap(tableContent, true)
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Properties} Properties
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').ElementContent} ElementContent
 * @typedef {import('mdast').Content} Content
 * @typedef {import('mdast').Parent} Parent
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast').TableRow} TableRow
 * @typedef {import('../state.js').State} State
 */

/**
 * @typedef {Root | Content} Nodes
 * @typedef {Extract<Nodes, Parent>} Parents
 */

/**
 * Turn an mdast `tableRow` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {TableRow} node
 *   mdast node.
 * @param {Parents | null | undefined} parent
 *   Parent of `node`.
 * @returns {Element}
 *   hast node.
 */
function tableRow(state, node, parent) {
  const siblings = parent ? parent.children : undefined;
  // Generate a body row when without parent.
  const rowIndex = siblings ? siblings.indexOf(node) : 1;
  const tagName = rowIndex === 0 ? 'th' : 'td';
  const align = parent && parent.type === 'table' ? parent.align : undefined;
  const length = align ? align.length : node.children.length;
  let cellIndex = -1;
  /** @type {Array<ElementContent>} */
  const cells = [];

  while (++cellIndex < length) {
    // Note: can also be undefined.
    const cell = node.children[cellIndex];
    /** @type {Properties} */
    const properties = {};
    const alignValue = align ? align[cellIndex] : undefined;

    if (alignValue) {
      properties.align = alignValue;
    }

    /** @type {Element} */
    let result = {type: 'element', tagName, properties, children: []};

    if (cell) {
      result.children = state.all(cell);
      state.patch(cell, result);
      result = state.applyData(node, result);
    }

    cells.push(result);
  }

  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: 'tr',
    properties: {},
    children: state.wrap(cells, true)
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('mdast').TableCell} TableCell
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `tableCell` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {TableCell} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function tableCell(state, node) {
  // Note: this function is normally not called: see `table-row` for how rows
  // and their cells are compiled.
  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: 'td', // Assume body cell.
    properties: {},
    children: state.all(node)
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

const tab = 9; /* `\t` */
const space = 32; /* ` ` */

/**
 * Remove initial and final spaces and tabs at the line breaks in `value`.
 * Does not trim initial and final spaces and tabs of the value itself.
 *
 * @param {string} value
 *   Value to trim.
 * @returns {string}
 *   Trimmed value.
 */
function trimLines(value) {
  const source = String(value);
  const search = /\r?\n|\r/g;
  let match = search.exec(source);
  let last = 0;
  /** @type {Array<string>} */
  const lines = [];

  while (match) {
    lines.push(
      trimLine(source.slice(last, match.index), last > 0, true),
      match[0]
    );

    last = match.index + match[0].length;
    match = search.exec(source);
  }

  lines.push(trimLine(source.slice(last), last > 0, false));

  return lines.join('')
}

/**
 * @param {string} value
 *   Line to trim.
 * @param {boolean} start
 *   Whether to trim the start of the line.
 * @param {boolean} end
 *   Whether to trim the end of the line.
 * @returns {string}
 *   Trimmed line.
 */
function trimLine(value, start, end) {
  let startIndex = 0;
  let endIndex = value.length;

  if (start) {
    let code = value.codePointAt(startIndex);

    while (code === tab || code === space) {
      startIndex++;
      code = value.codePointAt(startIndex);
    }
  }

  if (end) {
    let code = value.codePointAt(endIndex - 1);

    while (code === tab || code === space) {
      endIndex--;
      code = value.codePointAt(endIndex - 1);
    }
  }

  return endIndex > startIndex ? value.slice(startIndex, endIndex) : ''
}

/**
 * @typedef {import('hast').Element} HastElement
 * @typedef {import('hast').Text} HastText
 * @typedef {import('mdast').Text} MdastText
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `text` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {MdastText} node
 *   mdast node.
 * @returns {HastText | HastElement}
 *   hast node.
 */
function text(state, node) {
  /** @type {HastText} */
  const result = {type: 'text', value: trimLines(String(node.value))};
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('mdast').ThematicBreak} ThematicBreak
 * @typedef {import('../state.js').State} State
 */

/**
 * Turn an mdast `thematicBreak` node into hast.
 *
 * @param {State} state
 *   Info passed around.
 * @param {ThematicBreak} node
 *   mdast node.
 * @returns {Element}
 *   hast node.
 */
function thematicBreak(state, node) {
  /** @type {Element} */
  const result = {
    type: 'element',
    tagName: 'hr',
    properties: {},
    children: []
  };
  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * Default handlers for nodes.
 */
const handlers = {
  blockquote,
  break: hardBreak,
  code,
  delete: strikethrough,
  emphasis,
  footnoteReference,
  footnote,
  heading,
  html,
  imageReference,
  image,
  inlineCode,
  linkReference,
  link,
  listItem,
  list,
  paragraph,
  root,
  strong,
  table,
  tableCell,
  tableRow,
  text,
  thematicBreak,
  toml: ignore,
  yaml: ignore,
  definition: ignore,
  footnoteDefinition: ignore
};

// Return nothing for nodes that are ignored.
function ignore() {
  // To do: next major: return `undefined`.
  return null
}

/**
 * @typedef PointLike
 * @property {number | null | undefined} [line]
 * @property {number | null | undefined} [column]
 * @property {number | null | undefined} [offset]
 *
 * @typedef PositionLike
 * @property {PointLike | null | undefined} [start]
 * @property {PointLike | null | undefined} [end]
 *
 * @typedef NodeLike
 * @property {PositionLike | null | undefined} [position]
 */

/**
 * Check if `node` is generated.
 *
 * @param {NodeLike | null | undefined} [node]
 *   Node to check.
 * @returns {boolean}
 *   Whether `node` is generated (does not have positional info).
 */
function generated(node) {
  return (
    !node ||
    !node.position ||
    !node.position.start ||
    !node.position.start.line ||
    !node.position.start.column ||
    !node.position.end ||
    !node.position.end.line ||
    !node.position.end.column
  )
}

/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast').Content} Content
 * @typedef {import('mdast').Definition} Definition
 */

const own$1 = {}.hasOwnProperty;

/**
 * Find definitions in `tree`.
 *
 * Uses CommonMark precedence, which means that earlier definitions are
 * preferred over duplicate later definitions.
 *
 * @param {Node} tree
 *   Tree to check.
 * @returns {GetDefinition}
 *   Getter.
 */
function definitions(tree) {
  /** @type {Record<string, Definition>} */
  const cache = Object.create(null);

  if (!tree || !tree.type) {
    throw new Error('mdast-util-definitions expected node')
  }

  visit(tree, 'definition', (definition) => {
    const id = clean(definition.identifier);
    if (id && !own$1.call(cache, id)) {
      cache[id] = definition;
    }
  });

  return definition

  /** @type {GetDefinition} */
  function definition(identifier) {
    const id = clean(identifier);
    // To do: next major: return `undefined` when not found.
    return id && own$1.call(cache, id) ? cache[id] : null
  }
}

/**
 * @param {string | null | undefined} [value]
 * @returns {string}
 */
function clean(value) {
  return String(value || '').toUpperCase()
}

/**
 * @typedef {import('hast').Content} HastContent
 * @typedef {import('hast').Element} HastElement
 * @typedef {import('hast').ElementContent} HastElementContent
 * @typedef {import('hast').Properties} HastProperties
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('hast').Text} HastText
 *
 * @typedef {import('mdast').Content} MdastContent
 * @typedef {import('mdast').Definition} MdastDefinition
 * @typedef {import('mdast').FootnoteDefinition} MdastFootnoteDefinition
 * @typedef {import('mdast').Parent} MdastParent
 * @typedef {import('mdast').Root} MdastRoot
 */

const own = {}.hasOwnProperty;

/**
 * Create `state` from an mdast tree.
 *
 * @param {MdastNodes} tree
 *   mdast node to transform.
 * @param {Options | null | undefined} [options]
 *   Configuration.
 * @returns {State}
 *   `state` function.
 */
function createState(tree, options) {
  const settings = options || {};
  const dangerous = settings.allowDangerousHtml || false;
  /** @type {Record<string, MdastFootnoteDefinition>} */
  const footnoteById = {};

  // To do: next major: add `options` to state, remove:
  // `dangerous`, `clobberPrefix`, `footnoteLabel`, `footnoteLabelTagName`,
  // `footnoteLabelProperties`, `footnoteBackLabel`, `passThrough`,
  // `unknownHandler`.

  // To do: next major: move to `state.options.allowDangerousHtml`.
  state.dangerous = dangerous;
  // To do: next major: move to `state.options`.
  state.clobberPrefix =
    settings.clobberPrefix === undefined || settings.clobberPrefix === null
      ? 'user-content-'
      : settings.clobberPrefix;
  // To do: next major: move to `state.options`.
  state.footnoteLabel = settings.footnoteLabel || 'Footnotes';
  // To do: next major: move to `state.options`.
  state.footnoteLabelTagName = settings.footnoteLabelTagName || 'h2';
  // To do: next major: move to `state.options`.
  state.footnoteLabelProperties = settings.footnoteLabelProperties || {
    className: ['sr-only']
  };
  // To do: next major: move to `state.options`.
  state.footnoteBackLabel = settings.footnoteBackLabel || 'Back to content';
  // To do: next major: move to `state.options`.
  state.unknownHandler = settings.unknownHandler;
  // To do: next major: move to `state.options`.
  state.passThrough = settings.passThrough;

  state.handlers = {...handlers, ...settings.handlers};

  // To do: next major: replace utility with `definitionById` object, so we
  // only walk once (as we need footnotes too).
  state.definition = definitions(tree);
  state.footnoteById = footnoteById;
  /** @type {Array<string>} */
  state.footnoteOrder = [];
  /** @type {Record<string, number>} */
  state.footnoteCounts = {};

  state.patch = patch;
  state.applyData = applyData;
  state.one = oneBound;
  state.all = allBound;
  state.wrap = wrap;
  // To do: next major: remove `augment`.
  state.augment = augment;

  visit(tree, 'footnoteDefinition', (definition) => {
    const id = String(definition.identifier).toUpperCase();

    // Mimick CM behavior of link definitions.
    // See: <https://github.com/syntax-tree/mdast-util-definitions/blob/8290999/index.js#L26>.
    if (!own.call(footnoteById, id)) {
      footnoteById[id] = definition;
    }
  });

  // @ts-expect-error Hush, it’s fine!
  return state

  /**
   * Finalise the created `right`, a hast node, from `left`, an mdast node.
   *
   * @param {MdastNodeWithData | PositionLike | null | undefined} left
   * @param {HastElementContent} right
   * @returns {HastElementContent}
   */
  /* c8 ignore start */
  // To do: next major: remove.
  function augment(left, right) {
    // Handle `data.hName`, `data.hProperties, `data.hChildren`.
    if (left && 'data' in left && left.data) {
      /** @type {MdastData} */
      const data = left.data;

      if (data.hName) {
        if (right.type !== 'element') {
          right = {
            type: 'element',
            tagName: '',
            properties: {},
            children: []
          };
        }

        right.tagName = data.hName;
      }

      if (right.type === 'element' && data.hProperties) {
        right.properties = {...right.properties, ...data.hProperties};
      }

      if ('children' in right && right.children && data.hChildren) {
        right.children = data.hChildren;
      }
    }

    if (left) {
      const ctx = 'type' in left ? left : {position: left};

      if (!generated(ctx)) {
        // @ts-expect-error: fine.
        right.position = {start: pointStart(ctx), end: pointEnd(ctx)};
      }
    }

    return right
  }
  /* c8 ignore stop */

  /**
   * Create an element for `node`.
   *
   * @type {HFunctionProps}
   */
  /* c8 ignore start */
  // To do: next major: remove.
  function state(node, tagName, props, children) {
    if (Array.isArray(props)) {
      children = props;
      props = {};
    }

    // @ts-expect-error augmenting an element yields an element.
    return augment(node, {
      type: 'element',
      tagName,
      properties: props || {},
      children: children || []
    })
  }
  /* c8 ignore stop */

  /**
   * Transform an mdast node into a hast node.
   *
   * @param {MdastNodes} node
   *   mdast node.
   * @param {MdastParents | null | undefined} [parent]
   *   Parent of `node`.
   * @returns {HastElementContent | Array<HastElementContent> | null | undefined}
   *   Resulting hast node.
   */
  function oneBound(node, parent) {
    // @ts-expect-error: that’s a state :)
    return one(state, node, parent)
  }

  /**
   * Transform the children of an mdast node into hast nodes.
   *
   * @param {MdastNodes} parent
   *   mdast node to compile
   * @returns {Array<HastElementContent>}
   *   Resulting hast nodes.
   */
  function allBound(parent) {
    // @ts-expect-error: that’s a state :)
    return all(state, parent)
  }
}

/**
 * Copy a node’s positional info.
 *
 * @param {MdastNodes} from
 *   mdast node to copy from.
 * @param {HastNodes} to
 *   hast node to copy into.
 * @returns {void}
 *   Nothing.
 */
function patch(from, to) {
  if (from.position) to.position = position(from);
}

/**
 * Honor the `data` of `from` and maybe generate an element instead of `to`.
 *
 * @template {HastNodes} Type
 *   Node type.
 * @param {MdastNodes} from
 *   mdast node to use data from.
 * @param {Type} to
 *   hast node to change.
 * @returns {Type | HastElement}
 *   Nothing.
 */
function applyData(from, to) {
  /** @type {Type | HastElement} */
  let result = to;

  // Handle `data.hName`, `data.hProperties, `data.hChildren`.
  if (from && from.data) {
    const hName = from.data.hName;
    const hChildren = from.data.hChildren;
    const hProperties = from.data.hProperties;

    if (typeof hName === 'string') {
      // Transforming the node resulted in an element with a different name
      // than wanted:
      if (result.type === 'element') {
        result.tagName = hName;
      }
      // Transforming the node resulted in a non-element, which happens for
      // raw, text, and root nodes (unless custom handlers are passed).
      // The intent is likely to keep the content around (otherwise: pass
      // `hChildren`).
      else {
        result = {
          type: 'element',
          tagName: hName,
          properties: {},
          children: []
        };

        // To do: next major: take the children from the `root`, or inject the
        // raw/text/comment or so into the element?
        // if ('children' in node) {
        //   // @ts-expect-error: assume `children` are allowed in elements.
        //   result.children = node.children
        // } else {
        //   // @ts-expect-error: assume `node` is allowed in elements.
        //   result.children.push(node)
        // }
      }
    }

    if (result.type === 'element' && hProperties) {
      result.properties = {...result.properties, ...hProperties};
    }

    if (
      'children' in result &&
      result.children &&
      hChildren !== null &&
      hChildren !== undefined
    ) {
      // @ts-expect-error: assume valid children are defined.
      result.children = hChildren;
    }
  }

  return result
}

/**
 * Transform an mdast node into a hast node.
 *
 * @param {State} state
 *   Info passed around.
 * @param {MdastNodes} node
 *   mdast node.
 * @param {MdastParents | null | undefined} [parent]
 *   Parent of `node`.
 * @returns {HastElementContent | Array<HastElementContent> | null | undefined}
 *   Resulting hast node.
 */
// To do: next major: do not expose, keep bound.
function one(state, node, parent) {
  const type = node && node.type;

  // Fail on non-nodes.
  if (!type) {
    throw new Error('Expected node, got `' + node + '`')
  }

  if (own.call(state.handlers, type)) {
    return state.handlers[type](state, node, parent)
  }

  if (state.passThrough && state.passThrough.includes(type)) {
    // To do: next major: deep clone.
    // @ts-expect-error: types of passed through nodes are expected to be added manually.
    return 'children' in node ? {...node, children: all(state, node)} : node
  }

  if (state.unknownHandler) {
    return state.unknownHandler(state, node, parent)
  }

  return defaultUnknownHandler(state, node)
}

/**
 * Transform the children of an mdast node into hast nodes.
 *
 * @param {State} state
 *   Info passed around.
 * @param {MdastNodes} parent
 *   mdast node to compile
 * @returns {Array<HastElementContent>}
 *   Resulting hast nodes.
 */
// To do: next major: do not expose, keep bound.
function all(state, parent) {
  /** @type {Array<HastElementContent>} */
  const values = [];

  if ('children' in parent) {
    const nodes = parent.children;
    let index = -1;
    while (++index < nodes.length) {
      const result = one(state, nodes[index], parent);

      // To do: see if we van clean this? Can we merge texts?
      if (result) {
        if (index && nodes[index - 1].type === 'break') {
          if (!Array.isArray(result) && result.type === 'text') {
            result.value = result.value.replace(/^\s+/, '');
          }

          if (!Array.isArray(result) && result.type === 'element') {
            const head = result.children[0];

            if (head && head.type === 'text') {
              head.value = head.value.replace(/^\s+/, '');
            }
          }
        }

        if (Array.isArray(result)) {
          values.push(...result);
        } else {
          values.push(result);
        }
      }
    }
  }

  return values
}

/**
 * Transform an unknown node.
 *
 * @param {State} state
 *   Info passed around.
 * @param {MdastNodes} node
 *   Unknown mdast node.
 * @returns {HastText | HastElement}
 *   Resulting hast node.
 */
function defaultUnknownHandler(state, node) {
  const data = node.data || {};
  /** @type {HastText | HastElement} */
  const result =
    'value' in node &&
    !(own.call(data, 'hProperties') || own.call(data, 'hChildren'))
      ? {type: 'text', value: node.value}
      : {
          type: 'element',
          tagName: 'div',
          properties: {},
          children: all(state, node)
        };

  state.patch(node, result);
  return state.applyData(node, result)
}

/**
 * Wrap `nodes` with line endings between each node.
 *
 * @template {HastContent} Type
 *   Node type.
 * @param {Array<Type>} nodes
 *   List of nodes to wrap.
 * @param {boolean | null | undefined} [loose=false]
 *   Whether to add line endings at start and end.
 * @returns {Array<Type | HastText>}
 *   Wrapped nodes.
 */
function wrap(nodes, loose) {
  /** @type {Array<Type | HastText>} */
  const result = [];
  let index = -1;

  if (loose) {
    result.push({type: 'text', value: '\n'});
  }

  while (++index < nodes.length) {
    if (index) result.push({type: 'text', value: '\n'});
    result.push(nodes[index]);
  }

  if (loose && nodes.length > 0) {
    result.push({type: 'text', value: '\n'});
  }

  return result
}

/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').ElementContent} ElementContent
 *
 * @typedef {import('./state.js').State} State
 */

/**
 * Generate a hast footer for called footnote definitions.
 *
 * @param {State} state
 *   Info passed around.
 * @returns {Element | undefined}
 *   `section` element or `undefined`.
 */
function footer(state) {
  /** @type {Array<ElementContent>} */
  const listItems = [];
  let index = -1;

  while (++index < state.footnoteOrder.length) {
    const def = state.footnoteById[state.footnoteOrder[index]];

    if (!def) {
      continue
    }

    const content = state.all(def);
    const id = String(def.identifier).toUpperCase();
    const safeId = normalizeUri(id.toLowerCase());
    let referenceIndex = 0;
    /** @type {Array<ElementContent>} */
    const backReferences = [];

    while (++referenceIndex <= state.footnoteCounts[id]) {
      /** @type {Element} */
      const backReference = {
        type: 'element',
        tagName: 'a',
        properties: {
          href:
            '#' +
            state.clobberPrefix +
            'fnref-' +
            safeId +
            (referenceIndex > 1 ? '-' + referenceIndex : ''),
          dataFootnoteBackref: true,
          className: ['data-footnote-backref'],
          ariaLabel: state.footnoteBackLabel
        },
        children: [{type: 'text', value: '↩'}]
      };

      if (referenceIndex > 1) {
        backReference.children.push({
          type: 'element',
          tagName: 'sup',
          children: [{type: 'text', value: String(referenceIndex)}]
        });
      }

      if (backReferences.length > 0) {
        backReferences.push({type: 'text', value: ' '});
      }

      backReferences.push(backReference);
    }

    const tail = content[content.length - 1];

    if (tail && tail.type === 'element' && tail.tagName === 'p') {
      const tailTail = tail.children[tail.children.length - 1];
      if (tailTail && tailTail.type === 'text') {
        tailTail.value += ' ';
      } else {
        tail.children.push({type: 'text', value: ' '});
      }

      tail.children.push(...backReferences);
    } else {
      content.push(...backReferences);
    }

    /** @type {Element} */
    const listItem = {
      type: 'element',
      tagName: 'li',
      properties: {id: state.clobberPrefix + 'fn-' + safeId},
      children: state.wrap(content, true)
    };

    state.patch(def, listItem);

    listItems.push(listItem);
  }

  if (listItems.length === 0) {
    return
  }

  return {
    type: 'element',
    tagName: 'section',
    properties: {dataFootnotes: true, className: ['footnotes']},
    children: [
      {
        type: 'element',
        tagName: state.footnoteLabelTagName,
        properties: {
          // To do: use structured clone.
          ...JSON.parse(JSON.stringify(state.footnoteLabelProperties)),
          id: 'footnote-label'
        },
        children: [{type: 'text', value: state.footnoteLabel}]
      },
      {type: 'text', value: '\n'},
      {
        type: 'element',
        tagName: 'ol',
        properties: {},
        children: state.wrap(listItems, true)
      },
      {type: 'text', value: '\n'}
    ]
  }
}

/**
 * @typedef {import('hast').Content} HastContent
 * @typedef {import('hast').Root} HastRoot
 *
 * @typedef {import('mdast').Content} MdastContent
 * @typedef {import('mdast').Root} MdastRoot
 *
 * @typedef {import('./state.js').Options} Options
 */

/**
 * Transform mdast to hast.
 *
 * ##### Notes
 *
 * ###### HTML
 *
 * Raw HTML is available in mdast as `html` nodes and can be embedded in hast
 * as semistandard `raw` nodes.
 * Most utilities ignore `raw` nodes but two notable ones don’t:
 *
 * *   `hast-util-to-html` also has an option `allowDangerousHtml` which will
 *     output the raw HTML.
 *     This is typically discouraged as noted by the option name but is useful
 *     if you completely trust authors
 * *   `hast-util-raw` can handle the raw embedded HTML strings by parsing them
 *     into standard hast nodes (`element`, `text`, etc).
 *     This is a heavy task as it needs a full HTML parser, but it is the only
 *     way to support untrusted content
 *
 * ###### Footnotes
 *
 * Many options supported here relate to footnotes.
 * Footnotes are not specified by CommonMark, which we follow by default.
 * They are supported by GitHub, so footnotes can be enabled in markdown with
 * `mdast-util-gfm`.
 *
 * The options `footnoteBackLabel` and `footnoteLabel` define natural language
 * that explains footnotes, which is hidden for sighted users but shown to
 * assistive technology.
 * When your page is not in English, you must define translated values.
 *
 * Back references use ARIA attributes, but the section label itself uses a
 * heading that is hidden with an `sr-only` class.
 * To show it to sighted users, define different attributes in
 * `footnoteLabelProperties`.
 *
 * ###### Clobbering
 *
 * Footnotes introduces a problem, as it links footnote calls to footnote
 * definitions on the page through `id` attributes generated from user content,
 * which results in DOM clobbering.
 *
 * DOM clobbering is this:
 *
 * ```html
 * <p id=x></p>
 * <script>alert(x) // `x` now refers to the DOM `p#x` element</script>
 * ```
 *
 * Elements by their ID are made available by browsers on the `window` object,
 * which is a security risk.
 * Using a prefix solves this problem.
 *
 * More information on how to handle clobbering and the prefix is explained in
 * Example: headings (DOM clobbering) in `rehype-sanitize`.
 *
 * ###### Unknown nodes
 *
 * Unknown nodes are nodes with a type that isn’t in `handlers` or `passThrough`.
 * The default behavior for unknown nodes is:
 *
 * *   when the node has a `value` (and doesn’t have `data.hName`,
 *     `data.hProperties`, or `data.hChildren`, see later), create a hast `text`
 *     node
 * *   otherwise, create a `<div>` element (which could be changed with
 *     `data.hName`), with its children mapped from mdast to hast as well
 *
 * This behavior can be changed by passing an `unknownHandler`.
 *
 * @param {MdastNodes} tree
 *   mdast tree.
 * @param {Options | null | undefined} [options]
 *   Configuration.
 * @returns {HastNodes | null | undefined}
 *   hast tree.
 */
// To do: next major: always return a single `root`.
function toHast(tree, options) {
  const state = createState(tree, options);
  const node = state.one(tree, null);
  const foot = footer(state);

  if (foot) {
    // @ts-expect-error If there’s a footer, there were definitions, meaning block
    // content.
    // So assume `node` is a parent node.
    node.children.push({type: 'text', value: '\n'}, foot);
  }

  // To do: next major: always return root?
  return Array.isArray(node) ? {type: 'root', children: node} : node
}

/**
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('mdast').Root} MdastRoot
 * @typedef {import('mdast-util-to-hast').Options} Options
 * @typedef {import('unified').Processor<any, any, any, any>} Processor
 *
 * @typedef {import('mdast-util-to-hast')} DoNotTouchAsThisImportIncludesRawInTree
 */

// Note: the `<MdastRoot, HastRoot>` overload doesn’t seem to work :'(

/**
 * Plugin that turns markdown into HTML to support rehype.
 *
 * *   If a destination processor is given, that processor runs with a new HTML
 *     (hast) tree (bridge-mode).
 *     As the given processor runs with a hast tree, and rehype plugins support
 *     hast, that means rehype plugins can be used with the given processor.
 *     The hast tree is discarded in the end.
 *     It’s highly unlikely that you want to do this.
 * *   The common case is to not pass a destination processor, in which case the
 *     current processor continues running with a new HTML (hast) tree
 *     (mutate-mode).
 *     As the current processor continues with a hast tree, and rehype plugins
 *     support hast, that means rehype plugins can be used after
 *     `remark-rehype`.
 *     It’s likely that this is what you want to do.
 *
 * @param destination
 *   Optional unified processor.
 * @param options
 *   Options passed to `mdast-util-to-hast`.
 */
const remarkRehype =
  /** @type {(import('unified').Plugin<[Processor, Options?]|[null|undefined, Options?]|[Options]|[], MdastRoot>)} */
  (
    function (destination, options) {
      return destination && 'run' in destination
        ? bridge(destination, options)
        : mutate(destination || options)
    }
  );

var remarkRehype$1 = remarkRehype;

/**
 * Bridge-mode.
 * Runs the destination with the new hast tree.
 *
 * @type {import('unified').Plugin<[Processor, Options?], MdastRoot>}
 */
function bridge(destination, options) {
  return (node, file, next) => {
    destination.run(toHast(node, options), file, (error) => {
      next(error);
    });
  }
}

/**
 * Mutate-mode.
 * Further plugins run on the hast tree.
 *
 * @type {import('unified').Plugin<[Options?]|void[], MdastRoot, HastRoot>}
 */
function mutate(options) {
  // @ts-expect-error: assume a corresponding node is returned by `toHast`.
  return (node) => toHast(node, options)
}

const processor = unified()
  .use(remarkParse)
  .use(remarkBreaks)
  .use(remarkFrontmatter)
  .use(remarkGemoji)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype$1);

console.log(processor.parse("## hi"));

export { processor };
