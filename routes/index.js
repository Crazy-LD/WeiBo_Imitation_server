let express = require('express');
let router = express.Router();
let svgCaptcha = require('svg-captcha');
let {User, Manager, Op, WeiBoComments, ThumbUps, WeiBoContents} = require('../db/models')
let formidable = require('formidable')
let uuidv1 = require('uuid')
let path = require('path')
let fs = require('fs')
let md5 = require('blueimp-md5')

/* 获取图形验证码 */
router.get('/captcha', function (req, res) {
  let captcha = svgCaptcha.create({
    ignoreChars: '0o1l',
    noise: 2,
    color: true
  });
  req.session.captcha = captcha.text.toLowerCase();
  console.log(req.session.captcha)
  res.type('svg');
  res.status(200).send(captcha.data)
});

/* 用户登录 */
router.post('/login_pwd', function (req, res) {
  const {userName, isManager, captcha} = req.body
  const password = req.body.pwd
  if (req.session.captcha !== captcha) {
    res.send({code: 1, msg: '验证码不正确'})
  } else if (isManager) {
    handleLogin(Manager)
  } else {
    handleLogin(User)
  }
  req.session.userName = userName
  req.session.isManager = isManager
  /* 传入登录的对象 */
  function handleLogin(obj) {
    obj.findOne({
      where: {
        userName: userName
      }
    }).then(user => {
      if (user) {
        let salt = user.salt
        let pwd = md5(password + salt)
        if (user.pwd === pwd) {
          let name = user.name
          let userName = user.userName
          let avatar = user.avatar
          res.send({code: 0, data: {userName, name, avatar, isManager}})

        } else {
          res.send({code: 1, msg: '密码错误'})
        }
      } else {
        let salt = uuidv1()
        let pwd = md5(password + salt)
        const name = userName
        const avatar = 'blank_avatar.jpg'
        obj.sync().then(() => {
          return obj.create({
            userName,
            pwd,
            name,
            avatar,
            salt
          })
        }).catch(err => {
          res.send({code: 1, msg: '注册失败'})
        })
        res.send({code: 0, data: {userName, name, isManager, avatar}})
      }
    })
  }
})
/* 用户退出 */
router.get('/login_out', function (req, res) {
  delete req.session.userName
  delete req.session.isManager
  res.send({code: 0})
})
/* 获取缓存的用户信息 */
router.get('/init_userinfo', function (req, res) {
  const userName = req.session.userName
  if (userName) {
    if (req.session.isManager) {
      handleLogin(Manager)
    } else {
      handleLogin(User)
    }
  } else {
    res.send({code: 1, msg: '无用户记录'})
  }
  /* 传入登录的对象 */
  function handleLogin(obj) {
    obj.findOne({
      where: {
        userName: userName
      }
    }).then(user => {
      const {name, userName, avatar} = user
      // let name = user.name
      // let userName = user.userName
      // let avatar = user.avatar
      let isManager = req.session.isManager
      let data = {
        name,
        userName,
        avatar,
        isManager,
      }
      res.send({code: 0, data: data})
    }).catch(err => {
      res.send({code: 1, msg: '获取用户失败'})
    })
  }
})
/* 修改资料 */
router.post('/changeInfo',  function (req, res) {
    let form = new formidable.IncomingForm()
    form.uploadDir = './uploads'
    form.parse(req, (err, fields, files) => {
      if (!err) {
        let name = fields.name
        let avatarName = uuidv1()
        let extName = path.extname(files.avatar.name)
        let oldPath =  './' + files.avatar.path
        let newPath =  './uploads/' + avatarName + extName
        let avatar = avatarName +extName
        const {isManager} = req.session
        fs.rename(oldPath, newPath, (err) => {
          if (!err) {
            if (isManager) {
              handleChange(Manager, name, avatar)
            } else {
              handleChange(User, name, avatar)
            }
          } else {
            throw err
          }
        })
      } else {
        res.send({code: 1, msg: '修改资料失败'})
      }
    })
  function handleChange(obj, name, avatar) {
    obj.findOne({
      where: {
        userName: {
          [Op.eq]: req.session.userName
        }
      }}).then(user => {
      user.setDataValue('name', name)
      user.setDataValue('avatar', avatar)
      user.save() // 修改之后一定要保存
      let data = {
        name,
        userName: req.session.userName,
        avatar
      }
      res.send({code: 0, data})
    })
  }
  })
/* 发送微博 */
router.post('/sendWeiBo', function (req, res) {
  const content = req.body.weiBoText
  let time = Date.now()
  let weiBoID = uuidv1()
  const {userName, isManager} = req.session
  WeiBoContents.sync().then(() => {
    return WeiBoContents.create({
      weiBoID,
      userName: req.session.userName,
      content,
      time
    })
  }).catch(err => {
    res.send({code: 1, msg: '微博发送失败'})
  })
  User.findOne({userName}).then(user => {
    let avatar = user.avatar
    let name = user.name
    let data = {
      weiBoID,
      userName,
      content,
      time,
      avatar,
      name
    }
    res.send({code: 0, data: data})
  }).catch(err => {
    res.send({code: 1, msg: '发送微博失败'})
  })
})
/* 请求所有微博的内容 */
router.get('/getweibos', function (req, res) {
  let allUsers = {}
  User.findAll().then(users => {
    users.forEach((value, index) => {
      const {name, userName} = value
      allUsers[userName] = name
    })
  }).then(() => {
    WeiBoContents.findAll({
      include: [
        {
          model: WeiBoComments,
          as: 'WeiBoComments'
        },
        {
          model: ThumbUps,
          as: 'ThumbUps'
        }
      ],
      order: [
        [
          'createdAt',
          'DESC'
        ],
        [
          'ThumbUps',
          'createdAt',
          'DESC'
        ],
        [
          'WeiBoComments',
          'createdAt',
          'ASC'
        ]
      ]
    }).then(weiBoContents => {
      let data = []
      weiBoContents.forEach((weiBo, weiBoIndex) => {
        let userName = weiBo.userName
        let avatar = ''
        let content = weiBo.content
        let time = weiBo.time
        let weiBoContent = {}
        let name = allUsers[userName]
        User.findOne({
          where: {
            userName
          }
        }).then(user => {
          avatar = user.avatar
        }).then(() => {
          let weiBoID = weiBo.weiBoID
          let thumb_up_peoples = []
          let weiBoComments = []
          weiBo.ThumbUps.forEach((thumbUp, ThumbUpsIndex) => {
            const {userName} = thumbUp
            let name = allUsers[userName]
            thumb_up_peoples.push(name)
          })
          weiBo.WeiBoComments.forEach((weiBoComment, index) => {
            let {observer, observed} = weiBoComment
            weiBoComment.dataValues.observerName = allUsers[observer]
            if (observed) {
              weiBoComment.dataValues.observedName = allUsers[observed]
            }
            weiBoComments.push(weiBoComment)
          })
          weiBoContent = {
            userName,
            name,
            avatar,
            content,
            weiBoID,
            thumb_up_peoples,
            weiBoComments,
            time
          }
          data.push(weiBoContent)
          if (weiBoIndex === weiBoContents.length - 1) {
            // 消除上面因为findOne异步带来的影响
            data.sort((a, b) => {
              return b.time - a.time
            })
            res.send({code: 0, data})
          }
        })
      })
    })
  })
})
/* 请求所有人的信息 */
router.get('/getfollowees', function (req, res) {
  User.findAll().then(users => {
    let data = []
    users.forEach((value, index) => {
      const {name, avatar, userName} = value
      let followeesInfo = {
        name,
        avatar,
        userName
      }
      data.push(followeesInfo)
    })
    res.send({code: 0, data})
  }).catch(err => {
    res.send({code: 1, msg: '请求关注的人失败'})
  })
})
/* 处理点赞的请求 */
router.post('/change_zan', function (req, res) {
  const {weiBoID, isZan} = req.body
  let thumbUpID = uuidv1()
  const {userName} = req.session
  if (isZan) { // 当前的状态
    ThumbUps.destroy({
      where: {
        userName
      }
    }).catch(err => {
      res.send({code: 1, msg: '取消赞失败'})
    })
  } else {
    ThumbUps.create({
      thumbUpID,
      weiBoID,
      userName
    }).catch(err => {
      res.send({code: 1, msg: '点赞失败'})
    })
  }
  res.send({code: 0})
})
/* 请求评论微博 */
router.post('/comment_weibo', function (req, res) {
  const {observed, content, weiBoID} = req.body
  let weiBoCommentID = uuidv1()
  let observer = req.session.userName
  User.findOne({
    where: {
      name: observed
    }
  }).then(user => {
    if (user) {
      let observed = user.userName
      WeiBoComments.create({
        weiBoCommentID,
        observed,
        content,
        observer,
        weiBoID
      }).then(() => {
        res.send({code: 0})
      }).catch(err => {
        res.send({code: 1, msg: '评论失败'})
      })
    } else {
      WeiBoComments.create({
        weiBoCommentID,
        content,
        observer,
        weiBoID
      }).then(() => {
        res.send({code: 0})
      }).catch(err => {
        res.send({code: 1, msg: '评论失败'})
      })
    }
  })
})
/* 请求修改密码 */
router.post('/change_pwd', function (req, res) {
  const {captcha} = req.body
  const {userName, isManager}  = req.session
  if (req.session.captcha !== captcha) {
    res.send({code: 1, msg: '验证码不正确'})
  } else if (isManager) {
    handleChangePwd(Manager)
  } else {
    handleChangePwd(User)
  }
  function handleChangePwd (obj) {
    obj.findOne({
      where: {
        userName
      }
    }).then(user => {
      const pwd = md5(req.body.pwd + user.salt)
      user.pwd = pwd
      user.save()
      res.send({code: 0})
    }).catch(err => {
      console.log(err)
      res.send({code: 1, msg: '修改密码失败'})
    })
  }
})
/* 请求删除用户 */
router.post('/delete_user', function (req, res) {
  if (req.body.userName) {
    const {userName} = req.body
    User.findOne({
      where: {
        userName
      }
    }).then(user => {
      fs.unlinkSync('./uploads/' + user.avatar)
      ThumbUps.destroy({
        where: {
          userName
        }
      }).then(() => {
        WeiBoComments.destroy({
          where: {
            [Op.or]: [{observer: userName}, {observed: userName}]
          }
        }).then(() => {
          WeiBoContents.destroy({
            where: {
              userName
            }
          }).then(() => {
            User.destroy({
              where: {
                userName
              }
            }).catch(err => {
              res.send({code: 1, msg: '注销用户失败'})
            })
          })
        })
      })
    })
  } else {
    let obj = req.session.isManager ? Manager : User
    const {userName} = req.session
    obj.findOne({
      where: {
        userName
      }
    }).then(user => {
      fs.unlinkSync('./uploads/' + user.avatar)
      obj.destroy({
        where: {
          userName
        }
      }).catch(err => {
        let msg = req.session.isManager ? '注销管理员失败' : '注销用户失败'
        res.send({code: 1, msg})
      })
    })
  }
  res.send({code: 0})
})
/* 请求删除微博 */
router.post('/delete_weibo', function (req, res) {
  const {weiBoID} = req.body
  WeiBoContents.destroy({
    where: {
      weiBoID
    }
  }).catch(err => {
    res.send({code: 1, msg: '删除微博失败'})
  })
  res.send({code: 0})
})

module.exports = router;
