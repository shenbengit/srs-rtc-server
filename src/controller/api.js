const HEADER_USER_TYPE = "user-type"
const HEADER_USER_ID = "user-id"

const fs = require("fs");
const morgan = require('morgan');
const Express = require("express");
const httpsApi = require('https');
const httpApi = require('http');
const app = new Express();

// 自定义跨域中间件
const allowCors = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
};
//格式化本地时间
morgan.token('localDate', function getDate() {
    return new Date().toString()
})
morgan.format("common", ":remote-addr - :remote-user [:localDate] \":method :url HTTP/:http-version\" :status :res[content-length]")
//日志打印
app.use(morgan('common'));
//跨域
app.use(allowCors)
//添加对post请求Body参数的解析
app.use(Express.json());
app.use(Express.urlencoded({extended: false}));

const {
    USER_TYPE_CLIENT,
    USER_TYPE_ADMINISTRATOR,
    getAllUser,
    getUserInfo,
    verifyUserInfo,
    insertUser,
    updateUser,
    deleteUser
} = require('./user');
const {USER_PATH} = require("../constant/apiConstant");

const {
    SuccessModel,
    ErrorModel,
    ParamMissingErrorModel,
    BodyMissingErrorModel,
    HeaderMissingErrorModel,
    DBErrorModel
} = require('../model/responseModel');

//读取参数配置文件
const config = require('../config/config').parseConfig;
//ssl证书相关
const sslOptions = {
    key: fs.readFileSync(config.ssl.keyPath),
    cert: fs.readFileSync(config.ssl.pemPath)
};

const apiConfig = config.apiConfig;
const httpApiServer = httpApi.createServer(app);
const httpsApiServer = httpsApi.createServer(sslOptions, app);

//查询所有用户信息
app.get(USER_PATH.GET_ALL_USER_INFO, function (req, res) {
    //未设置则指定类型为客户端
    const userType = (req.header(HEADER_USER_TYPE) || USER_TYPE_CLIENT);

    if (userType === USER_TYPE_CLIENT || userType === USER_TYPE_ADMINISTRATOR) {
        if (userType === USER_TYPE_ADMINISTRATOR) {
            //如果是管理员账户，还需要用户id
            const userId = req.header(HEADER_USER_ID)
            if (userId) {
                //判断用户id真实性
                getUserInfo(userId, userType).then(result => {
                    if (result.length) {
                        //人员存在
                        getAllUser(userType).then(result => {
                            res.json(new SuccessModel(result));
                        }).catch(error => {
                            //数据库操作异常
                            res.json(DBErrorModel(error));
                        });
                    } else {
                        //管理员用户不存在
                        res.json(new ErrorModel(-1, `admin: user_id[${userId}] doesn't exists.`));
                    }
                }).catch(error => {
                    //数据库操作异常
                    res.json(DBErrorModel(error));
                });
            } else {
                res.status(400).json(new HeaderMissingErrorModel(HEADER_USER_ID));
            }
            return
        }
        //仅查询客户端信息
        getAllUser(userType).then(result => {
            res.json(new SuccessModel(result));
        }).catch(error => {
            //数据库操作异常
            res.json(DBErrorModel(error));
        });
    } else {
        //用户类型错误
        res.json(new ErrorModel(0, `header [${HEADER_USER_TYPE}] value:[${userType}] is wrong, must be one of [${USER_TYPE_CLIENT}, ${USER_TYPE_ADMINISTRATOR}].`));
    }
});

//判断userId是否可用
app.post(USER_PATH.CHECK_USER_ID, function (req, res) {
    let userType = req.body.userType;
    const userId = req.body.userId;

    if (!userType) {
        res.status(400).json(new BodyMissingErrorModel("userType"));
        return
    }
    if (!userId) {
        res.status(400).json(new BodyMissingErrorModel("userId"));
        return;
    }
    userType = userType.toString();
    if (userType === USER_TYPE_CLIENT || userType === USER_TYPE_ADMINISTRATOR) {
        getUserInfo(userId, userType).then(result => {
            if (result.length) {
                res.json(new ErrorModel(0, `userId: [${userId}] and userType: [${userType}] already exists.`));
            } else {
                res.json(new SuccessModel());
            }
        }).catch(error => {
            //数据库操作异常
            res.json(DBErrorModel(error));
        });
    } else {
        //用户类型错误
        res.json(new ErrorModel(0, `userType :[${userType}] is wrong, must be one of [${USER_TYPE_CLIENT}, ${USER_TYPE_ADMINISTRATOR}].`));
    }
})

//根据userId获取用户信息
app.get(USER_PATH.GET_USER_INFO, function (req, res) {
    const userId = req.query.userId;
    let userType = req.query.userType;
    if (!userId) {
        res.status(400).json(new ParamMissingErrorModel("userId"));
        return
    }
    if (!userType) {
        res.status(400).json(new ParamMissingErrorModel("userType"));
        return
    }
    userType = userType.toString();
    if (userType === USER_TYPE_CLIENT || userType === USER_TYPE_ADMINISTRATOR) {
        getUserInfo(userId, userType).then(result => {
            if (result.length) {
                if (result.length === 1) {
                    //仅存在一条数据
                    res.json(new SuccessModel(result[0]));
                } else {
                    //存在多条数据
                    res.json(new ErrorModel(0, `userId: [${userId}] and userType: [${userType}] data.length: ${result.length}.`));
                }
            } else {
                res.json(new ErrorModel(0, `user info: userId[${userId}] and userType[${userType}] doesn't exists.`));
            }
        }).catch(error => {
            //数据库操作异常
            res.json(DBErrorModel(error));
        });
    } else {
        //用户类型错误
        res.json(new ErrorModel(0, `userType :[${userType}] is wrong, must be one of [${USER_TYPE_CLIENT}, ${USER_TYPE_ADMINISTRATOR}].`));
    }
})

//注册用户
app.post(USER_PATH.INSERT_USER, function (req, res) {
    const userId = req.body.userId;
    const username = req.body.username;
    const password = req.body.password;
    let userType = req.body.userType;
    if (userId && username && password && userType) {
        userType = userType.toString();
        if (userType === USER_TYPE_CLIENT || userType === USER_TYPE_ADMINISTRATOR) {
            insertUser(userId, username, password, userType).then(result => {
                if (result.affectedRows === 1) {
                    // const insertId = result.insertId;
                    //影响行数
                    res.json(new SuccessModel());
                } else {
                    res.json(new ErrorModel(-1, "insert failure."));
                }
            }).catch(error => {
                //数据库操作异常
                res.json(DBErrorModel(error));
            });
        } else {
            //用户类型错误
            res.json(new ErrorModel(0, `userType :[${userType}] is wrong, must be one of [${USER_TYPE_CLIENT}, ${USER_TYPE_ADMINISTRATOR}].`));
        }
    } else {
        res.status(400).json(new BodyMissingErrorModel("userId,username,password,userType"));
    }
})

//更新用户信息，字段存在则更新，不存在则不处理
app.post(USER_PATH.UPDATE_USER, function (req, res) {
    const userId = req.body.userId;
    const username = req.body.username;
    const password = req.body.password;
    let userType = req.body.userType;
    if (!userId) {
        res.status(400).json(new ParamMissingErrorModel("userId"));
        return
    }
    if (!userType) {
        res.status(400).json(new ParamMissingErrorModel("userType"));
        return
    }
    userType = userType.toString();
    if (username || password) {
        if (userType === USER_TYPE_CLIENT || userType === USER_TYPE_ADMINISTRATOR) {
            updateUser(userId, username, password, userType).then(result => {
                if (result.affectedRows) {
                    //影响行数
                    res.json(new SuccessModel());
                } else {
                    res.json(new ErrorModel(0, `user info: userId[${userId}] and userType[${userType}] doesn't exists.`));
                }
            }).catch(error => {
                //数据库操作异常
                res.json(DBErrorModel(error));
            });
        } else {
            //用户类型错误
            res.json(new ErrorModel(0, `userType :[${userType}] is wrong, must be one of [${USER_TYPE_CLIENT}, ${USER_TYPE_ADMINISTRATOR}].`));
        }
    } else {
        res.status(400).json(new BodyMissingErrorModel("username OR password"));
    }
})

//用户登录
app.post(USER_PATH.USER_LOGIN, function (req, res) {
    const userId = req.body.userId;
    const password = req.body.password;
    let userType = req.body.userType;
    if (!userId) {
        res.status(400).json(new ParamMissingErrorModel("userId"));
        return
    }
    if (!password) {
        res.status(400).json(new ParamMissingErrorModel("password"));
        return
    }
    if (!userType) {
        res.status(400).json(new ParamMissingErrorModel("userType"));
        return
    }
    userType = userType.toString();
    if (userType === USER_TYPE_CLIENT || userType === USER_TYPE_ADMINISTRATOR) {
        verifyUserInfo(userId, userType, password).then(result => {
            if (result.length) {
                if (result.length === 1) {
                    //仅存在一条数据
                    res.json(new SuccessModel(result[0]));
                } else {
                    //存在多条数据
                    res.json(new ErrorModel(0, `userId: [${userId}] and userType: [${userType}] data.length: ${result.length}.`));
                }
            } else {
                res.json(new ErrorModel(0, "wrong username or password."));
            }
        }).catch(error => {
            //数据库操作异常
            res.json(DBErrorModel(error));
        });
    } else {
        //用户类型错误
        res.json(new ErrorModel(0, `userType :[${userType}] is wrong, must be one of [${USER_TYPE_CLIENT}, ${USER_TYPE_ADMINISTRATOR}].`));
    }
})
//删除用户
app.post(USER_PATH.DELETE_USER, function (req, res) {
    const userId = req.body.userId;
    let userType = req.body.userType;
    if (!userId) {
        res.status(400).json(new ParamMissingErrorModel("userId"));
        return
    }
    if (!userType) {
        res.status(400).json(new ParamMissingErrorModel("userType"));
        return
    }
    userType = userType.toString();
    if (userType === USER_TYPE_CLIENT || userType === USER_TYPE_ADMINISTRATOR) {
        deleteUser(userId, userType).then(result => {
            console.log("delete： ",result)
            if (result.affectedRows) {
                res.json(new SuccessModel());
            } else {
                res.json(new ErrorModel(0, `user info: userId[${userId}] and userType[${userType}] doesn't exists.`));
            }
        }).catch(error => {
            //数据库操作异常
            res.json(DBErrorModel(error));
        });
    } else {
        //用户类型错误
        res.json(new ErrorModel(0, `userType :[${userType}] is wrong, must be one of [${USER_TYPE_CLIENT}, ${USER_TYPE_ADMINISTRATOR}].`));
    }
})

/**
 * 启动api服务
 */
function startApiServer() {
    httpApiServer.listen(apiConfig.httpPort, function () {
        console.log("HttpApiServer listen: " + apiConfig.httpPort);
    });
    httpsApiServer.listen(apiConfig.httpsPort, function () {
        console.log("HttpsApiServer listen: " + apiConfig.httpsPort);
    });
}

module.exports = {
    startApiServer
}