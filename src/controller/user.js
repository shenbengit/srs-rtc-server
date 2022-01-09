const {execSql} = require('../db/mysql');
/**
 * 用户类型：客户端
 * @type {string}
 */
const USER_TYPE_CLIENT = "0";
/**
 * 用户类型：管理员
 * @type {string}
 */
const USER_TYPE_ADMIN = "1";

/**
 * 获取所有用户信息
 */
const getAllUser = (userType) => {
    let sql = `SELECT id, user_id as userId, user_type as userType, username, created_at as createdAt
               FROM db_user`;
    if (userType !== USER_TYPE_ADMIN) {
        //不是管理员权限
        sql += ` WHERE user_type = '${userType}'`
    }
    return execSql(sql);
}

/**
 * 根据userId查询用户信息
 *
 * @param userId 用户id
 * @param userType
 */
const getUserByUserId = (userId, userType) => {
    const sql = `SELECT id, user_id as userId, user_type as userType, username, created_at as createdAt
                 FROM db_user
                 WHERE user_id = '${userId}'
                   and user_type = '${userType}'`;
    return execSql(sql);
}

/**
 * 验证用户信息
 *
 * @param userId 用户id
 * @param userType
 * @param password
 */
const verifyUserInfo = (userId, userType, password) => {
    const sql = `SELECT id, user_id as userId, user_type as userType, username, created_at as createdAt
                 FROM db_user
                 WHERE user_id = '${userId}'
                   and user_type = '${userType}'
                   and password = '${password}'`;
    return execSql(sql);
}

/**
 * 注册用户
 * @param userId
 * @param username
 * @param password
 * @param userType
 */
const insertUser = (userId, username, password, userType) => {
    const sql = `INSERT INTO db_user (user_id, username, password, user_type)
                 VALUES ('${userId}', '${username}', '${password}', '${userType}')`;
    return execSql(sql);
}

/**
 * 注册用户
 * @param userId
 * @param username
 * @param password
 * @param userType
 */
const updateUser = (userId, username, password, userType) => {
    let sql = `UPDATE db_user `;
    if (username && password) {
        sql += `SET username = '${username}', password = '${password}' `
    } else {
        if (username) {
            sql += `SET username = '${username}' `
        }
        if (password) {
            sql += `SET password = '${password}' `
        }
    }
    sql += `WHERE user_id = '${userId}' AND user_type = '${userType}'`
    return execSql(sql);
}

module.exports = {
    USER_TYPE_CLIENT,
    USER_TYPE_ADMIN,
    getAllUser,
    getUserByUserId,
    verifyUserInfo,
    insertUser,
    updateUser
}
