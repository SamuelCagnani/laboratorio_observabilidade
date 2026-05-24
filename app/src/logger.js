/**
 * Utility for structured logging following SRE best practices.
 * Formats logs for Loki/Grafana ingestion.
 */

const log = (level, event, req, res, extras = {}) => {
    const logData = {
        timestamp: new Date().toISOString(),
        level,
        event,
        method: req.method,
        route: req.originalUrl || req.url,
        status: res.statusCode,
        request_id: req.request_id || 'internal',
        response_time_ms: extras.duration || 0,
        message: extras.message || '',
        ...extras.context // Additional metadata
    };

    const logString = JSON.stringify(logData);
    
    if (level === 'ERROR') {
        console.error(logString);
    } else if (level === 'WARN') {
        console.warn(logString);
    } else {
        console.log(logString);
    }
};

module.exports = {
    info: (event, req, res, extras) => log('INFO', event, req, res, extras),
    warn: (event, req, res, extras) => log('WARN', event, req, res, extras),
    error: (event, req, res, extras) => log('ERROR', event, req, res, extras)
};
