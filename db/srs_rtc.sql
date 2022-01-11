/*
 Navicat Premium Data Transfer

 Source Server         : srs-rtc
 Source Server Type    : MySQL
 Source Server Version : 50734
 Source Host           : localhost:3306
 Source Schema         : srs_rtc

 Target Server Type    : MySQL
 Target Server Version : 50734
 File Encoding         : 65001

 Date: 10/01/2022 20:36:22
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for db_user
-- ----------------------------
DROP TABLE IF EXISTS `db_user`;
CREATE TABLE `db_user`
(
    `id`         int(11)                                                 NOT NULL AUTO_INCREMENT COMMENT 'primary key',
    `user_id`    varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'user id',
    `user_type`  varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '0' COMMENT 'user type: 1-administrator; 0-client;',
    `username`   varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'username',
    `password`   varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'password',
    `created_at` datetime(0)                                             NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0) COMMENT 'created time',
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE INDEX `user_unique` (`user_id`, `user_type`) USING BTREE
) ENGINE = InnoDB
  AUTO_INCREMENT = 4
  CHARACTER SET = utf8
  COLLATE = utf8_general_ci
  ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
