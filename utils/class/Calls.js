class Calls {
    constructor() {
        this.activeCall = "";
        this.consultationType = "";
        this.consultationFrom = "";
        this.consultationTo = "";
        this.callsList = []
    }
    get(callId){
        return this.callsList.find(item => item.callId = callId)
    }
    add(call){
        if (call.callId) {
            let origCall = this.get(call.callId);
            if (!origCall) {
                origCall = new Call();
                this.callsList.push(origCall);
            }
            for (let key in origCall) {
                typeof call[key] !== typeof undefined && (origCall[key] = call[key]);
            }
        }
    }
    remove(callId) {
        for (let i = 0, len = this.callsList.length; i < len; i++) {
            if (this.callsList[i].callId === callId && this.callsList.splice(i, 1)) return;
        }
    };
    removeIndex(index) {
        this.callsList.splice(index, 1);
    };
    clear() {
        this.callsList.length = 0;
    };
    clearConsultation() {
        this.consultationFrom = "";
        this.consultationTo = "";
        this.consultationType = "";
    };
    getIndex(index) {
        return this.callsList[index] || null;
    };
    getLast(index) {
        return this.callsList[this.callsList.length - 1] || null;
    };
    indexOf(callId) {
        for (let i = 0, len = this.callsList.length; i < len; i++) {
            if (this.callsList[i].callId === callId) return i;
        }
        return 0;
    };
    size() {
        return this.callsList.length;
    };
    replace(callId, call) {
        call = call || {};
        let origCall = this.get(callId) || support;
        for (let key in origCall) {
            typeof call[key] !== typeof undefined && (origCall[key] = call[key]);
        }
    };
    filter(call) {
        call = call || {};
        let calls = new Calls();
        // 命名循环
        callsLoop: for (let i = 0, len = this.callsList.length; i < len; i++) {
            for (let key in call) {
                if (typeof this.callsList[i][key] === typeof undefined || this.callsList[i][key] !== call[key]) continue callsLoop;
            }
            calls.callsList.push(this[i]);
        }
        return calls;
    };
}
