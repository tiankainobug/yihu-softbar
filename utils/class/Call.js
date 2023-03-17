class Call {
    constructor() {
        this.callId = "";
        this.state = CallStateType.DEAD;
        this.createTime = 0;
        this.answerTime = 0;
        this.caller = "";
        this.callee = "";
        this.callType = "";
        this.alertingDevice = "";
        this.direction = "";
        this.isHeld = false;
        this.queue = "";
    }
}
