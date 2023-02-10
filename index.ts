import express, { json } from 'express'
import { PrismaClient } from '@prisma/client'
import cors from 'cors'
import { sign, verify } from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import cookieparser from 'cookie-parser'
import multer from 'multer'
import fs from 'fs'
const uploadMiddle = multer({ dest: 'uploads/' })

const app = express()
const prisma = new PrismaClient()

//middlewares
app.use(cookieparser())
app.use(json())
app.use(cors({
  credentials: true,
  origin: ["http://localhost:3000"],
  methods: ["GET", "POST"]
}))
app.use('/uploads', express.static(__dirname + '/uploads'))


const secret = "jwtsecretmustchange"

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body
  const hashPassword = await bcrypt.hash(password, 10)
  try {
    await prisma.user.create({
      data: {
        username: username,
        password: hashPassword
      }
    })
    return res.status(200).json("User registered")
  } catch (e) {
    res.status(401).json({ error: "Error in post request from server" })
  }



})
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body

  try {
    const findUser = await prisma.user.findUnique({
      where: {
        username: username
      }
    })
    if (!findUser) {
      res.status(401).json({ error: "User dont exist" })
      console.log("Usuario n existe jegue")
    } else {
      const dbpassword = findUser.password

      bcrypt.compare(password, dbpassword).then((match) => {
        if (match) {
          const acesstoken = sign({
            id: findUser.id,
            username: username,
            password: password
          }, secret)

          res.cookie("blogaccesstoken", acesstoken, {
            maxAge: 60 * 60 * 24 * 30 * 30 //30 days
          }).json('ok')


          console.log("Usuario logado lindao")
        } else {
          res.status(401).json("Wrong password")
          console.log("Senha errada jegue")
        }
      })
    }

  } catch (e) {
    res.status(401).json({ error: "Server error" })
  }

})

app.get('/api/profile', (req, res) => {
  try {
    const { blogaccesstoken } = req.cookies
    verify(blogaccesstoken, secret, {}, (err, info) => {
      if (err) {
        res.json("error")
      } else {
        res.json(info)
      }

    })

  } catch (e) {
    res.json("error")
  }

})

app.post('/api/createpost', uploadMiddle.single('file'), async (req, res) => {

  const { blogaccesstoken } = req.cookies
  const { originalname, path } = req.file!
  const parts = originalname.split('.')
  const ext = parts[parts.length - 1]
  const newpath = path + '.' + ext
  console.log(req.file)
  console.log(newpath)
  fs.renameSync(path, newpath)

  verify(blogaccesstoken, secret, {}, async (err, info) => {
    if (err) {
      res.json("error")
    } else {
      const { title, summary, content, author } = req.body
      const createPost = await prisma.post.create({
        data: {
          title: title,
          summary: summary,
          content: content,
          cover: newpath,
          authorId: author

        }
      }

      )
      res.json(createPost)
    }

  })

})

app.get('/api/getPosts', async (req, res) => {

  const posts = await prisma.post.findMany()

  res.json(posts)
})

app.get('/api/post/:postId', async (req, res) => {
  
  const { postId } = req.params
  const post = await prisma.post.findFirst({
    where: {
      id: postId
    }
  })
  console.log(post)
  res.json(post)
})




app.get('/api/logout', (req, res) => {
  res.cookie("blogaccesstoken", '').json('Logout successful')

})

app.listen(3001, () => console.log('App running on port 3001'))

