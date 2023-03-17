// 会议标识
let conferenceTag = false;

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

const eventInit = function (event) {
    /**
     * 监听座席状态改变事件
     */
    event.on("AgentStateChangeEvt", function (e) {
        calcDuration.restart();
        checkButton(e);
    });

    /**
     * 监听呼叫状态改变事件
     */
    event.on("StationStateChangeEvt", function (e) {
        calcDuration.restart();
        checkButton(e);
    });

    /**
     * 监听登录事件
     */
    event.on("AgentLoggedOnEvt", function (e) {
        const reasons = JSON.parse(vm.session.reasons);
        vm.reasonInfo.options.push({label:'准备',value:0})
        if (reasons instanceof Array){
            reasons.map(item => {
                vm.reasonInfo.options.push({label:item.codename,value:item.code})
            })
        }
        vm.loginDialogVisible = false
        vm.$message.success('登录成功!')
        vm.reasonInfo.placeholder = '未就绪'
        vm.reasonInfo.buttonType = 'warning'
    });

    /**
     * 监听就绪事件
     */
    event.on("AgentReadyEvt", function (e) {
        $('#readybtn').addClass("invisable");
        $('#agent-state-btn').addClass("btn-success");
        $('#agent-state-btn').removeClass("btn-warning");
        $('#agentstate').html("就绪");
        $('#callnum').val('');
    });

    /**
     * 监听离席事件
     */
    event.on("AgentNotReadyEvt", function (e) {
        $('#readybtn').removeClass("invisable");
        $('#agent-state-btn').removeClass("btn-success");
        $('#agent-state-btn').addClass("btn-warning");
        $('#agentstate').html(lastReasonCodeName);
    });

    /**
     * 监听后处理事件
     */
    event.on("AgentWorkingAfterCallEvt", function (e) {
        $('#readybtn').removeClass("invisable");
        $('#agent-state-btn').removeClass("btn-success");
        $('#agent-state-btn').addClass("btn-warning");
        $('#agentstate').html("话后处理");
    });

    /**
     * 监听退出事件
     */
    event.on("AgentLoggedOffEvt", function (e) {
        calcDuration.restart();
        $('#agentstate').html("未登录");
        $('#stationnum').html("");
        $('#agentnum').html("未登录");
        $("#domainS").html("");
        $("#sname").html("");
        resetReadyBtn();
    });

    /**
     * 监听排队事件
     */
    event.on("QueueCallChangeEvt", function (e) {
        vm.station.queueMap.forEach((key,value) => {
            vm.queueInfo.push({queueNum:value,level:key})
        });
    });

    /**
     * 监听拨号事件
     */
    event.on("OriginatedEvt", function (e) {
        $('#agentstate').html("拨号");
        $('#incalltime').html("");
    });

    /**
     * 监听振铃事件
     */
    event.on("DeliveredEvt", function (e) {
        if (station.calls.length === 1) {
            let ringingCall = station.calls.filter({
                state: CallStateType.RINGING
            }).getLast();
            // 呼入
            if (ringingCall && CallStateType.RINGING === ringingCall.state) {
                $("#customernum").html(ringingCall.caller);
                $('#agentstate').html("振铃");
                MessageBox('客户号码: ' + ringingCall.caller);
            } else {
                // 座席呼出
                $('#customernum').html(e.calledDevice);
                $('#agentstate').html("回铃");
            }
        }
    });

    /**
     * 监听接通事件
     */
    event.on("EstablishedEvt", function (e) {
        if (conferenceTag) {
            conferenceTag = false;
        }
        $('#agentstate').html("已接通");
        $('#incalltime').html("");
    });

    /**
     * 监听挂断事件
     */
    event.on("ConnectionClearedEvt", function (e) {
        if (conferenceTag) {
            conferenceTag = false;
        }
        if (station.calls.length === 0) {
            $('#agentstate').html("已挂断");
            $('#incalltime').html("");
        }
    });

    /**
     * 监听 验密事件
     */
    event.on("ValidatePwdEvt", function (e) {
        console.log(station.calls)
        if (station.validate === 'access') {
            MessageBox('验密结果 : 密码正确');
        } else {
            MessageBox('验密结果 : 密码错误');
        }

    })

    /**
     * 监听保持事件
     */
    event.on("HeldEvt", function (e) {
        $('#agentstate').html("保持");
        $('#incalltime').html("");
    });

    /**
     * 监听取回事件
     */
    event.on("RetrievedEvt", function (e) {
        if (conferenceTag) {
            $('#agentstate').html("会议中");
            $('#incalltime').html("");
        } else {
            $('#agentstate').html("已接通");
            $('#incalltime').html("");
        }
    });

    /**
     * 监听会议事件
     */
    event.on("ConferencedEvt", function (e) {
        conferenceTag = true;
        $('#agentstate').html("会议中");
        $('#incalltime').html("");
    });

    /**
     * 监听转移事件
     */
    event.on("TransferedEvt", function (e) {
        if (station.calls.length === 0) {
            $('#agentstate').html("已转移");
            $('#incalltime').html("");
        } else {
            $('#agentstate').html("已接通");
            $('#incalltime').html("");
        }
    });

    /**
     * 监听异常响应
     */
    event.on('Error', function (e) {
        let err_str = e.errMsg;
        if (err_str.indexOf(" get agent not exist fail !") > 0) {
            MessageBox('用户名不存在，' + err_str);
        } else if (err_str.indexOf(" station not exist !") > 0) {
            MessageBox('分机号不存在，' + err_str);
        } else if (err_str.indexOf(" agent password error !") > 0) {
            MessageBox('密码错误，请重新输入密码，' + err_str);
        } else if (err_str.indexOf(" not registered !") > 0) {
            MessageBox('分机未注册，' + err_str);
        } else if (err_str.indexOf(" already used by ") > 0) {
            MessageBox('分机被使用，' + err_str);
        } else if (err_str == "设置座席状态失败") {
            MessageBox('当前坐席繁忙，请稍后重试，');
        } else {
            MessageBox('登录失败，请检查坐席号、密码、分机状态是否正常，' + err_str);
        }
        checkButton(e);
    });
}
