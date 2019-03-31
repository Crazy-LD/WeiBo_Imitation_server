
## 项目简介

这个项目是应学校课程考核要求，基于B/S架构的web app，其灵感来自于ios的微博和TIM，这个项目采用的是Vue + Express + Sequelize的技术栈，用于Vue初学者，学习和交流。
## 项目运行
```
git clone https://github.com/Crazy-LD/WeiBo_Imitation_server.git

cd WeiBo_Imitation_server

npm install

npm start(先打开SQL Server服务器端口49172)

访问http://localhost:3000
```
## 系统总架构

<img src="https://github.com/Crazy-LD/WeiBo_Imitation/blob/master/printscreen/framework.png" width="800" height="600"/>

## 前端代码

[前端代码](https://github.com/Crazy-LD/WeiBo_Imitation)

## 功能

- [x] 用户(管理员)登录
- [x] 注册
- [x] 修改密码
- [x] 注销账户
- [x] 发微博
- [x] 删微博
- [x] 点赞
- [x] 评论

## 项目结构

```
weibo_server
  - bin
    - www               // 配置网络
  - config
    - index.js          // 配置数据库的信息
  - db
    - models.js         // 创建各个表
  - node_modules
  - public              // 公共资源
  - routes
    - index.js          // 路由配置
    - users.js          // users监听
  - uploads             // 上传的文件
  - views               // ejs模板引擎
  - app.js              // 应用配置
```

