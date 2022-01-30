FROM node:14.18.2-alpine3.15

RUN mkdir -p /home/public/srs-rtc-server

#工作路径
WORKDIR /home/public/srs-rtc-server
#复制指令，从上下文目录中复制文件或者目录到容器里指定路径。
COPY . /home/public/srs-rtc-server

#设置容器时区
RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
RUN echo 'Asia/Shanghai' >/etc/timezone

RUN npm install 

# PORT 使用到的端口，配置文件中如有调整，同步修改
#./config/config.yml--apiConfig.httpPort
EXPOSE 9898
#./config/config.yml--apiConfig.httpsPort
EXPOSE 9899
#./config/config.yml--socketIoConfig.httpPort
EXPOSE 9998
#./config/config.yml--socketIoConfig.httpsPort
EXPOSE 9999

CMD ["npm","start"]
