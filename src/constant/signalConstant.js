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
    /**
     * 用于重置状态，避免偶发情况下未关闭通话
     */
    REQ_RESET_STATUS: "req_reset_status"
};
/**
 * 客户端通知事件
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

module.exports = {
    ROOM_PREFIX,
    NAMESPACE,
    CALL_STATUS,
    REQ_CMD,
    NOTIFY_CMD,
    ADMINISTRATORS_REQ_CMD,
    ADMINISTRATORS_NOTIFY_CMD,
    CLIENT_REQ_CMD,
    CLIENT_NOTIFY_CMD
}