/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

/* eslint-disable no-useless-escape */
var ApiNameRegex = /[\/|\-|_|{|}]+([a-zA-Z])/g; // 獲取接口名稱
var illegalRegex = /[^a-zA-Z0-9]/g; // 用来剔除不合法的符号
var longBiasRegex = /\/[^\/]*/; // 处理多个“/”地址的情况
var pathHasParamsRegex = /\/\{([a-zA-Z0-9]*)\}/g; // 獲取接口参数名稱
var NormalType = ['boolean', 'string', 'number', 'object', 'array'];
var quotaRegex = /(,)\s*\n*.*\}/g; // 匹配json字符串最后一个逗号
var illegalJsonRegex = /(\/\/\s.*)\n/g; // 非法json注释匹配
/** 兼容简写与全写 */
var Versions = {
    typescript: "ts" /* TS */,
    ts: "ts" /* TS */,
    javascript: "js" /* JS */,
    js: "js" /* JS */
};

/** hasOwnProperty太长了，写一个代理当简写 */
var hasProperty = function (obj, key) {
    if (!obj)
        return false;
    return Object.prototype.hasOwnProperty.call(obj, key);
};
/** 判断api数据里面的数据类型 */
var getTypeByValue = function (value) {
    if (value === null)
        return 'string';
    var jsType = typeof value;
    switch (jsType) {
        case 'object': // 引用类型都是object，需要处理不同引用类型
            return value.constructor === Array ? 'array' : 'object';
        case 'undefined':
            return 'any';
        default:
            return jsType;
    }
};
/** 获取请求体（body）传输参数 */
var getLegalJson = function (reqBody) {
    if (!reqBody || reqBody.length < 20)
        return '';
    var isIllegalJsonStr = illegalJsonRegex.test(reqBody); //判断后台返回的字符串是不是合法json字符串
    try {
        if (!isIllegalJsonStr) {
            return JSON.parse(reqBody);
        }
        else {
            var dealStr = reqBody.replace(illegalJsonRegex, '\n'); // 删除注释
            var removeLestQuotaStr = dealStr.replace(quotaRegex, '}'); // 删除多余的逗号
            return JSON.parse(removeLestQuotaStr);
        }
    }
    catch (error) {
        // console.log('json序列化错误', error) // 正则如果没有考虑所有情况将会影响无法输出注释, TODO
        return ''; // 总有一些意外的情况没有考虑到，当字符创处理
    }
};

/** 获取处理地址的baseUrl */
var getApiBaseUrl = function (project) {
    var baseUrl = '';
    var prefix = project.prefix, projectBaseConfig = project.projectBaseConfig;
    if (projectBaseConfig === null || projectBaseConfig === void 0 ? void 0 : projectBaseConfig.basepath)
        baseUrl = projectBaseConfig.basepath;
    if (prefix)
        baseUrl = prefix.endsWith('/') ? prefix.slice(0, prefix.length - 1) : prefix; // 兼容两种写法
    return baseUrl;
};
/** 接口名决策方案：如果有参数先去除参数，然后把接口path剩余数据转成驼峰命名，缺点：接口path如果太长，命名也会比较长 */
var getApiName = function (path, method) {
    var appendName = pathHasParamsRegex.test(path) ? 'ById' : '';
    path = path.replace(pathHasParamsRegex, '');
    // 处理名字太长
    var biasCount = --path.split('/').length;
    if (biasCount >= 3)
        path = path.replace(longBiasRegex, '');
    path = path.replace(ApiNameRegex, function (_, item) { return item.toUpperCase(); });
    // 防止restful API 导致命名相同
    return method.toLowerCase() + path.replace(illegalRegex, '') + appendName;
};
/**
 * 单词首字母转大写
 * @param name 单词字符串
 * @returns {string} 首字母为大写的单词字符串
 */
var getUpperCaseName = function (name) {
    return name.replace(/^([a-zA-Z])/, function (_, item) { return item.toUpperCase(); });
};
/** 根据用户配置自定义参数去获取请求的额外参数, requestParams */
var getCustomerParamsStr = function (project, showDefault) {
    if (showDefault === void 0) { showDefault = true; }
    var customParams = project.customParams || global.apiConfig.customParams;
    if (!customParams || !customParams.length)
        return '';
    return customParams.reduce(function (pre, cur, index) {
        if (!index)
            pre += ', ';
        if (cur.name)
            pre += "".concat(cur.name);
        if (showDefault && cur.default)
            pre += " = ".concat(/\d+/.test(cur.default + '') ? cur.default : "'".concat(cur.default, "'"));
        if (index !== customParams.length - 1)
            pre += ', ';
        return pre;
    }, '');
};
/** 处理传Id的API请求URL */
var getAppendPath = function (path, project) {
    var prefix = getApiBaseUrl(project);
    var isHaveParams = pathHasParamsRegex.test(path); // 地址栏上是否有参数
    if (!isHaveParams)
        return "'".concat(prefix).concat(path, "'");
    // eslint-disable-next-line no-useless-escape
    return "`".concat(prefix).concat(path.replace(pathHasParamsRegex, function (_, p1) { return "/${".concat(p1, "}"); }), "`");
};
/**
 * 根据导出类型获取单个请求的method字符串
 * @param project 项目配置
 * @param item 请求配置
 * @param requestParamsStr 请求参数字符串
 * @param appendParamsStr method使用的额外的参数字符串
 * @param returnType 服务端返回的类型或类型名
 * @returns string 主方法字符串
 */
var getMainRequestMethodStr = function (project, item, requestParamsStr, appendParamsStr, returnType) {
    if (appendParamsStr === void 0) { appendParamsStr = ''; }
    var requestPath = getAppendPath(item.path, project);
    var requestName = getApiName(item.path, item.method);
    var returnTypeStr = global.apiConfig.isNeedType && returnType ? ": Promise<".concat(returnType, ">") : '';
    var _a = global.apiConfig, _b = _a.outputStyle, outputStyle = _b === void 0 ? "defaultExport" /* Default */ : _b, axiosName = _a.axiosName;
    var requestContent = "{\n    const method = '".concat(item.method, "'\n    return ").concat(axiosName, "(").concat(requestPath, ", { ").concat(appendParamsStr, "method, ...options }").concat(getCustomerParamsStr(project, false), ")\n}");
    switch (outputStyle) {
        case "nameExport" /* Name */:
            return "export function ".concat(requestName).concat(requestParamsStr).concat(returnTypeStr, " ").concat(requestContent, "\n");
        case "anonymousExport" /* Anonymous */:
            return "export const ".concat(requestName, " = ").concat(requestParamsStr).concat(returnTypeStr, " => ").concat(requestContent, "\n");
        default:
            return "".concat(requestName, ": ").concat(requestParamsStr).concat(returnTypeStr, " => ").concat(requestContent, ",\n");
    }
};

/** 后台类型转前端类型 */
var transformType = function (serviceType) {
    serviceType = String(serviceType);
    switch (serviceType) {
        case 'integer':
            return 'number';
        case 'text':
            return 'string';
        case 'bool':
            return 'boolean';
        default:
            if (NormalType.includes(serviceType.toLowerCase()))
                return serviceType;
            else
                return 'any';
    }
};
/** 获取合适的参数类型 */
var getSuitableType = function (value) {
    var valueType = typeof value;
    switch (valueType) {
        case 'object':
            if (value === null)
                return 'any';
            if (hasProperty(value, 'type'))
                return transformType(value.type);
            if (hasProperty(value, 'default'))
                return getTypeByValue(value.default);
            return valueType;
        case 'undefined':
            return 'any';
        case 'number':
        case 'string':
        default:
            return valueType;
    }
};
/** 获取合适的参数描述 */
var getSuitDescription = function (value) {
    var description = '';
    if (hasProperty(value, 'description')) {
        description = value.description || '';
    }
    return description;
};
var getSuitableDefault = function (value) {
    /** 如果是String类型的话没有多大必要显示Example: String. 多此一举了 */
    function removeTypeDefault(defaultStr) {
        if (String(defaultStr).trim().toLowerCase() === 'string')
            return '';
        return String(defaultStr);
    }
    var valueType = typeof value;
    switch (valueType) {
        case 'object':
            if (hasProperty(value, 'default'))
                return removeTypeDefault(value.default);
            if (hasProperty(value, 'example'))
                return removeTypeDefault(value.example);
            return '';
        case 'boolean':
        case 'number':
            return String(value);
        case 'string':
            return removeTypeDefault(value);
        default:
            return '';
    }
};
/**
 * 获取合适的TS类型
 * @param description 单个字段的描述
 * @param example 单个字段的示例或者默认值
 * @returns {string} 单个字段的Ts的单行展示
 */
var getSuitableTsTypeNote = function (description, example) {
    if (!description && !example)
        return '';
    var desc = description || '';
    var ex = example ? "   Example: ".concat(example) : '';
    return "    /**  ".concat(desc).concat(ex, "  */\n");
};
/** 剔除不合法的符号 */
var getSuitableTsType = function (key, type) {
    key = key.replace(/\W/g, '');
    return "".concat(key, "?: ").concat(type, "\n");
};
var getSuitableJsdocProperty = function (key, type, description, example) {
    var descriptionStr = description || '';
    var exampleStr = example ? " Example: ".concat(example) : '';
    return "  * @property { ".concat(type, " } [").concat(key, "] ").concat(descriptionStr).concat(exampleStr, " \n");
};
var getSuitableTsInterface = function (noteName, noteStr, childNote) { return "export interface ".concat(noteName, " {\n").concat(noteStr, "}\n").concat(childNote || ''); };
var getSuitableJsdocType = function (noteName, noteStr, childNote) { return "/** \n  * @typedef ".concat(noteName, "\n").concat(noteStr, "  */\n").concat(childNote || ''); };
/** 获取Ts类型Str */
var getTsTypeStr = function (data) {
    /** Ts数据机构处理json schema 数据结构, 由于存在内部调用，所以就写成了内部函数 */
    var getInterfaceType = function (child) {
        var childType = getSuitableType(child);
        if (childType === 'object' && (child === null || child === void 0 ? void 0 : child.properties)) {
            childType = "{\n".concat(getTsTypeStr(child.properties), "}");
        }
        if (childType === 'array' && (child === null || child === void 0 ? void 0 : child.items)) {
            childType = "Array<".concat(getInterfaceType(child.items), ">");
        }
        return childType;
    };
    var bodyStr = '';
    Object.entries(data).forEach(function (_a) {
        var key = _a[0], value = _a[1];
        var description = getSuitDescription(value);
        var type = getInterfaceType(value);
        bodyStr += getSuitableTsTypeNote(description);
        bodyStr += getSuitableTsType(key, type);
    });
    return bodyStr;
};
/** 通用处理JSON schema的数据结构，根据版本获取返回的type类型 */
var dealJsonSchemaArr = function (data, types, typeName) {
    /** 处理json schema 数据结构, 由于存在内部调用，所以就写成了内部函数 */
    var getJsdocType = function (child, key) {
        var childType = getSuitableType(child);
        if (childType === 'object' && (child === null || child === void 0 ? void 0 : child.properties)) {
            var keyName = typeName + getUpperCaseName(key);
            var preArrLength = types.length; // 记录数组的长度，如果没有变化说明types没有变化，说明类型为空
            dealJsonSchemaArr(child.properties, types, keyName);
            childType = preArrLength === types.length ? 'any' : keyName;
        }
        if (childType === 'array' && (child === null || child === void 0 ? void 0 : child.items)) {
            childType = "Array.<".concat(getJsdocType(child.items, key), ">");
        }
        return childType;
    };
    var bodyStr = '';
    var version = global.apiConfig.version;
    Object.entries(data).forEach(function (_a) {
        var key = _a[0], value = _a[1];
        var description = getSuitDescription(value);
        var type = getJsdocType(value, key);
        // Ts和Jsdoc的类型不一样
        if (Versions[version] === "ts" /* TS */) {
            bodyStr += getSuitableTsTypeNote(description);
            bodyStr += getSuitableTsType(key, type);
        }
        else {
            bodyStr += getSuitableJsdocProperty(key, type, description);
        }
    });
    if (bodyStr.length)
        types.unshift({ typeName: typeName, typeString: bodyStr });
};

/** 获取请求参数（params）传输参数，考虑到params一律是传地址栏，所以type默认设置为string */
var getConfigNoteParams$1 = function (reqQuery, requestName) {
    var paramsStr = '';
    reqQuery.forEach(function (item) {
        var example = getSuitableDefault(item);
        paramsStr += getSuitableJsdocProperty(item.name, 'string', item.desc, example);
    });
    if (!paramsStr)
        return '';
    return getSuitableJsdocType(requestName, paramsStr);
};
/** 处理请求体(data)的逻辑规则 */
var getJsonToJsDocParams = function (data, interfaceName) {
    if (data === null || data === void 0 ? void 0 : data.items)
        data = data.items;
    if (!data || !data.properties || !Object.keys(data).length)
        return ''; // 空的对象不做处理
    var types = [];
    dealJsonSchemaArr(data.properties, types, interfaceName);
    return types.reduce(function (pre, cur) {
        pre += getSuitableJsdocType(cur.typeName, cur.typeString);
        return pre;
    }, '');
};
/** 处理返回的数据类型处理 */
var dealJsonToJsDocReturn = function (data, interfaceName) {
    var _a, _b;
    if (data === null || data === void 0 ? void 0 : data.items)
        data = data.items;
    if (!data || !data.properties || !Object.keys(data).length)
        return ''; // 空的对象不做处理
    // 统一封装的外部不做解析，从外部的dataParseName开始解析
    var dataParseName = global.apiConfig.dataParseName;
    if (dataParseName && ((_a = data === null || data === void 0 ? void 0 : data.properties) === null || _a === void 0 ? void 0 : _a[dataParseName]))
        return dealJsonToJsDocReturn((_b = data === null || data === void 0 ? void 0 : data.properties) === null || _b === void 0 ? void 0 : _b[dataParseName], interfaceName);
    var types = [];
    dealJsonSchemaArr(data.properties, types, interfaceName);
    return types.reduce(function (pre, cur) {
        pre += getSuitableJsdocType(cur.typeName, cur.typeString);
        return pre;
    }, '');
};

/** 获取传参名称, TODO，移除params和data,所有的地方都需要额外做处理 */
var getNoteNameByParamsType = function (item, suffix) {
    if (!global.apiConfig.isNeedType)
        return 'any';
    var requestName = getApiName(item.path, item.method);
    var ParamsName = getUpperCaseName(requestName);
    return ParamsName + getUpperCaseName(suffix);
};
/** 获取放在Promise<xxx>的名字 */
var getReturnType = function (returnName, resType) {
    if (!returnName || !resType)
        return 'any';
    if (returnName === 'array')
        return '[]';
    return returnName;
};
/** 获取文档地址 */
var getApiLinkAddress = function (project_id, _id) {
    var _a = global.apiConfig, protocol = _a.protocol, host = _a.host;
    var baseUrl = "".concat(protocol, "//").concat(host);
    return "".concat(baseUrl, "/project/").concat(project_id, "/interface/api/").concat(_id);
};
/** 获取api最后更新时间(服务端) */
var getUpdateTime = function (time) { return new Date(time * 1000).toLocaleDateString(); };
/** 获取axios 的额外的请求名称 */
var getAxiosOptionTypeName = function () {
    var isNeedAxiosType = global.apiConfig.isNeedAxiosType;
    var axiosTypeName = isNeedAxiosType ? 'AxiosRequestConfig' : 'any';
    return axiosTypeName;
};

/** 通用api对象的抽象类 */
var ApiItem = /** @class */ (function () {
    function ApiItem(apiItem, project) {
        this.apiItem = apiItem;
        this.project = project;
        this.paramsArr = [];
        this.methodStr = '';
        this.methodNote = '';
        this.returnData = { name: 'response' };
    }
    return ApiItem;
}());

/** 如果在解析不出来interface类型的情况下返回any类型容错 */
var getTypeName = function (interfaceName, body, typeString) {
    if (!typeString)
        return 'any';
    return typeIsArray(body) ? "Array<".concat(interfaceName, ">") : interfaceName;
};
var typeIsArray = function (body) {
    var _a, _b;
    var outDataTypeIsArray = !!(body === null || body === void 0 ? void 0 : body.items); // 最外层的数据是否数组类型，下面的不合法的数据默认返回该类型
    var dataParseName = global.apiConfig.dataParseName;
    if (!dataParseName)
        return outDataTypeIsArray;
    if (body.items)
        body = body.items;
    if (!body || !body.properties || !((_a = body.properties) === null || _a === void 0 ? void 0 : _a[dataParseName]))
        return outDataTypeIsArray;
    return Object.prototype.hasOwnProperty.call((_b = body.properties) === null || _b === void 0 ? void 0 : _b[dataParseName], 'items');
};
/** 处理请求的return response参数 */
var dealJsonToTsTypeReturn = function (data, interfaceName) {
    var _a, _b;
    if (data === null || data === void 0 ? void 0 : data.items)
        data = data.items;
    if (!data || !data.properties || !Object.keys(data).length)
        return ''; // 空的对象不做处理
    // 统一封装的外部不做解析，从外部的dataParseName开始解析
    var _c = global.apiConfig, dataParseName = _c.dataParseName, isNeedSecondType = _c.isNeedSecondType;
    if (dataParseName && ((_a = data === null || data === void 0 ? void 0 : data.properties) === null || _a === void 0 ? void 0 : _a[dataParseName]))
        return dealJsonToTsTypeReturn((_b = data === null || data === void 0 ? void 0 : data.properties) === null || _b === void 0 ? void 0 : _b[dataParseName], interfaceName);
    if (isNeedSecondType) {
        var types = [];
        dealJsonSchemaArr(data.properties, types, interfaceName);
        return types.reduce(function (pre, cur) {
            pre += getSuitableTsInterface(cur.typeName, cur.typeString);
            return pre;
        }, '');
    }
    else {
        var bodyStr = getTsTypeStr(data.properties);
        if (!bodyStr.length)
            return '';
        return getSuitableTsInterface(interfaceName, bodyStr);
    }
};
/** 获取请求参数（query）传输参数，考虑到query一律是传地址栏，所以type默认设置为string(兼容用req_body_form数据类型) */
var getConfigNoteParams = function (reqQuery, requestName) {
    var paramsStr = '';
    reqQuery.forEach(function (item) {
        var example = getSuitableDefault(item);
        paramsStr += getSuitableTsTypeNote(item.desc, example);
        paramsStr += getSuitableTsType(item.name, (item === null || item === void 0 ? void 0 : item.type) ? getSuitableType(item) : 'string');
    });
    if (!paramsStr)
        return '';
    return getSuitableTsInterface(requestName, paramsStr);
};
/** 处理请求体(data)的逻辑规则 */
var getConfigNoteData = function (data, interfaceName) {
    if (data === null || data === void 0 ? void 0 : data.items)
        data = data.items;
    if (!data || !data.properties || !Object.keys(data).length)
        return ''; // 空的对象不做处理
    var isNeedSecondType = global.apiConfig.isNeedSecondType;
    if (isNeedSecondType) {
        var types = [];
        dealJsonSchemaArr(data.properties, types, interfaceName);
        return types.reduce(function (pre, cur) {
            pre += getSuitableTsInterface(cur.typeName, cur.typeString);
            return pre;
        }, '');
    }
    else {
        var bodyStr = getTsTypeStr(data.properties);
        if (!bodyStr.length)
            return '';
        return getSuitableTsInterface(interfaceName, bodyStr);
    }
};

var JsApiItem = /** @class */ (function (_super) {
    __extends(JsApiItem, _super);
    function JsApiItem(apiItem, project) {
        var _this = _super.call(this, apiItem, project) || this;
        _this.setParamsArr();
        _this.setReturnData();
        _this.setMethodNote();
        _this.setMethodStr();
        return _this;
    }
    JsApiItem.prototype.getIdsData = function () {
        var item = this.apiItem;
        return item.req_params.map(function (item) {
            return {
                name: item.name,
                typeName: 'string | number',
                description: item.desc,
                exInclude: true
            };
        });
    };
    JsApiItem.prototype.getQueryData = function () {
        var item = this.apiItem;
        var name = 'params';
        var typeName = getNoteNameByParamsType(item, name);
        var typeString = getConfigNoteParams$1(item.req_query, typeName);
        return { name: name, typeName: typeName, typeString: typeString };
    };
    JsApiItem.prototype.getBodyData = function () {
        var item = this.apiItem;
        var name = 'data';
        var typeName = getNoteNameByParamsType(item, name);
        /** yapi 传body可能是form传输，也有可能是json传输，这里做一下兼容 */
        if (item.req_body_type === 'form') {
            var typeString_1 = getConfigNoteParams$1(item.req_body_form, typeName);
            return { name: name, typeName: typeName, typeString: typeString_1 };
        }
        var body = getLegalJson(item.req_body_other); // 获取合法的json数据
        var typeString = getJsonToJsDocParams(body, typeName);
        return { name: name, typeName: typeName, typeString: typeString };
    };
    JsApiItem.prototype.setReturnData = function () {
        var item = this.apiItem;
        var name = 'response';
        var interfaceName = getNoteNameByParamsType(item, name);
        var body = getLegalJson(item.res_body); // 获取合法的json数据
        var typeString = dealJsonToJsDocReturn(body, interfaceName);
        var typeName = getTypeName(interfaceName, body, typeString);
        this.returnData = { name: name, typeName: typeName, typeString: typeString };
    };
    JsApiItem.prototype.setParamsArr = function () {
        var item = this.apiItem;
        this.paramsArr = this.paramsArr.concat(this.getIdsData());
        var hasParamsQuery = Array.isArray(item.req_query) && Boolean(item.req_query.length);
        if (hasParamsQuery)
            this.paramsArr.push(this.getQueryData());
        var hasParamsBody = item.req_body_other || item.req_body_form.length;
        if (hasParamsBody)
            this.paramsArr.push(this.getBodyData());
        var isNeedAxiosType = global.apiConfig.isNeedAxiosType;
        this.paramsArr.push({
            name: 'options',
            typeName: isNeedAxiosType ? getAxiosOptionTypeName() : 'any',
            exInclude: true
        });
    };
    JsApiItem.prototype.getNoteParams = function () {
        var noteParamsStr = '';
        this.paramsArr.forEach(function (item) {
            if (!global.apiConfig.isNeedType && item.typeName === 'any')
                return;
            noteParamsStr += "\n * @param { ".concat(item.typeName, " } ").concat(item.name);
        });
        return noteParamsStr;
    };
    JsApiItem.prototype.getReturnParamsStr = function () {
        if (!global.apiConfig.isNeedType)
            return '';
        return "\n * @return { Promise<".concat(getReturnType(this.returnData.typeName, this.returnData.typeString), "> }");
    };
    JsApiItem.prototype.setMethodNote = function () {
        var item = this.apiItem;
        this.methodNote = "/**\n * @description ".concat(item.title).concat(this.getNoteParams(), "\n * @apiUpdateTime ").concat(getUpdateTime(item.up_time), "\n * @link ").concat(getApiLinkAddress(item.project_id, item._id)).concat(this.getReturnParamsStr(), "\n */");
    };
    JsApiItem.prototype.getAppendRequestParamsJsdoc = function () {
        var _this = this;
        var methodParamsStr = this.paramsArr.reduce(function (pre, cur, index) {
            return pre += "".concat(cur.name).concat(index === _this.paramsArr.length - 1 ? '' : ', ');
        }, '');
        return "(".concat(methodParamsStr).concat(getCustomerParamsStr(this.project), ")");
    };
    JsApiItem.prototype.setMethodStr = function () {
        var requestParams = this.getAppendRequestParamsJsdoc();
        var appendParamsStr = this.paramsArr.reduce(function (pre, cur) {
            if (cur.exInclude)
                return pre;
            return pre += "".concat(cur.name, ", ");
        }, '');
        this.methodStr = getMainRequestMethodStr(this.project, this.apiItem, requestParams, appendParamsStr);
    };
    return JsApiItem;
}(ApiItem));

var TsApiItem = /** @class */ (function (_super) {
    __extends(TsApiItem, _super);
    function TsApiItem(apiItem, project) {
        var _this = _super.call(this, apiItem, project) || this;
        _this.setParamsArr();
        _this.setReturnData();
        _this.setMethodNote();
        _this.setMethodStr();
        return _this;
    }
    TsApiItem.prototype.getIdsData = function () {
        var item = this.apiItem;
        return item.req_params.map(function (item) {
            return {
                name: item.name,
                typeName: 'string | number',
                description: item.desc,
                exInclude: true
            };
        });
    };
    TsApiItem.prototype.getQueryData = function () {
        var item = this.apiItem;
        var name = 'params';
        var typeName = getNoteNameByParamsType(item, name);
        var typeString = getConfigNoteParams(item.req_query, typeName);
        return { name: name, typeName: typeName, typeString: typeString };
    };
    TsApiItem.prototype.getBodyData = function () {
        var item = this.apiItem;
        var name = 'data';
        var interfaceName = getNoteNameByParamsType(item, name);
        /** yapi 传body可能是form传输，也有可能是json传输，这里做一下兼容 */
        if (item.req_body_type === 'form') {
            var typeString_1 = getConfigNoteParams(item.req_body_form, interfaceName);
            return { name: name, typeName: interfaceName, typeString: typeString_1 };
        }
        var body = getLegalJson(item.req_body_other); // 获取合法的json数据
        var typeString = getConfigNoteData(body, interfaceName);
        var typeName = getTypeName(interfaceName, body, typeString);
        return { name: name, typeName: typeName, typeString: typeString };
    };
    TsApiItem.prototype.setReturnData = function () {
        var item = this.apiItem;
        var name = 'response';
        var interfaceName = getNoteNameByParamsType(item, name);
        var body = getLegalJson(item.res_body); // 获取合法的json数据
        var typeString = dealJsonToTsTypeReturn(body, interfaceName);
        var typeName = getTypeName(interfaceName, body, typeString);
        this.returnData = { name: name, typeName: typeName, typeString: typeString };
    };
    TsApiItem.prototype.setParamsArr = function () {
        var item = this.apiItem;
        this.paramsArr = this.paramsArr.concat(this.getIdsData());
        var hasParamsQuery = Array.isArray(item.req_query) && Boolean(item.req_query.length);
        if (hasParamsQuery)
            this.paramsArr.push(this.getQueryData());
        var hasParamsBody = item.req_body_other || item.req_body_form.length;
        if (hasParamsBody)
            this.paramsArr.push(this.getBodyData());
        this.paramsArr.push({
            name: 'options',
            typeName: getAxiosOptionTypeName(),
            exInclude: true
        });
    };
    TsApiItem.prototype.getAppendRequestParamsTsType = function () {
        var _this = this;
        var methodParamsStr = this.paramsArr.reduce(function (pre, cur, index) {
            var typeStr = !global.apiConfig.isNeedType ? '' : "?: ".concat(cur.typeName);
            return pre += "".concat(cur.name).concat(typeStr).concat(index === _this.paramsArr.length - 1 ? '' : ', ');
        }, '');
        return "(".concat(methodParamsStr).concat(getCustomerParamsStr(this.project), ")");
    };
    TsApiItem.prototype.setMethodNote = function () {
        var item = this.apiItem;
        this.methodNote = "/**\n * @description ".concat(item.title, "\n * @apiUpdateTime ").concat(getUpdateTime(item.up_time), "\n * @link ").concat(getApiLinkAddress(item.project_id, item._id), "\n */");
    };
    TsApiItem.prototype.setMethodStr = function () {
        var item = this.apiItem;
        var requestParams = this.getAppendRequestParamsTsType();
        var appendParamsStr = this.paramsArr.reduce(function (pre, cur) {
            if (cur.exInclude)
                return pre;
            return pre += "".concat(cur.name, ", ");
        }, '');
        this.methodStr = getMainRequestMethodStr(this.project, item, requestParams, appendParamsStr, this.returnData.typeName);
    };
    return TsApiItem;
}(ApiItem));

export { JsApiItem, TsApiItem };
