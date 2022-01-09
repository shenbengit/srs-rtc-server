const {startApiServer} = require("./src/controller/api")
const {startSignalServer} = require("./src/controller/signal")
//启动api服务
startApiServer()

//启动信令服务
startSignalServer()