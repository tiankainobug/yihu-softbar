/**
 * 会话状态类型
 */
const SessionStateType = {
    DEAD: 0,
    ALIVE: 1,
    CONNECTING: 2,
    CLOSING: 3
}
/**
 * 连接类型
 */
const ConnectType = {
    CONNECT: 1,
    RECONNECT: 2
}

const CallStateType = {
    DEAD: 0,
    OFF_HOOK: 1,
    DIALING: 2,
    RINGING: 3,
    CONNECTED: 4,
    ESTABLISHED: 4,
    FAILED: 9
}

const LogType = {
    LOG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4
};

const arr = [];
const support = {};

/**
 * 座席状态类型
 */
const AgentStateType = {
    PENDING: "",
    LOGIN: "Login",
    LOGOUT: "Logout",
    NOT_READY: "NotReady",
    READY: "Ready",
    WORK_NOT_READY: "WorkNotReady",
    WORK_READY: "WorkReady"
}

// 会议标识
let conferenceTag = false;
// 操作标识
let op_type;
