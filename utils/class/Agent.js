/**
 * 座席对象
 */
class Agent {
    constructor() {
        this.agentId = "";
        this.loginName = "";
        this.state = AgentStateType.LOGOUT;
        this.lastState = AgentStateType.LOGOUT;
        this.lastTime = 0;
        this.loginTime = 0;
        this.workMode = "";
        this.reason = "";
        this.queues = [];
        this.password = "";
    }
}
