Error.INVOKE_TIMEOUT = {
    code: 400,
    name: "INVOKE_TIMEOUT",
    message: "请求超时 - {method}",
    type: "client"
};
Error.SOCKET_NOT_OPEN = {
    code: 401,
    name: "SOCKET_NOT_OPEN",
    message: "连接未建立",
    type: "client"
};
Error.SERVER_CONNECTION_FAILED = {
    code: 405,
    name: "SERVER_CONNECTION_FAILED",
    message: "服务器连接失败：{server}",
    type: "client"
};
Error.INVALID_STATE_ERR = {
    code: 407,
    name: "INVALID_STATE_ERR",
    message: "状态错误",
    type: "client"
};
Error.NOT_LOGGED_IN = {
    code: 413,
    name: "NOT_LOGGED_IN",
    message: "未登录",
    type: "connector"
};

function Error(error, args){
    let newError = null;
    if (typeof error === "object") {
        if (!args) {
            newError = Object.create(error);
            for (let name in newError) {
                newError[name] = $.format(newError[name], args);
            }
        } else {
            newError = error;
        }
    } else if (typeof error === "string") {
        newError = {
            code: 499,
            name: "Error",
            message: error,
            type: "connector"
        };
    }
    if (typeof window.onerror === "function") window.onerror(newError);
    return newError;
}
