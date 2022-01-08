const BASE_PATH = "/srs_rtc";

const USER_PATH = {
    /*
     查询所有用户信息
     GET:
     /srs/user/getAllUser
     response:
     {"code":1,"msg":"success","data":[{"id":13,"username":"77","password":"77","user_id":"123456","created_at":"2022-01-08 15:06:14"}]}
     */
    GET_ALL_USER: BASE_PATH + "/user/getAllUser",
    /*
     检测userId是否可用
     POST
     /srs/user/checkUserId
     body:
     {"userId":"123"}
     response:
     {"code":1,"msg":"success"}
     */
    CHECK_USER_ID: BASE_PATH + "/user/checkUserId",
    /*
     GET:
     /srs/user/getUserByUserId?userId=xxx
     response:
     {"code":1,"msg":"success","data":{"id":13,"username":"77","password":"77","user_id":"123456","created_at":"2022-01-08 15:06:14"}}
     */
    GET_USER_BY_USER_ID: BASE_PATH + "/user/getUserByUserId",
    /*
     注册用户
     POST
     /srs/user/insertUser
     body:
     {"userId":"123","username":"张三","password":"123456"}
     response:
     {"code":1,"msg":"success"}
     */
    INSERT_USER: BASE_PATH + "/user/insertUser",
    /*
     更新用户信息，字段存在则更新，不存在则不处理
     POST
     /srs/user/insertUser
     body:
     {"userId":"123","username":"张三","password":"123456"}
     response:
     {"code":1,"msg":"success"}
     */
    UPDATE_USER: BASE_PATH + "/user/updateUser",
};

module.exports = {
    USER_PATH
}