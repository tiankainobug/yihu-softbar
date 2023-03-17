const vm = new Vue({
    el: '#home',
    data() {
        return {
            // 外拨号码
            number: '',
            // 按钮控制
            buttonInfo: {
                login_btn: true,
                sendDTMF_btn: true,
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
                duration: '--:--'
            },
            queueInfo: [],
            loginDialogVisible: false,
            loginForm: {
                domain: 'laihucc',
                agentId: '6003',
                stationId: '1003',
                password: '123456'
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
        let event = this.session.event;
        eventInit(event);
    },
    methods: {
        showLogin() {
            this.loginDialogVisible = true;
        },
        cancelLogin() {
            this.loginDialogVisible = false;
        },
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
        }
    }
})
