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
    USER_TYPE_ADMIN,
    getUserInfo,
} = require('./user');

const {SuccessModel, ErrorModel} = require("../model/responseModel");

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

const socketServer = ioServer.of("/srs_rtc/signal")
//连接
socketServer.on("connection", function (socket) {
    const query = socket.handshake.query;
    const userId = query.userId;
    const userType = query.userType;
    if (!userId || !userType) {

        return
    }
    //验证身份
    getUserInfo(userId, userType).then(result => {
        if (result.length) {
            if (result.length === 1) {
                //仅存在一条数据

            } else {
                //存在多条数据
               aaa()
            }
        } else {
            //不存在数据
        }
    }).catch(error => {
        //数据库连接失败

    });

    console.log("socket connection", query.userId, query.userType)
})


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
