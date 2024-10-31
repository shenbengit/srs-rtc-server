const BASE_PATH = "/srs_rtc";

const USER_PATH = {
    /*
     查询所有用户信息
     GET:
     /srs_rtc/user/getAllUserInfo
     headers:
     {
        user-type : 0 or 1,
        //if (user-type ==1),you also add user-id
        user-id : xxx
     }
     response:
     {"code":200,"msg": "success","data": [{"id": 13,"userId": "123456","username": "77","userType": 0,"createdAt": "2022-01-08 15:06:14"}]}
     */
    GET_ALL_USER_INFO: BASE_PATH + "/user/getAllUserInfo",
    /*
     检测userId是否可用
     POST
     /srs_rtc/user/checkUserId
     body:
     {"userId":"123","userType":"1"}
     response:
     {"code":200,"msg":"success"}
     */
    CHECK_USER_ID: BASE_PATH + "/user/checkUserId",
    /*
     根据userId和userType获取用户信息
     GET:
     /srs_rtc/user/getUserInfo?userId=xxx&&userType=xxx
     response:
     {"code":200,"msg":"success","data":{"id": 13,"userId": "123456","username": "77","userType": 0,"createdAt": "2022-01-08 15:06:14"}}
     */
    GET_USER_INFO: BASE_PATH + "/user/getUserInfo",
    /*
     添加用户
     POST
     /srs_rtc/user/insertUser
     body:
     {"userId":"123","userType":"1","username":"张三","password":"123456"}
     response:
     {"code":200,"msg":"success"}
     */
    INSERT_USER: BASE_PATH + "/user/insertUser",
    /*
     根据userId和userType更新用户信息，字段存在则更新，不存在则不处理
     POST
     /srs_rtc/user/updateUser
     body:
     {"userId":"123","userType":"1","username":"张三","password":"123456"}
     response:
     {"code":200,"msg":"success"}
     */
    UPDATE_USER: BASE_PATH + "/user/updateUser",
    /*
     用户登录
     POST
     /srs_rtc/user/userLogin
     body:
     {"userId":"123","userType":"0","password":"123456"}
     response:
     {"code":200,"msg":"success","data":{"id": 13,"userId": "123","username": "77","userType": 0,"createdAt": "2022-01-08 15:06:14"}}
     */
    USER_LOGIN: BASE_PATH + "/user/userLogin",
    /*
     删除用户
     POST
     /srs_rtc/user/deleteUser
     body:
     {"userId":"123","userType":"0"}
     response:
     {"code":200,"msg":"success"}
     */
    DELETE_USER: BASE_PATH + "/user/deleteUser",
    /*
     获取当前在线人数
     GET
     /srs_rtc/client/getOnlineUsers
     response:
     {"code":200,"msg":"success","data":[{"id":4,"userId":"test","userType":"0","username":"张三","createdAt":"2022-01-19 10:36:40"}]}
     */
    GET_ALL_ONLINE_USERS: BASE_PATH + "/client/getAllOnlineUsers"
};

module.exports = {
    USER_PATH
};
