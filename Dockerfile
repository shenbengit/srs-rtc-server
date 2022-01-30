FROM node:14.18.2-alpine3.15

RUN mkdir -p /home/public/srs-rtc-server

#工作路径
WORKDIR /home/public/srs-rtc-server
#复制指令，从上下文目录中复制文件或者目录到容器里指定路径。
COPY . /home/public/srs-rtc-server

RUN npm install 

# PORT
#./config/config.yml--apiConfig.httpPort
EXPOSE 9898
#./config/config.yml--apiConfig.httpsPort
EXPOSE 9899
#./config/config.yml--socketIoConfig.httpPort
EXPOSE 9998
#./config/config.yml--socketIoConfig.httpsPort
EXPOSE 9999

CMD ["node","start"]
