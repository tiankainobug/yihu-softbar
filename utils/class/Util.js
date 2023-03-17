/**
 * 编码工具类，支持UTF8
 *
 * @type {{encode: ((function(*=): (string|string))|*), encodeHex: ((function(*): (string))|*), decodeHex: (function(*): string), decode: (function(*=): any)}}
 */
const Util = {
    encodeHex: function (str){
        let retVal = "";
        if (str === null) {
            return retVal;
        }
        const code = encodeURIComponent(str);
        for (let i = 0; i < code.length; i++) {
            const c = code.charAt(i);
            if (c === '%') {
                const hex = code.charAt(i + 1) + code.charAt(i + 2);
                const hexVal = parseInt(hex, 16);
                retVal += hexVal.toString(16);
                i += 2;
            } else {
                retVal += c.charCodeAt(0).toString(16);
            }
        }
        return retVal;
    },
    decodeHex: function (str) {
        let out = "";
        if (str === null) {
            return out;
        }
        for (let i = 0; i < str.length;) {
            out += '%' + str.substring(i, i += 2);
        }
        return unescape(decodeURI(out));
    },
    encode: function (obj) {
        if (obj) {
            if (typeof (obj) === "string") {
                return this.encodeHex(obj) + ";encoding=hex";
            } else {
                // xxxx;encoding=jsonHex 参考 : http://172.16.2.234:8090/pages/viewpage.action?pageId=3932435
                return this.encodeHex(JSON.stringify(obj)) + ";encoding=jsonHex";
            }
        }
        return "";
    },
    decode: function (hex) {
        if (hex === null) {
            return null;
        }
        let end = hex.toString().indexOf(";");
        if (end > 0) {
            hex = hex.toString().substring(0, end);
        }
        let decodeHex = this.decodeHex(hex);
        if (decodeHex == null || decodeHex === '') {
            return null;
        }
        return JSON.parse(decodeHex);
    }
}
