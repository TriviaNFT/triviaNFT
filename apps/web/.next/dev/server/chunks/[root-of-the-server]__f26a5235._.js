module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/apps/web/app/api/health/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$babel$2b$runtime$40$7$2e$28$2e$4$2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$asyncToGenerator$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@babel+runtime@7.28.4/node_modules/@babel/runtime/helpers/asyncToGenerator.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$3_$40$babel$2b$core$40$7$2e$28$2e$5_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_$40$playwright$2b$test$40$1$2e$56$2e$1_react$2d$dom$40$18$2e$_ylk6lgjvtlqk7gpqtfjwcid7sm$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.3_@babel+core@7.28.5_@opentelemetry+api@1.9.0_@playwright+test@1.56.1_react-dom@18._ylk6lgjvtlqk7gpqtfjwcid7sm/node_modules/next/server.js [app-route] (ecmascript)");
;
;
var REQUIRED_ENV_VARS = [
    'DATABASE_URL',
    'REDIS_URL',
    'REDIS_TOKEN',
    'INNGEST_EVENT_KEY',
    'INNGEST_SIGNING_KEY',
    'BLOCKFROST_PROJECT_ID',
    'NFT_POLICY_ID',
    'JWT_SECRET',
    'JWT_ISSUER'
];
function GET() {
    return _GET.apply(this, arguments);
}
function _GET() {
    _GET = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$babel$2b$runtime$40$7$2e$28$2e$4$2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$asyncToGenerator$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(function*() {
        try {
            var configured = [];
            var missing = [];
            REQUIRED_ENV_VARS.forEach(function(varName) {
                if (process.env[varName]) {
                    configured.push(varName);
                } else {
                    missing.push(varName);
                }
            });
            var databaseHealthy = false;
            try {
                var _yield$import = yield __turbopack_context__.A("[project]/services/api/src/db/connection.ts [app-route] (ecmascript, async loader)"), healthCheck = _yield$import.healthCheck;
                databaseHealthy = yield healthCheck();
            } catch (error) {
                console.error('Database health check failed:', error);
            }
            var redisHealthy = false;
            try {
                redisHealthy = !!(process.env.REDIS_URL && process.env.REDIS_TOKEN);
            } catch (error) {
                console.error('Redis health check failed:', error);
            }
            var inngestHealthy = !!(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY);
            var allEnvVarsPresent = missing.length === 0;
            var allServicesHealthy = databaseHealthy && redisHealthy && inngestHealthy;
            var status;
            if (allEnvVarsPresent && allServicesHealthy) {
                status = 'healthy';
            } else if (allEnvVarsPresent || databaseHealthy && redisHealthy) {
                status = 'degraded';
            } else {
                status = 'unhealthy';
            }
            var healthStatus = {
                status: status,
                timestamp: new Date().toISOString(),
                environment: process.env.VERCEL_ENV || ("TURBOPACK compile-time value", "development") || 'unknown',
                checks: {
                    database: databaseHealthy,
                    redis: redisHealthy,
                    inngest: inngestHealthy,
                    envVars: {
                        configured: configured,
                        missing: missing
                    }
                }
            };
            var statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$3_$40$babel$2b$core$40$7$2e$28$2e$5_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_$40$playwright$2b$test$40$1$2e$56$2e$1_react$2d$dom$40$18$2e$_ylk6lgjvtlqk7gpqtfjwcid7sm$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(healthStatus, {
                status: statusCode
            });
        } catch (error) {
            console.error('Health check error:', error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$3_$40$babel$2b$core$40$7$2e$28$2e$5_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_$40$playwright$2b$test$40$1$2e$56$2e$1_react$2d$dom$40$18$2e$_ylk6lgjvtlqk7gpqtfjwcid7sm$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            }, {
                status: 503
            });
        }
    });
    return _GET.apply(this, arguments);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__f26a5235._.js.map