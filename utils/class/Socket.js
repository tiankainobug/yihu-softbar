class Socket {
    constructor(session) {
        this.session = session;
        this.ws = null;
        this.forcedClose = false;
        this.queue = {};
    }
    open(url, options) {
        Log.info("socket - open - Connecting to " + url);
        let that = this;
        options = options || support;
        let timeout = options.timeout || settings.timeout;
        return new Promise(function (resolve, reject) {
            that.close();
            let ws;
            let timer = setTimeout(function () {
                that.close();
                reject(new Error(Error.SERVER_CONNECTION_FAILED, {
                    server: url
                }));
            }, timeout);
            // 创建WebSocket
            if ("WebSocket" in window) {
                // IE10/11/edge 浏览器限制了到单个服务器最大并发websocket的数量，
                // 这个数字的缺省值是6，超过数量会报 SecurityError 错误
                ws = new WebSocket(url);
            } else if ("MozWebSocket" in window) {
                // 没有MozWebSocket，暂时隐藏
                // ws = new MozWebSocket(url);
            } else {
                window.clearTimeout(timer);
                timer = 0;
                that.close();
                reject(new Error("not support WebSocket"));
                Log.error("not support WebSocket");
                return;
            }
            // 收到消息时触发
            ws.onmessage = function (e) {
                that.recv(e);
            };
            // 打开时触发
            ws.onopen = function (e) {
                Log.info("WebSocket opened");
                that.forcedClose = false;
                window.clearTimeout(timer);
                timer = 0;
                resolve(e);
            };
            // 关闭时触发
            ws.onclose = function (e) {
                Log.info("WebSocket closed");
                if (!that.forcedClose) {
                    if (timer) {
                        window.clearTimeout(timer);
                        timer = 0;
                        reject(new Error(Error.SERVER_CONNECTION_FAILED, {
                            server: url
                        }));
                    } else {
                        that.session.event.trigger("Disconnected");
                    }
                } else {
                    for (let invokeId in that.queue) {
                        let invoke = that.queue[invokeId];
                        if (invoke.method === "close") {
                            // 清除超时检测定时器
                            that.stopCheckTimedOut(invokeId);
                            invoke.resolve();
                        }
                    }
                }
                that.session.destroy();
            };
            // 错误时触发
            ws.onerror = function (e) {
                Log.warn("WebSocket error");
            };
            that.ws = ws;
        });
    }
    checkTimedOut(invokeId, timeout) {
        let that = this;
        let invoke = that.queue[invokeId];
        invoke.timer = window.setTimeout(function () {
            if (invoke.method === "close") return invoke.resolve();
            Log.warn("timeout - 请求超时 - " + invoke.method);
            // 发送超时消息
            invoke.reject(new Error(Error.INVOKE_TIMEOUT, {
                method: invoke.method
            }));
            // 删除请求队列中的对象
            delete that.queue[invokeId];
        }, timeout);
    }
    stopCheckTimedOut(invokeId) {
        let invoke = this.queue[invokeId];
        if (invoke && invoke.timer) {
            window.clearTimeout(invoke.timer);
            invoke.timer = 0;
        }
        delete this.queue[invokeId];
    }
    send(data, option) {
        let that = this;
        let options = option || support;
        let timeout = options.timeout || settings.timeout;
        let queue = that.queue;
        // 检查WebSocket是否打开
        if (!that.ws || that.ws.readyState !== WebSocket.OPEN) {
            // 发送错误消息
            return Promise.reject(new Error(Error.SOCKET_NOT_OPEN));
        }
        let str = JSON.stringify(data);
        return new Promise(function (resolve, reject) {
            // 除去心跳的超时检测
            if (data.type !== "18") {
                // 向请求队列中添加对象
                queue[data.type] = {
                    method: data.type,
                    // 超时检测定时器
                    timer: null,
                    resolve: resolve,
                    reject: reject
                };
                that.checkTimedOut(data.type, timeout);
                Log.info("request - " + str);
            }
            that.ws.send(str);
        });
    }
    /**
     * 消息处理
     *
     * @param e
     */
    recv(e) {
        let queue = this.queue;
        // 解析为对象
        let data = JSON.parse(e.data);
        let invoke;
        let name = "";
        let that = this;
        let evtName = data.evtName;
        let invokeId = data.type;
        if (evtName) {
            if(data.uui){
                try {
                    data.uui = Util.decode(data.uui);
                } catch (e) {
                    Log.error("parse uui failed.");
                }
            }
            Log.info("event - " + JSON.stringify(data));
            // 发布消息
            this.session.event.trigger(evtName, data);
            if (evtName === "AgentLoggedOnEvt" || evtName === "AgentReadyEvt" ||
                evtName === "AgentNotReadyEvt" || evtName === "AgentLoggedOffEvt" || evtName === "AgentWorkingAfterCallEvt") {
                that.session.event.trigger("AgentStateChangeEvt", data);
            } else if (evtName === "QueueCallChangeEvt") {
                // TODO nothing
            } else {
                this.session.event.trigger("StationStateChangeEvt", data);
            }
        } else {
            let code = data.code;
            if (code === 201) {
                Log.info("success - " + e.data);
                that.session.reasons = data.errMsg;
            } else if (code === 202) {
                Log.info("success - " + e.data);
                that.session.businessCodes = data.errMsg;
            }
            invoke = queue[invokeId];
            if (!invoke) return;
            // 清除超时检测定时器
            this.stopCheckTimedOut(invokeId);
            if (code >= 500) {
                Log.error("error - " + e.data);
                (name = Socket.special["error"]) && this.session.event.trigger(name, data);
                invoke.reject(data);
            } else {
                Log.info("success - " + e.data);
                // 执行回调
                (name = Socket.special[data.method]) && this.session.event.trigger(name, data);
                invoke.resolve(data);
            }
        }
    }
    close() {
        this.forcedClose = true;
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onclose = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            if (this.ws !== WebSocket.CLOSED && this.ws !== WebSocket.CLOSING) {
                this.ws.close("1000", "reason");
            }
        }
    }

}
Socket.special = {
    error: "Error"
};
