const Sequelize = require('sequelize');
const config = require('../config')
const Op = Sequelize.Op
/* 必须加上用户名和密码 */
const sequelize = new Sequelize(config.database, config.userName, config.password, {
  host: config.host,
  port: config.port,
  dialect: 'mssql',
  dialectOptions: {
    encrypt: true // 是否加密
  },
  operatorsAliases: false,

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
});
sequelize
  .authenticate()
  .then(() => {
    console.log('数据库连接成功');
  })
  .catch(err => {
    console.error('数据库连接成功', err);
  });
/* 定义模型和表之间的映射 */
/* 定义用户模型 */
const User = sequelize.define('user', {
  userName: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  pwd: {
    type: Sequelize.STRING
  },
  name: {
    type: Sequelize.STRING
  },
  avatar: {
    type: Sequelize.STRING,
  },
  salt: {
    type: Sequelize.STRING
  }
})
/* 定义管理员模型 */
const Manager = sequelize.define('manager', {
  userName: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  pwd: {
    type: Sequelize.STRING
  },
  name: {
    type: Sequelize.STRING
  },
  avatar: {
    type: Sequelize.STRING
  },
  salt: {
  type: Sequelize.STRING
}
})
/* 定义微博内容模型 */
const WeiBoContents = sequelize.define('weibocontents', {
  weiBoID: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  content: {
    type: Sequelize.STRING(1234)
  },
  time: {
    type:Sequelize.BIGINT
  }
})
/* 定义点赞的人模型 */
const ThumbUps = sequelize.define('thumbUp', {
  thumbUpID: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  userName: {
    type: Sequelize.STRING,
    references: {
      model: User,
      key:   'userName'
    }
  }
})
/* 定义评论模型 */
const WeiBoComments = sequelize.define('weibocomments', {
  weiBoCommentID: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  observer: {
    type: Sequelize.STRING,
    references: {
      model: User,
      key:   'userName'
    }
  },
  observed: {
    type: Sequelize.STRING,
    references: {
      model: User,
      key:   'userName'
    }
  },
  content: {
    type: Sequelize.STRING
  }
})

/* 建立模型之间的联系 */
// ondelete,表级定义参照完整性
User.hasMany(WeiBoContents, {as: 'WeiBoContents', foreignKey: 'userName', sourceKey: 'userName', onDelete: 'cascade'})
WeiBoContents.hasMany(WeiBoComments, {as: 'WeiBoComments', foreignKey: 'weiBoID', sourceKey: 'weiBoID', onDelete: 'cascade'})
WeiBoContents.hasMany(ThumbUps, {as: 'ThumbUps', foreignKey: 'weiBoID', sourceKey: 'weiBoID', onDelete: 'cascade'})

/* 创建各个表*/
Manager.sync()
User.sync()
WeiBoContents.sync()
WeiBoComments.sync()
ThumbUps.sync()

module.exports.User = User // 用户信息
module.exports.Manager = Manager // 管理员信息
module.exports.Op = Op // sequelize的操作符
module.exports.WeiBoContents = WeiBoContents // 微博的内容
module.exports.WeiBoComments = WeiBoComments // 微博评论的内容
module.exports.ThumbUps = ThumbUps // 点赞的人
