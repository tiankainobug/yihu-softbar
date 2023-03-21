const settings = {
    // 连接地址
    connector: "172.20.219.133:8013",
    // connector: "172.20.232.183:8006",
    // 超时时间
    timeout: 6e3,
    // 心跳间隔
    heartbeatInterval: 10e3,
    // 最大重连间隔时间
    maxReconnectInterval: 3e4,
    // 初始重连间隔时间
    reconnectInterval: 1e3,
    // 重连间隔时间衰减
    reconnectDecay: 1.5,
    // 最大重试次数，null为无限重试
    maxReconnectAttempts: null,
    // 默认坐席登录状态
    loginMode: "NotReady",
    // 坐席工作模式 AutoIn ManualIn
    workMode: "ManualIn",
    // Websocket服务地址
    serverAddr: "{protocol}//{hostAndPort}/{path}",
    // 非多会话，刷新可以重连，通话也可以登录
    multipleSession: false,
    virtualAgentIdPrefix: "NormalAgent",
    debug: true
}
