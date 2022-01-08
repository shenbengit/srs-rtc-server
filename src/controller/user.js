const {execSql} = require('../db/mysql');

/**
 * 获取所有用户信息
 */
const getAllUser = () => {
    const sql = "SELECT * FROM db_user";
    return execSql(sql);
}

/**
 * 根据userId查询用户信息
 *
 * @param userId 用户id
 */
const getUserByUserId = (userId) => {
    const sql = "SELECT * FROM db_user WHERE user_id = '" + userId + "'";
    return execSql(sql);
}

/**
 * 注册用户
 * @param userId
 * @param username
 * @param password
 */
const insertUser = (userId, username, password) => {
    const sql = "INSERT INTO db_user (user_id, username, password) VALUES ('" + userId + "', '" + username + "', '" + password + "')";
    return execSql(sql);
}

/**
 * 注册用户
 * @param userId
 * @param username
 * @param password
 */
const updateUser = (userId, username, password) => {
    let sql = "UPDATE db_user ";
    if (username && password) {
        sql += "SET username = '" + username + "', password = '" + password + "' "
    } else {
        if (username) {
            sql += "SET username = '" + username + "' "
        }
        if (password) {
            sql += "SET password = '" + password + "' "
        }
    }
    sql += "WHERE user_id = '" + userId + "'"
    return execSql(sql);
}

module.exports = {
    getAllUser,
    getUserByUserId,
    insertUser,
    updateUser
}
