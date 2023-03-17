const log = function (text, logType) {
    let outputText = null;
    if (settings.debug) {
        outputText = typeof text == "object" ? JSON.stringify(text) : text;
    }
    if (!outputText) return;
    switch (logType) {
        case LogType.LOG:
            console.log(outputText);
            break;
        case LogType.INFO:
            console.info(outputText);
            break;
        case LogType.WARN:
            console.warn(outputText);
            break;
        case LogType.ERROR:
            console.error(outputText);
            break;
        default:
            break;
    }
}
/**
 * 日志记录器
 */
const Log = {
    debug: function (text) {
        log(text, LogType.LOG)
    },
    info: function (text) {
        log(text, LogType.INFO)
    },
    warn: function (text) {
        log(text, LogType.WARN)
    },
    error: function (text) {
        log(text, LogType.ERROR)
    }
}

