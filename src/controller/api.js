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
morgan.token('localDate', function getDate(req) {
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

const {getAllUser, getUserByUserId, insertUser, updateUser} = require('./user');
const {USER_PATH} = require("../constant/apiConstant");

const {
    SuccessModel,
    ErrorModel,
    ParamMissingErrorModel,
    BodyMissingErrorModel,
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
app.get(USER_PATH.GET_ALL_USER, function (req, res) {
    getAllUser().then(result => {
        res.json(new SuccessModel(result));
    }).catch(error => {
        //数据库操作异常
        res.json(DBErrorModel(error));
    });
});
//判断userId是否可用
app.post(USER_PATH.CHECK_USER_ID, function (req, res) {
    const userId = req.body.userId;
    if (userId) {
        getUserByUserId(userId).then(result => {
            if (result.length) {
                res.json(new ErrorModel(0, "userId [" + userId + "] already exists."));
            } else {
                res.json(new SuccessModel());
            }
        }).catch(error => {
            //数据库操作异常
            res.json(DBErrorModel(error));
        });
    } else {
        res.status(400).json(new BodyMissingErrorModel("userId"));
    }
})

//根据userId获取用户信息
app.get(USER_PATH.GET_USER_BY_USER_ID, function (req, res) {
    const userId = req.query.userId;
    if (userId) {
        getUserByUserId(userId).then(result => {
            if (result.length) {
                if (result.length === 1) {
                    //仅存在一条数据
                    res.json(new SuccessModel(result[0]));
                } else {
                    //存在多条数据
                    res.json(new ErrorModel(2, "userId [" + userId + "] data.length: " + result.length));
                }
            } else {
                res.json(new ErrorModel(0, "userId [" + userId + "] don't exists."));
            }
        }).catch(error => {
            //数据库操作异常
            res.json(DBErrorModel(error));
        });
    } else {
        res.status(400).json(new ParamMissingErrorModel("userId"));
    }
})

//注册用户
app.post(USER_PATH.INSERT_USER, function (req, res) {
    let userId = req.body.userId;
    let username = req.body.username;
    let password = req.body.password;
    if (userId && username && password) {
        insertUser(userId, username, password).then(result => {
            res.json(new SuccessModel());
        }).catch(error => {
            //数据库操作异常
            res.json(DBErrorModel(error));
        });
    } else {
        res.status(400).json(new BodyMissingErrorModel("userId,username,password"));
    }
})

//更新用户信息，字段存在则更新，不存在则不处理
app.post(USER_PATH.UPDATE_USER, function (req, res) {
    let userId = req.body.userId;
    let username = req.body.username;
    let password = req.body.password;
    if (userId) {
        if (username || password) {
            updateUser(userId, username, password).then(result => {
                if (result.affectedRows) {
                    //影响行数
                    res.json(new SuccessModel());
                } else {
                    res.json(new ErrorModel(0, "userId [" + userId + "] don't exists."));
                }
            }).catch(error => {
                //数据库操作异常
                res.json(DBErrorModel(error));
            });
        } else {
            res.status(400).json(new BodyMissingErrorModel("username OR password"));
        }
    } else {
        res.status(400).json(new BodyMissingErrorModel("userId"));
    }
})


/**
 * 启动api服务
 */
function startApiServer() {
    httpApiServer.listen(apiConfig.httpPort, function () {
        console.log("httpApiServer listen: " + apiConfig.httpPort);
    });
    httpsApiServer.listen(apiConfig.httpsPort, function () {
        console.log("httpsApiServer listen: " + apiConfig.httpsPort);
    });
}

module.exports = {
    startApiServer
}