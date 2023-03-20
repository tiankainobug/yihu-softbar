/**
 * 接口对象
 */
class Station {
    constructor(session) {
        this.session = session;
        this.stationId = "";
        this.srcDevice = "";
        this.domain = "";
        this.loginMode = "";
        this.calls = new Calls();
        this.agent = new Agent();
        this.queueMap = new Map();
        this.initialized = false;
        this.acdId = "101";
        this.validate = "";
    }

    init() {
        if (this.initialized) return;
        let that = this;
        let agent = that.agent;
        let event = this.session.event;
        let stationOid = "station0";
        // 订阅消息
        event.on(stationOid + ".AgentLoggedOnEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            agent.lastState = agent.state;
            agent.state = AgentStateType.LOGIN;
            agent.lastTime = agent.loginTime = e.timestamp || Date.now();
        }, 0);
        // 坐席退出消息
        event.on(stationOid + ".AgentLoggedOffEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            agent.lastState = agent.state;
            agent.state = AgentStateType.LOGOUT;
            agent.lastTime = agent.logoutTime = e.timestamp || Date.now();
            that.session.socket.ws.close();
        }, 0);
        // 坐席就绪消息
        event.on(stationOid + ".AgentReadyEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            agent.lastState = agent.state;
            agent.state = AgentStateType.READY;
            agent.lastTime = e.timestamp || Date.now();
        }, 0);
        // 坐席后处理消息
        event.on(stationOid + ".AgentWorkingAfterCallEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            agent.lastState = agent.state;
            agent.state = AgentStateType.WORK_NOT_READY;
            agent.lastTime = e.timestamp || Date.now();
        }, 0);
        // 坐席未就绪消息
        event.on(stationOid + ".AgentNotReadyEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            agent.lastState = agent.state;
            agent.state = AgentStateType.NOT_READY;
            agent.lastTime = e.timestamp || Date.now();
        }, 0);
        // 订阅消息
        // 摘机事件
        event.on(stationOid + ".ServiceInitiatedEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            // 摘机时一定不是激活的，不可以保持的
            that.calls.activeCall = "";
            that.calls.add({
                callId: e.callId,
                createTime: e.timestamp || Date.now(),
                state: CallStateType.DIALING,
                direction: "Out",
                isHeld: false
            });
            Log.info("摘机");
            Log.info("activeCall - " + that.calls.activeCall);
            Log.info("calls - " + JSON.stringify(that.calls));
        }, 0);
        // 外拨事件
        event.on(stationOid + ".OriginatedEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            // 外拨时一定是激活的，外拨状态可以保持
            that.calls.activeCall = e.callId;
            that.calls.add({
                callId: e.callId,
                state: CallStateType.DIALING,
                direction: "Out",
                createTime: e.timestamp || Date.now(),
                isHeld: false,
                callType: "Outbound"
            });
            // uui decode
            // e.uui = Util.decode(e.uui);
            Log.info("外拨");
            Log.info("activeCall - " + that.calls.activeCall);
            Log.info("calls - " + JSON.stringify(that.calls));
        }, 0);
        // 振铃事件
        event.on(stationOid + ".DeliveredEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            // 来电时一定不是激活的，振铃状态不可以保持
            if (e.alertingDevice === that.stationId) {
                that.calls.add({
                    callId: e.callId,
                    createTime: e.timestamp || Date.now(),
                    caller: e.callingDevice,
                    callee: e.calledDevice,
                    state: CallStateType.RINGING,
                    direction: "In",
                    isHeld: false,
                    queue: e.skill || "",
                    alertingDevice: e.alertingDevice,
                    callType: e.skill ? "Inbound" : "Internal"
                });
                Log.info("RINGING - 振铃");
            } else {
                // 外拨
                that.calls.add({
                    callId: e.callId,
                    state: CallStateType.DIALING,
                    direction: "Out",
                    caller: e.callingDevice,
                    callee: e.calledDevice,
                    alertingDevice: e.alertingDevice
                });
                if (that.calls.consultationTo === e.alertingDevice) {
                    that.calls.consultationTo = e.callId;
                } else if (that.calls.callsList.length === 2 && that.calls.consultationFrom) {
                    that.calls.consultationTo = e.callId;
                }
                Log.info("Delivered - 到达");
            }
            // uui decode
            // e.uui = Util.decode(e.uui);
            Log.info("activeCall - " + that.calls.activeCall);
            Log.info("calls - " + JSON.stringify(that.calls));
        }, 0);
        // 接通事件
        event.on(stationOid + ".EstablishedEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            let lastStateCall = that.calls.get(e.callId);
            // 之前存在，并且不是保持的
            if (!lastStateCall || !lastStateCall.isHeld) {
                that.calls.activeCall = e.callId;
            }
            that.calls.add({
                callId: e.callId,
                state: CallStateType.CONNECTED,
                answerTime: e.timestamp || Date.now()
            });
            // uui decode
            // e.uui = Util.decode(e.uui);

            Log.info("Established - 接通");
            Log.info("activeCall - " + that.calls.activeCall);
            Log.info("calls - " + JSON.stringify(that.calls));
        }, 0);
        // 挂断事件
        event.on(stationOid + ".ConnectionClearedEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            // 自己挂断
            if (that.stationId === e.releasingDevice) {
                // 清除磋商标记
                if (e.callId === that.calls.consultationFrom || e.callId === that.calls.consultationTo) {
                    that.calls.clearConsultation();
                }
                that.calls.remove(e.callId);
                if (e.callId === that.calls.activeCall) {
                    that.calls.activeCall = "";
                }
                let activeCall = that.calls.filter({
                    isHeld: false
                }).getLast();
                if (activeCall && !that.calls.get(that.calls.activeCall)) {
                    that.calls.activeCall = activeCall.callId;
                }
                event.trigger("CallEnd", {});
            } else if ("Fail" === e.connectionState) {
                // to do nothing
            }
            Log.info("ConnectionCleared - 挂断");
            Log.info("activeCall - " + that.calls.activeCall);
            Log.info("calls - " + JSON.stringify(that.calls));
        }, 0);
        // 保持事件
        event.on(stationOid + ".HeldEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            // 已激活的callId并且是保持方
            if (e.holdingDevice === that.stationId) {
                that.calls.add({
                    callId: e.callId,
                    isHeld: true
                });
            }
            if (e.callId === that.calls.activeCall) {
                that.calls.activeCall = "";
            }
            Log.info("Held - 保持");
            Log.info("activeCall - " + that.calls.activeCall);
            Log.info("calls - " + JSON.stringify(that.calls));
        }, 0);
        // 恢复事件
        event.on(stationOid + ".RetrievedEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            // 已保持的callId并且是恢复方
            if (e.retrievingDevice === that.stationId) {
                that.calls.replace(e.callId, {
                    callId: e.callId,
                    isHeld: false
                });
                if (that.calls.callsList.length) {
                    that.calls.activeCall = e.callId;
                }
                Log.info("Retrieved - 恢复");
                Log.info("activeCall - " + that.calls.activeCall);
                Log.info("calls - " + JSON.stringify(that.calls));
            }
        }, 0);
        // 会议事件
        event.on(stationOid + ".ConferencedEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            /**
             * FS中，会议事件在挂断事件之后
             *
             * {"srcDevice":"1001:laihu.com","device":"1001","domain":"laihu.com","timestamp":"2020-11-13 17:30:11.241",
             * "evtName":"ConferencedEvt","agentId":null,"crossRef":null,"primaryOldCall":null,"secondaryOldCall":null,
             * "conferencingDevice":"1001","addedParty":null,"newCall":"39ef9458-bc6f-474e-97db-0b92f411c5d8","connectionState":"connected"}
             */
            let clearCall = that.calls.consultationTo === e.newCall ? that.calls.consultationFrom : that.calls.consultationTo;
            that.calls.clearConsultation();
            that.calls.remove(clearCall);
            that.calls.replace(that.calls.getLast().callId, {
                callId: e.newCall,
                isHeld: false,
                state: CallStateType.CONNECTED
            });
            that.calls.activeCall = e.newCall;
            Log.info("Conferenced - 会议");
            Log.info("activeCall - " + that.calls.activeCall);
            Log.info("calls - " + JSON.stringify(that.calls));
        }, 0);
        // 转移事件
        event.on(stationOid + ".TransferedEvt", function (e) {
            if (e.srcDevice !== that.srcDevice) return;
            if (e.primaryOldCall === that.calls.consultationFrom || e.secondaryOldCall === that.calls.consultationFrom
                || e.primaryOldCall === that.calls.consultationTo || e.secondaryOldCall === that.calls.consultationTo) {
                that.calls.clearConsultation();
            }
            // 自己是转移方
            if (e.transferringDevice === that.stationId && e.transferringDevice !== e.transferredToDevice) {
                that.calls.activeCall = "";
                that.calls.remove(e.primaryOldCall);
                that.calls.remove(e.secondaryOldCall);
            } else {
                let existCall;
                if (that.calls.get(e.primaryOldCall)) {
                    existCall = e.primaryOldCall;
                } else {
                    existCall = e.secondaryOldCall;
                }
                // 更新旧的callId，旧的电话为激活则更新激活的电话
                that.calls.replace(existCall, {
                    callId: e.newCall,
                });
                if (that.calls.activeCall) {
                    that.calls.activeCall = e.newCall;
                }
            }
            Log.info("Transferred - 转移");
            Log.info("activeCall - " + that.calls.activeCall);
            Log.info("calls - " + JSON.stringify(that.calls));
        }, 0);
        // 排队事件
        event.on(stationOid + ".QueueCallChangeEvt", function (e) {
            that.queueMap.set(e.skill, e.count);
            if (!that.agent.queues[e.skill]) {
                that.agent.queues.push(e.skill);
            }
        }, 0);
        event.on(stationOid + ".ValidatePwdEvt", function (e) {
            that.validate = e.validatePwd;
            Log.info("validate password result :" + e.validatePwd)
        }, 0);
        that.initialized = true;
    }
    signIn(domain, stationId, agentId, password, workMode) {
        workMode = workMode || settings.workMode;
        Log.info("station - signIn - domain:" + domain + ", stationId:" + stationId + ", agentId:" + agentId + ", password:" + password + ", workMode:" + workMode);
        let that = this;
        if (!that.initialized) {
            that.init();
        }
        return Promise.resolve().then(function () {
            return that.session.socket.send({
                stationId: stationId,
                agentId: agentId,
                agentPwd: password,
                acdId: that.acdId,
                domain: domain,
                agentState: AgentStateType.LOGIN,
                reasonCode: 0,
                workMode: workMode,
                type: "1"
            })
        }).then(function (e) {
            Log.info("Login success.")
            that.agent.agentId = agentId;
            that.agent.password = password;
            that.agent.workMode = workMode;
            that.stationId = stationId;
            that.srcDevice = stationId + ":" + domain;
            that.domain = domain;
        }, function (e) {
            Log.warn("Login failure, reason - " + e.message);
            return Promise.reject(e);
        });
    }
    signOut() {
        let that = this;
        let lastState = that.state;
        let stationId = that.stationId;
        let agentId = that.agent.agentId;
        Log.info("station - signOut, stationId:" + stationId + ", agentId:" + agentId);
        if (that.agent.state === AgentStateType.LOGOUT) {
            return Promise.reject(new Error(Error.NOT_LOGGED_IN));
        } else {
            return Promise.resolve().then(function () {
                return that.session.socket.send({
                    stationId: stationId,
                    agentId: agentId,
                    acdId: that.acdId,
                    domain: that.domain,
                    agentState: AgentStateType.LOGOUT,
                    reasonCode: 0,
                    workMode: that.agent.workMode || settings.workMode,
                    type: "16"
                })
            }).then(function () {
                that.queueMap.clear();
            }, function (e) {
                that.state = lastState;
                return Promise.reject(e);
            })
        }
    }
    setState(domain, stationId, agentId, reasonCode, agentState, acdId, workMode) {
        Log.info("station - setState, stationId:" + stationId + ", agentId:" + agentId);
        let that = this;
        return that.session.socket.send({
            stationId: stationId,
            agentId: agentId,
            acdId: acdId,
            domain: domain,
            agentState: agentState,
            reasonCode: reasonCode,
            workMode: workMode,
            type: "17"
        });
    }
    setMode(agentState, reasonCode) {
        let that = this;
        reasonCode = reasonCode || 0;
        if (that.agent.mode === AgentStateType.LOGOUT) {
            return Promise.reject(new Error(Error.NOT_LOGGED_IN));
        } else {
            return that.setState(that.domain, that.stationId, that.agent.agentId, reasonCode, agentState, that.acdId, that.agent.workMode);
        }
    }
    makeCall(dest, options) {
        Log.info("station - makeCall");
        let that = this;
        // 有电话并且不是摘机状态返回
        if (that.calls.callsList.length > 2 || that.calls.callsList.length === 1) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        options = options || support;
        // 外拨
        return that.session.socket.send({
            agentId: that.agent.agentId,
            stationId: that.stationId,
            caller: that.stationId,
            callee: dest,
            domain: that.domain,
            uui: Util.encode(options.uui),
            businessCode: options.businessCode || "",
            type: "2"
        });
    }
    answer() {
        Log.info("station - answer");
        let that = this;
        // 振铃列表为空则返回
        let ringingCall = that.calls.filter({
            state: CallStateType.RINGING
        }).getLast();
        if (!ringingCall) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        // 保存CallId，防止改变
        let ringingCallId = ringingCall.callId;
        // 已有激活的电话
        if (that.calls.activeCall) {
            // 先保持
            return that.hold().then(function (e) {
                that.session.socket.send({
                    uuid: ringingCallId,
                    device: that.stationId,
                    domain: that.domain,
                    type: "6"
                });
            });
        } else {
            return that.session.socket.send({
                uuid: ringingCallId,
                device: that.stationId,
                domain: that.domain,
                type: "6"
            });
        }
    }
    hangup() {
        Log.info("station - hangup");
        let that = this;
        let heldCall = that.calls.filter({
            isHeld: true
        }).getLast();
        let initiatedCall = that.calls.filter({
            state: CallStateType.OFF_HOOK
        }).getLast();
        // 电话全是振铃状态则返回
        if (!that.calls.callsList.length || that.calls.filter({
            state: CallStateType.RINGING
        }).callsList.length === that.calls.callsList.length) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        // 有激活的或摘机的先挂
        let activeCall = that.calls.get(that.calls.activeCall);
        if (activeCall || initiatedCall) {
            // 发送消息
            return that.session.socket.send({
                uuid: activeCall && activeCall.callId || initiatedCall && initiatedCall.callId,
                device: that.stationId,
                domain: that.domain,
                type: "5"
            });
        } else if (heldCall) {
            // 保存CallId，防止改变
            let callId = heldCall.callId;
            // 先恢复
            return that.retrieve().then(function () {
                // 发送消息
                return that.session.socket.send({
                    uuid: callId,
                    device: that.stationId,
                    domain: that.domain,
                    type: "5"
                });
            });
        }
    }
    hold() {
        Log.info("station - hold");
        let that = this;
        // 没有已激活的电话
        let activeCall = that.calls.get(that.calls.activeCall);
        if (!activeCall) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        // 发送消息
        return that.session.socket.send({
            uuid: activeCall.callId,
            device: that.stationId,
            domain: that.domain,
            type: "3"
        });
    }
    retrieve() {
        Log.info("station - retrieve");
        let that = this;
        // 有激活的电话重连
        // 有保持的电话恢复
        // 无保持的则返回
        let heldCall = that.calls.filter({
            isHeld: true
        }).getLast(), initiatedCall = that.calls.filter({
            state: CallStateType.OFF_HOOK
        }).getLast();
        if (!heldCall) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        if (that.calls.activeCall) {
            return that.reconnect();
        } else {
            if (initiatedCall) {
                return that.session.socket.send({
                    uuid: initiatedCall.callId,
                    device: that.stationId,
                    domain: that.domain,
                    type: "5"
                }).then(function () {
                    // 发送消息
                    return that.session.socket.send({
                        uuid: heldCall.callId,
                        device: that.stationId,
                        domain: that.domain,
                        type: "4"
                    });
                });
            } else {
                // 发送消息
                return that.session.socket.send({
                    uuid: heldCall.callId,
                    device: that.stationId,
                    domain: that.domain,
                    type: "4"
                });
            }
        }
    }
    reconnect() {
        Log.info("station - reconnect");
        let that = this;
        let activeCall = that.calls.get(that.calls.activeCall);
        let heldCall = that.calls.filter({
            isHeld: true
        }).getLast();
        // 发送消息
        if (!activeCall || !heldCall) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        return that.session.socket.send({
            activeCall: activeCall.callId,
            holdCall: heldCall.callId,
            device: that.stationId,
            domain: that.domain,
            type: "12"
        });
    }
    alternate() {
        Log.info("station - alternate");
        let that = this;
        let activeCall = that.calls.get(that.calls.activeCall);
        let heldCall = that.calls.filter({
            isHeld: true
        }).getLast();
        // 发送消息
        if (!activeCall || !heldCall) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        return that.session.socket.send({
            activeCall: activeCall.callId,
            holdCall: heldCall.callId,
            device: that.stationId,
            domain: that.domain,
            type: "11"
        });
    }
    consultation(dest, options) {
        Log.info("station - consultation");
        let that = this;
        options = options || support;
        let activeCall = that.calls.get(that.calls.activeCall);
        let heldCall = that.calls.filter({
            isHeld: true
        }).getLast();
        if (!that.calls.callsList.length || activeCall && CallStateType.CONNECTED !== activeCall.state || !activeCall && !heldCall || heldCall && heldCall.state !== CallStateType.CONNECTED) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        // 没有已激活的或者已激活的不是通话状态 或者 没有保持的或者保持的不是通话状态 问题场景屏蔽
        let existingCall = activeCall || heldCall;
        // 发送消息
        return that.session.socket.send({
            uuid: existingCall.callId,
            agentId: that.agent.agentId,
            device: that.stationId,
            domain: that.domain,
            consultDevice: dest,
            businessCode: options.businessCode || "",
            uui: Util.encode(options.uui),
            type: "10"
        }).then(function (e) {
            that.calls.consultationFrom = existingCall.callId;
            that.calls.consultationTo = dest;
            that.calls.consultationType = options.type || "";
        });
    }
    conference(options) {
        Log.info("station - conference");
        let that = this;
        options = options || support;
        // 没有保持的或激活的电话则返回
        // 已保持的电话必须处于通话状态
        let activeCall = that.calls.get(that.calls.activeCall);
        let heldCall = that.calls.filter({
            isHeld: true
        }).getLast();
        let consultationFrom = that.calls.get(that.calls.consultationFrom);
        // 修正磋商响应事件发生在振铃事件之后导致consultationTo为空的情形
        let consultationTo = that.calls.get(that.calls.consultationTo);
        that.calls.consultationType = that.calls.consultationType || "";
        let consultationType = options.type || "";

        if (consultationFrom && consultationTo) {
            // consultationFrom 或 consultationTo 其中一个状态是保持，另一个是激活
            if (consultationFrom.isHeld && (consultationTo.state === CallStateType.CONNECTED || consultationTo.state === CallStateType.DIALING)) {
                activeCall = consultationTo;
                heldCall = consultationFrom;
            } else if ((consultationFrom.state === CallStateType.CONNECTED || consultationFrom.state === CallStateType.DIALING) && consultationTo.isHeld) {
                activeCall = consultationFrom;
                heldCall = consultationTo;
            } else {
                return Promise.reject(new Error(Error.INVALID_STATE_ERR));
            }
        }
        // 如果没有激活的电话 或者磋商类型与会议类型不一致 或者磋商的电话不存在 或者磋商的电话不是保持状态
        // 或者 磋商的电话不是通话状态 则返回
        if (!activeCall || !heldCall || that.calls.consultationType !== consultationType) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        // 发送消息
        return that.session.socket.send({
            activeCall: activeCall.callId,
            holdCall: heldCall.callId,
            device: that.stationId,
            domain: that.domain,
            type: "14"
        });
    }
    transfer(options) {
        Log.info("station - transfer");
        let that = this;
        options = options || support;
        let activeCall = that.calls.get(that.calls.activeCall);
        let heldCall = that.calls.filter({
            isHeld: true
        }).getLast();
        let consultationFrom = that.calls.get(that.calls.consultationFrom);
        // 修正磋商响应事件发生在振铃事件之后导致consultationTo为空的情形
        let consultationTo = that.calls.get(that.calls.consultationTo);
        that.calls.consultationType = that.calls.consultationType || "";
        let consultationType = options.type || "";

        if (consultationFrom && consultationTo) {
            // consultationFrom 或 consultationTo 其中一个状态是保持，另一个是激活
            if (consultationFrom.isHeld && (consultationTo.state === CallStateType.CONNECTED || consultationTo.state === CallStateType.DIALING)) {
                activeCall = consultationTo;
                heldCall = consultationFrom;
            } else if ((consultationFrom.state === CallStateType.CONNECTED || consultationFrom.state === CallStateType.DIALING) && consultationTo.isHeld) {
                activeCall = consultationFrom;
                heldCall = consultationTo;
            } else {
                return Promise.reject(new Error(Error.INVALID_STATE_ERR));
            }
        }
        // 如果没有激活的电话 或者磋商类型与会议类型不一致 或者磋商的电话不存在 或者磋商的电话不是保持状态
        // 或者 磋商的电话不是通话状态 则返回
        if (!activeCall || !heldCall || that.calls.consultationType !== consultationType) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        // 发送消息
        return that.session.socket.send({
            activeCall: activeCall.callId,
            holdCall: heldCall.callId,
            device: that.stationId,
            domain: that.domain,
            type: "13"
        });
    }
    singleStepConference(dest) {
        Log.info("station - singleStepConference");
        let that = this;
        // 没有激活的电话或者激活的电话不是通话状态则返回
        let activeCall = that.calls.get(that.calls.activeCall);
        if (!activeCall || activeCall.state !== CallStateType.CONNECTED) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        // 发送消息
        return that.session.socket.send({
            uuid: activeCall.callId,
            deviceTo: dest,
            device: that.stationId,
            domain: that.domain,
            type: "8"
        });
    }
    singleStepTransfer(dest, options) {
        Log.info("station - singleStepTransfer");
        let that = this;
        options = options || {};
        // 没有激活的电话或者激活的电话不是通话状态则返回
        let activeCall = that.calls.get(that.calls.activeCall);
        if (!activeCall || activeCall.state !== CallStateType.CONNECTED) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        // 发送消息
        return that.session.socket.send({
            uuid: activeCall.callId,
            device: that.stationId,
            deviceTo: dest,
            domain: that.domain,
            uui: Util.encode(options.uui),
            businessCode: options.businessCode || "",
            type: "7"
        });
    }
    sendDtmfTone(dtmf) {
        Log.info("station - sendDtmfTone");
        let that = this;
        let activeCall = that.calls.get(that.calls.activeCall);
        if (!activeCall || activeCall.state !== CallStateType.CONNECTED) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        return that.session.socket.send({
            uuid: activeCall.callId,
            device: that.stationId,
            domain: that.domain,
            dtmf: dtmf,
            type: "15"
        });
    }
    serviceResult(rosterCallId, resultReasonCode, activityInfoId, rosterInfoId,
                             recallDateTime, newPhoneNum1, recallMode, timeSelectedInterval) {
        Log.info("station - serviceResult");
        let that = this;
        return that.session.socket.send({
            callId: rosterCallId,
            device: that.stationId,
            domain: that.domain,
            agentId: that.agent.agentId,
            resultCode: resultReasonCode,
            activityInfoId: activityInfoId,
            rosterInfoId: rosterInfoId,
            recallDateTime: recallDateTime,
            newPhoneNum1: newPhoneNum1,
            recallMode: recallMode,
            timeSelectedInterval: timeSelectedInterval,
            type: "30"
        });
    }
    validatePwd(dest1, dest2, options) {
        Log.info("station -> client validate password .");
        let that = this;
        // 没有保持的或激活的电话则返回
        // 已保持的电话必须处于通话状态
        let activeCall = that.calls.get(that.calls.activeCall);
        if (!activeCall || activeCall.state !== CallStateType.CONNECTED) return Promise.reject(new Error(Error.INVALID_STATE_ERR));
        options = options || support;
        // 发送消息
        return that.session.socket.send({
            uuid: activeCall.callId,
            device: that.stationId,
            domain: that.domain,
            dest1: dest1,
            dest2: dest2,
            uui: Util.encode(options.uui),
            type: "20"
        });
    }
}
