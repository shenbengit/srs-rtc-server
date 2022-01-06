const CODE_SUCCESS = 1
const MSG_SUCCESS = "success"

class BaseModel {
    constructor(code, msg, data) {
        this.code = code;
        this.msg = msg;
        if (data) {
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

module.exports = {
    SuccessModel,
    ErrorModel
}