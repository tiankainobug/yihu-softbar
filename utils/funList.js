const format = function (template, args) {
    if (arguments.length > 1 && typeof arguments[0] === "string") {
        let result = arguments[0];
        let reg;
        if (arguments.length === 2 && typeof arguments[1] === "object") {
            let obj = arguments[1];
            for (let key in obj) {
                if (!obj[key]) {
                    reg = new RegExp("({" + key + "})", "g");
                    result = result.replace(reg, obj[key]);
                }
            }
        } else {
            for (let i = 1, len = arguments.length; i < len; i++) {
                if (!arguments[i]) {
                    // 这个在索引大于9时会有问题
                    // let reg = new RegExp("({[" + (i - 1) + "]})", "g");
                    reg = new RegExp("({)" + (i - 1) + "(})", "g");
                    result = result.replace(reg, arguments[i]);
                }
            }
        }
        return result;
    } else {
        return arguments[0];
    }
};
const dateDiff = function (startTime, EndTime) {
    if (!EndTime) {
        EndTime = Date.now();
    }
    let res = {
        D: 0,
        H: 0,
        M: 0,
        S: 0,
        MS: 0
    };
    let restTime = EndTime - startTime;
    res.D = Math.floor(restTime / 864e5);
    restTime = restTime - res.D * 864e5;
    res.H = Math.floor(restTime / 36e5);
    restTime = restTime - res.H * 36e5;
    res.M = Math.floor(restTime / 6e4);
    restTime = restTime - res.M * 6e4;
    res.S = Math.floor(restTime / 1e3);
    restTime = restTime - res.S * 1e3;
    res.MS = restTime;
    return res;
}
// 计算状态时长
const calcDuration = function () {
    let calcTimer = 0;
    let lastTime = 0;

    function fn() {
        let diff = dateDiff(lastTime);
        let duration = (diff.D && (diff.D + '&nbsp;')) || '';
        duration += (diff.H && (diff.H < 10 ? ('0' + diff.H) : diff.H) + ':') || '';
        duration += ((diff.M < 10 ? ('0' + diff.M) : diff.M) + ':');
        duration += ((diff.S < 10 ? ('0' + diff.S) : diff.S));
        vm.reasonInfo.duration = duration;
    }
    return {
        start: function () {
            lastTime = Date.now();
            fn();
            calcTimer = window.setInterval(fn, 1000);
        },
        stop: function () {
            window.clearInterval(calcTimer);
            calcTimer = 0;
            lastTime = 0;
            vm.reasonInfo.duration = '--:--';
        },
        restart: function () {
            this.stop();
            this.start();
        }
    };
}();
const initButtonState = function () {
    vm.buttonInfo.login_btn = true;
    vm.buttonInfo.answer_btn = false;
    vm.buttonInfo.makeCall_btn = false;
    vm.buttonInfo.logout_btn = false;
    vm.buttonInfo.hangup_btn = false;
    vm.buttonInfo.hold_btn = false;
    vm.buttonInfo.retrieve_btn = false;
    vm.buttonInfo.ssc_btn = false;
    vm.buttonInfo.consult_btn = false;
    vm.buttonInfo.conference_btn = false;
    vm.buttonInfo.sendDTMF_btn = false;
    vm.buttonInfo.transfer_btn = false;
    vm.buttonInfo.alternate_btn = false;
    vm.buttonInfo.sst_btn = false;
    vm.buttonInfo.satisfaction_btn = false;
    vm.buttonInfo.reconnect_btn = false;
    vm.buttonInfo.validatePwd_btn = false;
}
const checkButton = function(e) {
    if (!e) {
        initButtonState();
        return;
    }
    let that = vm.station;
    let activeCall = that.calls.get(that.calls.activeCall);
    let heldCall = that.calls.filter({
        isHeld: true
    }).getLast();
    let ringingCall = that.calls.filter({
        state: CallStateType.RINGING
    }).getLast();
    // 可否登录
    if (that.agent.state !== "Logout") {
        vm.buttonInfo.login_btn = false;
    } else {
        initButtonState();
        return;
    }
    // 可否发送DTMF
    vm.buttonInfo.sendDTMF_btn = vm.isLogin;
    // 可否外拨
    vm.buttonInfo.makeCall_btn = !(that.calls.callsList.length >= 1)
    // 可否接听
    vm.buttonInfo.answer_btn = Boolean(ringingCall)
    // 可否挂断
    vm.buttonInfo.hangup_btn = that.calls.callsList.length && that.calls.filter({
        state: CallStateType.RINGING
    }).callsList.length !== that.calls.callsList.length
    // 可否保持
    vm.buttonInfo.hold_btn = that.calls.callsList.length && that.calls.filter({
        state: CallStateType.ESTABLISHED,
        isHeld: false
    }).callsList.length !== 0 && that.calls.callsList.length === 1
    // 可否恢复
    vm.buttonInfo.retrieve_btn = that.calls.callsList.length && that.calls.filter({
        isHeld: true
    }).callsList.length === that.calls.callsList.length
    // 可否磋商
    vm.buttonInfo.consult_btn = that.calls.callsList.length === 1 && activeCall && activeCall?.state === CallStateType.CONNECTED && !conferenceTag
    // 可否单转
    if (!activeCall || activeCall?.state !== CallStateType.CONNECTED || that.calls.callsList.length >= 2 || conferenceTag) {
        vm.buttonInfo.sst_btn = false;
        vm.buttonInfo.satisfaction_btn = false;
    } else {
        vm.buttonInfo.sst_btn = true;
        vm.buttonInfo.satisfaction_btn = true;
    }
    if (!activeCall || !heldCall) {
        vm.buttonInfo.conference_btn = false;
        vm.buttonInfo.transfer_btn = false;
        vm.buttonInfo.alternate_btn = false;
        vm.buttonInfo.reconnect_btn = false;
    } else {
        if (activeCall?.state === CallStateType.CONNECTED && heldCall.state === CallStateType.CONNECTED) {
            if (that.calls.consultationType === 'transfer') {
                vm.buttonInfo.alternate_btn = true;
            } else if (that.calls.consultationType === 'conference') {
                vm.buttonInfo.conference_btn = true;
            } else {
                vm.buttonInfo.transfer_btn = true;
                vm.buttonInfo.conference_btn = true;
            }
            vm.buttonInfo.alternate_btn = true;
            vm.buttonInfo.reconnect_btn = true;
        }
    }
    // 可否验密
    vm.buttonInfo.validatePwd_btn = activeCall && activeCall?.state === CallStateType.CONNECTED && that.calls.callsList.length !== 2 && !conferenceTag
}
// 初始化状态选择下拉框
const initReasonButton = () => {
    vm.reasonInfo.options = [];
    vm.reasonInfo.label = '';
    vm.reasonInfo.placeholder = '未登录';
    vm.reasonInfo.buttonType = 'primary';
}
const consult = dest => {
    vm.station.consultation(dest, {
        type: 'consultation'
    }).then(e => {
        console.info('磋商');
    }).catch(e => {
        this.$message.error(e.message)
    });
}
const singleStepTransfer = dest => {
    vm.station.singleStepTransfer(dest).then(e => {
        console.info('单转');
    }).catch(e => {
        this.$message.error(e.message)
    });
}
const singleStepConference = dest => {
    vm.station.singleStepConference(dest).then(e => {
        console.info('单步会议');
    }).catch(e => {
        this.$message.error(e.message)
    });
}
