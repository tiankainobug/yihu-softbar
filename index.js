const vm = new Vue({
    el: '#home',
    data() {
        return {
            // 是否登录
            isLogin: false,
            // 外拨号码
            callNumber: '',
            // 按钮控制
            buttonInfo: {
                login_btn: true,
                sendDTMF_btn: false,
                makeCall_btn: false,
                hangup_btn: false,
                answer_btn: false,
                consult_btn: false,
                hold_btn: false,
                retrieve_btn: false,
                ssc_btn: false,
                sst_btn: false,
                alternate_btn: false,
                transfer_btn: false,
                reconnect_btn: false,
                conference_btn: false,
                validatePwd_btn: false
            },
            // 小休状态信息
            reasonInfo: {
                buttonType: 'primary',
                options: [],
                label: '',
                placeholder: '未登录',
                duration: '--:--',
                callNumber: ''
            },
            // 队列信息
            queueInfo: [],
            // 是否展示登录弹框
            loginDialogVisible: false,
            // 是否展示咨询、转移弹框
            transferDialogVisible: false,
            // 是否展示验密弹框
            validatePwdDialogVisible: false,
            loginForm: {
                domain: 'laihucc',
                agentId: '6003',
                stationId: '1003',
                password: '123456'
            },
            loginFormRules: {
                domain: [
                    {required: true, message: "域名不能为空！", trigger: "blur"}
                ],
                agentId: [
                    {required: true, message: "坐席号不能为空！", trigger: "blur"}
                ],
                stationId: [
                    {required: true, message: "分机号不能为空！", trigger: "blur"}
                ],
                password: [
                    {required: true, message: "密码不能为空！", trigger: "blur"}
                ]
            },
            transferForm: {
                transferNum: null
            },
            transferFormRules: {
                transferNum: [
                    {required: true, message: "转移号码不能为空！", trigger: "blur"}
                ],
            },
            validatePwdForm: {
                ivrNumber: null,
                waitRoutePoint: null
            },
            validatePwdFormRules: {
                ivrNumber: [
                    {required: true, message: "验密ivr号码不能为空！", trigger: "blur"}
                ],
                waitRoutePoint: [
                    {required: true, message: "座席路由号码不能为空！", trigger: "blur"}
                ],
            },
            // session对象
            session: null,
            // 分机对象
            station: null,
            // 事件对象
            event: null
        }
    },
    mounted(){
        this.session = new Session();
        this.station = this.session.station;
        this.event = this.session.event;
        eventInit(this.event);
    },
    methods: {
        showLogin() {
            this.loginDialogVisible = true;
        },
        cancelLogin() {
            this.loginDialogVisible = false;
        },
        // 登录
        login() {
            this.$refs['loginForm'].validate((valid) => {
                if (valid){
                    const that =  this;
                    let startPromise;
                    if (that.session.state === SessionStateType.DEAD) {
                        // 调用session的start接口连接服务器
                        startPromise = that.session.start("ws://" + settings.connector);
                    } else {
                        startPromise = Promise.resolve();
                    }
                    startPromise.then(function (e) {
                        return that.station.signIn(that.loginForm.domain,that.loginForm.stationId,that.loginForm.agentId,that.loginForm.password);
                    })['catch'](function (e) {
                        console.info("连接失败");
                        console.info(e);
                    });
                }
            })
        },
        // 改变状态
        changeReason(reason){
            const code = reason.value;
            this.reasonInfo.label = reason.label;
            code === 0 ? vm.reasonInfo.buttonType = 'success' : vm.reasonInfo.buttonType = 'warning'
            if (code > 0) {
                this.station.setMode("NotReady", code).then(e => {
                    this.$message.success(`切换状态成功!`)
                }).catch(e => {
                    this.$message.error(e.message);
                });
            } else {
                this.station.setMode("Ready").then(e => {
                    this.$message.success(`就绪成功!`)
                }).catch(e => {
                    this.$message.error(e.message);
                });
            }
        },
        // 退出登录
        signOut(option){
            if (option === 'signOut') {
                this.$confirm('确认退出登录吗？').then(e => {
                    this.station.signOut().then(e => {
                        this.$message.success('退出成功！');
                    }).catch(e => {
                        this.$message.error(e.message)
                    })
                }).catch()
            }
        },
        // 接听
        answer() {
            this.station.answer().then(e => {
                console.info('应答');
            }).catch(e => {
                this.$message.error(e.message)
            });
        },
        // 外呼
        makeCall() {
            const number = this.callNumber;
            if (number === '') {
                this.$message.warning('请输入号码！')
                return;
            }
            this.station.makeCall(number, {
                uui: {}
            }).catch(e => {
                this.$message.error(e.message)
            });
        },
        // 挂断
        hangUp() {
            this.station.hangup().then( e => {
                console.info('挂断');
            }).catch(e => {
                this.$message.error(e.message)
            })
        },
        // 保持
        hold() {
            this.station.hold().then(e => {
                console.info('保持');
            }).catch(e => {
                this.$message.error(e.message)
            })
        },
        // 取回
        retrieve() {
            this.station.retrieve().then(e => {
                console.info('恢复');
            }).catch(e => {
                this.$message.error(e.message)
            });
        },
        // 咨询
        consultBTN() {
            op_type = 1;
            this.transferDialogVisible = true;
        },
        // 转移
        sst() {
            op_type = 2;
            this.transferDialogVisible = true;
        },
        // 会议
        ssc() {
            op_type = 3;
            this.transferDialogVisible = true;
        },
        // 取消转移
        cancelTransfer() {
            this.transferDialogVisible = false;
        },
        // 确认转移
        successTransfer() {
            if (op_type === 1) {
                consult(this.transferForm.transferNum);
            } else if (op_type === 2) {
                singleStepTransfer(this.transferForm.transferNum);
            } else if (op_type === 3) {
                singleStepConference(this.transferForm.transferNum);
            }
        },
        // 发送DTMF
        sendDTMF() {
            if (this.station.calls.callsList.length === 0) {
                this.$message.warning('没有通话！')
            } else {
                let dtmf = prompt("请输入dtmf");
                if (dtmf) {
                    this.station.sendDtmfTone(dtmf).then(() => {
                        this.$message.success('发送成功！')
                        console.info('发送dtmf: ' + dtmf);
                    }).catch(e => {
                        this.$message.error(e.message)
                    });
                }
            }
        },
        // 切换
        alternate() {
            this.station.alternate().then(e => {
                console.info('切换');
            }).catch(e => {
                this.$message.error(e.message)
            });
        },
        // 转移2？
        transfer() {
            this.station.transfer({
                type: 'consultation',
            }).then(e => {
                console.info('转移');
            }).catch(e => {
                this.$message.error(e.message)
            });
        },
        // 重连
        reconnect() {
            this.station.reconnect().then(function () {
                console.info('重连');
            }).catch(e => {
                this.$message.error(e.message)
            });
        },
        // 会议
        conference() {
            this.station.conference({
                type: 'consultation',
            }).then(function (e) {
                console.info('会议');
            }).catch(e => {
                this.$message.error(e.message)
            });
        },
        validatePwd() {
            this.validatePwdDialogVisible = true;
        },
        // 取消验密
        cancelValidatePwd() {
            this.validatePwdDialogVisible = false;
        },
        // 确定验密
        successValidatePwd() {
            this.$refs['loginForm'].validate((valid) => {
                if (valid){
                    this.station.validatePwd(this.validatePwdForm.waitRoutePoint,this.validatePwdForm.ivrNumber, {}).then(function (e) {
                        console.info('done');
                    }).catch(e => {
                        this.$message.error(e.message)
                    });
                }
            })

        },
    }
})
