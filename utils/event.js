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
        vm.reasonInfo.options.push({label:'就绪',value:0})
        if (reasons instanceof Array){
            reasons.map(item => {
                vm.reasonInfo.options.push({label:item.codeName,value:item.code})
            })
        }
        vm.isLogin = true
        vm.loginDialogVisible = false
        vm.$message.success('登录成功!')
        vm.reasonInfo.placeholder = '未就绪'
        vm.reasonInfo.buttonType = 'warning'
    });

    /**
     * 监听就绪事件
     */
    event.on("AgentReadyEvt", function (e) {
        vm.reasonInfo.buttonType = 'success'
    });

    /**
     * 监听离席事件
     */
    event.on("AgentNotReadyEvt", function (e) {
        vm.reasonInfo.buttonType = 'warning';
    });

    /**
     * 监听后处理事件
     */
    event.on("AgentWorkingAfterCallEvt", function (e) {
        vm.reasonInfo.buttonType = 'warning';
        vm.reasonInfo.label = '话后处理';
    });

    /**
     * 监听退出事件
     */
    event.on("AgentLoggedOffEvt", function (e) {
        vm.isLogin = false;
        calcDuration.restart();
        initReasonButton()
        vm.queueInfo = [];
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
        vm.reasonInfo.label = '拨号';
        vm.reasonInfo.duration = '';
    });

    /**
     * 监听振铃事件
     */
    event.on("DeliveredEvt", function (e) {
        if (vm.station.calls.callsList.length === 1) {
            let ringingCall = vm.station.calls.filter({
                state: CallStateType.RINGING
            }).getLast();
            // 呼入
            if (ringingCall && CallStateType.RINGING === ringingCall.state) {
                vm.reasonInfo.callNumber = ringingCall.caller;
                vm.reasonInfo.label = '振铃';
            }
            // 座席呼出
            else {
                vm.reasonInfo.callNumber = e.calledDevice;
                vm.reasonInfo.label = '回铃';
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
        vm.reasonInfo.label = '已接通';
        vm.reasonInfo.duration = '';
    });

    /**
     * 监听挂断事件
     */
    event.on("ConnectionClearedEvt", function (e) {
        if (conferenceTag) {
            conferenceTag = false;
        }
        if (vm.station.calls.callsList.length === 0) {
            vm.reasonInfo.label = '已挂断';
            vm.reasonInfo.duration = '';
        }
    });

    /**
     * 监听 验密事件
     */
    event.on("ValidatePwdEvt", function (e) {
        if (vm.station.validate === 'access') {
            vm.$message.success('验密结果 : 密码正确')
        } else {
            vm.$message.error('验密结果 : 密码正确')
        }
    })

    /**
     * 监听保持事件
     */
    event.on("HeldEvt", function (e) {
        vm.reasonInfo.label = '保持';
        vm.reasonInfo.duration = "";
    });

    /**
     * 监听取回事件
     */
    event.on("RetrievedEvt", function (e) {
        if (conferenceTag) {
            vm.reasonInfo.label = '会议中';
            vm.reasonInfo.duration = "";
        } else {
            vm.reasonInfo.label = '已接通';
            vm.reasonInfo.duration = "";
        }
    });

    /**
     * 监听会议事件
     */
    event.on("ConferencedEvt", function (e) {
        conferenceTag = true;
        vm.reasonInfo.label = '会议中';
        vm.reasonInfo.duration = "";
    });

    /**
     * 监听转移事件
     */
    event.on("TransferedEvt", function (e) {
        if (vm.station.calls.callsList.length === 0) {
            vm.reasonInfo.label = '已转移';
            vm.reasonInfo.duration = ''

            vm.transferDialogVisible = false;
            vm.$message.success('转移成功！')
        } else {
            vm.reasonInfo.label = '已接通';
            vm.reasonInfo.duration = ''
        }
    });

    /**
     * 监听异常响应
     */
    event.on('Error', function (e) {
        let err_str = e.errMsg;
        if (err_str.indexOf(" get agent not exist fail !") > 0) {
            vm.$message.error('用户名不存在,' + err_str)
        } else if (err_str.indexOf(" station not exist !") > 0) {
            vm.$message.error('分机号不存在,' + err_str)
        } else if (err_str.indexOf(" agent password error !") > 0) {
            vm.$message.error('密码错误，请重新输入密码,' + err_str)
        } else if (err_str.indexOf(" not registered !") > 0) {
            vm.$message.error('分机未注册,' + err_str)
        } else if (err_str.indexOf(" already used by ") > 0) {
            vm.$message.error('分机被使用,' + err_str)
        } else if (err_str === "设置座席状态失败") {
            vm.$message.error('当前坐席繁忙，请稍后重试,' + err_str)
        } else {
            vm.$message.error('登录失败，请检查坐席号、密码、分机状态是否正常,' + err_str)
        }
        checkButton(e);
    });
}