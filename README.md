# srs-rtc-server
基于SRS视频服务器实现简易音视频通话系统——信令服务器

## 前言
一个基于Node.js、MySQL、Socket.io等实现的具有用户注册、角色管理、音视频通话管理的信令服务器。

## 系统组成
- 信令服务器[srs-rtc-server](https://github.com/shenbengit/srs-rtc-server) 
- Android客户端[SrsRtcAndroidClient](https://github.com/shenbengit/SrsRtcAndroidClient) 
- Web客户端[srs-rtc-web-client](https://github.com/shenbengit/srs-rtc-web-client) （功能开发中...）

## 系统结构
角色划分：
- 管理员：管理员注册、登录、连接信令服务器，支持查看当前客户端会见房间信息、发起、结束通话等功能；（功能完善开发中...）
- 客户端：客户端注册、登录、连接信令服务器，支持私聊、群聊、聊天室功能。

## 目录结构
```
asd
```

## Getting Started

### 运行环境
- 安装**MySQL**（必须安装）
- 安装**Node.js**（如果运行方式使用的是Docker，则可不装）

### 配置Mysql
将[srs_rtc.sql](https://github.com/shenbengit/srs-rtc-server/blob/master/db/srs_rtc.sql)导入MySQL中。

### 配置文件修改
- 修改[config.yml](https://github.com/shenbengit/srs-rtc-server/blob/master/config/config.yml)中的配置文件；    
- 其中**mysqlConfig**中的host、port、user、password、database为必须修改项，根据自己的实际环境进行修改。
- 其他选项可根据自己需求自行调整；
> [cert](https://github.com/shenbengit/srs-rtc-server/tree/master/cert)目录中是自签的SSL证书，用于启用HTTPS，您也可以自行修改证书文件，但同时也要修改配置文件中**ssl**里的keyPath和pemPath的路径。
### 启动服务
#### Node.js
```shell
npm install

node start
```
#### Yarn
```shell
yarn

yarn start
```
#### Docker
安装**docker-compose**.

```shell
cd srs-rtc-server

docker-compose up -d
```
### 查看服务是否启动成功
```shell
.\srs-rtc-server> yarn start
yarn run v1.22.17
$ node app.js
config.yml: {
  mysqlConfig: {
    host: 'localhost',
    port: 3306,
    user: 'srs_rtc',
    password: '123456',
    database: 'srs_rtc'
  },
  apiConfig: { httpPort: 9898, httpsPort: 9899 },
  socketIoConfig: { httpPort: 9998, httpsPort: 9999 },
  ssl: { keyPath: './cert/server.key', pemPath: './cert/server.pem' },
  maxSizeOfRoom: 9
}
ApiHttpServer listen: 9898
ApiHttpsServer listen: 9899
SignalHttpServer listen: 9998
SignalHttpsServer listen: 9999

```
打印上面这个日志，表示成功启动。

## 文档
### Api接口文档
用户注册、登录、信息查询等接口；    
[在线文档](https://www.eolink.com/share/index?shareCode=NN6pDm)
