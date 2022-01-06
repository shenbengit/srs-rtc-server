const fs = require("fs");
const Express = require("express");
const httpsApi = require('https');
const httpApi = require('http');
const app = new Express();

const {execSql} = require('./src/db/mysql');
const {SuccessModel, ErrorModel} = require('./src/model/responseModel');
//读取参数配置文件
const config = require('./src/config/config').parseConfig;
//ssl证书相关
const sslOptions = {
    key: fs.readFileSync(config.ssl.keyPath),
    cert: fs.readFileSync(config.ssl.pemPath)
};

const apiConfig = config.apiConfig;

app.get("/getAllUser", function (req, res) {
    execSql("select * from db_user").then(result => {
        res.send(new SuccessModel(result))
    }).catch(error => {
        //数据库操作异常
        res.send(new ErrorModel(error.errno, error.code))
    });
});

const httpApiServer = httpApi.createServer(app);
const httpsApiServer = httpsApi.createServer(sslOptions, app);

httpApiServer.listen(apiConfig.httpPort, function () {
    console.log("httpApiServer listen: ", apiConfig.httpPort)
});
httpsApiServer.listen(apiConfig.httpsPort, function () {
    console.log("httpsApiServer listen: ", apiConfig.httpsPort)
});
