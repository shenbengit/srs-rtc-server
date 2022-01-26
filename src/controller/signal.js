/**
 * 房间号前缀
 * @type {string}
 */
const ROOM_PREFIX = "srs_rtc_call_room_"
const NAMESPACE = {
    ADMINISTRATORS: "/srs_rtc/signal/administrator",
    CLIENT: "/srs_rtc/signal/client",
};

/**
 * 通话状态
 */
const CALL_STATUS = {
    /**
     * 空闲状态
     */
    IDLE: 1,
    /**
     * 拨号中状态
     */
    DIALING: 2,
    /**
     * 通话中状态
     */
    CALLING: 3
};
/**
 * 一些公共部分请求事件
 */
const REQ_CMD = {};
/**
 * 一个公共部分的通知事件
 * @type {{}}
 */
const NOTIFY_CMD = {
    /**
     * 单点登录：强制下线
     */
    NOTIFY_FORCED_OFFLINE: "notify_forced_offline",
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
};
/**
 * 客户端请求事件
 * @type {{REQ_REJECT_CALL: string, REQ_INVITE_SOMEONE_JOIN_ROOM: string, REQ_PUBLISH_STREAM: string, REQ_JOIN_CHAT_ROOM: string, REQ_LEAVE_CHAT_ROOM: string, REQ_HANG_UP: string, REQ_ACCEPT_CALL: string, REQ_INVITE_SOME_PEOPLE_JOIN_ROOM: string, REQ_INVITE_SOMEONE: string, REQ_INVITE_SOME_PEOPLE: string}}
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
     * 邀请一个人进入邀请人房间——> 群聊
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
     * 加入房间->用于聊天室
     */
    REQ_JOIN_CHAT_ROOM: "req_join_chat_room",
    /**
     * 离开房间->用于聊天室
     */
    REQ_LEAVE_CHAT_ROOM: "req_leave_chat_room",
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
     * 通知有人加入房间->用于聊天室
     */
    NOTIFY_JOIN_CHAT_ROOM: "notify_join_chat_room",
    /**
     * 通知有人离开房间->用于聊天室
     */
    NOTIFY_LEAVE_CHAT_ROOM: "notify_leave_chat_room",
    /**
     * 通知拉流
     */
    NOTIFY_PLAY_STREAM: "notify_play_stream",
    /**
     * 通知挂断
     */
    NOTIFY_HANG_UP: "notify_hang_up",
    /**
     * 通知房间内，有人通话中掉线
     */
    NOTIFY_OFFLINE_DURING_CALL: "notify_offline_during_call",
};

const {Server} = require("socket.io");
const {Room, SocketId} = require("socket.io-adapter");

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
                    singleSignOnSocket.emit(NOTIFY_CMD.NOTIFY_FORCED_OFFLINE);
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
const administratorNamespace = ioServer.of(NAMESPACE.ADMINISTRATORS)
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
const clientNamespace = ioServer.of(NAMESPACE.CLIENT)
    .use((socket, next) => {
        //校验客户端信息
        socketAuthentication(socket, next, USER_TYPE_CLIENT, clientNamespace);
    });

clientNamespace.adapter
    //创建房间时调用
    .on("create-room", (room) => {
        console.log(`clientNamespace.adapter.create-room->roomId:${room}`)
    })
    //socket进入房间时调用
    .on("join-room", (room, socketId) => {
        console.log(`clientNamespace.adapter.join-room->roomId:${room},socketId: ${socketId}`)
    })
    //socket离开房间时调用
    .on("leave-room", (room, socketId) => {
        console.log(`clientNamespace.adapter.leave-room->roomId:${room},socketId: ${socketId}`)
    })
    //在所有socket离开房间时调用
    .on("delete-room", (room) => {
        console.log(`clientNamespace.adapter.delete-room->roomId:${room}`)
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
    //通知管理终端有客户端上线
    administratorNamespace.emit(ADMINISTRATORS_NOTIFY_CMD.NOTIFY_CLIENT_ONLINE, socket.userInfo);

    setSocketCallStatus(socket, CALL_STATUS.IDLE)

    socket
        //邀请一个人，并创建房间 ——> 单聊
        .on(CLIENT_REQ_CMD.REQ_INVITE_SOMEONE, (info, fn) => {
            //info={userId:"123"}
            clientInviteSomeone(socket, info, true, fn);
        })
        //邀请一些人，并创建房间 ——> 群聊
        .on(CLIENT_REQ_CMD.REQ_INVITE_SOME_PEOPLE, (info, fn) => {
            //list={userList:[{userId:"123"}]}
            clientInviteSomePeople(socket, info, true, fn);
        })
        //邀请一个人进入邀请人房间——> 群聊
        .on(CLIENT_REQ_CMD.REQ_INVITE_SOMEONE_JOIN_ROOM, (info, fn) => {
            //info={userId:"123",roomId:123}
            clientInviteSomeone(socket, info, false, fn);
        })
        //邀请一些人进入邀请人房间 ——> 群聊
        .on(CLIENT_REQ_CMD.REQ_INVITE_SOME_PEOPLE_JOIN_ROOM, (info, fn) => {
            //info={userList:[{userId:"123"}],roomId:123}
            clientInviteSomePeople(socket, info, false, fn);
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
        //加入房间->用于聊天室
        .on(CLIENT_REQ_CMD.REQ_JOIN_CHAT_ROOM, (roomId, fn) => {
            //roomId="123456"
            clientJoinChatRoom(socket, roomId, fn);
        })
        //离开房间->用于聊天室
        .on(CLIENT_REQ_CMD.REQ_LEAVE_CHAT_ROOM, (roomId, fn) => {
            //roomId="123456"
            clientLeaveChatRoom(socket, roomId, fn);
        })
        //推流
        .on(CLIENT_REQ_CMD.REQ_PUBLISH_STREAM, (info, fn) => {
            //info={roomId:"123", publishStreamUrl: "webrtc://192.168.1.1:1990/live/livestream"}
            clientPublishStream(socket, info, fn);
        })
        //挂断
        .on(CLIENT_REQ_CMD.REQ_HANG_UP, (roomId, fn) => {
            //roomId="123456"
            clientHangUp(socket, roomId, fn)
        })
        //发生错误时触发
        .on("error", (error) => {

        })
        //在客户端将要断开连接时触发（但尚未离开rooms）
        .on("disconnecting", (reason) => {
            clientDisconnecting(socket, reason);
        })
        //断开连接时触发
        .on("disconnect", () => {
            clientDisconnect(socket)
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
 * @param info
 * @param needCreateRoom 是否需要创建房间，如果为false，则指定为当前邀请人的房间号
 * @param fn
 */
function clientInviteSomeone(inviteSocket, info, needCreateRoom, fn) {
    let roomId;
    if (needCreateRoom) {
        roomId = generateRoomId();
    } else {
        roomId = info.roomId;
        if (!roomId) {
            fn(new ErrorModel(0, "no call room exists."));
            return;
        }
        if (!isSocketInRoom(inviteSocket, roomId)) {
            fn(new ErrorModel(0, "you are not in the room."));
            return;
        }
    }
    //先判断本身是否是空闲状态
    if (!needCreateRoom || isSocketIdle(inviteSocket)) {
        //设置用户类型
        info.userType = USER_TYPE_CLIENT;
        const inviteeClient = getSocketByUserInfo(clientNamespace, info);
        //先判断被邀请人是否在线
        if (inviteeClient) {
            //在线，判断是否是空闲状态
            if (isSocketIdle(inviteeClient)) {
                let success;
                if (needCreateRoom) {
                    success = clientJoinRoom(inviteSocket, roomId);
                    if (!success) {
                        //加入房间失败
                        fn(new ErrorModel(0, "invite join room failed: exceeded maximum quantity limit."));
                        return
                    }
                }
                //将受邀者直接进入房间
                success = clientJoinRoom(inviteeClient, roomId);
                if (!success) {
                    if (needCreateRoom) {
                        //受邀人没有加入房间，自己也离开房间
                        clientLeaveRoom(inviteSocket, roomId);
                    }
                    fn(new ErrorModel(0, "invitee join room failed: exceeded maximum quantity limit."));
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
                if (isSocketInRoom(inviteeClient, roomId)) {
                    fn(new ErrorModel(0, "the invitee is already in the room."));
                    return;
                }
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
 * @param info
 * @param needCreateRoom 是否需要创建房间，如果为false，则指定为当前邀请人的房间号
 * @param fn
 */
function clientInviteSomePeople(inviteSocket, info, needCreateRoom, fn) {
    let roomId;
    if (needCreateRoom) {
        roomId = generateRoomId();
    } else {
        roomId = info.roomId;
        if (!roomId) {
            fn(new ErrorModel(0, "no call room exists."));
            return;
        }
        if (!isSocketInRoom(inviteSocket, roomId)) {
            fn(new ErrorModel(0, "you are not in the room."));
            return;
        }
    }

    const list = info.userList;

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
        const offlineOrNotExistsList = [];
        //已经在房间列表，属于无效邀请
        const alreadyInRoomList = [];

        for (const userInfo of list) {
            //设置用户类型
            userInfo.userType = USER_TYPE_CLIENT;
            const inviteeClient = getSocketByUserInfo(clientNamespace, userInfo);
            if (inviteeClient) {
                if (isSocketIdle(inviteeClient)) {
                    callSocketList.push(inviteeClient);
                } else {
                    if (isSocketInRoom(inviteeClient, roomId)) {
                        //已经存在房间
                        alreadyInRoomList.push(inviteeClient.userInfo);
                        return;
                    }
                    busyList.push(inviteeClient.userInfo);
                }
            } else {
                delete userInfo.userType
                offlineOrNotExistsList.push(userInfo)
            }
        }
        //判断可通话列表是否为空，如果为空，则没有通话意义。
        if (callSocketList.length !== 0) {
            if (needCreateRoom) {
                const success = clientJoinRoom(inviteSocket, roomId);
                if (!success) {
                    //加入房间失败
                    fn(new ErrorModel(0, "join room failed: exceeded maximum quantity limit."));
                    return;
                }
            }
            const callList = [];
            const newSocketList = [];
            for (const socket of callSocketList) {
                if (!clientJoinRoom(socket, roomId)) {
                    break;
                }
                callList.push(socket.userInfo);
                newSocketList.push(socket);
            }

            if (callList.length === 0 || newSocketList.length === 0) {
                if (needCreateRoom) {
                    //需要创建房间时，呼叫列表为空，则自己也离开房间
                    clientLeaveRoom(inviteSocket, roomId);
                }
                fn(new ErrorModel(0, "invitee join room failed: exceeded maximum quantity limit."))
                return;
            }
            const inviteeData = {inviteInfo: inviteSocket.userInfo, callList: callList, roomId: roomId};

            newSocketList.forEach(socket => {
                //通知被邀请者，推送请求通话
                socket.emit(CLIENT_NOTIFY_CMD.NOTIFY_REQUEST_CALL, inviteeData);
            });

            const data = {
                /*可通话人员列表*/callList: callList,
                /*忙碌人员列表*/busyList: busyList,
                /*离线或不存在列表列表*/offlineOrNotExistsList: offlineOrNotExistsList,
                /*已经在房间内列表，属于无效邀请*/alreadyInRoomList: alreadyInRoomList,
                /*房间号*/roomId: roomId
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
 * @returns {boolean} true：加入成功，false：加入失败
 */
function clientJoinRoom(socket, roomId) {
    if (!isSocketIdle(socket)) {
        //当前状态忙碌
        return false;
    }
    if (isSocketInRoom(socket, roomId)) {
        //已经在会见室
        return false;
    }
    if (canRoomAddSocket(clientNamespace, roomId)) {
        socket.join(roomId);
        setSocketCallStatus(socket, CALL_STATUS.DIALING);
        return true;
    }
    return false;
}

/**
 * 客户端离开房间
 * @param socket
 * @param roomId
 */
function clientLeaveRoom(socket, roomId) {
    if (isSocketInRoom(socket, roomId)) {
        socket.leave(roomId);
        setSocketCallStatus(socket, CALL_STATUS.IDLE);
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
    if (clientLeaveRoom(socket, roomId)) {
        fn(new SuccessModel());

        const socketIds = getRoomSocketIds(clientNamespace, roomId);
        if (!socketIds.length) {
            //房间里没人了
            return;
        }
        //房间内剩余客户端数量为1，则直接关闭会话
        const needCallEnded = socketIds.length === 1;
        //推送拒接通知
        socket.to(roomId).emit(CLIENT_NOTIFY_CMD.NOTIFY_REJECT_CALL, {
            userInfo: socket.userInfo, roomId: roomId, /*是否需要结束通话*/callEnded: needCallEnded
        });
        if (needCallEnded) {
            const client = clientNamespace.sockets.get(socketIds[0]);
            //结束通话
            clientLeaveRoom(client, roomId);
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
        if (socketIds.length === 1) {
            //如果数量为1，说明就只有自己
            clientLeaveRoom(socket, roomId);
            fn(new ErrorModel(-1, "call room doesn't exist."));
            return;
        }
        socket.to(roomId).emit(CLIENT_NOTIFY_CMD.NOTIFY_ACCEPT_CALL, {userInfo: socket.userInfo, roomId: roomId});
        fn(new SuccessModel({streamList: getPublishStreamInRoom(clientNamespace, roomId), roomId: roomId}));
    } else {
        fn(new ErrorModel(0, "client accept call failed: you are not in the room."));
    }
}

/**
 * 客户端加入聊天室
 * @param socket
 * @param roomId
 * @param fn
 */
function clientJoinChatRoom(socket, roomId, fn) {
    if (!roomId) {
        fn(new ErrorModel(0, "roomId is null."));
        return
    }
    //校验房间号，防止误入房间号是自动生成的房间
    if (roomId.startsWith(ROOM_PREFIX)) {
        fn(new ErrorModel(0, "roomId is invalid."));
        return;
    }
    if (isSocketIdle(socket)) {
        if (isSocketInRoom(socket, roomId)) {
            fn(new ErrorModel(0, "you are already in the room."));
            return;
        }
        if (clientJoinRoom(socket, roomId)) {
            socket.to(roomId).emit(CLIENT_NOTIFY_CMD.NOTIFY_JOIN_CHAT_ROOM, {
                userInfo: socket.userInfo, roomId: roomId
            });
            fn(new SuccessModel({streamList: getPublishStreamInRoom(clientNamespace, roomId), roomId: roomId}));
        } else {
            fn(new ErrorModel(0, "join chat room failed: exceeded maximum quantity limit."));
        }
    } else {
        fn(new ErrorModel(0, "you are busy."));
    }
}

/**
 * 客户端离开聊天室
 * @param socket
 * @param roomId
 * @param fn
 */
function clientLeaveChatRoom(socket, roomId, fn) {
    if (!roomId) {
        fn(new ErrorModel(0, "roomId is null."));
        return
    }
    if (clientLeaveRoom(socket, roomId)) {
        fn(new SuccessModel());
        //通知房间内其他人
        socket.to(roomId).emit(CLIENT_NOTIFY_CMD.NOTIFY_LEAVE_CHAT_ROOM, {userInfo: socket.userInfo, roomId: roomId});
    } else {
        fn(new ErrorModel(0, "client leave chat room failed: you are not in the room."));
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
            userInfo: socket.userInfo, publishStreamUrl: publishStreamUrl, roomId: roomId
        });
        //保存推流地址
        setSocketPublishStreamUrl(socket, publishStreamUrl);
        //更新通话状态为通话中
        setSocketCallStatus(socket, CALL_STATUS.CALLING);

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
    if (clientLeaveRoom(socket, roomId)) {
        fn(new SuccessModel());

        const socketIds = getRoomSocketIds(clientNamespace, roomId);
        if (!socketIds.length) {
            //房间里没人了
            return;
        }
        //房间内剩余客户端数量为1，则直接关闭会话
        const needCallEnded = socketIds.length === 1;
        //推送挂断通知
        socket.to(roomId).emit(CLIENT_NOTIFY_CMD.NOTIFY_HANG_UP, {
            userInfo: socket.userInfo, roomId: roomId, /*是否需要结束通话*/callEnded: needCallEnded
        });
        if (needCallEnded) {
            const client = clientNamespace.sockets.get(socketIds[0]);
            //结束通话
            clientLeaveRoom(client, roomId);
        }
    } else {
        fn(new ErrorModel(0, "client hang up failed: you are not in the room."));
    }
}

/**
 * 客户端断开连接中，此时并没有离开房间
 * @param socket
 * @param reason
 */
function clientDisconnecting(socket, reason) {
    //如果是通话中离线，则通知房间内其他人
    if (!isSocketIdle(socket)) {
        const roomId = getSocketCallRoom(socket);
        if (roomId) {
            //通知房间内其他人，有人离开离线
            socket.to(roomId).emit(CLIENT_NOTIFY_CMD.NOTIFY_OFFLINE_DURING_CALL, {
                userInfo: socket.userInfo, reason: reason, roomId: roomId
            });
        }
    }
}

/**
 * 客户端断开连接
 * @param socket
 */
function clientDisconnect(socket) {
    setSocketCallStatus(socket, CALL_STATUS.IDLE);
    //通知管理终端有客户端下线
    administratorNamespace.emit(ADMINISTRATORS_NOTIFY_CMD.NOTIFY_CLIENT_OFFLINE, socket.userInfo)
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
 * @return {undefined|Room}
 */
const getSocketCallRoom = (socket) => {
    const rooms = socket.rooms;
    const realRooms = [...rooms].filter(roomId => roomId !== socket.id);
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
 * 获取房间内已经存在的流
 *
 * @param namespace
 * @param roomId
 * @return {*[]}
 */
const getPublishStreamInRoom = (namespace, roomId) => {
    const socketIds = getRoomSocketIds(namespace, roomId);
    //已经存在的推流信息
    const streamList = [];
    socketIds.forEach(socketId => {
        const client = clientNamespace.sockets.get(socketId);
        //通话中状态且有推流信息
        if (client && client.callStatus === CALL_STATUS.CALLING && client.publishStreamUrl) {
            streamList.push({userInfo: client.userInfo, publishStreamUrl: client.publishStreamUrl})
        }
    });
    return streamList;
}

/**
 * 判断房间是否可以继续添加socket
 * @param namespace
 * @param roomId
 * @returns {boolean}
 */
const canRoomAddSocket = (namespace, roomId) => {
    const socketIds = getRoomSocketIds(namespace, roomId)
    return socketIds.length < MAX_CLIENTS_IN_ROOM;
}

/**
 * 获取房间内所有socketId
 * @param namespace
 * @param roomId
 * @return {*[]}
 */
const getRoomSocketIds = (namespace, roomId) => {
    const rooms = namespace.adapter.rooms.get(roomId) || new Set();
    //将set 转成 array
    return [...rooms];
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
