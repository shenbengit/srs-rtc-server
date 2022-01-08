const CODE_SUCCESS = 1
const MSG_SUCCESS = "success"
/**
 * 数据库相关错误码
 *
 * @type {number}
 */
const DB_ERROR_CODE = -1

class BaseModel {
    constructor(code, msg, data) {
        if (code !== null && code !== undefined) {
            this.code = code
        }
        if (msg !== null && msg !== undefined) {
            this.msg = msg;
        }
        if (data !== null && data !== undefined) {
            this.data = data;
        }
    }
}

/**
 * 成功状态
 */
class SuccessModel extends BaseModel {
    constructor(data) {
        super(CODE_SUCCESS, MSG_SUCCESS, data);
    }
}

/**
 * 异常状态
 */
class ErrorModel extends BaseModel {
    constructor(code, msg) {
        super(code, msg, null);
    }
}

class ParamMissingErrorModel extends ErrorModel {
    constructor(paramName) {
        super(null, "Missing param [" + paramName + "] for method parameter.");
    }
}

class BodyMissingErrorModel extends ErrorModel {
    constructor(paramName) {
        super(null, "RequestBody is missing : [" + paramName + "].");
    }
}


const DBErrorModel = (error) => {
    if (error.sqlMessage) {
        return new ErrorModel(DB_ERROR_CODE, error.code + ": " + error.sqlMessage)
    } else {
        return new ErrorModel(DB_ERROR_CODE, error.code)
    }
}

module.exports = {
    SuccessModel,
    ErrorModel,
    ParamMissingErrorModel,
    BodyMissingErrorModel,
    DBErrorModel
}