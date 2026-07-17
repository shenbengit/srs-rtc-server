# srs-rtc-server
基于[SRS](https://github.com/ossrs/srs)视频服务器实现简易音视频通话系统——信令服务器

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
.srs-rtc-server
├── app.js --服务启动入口
├── cert --SSL证书相关文件
│   ├── server.key
│   └── server.pem
├── config -配置文件目录
│   └── config.yml -配置文件
├── db --数据库文件目录
│   └── srs_rtc.sql --sql文件
├── docker-build-cmd.txt --创建docker镜像命令，弃用。
├── docker-compose.yml --docker-compose.yml
├── Dockerfile --Dockerfile
├── package.json --package.json
├── package-lock.json --package-lock.json
├── README.md --README.md
├── src --源码
│   ├── config 
│   │   └── config.js --读取config.yml配置文件
│   ├── constant
│   │   ├── apiConstant.js --Api服务相关常量
│   │   └── signalConstant.js --信令服务相关常量
│   ├── controller
│   │   ├── api.js --api接口服务相关
│   │   ├── signal.js --信令服务相关
│   │   └── user.js --封装的一些操作用户数据库相关方法
│   ├── db
│   │   └── mysql.js --数据库连接、查询工具类
│   └── model
│       └── responseModel.js --请求返回公共基类
└── yarn.lock --yarn.lock

```

## Getting Started

### 运行环境
- Docker 方式只需安装 **Docker Desktop / Docker Compose**，MySQL、SRS 和 Node.js 均由容器提供。
- 本地运行方式仍需安装 **MySQL** 和 **Node.js**。

### 配置Mysql
将[srs_rtc.sql](https://github.com/shenbengit/srs-rtc-server/blob/master/db/srs_rtc.sql)导入MySQL中。
### 部署SRS
部署步骤详见[SRS-Wiki](https://github.com/ossrs/srs/wiki/v4_CN_Home#getting-started)，启用WebRTC。

### 配置文件修改
- 修改[config.yml](https://github.com/shenbengit/srs-rtc-server/blob/master/config/config.yml)中的配置文件；    
- 其中**mysqlConfig**中的host、port、user、password、database为必须修改项，根据自己的实际环境进行修改。
- 其他选项可根据自己需求自行调整；
> [cert](https://github.com/shenbengit/srs-rtc-server/tree/master/cert)目录中是自签的SSL证书，用于启用HTTPS，您也可以自行修改证书文件，但同时也要修改配置文件中**ssl**里的keyPath和pemPath的路径。
### 启动服务
#### Node.js
```shell
npm install

npm start
```
#### Yarn
```shell
yarn

yarn start
```
#### Docker
```shell
cd srs-rtc-server

docker compose up -d --build
```

Compose 会自动启动并连接以下服务：

- `mysql`：首次启动时自动创建 `srs_rtc` 数据库并导入 `db/srs_rtc.sql`。
- `srs`：启用 RTMP、HTTP API、HTTP Server，以及 WebRTC UDP/TCP 推拉流。
- `srs-rtc-server`：信令与 API 服务，通过容器服务名连接 MySQL。

SRS 配置文件位于 `srs/srs.conf`，已挂载到容器内，可直接在宿主机修改后重启 SRS：

```shell
docker compose restart srs
```

WebRTC 必须向客户端返回可访问的宿主机 IP。局域网或公网访问时，请通过环境变量设置该 IP：

```shell
$env:SRS_CANDIDATE="192.168.1.100"
docker compose up -d --build
```

默认端口：MySQL `3306`、SRS RTMP `1935`、HTTP API/WHIP/WHEP `1985`、HTTP Server `8080`、WebRTC `8000/udp` 和 `8000/tcp`。所有端口和数据库账号均可通过 `docker-compose.yml` 中对应的环境变量覆盖。

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
### Api接口文档（支持http、https）
用户注册、登录、信息查询等接口；    
[在线文档](https://www.eolink.com/share/index?shareCode=NN6pDm)

### 信令文档
#### 管理员（开发中...）
- 连接地址：
```
ws://ip:port/srs_rtc/signal/administrator?userId=xxx
wss://ip:port/srs_rtc/signal/administrator?userId=xxx
http://ip:port/srs_rtc/signal/administrator?userId=xxx
https://ip:port/srs_rtc/signal/administrator?userId=xxx
```

#### 客户端
- 连接地址：
```
ws://ip:port/srs_rtc/signal/client?userId=xxx
wss://ip:port/srs_rtc/signal/client?userId=xxx
http://ip:port/srs_rtc/signal/client?userId=xxx
https://ip:port/srs_rtc/signal/client?userId=xxx
```

## [LICENSE](https://github.com/shenbengit/srs-rtc-server/blob/master/LICENSE)
