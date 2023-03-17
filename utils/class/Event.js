class Event {

    constructor(props) {
        this.events = {}
    }

    /**
     * 监听事件
     *
     * @param types 类型
     * @param fn    回调函数
     * @param level 优先级（0最高，数值越大，级别越低）
     */
    on(types, fn, level) {
        let namespaces, namespace, type, origType;
        if (level === window.undefined) level = 1;
        // 事件完整路径列表
        namespaces = types.toUpperCase().split(",");
        // 循环列表
        for (let i = 0; i < namespaces.length; i++) {
            // 取出命名空间
            namespace = namespaces[i].trim().split(".");
            // 禁用通配符
            if (namespace["*"]) continue;
            // 取出事件类型
            type = namespace.pop();
            // 搜索事件
            origType = this.events[type];
            // 不存在则创建事件
            if (!origType) origType = this.events[type] = [];
            // 不存在则创建级别
            if (!origType[level]) origType[level] = [];
            // 将事件按级别加入列表
            origType[level].push({
                namespace: namespace,
                fn: fn
            });
        }
    }
    /**
     * 监听事件只触发一次
     *
     * @param types
     *            事件类型
     * @param fn
     *            处理函数
     */
    one(types, fn, level) {
        let that = this;
        let origFn = fn;
        fn = function () {
            that.off(types, fn, level);
            origFn.apply(fn, arguments);
        };
        this.on(types, fn, level);
    }
    /**
     * 移除监听事件
     *
     * @param types 类型
     * @param fn    回调函数
     * @param level 级别
     */
    off(types, fn, level) {
        let namespacesList = types.toUpperCase().split(",");
        namespacesList.forEach(namespaces => {
            let namespace = namespaces.trim().split(".");
            let type = namespace.pop();
            let event, origLevel, origType, origIndex;
            if (type !== "*") {
                event = this.events[type];
            }
            if (!event || event.length === 0) return;
            // 循环所有事件
            for (let key in this.events) {
                origType = event || this.events[key] || [];
                // 循环事件级别，无级别参数则从1开始
                for (let i = typeof level !== typeof undefined ? level : 1; i < origType.length; i++) {
                    origLevel = origType[i] || [];
                    // 循环级别中索引
                    indexLoop: for (let j = 0; j < origLevel.length; j++) {
                        origIndex = origLevel[j] || [];
                        if (fn && origIndex.fn !== fn) {
                            continue;
                        } else {
                            // 无命名空间将删除所有
                            if (!namespace.length) {
                                delete origLevel[j];
                                continue indexLoop;
                            }
                            // 循环源命名空间
                            let origNs = origIndex.namespace || [];
                            if (origNs.length !== namespace.length) continue indexLoop;
                            for (let k = 0; k < origNs.length; k++) {
                                if (namespace[k] === "*") continue;
                                // 比较命名空间
                                if (namespace[k] !== origNs[k]) continue indexLoop;
                            }
                            delete origLevel[j];
                        }
                    }
                    if (typeof level !== typeof undefined) break;
                }
                if (event) break;
            }
        });
    }
    /**
     * 触发事件
     *
     * @param strTypes
     * @param data
     */
    trigger(strTypes, data) {
        let types, origType;
        // 事件类型数组
        types = strTypes.toUpperCase().split(",");
        // 循环数组
        types.forEach(type => {
            // 搜索事件
            origType = this.events[type.trim()];
            // 不存在则返回
            if (!origType) return;
            // 按事件级别触发事件
            for (let i = 0; i < origType.length; i++) {
                if (!origType[i]) continue;
                for (let j = 0; j < origType[i].length; j++) {
                    let orig = origType[i][j];
                    if (orig && typeof orig.fn === "function") {
                        orig.fn(data || {});
                    }
                }
            }
        })
    }

}
