/**
 * 房间号前缀
 * @type {string}
 */
const ROOM_PREFIX = "srs_rtc_"
/**
 * 所有客户端加入的房间名称
 * @type {string}
 */
const CLIENTS_ROOM = "clients_room";
/**
 * 所有管理终端加入的房间名称
 * @type {string}
 */
const ADMINISTRATORS_ROOM = "administrators_room";

/**
 * 通话状态
 */
const CALL_STATUS = {
    /**
     * 空闲状态
     *
     */
    IDLE: 1, /**
     * 拨号中状态
     */
    DIALING: 2, /**
     * 通话中状态
     */
    CALLING: 3
};


/**
 * 管理端请求事件
 * @type {{}}
 */
const ADMINISTRATORS_REQ_CMD = {};

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
    NOTIFY_CLIENT_OFFLINE: "notify_client_offline",
    /**
     * 单点登录：强制下线
     */
    NOTIFY_FORCED_OFFLINE: "notify_forced_offline",
};
/**
 * 客户端请求事件
 * @type {{}}
 */
const CLIENT_REQ_CMD = {
    /**
     * 邀请一个人，并创建房间 ——> 单聊
     */
    REQ_INVITE_SOMEONE: "req_invite_someone",
    /**
     * 邀请一些人，并创建房间 ——> 群聊
     */
    REQ_INVITE_SOME_PEOPLE: "req_invite_some_people",
    /**
     * 邀请一个人进入邀请人房间——> 单聊
     */
    REQ_INVITE_SOMEONE_JOIN_ROOM: "req_invite_someone_join_room",
    /**
     * 邀请一些人进入邀请人房间 ——> 群聊
     */
    REQ_INVITE_SOME_PEOPLE_JOIN_ROOM: "req_invite_some_people_join_room",
    /**
     * 拒接通话
     */
    REQ_REJECT_CALL: "req_reject_call",
    /**
     * 接受通话
     */
    REQ_ACCEPT_CALL: "req_accept_call",
    /**
     * 请求推流
     */
    REQ_PUBLISH_STREAM: "req_publish_stream",
    /**
     * 挂断
     */
    REQ_HANG_UP: "req_hang_up",
};
/**
 * 客户端通知事件
 * @type {{}}
 */
const CLIENT_NOTIFY_CMD = {
    /**
     * 单点登录：强制下线
     */
    NOTIFY_FORCED_OFFLINE: "notify_forced_offline",
    /**
     * 通知请求通话
     */
    NOTIFY_REQUEST_CALL: "notify_request_call",
    /**
     * 通知邀请某人进入房间
     */
    NOTIFY_INVITE_SOMEONE_JOIN_ROOM: "notify_invite_someone_join_room",
    /**
     * 通知邀请某些人进入房间
     */
    NOTIFY_INVITE_SOME_PEOPLE_JOIN_ROOM: "notify_invite_some_people_join_room",
    /**
     * 通知拒接通话
     */
    NOTIFY_REJECT_CALL: "notify_reject_call",
    /**
     * 通知接受通话
     */
    NOTIFY_ACCEPT_CALL: "notify_accept_call",
    /**
     * 通知拉流
     */
    NOTIFY_PLAY_STREAM: "notify_play_stream",
    /**
     * 通知挂断
     */
    NOTIFY_HANG_UP: "notify_hang_up",
    /**
     * 通知有人加入房间
     */
    NOTIFY_JOIN_ROOM: "notify_join_room",
    /**
     * 通知有人离开房间
     */
    NOTIFY_LEAVE_ROOM: "notify_leave_room",
    /**
     * 通知通话结束，仅作用于在房间内的人
     */
    NOTIFY_CALL_ENDED: "notify_call_ended"
};

const {Server} = require("socket.io");
const fs = require("fs");
const Express = require("express");
const app = new Express()

const {v4: uuidv4} = require('uuid');

//读取参数配置文件
const config = require('../config/config').parseConfig;
/**
 * 一个房间内最大客户端数量
 */
const MAX_CLIENTS_IN_ROOM = config.maxSizeOfRoom;

//ssl证书相关
const sslOptions = {
    key: fs.readFileSync(config.ssl.keyPath), cert: fs.readFileSync(config.ssl.pemPath)
};

const {
    USER_TYPE_CLIENT, USER_TYPE_ADMINISTRATOR, getUserInfo,
} = require('./user');

const {SuccessModel, ErrorModel} = require("../model/responseModel");
const {BroadcastOperator} = require("socket.io/dist/broadcast-operator");

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
 * 连接前进行校验
 * @param socket
 * @param next
 * @param userType
 * @param namespace
 */
function socketAuthentication(socket, next, userType, namespace) {
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
                const userInfo = result[0];

                //判断单点登记，如果存在，将上一个登录的用户断开连接
                const singleSignOnSocket = getSocketByUserInfo(namespace, userInfo);
                if (singleSignOnSocket) {
                    //说明之前有同账号登录过
                    //发送强制下线通知
                    singleSignOnSocket.emit(ADMINISTRATORS_NOTIFY_CMD.NOTIFY_FORCED_OFFLINE);
                    //强制断开socket
                    singleSignOnSocket.disconnect(false);
                }
                //保存用户信息
                socket.userInfo = userInfo;
                //允许连接
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
        console.error("socketAuthentication-database error:", error);
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
        socketAuthentication(socket, next, USER_TYPE_ADMINISTRATOR, administratorNamespace);
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
        socketAuthentication(socket, next, USER_TYPE_CLIENT, clientNamespace);
    });

//管理端连接
administratorNamespace.on("connection", function (socket) {
    setSocketCallStatus(socket, CALL_STATUS.IDLE)
    socket
        //发生错误时触发
        .on("error", (error) => {

        })
        //在客户端将要断开连接时触发（但尚未离开rooms）
        .on("disconnecting", (reason) => {

        })
        //断开连接时触发
        .on("disconnect", () => {

        });
});

//客户端连接
clientNamespace.on("connection", function (socket) {
    socket.join("123")
    console.log("所有房间1：", clientNamespace.adapter.rooms)
    console.log("所有房间2：", clientNamespace.adapter.sids)
    console.log("所有房间3：", getAllRoom(clientNamespace, true))
    console.log("所有房间4：", getAllRoom(clientNamespace, false))
    console.log("会见房间：", getSocketCallRoom(socket))

    //通知管理终端有客户端上线
    administratorNamespace.emit(ADMINISTRATORS_NOTIFY_CMD.NOTIFY_CLIENT_ONLINE, socket.userInfo);

    setSocketCallStatus(socket, CALL_STATUS.IDLE)

    socket
        //邀请一个人，并创建房间 ——> 单聊
        .on(CLIENT_REQ_CMD.REQ_INVITE_SOMEONE, (userInfo, fn) => {
            //userInfo={userId:"123"}
            clientInviteSomeone(socket, userInfo, true, fn);
        })
        //邀请一些人，并创建房间 ——> 群聊
        .on(CLIENT_REQ_CMD.REQ_INVITE_SOME_PEOPLE, (list, fn) => {
            //list=[{userId:"123"}]
            clientInviteSomePeople(socket, list, true, fn);
        })
        //邀请一个人进入邀请人房间——> 单聊
        .on(CLIENT_REQ_CMD.REQ_INVITE_SOMEONE_JOIN_ROOM, (userInfo, fn) => {
            //userInfo={userId:"123"}
            clientInviteSomeone(socket, userInfo, false, fn);
        })
        //邀请一些人进入邀请人房间 ——> 群聊
        .on(CLIENT_REQ_CMD.REQ_INVITE_SOME_PEOPLE_JOIN_ROOM, (list, fn) => {
            //list=[{userId:"123"}]
            clientInviteSomePeople(socket, list, false, fn);
        })
        //拒接
        .on(CLIENT_REQ_CMD.REQ_REJECT_CALL, (roomId, fn) => {
            //roomId="123456"
            clientRejectCall(socket, roomId, fn);
        })
        //同意通话
        .on(CLIENT_REQ_CMD.REQ_ACCEPT_CALL, (roomId, fn) => {
            //roomId="123456"
            clientAcceptCall(socket, roomId, fn);
        })
        .on(CLIENT_REQ_CMD.REQ_PUBLISH_STREAM, (info, fn) => {
            //info={roomId:"123", publishStreamUrl: "webrtc://192.168.2.186:1990/live/livestream"}
            clientPublishStream(socket, info, fn);
        })
        .on(CLIENT_REQ_CMD.REQ_HANG_UP, (roomId, fn) => {
            //roomId="123456"
            clientHangUp(socket, roomId, fn)
        })
        //发生错误时触发
        .on("error", (error) => {

        })
        //在客户端将要断开连接时触发（但尚未离开rooms）
        .on("disconnecting", (reason) => {

        })
        //断开连接时触发
        .on("disconnect", () => {
            console.log("disconnect:", socket.id);
            setSocketCallStatus(socket, CALL_STATUS.IDLE);

            //通知管理终端有客户端下线
            administratorNamespace.emit(ADMINISTRATORS_NOTIFY_CMD.NOTIFY_CLIENT_OFFLINE, socket.userInfo)
        });
});

/**
 * 根据用户信息获取socket
 */
function getSocketByUserInfo(namespace, userInfo) {
    for (const socket of namespace.sockets.values()) {
        const info = socket.userInfo;
        if (userInfo && info) {
            if (userInfo.userId === info.userId && userInfo.userType === info.userType) {
                return socket;
            }
        }
    }
    return undefined;
}

/**
 * 客户端邀请某人
 * @param inviteSocket
 * @param userInfo
 * @param needCreateRoom 是否需要创建房间，如果为false，则指定为当前邀请人的房间号
 * @param fn
 */
function clientInviteSomeone(inviteSocket, userInfo, needCreateRoom, fn) {
    let roomId;
    if (needCreateRoom) {
        roomId = generateRoomId();
    } else {
        roomId = getSocketCallRoom(inviteSocket);
        if (!roomId) {
            fn(new ErrorModel(0, "no call room exists."));
            return;
        }
    }
    //先判断本身是否是空闲状态
    if (!needCreateRoom || isSocketIdle(inviteSocket)) {
        //设置用户类型
        userInfo.userType = USER_TYPE_CLIENT;
        const inviteeClient = getSocketByUserInfo(clientNamespace, userInfo);
        //先判断被邀请人是否在线
        if (inviteeClient) {
            //在线，判断是否是空闲状态
            if (isSocketIdle(inviteeClient)) {
                let success = clientJoinRoom(inviteSocket, roomId, false);
                if (!success) {
                    //加入房间失败
                    fn(new ErrorModel(0, "invite join room failed, exceeded maximum quantity limit."));
                    return
                }
                //将受邀者直接进入房间
                success = clientJoinRoom(inviteeClient, roomId, false);
                if (!success) {
                    //受邀人没有加入房间
                    clientLeaveRoom(inviteSocket, roomId, false);
                    fn(new ErrorModel(0, "invitee join room failed, exceeded maximum quantity limit."));
                    return
                }
                //通知被邀请者，推送请求通话
                inviteeClient.emit(CLIENT_NOTIFY_CMD.NOTIFY_REQUEST_CALL, {
                    inviteInfo: inviteSocket.userInfo, roomId: roomId
                });
                fn(new SuccessModel({inviteeInfo: inviteeClient.userInfo, roomId: roomId}));

                if (!needCreateRoom) {
                    //不是创建房间，而是加入邀请人房间，则通知房间内其他人
                    inviteSocket.to(roomId).except(inviteeClient.id).emit(CLIENT_NOTIFY_CMD.NOTIFY_INVITE_SOMEONE_JOIN_ROOM, {
                        inviteInfo: inviteSocket.userInfo, inviteeInfo: inviteeClient.userInfo, roomId: roomId
                    })
                }
            } else {
                //被邀请人忙碌
                fn(new ErrorModel(0, "the invitee is busy."));
            }
        } else {
            //被邀请人离线或不存在
            fn(new ErrorModel(0, "the invitee is offline or doesn't exist."));
        }
    } else {
        fn(new ErrorModel(0, "you are busy."));
    }
}

/**
 * 客户端邀请某人
 * @param inviteSocket
 * @param list
 * @param needCreateRoom 是否需要创建房间，如果为false，则指定为当前邀请人的房间号
 * @param fn
 */
function clientInviteSomePeople(inviteSocket, list, needCreateRoom, fn) {
    let roomId;
    if (needCreateRoom) {
        roomId = generateRoomId();
    } else {
        roomId = getSocketCallRoom(inviteSocket);
        if (!roomId) {
            fn(new ErrorModel(0, "no call room exists."));
            return;
        }
    }

    //先判断本身是否是空闲状态
    if (!needCreateRoom || isSocketIdle(inviteSocket)) {
        if (!list || list.length === 0) {
            fn(new ErrorModel(0, "invited list is empty."))
            return
        }

        //通话列表
        const callSocketList = [];
        //忙碌列表
        const busyList = [];
        //离线或不存在列表
        const offlineOrNotExists = [];

        for (const userInfo of list) {
            //设置用户类型
            userInfo.userType = USER_TYPE_CLIENT;
            const inviteeClient = getSocketByUserInfo(clientNamespace, userInfo);
            if (inviteeClient) {
                if (isSocketIdle(inviteeClient)) {
                    callSocketList.push(inviteeClient);
                } else {
                    busyList.push(inviteeClient.userInfo);
                }
            } else {
                delete userInfo.userType
                offlineOrNotExists.push(userInfo)
            }
        }
        //判断可通话列表是否为空，如果为空，则没有通话意义。
        if (callSocketList.length !== 0) {
            const success = clientJoinRoom(inviteSocket, roomId, false);
            if (!success) {
                //加入房间失败
                fn(new ErrorModel(0, "join room failed, exceeded maximum quantity limit."));
                return;
            }
            const callList = [];
            const newSocketList = [];
            for (const socket of callSocketList) {
                if (!clientJoinRoom(socket, roomId, false)) {
                    break;
                }
                callList.push(socket.userInfo);
                newSocketList.push(socket);
            }

            if (callList.length === 0) {
                clientLeaveRoom(inviteSocket, roomId, false);
                fn(new ErrorModel(0, "invitee join room failed, exceeded maximum quantity limit."))
                return;
            }
            const inviteeData = {inviteInfo: inviteSocket.userInfo, callList: callList, roomId: roomId};

            newSocketList.forEach(socket => {
                //通知被邀请者，推送请求通话
                socket.emit(CLIENT_NOTIFY_CMD.NOTIFY_REQUEST_CALL, inviteeData);
            });

            const data = {
                callList: callList, busyList: busyList, offlineOrNotExists: offlineOrNotExists, roomId: roomId
            };
            fn(new SuccessModel(data));

            if (!needCreateRoom) {
                //不是创建房间，而是加入邀请人房间，则通知房间内其他人
                let operator = inviteSocket.to(roomId);
                newSocketList.forEach(socket => {
                    operator = operator.except(socket.id);
                });
                operator.emit(CLIENT_NOTIFY_CMD.NOTIFY_INVITE_SOME_PEOPLE_JOIN_ROOM, inviteeData);
            }
        } else {
            //无意义的通话
            fn(new ErrorModel(0, "status of all invitees is busy, offline or absent."))
        }
    } else {
        //被邀请人忙碌
        fn(new ErrorModel(0, "the invitee is busy."))
    }
}

/**
 * 客户端加入房间
 * @param socket
 * @param roomId
 * @param needNotify 是否需要通知房间内其他人
 * @returns {boolean} true：加入成功，false：加入失败
 */
function clientJoinRoom(socket, roomId, needNotify) {
    if (canRoomAddSocket(clientNamespace, roomId)) {
        socket.join(roomId);
        setSocketCallStatus(socket, CALL_STATUS.DIALING);

        //是否需要通知
        if (needNotify) {
            //像房间内其他人发送进入房间消息
            socket.to(roomId).emit(CLIENT_NOTIFY_CMD.NOTIFY_JOIN_ROOM, {userInfo: socket.userInfo, roomId: roomId});
        }
        return true;
    }
    return false;
}

/**
 * 客户端离开房间
 * @param socket
 * @param roomId
 * @param needNotify 是否需要通知房间内其他客户端
 */
function clientLeaveRoom(socket, roomId, needNotify) {
    if (isSocketInRoom(socket, roomId)) {
        socket.leave(roomId);
        setSocketCallStatus(socket, CALL_STATUS.IDLE);
        if (needNotify) {

        }
        return true;
    }
    return false;
}

/**
 * 客户端拒接
 * @param socket
 * @param roomId
 * @param fn
 */
function clientRejectCall(socket, roomId, fn) {
    if (!roomId) {
        fn(new ErrorModel(0, "roomId is null."));
        return
    }
    if (clientLeaveRoom(socket, roomId, false)) {
        fn(new SuccessModel());

        const socketIds = getRoomSocketIds(clientNamespace, roomId);
        if (socketIds.size === 0) {
            return;
        }
        //房间内剩余客户端数量为1，则直接关闭会话
        const needCallEnded = socketIds.size === 1;
        //推送拒接通知
        socket.to(roomId).emit(CLIENT_NOTIFY_CMD.NOTIFY_REJECT_CALL, {
            userInfo: socket.userInfo, roomId: roomId, /*是否需要结束通话*/callEnded: needCallEnded
        });
        if (needCallEnded) {
            const client = clientNamespace.sockets.get(socketIds[0]);
            //结束通话
            clientLeaveRoom(client, roomId, false);
        }
    } else {
        fn(new ErrorModel(0, "client reject call failed: you are not in the room."));
    }
}

/**
 * 接受通话
 * @param socket
 * @param roomId
 * @param fn
 */
function clientAcceptCall(socket, roomId, fn) {
    if (!roomId) {
        fn(new ErrorModel(0, "roomId is null."));
        return
    }
    if (isSocketInRoom(socket, roomId)) {
        const socketIds = getRoomSocketIds(clientNamespace, roomId);
        if (socketIds.size === 1 && socket.id === socketIds[0]) {
            clientLeaveRoom(socket, roomId, false);
            fn(new ErrorModel(-1, "call room doesn't exist."));
            return;
        }
        socket.to(roomId).emit(CLIENT_NOTIFY_CMD.NOTIFY_ACCEPT_CALL, {userInfo: socket.userInfo, roomId: roomId});
        //已经存在的推流信息
        const streamList = [];
        socketIds.forEach(id => {
            const client = clientNamespace.sockets.get(id);
            //通话中状态且有推流信息
            if (client.callStatus === CALL_STATUS.CALLING && client.publishStreamUrl) {
                streamList.push({userInfo: client.userInfo, publishStreamUrl: client.publishStreamUrl})
            }
        });
        fn(new SuccessModel(streamList));
    } else {
        fn(new ErrorModel(0, "client accept call failed: you are not in the room."));
    }
}

/**
 * 客户端推流
 * @param socket
 * @param info
 * @param fn
 */
function clientPublishStream(socket, info, fn) {
    const roomId = info.roomId;
    if (!roomId) {
        fn(new ErrorModel(0, "roomId is null."));
        return
    }
    const publishStreamUrl = info.publishStreamUrl;
    if (!publishStreamUrl) {
        fn(new ErrorModel(0, "publishStreamUrl is null."));
        return
    }
    if (isSocketInRoom(socket, roomId)) {
        //通知房间内其他客户端拉流
        socket.to(roomId).emit(CLIENT_NOTIFY_CMD.NOTIFY_PLAY_STREAM, {
            userInfo: socket.userInfo,
            publishStreamUrl: publishStreamUrl,
            roomId: roomId
        });
        fn(new SuccessModel());
    } else {
        fn(new ErrorModel(0, "client publish stream failed: you are not in the room."));
    }
}

/**
 * 客户端挂断
 * @param socket
 * @param roomId
 * @param fn
 */
function clientHangUp(socket, roomId, fn) {
    if (!roomId) {
        fn(new ErrorModel(0, "roomId is null."));
        return
    }
    if (clientLeaveRoom(socket, roomId, false)) {
        fn(new SuccessModel());

        const socketIds = getRoomSocketIds(clientNamespace, roomId);
        if (socketIds.size === 0) {
            //房间里没人了
            return;
        }
        //房间内剩余客户端数量为1，则直接关闭会话
        const needCallEnded = socketIds.size === 1;
        //推送挂断通知
        socket.to(roomId).emit(CLIENT_NOTIFY_CMD.NOTIFY_HANG_UP, {
            userInfo: socket.userInfo, roomId: roomId, /*是否需要结束通话*/callEnded: needCallEnded
        });
        if (needCallEnded) {
            const client = clientNamespace.sockets.get(socketIds[0]);
            //结束通话
            clientLeaveRoom(client, roomId, false);
        }
    } else {
        fn(new ErrorModel(0, "client hang up failed: you are not in the room."));
    }
}


/**
 * 判断客户端是否在指定房间内
 * @param socket
 * @param roomId
 * @returns {boolean}
 */
const isSocketInRoom = (socket, roomId) => {
    return socket.rooms.contains(roomId);
}

/**
 * 生成会见房间号
 * @returns {string}
 */
const generateRoomId = () => {
    return `${ROOM_PREFIX}${uuidv4()}`
}
/**
 * 判断socket是否处于空闲状态
 * @param socket
 */
const isSocketIdle = (socket) => {
    return socket.callStatus === CALL_STATUS.IDLE;
}

/**
 * 设置socket状态
 * @param socket
 * @param status
 */
const setSocketCallStatus = (socket, status) => {
    if (status === CALL_STATUS.IDLE) {
        setSocketPublishStreamUrl(socket, undefined);
    }
    socket.callStatus = status;
}
/**
 * 获取客户端当前正在会见的房间
 * @param socket
 */
const getSocketCallRoom = (socket) => {
    const rooms = socket.rooms;
    const tempRooms = new Set([...rooms].filter(roomId => roomId !== socket.id));
    const realRooms = [...tempRooms];
    if (realRooms.length) {
        if (realRooms.length === 1) {
            return realRooms[0];
        } else {
            console.error(`error status: socket[${socket.id}] 's room is wrong.`, realRooms);
            return undefined;
        }
    } else {
        return undefined;
    }
}

/**
 * 设置socket当前推流地址
 * @param socket
 * @param streamUrl
 */
const setSocketPublishStreamUrl = (socket, streamUrl) => {
    //当前客户端推流地址
    socket.publishStreamUrl = streamUrl;
}
/**
 * 判断房间是否可以继续添加socket
 * @param namespace
 * @param roomId
 * @returns {boolean}
 */
const canRoomAddSocket = (namespace, roomId) => {
    const socketIds = getRoomSocketIds(namespace, roomId)
    return !socketIds || socketIds.size < MAX_CLIENTS_IN_ROOM;
}

/**
 *
 * @param namespace
 * @param roomId
 * @returns {Set<String>}
 */
const getRoomSocketIds = (namespace, roomId) => {
    return namespace.adapter.rooms.get(roomId);
}

/**
 * 获取所有房间，包括房间号和对应Socket
 * @param namespace
 * @param excludeSocket 是否去除socket本身的房间号
 * @returns {Map<Room, Set<SocketId>>}
 */
function getAllRoom(namespace, excludeSocket) {
    const allRoom = new Map()
    //由于socket.io会将每个socket都加入对应名为socket.id的房间，有时候这些数据不是我们想要的
    const sockets = namespace.sockets;
    const rooms = namespace.adapter.rooms;
    rooms.forEach((value, key) => {
        //是否去除socket自身房间号
        if (excludeSocket && sockets.has(key)) {
            return;
        }
        allRoom.set(key, value);
    })
    return allRoom;
}

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
