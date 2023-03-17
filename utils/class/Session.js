/**
 * session管理对象
 */
class Session {
    constructor() {
        this.state = SessionStateType.DEAD;
        this.sessionId = "";
        this.event = new Event();
        this.socket = new Socket(this);
        this.forcedClose = false;
        this.station = new Station(this);
        this.startTime = 0;
        this.reconnectAttempts = 0;
        this.heartbeatTimer = 0;
        this.initialized = false;
        this.reasons = [];
        this.businessCodes = [];
        this.connectType = ConnectType.CONNECT;
    }
    init() {
        if (this.initialized) return;
        let that = this;
        that.startTime = Date.now();
        that.initialized = true;
    }
    start(url, options) {
        Log.info("session - start");
        let that = this;
        return Promise.resolve().then(function () {
            // 连接ws
            return that.socket.open(url, options);
        }).then(function (e) {
            that.init();
            that.state = SessionStateType.ALIVE;
            // 开始会话后发送心跳
            that.ping();
        }, function (e) {
            that.socket.close();
            return Promise.reject(e);
        })
    }
    ping() {
        let that = this;
        that.heartbeatTimer = window.setTimeout(function () {
            if (that.state === SessionStateType.ALIVE) {
                that.socket.send({
                    device: that.station.stationId,
                    domain: that.station.domain,
                    type: "18"
                }).then(function (e) {
                    Log.info("session - pong");
                })["catch"](function (e) {
                    Log.error(e.message);
                });
                // 测试用
                console.log("心跳发送时间" + new Date())
                that.ping();
            }
        }, that.heartbeatInterval || settings.heartbeatInterval);
    }
    destroy() {
        Log.info("session - destroy");
        let that = this;
        window.clearTimeout(that.heartbeatTimer);
        that.endTime = Date.now();
        if (that.initialized) {
            that.state = SessionStateType.DEAD;
            that.initialized = false;
        }
    }
}
