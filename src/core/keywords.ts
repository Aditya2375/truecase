/**
 * Keyword and common-library symbol tables.
 *
 * Canonical casing matters: keywords are listed exactly as the language
 * defines them, library symbols exactly as the standard library names them.
 * The engine never invents casing; it only restores casing that already
 * exists here or elsewhere in the document.
 *
 * Deep support (keywords + standard library) exists for the languages the
 * author uses daily. Other languages get keywords plus the language-agnostic
 * document-identifier engine, which is where most corrections come from.
 */

export type LangKey =
  | 'java' | 'c' | 'cpp' | 'javascript' | 'typescript' | 'python'
  | 'csharp' | 'go' | 'rust' | 'kotlin' | 'swift' | 'php'
  | 'ruby' | 'sql' | 'lua' | 'r' | 'shellscript';

const JAVA_KEYWORDS = [
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
  'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
  'package', 'private', 'protected', 'public', 'record', 'return', 'sealed',
  'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this',
  'throw', 'throws', 'transient', 'try', 'var', 'void', 'volatile', 'while',
  'yield', 'permits', 'true', 'false', 'null',
];

const C_KEYWORDS = [
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'inline',
  'int', 'long', 'register', 'restrict', 'return', 'short', 'signed',
  'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned',
  'void', 'volatile', 'while',
  '_Alignas', '_Alignof', '_Atomic', '_Bool', '_Complex', '_Generic',
  '_Imaginary', '_Noreturn', '_Static_assert', '_Thread_local',
];

const CPP_KEYWORDS = [
  'alignas', 'alignof', 'asm', 'auto', 'bool', 'break', 'case', 'catch',
  'char', 'char8_t', 'char16_t', 'char32_t', 'class', 'concept', 'const',
  'consteval', 'constexpr', 'constinit', 'const_cast', 'continue', 'co_await',
  'co_return', 'co_yield', 'decltype', 'default', 'delete', 'do', 'double',
  'dynamic_cast', 'else', 'enum', 'explicit', 'export', 'extern', 'false',
  'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long', 'mutable',
  'namespace', 'new', 'noexcept', 'nullptr', 'operator', 'private',
  'protected', 'public', 'register', 'reinterpret_cast', 'requires', 'return',
  'short', 'signed', 'sizeof', 'static', 'static_assert', 'static_cast',
  'struct', 'switch', 'template', 'this', 'thread_local', 'throw', 'true',
  'try', 'typedef', 'typeid', 'typename', 'union', 'unsigned', 'using',
  'virtual', 'void', 'volatile', 'wchar_t', 'while',
];

const JS_KEYWORDS = [
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends',
  'finally', 'for', 'from', 'function', 'get', 'if', 'import', 'in',
  'instanceof', 'let', 'new', 'of', 'return', 'set', 'static', 'super',
  'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while',
  'with', 'yield', 'true', 'false', 'null', 'undefined',
];

const TS_KEYWORDS = JS_KEYWORDS.concat([
  'abstract', 'any', 'as', 'asserts', 'bigint', 'boolean', 'declare',
  'enum', 'implements', 'infer', 'interface', 'is', 'keyof', 'namespace',
  'never', 'number', 'object', 'override', 'private', 'protected', 'public',
  'readonly', 'string', 'symbol', 'type', 'unknown',
]);

const PYTHON_KEYWORDS = [
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
  'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
  'match', 'case',
];

const GO_KEYWORDS = [
  'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
  'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface',
  'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type',
  'var', 'true', 'false', 'nil', 'iota',
];

const RUST_KEYWORDS = [
  'as', 'async', 'await', 'box', 'break', 'const', 'continue', 'crate',
  'dyn', 'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in',
  'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return',
  'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type',
  'unsafe', 'use', 'where', 'while',
  'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
  'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
  'f32', 'f64', 'bool', 'str', 'char',
];

const CSHARP_KEYWORDS = [
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch',
  'char', 'checked', 'class', 'const', 'continue', 'decimal', 'default',
  'delegate', 'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern',
  'false', 'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if',
  'implicit', 'in', 'int', 'interface', 'internal', 'is', 'lock', 'long',
  'namespace', 'new', 'null', 'object', 'operator', 'out', 'override',
  'params', 'private', 'protected', 'public', 'readonly', 'record', 'ref',
  'return', 'sbyte', 'sealed', 'short', 'sizeof', 'stackalloc', 'static',
  'string', 'struct', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
  'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual',
  'void', 'volatile', 'while', 'async', 'await', 'var', 'dynamic', 'yield',
  'get', 'set', 'init', 'where', 'partial', 'required', 'nint', 'nuint',
];

const KOTLIN_KEYWORDS = [
  'as', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun',
  'if', 'in', 'interface', 'is', 'null', 'object', 'package', 'return',
  'super', 'this', 'throw', 'true', 'try', 'typealias', 'typeof', 'val',
  'var', 'when', 'while', 'by', 'catch', 'constructor', 'data', 'init',
  'companion', 'const', 'lateinit', 'vararg', 'inline', 'noinline',
  'crossinline', 'reified', 'suspend', 'tailrec', 'operator', 'infix',
  'internal', 'private', 'protected', 'public', 'override', 'abstract',
  'final', 'open', 'enum', 'annotation', 'sealed', 'external', 'expect',
  'actual', 'import', 'out', 'where', 'get', 'set', 'field', 'receiver',
];

const SWIFT_KEYWORDS = [
  'associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate',
  'func', 'import', 'init', 'inout', 'internal', 'let', 'open', 'operator',
  'private', 'precedencegroup', 'protocol', 'public', 'rethrows', 'static',
  'struct', 'subscript', 'typealias', 'var', 'actor', 'async', 'await',
  'break', 'case', 'catch', 'continue', 'default', 'defer', 'do', 'else',
  'fallthrough', 'for', 'guard', 'if', 'in', 'repeat', 'return', 'throw',
  'switch', 'where', 'while', 'as', 'false', 'is', 'nil', 'self', 'Self',
  'super', 'throws', 'true', 'try', 'some', 'any', 'nonisolated',
];

const PHP_KEYWORDS = [
  'abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch',
  'class', 'clone', 'const', 'continue', 'declare', 'default', 'do', 'echo',
  'else', 'elseif', 'empty', 'enddeclare', 'endfor', 'endforeach', 'endif',
  'endswitch', 'endwhile', 'enum', 'extends', 'final', 'finally', 'fn',
  'for', 'foreach', 'function', 'global', 'goto', 'if', 'implements',
  'include', 'include_once', 'instanceof', 'insteadof', 'interface',
  'isset', 'list', 'match', 'namespace', 'new', 'or', 'print', 'private',
  'protected', 'public', 'readonly', 'require', 'require_once', 'return',
  'static', 'switch', 'throw', 'trait', 'try', 'unset', 'use', 'var',
  'while', 'xor', 'yield', 'true', 'false', 'null',
];

const RUBY_KEYWORDS = [
  'alias', 'and', 'begin', 'BEGIN', 'break', 'case', 'class', 'def',
  'defined', 'do', 'else', 'elsif', 'end', 'END', 'ensure', 'false', 'for',
  'if', 'in', 'module', 'next', 'nil', 'not', 'or', 'redo', 'rescue',
  'retry', 'return', 'self', 'super', 'then', 'true', 'undef', 'unless',
  'until', 'when', 'while', 'yield',
  '__FILE__', '__LINE__', '__method__', '__dir__', '__callee__',
];

// SQL is case-insensitive; canonical form follows the near-universal
// UPPERCASE convention.
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'INDEX', 'VIEW',
  'DATABASE', 'SCHEMA', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
  'CROSS', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'AS',
  'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'ILIKE', 'BETWEEN',
  'EXISTS', 'DISTINCT', 'UNION', 'ALL', 'ANY', 'CASE', 'WHEN', 'THEN',
  'ELSE', 'END', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE',
  'CHECK', 'DEFAULT', 'CONSTRAINT', 'AUTO_INCREMENT', 'IDENTITY', 'BEGIN',
  'COMMIT', 'ROLLBACK', 'TRANSACTION', 'GRANT', 'REVOKE', 'COUNT', 'SUM',
  'AVG', 'MIN', 'MAX', 'CAST', 'COALESCE', 'NULLIF', 'WITH', 'RECURSIVE',
  'OVER', 'PARTITION', 'ASC', 'DESC', 'VARCHAR', 'CHAR', 'INT', 'INTEGER',
  'BIGINT', 'SMALLINT', 'TINYINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'REAL',
  'DOUBLE', 'PRECISION', 'DATE', 'TIME', 'TIMESTAMP', 'DATETIME', 'BOOLEAN',
  'BOOL', 'TEXT', 'BLOB', 'SERIAL', 'BIGSERIAL', 'INTERVAL', 'EXTRACT',
  'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'TRUNCATE',
  'CASCADE', 'RESTRICT', 'TEMPORARY', 'TEMP', 'IF', 'REPLACE', 'RETURNING',
  'DISTINCTROW', 'NATURAL', 'USING', 'FETCH', 'FIRST', 'NEXT', 'ROWS',
  'ONLY', 'TOP', 'EXCEPT', 'INTERSECT', 'ESCAPE', 'COLLATE', 'LATERAL',
];

const LUA_KEYWORDS = [
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
  'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return',
  'then', 'true', 'until', 'while',
];

const R_KEYWORDS = [
  'if', 'else', 'repeat', 'while', 'function', 'for', 'in', 'next', 'break',
  'TRUE', 'FALSE', 'NULL', 'Inf', 'NaN', 'NA',
];

const SHELL_KEYWORDS = [
  'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'until', 'do', 'done',
  'case', 'esac', 'in', 'function', 'select', 'time', 'coproc',
  'echo', 'printf', 'read', 'cd', 'pwd', 'exit', 'return', 'export',
  'local', 'declare', 'typeset', 'readonly', 'unset', 'shift', 'eval',
  'exec', 'source', 'trap', 'umask', 'wait', 'jobs', 'bg', 'fg', 'kill',
  'test', 'true', 'false', 'set', 'getopts', 'let', 'break', 'continue',
];

export const KEYWORDS: Record<LangKey, string[]> = {
  java: JAVA_KEYWORDS,
  c: C_KEYWORDS,
  cpp: CPP_KEYWORDS,
  javascript: JS_KEYWORDS,
  typescript: TS_KEYWORDS,
  python: PYTHON_KEYWORDS,
  csharp: CSHARP_KEYWORDS,
  go: GO_KEYWORDS,
  rust: RUST_KEYWORDS,
  kotlin: KOTLIN_KEYWORDS,
  swift: SWIFT_KEYWORDS,
  php: PHP_KEYWORDS,
  ruby: RUBY_KEYWORDS,
  sql: SQL_KEYWORDS,
  lua: LUA_KEYWORDS,
  r: R_KEYWORDS,
  shellscript: SHELL_KEYWORDS,
};

/**
 * Common standard-library / built-in names whose casing beginners routinely
 * flatten. Entries are per language so a Java `String` rule can never
 * misfire in TypeScript (where `string` is correct) or C++ (where
 * `std::string` is lowercase). Languages not listed here still get the
 * document-identifier engine.
 */
const JAVA_LIBRARY = [
  // java.lang types
  'Object', 'String', 'StringBuilder', 'StringBuffer', 'StringJoiner',
  'System', 'Math', 'Integer', 'Long', 'Double', 'Float', 'Short', 'Byte',
  'Character', 'Boolean', 'Number', 'Void', 'Class', 'Enum', 'Thread',
  'ThreadLocal', 'Runnable', 'Comparable', 'Iterable', 'Cloneable',
  'Throwable', 'Exception', 'RuntimeException', 'Error', 'StackTraceElement',
  'NullPointerException', 'IllegalArgumentException', 'IllegalStateException',
  'IndexOutOfBoundsException', 'ArrayIndexOutOfBoundsException',
  'StringIndexOutOfBoundsException', 'ClassCastException',
  'ClassNotFoundException', 'ArithmeticException', 'NumberFormatException',
  'UnsupportedOperationException', 'InterruptedException',
  'SecurityException', 'NegativeArraySizeException',
  'Process', 'ProcessBuilder', 'Runtime', 'Module',
  'Override', 'Deprecated', 'SuppressWarnings', 'FunctionalInterface',
  'SafeVarargs', 'AutoCloseable',
  // java.lang methods that are camelCase traps
  'toString', 'hashCode', 'equalsIgnoreCase', 'compareTo',
  'compareToIgnoreCase', 'parseInt', 'parseLong', 'parseDouble',
  'parseFloat', 'parseShort', 'parseByte', 'parseBoolean', 'valueOf',
  'toLowerCase', 'toUpperCase', 'charAt', 'codePointAt', 'indexOf',
  'lastIndexOf', 'isEmpty', 'isBlank', 'getClass', 'notifyAll',
  // java.util
  'Scanner', 'ArrayList', 'LinkedList', 'HashMap', 'LinkedHashMap',
  'TreeMap', 'HashSet', 'LinkedHashSet', 'TreeSet', 'List', 'Set', 'Map',
  'Queue', 'Deque', 'ArrayDeque', 'PriorityQueue', 'Stack', 'Vector',
  'Hashtable', 'Collections', 'Arrays', 'Iterator', 'ListIterator',
  'Optional', 'OptionalInt', 'OptionalLong', 'OptionalDouble', 'Random',
  'UUID', 'Comparator', 'Objects', 'StringTokenizer', 'Properties',
  'Locale', 'TimeZone', 'Calendar', 'Date', 'Currency',
  'ConcurrentHashMap', 'CopyOnWriteArrayList', 'ConcurrentLinkedQueue',
  'Collectors', 'Stream', 'IntStream', 'LongStream', 'DoubleStream',
  'Base64', 'BitSet', 'Formatter', 'ServiceLoader',
  // java.util methods
  'addAll', 'removeAll', 'retainAll', 'containsAll', 'keySet', 'entrySet',
  'getOrDefault', 'putIfAbsent', 'computeIfAbsent', 'computeIfPresent',
  'forEach', 'removeIf', 'replaceAll', 'binarySearch', 'toArray', 'asList',
  'hasNext', 'nextInt', 'nextLong', 'nextDouble', 'nextFloat', 'nextLine',
  'nextBoolean', 'nextByte', 'nextShort',
  // java.io / java.nio
  'File', 'Files', 'Path', 'Paths', 'FileReader', 'FileWriter',
  'BufferedReader', 'BufferedWriter', 'InputStream', 'OutputStream',
  'FileInputStream', 'FileOutputStream', 'PrintWriter', 'PrintStream',
  'IOException', 'FileNotFoundException', 'EOFException', 'Serializable',
  'ObjectInputStream', 'ObjectOutputStream', 'DataInputStream',
  'DataOutputStream', 'ByteArrayInputStream', 'ByteArrayOutputStream',
  'InputStreamReader', 'OutputStreamWriter', 'StandardCharsets',
  'BufferedInputStream', 'BufferedOutputStream',
  'readLine', 'readAllBytes', 'readAllLines',
  // java.math, java.time, java.net, java.sql, common annotations
  'BigInteger', 'BigDecimal', 'RoundingMode',
  'LocalDate', 'LocalTime', 'LocalDateTime', 'ZonedDateTime', 'Instant',
  'Duration', 'Period', 'DateTimeFormatter', 'DayOfWeek', 'Month',
  'URL', 'URI', 'URLConnection', 'HttpURLConnection', 'InetAddress',
  'Connection', 'DriverManager', 'PreparedStatement', 'ResultSet',
  'Statement', 'SQLException',
  'Test', 'BeforeEach', 'AfterEach', 'BeforeAll', 'AfterAll',
  'ParameterizedTest', 'DisplayName',
];

const C_LIBRARY = [
  'FILE', 'EOF', 'NULL', 'size_t', 'ptrdiff_t', 'printf', 'scanf',
  'fprintf', 'sprintf', 'snprintf', 'malloc', 'calloc', 'realloc', 'free',
  'memcpy', 'memmove', 'memset', 'memcmp', 'strlen', 'strcpy', 'strncpy',
  'strcat', 'strcmp', 'strncmp', 'strchr', 'strstr', 'fopen', 'fclose',
  'fgets', 'fputs', 'stdin', 'stdout', 'stderr',
];

const CPP_LIBRARY = [
  'string', 'vector', 'map', 'set', 'unordered_map', 'unordered_set',
  'queue', 'stack', 'deque', 'list', 'array', 'pair', 'tuple', 'optional',
  'variant', 'any', 'iostream', 'istream', 'ostream', 'fstream', 'sstream',
  'ifstream', 'ofstream', 'stringstream', 'cin', 'cout', 'cerr', 'endl',
  'std', 'size_t', 'make_unique', 'make_shared', 'unique_ptr', 'shared_ptr',
  'weak_ptr', 'make_pair', 'make_tuple', 'priority_queue', 'string_view',
  'nullptr_t', 'runtime_error', 'logic_error', 'out_of_range',
  'invalid_argument', 'length_error', 'bad_alloc', 'exception',
];

const JS_LIBRARY = [
  'JSON', 'Math', 'Promise', 'Array', 'Object', 'Map', 'Set', 'WeakMap',
  'WeakSet', 'Date', 'RegExp', 'Symbol', 'BigInt', 'Error', 'TypeError',
  'RangeError', 'SyntaxError', 'ReferenceError', 'EvalError', 'URIError',
  'AggregateError', 'ArrayBuffer', 'DataView', 'Int8Array', 'Uint8Array',
  'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array',
  'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array',
  'SharedArrayBuffer', 'Proxy', 'Reflect', 'WeakRef', 'FinalizationRegistry',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'decodeURI', 'encodeURI',
  'decodeURIComponent', 'encodeURIComponent',
  'console', 'window', 'document', 'navigator', 'location', 'history',
  'localStorage', 'sessionStorage', 'setTimeout', 'setInterval',
  'clearTimeout', 'clearInterval', 'requestAnimationFrame',
  'cancelAnimationFrame', 'queueMicrotask', 'addEventListener',
  'removeEventListener', 'querySelector', 'querySelectorAll',
  'getElementById', 'getElementsByClassName', 'getElementsByTagName',
  'createElement', 'createTextNode', 'appendChild', 'removeChild',
  'insertBefore', 'replaceChild', 'classList', 'dataset', 'MutationObserver',
  'IntersectionObserver', 'ResizeObserver', 'XMLHttpRequest', 'Headers',
  'Request', 'Response', 'FormData', 'URL', 'URLSearchParams', 'Blob',
  'FileReader', 'AbortController', 'TextEncoder', 'TextDecoder',
  'hasOwnProperty', 'toString', 'valueOf', 'forEach', 'indexOf',
  'lastIndexOf', 'findIndex', 'toUpperCase', 'toLowerCase', 'charAt',
  'charCodeAt', 'codePointAt', 'startsWith', 'endsWith', 'padStart',
  'padEnd', 'trimStart', 'trimEnd', 'toFixed', 'toPrecision',
  'toExponential', 'toLocaleString',
];

const PYTHON_LIBRARY = [
  'Exception', 'BaseException', 'ValueError', 'TypeError', 'KeyError',
  'IndexError', 'AttributeError', 'RuntimeError', 'StopIteration',
  'StopAsyncIteration', 'ArithmeticError', 'AssertionError', 'ImportError',
  'ModuleNotFoundError', 'NameError', 'UnboundLocalError', 'OSError',
  'IOError', 'FileNotFoundError', 'FileExistsError', 'PermissionError',
  'TimeoutError', 'ConnectionError', 'ZeroDivisionError',
  'NotImplementedError', 'RecursionError', 'MemoryError', 'OverflowError',
  'KeyboardInterrupt', 'SystemExit', 'GeneratorExit', 'LookupError',
  'isinstance', 'issubclass', 'hasattr', 'getattr', 'setattr', 'delattr',
  'callable', 'NotImplemented', 'Ellipsis',
  '__init__', '__name__', '__main__', '__str__', '__repr__', '__len__',
  '__iter__', '__next__', '__eq__', '__ne__', '__lt__', '__le__', '__gt__',
  '__ge__', '__add__', '__sub__', '__mul__', '__enter__', '__exit__',
  '__dict__', '__class__', '__file__', '__doc__', '__import__',
  '__all__', '__version__', '__path__', '__package__', '__spec__',
  '__annotations__', '__defaults__', '__globals__', '__builtins__',
];

const RUST_LIBRARY = [
  'String', 'Vec', 'Option', 'Result', 'Some', 'None', 'Ok', 'Err', 'Box',
  'HashMap', 'HashSet', 'BTreeMap', 'BTreeSet', 'VecDeque', 'LinkedList',
  'BinaryHeap', 'Rc', 'Arc', 'Mutex', 'RwLock', 'Cell', 'RefCell', 'Cow',
  'Duration', 'Instant', 'SystemTime', 'Path', 'PathBuf', 'File',
  'to_string', 'push_str', 'as_str', 'as_mut', 'as_ref', 'is_some',
  'is_none', 'is_ok', 'is_err',
];

const CSHARP_LIBRARY = [
  'Console', 'String', 'Math', 'DateTime', 'DateTimeOffset', 'TimeSpan',
  'DateOnly', 'TimeOnly', 'List', 'Dictionary', 'HashSet', 'SortedSet',
  'SortedDictionary', 'SortedList', 'Queue', 'Stack', 'LinkedList',
  'StringBuilder', 'Exception', 'ArgumentException',
  'ArgumentNullException', 'ArgumentOutOfRangeException',
  'InvalidOperationException', 'NullReferenceException', 'IOException',
  'FileNotFoundException', 'FormatException', 'OverflowException',
  'NotImplementedException', 'NotSupportedException', 'Task', 'ValueTask',
  'IDisposable', 'IEnumerable', 'IEnumerator', 'ICollection', 'IList',
  'IDictionary', 'IComparable', 'IEquatable', 'Guid', 'Environment',
  'StringComparison', 'StringSplitOptions', 'CancellationToken', 'Stream',
  'StreamReader', 'StreamWriter', 'MemoryStream', 'FileStream', 'File',
  'Directory', 'Path', 'Encoding', 'Regex', 'Convert', 'BitConverter',
  'Array', 'Enum', 'Delegate', 'Action', 'Func', 'Predicate', 'EventArgs',
  'EventHandler', 'Attribute', 'Assembly', 'Type', 'Activator', 'Random',
  'HttpClient', 'HttpRequestMessage', 'HttpResponseMessage', 'Uri',
  'ToString', 'GetHashCode', 'GetType', 'WriteLine', 'ReadLine',
  'AddRange', 'ContainsKey', 'TryGetValue', 'FirstOrDefault',
  'LastOrDefault', 'SingleOrDefault', 'ToList', 'ToArray', 'ToDictionary',
  'ToHashSet', 'OrderBy', 'OrderByDescending', 'GroupBy', 'SelectMany',
  'IndexOf', 'LastIndexOf', 'Substring', 'ToUpper', 'ToLower',
  'IsNullOrEmpty', 'IsNullOrWhiteSpace', 'StartsWith', 'EndsWith',
  'PadLeft', 'PadRight', 'TrimStart', 'TrimEnd',
];

const KOTLIN_LIBRARY = [
  'String', 'Int', 'Long', 'Double', 'Float', 'Boolean', 'Char', 'Byte',
  'Short', 'Any', 'Unit', 'Nothing', 'List', 'MutableList', 'Set',
  'MutableSet', 'Map', 'MutableMap', 'Array', 'IntArray', 'DoubleArray',
  'BooleanArray', 'Pair', 'Triple', 'ArrayList', 'HashMap', 'HashSet',
  'LinkedHashMap', 'LinkedHashSet', 'Sequence', 'CharSequence',
  'StringBuilder', 'Comparable', 'Throwable', 'Exception',
  'RuntimeException', 'IllegalArgumentException', 'IllegalStateException',
  'NullPointerException', 'IndexOutOfBoundsException', 'Result', 'Lazy',
];

const SWIFT_LIBRARY = [
  'String', 'Int', 'Int8', 'Int16', 'Int32', 'Int64', 'UInt', 'Double',
  'Float', 'Bool', 'Character', 'Array', 'Dictionary', 'Set', 'Optional',
  'Result', 'Data', 'Date', 'DateComponents', 'URL', 'URLSession',
  'URLRequest', 'HTTPURLResponse', 'JSONDecoder', 'JSONEncoder',
  'JSONSerialization', 'Codable', 'Decodable', 'Encodable', 'UUID',
  'Calendar', 'DateFormatter', 'NumberFormatter', 'FileManager', 'Bundle',
  'NotificationCenter', 'DispatchQueue', 'DispatchGroup', 'Task', 'Error',
  'NSError', 'IndexPath', 'IndexSet', 'Range', 'ClosedRange', 'Comparable',
  'Equatable', 'Hashable', 'CustomStringConvertible', 'Identifiable',
  'TimeInterval', 'Substring', 'CharacterSet', 'Locale', 'TimeZone',
];

const PHP_LIBRARY = [
  'Exception', 'Error', 'Throwable', 'RuntimeException',
  'InvalidArgumentException', 'LogicException', 'DateTime',
  'DateTimeImmutable', 'DateInterval', 'DateTimeZone', 'ArrayObject',
  'ArrayIterator', 'Closure', 'Generator', 'PDO', 'PDOException',
  'stdClass', 'Countable', 'Iterator', 'IteratorAggregate', 'ArrayAccess',
  'Serializable', 'Stringable', 'JsonException', 'CURLFile',
  'SimpleXMLElement', 'DOMDocument', 'DOMElement', 'SplStack', 'SplQueue',
];

const RUBY_LIBRARY = [
  'Object', 'String', 'Integer', 'Float', 'Array', 'Hash', 'Symbol',
  'Numeric', 'Comparable', 'Enumerable', 'Exception', 'StandardError',
  'RuntimeError', 'ArgumentError', 'TypeError', 'NameError',
  'NoMethodError', 'IndexError', 'KeyError', 'IOError', 'EOFError',
  'ZeroDivisionError', 'NotImplementedError', 'Time', 'Date', 'DateTime',
  'File', 'Dir', 'IO', 'StringIO', 'Proc', 'Method', 'Class', 'Module',
  'Struct', 'Range', 'Regexp', 'MatchData', 'Thread', 'Mutex', 'Queue',
  'Set', 'Pathname', 'URI', 'JSON', 'CSV', 'SecureRandom', 'Digest',
  'Base64', 'Logger',
];

export const LIBRARY: Partial<Record<LangKey, string[]>> = {
  java: JAVA_LIBRARY,
  c: C_LIBRARY,
  cpp: CPP_LIBRARY,
  javascript: JS_LIBRARY,
  typescript: JS_LIBRARY,
  python: PYTHON_LIBRARY,
  rust: RUST_LIBRARY,
  csharp: CSHARP_LIBRARY,
  kotlin: KOTLIN_LIBRARY,
  swift: SWIFT_LIBRARY,
  php: PHP_LIBRARY,
  ruby: RUBY_LIBRARY,
};

/** Lowercase -> canonical lookup, built once per language. Ambiguous entries are dropped. */
const keywordIndex = new Map<string, Map<string, string>>();
const libraryIndex = new Map<string, Map<string, string>>();

function buildIndex(list: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const entry of list) {
    const key = entry.toLowerCase();
    const existing = m.get(key);
    if (existing !== undefined && existing !== entry) {
      m.delete(key); // two canonical forms differ only by case: ambiguous
    } else if (existing === undefined) {
      m.set(key, entry);
    }
  }
  return m;
}

export function keywordCanonical(lang: LangKey, lowerWord: string): string | undefined {
  let idx = keywordIndex.get(lang);
  if (!idx) { idx = buildIndex(KEYWORDS[lang]); keywordIndex.set(lang, idx); }
  return idx.get(lowerWord);
}

export function libraryCanonical(lang: LangKey, lowerWord: string): string | undefined {
  let idx = libraryIndex.get(lang);
  if (!idx) { idx = buildIndex(LIBRARY[lang] ?? []); libraryIndex.set(lang, idx); }
  return idx.get(lowerWord);
}

export function isKeywordExact(lang: LangKey, word: string): boolean {
  return KEYWORDS[lang].includes(word);
}
