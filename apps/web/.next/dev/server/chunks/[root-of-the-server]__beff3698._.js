module.exports = [
"[externals]/pg [external] (pg, esm_import)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

const mod = await __turbopack_context__.y("pg");

__turbopack_context__.n(mod);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
"[project]/services/api/src/db/connection.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "closePool",
    ()=>closePool,
    "getPool",
    ()=>getPool,
    "getStats",
    ()=>getStats,
    "healthCheck",
    ()=>healthCheck,
    "query",
    ()=>query,
    "transaction",
    ()=>transaction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$asyncToGenerator$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@babel/runtime/helpers/asyncToGenerator.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$29$__ = __turbopack_context__.i("[externals]/pg [external] (pg, esm_import)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
var poolInstance = null;
function getDatabaseConfig() {
    var connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable must be set');
    }
    if (!connectionString.includes('neon.tech') && ("TURBOPACK compile-time value", "development") === 'production') //TURBOPACK unreachable
    ;
    var isPooled = connectionString.includes('-pooler.');
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return {
        connectionString: connectionString,
        ssl: true,
        max: 10,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 10000
    };
}
function getPool() {
    return _getPool.apply(this, arguments);
}
function _getPool() {
    _getPool = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$asyncToGenerator$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(function*() {
        if (poolInstance) {
            return poolInstance;
        }
        var config = getDatabaseConfig();
        poolInstance = new __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$29$__["Pool"]({
            connectionString: config.connectionString,
            ssl: config.ssl ? {
                rejectUnauthorized: false
            } : undefined,
            max: config.max,
            idleTimeoutMillis: config.idleTimeoutMillis,
            connectionTimeoutMillis: config.connectionTimeoutMillis,
            statement_timeout: 30000
        });
        poolInstance.on('error', function(err) {
            console.error('Unexpected database pool error:', err);
        });
        var urlObj = new URL(config.connectionString);
        console.log('Database pool initialized:', {
            host: urlObj.hostname,
            database: urlObj.pathname.slice(1),
            ssl: config.ssl,
            maxConnections: config.max,
            isNeonPooled: urlObj.hostname.includes('-pooler.')
        });
        return poolInstance;
    });
    return _getPool.apply(this, arguments);
}
function query(_x, _x2) {
    return _query.apply(this, arguments);
}
function _query() {
    _query = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$asyncToGenerator$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(function*(text, params) {
        var pool = yield getPool();
        try {
            var start = Date.now();
            var result = yield pool.query(text, params);
            var duration = Date.now() - start;
            if (duration > 1000) {
                console.warn('Slow query detected:', {
                    duration: duration,
                    text: text.substring(0, 100),
                    rowCount: result.rowCount
                });
            }
            return result;
        } catch (error) {
            console.error('Database query error:', {
                error: error,
                text: text.substring(0, 100)
            });
            throw error;
        }
    });
    return _query.apply(this, arguments);
}
function transaction(_x3) {
    return _transaction.apply(this, arguments);
}
function _transaction() {
    _transaction = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$asyncToGenerator$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(function*(callback) {
        var pool = yield getPool();
        var client = yield pool.connect();
        try {
            yield client.query('BEGIN');
            var result = yield callback(client);
            yield client.query('COMMIT');
            return result;
        } catch (error) {
            yield client.query('ROLLBACK');
            console.error('Transaction error:', error);
            throw error;
        } finally{
            client.release();
        }
    });
    return _transaction.apply(this, arguments);
}
function closePool() {
    return _closePool.apply(this, arguments);
}
function _closePool() {
    _closePool = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$asyncToGenerator$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(function*() {
        if (poolInstance) {
            yield poolInstance.end();
            poolInstance = null;
        }
    });
    return _closePool.apply(this, arguments);
}
function healthCheck() {
    return _healthCheck.apply(this, arguments);
}
function _healthCheck() {
    _healthCheck = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$asyncToGenerator$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(function*() {
        try {
            var _result$rows$;
            var result = yield query('SELECT 1 as health');
            return ((_result$rows$ = result.rows[0]) == null ? void 0 : _result$rows$.health) === 1;
        } catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    });
    return _healthCheck.apply(this, arguments);
}
function getStats() {
    return _getStats.apply(this, arguments);
}
function _getStats() {
    _getStats = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$asyncToGenerator$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(function*() {
        var pool = yield getPool();
        return {
            totalConnections: pool.totalCount,
            idleConnections: pool.idleCount,
            waitingClients: pool.waitingCount
        };
    });
    return _getStats.apply(this, arguments);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/node_modules/@babel/runtime/helpers/asyncToGenerator.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

function asyncGeneratorStep(n, t, e, r, o, a, c) {
    try {
        var i = n[a](c), u = i.value;
    } catch (n) {
        return void e(n);
    }
    i.done ? t(u) : Promise.resolve(u).then(r, o);
}
function _asyncToGenerator(n) {
    return function() {
        var t = this, e = arguments;
        return new Promise(function(r, o) {
            var a = n.apply(t, e);
            function _next(n) {
                asyncGeneratorStep(a, r, o, _next, _throw, "next", n);
            }
            function _throw(n) {
                asyncGeneratorStep(a, r, o, _next, _throw, "throw", n);
            }
            _next(void 0);
        });
    };
}
module.exports = _asyncToGenerator, module.exports.__esModule = true, module.exports["default"] = module.exports;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__beff3698._.js.map