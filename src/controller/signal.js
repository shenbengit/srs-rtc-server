const {Server} = require("socket.io")
const fs = require("fs");
const Express = require("express");
const app = new Express()

//读取参数配置文件
const config = require('../config/config').parseConfig;
//ssl证书相关
const sslOptions = {
    key: fs.readFileSync(config.ssl.keyPath),
    cert: fs.readFileSync(config.ssl.pemPath)
};

const {
    USER_TYPE_CLIENT,
    USER_TYPE_ADMINISTRATOR,
    getUserInfo,
} = require('./user');

const {SuccessModel, ErrorModel, DBErrorModel, BodyMissingErrorModel} = require("../model/responseModel");

const socketIoConfig = config.socketIoConfig;

const httpServer = require('http').createServer(app);
const httpsServer = require('https').createServer(sslOptions, app);

const ioServer = new Server({
    cors: {
        credentials: false
    }
})

ioServer.attach(httpServer)
ioServer.attach(httpsServer)

/**
 * 所有客户端加入的房间名称
 * @type {string}
 */
const CLIENTS_ROOM = "clients_room";
/**
 * 所有管理终端加入的房间名称
 * @type {string}
 */
const ADMINISTRATORS_ROOM = "administrators_room"

/**
 * 管理端请求事件
 * @type {{}}
 */
const ADMINISTRATORS_REQ_CMD = {}

/**
 * 管理员通知事件
 * @type {{}}
 */
const ADMINISTRATORS_NOTIFY_CMD = {
    /**
     * 通知管理员用户，有客户端上线
     */
    NOTIFY_CLIENT_ONLINE: "notify_client_online",
    /**
     * 通知管理员用户，有客户端下线
     */
    NOTIFY_CLIENT_OFFLINE: "notify_client_offline"
};
/**
 * 客户端请求事件
 * @type {{}}
 */
const CLIENT_REQ_CMD = {}
/**
 * 客户端通知事件
 * @type {{}}
 */
const CLIENT_NOTIFY_CMD = {};

/**
 * 连接前进行校验
 * @param socket
 * @param next
 * @param userType
 */
function socketAuthentication(socket, next, userType) {
    const query = socket.handshake.query;
    const userId = query.userId;
    if (!userId) {
        next(new Error("Missing param : [userId]."));
        return;
    }
    //查询用户信息
    getUserInfo(userId, userType).then(result => {
        if (result.length) {
            if (result.length === 1) {
                //保存用户信息
                socket.userInfo = result[0];
                //可以连接
                next();
            } else {
                //存在多条数据
                next(new Error(`userId: [${userId}] data.length: ${result.length}.`));
            }
        } else {
            //不存在数据
            next(new Error(`user info: userId[${userId}] doesn't exists.`));
        }
    }).catch(error => {
        //数据库连接失败
        next(new Error("failed to query the database."));
    });
}

/**
 * 连接地址
 * ws://ip:port/srs_rtc/signal/administrator?userId=xxx
 * wss://ip:port/srs_rtc/signal/administrator?userId=xxx
 * http://ip:port/srs_rtc/signal/administrator?userId=xxx
 * https://ip:port/srs_rtc/signal/administrator?userId=xxx
 */
const administratorNamespace = ioServer.of("/srs_rtc/signal/administrator")
    .use((socket, next) => {
        //校验管理员信息
        socketAuthentication(socket, next, USER_TYPE_ADMINISTRATOR)
    });

/**
 * 连接地址
 * ws://ip:port/srs_rtc/signal/client?userId=xxx
 * wss://ip:port/srs_rtc/signal/client?userId=xxx
 * http://ip:port/srs_rtc/signal/client?userId=xxx
 * https://ip:port/srs_rtc/signal/client?userId=xxx
 */
const clientNamespace = ioServer.of("/srs_rtc/signal/client")
    .use((socket, next) => {
        //校验客户端信息
        socketAuthentication(socket, next, USER_TYPE_CLIENT)
    });

//管理端连接
administratorNamespace.on("connection", function (socket) {
    //单点登记
});

//客户端连接
clientNamespace.on("connection", function (socket) {
    // socket.disconnect(false)
    //通知管理终端有客户端上线
    administratorNamespace.emit(ADMINISTRATORS_NOTIFY_CMD.NOTIFY_CLIENT_ONLINE, socket.userInfo)

    console.log("客户端登录：", socket.userInfo)
});


/**
 * 启动api服务
 */
function startSignalServer() {
    httpServer.listen(socketIoConfig.httpPort, function () {
        console.log("SignalHttpServer listen: " + socketIoConfig.httpPort);
    });
    httpsServer.listen(socketIoConfig.httpsPort, function () {
        console.log("SignalHttpsServer listen: " + socketIoConfig.httpsPort);
    });
}

module.exports = {
    startSignalServer
}
